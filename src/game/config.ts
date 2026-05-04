import {
  CARS,
  MUSIC_PACKS,
  PRIMARY_ROUTE_TREE,
  ROUTE_TREES,
  getBranchById,
  getCarById,
  getMusicPackById,
  getRouteTreeById,
  getStageById,
  getStoryBeatById,
} from "../content";
import type {
  AppOptions,
  AssistOptions,
  BranchId,
  RouteTreeId,
  ScenicSegment,
  StoryBeatDefinition,
  UnlockState,
} from "./types";

export const PROFILE_VERSION = 3;
export const STORAGE_KEY = "redline-horizon-profile-v3";
export const DEMO_TITLE = PRIMARY_ROUTE_TREE.title;
export const DEMO_STORY = PRIMARY_ROUTE_TREE.story;
export const RUN_DISTANCE = PRIMARY_ROUTE_TREE.totalDistance;
export const BRANCH_DISTANCE = PRIMARY_ROUTE_TREE.branchDistance;
export const BRANCH_HINT_DISTANCE = PRIMARY_ROUTE_TREE.branchHintDistance;
export const START_TIMER = 46;
export const CHECKPOINTS = PRIMARY_ROUTE_TREE.checkpoints;
export const ROUTE_BRANCHES = PRIMARY_ROUTE_TREE.branches;
export const DEFAULT_ROUTE_TREE_ID: RouteTreeId = PRIMARY_ROUTE_TREE.id;

export const DEFAULT_OPTIONS: AppOptions = {
  musicEnabled: true,
  effectsEnabled: true,
  tutorialEnabled: true,
  filmGrainEnabled: true,
};

export const DEFAULT_ASSISTS: AssistOptions = {
  steeringAssistEnabled: false,
  forgivingTrafficEnabled: false,
  routeLineEnabled: true,
};

export function createDefaultUnlocks(): UnlockState {
  return {
    cars: [CARS[0].id, CARS[2].id],
    musicPacks: [MUSIC_PACKS[0].id, MUSIC_PACKS[1].id],
    routes: ROUTE_TREES.map((routeTree) => routeTree.id),
    medals: {},
    routeBoards: {},
    storyFlags: [],
  };
}

export function getSegments(branchChoice: BranchId | null, routeTreeId = PRIMARY_ROUTE_TREE.id) {
  const routeTree = getRouteTreeById(routeTreeId);
  return routeTree.stageOrder
    .filter((stageNode) => stageNode.branch === "all" || stageNode.branch === branchChoice)
    .map((stageNode) => getStageById(stageNode.stageId));
}

export function getStoryBeatsForRun(routeTreeId = PRIMARY_ROUTE_TREE.id) {
  const routeTree = getRouteTreeById(routeTreeId);
  return routeTree.storyBeatIds.map((beatId) => getStoryBeatById(beatId));
}

export function findSegment(
  distance: number,
  branchChoice: BranchId | null,
  routeTreeId = PRIMARY_ROUTE_TREE.id,
) {
  const segments = getSegments(branchChoice, routeTreeId);
  const currentIndex = segments.findIndex(
    (segment) => distance >= segment.start && distance < segment.end,
  );
  const safeIndex = currentIndex === -1 ? segments.length - 1 : currentIndex;
  const current = segments[safeIndex];
  const next = segments[Math.min(safeIndex + 1, segments.length - 1)];
  const transitionWindow = 420;
  const transitionStart = Math.max(current.end - transitionWindow, current.start);
  const transition =
    next.id === current.id
      ? 0
      : clamp((distance - transitionStart) / (current.end - transitionStart), 0, 1);

  return { current, next, transition };
}

export function getStageMilestoneSegment(
  beat: StoryBeatDefinition,
  branchChoice: BranchId | null,
  routeTreeId = PRIMARY_ROUTE_TREE.id,
) {
  const segments = getSegments(branchChoice, routeTreeId);
  return (
    segments.find((segment) => beat.distance >= segment.start && beat.distance < segment.end) ??
    segments[segments.length - 1]
  );
}

export function formatMeters(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)} km`;
  }

  return `${Math.round(value)} m`;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export {
  CARS,
  MUSIC_PACKS,
  ROUTE_TREES,
  getBranchById,
  getCarById,
  getMusicPackById,
  getRouteTreeById,
};

export type { ScenicSegment };
