#!/bin/bash
# Deploys the latest main branch. Runs as the ubuntu user (the deploy user may
# only start it through sudo). The built website arrives on stdin as a .tar.gz;
# empty stdin means "no frontend this time" and leaves the current site alone.
# Installed copy: /usr/local/bin/predictionmarket-deploy (owned by root).
set -euo pipefail

APP_DIR=/home/ubuntu/prediction-market
WEB_DIR=/var/www/predictionmarket

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
cat > "$TMP/site.tgz"

echo "== Updating code"
cd "$APP_DIR"
git fetch --quiet origin main
git reset --hard origin/main   # the server copy is never edited by hand

echo "== Installing backend packages"
cd "$APP_DIR/backend"
npm ci --omit=dev --no-audit --no-fund

echo "== Restarting the API"
pm2 reload api --update-env
pm2 save

if [ -s "$TMP/site.tgz" ]; then
  echo "== Publishing the website"
  mkdir "$TMP/site"
  tar -xzf "$TMP/site.tgz" -C "$TMP/site"
  test -f "$TMP/site/index.html" || { echo "No index.html in the upload; website left unchanged"; exit 1; }
  rsync -a --delete "$TMP/site/" "$WEB_DIR/"
else
  echo "== No website upload; leaving $WEB_DIR as it is"
fi

echo "== Health check"
for _ in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS http://127.0.0.1:5000/api/ping | grep -q '"db":"connected"'; then
    echo "API is up and connected to MongoDB"
    git -C "$APP_DIR" log -1 --format='Deployed %h: %s'
    exit 0
  fi
  sleep 3
done
echo "API did not report db connected after 30 seconds. Check: pm2 logs api"
exit 1