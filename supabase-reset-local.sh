#!/usr/bin/env bash
set -euo pipefail

echo "⚠️ PELIGRO: Esto borrará la data local y recreará las tablas con el nuevo orden cronológico de migraciones v4.0"
echo "   Comando: npx supabase db reset"
echo ""

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

if ! command -v npx >/dev/null 2>&1; then
  echo "❌ npx no está disponible. Instala Node.js/npm."
  exit 1
fi

exec npx supabase db reset
