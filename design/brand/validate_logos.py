"""Check delivered assets and package the VectorCraft identity for handoff."""
import json
from collections import Counter
from pathlib import Path
import xml.etree.ElementTree as ET
import zipfile

from PIL import Image

ROOT = Path(__file__).resolve().parent
EXPORTS = ROOT.parents[1] / "public" / "brand" / "betaray"
NS = {"s": "http://www.w3.org/2000/svg"}


def main():
    source = ROOT / "betaray-identity.vectorcraft"
    assert source.stat().st_size > 10000
    manifest = json.loads((ROOT / "export-manifest.json").read_text())
    reopened = json.loads((ROOT / "native-reopen-check.json").read_text())
    assert len(manifest["artboards"]) == 19
    assert len(reopened["artboards"]) == 19
    assert not manifest["warnings"]
    assert all(f["status"] == "exact" for f in manifest["fonts"])

    svg_checks = []
    for path in sorted(EXPORTS.glob("*.svg")):
        svg = ET.parse(path).getroot()
        paths = svg.findall(".//s:path", NS)
        assert paths, path.name
        assert not svg.findall(".//s:text", NS), f"Live font dependency: {path.name}"
        assert not svg.findall(".//s:image", NS), f"Raster in logo: {path.name}"
        if "wordmark" not in path.name:
            ray = next(p for p in paths if "ray-B" in p.attrib.get("id", ""))
            assert ray.attrib.get("fill-rule") == "evenodd"
        svg_checks.append({"name": path.name, "paths": len(paths), "viewBox": svg.attrib["viewBox"], "outlined": True, "rasterImages": 0})

    png_checks = []
    for path in sorted(EXPORTS.glob("*.png")):
        im = Image.open(path).convert("RGBA")
        alpha_min, alpha_max = im.getchannel("A").getextrema()
        assert alpha_max == 255
        if "-icon-" in path.name and path.stem.rsplit("-", 1)[-1].isdigit():
            expected = int(path.stem.rsplit("-", 1)[-1])
            assert im.size == (expected, expected), path.name
        if "maskable" not in path.name:
            assert alpha_min == 0, f"PNG lacks transparency: {path.name}"
        png_checks.append({"name": path.name, "size": list(im.size), "alpha": [alpha_min, alpha_max]})

    # Each ICO frame comes from its own VectorCraft size-specific render.
    import struct
    entries, payloads, offset = [], [], 6 + 16 * 3
    for size in [16, 32, 48]:
        payload = (EXPORTS / f"betaray-icon-{size}.png").read_bytes()
        entries.append(struct.pack("<BBBBHHII", size, size, 0, 0, 1, 32, len(payload), offset))
        payloads.append(payload)
        offset += len(payload)
    (EXPORTS / "favicon.ico").write_bytes(struct.pack("<HHH", 0, 1, 3) + b"".join(entries) + b"".join(payloads))
    counts = Counter(p.suffix for p in EXPORTS.iterdir() if p.is_file())
    validation = {"app": "VectorCraft 0.19.0", "nativeMasterReopened": True, "artboards": 19,
                  "fontMatches": "exact", "exportWarnings": [], "counts": dict(counts),
                  "svgChecks": svg_checks, "pngChecks": png_checks}
    (ROOT / "validation.json").write_text(json.dumps(validation, indent=2))

    with zipfile.ZipFile(ROOT / "betaray-logo-set.zip", "w", zipfile.ZIP_DEFLATED) as bundle:
        for name in ["betaray-identity.vectorcraft", "betaray-identity.png", "betaray-identity.pdf", "README.md", "build_logos.py", "validate_logos.py", "export-manifest.json", "validation.json", "vectorcraft-window.png"]:
            bundle.write(ROOT / name, "betaray-logo-set/" + name)
        for path in sorted(EXPORTS.iterdir()):
            if path.is_file():
                bundle.write(path, "betaray-logo-set/assets/" + path.name)
    print(json.dumps({"counts": dict(counts), "svgOutlined": len(svg_checks), "pngVerified": len(png_checks),
                      "nativeReopenedArtboards": 19, "bundle": str(ROOT / "betaray-logo-set.zip")}, indent=2))


if __name__ == "__main__":
    main()
