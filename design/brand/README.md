# Betaray / Ray B logo set

## Concept

**See beyond the surface.** The mark reads as a confident B first; on a second
look, the two counters become the swept wings of a manta ray. The solid left
stem is the ray's body, the outer silhouette is the letter, and the wing-shaped
negative space carries the ocean story without drawing every fin and tail.

The identity deliberately removes the literal head and tail detail of the
first sketch. At 16–32px the B stays legible; at large sizes the wing curves do
the storytelling.

Drawn as editable Bézier artwork through **VectorCraft 0.19.0's live control
API**. All SVG, PNG and PDF artwork was exported by VectorCraft, not traced
from a generated picture.

## Open in VectorCraft

Open `betaray-identity.vectorcraft`. Its 19 named artboards contain:

- Identity presentation board.
- Four horizontal lockups: primary, mono, reversed, lilac.
- Four standalone marks in the same colours.
- Four stacked lockups in the same colours.
- Two wordmarks: slate and reversed.
- Three rounded app icons: sage, lagoon, lilac.
- One square, full-bleed maskable icon with a reduced symbol safe zone.

Shapes are editable paths. Wordmark text remains live in the native master.
Wordmarks in production SVG/PDF exports are outlined, so those files need
no installed font. The live master uses **Mont SemiBold** for the Betaray
wordmark — the same wordmark face as the reference — with Avenir Next
Regular, Medium and Demi Bold for presentation labels. VectorCraft reports
every required face as an exact match. Mont is a commercial Fontfabric
typeface: confirm or obtain a distribution licence before redistributing the
editable master or font software. No font software is included in this set
beyond the web WOFF2 used by the local prototype.

## Production assets

`../../public/brand/betaray/`

- `betaray-horizontal-primary.svg`: recommended light-background header logo.
- `betaray-horizontal-reversed.svg`: warm-paper logo on a dark/lagoon field.
- `betaray-mark-primary.svg`: standalone transparent mark.
- `betaray-stacked-primary.svg`: centred vertical lockup.
- `betaray-wordmark-primary.svg`: wordmark only.
- `betaray-app-icon-sage.svg`: calm, low-contrast tile with lagoon mark.
- `betaray-app-icon-lagoon.svg`: high-contrast app tile.
- `betaray-app-icon-lilac.svg`: app-accent tile.
- `betaray-icon-{size}.png`: 16, 32, 48, 64, 128, 180, 192, 256, 512, 1024 px.
- `betaray-maskable-{size}.png`: 192 and 512 px.
- `favicon.ico`: 16, 32 and 48 px frames.

Every lockup and mark has SVG and transparent PNG exports. Horizontal and
stacked lockups additionally have vector PDFs. Ordinary PNG exports are 2×
the artboard size; the size-named icon PNGs match their names exactly.

Reversed PNGs have transparent backgrounds, not a solid sage rectangle.
The app-icon variants intentionally include the tile background.

## Colours

- Lagoon / symbol: `#526E69`
- Slate / wordmark and monochrome: `#35434A`
- Paper / reversed artwork: `#F7F5F0`
- Lilac / existing application accent: `#6B6AD6`
- Mist / light app tile: `#E6EEEA`

Primary pairs the lagoon symbol with the slate wordmark. Mono is entirely
slate. Reversed is entirely paper. Lilac is an optional app-compatible colour
variant, not an instruction to recolour the existing application.

## Usage

- Preserve the B silhouette and the two wing-shaped counters.
- Keep at least one counter-opening height of clear space on each side.
- Recommended horizontal lockup minimum width: 160 px.
- Recommended standalone symbol minimum height: 24 px.
- Use the supplied 16 px favicon only for browser tabs, not general UI.
- Use slate or lagoon on pale backgrounds; reversed on darker backgrounds.
- Keep the two counters genuinely transparent. Do not fill them with a
  simulated background colour.
- Do not add shadows, gradients, extra outlines, stretch, or rotate the mark.
- The sheet demonstrates the proposed identity. No customer proof,
  certifications or ownership claims are implied.
- Use the separate manta line artwork for narrative illustrations; keep it
  subtle and never let it compete with the B.

## Files in this folder

- `betaray-identity.vectorcraft`: editable native master.
- `betaray-identity.png`: presentation sheet preview.
- `betaray-identity.pdf`: vector presentation sheet.
- `betaray-logo-set.zip`: source, preview, usage notes and production assets.
- `build_logos.py`: reproducible VectorCraft drawing script.
- `export-manifest.json`: artboards, font resolution, export warnings.
- `validation.json`: file, outline, transparency and dimension checks.
- `vectorcraft-journal.json`: exact API command history.
- `proposals/logo-proposal-02.*`: the side-by-side comparison that led to the
  current mark.
- `mantas/`: the realistic manta illustration set — dorsal and ventral vector
  source, a school key art, five 3D angle renders, and the EffectCraft project
  (`mantas.ecproj`). Rendered transparent animations live in
  `public/brand/betaray/mantas/`:
  - `manta-hero-loop.webp` — a dorsal manta banking through a slow loop.
  - `manta-ventral-loop.webp` — a ventral manta gliding below the surface.
  - `manta-school.png` — five mantas at different angles and scales.
  - `manta-angle-*.png` — individual bank, underside, far and small poses.

The brand narrative and homepage copy live in
[`../../docs/Betaray_Brand_Narrative.md`](../../docs/Betaray_Brand_Narrative.md).

The app uses the mono ray-B mark in the sidebar and sign-in screen, the
matching favicon/app icons, and Mont for the Betaray lettering. The public
product page uses the primary lagoon lockup, the same identity palette,
and the horizontal ray-B artwork.
