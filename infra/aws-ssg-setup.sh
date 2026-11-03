#!/usr/bin/env bash
# Version STATIQUE (SSG) du site : bucket S3 + CDN CloudFront, déployée par le pipeline (job « Deploy SSG »).
# À lancer UNE fois, après infra/aws-setup.sh (qui crée le rôle de déploiement GitHub), depuis la racine du dépôt :
#
#   bash infra/aws-ssg-setup.sh
#
# Idempotent : relançable sans risque. Crée (moindre privilège) :
#   1. un bucket S3 PRIVÉ (aucun accès public direct) ;
#   2. un « Origin Access Control » : seul CloudFront peut lire le bucket ;
#   3. une CloudFront Function : /pokemon/snivy → /pokemon/snivy/index.html (S3 ne connaît pas les dossiers) ;
#   4. la distribution CloudFront (HTTPS, cache, page 404 de Nuxt) ;
#   5. la politique du bucket : lecture autorisée à CETTE distribution seulement ;
#   6. les droits du rôle de déploiement GitHub : écrire dans CE bucket, invalider le cache de CETTE distribution.
set -euo pipefail

REGION="${AWS_REGION:-eu-west-1}"
PROJECT="pokewishlist"
DEPLOY_ROLE="${PROJECT}-api-github-deploy" # créé par infra/aws-setup.sh
NAME="${PROJECT}-ssg"
export AWS_REGION="$REGION" AWS_PAGER=""
step() { printf '\n[%s/6] %s\n' "$1" "$2"; }
exists() { "$@" >/dev/null 2>&1; }
none() { [ -z "$1" ] || [ "$1" = "None" ]; }

cd "$(dirname "$0")/.."
TMP=$(mktemp -d) && trap 'rm -rf "$TMP"' EXIT
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
BUCKET="${NAME}-${ACCOUNT_ID}" # nom unique au monde

step 1 "Bucket S3 privé ($BUCKET)"
if exists aws s3api head-bucket --bucket "$BUCKET"; then
  echo "    déjà présent"
else
  aws s3api create-bucket --bucket "$BUCKET" \
    --create-bucket-configuration "LocationConstraint=$REGION" >/dev/null
  echo "    créé"
fi
aws s3api put-public-access-block --bucket "$BUCKET" --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
echo "    accès public bloqué"

step 2 "Origin Access Control (seul CloudFront lit le bucket)"
OAC_ID=$(aws cloudfront list-origin-access-controls \
  --query "OriginAccessControlList.Items[?Name=='$NAME'].Id | [0]" --output text)
if none "$OAC_ID"; then
  OAC_ID=$(aws cloudfront create-origin-access-control --origin-access-control-config \
    "Name=$NAME,SigningProtocol=sigv4,SigningBehavior=always,OriginAccessControlOriginType=s3" \
    --query OriginAccessControl.Id --output text)
  echo "    créé ($OAC_ID)"
else
  echo "    déjà présent ($OAC_ID)"
fi

step 3 "CloudFront Function (adresses « propres » → index.html)"
FUNCTION="${NAME}-index"
cat > "$TMP/index.js" <<'EOF'
// /pokemon/snivy → /pokemon/snivy/index.html ; / → /index.html (S3 ne sert pas d'index de dossier).
function handler(event) {
  var request = event.request;
  var uri = request.uri;
  if (uri.endsWith('/')) {
    request.uri = uri + 'index.html';
  } else if (uri.split('/').pop().indexOf('.') === -1) {
    request.uri = uri + '/index.html';
  }
  return request;
}
EOF
if exists aws cloudfront describe-function --name "$FUNCTION"; then
  ETAG=$(aws cloudfront describe-function --name "$FUNCTION" --query ETag --output text)
  ETAG=$(aws cloudfront update-function --name "$FUNCTION" --if-match "$ETAG" \
    --function-config "Comment=PokéWishlist SSG : index des dossiers,Runtime=cloudfront-js-2.0" \
    --function-code "fileb://$TMP/index.js" --query ETag --output text)
  echo "    mise à jour"
else
  ETAG=$(aws cloudfront create-function --name "$FUNCTION" \
    --function-config "Comment=PokéWishlist SSG : index des dossiers,Runtime=cloudfront-js-2.0" \
    --function-code "fileb://$TMP/index.js" --query ETag --output text)
  echo "    créée"
fi
aws cloudfront publish-function --name "$FUNCTION" --if-match "$ETAG" >/dev/null
FUNCTION_ARN=$(aws cloudfront describe-function --name "$FUNCTION" --stage LIVE \
  --query FunctionSummary.FunctionMetadata.FunctionARN --output text)
echo "    publiée"

step 4 "Distribution CloudFront"
DIST_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Comment=='$NAME'].Id | [0]" --output text)
if none "$DIST_ID"; then
  # CachingOptimized : politique de cache gérée par AWS (cache long ; le CD invalide après chaque envoi).
  node -e '
    const [bucket, region, oac, fn, name] = process.argv.slice(1)
    const origin = `${bucket}.s3.${region}.amazonaws.com`
    const config = {
      CallerReference: `${name}-${Date.now()}`,
      Comment: name,
      Enabled: true,
      DefaultRootObject: "index.html",
      PriceClass: "PriceClass_100", // Europe + Amérique du Nord : le moins cher
      HttpVersion: "http2and3",
      Origins: { Quantity: 1, Items: [{
        Id: "s3", DomainName: origin, OriginAccessControlId: oac,
        S3OriginConfig: { OriginAccessIdentity: "" },
      }] },
      DefaultCacheBehavior: {
        TargetOriginId: "s3",
        ViewerProtocolPolicy: "redirect-to-https",
        CachePolicyId: "658327ea-f89d-4fab-a63d-7e88639e58f6",
        Compress: true,
        AllowedMethods: { Quantity: 2, Items: ["GET", "HEAD"], CachedMethods: { Quantity: 2, Items: ["GET", "HEAD"] } },
        FunctionAssociations: { Quantity: 1, Items: [{ EventType: "viewer-request", FunctionARN: fn }] },
      },
      // Fichier absent : S3 (privé) répond 403 → page 404 de Nuxt, avec un vrai statut 404.
      CustomErrorResponses: { Quantity: 2, Items: [403, 404].map((code) => ({
        ErrorCode: code, ResponsePagePath: "/404.html", ResponseCode: "404", ErrorCachingMinTTL: 60,
      })) },
    }
    require("fs").writeFileSync(process.argv[6], JSON.stringify(config))
  ' "$BUCKET" "$REGION" "$OAC_ID" "$FUNCTION_ARN" "$NAME" "$TMP/dist.json"
  DIST_ID=$(aws cloudfront create-distribution --distribution-config "file://$TMP/dist.json" \
    --query Distribution.Id --output text)
  echo "    créée ($DIST_ID) ; propagation dans le monde : 5 à 10 minutes"
else
  echo "    déjà présente ($DIST_ID)"
fi
DIST_ARN="arn:aws:cloudfront::${ACCOUNT_ID}:distribution/${DIST_ID}"
SSG_URL="https://$(aws cloudfront get-distribution --id "$DIST_ID" --query Distribution.DomainName --output text)"
echo "    $SSG_URL"

step 5 "Politique du bucket : lecture par CETTE distribution uniquement"
aws s3api put-bucket-policy --bucket "$BUCKET" --policy "$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "cloudfront.amazonaws.com" },
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::${BUCKET}/*",
    "Condition": { "StringEquals": { "AWS:SourceArn": "${DIST_ARN}" } }
  }]
}
EOF
)"
echo "    appliquée"

step 6 "Droits du rôle de déploiement GitHub ($DEPLOY_ROLE)"
aws iam put-role-policy --role-name "$DEPLOY_ROLE" --policy-name deploy-ssg --policy-document "$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    { "Effect": "Allow", "Action": "s3:ListBucket", "Resource": "arn:aws:s3:::${BUCKET}" },
    { "Effect": "Allow", "Action": ["s3:PutObject", "s3:DeleteObject"], "Resource": "arn:aws:s3:::${BUCKET}/*" },
    { "Effect": "Allow", "Action": ["cloudfront:CreateInvalidation", "cloudfront:GetInvalidation"], "Resource": "${DIST_ARN}" }
  ]
}
EOF
)"
echo "    écrire dans $BUCKET, invalider $DIST_ID : rien d'autre"

cat <<EOF

✔ SSG prêt. Variables de l'environnement GitHub « production » :
    SSG_BUCKET           = $BUCKET
    SSG_DISTRIBUTION_ID  = $DIST_ID
    SSG_URL              = $SSG_URL
  Et ajouter $SSG_URL au CORS de l'API (CORS_ORIGIN dans infra/aws-setup.sh).
EOF
