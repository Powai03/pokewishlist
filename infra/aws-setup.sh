#!/usr/bin/env bash
# Crée (ou met à jour) tout ce qu'il faut sur AWS pour que le workflow CD déploie l'API sur Lambda.
# À lancer UNE fois, depuis la racine du dépôt, avec un AWS CLI connecté à son compte :
#
#   brew install awscli && aws configure        # ou : aws login
#   bash infra/aws-setup.sh
#
# Idempotent : on peut le relancer sans risque (ce qui existe déjà est conservé ou mis à jour).
# Le mot de passe de la base (DATABASE_URL) est lu dans api/.env et envoyé à AWS sans jamais être affiché.
#
# Ce que le script crée (moindre privilège) :
#   1. le fournisseur d'identité OIDC de GitHub (token.actions.githubusercontent.com) ;
#   2. le rôle d'EXÉCUTION de la fonction (elle ne peut qu'écrire ses journaux dans CloudWatch) ;
#   3. la fonction Lambda « pokewishlist-api » (Node.js 22, ARM, 256 Mo), avec ses variables d'environnement
#      (Supabase via le pooler en mode « transaction », origines CORS autorisées) ;
#   4. l'API Gateway (HTTP API) : l'adresse publique HTTPS de l'API, avec une limite de débit ;
#   5. la suppression de l'ancienne Function URL (elle permettrait de contourner l'API Gateway) ;
#   6. le rôle de DÉPLOIEMENT, utilisable SEULEMENT par ce dépôt GitHub, dans l'environnement « production »,
#      et qui ne peut QUE mettre à jour le code de cette fonction.
#
# Réglages possibles (variables d'environnement) :
#   CORS_ORIGIN="https://mon-front.fr,http://localhost:3001"   origines autorisées à appeler l'API
#   THROTTLE_RATE=10 THROTTLE_BURST=20                        limite de débit (requêtes/s, pic)
set -euo pipefail

REGION="${AWS_REGION:-eu-west-1}" # Irlande : même région que la base Supabase (latence minimale)
FUNCTION="${FUNCTION_NAME:-pokewishlist-api}"
REPO="${GITHUB_REPO:-Powai03/pokewishlist}"
GH_ENVIRONMENT="production"
EXEC_ROLE="${FUNCTION}-lambda-role"
DEPLOY_ROLE="${FUNCTION}-github-deploy"
CORS_ORIGIN="${CORS_ORIGIN:-https://pokewishlist-nu.vercel.app,https://d7gp7a220g21z.cloudfront.net,http://localhost:3000,http://localhost:3001}"
THROTTLE_RATE="${THROTTLE_RATE:-10}"
THROTTLE_BURST="${THROTTLE_BURST:-20}"
API_NAME="${FUNCTION}-http"
OIDC_HOST="token.actions.githubusercontent.com"

export AWS_REGION="$REGION" AWS_PAGER=""
step() { printf '\n[%s/7] %s\n' "$1" "$2"; }
exists() { "$@" >/dev/null 2>&1; }

cd "$(dirname "$0")/.."
[ -f api/package.json ] || { echo "Lancer depuis le dépôt PokéWishlist." >&2; exit 1; }

step 1 "Compte AWS"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "    compte $ACCOUNT_ID, région $REGION"

step 2 "Fournisseur OIDC de GitHub (connexion sans clé)"
OIDC_ARN="arn:aws:iam::${ACCOUNT_ID}:oidc-provider/${OIDC_HOST}"
if exists aws iam get-open-id-connect-provider --open-id-connect-provider-arn "$OIDC_ARN"; then
  echo "    déjà présent"
else
  aws iam create-open-id-connect-provider \
    --url "https://${OIDC_HOST}" \
    --client-id-list sts.amazonaws.com \
    --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1 >/dev/null
  echo "    créé"
fi

step 3 "Rôle d'exécution de la fonction ($EXEC_ROLE)"
if exists aws iam get-role --role-name "$EXEC_ROLE"; then
  echo "    déjà présent"
else
  aws iam create-role --role-name "$EXEC_ROLE" --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{ "Effect": "Allow", "Principal": { "Service": "lambda.amazonaws.com" }, "Action": "sts:AssumeRole" }]
  }' >/dev/null
  aws iam attach-role-policy --role-name "$EXEC_ROLE" \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
  echo "    créé ; attente de sa propagation dans IAM (10 s)…"
  sleep 10
fi
EXEC_ROLE_ARN=$(aws iam get-role --role-name "$EXEC_ROLE" --query Role.Arn --output text)

step 4 "Fonction Lambda ($FUNCTION)"
# Variables d'environnement écrites dans un fichier temporaire privé (jamais dans la ligne de commande,
# visible par les autres processus), puis supprimé.
DATABASE_URL=$(grep -E '^DATABASE_URL=' api/.env 2>/dev/null | head -1 | cut -d= -f2- || true)
DATABASE_URL="${DATABASE_URL%\"}" && DATABASE_URL="${DATABASE_URL#\"}" # guillemets éventuels
[ -n "$DATABASE_URL" ] && echo "    DATABASE_URL lue dans api/.env (non affichée)" \
  || echo "    ⚠ pas de DATABASE_URL dans api/.env : l'API utilisera la mémoire (données perdues)"
# Supabase : en local, le pooler en mode « session » (port 5432) garde une connexion par client.
# Sur Lambda, des dizaines de conteneurs peuvent s'ouvrir d'un coup : on passe par le mode « transaction »
# (port 6543, même adresse, même identifiant), qui partage les connexions à la base entre tous les clients.
# Recommandé par Supabase pour le serverless ; compatible avec notre code (prepare: false).
if [[ "$DATABASE_URL" == *pooler.supabase.com:5432/* ]]; then
  DATABASE_URL="${DATABASE_URL/pooler.supabase.com:5432\//pooler.supabase.com:6543/}"
  echo "    Supabase : pooler en mode transaction (port 6543)"
fi
echo "    CORS : $CORS_ORIGIN"
ENV_FILE=$(mktemp) && chmod 600 "$ENV_FILE"
trap 'rm -f "$ENV_FILE" lambda-setup.zip' EXIT
DATABASE_URL="$DATABASE_URL" node -e '
  const vars = { NODE_ENV: "production", CORS_ORIGIN: process.argv[1] }
  if (process.env.DATABASE_URL) vars.DATABASE_URL = process.env.DATABASE_URL
  require("fs").writeFileSync(process.argv[2], JSON.stringify({ Variables: vars }))
' "$CORS_ORIGIN" "$ENV_FILE"

if exists aws lambda get-function --function-name "$FUNCTION"; then
  aws lambda update-function-configuration --function-name "$FUNCTION" \
    --environment "file://$ENV_FILE" >/dev/null
  echo "    déjà présente : variables d'environnement mises à jour (le code, lui, est déployé par le CD)"
else
  echo "    premier paquet (construit depuis le code local)…"
  (cd api && npm run --silent build:lambda && cd dist-lambda && zip -q ../../lambda-setup.zip index.mjs)
  aws lambda create-function --function-name "$FUNCTION" \
    --runtime nodejs22.x --architectures arm64 \
    --handler index.handler --zip-file fileb://lambda-setup.zip \
    --role "$EXEC_ROLE_ARN" --memory-size 256 --timeout 10 \
    --environment "file://$ENV_FILE" \
    --description "API PokéWishlist (Hono) — déployée par GitHub Actions" >/dev/null
  echo "    créée"
fi
aws lambda wait function-updated-v2 --function-name "$FUNCTION"
FUNCTION_ARN=$(aws lambda get-function --function-name "$FUNCTION" --query Configuration.FunctionArn --output text)

step 5 "API Gateway (HTTP API $API_NAME)"
# HTTP API (et non REST API) : plus simple, moins cher, suffisant ici. Une seule route « $default » envoie
# TOUTES les requêtes à la fonction : c'est Hono qui route (/health, /wishlist…), comme en local.
# Pas de CORS côté API Gateway : c'est l'app Hono qui le gère (un seul endroit, testé), y compris OPTIONS.
none() { [ -z "$1" ] || [ "$1" = "None" ]; }
API_ID=$(aws apigatewayv2 get-apis --query "Items[?Name=='$API_NAME'].ApiId | [0]" --output text)
if none "$API_ID"; then
  API_ID=$(aws apigatewayv2 create-api --name "$API_NAME" --protocol-type HTTP \
    --description "API PokéWishlist (Hono sur Lambda)" --query ApiId --output text)
  echo "    API créée ($API_ID)"
fi
INTEGRATION_ID=$(aws apigatewayv2 get-integrations --api-id "$API_ID" \
  --query "Items[?IntegrationUri=='$FUNCTION_ARN'].IntegrationId | [0]" --output text)
if none "$INTEGRATION_ID"; then
  # AWS_PROXY : la requête entière est transmise à la fonction (événement au format 2.0).
  INTEGRATION_ID=$(aws apigatewayv2 create-integration --api-id "$API_ID" \
    --integration-type AWS_PROXY --integration-uri "$FUNCTION_ARN" \
    --payload-format-version 2.0 --timeout-in-millis 10000 \
    --query IntegrationId --output text)
  echo "    intégration Lambda créée"
fi
ROUTE_ID=$(aws apigatewayv2 get-routes --api-id "$API_ID" \
  --query "Items[?RouteKey=='\$default'].RouteId | [0]" --output text)
if none "$ROUTE_ID"; then
  aws apigatewayv2 create-route --api-id "$API_ID" --route-key '$default' \
    --target "integrations/$INTEGRATION_ID" >/dev/null
  echo "    route \$default créée"
fi
# Étape « $default » : pas de préfixe dans l'adresse (/health, et non /prod/health), déploiement automatique.
# Limite de débit : au-delà, API Gateway répond 429 sans même réveiller la fonction (coût et abus maîtrisés).
THROTTLE="ThrottlingRateLimit=$THROTTLE_RATE,ThrottlingBurstLimit=$THROTTLE_BURST"
if exists aws apigatewayv2 get-stage --api-id "$API_ID" --stage-name '$default'; then
  aws apigatewayv2 update-stage --api-id "$API_ID" --stage-name '$default' \
    --default-route-settings "$THROTTLE" >/dev/null
else
  aws apigatewayv2 create-stage --api-id "$API_ID" --stage-name '$default' --auto-deploy \
    --default-route-settings "$THROTTLE" >/dev/null
fi
echo "    limite : $THROTTLE_RATE requêtes/s (pics jusqu'à $THROTTLE_BURST)"
# Autoriser CETTE API (et elle seule) à appeler la fonction.
aws lambda add-permission --function-name "$FUNCTION" --statement-id apigateway-http-api \
  --action lambda:InvokeFunction --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT_ID}:${API_ID}/*/*" >/dev/null 2>&1 || true
API_URL=$(aws apigatewayv2 get-api --api-id "$API_ID" --query ApiEndpoint --output text)
echo "    $API_URL"

step 6 "Ancienne Function URL"
# Une 2e porte d'entrée publique contournerait la limite de débit : on ne garde que l'API Gateway.
if exists aws lambda get-function-url-config --function-name "$FUNCTION"; then
  aws lambda delete-function-url-config --function-name "$FUNCTION"
  echo "    supprimée"
else
  echo "    absente"
fi
for sid in public-url public-url-invoke; do
  aws lambda remove-permission --function-name "$FUNCTION" --statement-id "$sid" >/dev/null 2>&1 || true
done

step 7 "Rôle de déploiement pour GitHub Actions ($DEPLOY_ROLE)"
# Qui peut l'endosser : UNIQUEMENT un job de $REPO dans l'environnement GitHub « $GH_ENVIRONMENT ».
# Le « sub » du jeton GitHub existe sous deux formes : classique (repo:owner/nom:…) et « immuable »
# (repo:owner@<id>/nom@<id>:…, avec les identifiants numériques fixes du compte et du dépôt, qui ne
# changent pas si on renomme). On lit celle du dépôt avec `gh` (si disponible) et on accepte les deux.
SUB_CLASSIC="repo:${REPO}:environment:${GH_ENVIRONMENT}"
SUB_PREFIX=$(gh api "repos/${REPO}/actions/oidc/customization/sub" -q '.sub_claim_prefix // empty' 2>/dev/null || true)
SUBS="\"$SUB_CLASSIC\""
if [ -n "$SUB_PREFIX" ] && [ "$SUB_PREFIX" != "repo:${REPO}" ]; then
  SUBS="$SUBS, \"${SUB_PREFIX}:environment:${GH_ENVIRONMENT}\""
fi
echo "    jetons acceptés (sub) : $SUBS"
TRUST=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Federated": "$OIDC_ARN" },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "${OIDC_HOST}:aud": "sts.amazonaws.com",
        "${OIDC_HOST}:sub": [$SUBS]
      }
    }
  }]
}
EOF
)
# Ce qu'il peut faire : mettre à jour le code de CETTE fonction, et lire son état. Rien d'autre.
PERMISSIONS=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["lambda:UpdateFunctionCode", "lambda:GetFunction", "lambda:GetFunctionConfiguration"],
    "Resource": "$FUNCTION_ARN"
  }]
}
EOF
)
if exists aws iam get-role --role-name "$DEPLOY_ROLE"; then
  aws iam update-assume-role-policy --role-name "$DEPLOY_ROLE" --policy-document "$TRUST"
  echo "    déjà présent : règles mises à jour"
else
  aws iam create-role --role-name "$DEPLOY_ROLE" --assume-role-policy-document "$TRUST" \
    --max-session-duration 3600 >/dev/null
  echo "    créé"
fi
aws iam put-role-policy --role-name "$DEPLOY_ROLE" --policy-name deploy-lambda-code \
  --policy-document "$PERMISSIONS"
DEPLOY_ROLE_ARN=$(aws iam get-role --role-name "$DEPLOY_ROLE" --query Role.Arn --output text)

echo
echo "Vérification : $(curl -s "$API_URL/health" || echo 'pas encore de réponse')"
cat <<EOF

✔ AWS est prêt. Reste à configurer GitHub (dépôt → Settings → Environments → New environment) :

  Environnement « $GH_ENVIRONMENT »
    · Deployment branches and tags : Selected branches → main
    · Environment secrets   AWS_ROLE_ARN          = $DEPLOY_ROLE_ARN
    · Environment variables AWS_REGION            = $REGION
                            LAMBDA_FUNCTION_NAME  = $FUNCTION
                            API_URL               = $API_URL
EOF
