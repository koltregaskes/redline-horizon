import type {
  BranchId,
  CarDefinition,
  MusicPackDefinition,
  RouteTreeDefinition,
  ScenicSegment,
  StageId,
  StoryBeatDefinition,
} from "../game/types";
import { CAR_MANIFEST } from "./cars";
import { MUSIC_PACK_MANIFEST } from "./music-packs";
import { AFTERGLOW_ROUTE_TREE, PRIMARY_ROUTE_TREE } from "./route-tree";
import { STAGE_MANIFEST } from "./stages";
import { STORY_BEAT_MANIFEST } from "./story-beats";

export const CARS = CAR_MANIFEST;
export const MUSIC_PACKS = MUSIC_PACK_MANIFEST;
export const STAGES = STAGE_MANIFEST;
export const ROUTE_TREES: RouteTreeDefinition[] = [PRIMARY_ROUTE_TREE, AFTERGLOW_ROUTE_TREE];
export const STORY_BEATS = STORY_BEAT_MANIFEST;
export { AFTERGLOW_ROUTE_TREE, PRIMARY_ROUTE_TREE };

export function getCarById(carId: string): CarDefinition {
  return CARS.find((car) => car.id === carId) ?? CARS[0];
}

export function getMusicPackById(musicPackId: string): MusicPackDefinition {
  return MUSIC_PACKS.find((pack) => pack.id === musicPackId) ?? MUSIC_PACKS[0];
}

export function getStageById(stageId: StageId): ScenicSegment {
  return STAGES.find((stage) => stage.id === stageId) ?? STAGES[0];
}

export function getRouteTreeById(routeTreeId: string): RouteTreeDefinition {
  return ROUTE_TREES.find((routeTree) => routeTree.id === routeTreeId) ?? ROUTE_TREES[0];
}

export function getBranchById(branchId: BranchId, routeTreeId = PRIMARY_ROUTE_TREE.id) {
  const routeTree = getRouteTreeById(routeTreeId);
  return routeTree.branches.find((branch) => branch.id === branchId) ?? routeTree.branches[0];
}

export function getStoryBeatById(beatId: string): StoryBeatDefinition {
  return STORY_BEATS.find((beat) => beat.id === beatId) ?? STORY_BEATS[0];
}
