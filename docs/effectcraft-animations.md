# EffectCraft animation pipeline

How the Betaray manta loops were produced with **EffectCraft 0.19.0**. The
source art is in `design/brand/mantas/`; production files are in
`public/brand/betaray/mantas/`.

## 1. Run EffectCraft with the control server

```sh
/Applications/EffectCraft.app/Contents/MacOS/EffectCraft --control 7980
```

The control API is newline-delimited JSON on `127.0.0.1:7980`:

```python
import json, socket

sock = socket.create_connection(("127.0.0.1", 7980), timeout=60)
stream = sock.makefile("rwb")
seq = 0

def call(method, params=None):
    global seq
    seq += 1
    stream.write((json.dumps({"id": seq, "method": method, "params": params or {}}) + "\n").encode())
    stream.flush()
    return json.loads(stream.readline())

def run(command, params=None):
    return call("engine.execute", {"command": command, "params": params or {}})
```

`engine.commands` lists every available command. `engine.execute` is the entry
point used below.

## 2. Import the manta art

The detailed dorsal and ventral SVGs were drawn at 1200×900:

- `design/brand/mantas/manta-dorsal2.svg`
- `design/brand/mantas/manta-ventral2.svg`

EffectCraft imports them as image footage:

```python
run("file.newProject")
run("comp.new", {
    "name": "Manta hero loop",
    "width": 1200, "height": 750,
    "frameRate": 24, "duration": 12,
})
run("file.importMultiple", {"paths": [
    ".../manta-dorsal2.svg",
    ".../manta-ventral2.svg",
]})
```

## 3. Place and animate a manta in 3D

A flat top-view manta rotated in 3D gives the banking / three-quarter angles.

```python
layer = run("layer.addItem", {"item": 2, "position": [900, 400]})["layer"]

# Required before orientation is meaningful.
run("layer.setSwitch", {"layers": [layer], "switch": "threeD", "value": True})
run("prop.set", {"layer": layer, "path": "transform/scale", "value": [68, 68, 100]})
```

Keyframes are created by toggling the stopwatch, then setting values at times:

```python
def key(layer, path, points):
    run("prop.toggleAnimation", {"layer": layer, "path": path})
    for t, value in points:
        run("prop.set", {"layer": layer, "path": path, "value": value, "time": t})
    run("prop.select", {"layer": layer, "path": path})
    run("keys.selectAll", {"layers": [layer]})
    run("keys.easyEase", {"which": "both"})
```

Hero loop path and bank:

```python
key(layer, "transform/orientation", [
    (0,  [52, 0, -22]),
    (4,  [58, 0,   0]),
    (8,  [64, 0,  18]),
    (12, [52, 0, -22]),
])
key(layer, "transform/position", [
    (0,  [900, 400, 0]),
    (3,  [600, 300, 0]),
    (6,  [300, 400, 0]),
    (9,  [600, 500, 0]),
    (12, [900, 400, 0]),
])
```

Because the first and last keys match, the 12-second loop is seamless.

## 4. Wing motion with Wave Warp

```python
run("effect.apply", {"effect": "Wave Warp", "layers": [layer]})
run("prop.set", {"layer": layer, "path": "effects/#1/height", "value": 7})
run("prop.set", {"layer": layer, "path": "effects/#1/width", "value": 320})
run("prop.set", {"layer": layer, "path": "effects/#1/direction", "value": 90})
run("prop.setExpression", {
    "layer": layer,
    "path": "effects/#1/phase",
    "expression": "time*70",
})
```

The phase expression makes the wings ripple continuously without extra
keyframes. Keep `height` small — large values turn the ray into a scalloped
blob.

## 5. Render a transparent PNG sequence

EffectCraft's WebM writer did not preserve alpha in this setup, so the reliable
route was **PNG sequence → animated WebP**.

```python
items = run("renderQueue.list")["items"]
for item in items:
    run("renderQueue.remove", {"item": item["id"]})

run("renderQueue.add", {"comp": 1, "format": "png"})
run("renderQueue.setOutputModule", {
    "item": 1,
    "format": "png",
    "channels": "rgba",
    "color": "straight",
})
run("renderQueue.setOutput", {
    "item": 1,
    "path": ".../frames/frame_[####].png",
})
run("renderQueue.render", {"wait": True})
```

Resulting frames are RGBA with a real alpha channel.

## 6. Encode a transparent animated WebP

WebP keeps alpha, loops cleanly, and is much smaller than an APNG:

```sh
ffmpeg -y -framerate 24 -i frames/frame_%04d.png \
  -vf "fps=12" \
  -c:v libwebp_anim -pix_fmt yuva420p \
  -lossless 0 -q:v 82 -loop 0 -an \
  -f webp manta-hero-loop.webp
```

Final assets:

| Asset | Size | Frames | FPS | Length |
|---|---|---|---|---|
| `manta-hero-loop.webp` | 1200×750 | 144 | 12 | 12 s |
| `manta-ventral-loop.webp` | 700×490 | 80 | 8 | 10 s |

The ventral loop used the same recipe with a gentler orientation/bank and a
shorter render.

## 7. Static 3D angle renders

For stills, set the layer orientation and save a frame:

```python
run("prop.set", {"layer": layer, "path": "transform/orientation", "value": [58, 0, 28]})
run("comp.saveFrameAs", {"path": ".../manta-angle-bank-right.png", "time": 0, "scale": 1})
```

The transparent margins were trimmed with Pillow:

```python
from PIL import Image

im = Image.open(raw).convert("RGBA")
im.crop(im.getchannel("A").getbbox()).save(final)
```

This produced the bank-left, bank-right, underside, small and far poses used
across the page, plus the five-manta school composition.

## 8. Web integration

The loops are plain images, not video elements:

```tsx
<img
  src="/brand/betaray/mantas/manta-hero-loop.webp"
  alt=""
  aria-hidden="true"
  loading="lazy"
  decoding="async"
/>
```

The hero loop is `priority` (eager); the lower-page ventral loop is lazy-loaded.
Decorative art is `aria-hidden`; the CSS `manta-float` class adds a gentle
`translateY`/`rotate` float to static poses and turns off under
`prefers-reduced-motion`.

## Notes

- EffectCraft saves the working study as `design/brand/mantas/mantas.ecproj`.
- Keep the source SVGs beside the project so the image footage relinks.
- Do not bake the paper background into the render; alpha is what lets the
  same art sit on paper, mist, lagoon and slate sections.
- The WebP loops cannot be paused by CSS `prefers-reduced-motion`; if that
  becomes a requirement, swap the hero to a static angle under the media query
  or serve a poster image.
