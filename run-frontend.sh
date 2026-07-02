#!/usr/bin/env bash
# Sobe o frontend React na porta 3000 usando o Node local de ~/tools.
set -e
cd "$(dirname "$0")/frontend"
export PATH="$HOME/tools/node-v22.17.0-linux-x64/bin:$PATH"
if [ ! -x node_modules/.bin/react-scripts ]; then
  npm install
fi
exec npm start
