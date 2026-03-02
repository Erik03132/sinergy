#!/bin/bash

# Fix Permissions Script for macOS EPERM issues
# Run this script to reclaim ownership of your project files and reset npm cache.

echo "🔒 Starting Permission Fix..."

# 1. Get current user and group
USER_NAME=$(whoami)
GROUP_NAME=$(id -gn)

echo "👤 Fixing ownership for user: $USER_NAME:$GROUP_NAME"

# 2. Reclaim ownership of the entire project directory (recursive)
# This fixes cases where files were created with 'sudo'
sudo chown -R $USER_NAME:$GROUP_NAME .

echo "✅ Ownership fixed."

# 3. Aggressive Clean
echo "🧹 Cleaning project artifacts..."
rm -rf node_modules
rm -rf .next
rm -rf .swc
rm -rf package-lock.json

echo "✅ Clean complete."

# 4. Clean npm cache (force)
echo "🧹 Cleaning global npm cache..."
npm cache clean --force

echo "✅ Cache cleaned."

# 5. Reinstall dependencies
echo "📦 Reinstalling dependencies..."
npm install

echo "🎉 DONE! Try running 'npm run build' now."
