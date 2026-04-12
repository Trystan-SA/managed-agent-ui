#!/bin/sh
set -e

echo "Installing dependencies..."
npm install

echo "Running database migrations..."
npx drizzle-kit push --force 2>&1
echo "Migrations complete."

echo "Starting dev server..."
exec npm run dev:local -- --host 0.0.0.0
