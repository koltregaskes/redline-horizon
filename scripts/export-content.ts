import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  CARS,
  MUSIC_PACKS,
  PRIMARY_ROUTE_TREE,
  ROUTE_TREES,
  STAGES,
  STORY_BEATS,
} from "../src/content";

const snapshot = {
  cars: CARS,
  music_packs: MUSIC_PACKS,
  stages: STAGES,
  route_tree: PRIMARY_ROUTE_TREE,
  route_trees: ROUTE_TREES,
  story_beats: STORY_BEATS,
};

const outputs = [
  join(process.cwd(), "shared-data"),
  join(process.cwd(), "godot", "data"),
];

for (const outputDir of outputs) {
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(
    join(outputDir, "redline-content.json"),
    JSON.stringify(snapshot, null, 2),
    "utf8",
  );
  writeFileSync(join(outputDir, "cars.json"), JSON.stringify(CARS, null, 2), "utf8");
  writeFileSync(
    join(outputDir, "music-packs.json"),
    JSON.stringify(MUSIC_PACKS, null, 2),
    "utf8",
  );
  writeFileSync(join(outputDir, "stages.json"), JSON.stringify(STAGES, null, 2), "utf8");
  writeFileSync(
    join(outputDir, "route-tree.json"),
    JSON.stringify(PRIMARY_ROUTE_TREE, null, 2),
    "utf8",
  );
  writeFileSync(
    join(outputDir, "story-beats.json"),
    JSON.stringify(STORY_BEATS, null, 2),
    "utf8",
  );
}

console.log("Redline Horizon content exported to shared-data and godot/data.");
