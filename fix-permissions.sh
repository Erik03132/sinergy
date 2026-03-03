#!/bin/bash

# Nuclear Permission Fix for macOS EPERM issues
# This script reclaims ownership, clears attributes, and resets the environment.

echo "🚀 Starting NUCLEAR Permission Fix..."

USER_NAME=$(whoami)
GROUP_NAME=$(id -gn)

echo "👤 User: $USER_NAME, Group: $GROUP_NAME"

# 1. Reclaim ownership of EVERYTHING in the project
echo "🛠 Reclaiming project ownership..."
sudo chown -R $USER_NAME:$GROUP_NAME .

# 2. Remove macOS Extended Attributes (@ signs in ls -l)
echo "🛠 Removing macOS extended attributes..."
sudo xattr -rc .

# 3. Reset Permissions (Directories to 755, Files to 644)
echo "🛠 Resetting file permissions..."
find . -type d -exec sudo chmod 755 {} +
find . -type f -exec sudo chmod 644 {} +
# Make scripts executable again
chmod +x scripts/*.sh 2>/dev/null
chmod +x *.sh 2>/dev/null

# 4. Fix Global npm permissions (often the root cause of EPERM)
echo "🛠 Fixing global npm cache permissions..."
sudo chown -R $USER_NAME:$GROUP_NAME ~/.npm

# 5. Destroy corrupted artifacts
echo "🧹 NUKING node_modules and cache..."
sudo rm -rf node_modules
sudo rm -rf .next
sudo rm -rf .swc
sudo rm -rf package-lock.json

# 6. Clean npm cache (force)
echo "🧹 Forcing npm cache clean..."
npm cache clean --force

echo "✅ Environment is clean."

# 7. Reinstall dependencies
echo "📦 Reinstalling dependencies (Fresh start)..."
npm install

echo "🎉 DONE! Permissions reset and dependencies reinstalled."
echo "👉 Now try: npm run lint"
