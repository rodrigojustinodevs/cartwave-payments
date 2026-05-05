#!/bin/sh
# Entrypoint de desenvolvimento: migrate deploy; se o volume Postgres já tiver schema legado (P3005), faz baseline de 0_init.

MIGRATE_OUT=$(npx prisma migrate deploy 2>&1) || STATUS=$?
echo "$MIGRATE_OUT"

if [ "${STATUS:-0}" -eq 0 ]; then
  exec npm run dev
fi

if echo "$MIGRATE_OUT" | grep -q "P3005"; then
  echo "[docker-entrypoint] P3005: a marcar 0_init como aplicada (baseline) e a repetir migrate deploy..."
  npx prisma migrate resolve --applied 0_init
  npx prisma migrate deploy
else
  exit "${STATUS:-1}"
fi

exec npm run dev
