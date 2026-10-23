#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/cep/com.aeagent.panel"
DEST="$HOME/Library/Application Support/Adobe/CEP/extensions/com.aeagent.panel"

mkdir -p "$HOME/Library/Application Support/Adobe/CEP/extensions"
mkdir -p "$DEST"
cp -R "$SRC/" "$DEST/"

defaults write com.adobe.CSXS.9 PlayerDebugMode 1
defaults write com.adobe.CSXS.10 PlayerDebugMode 1
defaults write com.adobe.CSXS.11 PlayerDebugMode 1
defaults write com.adobe.CSXS.12 PlayerDebugMode 1

echo "Installed: $DEST"
echo "Restart After Effects, then open Window > Extensions > AE Agent"
