# CLAUDE.md — Project Guide for Claude Code

## Project: FigFontPlug

A Linux solution for using Figma with local fonts, consisting of a Chrome extension and a Python font helper server.

## Architecture

### Chrome Extension (`extension/`)
- Manifest V3 extension
- Uses `declarativeNetRequest` to override User-Agent to Windows Chrome on `*.figma.com` requests
- This tricks Figma into attempting a connection to the local font helper
- Minimal permissions: only active on figma.com

### Font Helper Server (`font_helper/`)
- Python async HTTP server (using aiohttp or similar)
- Listens on `localhost:18412` (Figma's expected font helper port)
- Serves fonts ONLY from a configurable directory (default: `~/figma-fonts/`)
- Uses `fontTools` to extract font metadata (family name, style, weight) from name/OS2 tables
- Implements the Figma Font Helper HTTP protocol:
  - `GET /figma/font-files` — returns JSON list of available fonts with metadata
  - `GET /figma/font-file?file=<path>` — returns the raw font file bytes
  - `GET /figma/update` — version check endpoint
- CORS headers must allow `https://www.figma.com`

### systemd Service (`scripts/`)
- User-level systemd service for auto-starting font helper on login
- `.desktop` file for launching Chrome in `--app` mode with the extension

## Tech Stack
- **Python 3.10+** with `uv` for package/venv management
- **fontTools** — font metadata extraction (name table, OS/2 table)
- **aiohttp** — async HTTP server for the font helper
- **Chrome Manifest V3** — extension APIs

## Key Design Decisions
- Font helper serves ONLY fonts from `~/figma-fonts/`, not all system fonts. This is intentional — the user wants to test specific fonts in Figma, not browse hundreds of system fonts.
- User-agent spoofing is scoped exclusively to `figma.com` domains to avoid affecting other sites.
- The font helper protocol was reverse-engineered from the official Figma Font Helper. Reference implementations: [figma-agent-linux](https://github.com/neetly/figma-agent-linux), [figma-linux-font-helper](https://github.com/Figma-Linux/figma-linux-font-helper).

## Development Notes
- Use `uv` for all Python dependency management (`uv venv`, `uv pip install`)
- The Chrome extension requires Developer Mode or `--load-extension` flag
- HTTPS on port 44950 may also be needed (Figma tries both HTTP and HTTPS)
- The font helper protocol details need to be verified by inspecting network requests in Chrome DevTools when Figma communicates with the official font helper on macOS/Windows

## File Conventions
- Python code follows PEP 8, type hints encouraged
- Project uses `pyproject.toml` (no setup.py)
- Entry point: `figfontplug-server` CLI command

## TODO
- [ ] Reverse-engineer exact Figma font helper API endpoints and response formats
- [ ] Implement font helper server with fontTools metadata extraction
- [ ] Create Chrome extension with manifest V3
- [ ] Add HTTPS support (port 44950) with self-signed certificate
- [ ] Create systemd user service unit file
- [ ] Create .desktop file for app-mode Chrome launch
- [ ] Add file watcher to auto-reload font list when ~/figma-fonts/ changes
- [ ] Test with variable fonts (.ttf with fvar table)
- [ ] Package for Fedora (RPM/COPR)
- [ ] Consider publishing extension to Chrome Web Store ($5 one-time fee)
