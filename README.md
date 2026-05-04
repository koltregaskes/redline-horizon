# Redline Horizon

`Redline Horizon` is a browser-first retro road-trip racer demo aimed at a larger desktop arcade game inspired by *Lotus III*, *OutRun*, *Slipstream*, and modern postcard racers.

The current Phase 1.5 slice includes:

- title flow with `Start Drive`, a route brief, `Car Select`, `Music Select`, `Records`, and `Options`
- two complete route boards built on the same coastal start, each with checkpoint pressure and a route split between a lower line and a high line
- three car archetypes, three music packs, medals, records, local unlocks, and branch-aware summaries
- contextual tutorial prompts, radio/rival/scenic event banners, and an attract-style title presentation
- authored manifest-driven content for `cars`, `music_packs`, `stages`, `route_tree`, and `story_beats`
- native browser audio with music sections for cruise, branch, and finish phases
- shared JSON exports plus a Godot Phase 2 spike scaffold that loads the same content data

The broader direction lives in [DESIGN-BIBLE.md](./DESIGN-BIBLE.md).

## Local development

Install dependencies:

```powershell
npm.cmd install
```

Run the dev server:

```powershell
npm.cmd run dev
```

Build for production:

```powershell
npm.cmd run build
```

Export the shared content manifests for the browser and Godot spike:

```powershell
npm.cmd run export:data
```

Run the no-browser simulation smoke:

```powershell
npm.cmd run smoke:simulation
```

Preview the built site locally:

```powershell
npm.cmd run preview
```

Generate the full review evidence pack from the built site:

```powershell
npm.cmd run review:pack
```

## Review URL

Redline now supports a deterministic manager review contract:

```text
http://127.0.0.1:4173/?review=1
http://127.0.0.1:4173/?autostart=1&review=1
http://127.0.0.1:4173/?review=1&screen=checkpoint
http://127.0.0.1:4173/?review=1&route=afterglow-heights-run&screen=checkpoint&branch=neon
http://127.0.0.1:4173/?review=1&screen=timeout&branch=harbor
http://127.0.0.1:4173/?review=1&screen=summary&branch=neon
http://127.0.0.1:4173/?review=1&route=afterglow-heights-run&screen=summary&branch=neon
```

Useful optional query params:

- `screen=title|drive|checkpoint|summary|timeout`
- `route=azure-coast-run|afterglow-heights-run`
- `branch=harbor|neon`
- `car=<car-id>`
- `music=<music-pack-id>`
- `seed=<number>`
- `hold=0` to skip the initial frozen snapshot
- `distance=<meters>`
- `timer=<seconds>`

Review mode uses a deterministic in-memory profile and does not write live save or progression data.

## Controls

- `Arrow keys` or `WASD` to drive
- `Gamepad left stick` or `d-pad` to steer
- `Gamepad right trigger` / `left trigger` to accelerate and brake
- `Enter` / `Space` / `Gamepad A` for primary menu actions
- `Escape` / `Gamepad B` for back or pause
- mobile touch controls appear automatically on narrow screens

## Data and Phase 2

- shared JSON manifests are written to `shared-data/` and mirrored into `godot/data/`
- the Godot 4 spike scaffold lives in [godot/README.md](./godot/README.md)
