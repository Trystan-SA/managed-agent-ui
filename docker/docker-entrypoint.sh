#!/bin/sh
set -e

echo "Running database migrations..."
if ./node_modules/.bin/drizzle-kit push --force; then
  echo "Migrations complete."
else
  echo "Migration failed (exit code $?). Starting application anyway..."
fi

echo "Starting application..."
exec node build/index.js
