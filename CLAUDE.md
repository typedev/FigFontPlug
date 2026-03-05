# CLAUDE.md — Project Guide for Claude Code

## Project: FigFontPlug

A Linux solution for using Figma with local fonts, consisting of a Chrome extension and a Python font helper server.

## Architecture

### Chrome Extension (`extension/`)
- Manifest V3 extension
- Uses `declarativeNetRequest` to override User-Agent and Client Hints to macOS Chrome on `*.figma.com` requests
- Content script (`spoof.js`) overrides `navigator.platform`, `navigator.userAgent`, `navigator.userAgentData` to macOS
- This tricks Figma into using the macOS code path, which connects to the local font helper and requests font previews
- Minimal permissions: only active on figma.com

### Font Helper Server (`font_helper/`)
- Python async HTTP server using aiohttp
- Listens on `localhost:44950` (Figma's expected font helper port)
- Serves fonts ONLY from a configurable directory (default: `~/figma-fonts/`)
- Uses `fontTools` to extract font metadata (family name, style, weight) from name/OS2 tables
- Variable font support: enumerates named instances from fvar table with variation axes
- Implements the Figma Font Helper HTTP protocol:
  - `GET /figma/font-files` — returns JSON list of available fonts with metadata (`Cache-Control: no-cache`)
  - `GET /figma/font-file?file=<path>` — returns the raw font file bytes
  - `GET /figma/font-preview?file=<path>&font_size=<n>&family=<name>&postscript=<name>` — returns SVG with glyph outlines rendered via fontTools SVGPathPen/TransformPen, LRU-cached (256 entries), matches macOS format (y-negated coords, data-scale attribute)
  - `GET /figma/version` / `GET /figma/update` — version check endpoint
  - `GET /figma/desktop/can-open-url` — returns `{"canOpen": true}`
- CORS headers allow `https://www.figma.com`
- Path traversal protection on all file-serving endpoints

### systemd Service (`scripts/`)
- User-level systemd service for auto-starting font helper on login
- `install-service.sh` — copies service, enables, starts
- `.desktop` file for launching Chrome in `--app` mode with the extension

## Tech Stack
- **Python 3.10+** with `uv` for package/venv management
- **fontTools** — font metadata extraction (name table, OS/2 table, fvar), glyph outline rendering (SVGPathPen, TransformPen)
- **aiohttp** — async HTTP server for the font helper
- **Chrome Manifest V3** — declarativeNetRequest + content scripts

## Key Design Decisions
- Font helper serves ONLY fonts from `~/figma-fonts/`, not all system fonts. This is intentional — the user wants to test specific fonts in Figma, not browse hundreds of system fonts.
- Platform spoofing uses **macOS** (not Windows) because Figma only requests `/figma/font-preview` on the macOS code path. Windows path skips preview requests.
- Spoofing is scoped exclusively to `figma.com` domains to avoid affecting other sites.
- Font preview SVG format must match macOS Figma Font Helper exactly: y-negated coordinates, `data-scale` attribute, `viewBox` with negative y origin. Deviations cause rendering issues in Figma's font picker.
- Font list cache: Figma caches the font list in JS memory after first fetch. No push mechanism exists — page reload required after adding/removing fonts.
- The font helper protocol was reverse-engineered from the official Figma Font Helper. Reference implementations: [figma-agent-linux](https://github.com/neetly/figma-agent-linux), [figma-linux-font-helper](https://github.com/Figma-Linux/figma-linux-font-helper).

## Development Notes
- Use `uv` for all Python dependency management (`uv venv`, `uv pip install`)
- The Chrome extension requires Developer Mode or `--load-extension` flag
- Server port is 44950 (HTTP). HTTPS on same port may also be needed in some cases.
- When debugging, use `PYTHONUNBUFFERED=1` — aiohttp buffers stdout when redirected
- Chrome version in UA strings should be kept close to the installed Chrome version
- Test font preview output with: `curl 'http://127.0.0.1:44950/figma/font-preview?file=<path>&font_size=12&family=<name>&postscript=<ps>&style=<style>&v=5'`

## File Conventions
- Python code follows PEP 8, type hints encouraged
- Project uses `pyproject.toml` (no setup.py)
- Entry point: `figfontplug-server` CLI command

## TODO
- [x] Reverse-engineer exact Figma font helper API endpoints and response formats
- [x] Implement font helper server with fontTools metadata extraction
- [x] Create Chrome extension with manifest V3
- [x] Create systemd user service unit file
- [x] Create .desktop file for app-mode Chrome launch
- [x] Test with variable fonts (.ttf with fvar table)
- [x] Font preview rendering with real glyph outlines
- [ ] Add HTTPS support (port 44950) with self-signed certificate
- [ ] Add file watcher to auto-reload font list when ~/figma-fonts/ changes
- [ ] Package for Fedora (RPM/COPR)
- [ ] Consider publishing extension to Chrome Web Store ($5 one-time fee)
