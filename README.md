# Redline Horizon

Redline Horizon is a browser road-trip racer inspired by *Lotus III*, *OutRun*, *Slipstream*, and modern postcard racers. A run is done when you finish the 9.2 km route before the timer hits 0. The broader desktop direction lives in [DESIGN-BIBLE.md](./DESIGN-BIBLE.md). The Godot tree is a spike, not the launch path.

The game includes:

- title flow with `Start Drive`, a route brief, `Car Select`, `Music Select`, `Records`, and `Options`
- two complete route boards built on the same coastal start, each with checkpoint pressure and a route split between a lower line and a high line
- three car archetypes, three music packs, medals, records, local unlocks, and branch-aware summaries
- contextual tutorial prompts, radio/rival/scenic event banners, and an attract-style title presentation
- authored manifest-driven content for `cars`, `music_packs`, `stages`, `route_tree`, and `story_beats`
- native browser audio with music sections for cruise, branch, and finish phases
- shared JSON exports plus a Godot spike scaffold that loads the same content data

## Local development

Install dependencies:

```bash
npm install
```

Run the dev server:

```bash
npm run dev
```

On Windows, `npm.cmd install` and `npm.cmd run dev` run the same scripts.

Build for production:

```bash
npm run build
```

Export the shared content manifests for the browser and Godot spike:

```bash
npm run export:data
```

Run the no-browser simulation smoke:

```bash
npm run smoke:simulation
```

Preview the built site locally:

```bash
npm run preview
```

Generate the full review evidence pack from the built site:

```bash
npm run review:pack
```

## How to play

1. From the title screen, choose **Start drive**.
2. Read the route brief. It states the goal for the selected board.
3. Choose **Launch drive**, then race with the controls below.

Done means you finish the 9.2 km route before the timer hits 0. Checkpoints add time. At the split, steer left for the lower line or right for the upper line. Reaching the end opens a medal summary. That is a win.

A timeout is a loss. If the timer hits 0, the run ends even if the destination is still ahead.

**Drive again** on the summary screen restarts from the route brief. **Back to title** leaves the run.

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
- `Shift` or the gamepad shoulder button to boost
- `Gamepad left stick` or `d-pad` to steer
- `Gamepad right trigger` / `left trigger` to accelerate and brake
- `Enter` / `Space` / `Gamepad A` for primary menu actions
- `Escape` / `Gamepad B` for back or pause
- mobile touch controls appear automatically on narrow screens

## Data and the Godot spike

- shared JSON manifests are written to `shared-data/` and mirrored into `godot/data/`
- the Godot 4 tree in [godot/README.md](./godot/README.md) is a spike, not the launch path
- launch the playable game with `npm install` and `npm run dev`
