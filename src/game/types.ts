export type AppScreen =
  | "title"
  | "route-brief"
  | "car-select"
  | "music-select"
  | "records"
  | "options"
  | "drive"
  | "summary";

export type BranchId = "harbor" | "neon";
export type RouteTreeId = "azure-coast-run" | "afterglow-heights-run";
export type StageId =
  | "azure-coast"
  | "mirage-causeway"
  | "harbor-slip"
  | "neon-express"
  | "skyline-finish"
  | "marina-underpass"
  | "crown-vista"
  | "afterglow-heights";
export type SceneryMode = "palms" | "causeway" | "harbor" | "neon";
export type BiomeId = "coast" | "causeway" | "harbor" | "metro";
export type WeatherModifier = "clear" | "sea-breeze" | "harbor-haze" | "neon-mist";
export type StoryBeatTone = "radio" | "rival" | "scenic";
export type UnlockType = "default" | "medal" | "score" | "route";
export type MedalId = "Retry" | "Bronze" | "Silver" | "Gold" | "Sunfire";

export interface UnlockRule {
  type: UnlockType;
  value?: string | number;
  label: string;
}

export interface CarDefinition {
  id: string;
  name: string;
  tagline: string;
  accent: string;
  bodyColor: string;
  stripeColor: string;
  portraitTitle: string;
  portraitGradient: [string, string];
  description: string;
  flavorText: string;
  topSpeed: number;
  acceleration: number;
  grip: number;
  boost: number;
  draftGain: number;
  collisionPenalty: number;
  unlockRule: UnlockRule;
}

export interface MusicSectionDefinition {
  id: string;
  label: string;
  leadPattern: number[];
  bassPattern: number[];
  padPattern: number[];
  accentPattern: number[];
}

export interface MusicPackDefinition {
  id: string;
  name: string;
  theme: string;
  accent: string;
  description: string;
  previewCue: string;
  rootHz: number;
  bpm: number;
  routeMood: Record<BranchId, string>;
  sections: {
    cruise: MusicSectionDefinition;
    branch: MusicSectionDefinition;
    finish: MusicSectionDefinition;
  };
  checkpointSting: number[];
  lowTimeSting: number[];
  finishSting: number[];
  unlockRule: UnlockRule;
}

export interface AppOptions {
  musicEnabled: boolean;
  effectsEnabled: boolean;
  tutorialEnabled: boolean;
  filmGrainEnabled: boolean;
}

export interface AssistOptions {
  steeringAssistEnabled: boolean;
  forgivingTrafficEnabled: boolean;
  routeLineEnabled: boolean;
}

export interface RunRecord {
  id: string;
  createdAt: string;
  outcome: "Finished" | "Out of time";
  carId: string;
  musicPackId: string;
  routeTreeId: RouteTreeId;
  branch: BranchId;
  medal: MedalId;
  score: number;
  distance: number;
  timeRemaining: number;
  nearMisses: number;
  collisions: number;
  totalTime: number;
}

export interface UnlockState {
  cars: string[];
  musicPacks: string[];
  routes: RouteTreeId[];
  medals: Partial<Record<BranchId | "overall", MedalId>>;
  routeBoards: Partial<Record<RouteTreeId, Partial<Record<BranchId, MedalId>>>>;
  storyFlags: string[];
}

export interface LastLoadout {
  carId: string;
  musicPackId: string;
  routeTreeId: RouteTreeId;
  lastBranch: BranchId | null;
}

export interface ThemePalette {
  skyTop: string;
  skyMid: string;
  skyBottom: string;
  sun: string;
  glow: string;
  farSilhouette: string;
  nearSilhouette: string;
  sea: string;
  ground: string;
  road: string;
  lane: string;
  shoulder: string;
  curbA: string;
  curbB: string;
  roadsidePrimary: string;
  roadsideSecondary: string;
  cityLight: string;
  fog: string;
}

export interface StoryBeatDefinition {
  id: string;
  distance: number;
  branch: BranchId | "all";
  speaker: string;
  tone: StoryBeatTone;
  title: string;
  subtitle: string;
}

export interface ScenicSegment {
  id: StageId;
  label: string;
  description: string;
  biome: BiomeId;
  scenery: SceneryMode;
  start: number;
  end: number;
  trafficDensity: number;
  trafficDensityCurve: [number, number, number];
  skyline: number;
  nightLevel: number;
  horizonLift: number;
  billboardSet: string;
  weatherModifier: WeatherModifier;
  checkpointTarget: number;
  eventBannerPool: string[];
  destinationPostcardText: string;
  palette: ThemePalette;
}

export interface RouteBranch {
  id: BranchId;
  name: string;
  strapline: string;
  description: string;
  risk: string;
  accent: string;
  scenicMomentTitle: string;
  scenicMomentSubtitle: string;
}

export interface CheckpointDefinition {
  distance: number;
  bonus: number;
  label: string;
}

export interface RouteStageNode {
  stageId: StageId;
  branch: BranchId | "all";
}

export interface RoutePresentationDefinition {
  accent: string;
  titleEyebrow: string;
  titleBody: string;
  routeCardTitle: string;
  routeCardBody: string;
  soundscapeTitle: string;
  soundscapeBody: string;
  destinationMood: string;
  destinationGlow: string;
}

export interface SetpieceTrafficDefinition {
  lane: number;
  z: number;
  speedFactor: number;
  color: string;
  widthScale: number;
}

export interface RouteSetpieceDefinition {
  id: string;
  distance: number;
  branch: BranchId | "all";
  speaker: string;
  tone: StoryBeatTone;
  title: string;
  subtitle: string;
  trafficPattern: SetpieceTrafficDefinition[];
}

export interface RouteEndingDefinition {
  destination: string;
  title: string;
  subtitle: string;
  postcard: string;
  arrivalTitle: string;
  arrivalSubtitle: string;
  festivalCue: string;
  soundtrackCue: string;
}

export interface RouteTreeDefinition {
  id: RouteTreeId;
  title: string;
  strapline: string;
  story: string;
  totalDistance: number;
  branchDistance: number;
  branchHintDistance: number;
  checkpoints: CheckpointDefinition[];
  branches: RouteBranch[];
  stageOrder: RouteStageNode[];
  storyBeatIds: string[];
  presentation: RoutePresentationDefinition;
  setpieces?: RouteSetpieceDefinition[];
  endings: Record<BranchId, RouteEndingDefinition>;
}

export interface TrafficCarState {
  id: number;
  lane: number;
  z: number;
  color: string;
  speedFactor: number;
  passed: boolean;
  nearMissed: boolean;
  widthScale: number;
  headlights: boolean;
}

export interface EventMarker {
  type: "checkpoint" | "branch" | "finish";
  distance: number;
  label: string;
}

export interface RenderSnapshot {
  distance: number;
  speed: number;
  lateral: number;
  roadCurve: number;
  playerBodyColor: string;
  playerStripeColor: string;
  traffic: TrafficCarState[];
  segment: ScenicSegment;
  nextSegment: ScenicSegment;
  transition: number;
  markers: EventMarker[];
  cameraShake: number;
  filmGrainEnabled: boolean;
}

export interface InputSnapshot {
  accelerate: boolean;
  brake: boolean;
  left: boolean;
  right: boolean;
}

export interface ScoreLine {
  label: string;
  value: string;
}

export interface SummaryStats {
  outcome: "success" | "timeout";
  title: string;
  subtitle: string;
  medal: MedalId;
  branch: BranchId;
  checkpointCount: number;
  ending: RouteEndingDefinition;
  record: RunRecord;
  scoreLines: ScoreLine[];
}

export interface DriveSnapshot {
  render: RenderSnapshot;
  distance: number;
  speed: number;
  timer: number;
  score: number;
  dodged: number;
  nearMisses: number;
  collisions: number;
  checkpointIndex: number;
  checkpointCount: number;
  branchChoice: BranchId | null;
  activePrompt: string;
  supportPrompt: string;
  stageLabel: string;
  stageDescription: string;
  countdown: number;
  completed: boolean;
  failed: boolean;
}

export interface StoredProfile {
  version: number;
  selectedCarId: string;
  selectedMusicPackId: string;
  selectedRouteTreeId: RouteTreeId;
  options: AppOptions;
  assists: AssistOptions;
  unlocks: UnlockState;
  lastLoadout: LastLoadout;
  records: RunRecord[];
}

export type RunEvent =
  | { type: "checkpoint"; checkpointIndex: number; bonus: number }
  | { type: "collision" }
  | { type: "near-miss" }
  | { type: "branch"; branchId: BranchId }
  | { type: "finish" }
  | { type: "timeout" }
  | { type: "story"; beat: StoryBeatDefinition };
