#!/bin/bash
# Local PostgreSQL migration test runner.
# Run as: su -s /bin/bash postgres -c "bash scripts/run-all-migrations.sh"
# Requires: PostgreSQL 15 installed, run from the repository root directory.
# No credentials, tokens, or connection strings stored in this file.
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"
PGHOST=/var/run/postgresql
export PGHOST

# Start PostgreSQL
/usr/bin/postgres -D /var/lib/pgsql/15/data -k /var/run/postgresql &
PG_PID=$!
sleep 3

echo "=== Creating fresh database ==="
psql -c "DROP DATABASE IF EXISTS garud_test;"
psql -c "CREATE DATABASE garud_test;"

echo "=== Setting up auth schema ==="
psql -d garud_test -v ON_ERROR_STOP=1 -f "$REPO_DIR/scripts/setup-auth.sql"

echo "=== Applying migrations ==="
MIGRATIONS_DIR="$REPO_DIR/supabase/migrations"
for f in $(ls $MIGRATIONS_DIR/*.sql | sort); do
  BASENAME=$(basename "$f")
  if [ "$BASENAME" = "004_storage_policies.sql" ]; then
    echo "  SKIP: $BASENAME (requires Supabase storage schema)"
    continue
  fi
  echo -n "  $BASENAME ... "
  psql -d garud_test -f "$f" > /var/lib/pgsql/15/migration_out.txt 2>&1
  if grep -qi "^psql.*ERROR\|^ERROR" /var/lib/pgsql/15/migration_out.txt; then
    echo "FAILED"
    grep -i "ERROR" /var/lib/pgsql/15/migration_out.txt | head -10
    kill $PG_PID 2>/dev/null; wait $PG_PID 2>/dev/null
    exit 1
  fi
  echo "OK"
done

echo ""
echo "=== Post-migration grants ==="
psql -d garud_test -c "GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated; GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated; GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;"

echo ""
echo "=== Verifying RPCs exist ==="
psql -d garud_test -t -c "SELECT proname FROM pg_proc WHERE proname IN ('cancel_trip','reopen_trip','transition_trip_status','update_trip_details','is_valid_trip_transition') ORDER BY proname;"

echo ""
echo "=== Verifying trip_status_history table ==="
psql -d garud_test -t -c "SELECT column_name FROM information_schema.columns WHERE table_name='trip_status_history' ORDER BY ordinal_position;"

echo ""
echo "=== Verifying new trip columns ==="
psql -d garud_test -t -c "SELECT column_name FROM information_schema.columns WHERE table_name='trips' AND column_name IN ('cancelled_by','previous_status','reopened_by','reopened_at','reopen_reason','updated_at') ORDER BY column_name;"

echo ""
echo "=== Running SQL test suite ==="
psql -d garud_test -v ON_ERROR_STOP=1 -f "$REPO_DIR/supabase/tests/008_trip_operations_test.sql" 2>&1

echo ""
echo "=== Shutting down ==="
kill $PG_PID 2>/dev/null
wait $PG_PID 2>/dev/null
echo "ALL DONE"
