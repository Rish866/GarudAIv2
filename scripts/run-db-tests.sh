#!/bin/bash
set -e

PGDATA=/var/lib/pgsql/15/data
PGSOCKET=/var/run/postgresql
DBNAME=garud_test
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"
MIGRATIONS_DIR="$REPO_DIR/supabase/migrations"
TESTS_DIR="$REPO_DIR/supabase/tests"

echo "=== Starting PostgreSQL ==="
rm -f $PGSOCKET/.s.PGSQL.5432* $PGDATA/postmaster.pid 2>/dev/null
su -s /bin/bash postgres -c "/usr/bin/postgres -D $PGDATA -k $PGSOCKET &"
sleep 3

# Verify connection
psql -h $PGSOCKET -U postgres -c "SELECT 'connected' as status" || { echo "FATAL: Cannot connect"; exit 1; }

echo "=== Creating database ==="
psql -h $PGSOCKET -U postgres -c "DROP DATABASE IF EXISTS $DBNAME;" 2>/dev/null
psql -h $PGSOCKET -U postgres -c "CREATE DATABASE $DBNAME;"

echo "=== Setting up auth schema (Supabase simulation) ==="
psql -h $PGSOCKET -U postgres -d $DBNAME -v ON_ERROR_STOP=1 <<'AUTHSQL'
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (
  id UUID PRIMARY KEY, email TEXT, role TEXT DEFAULT 'authenticated',
  aud TEXT DEFAULT 'authenticated', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
  SELECT COALESCE(NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid, NULL);
$$ LANGUAGE sql STABLE;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated;
  END IF;
END $$;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT SELECT ON auth.users TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO authenticated;
AUTHSQL

echo "=== Applying migrations 000-008 ==="
for f in $(ls $MIGRATIONS_DIR/*.sql | sort); do
  BASENAME=$(basename $f)
  # Skip storage_policies — requires Supabase storage schema not present locally
  if [[ "$BASENAME" == "004_storage_policies.sql" ]]; then
    echo "  Skipping: $BASENAME (requires Supabase storage schema)"
    continue
  fi
  echo "  Applying: $BASENAME"
  OUTPUT=$(psql -h $PGSOCKET -U postgres -d $DBNAME -v ON_ERROR_STOP=1 -f "$f" 2>&1)
  RC=$?
  if [ $RC -ne 0 ]; then
    echo "  FAILED (exit code $RC): $BASENAME"
    echo "$OUTPUT" | tail -30
    exit 1
  fi
done
echo "  All migrations applied successfully!"

echo ""
echo "=== Granting permissions to authenticated role ==="
psql -h $PGSOCKET -U postgres -d $DBNAME -v ON_ERROR_STOP=1 <<'GRANTSQL'
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANTSQL

echo ""
echo "=== Running test suite ==="
psql -h $PGSOCKET -U postgres -d $DBNAME -v ON_ERROR_STOP=1 -f "$TESTS_DIR/008_trip_operations_test.sql" 2>&1

echo ""
echo "=== Shutting down PostgreSQL ==="
su -s /bin/bash postgres -c "/usr/bin/pg_ctl -D $PGDATA stop -m fast" 2>/dev/null
echo "Done."
