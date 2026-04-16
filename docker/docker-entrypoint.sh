#!/bin/sh
set -e

echo "Installing dependencies..."
npm install 2>&1

echo "Running database migrations..."
npx drizzle-kit push --force 2>&1
echo "Migrations complete."

echo "Starting application..."
exec node build/index.js
