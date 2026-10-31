"""Build Betaray's editable identity using the running VectorCraft control API.

Run with VectorCraft --control 7979. All drawing and exports use VectorCraft.
"""
import json
import socket
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
EXPORTS = ROOT.parents[1] / "public" / "brand" / "betaray"
PALETTE = {"lagoon": "#526E69", "ink": "#35434A", "paper": "#F7F5F0", "lilac": "#6B6AD6", "mist": "#E6EEEA"}


class VectorCraft:
    def __init__(self):
        self.socket = socket.create_connection(("127.0.0.1", 7979), timeout=120)
        self.stream = self.socket.makefile("rwb")
        self.sequence = 0
        self.journal = []

    def call(self, method, params=None):
        self.sequence += 1
        request = {"id": self.sequence, "method": method, "params": params or {}}
        self.stream.write((json.dumps(request) + "\n").encode())
        self.stream.flush()
        reply = json.loads(self.stream.readline())
        self.journal.append({"request": request, "response": reply})
        if not reply.get("ok"):
            raise RuntimeError(json.dumps(reply))
        return reply.get("result")

    def run(self, command, params=None):
        return self.call("engine.execute", {"command": command, "params": params or {}})

    def name(self, object_id, name):
        self.run("object.setProps", {"ids": [object_id], "name": name})

    def rect(self, x, y, width, height, fill, name, radius=0):
        obj = self.run("shape.rectangle", dict(x=x, y=y, width=width, height=height, radius=radius))["id"]
        self.run("paint.setFill", {"ids": [obj], "color": fill})
        self.run("paint.setStroke", {"ids": [obj], "none": True})
        self.name(obj, name)
        return obj

    def text(self, text, x, y, size, color, name=None, style="Regular", tracking=0, font="Avenir Next"):
        obj = self.run("text.create", dict(text=text, x=x, y=y, size=size, color=color, font=font, style=style))["id"]
        self.run("text.setStyle", {"ids": [obj], "tracking": tracking})
        self.name(obj, name or text)
        return obj


# A right-facing, horizontal ray. The left body edge and two wing counters
# make the B, rather than placing an unrelated letter on an animal drawing.
RAY_PATH = """M 6 79
C 29 78 48 73 65 66
L 68 30 Q 68 18 80 18
C 112 18 142 11 170 5
C 159 30 150 53 132 68
C 143 66 151 62 160 60
C 166 58 172 59 177 62
Q 183 66 187 70
Q 179 70 175 78
Q 179 86 187 86
Q 183 90 177 94
C 172 97 166 98 160 96
C 151 94 143 90 132 88
C 150 104 160 127 170 153
C 142 146 112 138 80 138
Q 68 138 68 126 L 65 90
C 48 85 29 81 6 81 Q 2 80 6 79 Z
M 87 42 C 107 41 123 34 138 27
C 128 48 113 60 87 65 Z
M 87 94 C 111 96 129 109 138 129
C 120 122 106 116 87 115 Z"""


def ray(vc, x, y, scale, fill, name="Betaray / ray-B symbol"):
    obj = vc.run("path.create", {"d": RAY_PATH})["id"]
    vc.run("path.setFillRule", {"ids": [obj], "rule": "evenOdd"})
    vc.run("paint.setFill", {"ids": [obj], "color": fill})
    vc.run("paint.setStroke", {"ids": [obj], "none": True})
    vc.run("object.scale", {"ids": [obj], "sx": scale * 100, "sy": scale * 100, "origin": [0, 0]})
    vc.run("object.move", {"ids": [obj], "dx": x, "dy": y})
    vc.name(obj, name)
    return obj


def proof():
    vc = VectorCraft()
    vc.run("file.new", {"name": "Betaray — symbol proof", "width": 1120, "height": 680, "units": "Pixels"})
    vc.rect(0, 0, 1120, 680, "#F7F5F0", "Proof background")
    vc.text("betaray", 60, 60, 25, "#35434A", style="Demi Bold", tracking=-30)
    vc.text("Horizontal ray / B monogram", 60, 105, 15, "#677676")
    ray(vc, 90, 185, 2.1, "#526E69")
    ray(vc, 625, 210, 1.5, "#6B6AD6")
    for i, size in enumerate([16, 24, 32, 48]):
        ray(vc, 90 + i * 150, 570, size / 148, "#526E69", "Optical test / " + str(size))
        vc.text(str(size) + " px high", 90 + i * 150, 650, 12, "#677676")
    vc.run("select.set", {"ids": []})
    vc.run("view.fitArtboard")
    vc.call("app.export", {"path": str(ROOT / "symbol-proof.png"), "format": "png", "scale": 1, "background": "#F7F5F0"})
    (ROOT / "proof-journal.json").write_text(json.dumps(vc.journal, indent=2))


def identity():
    EXPORTS.mkdir(parents=True, exist_ok=True)
    vc = VectorCraft()
    vc.run("file.new", {"name": "Betaray — Ray B identity / master", "width": 1440, "height": 1120, "units": "Pixels", "backgroundContents": "transparent"})
    boards = [{"index": 0, "name": "betaray-identity", "width": 1440, "height": 1120}]

    def board(name, width, height):
        idx = len(boards)
        # Everything stays on distinct, non-overlapping artboards, below the cover.
        col, row = (idx - 1) % 3, (idx - 1) // 3
        x, y = col * 750, 1280 + row * 650
        vc.run("artboard.new", dict(x=x, y=y, width=width, height=height, name=name))
        boards.append(dict(index=idx, name=name, width=width, height=height))
        vc.run("layer.new", {"name": name, "top": True})
        return x, y

    def wordmark(x, y, size, color, name="Betaray / wordmark"):
        return vc.text("betaray", x, y, size, color, name, font="Mont", style="SemiBold", tracking=-35)

    def horizontal(x, y, color, word_color=None):
        symbol = ray(vc, x + 36, y + 38, 0.94, color)
        word = wordmark(x + 240, y + 140, 94, word_color or color)
        group = vc.run("object.group", {"ids": [symbol, word]})["id"]
        vc.name(group, "Betaray / horizontal lockup")
        return group

    # Cover: clear, restrained usage examples, not a raster pasted into a file.
    vc.run("layer.new", {"name": "Identity board / editable artwork", "top": True})
    vc.rect(0, 0, 1440, 1120, PALETTE["paper"], "Warm paper")
    vc.text("BETARAY", 64, 70, 14, PALETTE["ink"], style="Demi Bold", tracking=160)
    vc.text("The ray. The B. One mark.", 64, 123, 36, PALETTE["ink"], style="Medium", tracking=-35)
    vc.text("A horizontal manta ray, shaped into a two-counter monogram.", 65, 157, 16, "#677676")

    ray(vc, 255, 229, 1.75, PALETTE["lagoon"])
    wordmark(659, 420, 140, PALETTE["ink"])
    vc.text("PRIMARY  /  LAGOON + SLATE", 65, 575, 12, "#677676", tracking=100)

    vc.rect(0, 620, 1440, 258, PALETTE["lagoon"], "Reverse usage / lagoon field")
    ray(vc, 73, 674, 0.88, PALETTE["paper"])
    wordmark(290, 777, 82, PALETTE["paper"])
    vc.text("One colour. No gradients. The counters stay transparent.", 830, 751, 15, PALETTE["paper"])

    vc.text("MARK + COLOUR VARIANTS", 65, 927, 12, "#677676", tracking=100)
    ray(vc, 65, 953, 0.62, PALETTE["lagoon"])
    ray(vc, 255, 953, 0.62, PALETTE["ink"])
    ray(vc, 445, 953, 0.62, PALETTE["lilac"])
    vc.rect(665, 939, 122, 122, PALETTE["mist"], "App icon / mist", radius=28)
    ray(vc, 670, 960, 0.58, PALETTE["lagoon"])
    for i, (name, hex_value) in enumerate([("Lagoon", PALETTE["lagoon"]), ("Slate", PALETTE["ink"]), ("Lilac", PALETTE["lilac"]), ("Paper", PALETTE["paper"])]):
        x = 870 + i * 124
        vc.rect(x, 941, 96, 42, hex_value, name + " swatch", radius=6)
        vc.text(name, x, 1010, 12, PALETTE["ink"], style="Medium")
        vc.text(hex_value.upper(), x, 1030, 11, "#677676")

    variants = [("primary", PALETTE["lagoon"]), ("mono", PALETTE["ink"]), ("reversed", PALETTE["paper"]), ("lilac", PALETTE["lilac"])]
    for name, color in variants:
        x, y = board("betaray-horizontal-" + name, 640, 220)
        horizontal(x, y, color, PALETTE["ink"] if name == "primary" else None)

    for name, color in variants:
        x, y = board("betaray-mark-" + name, 256, 256)
        ray(vc, x + 12, y + 38, 1.2, color)

    for name, color in variants:
        x, y = board("betaray-stacked-" + name, 440, 440)
        ray(vc, x + 68, y + 40, 1.65, color)
        wordmark(x + 82, y + 369, 82, PALETTE["ink"] if name == "primary" else color)

    for name, color in [("primary", PALETTE["ink"]), ("reversed", PALETTE["paper"])]:
        x, y = board("betaray-wordmark-" + name, 480, 160)
        wordmark(x + 59, y + 112, 106, color)

    for name, bg, fg in [("sage", PALETTE["mist"], PALETTE["lagoon"]), ("lagoon", PALETTE["lagoon"], PALETTE["paper"]), ("lilac", PALETTE["lilac"], PALETTE["paper"])]:
        x, y = board("betaray-app-icon-" + name, 512, 512)
        vc.rect(x, y, 512, 512, bg, "App tile / " + name, radius=112)
        ray(vc, x + 14, y + 72, 2.35, fg)

    # Maskable icon has an opaque square background; mark sits inside its safe zone.
    x, y = board("betaray-maskable-icon", 512, 512)
    vc.rect(x, y, 512, 512, PALETTE["lagoon"], "Maskable tile / full bleed")
    ray(vc, x + 87, y + 128, 1.6, PALETTE["paper"])

    # Typography stays live in the native master, paths in production SVGs.
    fonts = vc.run("text.fonts")
    if any(f.get("missing") or f.get("status") == "missing" for f in fonts):
        raise RuntimeError("Missing logo font: " + json.dumps(fonts))
    vc.run("select.set", {"ids": []})
    source = ROOT / "betaray-identity.vectorcraft"
    vc.call("app.save", {"path": str(source)})
    vc.call("app.export", {"path": str(ROOT / "betaray-identity.png"), "format": "png", "artboard": 0, "scale": 1.25})
    vc.call("app.export", {"path": str(ROOT / "betaray-identity.pdf"), "format": "pdf", "artboard": 0, "advanced": {"outlineText": True}})

    warnings = []
    for b in boards[1:]:
        base = EXPORTS / b["name"]
        for ext in ["svg", "png"]:
            params = {"path": str(base.with_suffix("." + ext)), "format": ext, "artboard": b["index"]}
            if ext == "svg":
                params["svg"] = {"outlineText": True, "minify": False, "preserveEditing": False, "responsive": True}
            else:
                params.update(scale=2, background="transparent")
            result = vc.call("app.export", params)
            if result and result.get("warnings"):
                warnings.append({"file": b["name"] + "." + ext, "warnings": result["warnings"]})
        if "horizontal" in b["name"] or "stacked" in b["name"]:
            vc.call("app.export", {"path": str(base.with_suffix(".pdf")), "format": "pdf", "artboard": b["index"], "advanced": {"outlineText": True}})

    # Size-specific PNGs made by the same renderer, no screenshot resizing.
    icon_idx = next(b["index"] for b in boards if b["name"] == "betaray-app-icon-lagoon")
    mask_idx = next(b["index"] for b in boards if b["name"] == "betaray-maskable-icon")
    for size in [16, 32, 48, 64, 128, 180, 192, 256, 512, 1024]:
        vc.call("app.export", {"path": str(EXPORTS / ("betaray-icon-" + str(size) + ".png")), "format": "png", "artboard": icon_idx, "scale": size / 512, "background": "transparent"})
    for size in [192, 512]:
        vc.call("app.export", {"path": str(EXPORTS / ("betaray-maskable-" + str(size) + ".png")), "format": "png", "artboard": mask_idx, "scale": size / 512})

    # Display the cover, rather than fit hundreds of metres of pasteboard.
    vc.call("ui.focus")
    vc.run("view.goToArtboard", {"index": 0})
    (ROOT / "vectorcraft-journal.json").write_text(json.dumps(vc.journal, indent=2))
    (ROOT / "export-manifest.json").write_text(json.dumps({"source": source.name, "artboards": boards, "fonts": fonts, "warnings": warnings}, indent=2))
    print(json.dumps({"source": str(source), "artboards": len(boards), "exportFolder": str(EXPORTS), "warnings": warnings}, indent=2))


if __name__ == "__main__":
    identity() if "--identity" in sys.argv else proof()
