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
#   3. la fonction Lambda « pokewishlist-api » (Node.js 22, ARM, 256 Mo), avec ses variables d'environnement ;
#   4. son adresse publique HTTPS (Function URL) ;
#   5. le rôle de DÉPLOIEMENT, utilisable SEULEMENT par ce dépôt GitHub, dans l'environnement « production »,
#      et qui ne peut QUE mettre à jour le code de cette fonction.
set -euo pipefail

REGION="${AWS_REGION:-eu-west-1}" # Irlande : même région que la base Supabase (latence minimale)
FUNCTION="${FUNCTION_NAME:-pokewishlist-api}"
REPO="${GITHUB_REPO:-Powai03/pokewishlist}"
GH_ENVIRONMENT="production"
EXEC_ROLE="${FUNCTION}-lambda-role"
DEPLOY_ROLE="${FUNCTION}-github-deploy"
CORS_ORIGIN="${CORS_ORIGIN:-http://localhost:3000,http://localhost:3001}"
OIDC_HOST="token.actions.githubusercontent.com"

export AWS_REGION="$REGION" AWS_PAGER=""
step() { printf '\n[%s/6] %s\n' "$1" "$2"; }
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

step 5 "Adresse publique HTTPS (Function URL)"
if ! exists aws lambda get-function-url-config --function-name "$FUNCTION"; then
  # Pas de règle CORS ici : c'est l'app Hono qui gère CORS (un seul endroit, testé).
  aws lambda create-function-url-config --function-name "$FUNCTION" --auth-type NONE >/dev/null
  echo "    créée"
fi
# L'URL est publique (comme toute API web) : il faut autoriser l'appel par URL ET l'invocation qui en découle.
aws lambda add-permission --function-name "$FUNCTION" --statement-id public-url \
  --action lambda:InvokeFunctionUrl --principal '*' --function-url-auth-type NONE >/dev/null 2>&1 || true
aws lambda add-permission --function-name "$FUNCTION" --statement-id public-url-invoke \
  --action lambda:InvokeFunction --principal '*' --invoked-via-function-url >/dev/null 2>&1 || true
API_URL=$(aws lambda get-function-url-config --function-name "$FUNCTION" --query FunctionUrl --output text)
API_URL="${API_URL%/}"
echo "    $API_URL"

step 6 "Rôle de déploiement pour GitHub Actions ($DEPLOY_ROLE)"
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
