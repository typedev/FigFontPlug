"""FigFontPlug — Figma font helper server for Linux.

Serves local fonts from ~/figma-fonts/ using the Figma Font Helper protocol.
"""

import argparse
import os
from pathlib import Path

from aiohttp import web
from fontTools.ttLib import TTFont

PROTOCOL_VERSION = 23
PACKAGE_VERSION = "126.1.2"
DEFAULT_PORT = 44950
DEFAULT_FONTS_DIR = Path.home() / "figma-fonts"
FONT_EXTENSIONS = {".ttf", ".otf", ".ttc"}


def scan_fonts(fonts_dir: Path) -> dict[str, list[dict]]:
    """Scan fonts directory and extract metadata using fontTools."""
    font_files: dict[str, list[dict]] = {}

    if not fonts_dir.is_dir():
        return font_files

    for path in fonts_dir.rglob("*"):
        if path.suffix.lower() not in FONT_EXTENSIONS:
            continue

        abs_path = str(path.resolve())
        try:
            faces = _extract_faces(path)
            if faces:
                font_files[abs_path] = faces
        except Exception as e:
            print(f"Warning: failed to read {path}: {e}")

    return font_files


def _extract_faces(path: Path) -> list[dict]:
    """Extract font face metadata from a font file."""
    faces = []
    suffix = path.suffix.lower()
    mtime = int(path.stat().st_mtime)

    if suffix == ".ttc":
        tt = TTFont(path, fontNumber=0)
        num_fonts = tt.reader.numFonts
        tt.close()
        for i in range(num_fonts):
            faces.extend(_read_face(path, mtime, font_number=i))
    else:
        faces.extend(_read_face(path, mtime))

    return faces


def _read_face(path: Path, mtime: int, font_number: int = 0) -> list[dict]:
    """Read metadata from a single font face. Returns multiple entries for variable fonts."""
    try:
        tt = TTFont(path, fontNumber=font_number)
    except Exception:
        return []

    try:
        name_table = tt["name"]
        family = _get_name(name_table, 1) or path.stem
        style = _get_name(name_table, 2) or "Regular"
        postscript = _get_name(name_table, 6) or f"{family}-{style}"

        weight = 400
        stretch = 5
        italic = False

        if "OS/2" in tt:
            os2 = tt["OS/2"]
            weight = os2.usWeightClass
            stretch = os2.usWidthClass
            italic = bool(os2.fsSelection & 1)

        # Variable fonts: enumerate named instances with variation axes
        if "fvar" in tt:
            fvar = tt["fvar"]

            # Build axes info (same for all instances, only value differs)
            axes_info = []
            for axis in fvar.axes:
                axis_name = _get_name(name_table, axis.axisNameID) if axis.axisNameID else axis.axisTag
                axes_info.append({
                    "tag": axis.axisTag,
                    "name": axis_name or axis.axisTag,
                    "min": axis.minValue,
                    "max": axis.maxValue,
                    "default": axis.defaultValue,
                    "hidden": bool(getattr(axis, "flags", 0) & 0x0001),
                })

            instances = []
            for inst in fvar.instances:
                sub_id = getattr(inst, "subfamilyNameID", None)
                inst_style = _get_name(name_table, sub_id) if sub_id else style
                ps_id = getattr(inst, "postScriptNameID", None)
                if ps_id and ps_id != 0xFFFF:
                    inst_ps = _get_name(name_table, ps_id)
                else:
                    inst_ps = f"{family.replace(' ', '')}-{inst_style.replace(' ', '')}"

                inst_weight = int(inst.coordinates.get("wght", weight))
                inst_stretch = _wdth_to_width_class(inst.coordinates.get("wdth", None), stretch)
                inst_italic_raw = inst.coordinates.get("ital", None)
                inst_italic = inst_italic_raw > 0 if inst_italic_raw is not None else italic

                # Per-instance axes with current values
                inst_axes = []
                for ai in axes_info:
                    inst_axes.append({
                        **ai,
                        "value": inst.coordinates.get(ai["tag"], ai["default"]),
                    })

                instances.append({
                    "family": family,
                    "style": inst_style,
                    "postscript": inst_ps,
                    "weight": inst_weight,
                    "stretch": inst_stretch,
                    "italic": inst_italic,
                    "variationAxes": inst_axes,
                    "modified_at": mtime,
                    "user_installed": True,
                })

            if instances:
                return instances

        return [{
            "family": family,
            "style": style,
            "postscript": postscript,
            "weight": weight,
            "stretch": stretch,
            "italic": italic,
            "modified_at": mtime,
            "user_installed": True,
        }]
    finally:
        tt.close()


def _wdth_to_width_class(wdth: float | None, default: int) -> int:
    """Map CSS font-stretch percentage (fvar wdth axis) to OS/2 usWidthClass (1-9)."""
    if wdth is None:
        return default
    if wdth <= 50:
        return 1
    elif wdth <= 62.5:
        return 2
    elif wdth <= 75:
        return 3
    elif wdth <= 87.5:
        return 4
    elif wdth <= 100:
        return 5
    elif wdth <= 112.5:
        return 6
    elif wdth <= 125:
        return 7
    elif wdth <= 150:
        return 8
    else:
        return 9


def _get_name(name_table, name_id: int) -> str | None:
    """Get a name string from the font name table, preferring platform 3 (Windows)."""
    record = name_table.getName(name_id, 3, 1, 0x0409)
    if record is None:
        record = name_table.getName(name_id, 1, 0, 0)
    if record is None:
        return None
    return str(record)


def create_app(fonts_dir: Path) -> web.Application:
    """Create and configure the aiohttp application."""
    font_cache: dict[str, list[dict]] = scan_fonts(fonts_dir)
    resolved_fonts_dir = fonts_dir.resolve()

    print(f"Scanned {len(font_cache)} font files from {fonts_dir}")

    @web.middleware
    async def cors_middleware(request: web.Request, handler):
        if request.method == "OPTIONS":
            resp = web.Response()
        else:
            resp = await handler(request)

        if request.path.startswith("/figma/"):
            resp.headers["Access-Control-Allow-Origin"] = "https://www.figma.com"
            resp.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
            resp.headers["Access-Control-Allow-Headers"] = "*"
            resp.headers["Vary"] = "Origin"

        return resp

    async def handle_font_files(request: web.Request) -> web.Response:
        nonlocal font_cache
        # Rescan on each request (font dir is small)
        font_cache = scan_fonts(fonts_dir)
        return web.json_response({
            "version": PROTOCOL_VERSION,
            "fontFiles": font_cache,
        })

    async def handle_font_file(request: web.Request) -> web.Response:
        file_path = request.query.get("file", "")
        if not file_path:
            return web.Response(status=400, text="Missing 'file' parameter")

        # Path traversal protection
        requested = Path(file_path).resolve()
        if not str(requested).startswith(str(resolved_fonts_dir) + os.sep) and requested != resolved_fonts_dir:
            return web.Response(status=403, text="Forbidden")

        if not requested.is_file():
            return web.Response(status=404, text="Font not found")

        return web.FileResponse(requested, headers={
            "Content-Type": "application/octet-stream",
            "Content-Disposition": f'attachment; filename="{requested.name}"',
        })

    async def handle_version(request: web.Request) -> web.Response:
        return web.json_response({"version": PROTOCOL_VERSION, "package": PACKAGE_VERSION})

    async def handle_can_open_url(request: web.Request) -> web.Response:
        return web.json_response({"canOpen": True})

    async def handle_font_preview(request: web.Request) -> web.Response:
        # Return a minimal empty SVG — Figma will still show fonts, just no preview
        family = request.query.get("family", "Font")
        svg = (
            '<svg width="180" height="21" viewBox="0 0 125 12" xmlns="http://www.w3.org/2000/svg">'
            f'<text x="0" y="10" font-size="10" font-family="{family}" fill="currentColor">'
            f'{family}</text></svg>'
        )
        return web.Response(
            text=svg,
            content_type="image/svg+xml",
            headers={"Cache-Control": "private, max-age=86400"},
        )

    app = web.Application(middlewares=[cors_middleware])
    app.router.add_get("/figma/font-files", handle_font_files)
    app.router.add_get("/figma/font-file", handle_font_file)
    app.router.add_get("/figma/version", handle_version)
    app.router.add_get("/figma/update", handle_version)  # alias
    app.router.add_get("/figma/desktop/can-open-url", handle_can_open_url)
    app.router.add_get("/figma/font-preview", handle_font_preview)
    # Handle OPTIONS for all /figma/ routes
    app.router.add_route("OPTIONS", "/figma/{path:.*}", lambda r: web.Response())

    return app


def main():
    parser = argparse.ArgumentParser(description="FigFontPlug font helper server")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT, help=f"Port to listen on (default: {DEFAULT_PORT})")
    parser.add_argument("--fonts-dir", type=Path, default=None, help=f"Fonts directory (default: {DEFAULT_FONTS_DIR})")
    args = parser.parse_args()

    fonts_dir = args.fonts_dir or Path(os.environ.get("FIGFONTPLUG_FONTS_DIR", str(DEFAULT_FONTS_DIR)))
    fonts_dir = fonts_dir.expanduser()

    if not fonts_dir.is_dir():
        print(f"Fonts directory does not exist: {fonts_dir}")
        print(f"Create it with: mkdir -p {fonts_dir}")
        print("Starting anyway (will serve empty font list)...")

    print(f"FigFontPlug server starting on http://127.0.0.1:{args.port}")
    print(f"Fonts directory: {fonts_dir}")

    app = create_app(fonts_dir)
    web.run_app(app, host="127.0.0.1", port=args.port, print=None)


if __name__ == "__main__":
    main()
