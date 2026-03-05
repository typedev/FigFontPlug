# FigFontPlug

A lightweight solution for using Figma with local fonts on Linux.

## Overview

FigFontPlug consists of two components:

1. **Chrome Extension** — spoofs the browser identity (macOS) on `figma.com` so that Figma connects to a local font helper and requests font previews
2. **Font Helper** — a minimal Python HTTP server that serves fonts from `~/figma-fonts/` to Figma via the Font Helper protocol on `localhost:44950`

This approach avoids heavy Electron wrappers and works with Google Chrome or Chromium on any Linux distribution.

## Features

- Selective font loading — only fonts you place in `~/figma-fonts/` appear in Figma under "Installed by you"
- Font previews with real glyph outlines in the font picker (rendered server-side as SVG, matching macOS format)
- Variable font support (named instances with variation axes)
- Google Fonts remain available as usual
- No system-wide font installation required — just drop `.otf`/`.ttf`/`.ttc` files into the folder
- Lightweight Python font helper (~27 MB RAM idle, 0% CPU)
- Runs as a systemd user service (auto-start on login)

## Quick Start

### 1. Install the Font Helper

```bash
cd font_helper
uv venv
source .venv/bin/activate
uv pip install -e .
```

### 2. Install as a systemd service

```bash
./scripts/install-service.sh
```

This creates `~/figma-fonts/`, installs and starts the service. It will auto-start on login.

### 3. Add fonts

```bash
cp /path/to/your/font.otf ~/figma-fonts/
```

### 4. Install the Chrome Extension

1. Open `chrome://extensions` in Google Chrome
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `extension/` directory

### 5. Use Figma

Open Figma in Chrome. Your fonts from `~/figma-fonts/` will appear under the **"Installed by you"** filter in the font picker with real glyph previews. After adding/removing fonts, reload the Figma page (F5).

## Service Management

```bash
# Check status
systemctl --user status figfontplug

# Restart
systemctl --user restart figfontplug

# Stop
systemctl --user stop figfontplug

# View logs
journalctl --user -u figfontplug -f
```

## Manual Run (without systemd)

```bash
figfontplug-server
figfontplug-server --port 44950 --fonts-dir ~/figma-fonts
```

## Project Structure

```
FigFontPlug/
├── extension/          # Chrome extension (macOS identity spoof for figma.com)
│   ├── manifest.json
│   ├── rules.json      # declarativeNetRequest UA/Client Hints rules
│   ├── spoof.js        # navigator property overrides (content script)
│   └── icons/
├── font_helper/        # Python font helper server
│   ├── pyproject.toml
│   └── src/
│       └── figfontplug/
│           ├── __init__.py
│           └── server.py
├── scripts/            # Installation and utility scripts
│   ├── install-service.sh
│   ├── figfontplug.service
│   └── figfontplug.desktop
└── README.md
```

## How It Works

1. The Chrome extension makes Figma think it's running on macOS by spoofing `navigator.platform`, `userAgent`, `userAgentData`, and HTTP headers (`User-Agent`, `Sec-CH-UA-Platform`)
2. Figma's macOS code path connects to `localhost:44950` and requests font metadata via `/figma/font-files`
3. The font helper scans `~/figma-fonts/`, extracts metadata with `fontTools`, and returns the font list
4. When the font picker opens, Figma requests `/figma/font-preview` for each font — the helper renders the family name using actual glyph outlines (via `fontTools.pens.svgPathPen`) and returns SVG with `<path>` elements
5. When a font is used, Figma downloads the raw file via `/figma/font-file`

## Requirements

- Python 3.10+
- [uv](https://docs.astral.sh/uv/) (recommended) or pip
- Google Chrome or Chromium
- Linux (tested on Fedora Workstation)

## Known Limitations

- Font list refreshes require a page reload (F5) — Figma caches fonts in JS memory after first fetch, no push mechanism exists in the protocol
- The Chrome extension spoofs macOS identity only on `figma.com` domains

## License

Apache-2.0
