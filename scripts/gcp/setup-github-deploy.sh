#!/usr/bin/env bash
# One-time setup so GitHub Actions can deploy to Cloud Run without a stored key.
#
# Creates a deploy service account, grants it the minimum roles for
# `gcloud builds submit` + `gcloud run deploy`, and creates a Workload Identity
# Federation pool/provider that only trusts this GitHub repository's main branch.
# Idempotent: safe to re-run. Needs an Owner of the project and `gcloud auth login`.
#
# Usage: scripts/gcp/setup-github-deploy.sh [project-id] [github-owner/repo]
set -euo pipefail

PROJECT="${1:-qwiklabs-gcp-02-8ec6a39cdba0}"
REPO="${2:-lregaladohdez/tectonic-sdworx}"
POOL="github"
PROVIDER="github-oidc"
SA_NAME="github-deploy"
SA="$SA_NAME@$PROJECT.iam.gserviceaccount.com"
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')
COMPUTE_SA="$PROJECT_NUMBER-compute@developer.gserviceaccount.com"

log() { printf '\n==> %s\n' "$*"; }

log "Enable APIs"
gcloud services enable --project "$PROJECT" \
  iamcredentials.googleapis.com sts.googleapis.com \
  run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com

log "Deploy service account: $SA"
gcloud iam service-accounts describe "$SA" --project "$PROJECT" >/dev/null 2>&1 ||
  gcloud iam service-accounts create "$SA_NAME" --project "$PROJECT" \
    --display-name "GitHub Actions deploy (Cloud Build + Cloud Run)"

log "Project roles for the deploy account"
for role in \
  roles/run.admin \
  roles/cloudbuild.builds.editor \
  roles/artifactregistry.writer \
  roles/storage.objectAdmin \
  roles/serviceusage.serviceUsageConsumer \
  roles/viewer; do
  gcloud projects add-iam-policy-binding "$PROJECT" \
    --member "serviceAccount:$SA" --role "$role" --condition=None --quiet >/dev/null
  echo "  $role"
done

log "Let the deploy account act as the runtime identity (required by Cloud Run and Cloud Build)"
gcloud iam service-accounts add-iam-policy-binding "$COMPUTE_SA" --project "$PROJECT" \
  --member "serviceAccount:$SA" --role roles/iam.serviceAccountUser --quiet >/dev/null

log "Workload Identity pool + GitHub OIDC provider"
gcloud iam workload-identity-pools describe "$POOL" --project "$PROJECT" --location global >/dev/null 2>&1 ||
  gcloud iam workload-identity-pools create "$POOL" --project "$PROJECT" --location global \
    --display-name "GitHub Actions"
gcloud iam workload-identity-pools providers describe "$PROVIDER" --project "$PROJECT" \
  --location global --workload-identity-pool "$POOL" >/dev/null 2>&1 ||
  gcloud iam workload-identity-pools providers create-oidc "$PROVIDER" --project "$PROJECT" \
    --location global --workload-identity-pool "$POOL" \
    --display-name "GitHub OIDC" \
    --issuer-uri "https://token.actions.githubusercontent.com" \
    --attribute-mapping "google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
    --attribute-condition "assertion.repository == '$REPO' && assertion.ref == 'refs/heads/main'"

log "Allow this repo's main branch to impersonate the deploy account"
POOL_NAME=$(gcloud iam workload-identity-pools describe "$POOL" --project "$PROJECT" --location global --format 'value(name)')
gcloud iam service-accounts add-iam-policy-binding "$SA" --project "$PROJECT" \
  --role roles/iam.workloadIdentityUser \
  --member "principalSet://iam.googleapis.com/$POOL_NAME/attribute.repository/$REPO" --quiet >/dev/null

PROVIDER_NAME=$(gcloud iam workload-identity-pools providers describe "$PROVIDER" --project "$PROJECT" \
  --location global --workload-identity-pool "$POOL" --format 'value(name)')

log "GitHub repository variables (no secrets involved)"
echo "  GCP_WORKLOAD_IDENTITY_PROVIDER = $PROVIDER_NAME"
echo "  GCP_SERVICE_ACCOUNT            = $SA"
if command -v gh >/dev/null 2>&1; then
  gh variable set GCP_WORKLOAD_IDENTITY_PROVIDER --repo "$REPO" --body "$PROVIDER_NAME"
  gh variable set GCP_SERVICE_ACCOUNT --repo "$REPO" --body "$SA"
  echo "  (set on GitHub with gh)"
else
  echo "  Set them under Settings → Secrets and variables → Actions → Variables."
fi

cat <<MSG

Done. Still to do by hand:
  1. Aikido CI key:  gh secret set AIKIDO_SECRET_KEY --repo $REPO
  2. Runtime secrets on the service (see README "Deploy"): session secret, demo passcode, provider keys.
  3. Optional: GitHub → Settings → Environments → production → required reviewers.
MSG
