import {
  BRANCH_DISTANCE,
  BRANCH_HINT_DISTANCE,
  CHECKPOINTS,
  RUN_DISTANCE,
  START_TIMER,
  clamp,
  findSegment,
  getBranchById,
  getRouteTreeById,
  getStoryBeatsForRun,
} from "./config";
import type {
  BranchId,
  CarDefinition,
  DriveSnapshot,
  EventMarker,
  InputSnapshot,
  MusicPackDefinition,
  RenderSnapshot,
  RouteTreeId,
  RunEvent,
  ScenicSegment,
  SummaryStats,
  TrafficCarState,
} from "./types";

const LANES = [-0.72, 0, 0.72];
const TRAFFIC_COLORS = ["#ff7165", "#62ddff", "#ffe36a", "#7df2a7", "#ff8eca"];

export class DriveSimulation {
  private readonly car: CarDefinition;
  private readonly musicPack: MusicPackDefinition;
  private readonly routeTreeId: RouteTreeId;
  private readonly routeTree: ReturnType<typeof getRouteTreeById>;
  private readonly tutorialEnabled: boolean;
  private readonly forgivingTrafficEnabled: boolean;
  private readonly steeringAssistEnabled: boolean;
  private readonly storyBeats: ReturnType<typeof getStoryBeatsForRun>;
  private readonly triggeredBeats = new Set<string>();
  private readonly triggeredSetpieces = new Set<string>();
  private traffic: TrafficCarState[] = [];
  private events: RunEvent[] = [];
  private nextTrafficId = 1;
  private spawnCooldown = 0.8;
  private distance = 0;
  private speed = 0;
  private lateral = 0;
  private drift = 0;
  private timer = START_TIMER;
  private score = 0;
  private elapsed = 0;
  private driveTime = 0;
  private dodged = 0;
  private nearMisses = 0;
  private collisions = 0;
  private checkpointIndex = 0;
  private branchChoice: BranchId | null = null;
  private countdown = 3.2;
  private completed = false;
  private failed = false;
  private summary: SummaryStats | null = null;
  private lastSteerDirection: -1 | 0 | 1 = 0;
  private cameraShake = 0;
  private randomState = 0x12345678;

  constructor(
    car: CarDefinition,
    musicPack: MusicPackDefinition,
    routeTreeId: RouteTreeId,
    options?: {
      tutorialEnabled?: boolean;
      forgivingTrafficEnabled?: boolean;
      steeringAssistEnabled?: boolean;
      randomSeed?: number;
      initialState?: {
        distance?: number;
        speed?: number;
        timer?: number;
        checkpointIndex?: number;
        score?: number;
        dodged?: number;
        nearMisses?: number;
        collisions?: number;
        branchChoice?: BranchId;
        lateral?: number;
        countdown?: number;
        traffic?: TrafficCarState[];
      };
    },
  ) {
    this.car = car;
    this.musicPack = musicPack;
    this.routeTreeId = routeTreeId;
    this.routeTree = getRouteTreeById(routeTreeId);
    this.tutorialEnabled = options?.tutorialEnabled ?? true;
    this.forgivingTrafficEnabled = options?.forgivingTrafficEnabled ?? false;
    this.steeringAssistEnabled = options?.steeringAssistEnabled ?? false;
    this.storyBeats = getStoryBeatsForRun(routeTreeId);
    this.randomState = (options?.randomSeed ?? 0x12345678) >>> 0;
    this.applyInitialState(options?.initialState);

    if (!options?.initialState?.traffic?.length) {
      for (let index = 0; index < 4; index += 1) {
        this.spawnTraffic(true);
      }
    }
  }

  update(dt: number, input: InputSnapshot) {
    this.events.length = 0;
    this.cameraShake = Math.max(0, this.cameraShake - dt * 3.2);

    if (this.completed || this.failed) {
      return;
    }

    this.elapsed += dt;

    if (this.countdown > 0) {
      this.countdown = Math.max(0, this.countdown - dt);
      return;
    }

    this.driveTime += dt;

    const activeSegment = this.getActiveSegment();

    const steerInput = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (steerInput !== 0) {
      this.lastSteerDirection = steerInput < 0 ? -1 : 1;
    }

    const maxSpeed = this.car.topSpeed;
    const acceleration =
      (88 + this.car.acceleration * 42) *
      (activeSegment.weatherModifier === "harbor-haze" ? 0.98 : 1);
    const naturalDecel =
      (25 + this.speed * 0.11) *
      (activeSegment.weatherModifier === "sea-breeze" ? 1.04 : 1);
    const brakingForce = 112 + this.speed * 0.18;
    const gripFactor =
      (2.4 + this.car.grip * 0.9) *
      (activeSegment.weatherModifier === "neon-mist"
        ? 0.92
        : activeSegment.weatherModifier === "sea-breeze"
          ? 0.96
          : 1.03);
    const windPush =
      activeSegment.weatherModifier === "sea-breeze"
        ? Math.sin(this.elapsed * 1.6 + this.distance * 0.0032) * 0.22
        : 0;

    if (input.accelerate) {
      const accelerationFalloff = clamp(1 - this.speed / (maxSpeed + 12), 0.16, 1);
      this.speed += acceleration * accelerationFalloff * dt;
    } else {
      this.speed -= naturalDecel * dt;
    }

    if (input.brake) {
      this.speed -= brakingForce * dt;
    }

    this.speed += this.getDraftBonus(dt);
    this.speed -= Math.abs(this.drift) * 10 * dt;
    this.speed = clamp(this.speed, 0, maxSpeed);

    const roadCurve = this.computeRoadCurve();
    this.drift += steerInput * gripFactor * dt;
    this.drift -= roadCurve * (0.7 + this.speed / maxSpeed) * dt;
    this.drift += windPush * dt;
    this.drift *= input.left || input.right ? 0.84 : 0.78;

    if (this.steeringAssistEnabled && !(input.left || input.right)) {
      this.drift -= this.lateral * 0.7 * dt;
    }

    this.lateral = clamp(this.lateral + this.drift * dt, -1.08, 1.08);
    this.lateral *= input.left || input.right ? 0.998 : 0.986;

    this.distance += this.speed * dt * 0.88;
    this.timer = Math.max(0, this.timer - dt);

    this.advanceTraffic(dt, activeSegment);
    this.handleCheckpoints();
    this.handleRouteBranch();
    this.triggerStoryBeats();
    this.triggerSetpieces();

    if (this.timer <= 0) {
      this.failed = true;
      this.events.push({ type: "timeout" });
      this.summary = this.buildSummary("timeout");
      return;
    }

    if (this.distance >= this.routeTree.totalDistance) {
      this.distance = this.routeTree.totalDistance;
      this.completed = true;
      this.events.push({ type: "finish" });
      this.summary = this.buildSummary("success");
    }
  }

  pullEvents() {
    return [...this.events];
  }

  getSnapshot(filmGrainEnabled: boolean): DriveSnapshot {
    const { current, next, transition } = findSegment(
      this.distance,
      this.branchChoice,
      this.routeTreeId,
    );
    const render: RenderSnapshot = {
      distance: this.distance,
      speed: this.speed,
      lateral: this.lateral,
      roadCurve: this.computeRoadCurve(),
      playerBodyColor: this.car.bodyColor,
      playerStripeColor: this.car.stripeColor,
      traffic: [...this.traffic],
      segment: current,
      nextSegment: next,
      transition,
      markers: this.getMarkers(),
      cameraShake: this.cameraShake,
      filmGrainEnabled,
    };

    const branchLabel = this.branchChoice
      ? getBranchById(this.branchChoice, this.routeTreeId).name
      : "Route split ahead";

    return {
      render,
      distance: this.distance,
      speed: this.speed,
      timer: this.timer,
      score: this.score,
      dodged: this.dodged,
      nearMisses: this.nearMisses,
      collisions: this.collisions,
      checkpointIndex: this.checkpointIndex,
      checkpointCount: this.routeTree.checkpoints.length,
      branchChoice: this.branchChoice,
      activePrompt: this.getActivePrompt(branchLabel),
      supportPrompt: this.getSupportPrompt(),
      stageLabel: current.label,
      stageDescription: current.description,
      countdown: this.countdown,
      completed: this.completed,
      failed: this.failed,
    };
  }

  getSummary() {
    return this.summary;
  }

  getCar() {
    return this.car;
  }

  getMusicPack() {
    return this.musicPack;
  }

  private getDraftBonus(dt: number) {
    const draftingCar = this.traffic.find(
      (car) => Math.abs(car.lane - this.lateral) < 0.18 && car.z > 0.24 && car.z < 0.46,
    );
    if (!draftingCar) {
      return 0;
    }

    return (this.car.draftGain - 0.92) * 24 * dt;
  }

  private advanceTraffic(dt: number, segment: ScenicSegment) {
    const density = segment.trafficDensity;
    const openingEase = this.distance < 1000 ? 0.58 : this.distance < 1800 ? 0.82 : 1;
    const branchEase = this.branchChoice === "harbor" ? 1.08 : 0.96;
    const regionEase =
      segment.scenery === "harbor" ? 1.1 : segment.scenery === "neon" ? 0.96 : 1;
    this.spawnCooldown -=
      dt *
      (0.85 + (this.speed / this.car.topSpeed) * 0.9) *
      density *
      openingEase *
      branchEase *
      regionEase;

    if (this.spawnCooldown <= 0 && this.traffic.length < 8) {
      this.spawnTraffic(false, segment);
      this.spawnCooldown =
        0.5 +
        this.random() * 0.55 -
        density * 0.16 +
        (this.distance < 1400 ? 0.18 : 0) +
        (segment.scenery === "harbor" ? 0.05 : segment.scenery === "neon" ? -0.03 : 0) +
        (this.forgivingTrafficEnabled ? 0.12 : 0);
    }

    this.traffic = this.traffic.filter((car) => {
      const trafficFlow =
        segment.scenery === "neon" ? 1.04 : segment.scenery === "harbor" ? 0.95 : 1;
      car.z -= (0.18 + this.speed * 0.0043) * car.speedFactor * trafficFlow * dt;

      if (!car.nearMissed && car.z < 0.16) {
        const laneGap = Math.abs(car.lane - this.lateral);
        if (laneGap > 0.14 && laneGap < 0.46) {
          car.nearMissed = true;
          this.nearMisses += 1;
          this.score += 135;
          this.events.push({ type: "near-miss" });
        }
      }

      const collisionWindow = this.forgivingTrafficEnabled ? 0.17 : 0.21;
      if (car.z < 0.18 && Math.abs(car.lane - this.lateral) < collisionWindow) {
        const penalty = this.car.collisionPenalty * (this.branchChoice === "neon" ? 1.08 : 1);
        this.speed *= Math.max(0.42, 0.58 - (penalty - 1) * 0.08);
        this.timer = Math.max(0, this.timer - 1.45 * penalty);
        this.collisions += 1;
        this.cameraShake = 1;
        this.score = Math.max(0, this.score - Math.round(140 * penalty));
        this.events.push({ type: "collision" });
        return false;
      }

      if (car.z < -0.16) {
        if (!car.passed) {
          this.dodged += 1;
          this.score += 38;
        }
        return false;
      }

      return true;
    });
  }

  private spawnTraffic(initialSpawn: boolean, segment = this.getActiveSegment()) {
    const z = initialSpawn ? 0.58 + this.random() * 0.95 : 1.26 + this.random() * 0.9;
    const lanePool =
      segment.scenery === "harbor"
        ? [0, -0.72, 0.72, 0]
        : segment.scenery === "neon"
          ? [0.72, 0, -0.72, 0.72]
          : [...LANES];
    const preferredLaneOrder = [...lanePool].sort(() => this.random() - 0.5);
    const lane =
      preferredLaneOrder.find((candidateLane) => {
        if (this.distance < 750 && candidateLane === 0 && z < 0.96) {
          return false;
        }

        return !this.traffic.some(
          (car) =>
            Math.abs(car.lane - candidateLane) < 0.05 &&
            Math.abs(car.z - z) < (initialSpawn ? 0.3 : 0.22),
        );
      }) ?? preferredLaneOrder[0];

    this.traffic.push({
      id: this.nextTrafficId,
      lane,
      z,
      color: TRAFFIC_COLORS[this.nextTrafficId % TRAFFIC_COLORS.length],
      speedFactor:
        segment.scenery === "harbor"
          ? 0.78 + this.random() * 0.2
          : segment.scenery === "neon"
            ? 0.9 + this.random() * 0.22
            : 0.84 + this.random() * 0.26,
      passed: false,
      nearMissed: false,
      widthScale:
        segment.scenery === "harbor"
          ? 1.02 + this.random() * 0.22
          : segment.scenery === "neon"
            ? 0.88 + this.random() * 0.18
            : 0.9 + this.random() * 0.25,
      headlights: segment.nightLevel > 0.45 ? this.random() > 0.18 : this.random() > 0.55,
    });
    this.nextTrafficId += 1;
  }

  private handleCheckpoints() {
    const checkpoint = this.routeTree.checkpoints[this.checkpointIndex];
    if (!checkpoint || this.distance < checkpoint.distance) {
      return;
    }

    this.timer += checkpoint.bonus;
    this.score += 320 + checkpoint.bonus * 12;
    this.checkpointIndex += 1;
    this.events.push({
      type: "checkpoint",
      checkpointIndex: this.checkpointIndex,
      bonus: checkpoint.bonus,
    });
  }

  private handleRouteBranch() {
    if (this.branchChoice !== null || this.distance < this.routeTree.branchDistance) {
      return;
    }

    const threshold = 0.12;
    if (this.lateral <= -threshold) {
      this.branchChoice = "harbor";
    } else if (this.lateral >= threshold) {
      this.branchChoice = "neon";
    } else {
      this.branchChoice = this.lastSteerDirection < 0 ? "harbor" : "neon";
    }

    this.score += 140;
    this.events.push({ type: "branch", branchId: this.branchChoice });
  }

  private triggerStoryBeats() {
    for (const beat of this.storyBeats) {
      if (this.triggeredBeats.has(beat.id)) {
        continue;
      }

      const branchMatches =
        beat.branch === "all" ||
        (this.branchChoice !== null && beat.branch === this.branchChoice);
      if (!branchMatches || this.distance < beat.distance) {
        continue;
      }

      this.triggeredBeats.add(beat.id);
      this.events.push({ type: "story", beat });
    }
  }

  private triggerSetpieces() {
    for (const setpiece of this.routeTree.setpieces ?? []) {
      if (this.triggeredSetpieces.has(setpiece.id)) {
        continue;
      }

      const branchMatches =
        setpiece.branch === "all" ||
        (this.branchChoice !== null && setpiece.branch === this.branchChoice);
      if (!branchMatches || this.distance < setpiece.distance) {
        continue;
      }

      this.triggeredSetpieces.add(setpiece.id);
      this.deploySetpieceTraffic(setpiece.trafficPattern);
      this.events.push({
        type: "story",
        beat: {
          id: setpiece.id,
          distance: setpiece.distance,
          branch: setpiece.branch,
          speaker: setpiece.speaker,
          tone: setpiece.tone,
          title: setpiece.title,
          subtitle: setpiece.subtitle,
        },
      });
    }
  }

  private deploySetpieceTraffic(
    trafficPattern: Array<{
      lane: number;
      z: number;
      speedFactor: number;
      color: string;
      widthScale: number;
    }>,
  ) {
    this.traffic = this.traffic.filter((car) => car.z < 0.18 || car.z > 0.98);

    for (const car of trafficPattern) {
      this.traffic.push({
        id: this.nextTrafficId,
        lane: car.lane,
        z: car.z,
        color: car.color,
        speedFactor: car.speedFactor,
        passed: false,
        nearMissed: false,
        widthScale: car.widthScale,
        headlights: true,
      });
      this.nextTrafficId += 1;
    }
  }

  private computeRoadCurve() {
    let curve =
      Math.sin(this.distance * 0.00125) * 0.54 +
      Math.sin(this.distance * 0.00285 + 1.4) * 0.18 +
      Math.sin(this.distance * 0.00048 + 2.2) * 0.22;

    if (this.branchChoice === "harbor") {
      curve += Math.sin((this.distance - this.routeTree.branchDistance) * 0.0021) * 0.16;
    } else if (this.branchChoice === "neon") {
      curve +=
        Math.sin((this.distance - this.routeTree.branchDistance) * 0.0016 + 0.7) * 0.25;
    }

    return curve;
  }

  private getMarkers(): EventMarker[] {
    const markers: EventMarker[] = [];

    const nextCheckpoint = this.routeTree.checkpoints[this.checkpointIndex];
    if (nextCheckpoint) {
      const checkpointDistance = nextCheckpoint.distance - this.distance;
      if (checkpointDistance <= 1200) {
        markers.push({
          type: "checkpoint",
          distance: checkpointDistance,
          label: nextCheckpoint.label,
        });
      }
    }

    if (this.branchChoice === null) {
      const branchDistance = this.routeTree.branchDistance - this.distance;
      if (branchDistance <= 1100) {
        markers.push({
          type: "branch",
          distance: branchDistance,
          label: "Split: left harbor / right neon",
        });
      }
    }

    const finishDistance = this.routeTree.totalDistance - this.distance;
    if (finishDistance <= 1300) {
      markers.push({
        type: "finish",
        distance: finishDistance,
        label: this.routeTree.endings[this.branchChoice ?? "neon"].destination,
      });
    }

    return markers;
  }

  private getActivePrompt(branchLabel: string) {
    if (this.countdown > 0) {
      if (!this.tutorialEnabled) {
        return this.countdown > 1 ? `Grid clears in ${Math.ceil(this.countdown)}` : "Road opens";
      }

      return this.countdown > 1 ? `Lights in ${Math.ceil(this.countdown)}` : "Go for the horizon";
    }

    if (this.failed) {
      return "Out of time";
    }

    if (this.completed) {
      return "Finish line secured";
    }

    if (this.timer < 8) {
      return "Low time. Hit the next gate clean.";
    }

    if (
      this.branchChoice === null &&
      this.distance >= this.routeTree.branchDistance - this.routeTree.branchHintDistance
    ) {
      const harborBranch = getBranchById("harbor", this.routeTreeId);
      const neonBranch = getBranchById("neon", this.routeTreeId);
      return `Choose your route. Lean left for ${harborBranch.name}, right for ${neonBranch.name}.`;
    }

    if (!this.tutorialEnabled) {
      return `Current line: ${branchLabel}`;
    }

    if (this.distance < 700) {
      return "Hold throttle and settle the car before the first traffic pack.";
    }

    if (this.distance < 1800) {
      return "Small steering inputs keep speed alive through traffic.";
    }

    if (this.nearMisses === 0 && this.distance > 2000) {
      return "A clean close pass scores a near miss bonus.";
    }

    return `Current line: ${branchLabel}`;
  }

  private getSupportPrompt() {
    if (this.countdown > 0) {
      if (!this.tutorialEnabled) {
        return "Mirador City gate closes at the skyline. Make every checkpoint count.";
      }

      return "Arrow keys or WASD to drive. Gamepad steering, triggers, and face buttons are also live.";
    }

    if (
      this.branchChoice === null &&
      this.distance >= this.routeTree.branchDistance - this.routeTree.branchHintDistance
    ) {
      const harborBranch = getBranchById("harbor", this.routeTreeId);
      const neonBranch = getBranchById("neon", this.routeTreeId);
      return `Stay left for ${harborBranch.strapline.toLowerCase()}, or right for ${neonBranch.strapline.toLowerCase()}.`;
    }

    if (!this.tutorialEnabled) {
      return findSegment(this.distance, this.branchChoice, this.routeTreeId).current.description;
    }

    if (this.checkpointIndex < this.routeTree.checkpoints.length) {
      const checkpointDistance = Math.max(
        0,
        this.routeTree.checkpoints[this.checkpointIndex].distance - this.distance,
      );
      return `Next checkpoint in ${Math.round(checkpointDistance)} m.`;
    }

    return "Skyline finish ahead. Keep the lane clean and carry the run home.";
  }

  private buildSummary(outcome: "success" | "timeout"): SummaryStats {
    const branch = this.branchChoice ?? "neon";
    const ending = this.routeTree.endings[branch];
    const score =
      Math.round(this.score) +
      (outcome === "success" ? 450 : 0) +
      Math.round(this.timer * 24) -
      this.collisions * 40;
    const totalTime = Math.max(1, this.driveTime);
    const medal = this.getMedal(score, outcome);
    const record = {
      id: `${Date.now()}-${Math.floor(Math.random() * 9999)}`,
      createdAt: new Date().toISOString(),
      outcome: outcome === "success" ? "Finished" : "Out of time",
      carId: this.car.id,
      musicPackId: this.musicPack.id,
      routeTreeId: this.routeTreeId,
      branch,
      medal,
      score: Math.max(0, score),
      distance: this.distance,
      timeRemaining: this.timer,
      nearMisses: this.nearMisses,
      collisions: this.collisions,
      totalTime,
    } as const;

    return {
      outcome,
      title: outcome === "success" ? ending.title : "Run lost",
      subtitle:
        outcome === "success"
          ? ending.subtitle
          : `${getBranchById(branch, this.routeTreeId).name} stayed alive, but the timer broke first. One more tidy checkpoint chain gets this home.`,
      medal,
      branch,
      checkpointCount: this.checkpointIndex,
      ending,
      record,
      scoreLines: [
        { label: "Score", value: `${record.score}` },
        { label: "Time remaining", value: `${record.timeRemaining.toFixed(1)} s` },
        { label: "Near misses", value: `${record.nearMisses}` },
        { label: "Traffic dodged", value: `${this.dodged}` },
        { label: "Collisions", value: `${record.collisions}` },
      ],
    };
  }

  private getMedal(score: number, outcome: "success" | "timeout") {
    if (outcome === "timeout") {
      return "Retry";
    }

    if (this.collisions === 0 && score >= 3200) {
      return "Sunfire";
    }

    if (score >= 2600) {
      return "Gold";
    }

    if (score >= 1900) {
      return "Silver";
    }

    return "Bronze";
  }

  private applyInitialState(
    state:
      | {
          distance?: number;
          speed?: number;
          timer?: number;
          checkpointIndex?: number;
          score?: number;
          dodged?: number;
          nearMisses?: number;
          collisions?: number;
          branchChoice?: BranchId;
          lateral?: number;
          countdown?: number;
          traffic?: TrafficCarState[];
        }
      | undefined,
  ) {
    if (!state) {
      return;
    }

    this.distance = state.distance ?? this.distance;
    this.speed = state.speed ?? this.speed;
    this.timer = state.timer ?? this.timer;
    this.checkpointIndex = state.checkpointIndex ?? this.checkpointIndex;
    this.score = state.score ?? this.score;
    this.dodged = state.dodged ?? this.dodged;
    this.nearMisses = state.nearMisses ?? this.nearMisses;
    this.collisions = state.collisions ?? this.collisions;
    this.branchChoice = state.branchChoice ?? this.branchChoice;
    this.lateral = state.lateral ?? this.lateral;
    this.countdown = state.countdown ?? this.countdown;
    if (state.traffic) {
      this.traffic = state.traffic.map((car) => ({ ...car }));
      this.nextTrafficId =
        this.traffic.reduce((maxId, car) => Math.max(maxId, car.id), 0) + 1;
    }
  }

  private random() {
    this.randomState = (this.randomState + 0x6d2b79f5) >>> 0;
    let value = Math.imul(this.randomState ^ (this.randomState >>> 15), 1 | this.randomState);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  private getActiveSegment() {
    return findSegment(this.distance, this.branchChoice, this.routeTreeId).current;
  }
}
