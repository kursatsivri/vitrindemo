#!/bin/sh
# supabase/tests/ altındaki tüm güvenlik testlerini çalıştırır.
# Kullanım:
#   scripts/test-db.sh --linked                      demo projesinde
#   scripts/test-db.sh --local                       CI'daki boş DB'de
#   scripts/test-db.sh --try <yeni-migration.sql>    migration'ı uygulamadan dene: demo projesinde
#                                                    migration + testler tek transaction'da, sonunda rollback
# Testler kendi içinde rollback yapar; veritabanında iz bırakmaz.
target="$1"
try_file=""
if [ "$1" = "--try" ]; then
  target="--linked"
  try_file="$2"
  [ -f "$try_file" ] || { echo "Migration dosyası yok: $try_file"; exit 1; }
fi

tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT

for f in supabase/tests/*.sql; do
  if [ -n "$try_file" ]; then
    { echo "begin;"; cat "$try_file"; grep -vx 'begin;' "$f"; } > "$tmp"
    sql="$tmp"
  else
    sql="$f"
  fi
  out=$(npx supabase db query "$target" -f "$sql" 2>&1)
  if echo "$out" | grep -q '"OK:'; then
    echo "$f: OK"
  else
    echo "$f: BAŞARISIZ"
    echo "$out" | grep -oE 'FAIL[^\\"]*' || echo "$out"
    exit 1
  fi
done
