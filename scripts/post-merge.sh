#!/bin/bash
set -e

echo "=== Post-merge setup ==="

echo "--- Installing frontend dependencies ---"
cd frontend && npm install --legacy-peer-deps 2>&1
cd ..

echo "--- Installing backend dependencies ---"
cd backend && pip install -r requirements.txt -q 2>&1
cd ..

echo "=== Post-merge setup complete ==="
