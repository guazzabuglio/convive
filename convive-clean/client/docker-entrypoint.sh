#!/bin/sh
# Substitute MEALIE_HOST placeholder in nginx config at runtime.
MEALIE_HOST="${MEALIE_HOST:-localhost:9000}"

sed -i "s|MEALIE_HOST|${MEALIE_HOST}|g" /etc/nginx/conf.d/default.conf

echo "convive: proxying Mealie at http://${MEALIE_HOST}"

exec nginx -g "daemon off;"
