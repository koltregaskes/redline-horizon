# Redline Horizon Godot Spike

This folder is the Phase 2 preproduction scaffold for `Redline Horizon`.

It is intentionally small and data-driven:

- loads `res://data/redline-content.json`, exported from the browser manifests
- lets you cycle the same music packs used by the web demo
- lets you choose `Harbor Slip` or `Neon Express`
- runs a simplified checkpoint-timer route
- lands on a branch-aware summary state

## Open locally

1. Install `Godot 4.x stable`.
2. Open the `godot/` folder as a project.
3. Run the project and use the on-screen buttons to cycle music, choose a branch, and start the route.

## Current intent

This is not the production desktop game yet. It is a proof scaffold for:

- JSON content parity with the browser demo
- one route split
- one music selection flow
- one full route summary
- a custom-drawn road presentation inside Godot

## Refreshing content

From the repo root:

```powershell
npm run export:data
```

That regenerates the JSON handoff in both `shared-data/` and `godot/data/`.
