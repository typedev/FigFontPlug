# FigFontPlug

A lightweight solution for using Figma with local fonts on Linux.

## Overview

FigFontPlug consists of two components:

1. **Chrome Extension** — spoofs the browser user-agent string (Windows) on `figma.com` so that Figma attempts to connect to a local font helper
2. **Font Helper** — a minimal Python HTTP server that serves fonts from a configurable directory (default: `~/figma-fonts/`) to Figma via the Font Helper protocol on `localhost:18412`

This approach avoids heavy Electron wrappers and works with Google Chrome or Chromium on any Linux distribution.

## Features

- Selective font loading — only fonts you place in `~/figma-fonts/` appear in Figma under "Installed by you"
- Google Fonts remain available as usual
- No system-wide font installation required — just drop `.otf`/`.ttf` files into the folder
- Lightweight Python font helper using `fontTools` for reliable metadata extraction
- Runs as a systemd user service (auto-start on login)

## Quick Start

### 1. Install the Font Helper

```bash
cd font_helper
uv venv
source .venv/bin/activate
uv pip install -e .
```

### 2. Create fonts directory and add fonts

```bash
mkdir -p ~/figma-fonts
cp /path/to/your/font.otf ~/figma-fonts/
```

### 3. Run the font helper

```bash
figfontplug-server
```

Or install as a systemd user service:

```bash
./scripts/install-service.sh
```

### 4. Install the Chrome Extension

1. Open `chrome://extensions` in Google Chrome
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `extension/` directory

Alternatively, launch Chrome with the extension pre-loaded:

```bash
google-chrome --app=https://www.figma.com \
  --load-extension=/home/alexander/WORK/FigFontPlug/extension \
  --class=figma
```

### 5. Use Figma

Open Figma in Chrome. Your fonts from `~/figma-fonts/` will appear under the **"Installed by you"** filter in the font picker.

## Project Structure

```
FigFontPlug/
├── extension/          # Chrome extension (user-agent spoof for figma.com)
│   ├── manifest.json
│   ├── background.js
│   └── icons/
├── font_helper/        # Python font helper server
│   ├── pyproject.toml
│   └── src/
│       └── figfontplug/
│           ├── __init__.py
│           └── server.py
├── scripts/            # Installation and utility scripts
│   ├── install-service.sh
│   └── figfontplug.desktop
└── README.md
```

## Requirements

- Python 3.10+
- [uv](https://docs.astral.sh/uv/) (recommended) or pip
- Google Chrome or Chromium
- Linux (tested on Fedora Workstation)

## License

Apache-2.0
