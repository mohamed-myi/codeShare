#!/usr/bin/env bash
set -euo pipefail

echo "=== CodeShare Setup ==="

# 1. Copy .env if missing
if [ ! -f .env ]; then
  cp .env.example .env
  echo "[ok] Created .env from .env.example -- edit it to add your API keys"
else
  echo "[skip] .env already exists"
fi

# 2. Install dependencies
echo "[...] Installing dependencies..."
pnpm install

# 3. Start Postgres
echo "[...] Starting PostgreSQL..."
docker compose up -d --wait

# 4. Migrate + seed
echo "[...] Running migrations..."
pnpm db:migrate

echo "[...] Seeding data..."
pnpm db:seed

# 5. Build all packages
echo "[...] Building packages..."
pnpm build

echo "=== Setup complete ==="
echo "Run 'pnpm dev' to start developing."
