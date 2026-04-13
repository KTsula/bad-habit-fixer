# Alert sounds

Drop a short (200-400ms) chime, bell, or tone in this directory named
`alert.ogg` and the app will use it as the trigger sound. Until then
`src/audio/alertPlayer.ts` falls back to a synthesized 660Hz sine chime
rendered through the Web Audio API — the app works on first run with no
asset wrangling.

## Recommended specs

- **Format:** Ogg Vorbis (`.ogg`). Smallest cross-browser encoding,
  decodes fast, no licensing concerns.
- **Length:** 200-400 ms. Anything longer feels punitive; anything
  shorter gets lost. Design `README.md` §6 calls this a "meditation
  bell acknowledging a thought" — warm, brief, no sharp onset.
- **Sample rate:** 44.1 or 48 kHz.
- **Channels:** Mono is fine. Stereo is fine. Either plays identically.
- **Loudness:** normalize to around -14 LUFS integrated so it matches
  typical browser content levels.

## Swapping files

The app loads `/sounds/alert.ogg` via `new Audio(...)` — Vite serves
everything in `public/` at the URL root, so any file named exactly
`alert.ogg` in this directory will be picked up on the next page load
without a rebuild.

Milestone 4 will add a picker for three preset sounds
(`soft-chime.ogg`, `gentle-bell.ogg`, `low-tone.ogg`) per spec §8 risk
3. For M3 we ship with the fallback beep.

## Free sources

- [freesound.org](https://freesound.org) — CC-licensed. Search for
  "meditation bell short" or "notification chime".
- Garageband / Logic built-in libraries.
- `sox` can synthesize a richer bell than our Web Audio fallback:
  `sox -n alert.ogg synth 0.3 sine 660 fade l 0.01 0.3 0.15`
