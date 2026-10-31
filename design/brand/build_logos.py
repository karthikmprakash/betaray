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


# B first, manta second. The solid stem and waist make the letter; the two
# counters are the ray's swept wings. Coordinates are normalized in ray().
RAY_PATH = """M 44 218 C 44 232 54 240 68 240 C 136 240 202 234 232 228 C 216 198 192 164 158 144 C 136 132 116 132 104 128 C 116 124 136 124 158 112 C 192 92 216 58 232 28 C 202 22 136 16 68 16 C 54 16 44 24 44 38 Z M 92 64 C 138 64 180 56 202 48 C 188 76 162 96 128 108 C 116 113 104 110 98 102 C 94 95 92 80 92 64 Z M 92 192 C 92 176 94 161 98 154 C 104 146 116 143 128 148 C 162 160 188 180 202 208 C 180 200 138 192 92 192 Z"""


def ray(vc, x, y, scale, fill, name="Betaray / ray-B symbol"):
    obj = vc.run("path.create", {"d": RAY_PATH})["id"]
    vc.run("path.setFillRule", {"ids": [obj], "rule": "evenOdd"})
    vc.run("paint.setFill", {"ids": [obj], "color": fill})
    vc.run("paint.setStroke", {"ids": [obj], "none": True})
    # Normalize the path bounds to the origin so x/y below mean top-left.
    vc.run("object.move", {"ids": [obj], "dx": -44, "dy": -16})
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
    ray(vc, 90, 150, 1.8, "#526E69")
    ray(vc, 625, 190, 1.2, "#6B6AD6")
    for i, size in enumerate([16, 24, 32, 48]):
        ray(vc, 90 + i * 150, 570, size / 224, "#526E69", "Optical test / " + str(size))
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
        symbol = ray(vc, x + 40, y + 38, 0.60, color)
        word = wordmark(x + 175, y + 140, 88, word_color or color)
        group = vc.run("object.group", {"ids": [symbol, word]})["id"]
        vc.name(group, "Betaray / horizontal lockup")
        return group

    # Cover: clear, restrained usage examples, not a raster pasted into a file.
    vc.run("layer.new", {"name": "Identity board / editable artwork", "top": True})
    vc.rect(0, 0, 1440, 1120, PALETTE["paper"], "Warm paper")
    vc.text("BETARAY", 64, 70, 14, PALETTE["ink"], style="Demi Bold", tracking=160)
    vc.text("The ray. The B. One mark.", 64, 123, 36, PALETTE["ink"], style="Medium", tracking=-35)
    vc.text("A B first. The manta\u2019s wings become its two counters.", 65, 157, 16, "#677676")

    ray(vc, 255, 229, 1.35, PALETTE["lagoon"])
    wordmark(575, 420, 140, PALETTE["ink"])
    vc.text("PRIMARY  /  LAGOON + SLATE", 65, 575, 12, "#677676", tracking=100)

    vc.rect(0, 620, 1440, 258, PALETTE["lagoon"], "Reverse usage / lagoon field")
    ray(vc, 73, 674, 0.62, PALETTE["paper"])
    wordmark(290, 777, 82, PALETTE["paper"])
    vc.text("One colour. No gradients. The counters stay transparent.", 830, 751, 15, PALETTE["paper"])

    vc.text("MARK + COLOUR VARIANTS", 65, 927, 12, "#677676", tracking=100)
    ray(vc, 65, 953, 0.45, PALETTE["lagoon"])
    ray(vc, 255, 953, 0.45, PALETTE["ink"])
    ray(vc, 445, 953, 0.45, PALETTE["lilac"])
    vc.rect(665, 939, 122, 122, PALETTE["mist"], "App icon / mist", radius=28)
    ray(vc, 690, 965, 0.4, PALETTE["lagoon"])
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
        ray(vc, x + 39, y + 22, 0.95, color)

    for name, color in variants:
        x, y = board("betaray-stacked-" + name, 440, 440)
        ray(vc, x + 107, y + 30, 1.2, color)
        wordmark(x + 82, y + 369, 82, PALETTE["ink"] if name == "primary" else color)

    for name, color in [("primary", PALETTE["ink"]), ("reversed", PALETTE["paper"])]:
        x, y = board("betaray-wordmark-" + name, 480, 160)
        wordmark(x + 59, y + 112, 106, color)

    for name, bg, fg in [("sage", PALETTE["mist"], PALETTE["lagoon"]), ("lagoon", PALETTE["lagoon"], PALETTE["paper"]), ("lilac", PALETTE["lilac"], PALETTE["paper"])]:
        x, y = board("betaray-app-icon-" + name, 512, 512)
        vc.rect(x, y, 512, 512, bg, "App tile / " + name, radius=112)
        ray(vc, x + 76, y + 42, 1.9, fg)

    # Maskable icon has an opaque square background; mark sits inside its safe zone.
    x, y = board("betaray-maskable-icon", 512, 512)
    vc.rect(x, y, 512, 512, PALETTE["lagoon"], "Maskable tile / full bleed")
    ray(vc, x + 130, y + 103, 1.35, PALETTE["paper"])

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
