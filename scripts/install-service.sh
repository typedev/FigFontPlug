#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== FigFontPlug Service Installer ==="

# Create fonts directory
mkdir -p "$HOME/figma-fonts"
echo "✓ Created ~/figma-fonts/"

# Install systemd service
mkdir -p "$HOME/.config/systemd/user"
cp "$SCRIPT_DIR/figfontplug.service" "$HOME/.config/systemd/user/"
systemctl --user daemon-reload
systemctl --user enable figfontplug.service
systemctl --user start figfontplug.service
echo "✓ Installed and started systemd service"

echo ""
echo "Done! Font helper is running."
echo "Drop .otf/.ttf files into ~/figma-fonts/ and reload Figma."
