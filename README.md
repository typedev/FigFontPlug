# FigFontPlug

Use local fonts in Figma on Linux — without Electron wrappers or system-wide font installation.

FigFontPlug is a lightweight Chrome extension paired with a local font helper server. Drop `.otf`/`.ttf`/`.ttc` files into `~/figma-fonts/` and they appear in Figma's font picker with real glyph previews.

## Features

- **Selective font loading** — only fonts in `~/figma-fonts/` appear under "Installed by you" in Figma
- **Real glyph previews** — font picker shows actual rendered glyphs, not generic placeholders
- **Variable font support** — named instances with variation axes work correctly
- **Live change detection** — add or remove fonts and get an in-page notification with a reload button
- **Zero system changes** — no system-wide font installation, no root access required
- **Lightweight** — Python server uses ~27 MB RAM idle, 0% CPU
- **Auto-start** — runs as a systemd user service on login

## How It Works

FigFontPlug has two components:

1. **Chrome Extension** — makes Figma think the browser is running on macOS by spoofing `navigator` properties and HTTP headers (User-Agent, Client Hints) on `figma.com` only. This activates Figma's macOS code path, which connects to a local font helper.

2. **Font Helper Server** — a Python HTTP server on `localhost:44950` that implements the Figma Font Helper protocol:
   - Serves font metadata (family, style, weight, variation axes) extracted with `fontTools`
   - Renders font preview SVGs with real glyph outlines
   - Watches `~/figma-fonts/` for changes and pushes notifications via Server-Sent Events

```
Figma (browser)                 Extension                     Font Helper (localhost:44950)
     |                              |                                    |
     |  --- page load ---------->   |                                    |
     |  <-- spoof as macOS ------   |                                    |
     |                              |                                    |
     |  --- GET /figma/font-files ---------------------------------------->
     |  <-- JSON: font metadata -------------------------------------------
     |                              |                                    |
     |  --- GET /figma/font-preview --------------------------------------->
     |  <-- SVG: glyph outlines -------------------------------------------
     |                              |                                    |
     |                     font-watcher.js --- SSE /figma/font-changes --->
     |                     <-- event: fonts_changed -----------------------
     |  <-- toast: "Font library updated" [Reload]                       |
```

## Installation

### Prerequisites

- Linux (tested on Fedora, should work on any distro with systemd)
- Google Chrome or Chromium
- Python 3.10+
- [uv](https://docs.astral.sh/uv/) (recommended) or pip

### 1. Clone the repository

```bash
git clone https://github.com/typedev/FigFontPlug.git
cd FigFontPlug
```

### 2. Install the font helper server

```bash
cd font_helper
uv venv
source .venv/bin/activate
uv pip install -e .
```

This installs the `figfontplug-server` command into the virtual environment.

### 3. Install as a systemd service (recommended)

```bash
./scripts/install-service.sh
```

This will:
- Create `~/figma-fonts/` directory
- Install and enable a systemd user service that starts automatically on login

**Important:** The service file assumes the project lives at its current path. If you move the project, re-run the installer or edit `~/.config/systemd/user/figfontplug.service` to update the `ExecStart` path.

Alternatively, run the server manually:

```bash
figfontplug-server
# or with custom options:
figfontplug-server --port 44950 --fonts-dir ~/figma-fonts
```

### 4. Install the Chrome extension

1. Open `chrome://extensions` in Google Chrome
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked** and select the `extension/` directory from this project
4. The extension icon should appear — it only activates on `figma.com`

### 5. Add fonts and use Figma

```bash
# Drop fonts into the watched directory
cp /path/to/MyFont.otf ~/figma-fonts/
```

Open Figma in Chrome. Your fonts will appear under **"Installed by you"** in the font picker. When you add or remove fonts, a toast notification will appear offering to reload the page.

## Service Management

```bash
# Check status
systemctl --user status figfontplug

# Restart after updates
systemctl --user restart figfontplug

# Stop
systemctl --user stop figfontplug

# View logs
journalctl --user -u figfontplug -f
```

## Project Structure

```
FigFontPlug/
├── extension/                  # Chrome Manifest V3 extension
│   ├── manifest.json           # Extension configuration
│   ├── rules.json              # HTTP header rewrite rules (User-Agent, Client Hints)
│   ├── spoof.js                # Navigator property spoofing (MAIN world)
│   ├── font-watcher.js         # SSE client for font change events (MAIN world)
│   ├── notify.js               # Toast notification UI (ISOLATED world, Shadow DOM)
│   └── icons/
├── font_helper/                # Python font helper server
│   ├── pyproject.toml          # Package config and dependencies
│   └── src/figfontplug/
│       └── server.py           # aiohttp server, font scanning, SVG rendering, file watcher
├── scripts/
│   ├── install-service.sh      # Systemd service installer
│   ├── figfontplug.service     # Systemd user unit file
│   └── figfontplug.desktop     # .desktop launcher for Chrome app mode
└── README.md
```

## Privacy and Security

FigFontPlug is designed to be transparent and minimal in scope:

**What it does:**
- The Chrome extension modifies browser identity (User-Agent, platform) **only on `*.figma.com` pages** — no other websites are affected
- The font helper server listens **only on `localhost:44950`** — it is not accessible from the network
- The server serves **only files from `~/figma-fonts/`** with path traversal protection — it cannot access files outside that directory
- CORS headers restrict responses to `https://www.figma.com` origin only

**What it does NOT do:**
- Does not collect, transmit, or store any data
- Does not modify Figma files or communicate with any remote server
- Does not install fonts system-wide or modify system font configuration
- Does not require root access or elevated privileges
- Does not run any code outside of `figma.com` pages

**Network activity:**
- `localhost:44950` — font helper serving fonts to Figma (HTTP, local only)
- No outbound connections from the extension or server
- The server's SSE endpoint (`/figma/font-changes`) is used only for local push notifications about font directory changes

**Extension permissions explained:**
- `declarativeNetRequest` — rewrite HTTP headers on figma.com requests (User-Agent spoofing)
- `host_permissions: *://*.figma.com/*` — required for content scripts to run on Figma pages
- No `storage`, `tabs`, `cookies`, `webRequest`, or other broad permissions

**Source code:** The project is fully open source. The extension contains no minified or obfuscated code — every file is human-readable.

## Known Limitations

- Figma caches the font list in memory after first load. Adding/removing fonts triggers a toast notification — click "Reload" or press F5 to refresh
- The extension spoofs macOS identity only on `figma.com` — this is intentional and required for Figma's font helper protocol to activate
- Font helper uses HTTP (not HTTPS) on port 44950. Some Figma features may require HTTPS in the future
- Variable fonts with unusual naming may return 404 on preview if added after the server started — reload Figma to rescan

## Troubleshooting

**Fonts don't appear in Figma:**
1. Check the server is running: `systemctl --user status figfontplug`
2. Verify fonts are in `~/figma-fonts/`: `ls ~/figma-fonts/`
3. Hard-reload the Figma page (Ctrl+Shift+R)
4. Check the extension is enabled at `chrome://extensions`

**Font previews are missing:**
- Open DevTools (F12) and check for errors in Console
- Test the server: `curl http://127.0.0.1:44950/figma/font-files | python -m json.tool`

**Toast notifications don't appear:**
- Ensure both `font-watcher.js` and `notify.js` are listed in `chrome://extensions` details
- Check Console for `[FigFontPlug]` messages
- Test SSE: `curl -N http://127.0.0.1:44950/figma/font-changes`

**Server won't start (port in use):**
- Check what's using the port: `ss -tlnp | grep 44950`
- Kill the old process or restart the service: `systemctl --user restart figfontplug`

## License

Apache-2.0

## Authors

- **Alexander Lubovenko** — [typedev](https://github.com/typedev)
- **Claude** (Anthropic) — AI pair programmer
