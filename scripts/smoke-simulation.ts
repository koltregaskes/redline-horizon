import { AFTERGLOW_ROUTE_TREE, CARS, MUSIC_PACKS, PRIMARY_ROUTE_TREE, ROUTE_TREES } from "../src/content";
import { BRANCH_DISTANCE, CHECKPOINTS, RUN_DISTANCE, getCarById, getMusicPackById } from "../src/game/config";
import { DriveSimulation } from "../src/game/simulation";
import type { BranchId, InputSnapshot, RouteTreeId, RunEvent, TrafficCarState } from "../src/game/types";

const STEP_SECONDS = 1 / 60;

type ScenarioResult = {
  name: string;
  events: RunEvent[];
  summary: ReturnType<DriveSimulation["getSummary"]>;
  snapshot: ReturnType<DriveSimulation["getSnapshot"]>;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function createInput(overrides: Partial<InputSnapshot> = {}): InputSnapshot {
  return {
    accelerate: false,
    brake: false,
    left: false,
    right: false,
    ...overrides,
  };
}

function createSafeTraffic(seedOffset = 0, branch: BranchId = "neon"): TrafficCarState[] {
  const baseLanes = [-0.72, -0.18, 0.24, 0.72];
  return baseLanes.map((lane, index) => ({
    id: 9000 + seedOffset * 10 + index,
    lane: branch === "harbor" && index % 2 === 0 ? lane * 0.86 : lane,
    z: 1.18 + index * 0.08,
    color: ["#ff77a8", "#ffe16f", "#6ed5ff", "#7df2a7"][index],
    speedFactor: 0.84 + index * 0.03,
    passed: false,
    nearMissed: false,
    widthScale: 0.94 + index * 0.02,
    headlights: branch === "neon",
  }));
}

function createSimulation(options: {
  name: string;
  carId: string;
  musicPackId: string;
  routeTreeId?: RouteTreeId;
  distance: number;
  speed: number;
  timer: number;
  checkpointIndex: number;
  score: number;
  dodged: number;
  nearMisses: number;
  collisions: number;
  branchChoice: BranchId | null;
  lateral: number;
  seed: number;
  traffic: TrafficCarState[];
}) {
  return new DriveSimulation(
    getCarById(options.carId),
    getMusicPackById(options.musicPackId),
    options.routeTreeId ?? PRIMARY_ROUTE_TREE.id,
    {
      tutorialEnabled: false,
      forgivingTrafficEnabled: true,
      steeringAssistEnabled: true,
      randomSeed: options.seed,
      initialState: {
        distance: options.distance,
        speed: options.speed,
        timer: options.timer,
        checkpointIndex: options.checkpointIndex,
        score: options.score,
        dodged: options.dodged,
        nearMisses: options.nearMisses,
        collisions: options.collisions,
        branchChoice: options.branchChoice ?? undefined,
        lateral: options.lateral,
        countdown: 0,
        traffic: options.traffic,
      },
    },
  );
}

function advanceUntil(
  simulation: DriveSimulation,
  input: InputSnapshot,
  maxSteps: number,
): ScenarioResult {
  const events: RunEvent[] = [];
  let snapshot = simulation.getSnapshot(false);

  for (let step = 0; step < maxSteps; step += 1) {
    simulation.update(STEP_SECONDS, input);
    events.push(...simulation.pullEvents());
    snapshot = simulation.getSnapshot(false);
    if (snapshot.completed || snapshot.failed) {
      break;
    }
  }

  return {
    name: "scenario",
    events,
    summary: simulation.getSummary(),
    snapshot,
  };
}

function runCheckpointSmoke() {
  const simulation = createSimulation({
    name: "checkpoint",
    carId: CARS[0].id,
    musicPackId: MUSIC_PACKS[0].id,
    distance: CHECKPOINTS[0].distance - 8,
    speed: 220,
    timer: 24,
    checkpointIndex: 0,
    score: 120,
    dodged: 3,
    nearMisses: 0,
    collisions: 0,
    branchChoice: null,
    lateral: -0.92,
    seed: 101,
    traffic: createSafeTraffic(1, "neon"),
  });

  const result = advanceUntil(simulation, createInput({ accelerate: true }), 24);
  const checkpointEvent = result.events.find((event) => event.type === "checkpoint");

  assert(checkpointEvent?.type === "checkpoint", "checkpoint smoke did not emit a checkpoint event");
  assert(result.snapshot.checkpointIndex >= 1, "checkpoint smoke did not advance checkpoint progression");
  assert(result.summary === null, "checkpoint smoke should not finish the run");
  return "checkpoint";
}

function runBranchSmoke() {
  const simulation = createSimulation({
    name: "branch",
    carId: CARS[2].id,
    musicPackId: MUSIC_PACKS[1].id,
    distance: BRANCH_DISTANCE - 6,
    speed: 210,
    timer: 28,
    checkpointIndex: 2,
    score: 540,
    dodged: 7,
    nearMisses: 1,
    collisions: 0,
    branchChoice: null,
    lateral: -0.22,
    seed: 202,
    traffic: createSafeTraffic(2, "harbor"),
  });

  const result = advanceUntil(simulation, createInput({ accelerate: true, left: true }), 30);
  const branchEvent = result.events.find((event) => event.type === "branch");

  assert(branchEvent?.type === "branch", "branch smoke did not emit a branch event");
  assert(branchEvent.branchId === "harbor", "branch smoke did not lock the harbor route");
  assert(result.snapshot.branchChoice === "harbor", "branch smoke did not persist the harbor branch choice");
  assert(result.snapshot.stageLabel === "Harbor Slip", "branch smoke did not move into the harbor stage");
  assert(result.summary === null, "branch smoke should not finish the run");
  return "branch";
}

function runSuccessSmoke() {
  const simulation = createSimulation({
    name: "success",
    carId: CARS[1].id,
    musicPackId: MUSIC_PACKS[2].id,
    distance: RUN_DISTANCE - 140,
    speed: 242,
    timer: 14,
    checkpointIndex: CHECKPOINTS.length,
    score: 2650,
    dodged: 20,
    nearMisses: 3,
    collisions: 0,
    branchChoice: "neon",
    lateral: 0.18,
    seed: 303,
    traffic: createSafeTraffic(3, "neon"),
  });

  const result = advanceUntil(simulation, createInput({ accelerate: true, right: true }), 90);
  assert(result.summary?.outcome === "success", "success smoke did not produce a successful summary");
  assert(result.summary?.branch === "neon", "success smoke summary used the wrong branch");
  assert(result.summary?.medal !== "Retry", "success smoke should not end with a retry medal");
  assert(result.summary?.record.routeTreeId === PRIMARY_ROUTE_TREE.id, "success smoke used the wrong route tree");
  return "success";
}

function runAfterglowSuccessSmoke() {
  const simulation = createSimulation({
    name: "afterglow-success",
    carId: CARS[2].id,
    musicPackId: MUSIC_PACKS[1].id,
    routeTreeId: AFTERGLOW_ROUTE_TREE.id,
    distance: RUN_DISTANCE - 140,
    speed: 236,
    timer: 11,
    checkpointIndex: AFTERGLOW_ROUTE_TREE.checkpoints.length,
    score: 2480,
    dodged: 24,
    nearMisses: 4,
    collisions: 1,
    branchChoice: "neon",
    lateral: 0.18,
    seed: 505,
    traffic: createSafeTraffic(5, "neon"),
  });

  const result = advanceUntil(simulation, createInput({ accelerate: true, right: true }), 90);
  assert(result.summary?.outcome === "success", "afterglow smoke did not produce a successful summary");
  assert(
    result.summary?.record.routeTreeId === AFTERGLOW_ROUTE_TREE.id,
    "afterglow smoke used the wrong route tree",
  );
  assert(
    result.summary?.ending.destination === "Lumen Heights Observatory Ring",
    "afterglow smoke did not land on the alternate destination",
  );
  return "afterglow-success";
}

function runAfterglowSetpieceSmoke() {
  const simulation = createSimulation({
    name: "afterglow-setpiece",
    carId: CARS[1].id,
    musicPackId: MUSIC_PACKS[2].id,
    routeTreeId: AFTERGLOW_ROUTE_TREE.id,
    distance: 7474,
    speed: 222,
    timer: 11.4,
    checkpointIndex: 3,
    score: 1980,
    dodged: 18,
    nearMisses: 3,
    collisions: 0,
    branchChoice: "neon",
    lateral: 0.02,
    seed: 606,
    traffic: createSafeTraffic(6, "neon"),
  });

  const result = advanceUntil(simulation, createInput({ accelerate: true, right: true }), 18);
  const setpieceEvent = result.events.find(
    (event) => event.type === "story" && event.beat.id === "sera-observatory-squeeze",
  );

  assert(setpieceEvent, "afterglow setpiece did not emit the authored rival event");
  assert(
    result.snapshot.stageLabel === "Afterglow Heights",
    "afterglow setpiece smoke did not stay in the alternate-route finish stage",
  );
  assert(
    result.snapshot.render.traffic.some((car) => car.color === "#ff9dc7"),
    "afterglow setpiece smoke did not deploy the authored traffic weave",
  );
  return "afterglow-setpiece";
}

function runAfterglowHarborSetpieceSmoke() {
  const simulation = createSimulation({
    name: "afterglow-harbor-setpiece",
    carId: CARS[0].id,
    musicPackId: MUSIC_PACKS[0].id,
    routeTreeId: AFTERGLOW_ROUTE_TREE.id,
    distance: 7414,
    speed: 210,
    timer: 11.8,
    checkpointIndex: 3,
    score: 1820,
    dodged: 16,
    nearMisses: 2,
    collisions: 0,
    branchChoice: "harbor",
    lateral: -0.14,
    seed: 707,
    traffic: createSafeTraffic(7, "harbor"),
  });

  const result = advanceUntil(simulation, createInput({ accelerate: true, left: true }), 18);
  const setpieceEvent = result.events.find(
    (event) => event.type === "story" && event.beat.id === "ferry-underpass-bottleneck",
  );

  assert(setpieceEvent, "afterglow harbor setpiece did not emit the authored hazard event");
  assert(
    result.snapshot.stageLabel === "Afterglow Heights",
    "afterglow harbor setpiece smoke did not stay in the alternate-route finish stage",
  );
  assert(
    result.snapshot.render.traffic.filter((car) => car.headlights).length >= 3,
    "afterglow harbor setpiece smoke did not deploy the authored ferry bottleneck traffic",
  );
  return "afterglow-harbor-setpiece";
}

function runTimeoutSmoke() {
  const simulation = createSimulation({
    name: "timeout",
    carId: CARS[0].id,
    musicPackId: MUSIC_PACKS[0].id,
    distance: 2600,
    speed: 0,
    timer: 0.05,
    checkpointIndex: 1,
    score: 210,
    dodged: 1,
    nearMisses: 0,
    collisions: 0,
    branchChoice: null,
    lateral: 0,
    seed: 404,
    traffic: createSafeTraffic(4, "neon"),
  });

  const result = advanceUntil(simulation, createInput(), 12);
  assert(result.summary?.outcome === "timeout", "timeout smoke did not produce a timeout summary");
  assert(result.summary?.medal === "Retry", "timeout smoke should always end with a retry medal");
  return "timeout";
}

function validateContentContracts() {
  assert(CARS.length >= 3, "expected at least three cars in the manifest");
  assert(MUSIC_PACKS.length >= 3, "expected at least three music packs in the manifest");
  assert(ROUTE_TREES.length >= 2, "expected at least two route trees in the manifest");
  assert(PRIMARY_ROUTE_TREE.id === "azure-coast-run", "unexpected primary route tree id");
  assert(AFTERGLOW_ROUTE_TREE.id === "afterglow-heights-run", "unexpected afterglow route tree id");
  assert(PRIMARY_ROUTE_TREE.branches.some((branch) => branch.id === "harbor"), "missing harbor branch");
  assert(PRIMARY_ROUTE_TREE.branches.some((branch) => branch.id === "neon"), "missing neon branch");
  assert(AFTERGLOW_ROUTE_TREE.branches.some((branch) => branch.id === "harbor"), "missing afterglow harbor branch");
  assert(AFTERGLOW_ROUTE_TREE.branches.some((branch) => branch.id === "neon"), "missing afterglow neon branch");
  assert(PRIMARY_ROUTE_TREE.stageOrder.some((node) => node.branch === "harbor"), "missing harbor stage nodes");
  assert(PRIMARY_ROUTE_TREE.stageOrder.some((node) => node.branch === "neon"), "missing neon stage nodes");
  assert(AFTERGLOW_ROUTE_TREE.stageOrder.some((node) => node.stageId === "marina-underpass"), "missing marina-underpass stage node");
  assert(AFTERGLOW_ROUTE_TREE.stageOrder.some((node) => node.stageId === "crown-vista"), "missing crown-vista stage node");
  assert(AFTERGLOW_ROUTE_TREE.stageOrder.some((node) => node.stageId === "afterglow-heights"), "missing afterglow-heights stage node");
  assert(CHECKPOINTS.length === 4, "unexpected checkpoint count");
  assert(RUN_DISTANCE > BRANCH_DISTANCE, "route distance contract is broken");
  assert(getCarById(CARS[0].id).id === CARS[0].id, "car lookup contract is broken");
  assert(getMusicPackById(MUSIC_PACKS[0].id).id === MUSIC_PACKS[0].id, "music lookup contract is broken");
}

function main() {
  validateContentContracts();
  const completed: string[] = [];
  completed.push(runCheckpointSmoke());
  completed.push(runBranchSmoke());
  completed.push(runSuccessSmoke());
  completed.push(runAfterglowHarborSetpieceSmoke());
  completed.push(runAfterglowSetpieceSmoke());
  completed.push(runAfterglowSuccessSmoke());
  completed.push(runTimeoutSmoke());

  console.log(`Redline Horizon simulation smoke passed: ${completed.join(", ")}`);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Redline Horizon simulation smoke failed: ${message}`);
  process.exitCode = 1;
}
