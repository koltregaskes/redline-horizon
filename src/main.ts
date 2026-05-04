import "./styles.css";
import { crazyGameplayStart, crazyGameplayStop, crazyHappytime } from "./integrations/crazygames";
import { InputController } from "./app/input-controller";
import {
  parseReviewModeConfig,
  type ReviewModeConfig,
  type ReviewScreen,
} from "./app/review-mode";
import {
  type AttractCard,
  type BannerState,
  getBottomRailMarkup,
  getFeaturePanelMarkup,
  getOverlayMarkup,
  getShellMarkup,
  getSidePanelMarkup,
  getTopBarMarkup,
} from "./app/ui";
import { AudioDirector } from "./audio/audio-director";
import {
  BRANCH_DISTANCE,
  CHECKPOINTS,
  RUN_DISTANCE,
  findSegment,
  formatMeters,
  getBranchById,
  getCarById,
  getMusicPackById,
  getRouteTreeById,
} from "./game/config";
import { RoadRenderer } from "./game/renderer";
import { DriveSimulation } from "./game/simulation";
import {
  addRecord,
  createDefaultProfile,
  loadProfile,
  saveProfile,
  updateAssist,
  updateOption,
} from "./game/storage";
import type {
  AppOptions,
  AppScreen,
  BranchId,
  DriveSnapshot,
  RunEvent,
  StoredProfile,
  SummaryStats,
  TrafficCarState,
} from "./game/types";

const ATTRACT_CARDS: AttractCard[] = [
  {
    eyebrow: "Reference target",
    title: "Beat-the-clock postcard racing",
    body: "The browser demo stays laser-focused on speed, music ritual, and scenic route identity rather than simulation detail.",
  },
  {
    eyebrow: "Branch fantasy",
    title: "Choose the city you arrive in",
    body: "The lower line stays warmer and denser. The upper line is cleaner, colder, and harsher on mistakes.",
  },
  {
    eyebrow: "Audio promise",
    title: "Music pack selection matters",
    body: "Each pack now previews differently in menus and shifts into branch and finish sections during the run.",
  },
];

function createReviewProfile(config: ReviewModeConfig): StoredProfile {
  const profile = createDefaultProfile();
  profile.selectedCarId = config.carId;
  profile.selectedMusicPackId = config.musicPackId;
  profile.selectedRouteTreeId = config.routeTreeId;
  profile.options.tutorialEnabled = false;
  profile.options.filmGrainEnabled = false;
  profile.assists.routeLineEnabled = true;
  profile.unlocks.cars = ["solstice-gt", "monarch-xr", "aero-vista"];
  profile.unlocks.musicPacks = ["sunset-vector", "slipstream-serenade", "night-circuit"];
  profile.unlocks.routes = ["azure-coast-run", "afterglow-heights-run"];
  profile.unlocks.routeBoards = {
    "azure-coast-run": {
      harbor: "Silver",
      neon: "Gold",
    },
    "afterglow-heights-run": {
      harbor: "Bronze",
      neon: "Silver",
    },
  };
  profile.unlocks.storyFlags = ["review-profile", config.branch, config.routeTreeId];
  profile.lastLoadout = {
    carId: config.carId,
    musicPackId: config.musicPackId,
    routeTreeId: config.routeTreeId,
    lastBranch: config.branch,
  };
  profile.records = [
    {
      id: "review-neon-express",
      createdAt: "2026-04-09T09:15:00.000Z",
      outcome: "Finished",
      carId: "monarch-xr",
      musicPackId: "night-circuit",
      routeTreeId: config.routeTreeId,
      branch: "neon",
      medal: "Gold",
      score: 2780,
      distance: RUN_DISTANCE,
      timeRemaining: 12.8,
      nearMisses: 5,
      collisions: 0,
      totalTime: 96.1,
    },
    {
      id: "review-harbor-slip",
      createdAt: "2026-04-08T20:42:00.000Z",
      outcome: "Finished",
      carId: "aero-vista",
      musicPackId: "slipstream-serenade",
      routeTreeId: config.routeTreeId,
      branch: "harbor",
      medal: "Silver",
      score: 2140,
      distance: RUN_DISTANCE,
      timeRemaining: 8.5,
      nearMisses: 4,
      collisions: 1,
      totalTime: 101.6,
    },
  ];
  return profile;
}

function createReviewSummary(config: ReviewModeConfig): SummaryStats {
  const branch = config.branch;
  const routeTree = getRouteTreeById(config.routeTreeId);
  const ending = routeTree.endings[branch];
  if (config.screen === "timeout") {
    const timeoutPreset =
      branch === "neon"
        ? {
            score: 1680,
            distance: 8860,
            nearMisses: 4,
            collisions: 2,
            totalTime: 104.4,
            dodged: 39,
          }
        : {
            score: 1540,
            distance: 8740,
            nearMisses: 3,
            collisions: 3,
            totalTime: 109.1,
            dodged: 42,
          };

    return {
      outcome: "timeout",
      title: branch === "neon" ? "Skyline slips away" : "Harbor gate missed",
      subtitle:
        branch === "neon"
          ? "The express stayed glamorous, but the last gate shut before Mirador could flare fully alive."
          : "The dock rhythm held until the final gate blinked red. The harbor still glows below, but the tape does not make the stage in time.",
      medal: "Retry",
      branch,
      checkpointCount: routeTree.checkpoints.length,
      ending,
      record: {
        id: `review-timeout-${branch}`,
        createdAt: "2026-04-11T20:05:00.000Z",
        outcome: "Out of time",
        carId: config.carId,
        musicPackId: config.musicPackId,
        routeTreeId: config.routeTreeId,
        branch,
        medal: "Retry",
        score: timeoutPreset.score,
        distance: timeoutPreset.distance,
        timeRemaining: 0,
        nearMisses: timeoutPreset.nearMisses,
        collisions: timeoutPreset.collisions,
        totalTime: timeoutPreset.totalTime,
      },
      scoreLines: [
        { label: "Score", value: `${timeoutPreset.score}` },
        { label: "Distance reached", value: `${formatMeters(timeoutPreset.distance)}` },
        { label: "Near misses", value: `${timeoutPreset.nearMisses}` },
        { label: "Traffic dodged", value: `${timeoutPreset.dodged}` },
        { label: "Collisions", value: `${timeoutPreset.collisions}` },
      ],
    };
  }

  const preset =
    branch === "neon"
      ? {
          medal: "Gold" as const,
          score: 2780,
          timeRemaining: 12.8,
          nearMisses: 5,
          collisions: 0,
          totalTime: 96.1,
          dodged: 34,
        }
      : {
          medal: "Silver" as const,
          score: 2260,
          timeRemaining: 9.4,
          nearMisses: 4,
          collisions: 1,
          totalTime: 101.6,
          dodged: 37,
        };

  return {
    outcome: "success",
    title: ending.title,
    subtitle: ending.subtitle,
    medal: preset.medal,
    branch,
    checkpointCount: routeTree.checkpoints.length,
    ending,
    record: {
      id: `review-summary-${branch}`,
      createdAt: "2026-04-09T22:15:00.000Z",
      outcome: "Finished",
      carId: config.carId,
      musicPackId: config.musicPackId,
      routeTreeId: config.routeTreeId,
      branch,
      medal: preset.medal,
      score: preset.score,
      distance: RUN_DISTANCE,
      timeRemaining: preset.timeRemaining,
      nearMisses: preset.nearMisses,
      collisions: preset.collisions,
      totalTime: preset.totalTime,
    },
    scoreLines: [
      { label: "Score", value: `${preset.score}` },
      { label: "Time remaining", value: `${preset.timeRemaining.toFixed(1)} s` },
      { label: "Near misses", value: `${preset.nearMisses}` },
      { label: "Traffic dodged", value: `${preset.dodged}` },
      { label: "Collisions", value: `${preset.collisions}` },
    ],
  };
}

function getReviewDriveBanner(screen: ReviewScreen | null, routeTreeId: StoredProfile["selectedRouteTreeId"]) {
  const routeTree = getRouteTreeById(routeTreeId);
  const checkpointLabel =
    routeTree.checkpoints[routeTree.checkpoints.length - 1]?.label ?? "Late-run checkpoint";
  if (screen === "checkpoint") {
    return {
      kicker: "Review mode",
      title: checkpointLabel,
      subtitle: `Resume when you want the late-run checkpoint in ${routeTree.title} to spill into the final payoff.`,
      tone: "checkpoint" as const,
    };
  }

  return {
    kicker: "Review mode",
    title: "Deterministic drive snapshot",
    subtitle: "Resume when you want the live run, audio, and traffic motion to continue.",
    tone: "checkpoint" as const,
  };
}

class RedlineHorizonApp {
  private readonly root: HTMLElement;
  private readonly shell: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly topBar: HTMLElement;
  private readonly featurePanel: HTMLElement;
  private readonly sidePanel: HTMLElement;
  private readonly bottomRail: HTMLElement;
  private readonly overlayLayer: HTMLElement;
  private readonly renderer: RoadRenderer;
  private readonly input: InputController;
  private readonly audio = new AudioDirector();
  private readonly reviewConfig: ReviewModeConfig | null;
  private profile: StoredProfile;
  private screen: AppScreen = "title";
  private simulation: DriveSimulation | null = null;
  private summary: SummaryStats | null = null;
  private lastSnapshot: DriveSnapshot | null = null;
  private lastTime = performance.now();
  private menuDistance = 620;
  private menuLateral = 0;
  private menuCurve = 0;
  private menuBranch: BranchId = "neon";
  private paused = false;
  private reviewHold = false;
  private banner: BannerState | null = null;
  private bannerTimer = 0;
  private lastOverlayMarkup = "";
  private uiDirty = true;

  constructor(root: HTMLElement) {
    this.root = root;
    this.reviewConfig = parseReviewModeConfig();
    this.profile = this.reviewConfig ? createReviewProfile(this.reviewConfig) : loadProfile();
    if (this.reviewConfig) {
      this.root.dataset.reviewMode = "true";
    }
    this.root.innerHTML = getShellMarkup();
    this.shell = this.query(".app-shell");
    this.canvas = this.query("#road-canvas");
    this.topBar = this.query("#top-bar");
    this.featurePanel = this.query("#feature-panel");
    this.sidePanel = this.query("#side-panel");
    this.bottomRail = this.query("#bottom-rail");
    this.overlayLayer = this.query("#overlay-layer");
    this.renderer = new RoadRenderer(this.canvas);
    this.input = new InputController(this.query("#touch-controls"));

    this.bindUiEvents();
    this.applyProfile();
    this.resize();
    this.renderChrome();
    this.startFrameLoop();

    if (this.reviewConfig?.screen === "summary" || this.reviewConfig?.screen === "timeout") {
      this.showReviewSummary(this.reviewConfig);
      return;
    }

    if (this.reviewConfig && !this.reviewConfig.autostart) {
      this.showBanner({
        kicker: "Review mode",
        title: "Deterministic profile ready",
        subtitle:
          "This route ignores live save data and save writes. Use `?autostart=1&review=1` for the in-drive slice, add `route=afterglow-heights-run` for the alternate destination, `?review=1&screen=checkpoint` for the late-run gate, or `?review=1&screen=timeout` for the failure-state showcase.",
        tone: "info",
      });
    }

    if (this.reviewConfig?.autostart) {
      void this.startDrive({ reviewConfig: this.reviewConfig, skipAudioPreview: true });
    }
  }

  private bindUiEvents() {
    window.addEventListener("resize", () => this.resize());

    this.root.addEventListener("click", async (event) => {
      const button = (event.target as HTMLElement).closest<HTMLElement>("[data-action]");
      if (!button) {
        return;
      }

      await this.audio.arm();
      this.audio.playMenuBlip();
      await this.handleAction(button);
    });

    const armMusic = async () => {
      await this.audio.previewMusicPack(getMusicPackById(this.profile.selectedMusicPackId));
    };

    window.addEventListener("pointerdown", armMusic, { once: true });
    window.addEventListener("keydown", armMusic, { once: true });
  }

  private async handleAction(button: HTMLElement) {
    const action = button.dataset.action;
    if (!action) {
      return;
    }

    if (action === "launch-drive") {
      await this.startDrive();
      return;
    }

    if (action === "resume-review") {
      this.paused = false;
      this.reviewHold = false;
      this.uiDirty = true;
      this.renderChrome();
      await this.audio.previewMusicPack(getMusicPackById(this.profile.selectedMusicPackId));
      return;
    }

    if (action === "resume-drive") {
      this.paused = false;
      crazyGameplayStart();
      this.uiDirty = true;
      this.renderChrome();
      return;
    }

    if (action === "pause-drive") {
      this.paused = true;
      crazyGameplayStop();
      this.uiDirty = true;
      this.renderChrome();
      return;
    }

    if (action === "goto-title") {
      this.simulation = null;
      this.summary = null;
      this.lastSnapshot = null;
      this.paused = false;
      this.reviewHold = false;
      this.banner = null;
      this.bannerTimer = 0;
      this.screen = "title";
      crazyGameplayStop();
      this.uiDirty = true;
      this.renderChrome();
      return;
    }

    if (action === "goto-route-brief") {
      this.screen = "route-brief";
      this.uiDirty = true;
      this.renderChrome();
      return;
    }

    if (action === "goto-car-select") {
      this.screen = "car-select";
      this.uiDirty = true;
      this.renderChrome();
      return;
    }

    if (action === "goto-music-select") {
      this.screen = "music-select";
      await this.audio.previewMusicPack(getMusicPackById(this.profile.selectedMusicPackId));
      this.uiDirty = true;
      this.renderChrome();
      return;
    }

    if (action === "goto-records") {
      this.screen = "records";
      this.uiDirty = true;
      this.renderChrome();
      return;
    }

    if (action === "goto-options") {
      this.screen = "options";
      this.uiDirty = true;
      this.renderChrome();
      return;
    }

    if (action === "select-car") {
      const carId = button.dataset.carId;
      if (!carId) {
        return;
      }

      this.profile.selectedCarId = carId;
      this.profile.lastLoadout.carId = carId;
      this.persistProfile();
      this.uiDirty = true;
      this.renderChrome();
      return;
    }

    if (action === "select-route-tree") {
      const routeTreeId = button.dataset.routeTreeId as StoredProfile["selectedRouteTreeId"] | undefined;
      if (!routeTreeId) {
        return;
      }

      this.profile.selectedRouteTreeId = routeTreeId;
      this.profile.lastLoadout.routeTreeId = routeTreeId;
      this.persistProfile();
      this.uiDirty = true;
      this.renderChrome();
      return;
    }

    if (action === "select-music-pack") {
      const musicPackId = button.dataset.musicPackId;
      if (!musicPackId) {
        return;
      }

      this.profile.selectedMusicPackId = musicPackId;
      this.profile.lastLoadout.musicPackId = musicPackId;
      this.persistProfile();
      this.uiDirty = true;
      this.renderChrome();
      await this.audio.previewMusicPack(getMusicPackById(musicPackId));
      return;
    }

    if (action === "toggle-option") {
      const option = button.dataset.option as keyof AppOptions | undefined;
      if (!option) {
        return;
      }

      updateOption(this.profile, option, !this.profile.options[option]);
      this.persistProfile();
      this.audio.setOptions(this.profile.options);
      this.uiDirty = true;
      this.renderChrome();
      return;
    }

    if (action === "toggle-assist") {
      const assist = button.dataset.assist as keyof StoredProfile["assists"] | undefined;
      if (!assist) {
        return;
      }

      updateAssist(this.profile, assist, !this.profile.assists[assist]);
      this.persistProfile();
      this.uiDirty = true;
      this.renderChrome();
      return;
    }

    if (action === "clear-records") {
      this.profile.records = [];
      this.persistProfile();
      this.uiDirty = true;
      this.renderChrome();
    }
  }

  private async startDrive(options?: {
    reviewConfig?: ReviewModeConfig;
    skipAudioPreview?: boolean;
  }) {
    const reviewConfig = options?.reviewConfig ?? this.reviewConfig;
    const car = getCarById(reviewConfig?.carId ?? this.profile.selectedCarId);
    const musicPack = getMusicPackById(
      reviewConfig?.musicPackId ?? this.profile.selectedMusicPackId,
    );
    this.summary = null;
    this.paused = false;
    this.reviewHold = reviewConfig?.hold ?? false;
    this.banner = null;
    this.bannerTimer = 0;
    this.profile.lastLoadout = {
      carId: car.id,
      musicPackId: musicPack.id,
      routeTreeId: reviewConfig?.routeTreeId ?? this.profile.selectedRouteTreeId,
      lastBranch: reviewConfig?.branch ?? null,
    };
    this.simulation = new DriveSimulation(
      car,
      musicPack,
      reviewConfig?.routeTreeId ?? this.profile.selectedRouteTreeId,
      {
        tutorialEnabled: this.profile.options.tutorialEnabled,
        forgivingTrafficEnabled: this.profile.assists.forgivingTrafficEnabled,
        steeringAssistEnabled: this.profile.assists.steeringAssistEnabled,
        randomSeed: reviewConfig?.seed,
        initialState: reviewConfig?.initialState,
      },
    );
    this.lastSnapshot = this.simulation.getSnapshot(this.profile.options.filmGrainEnabled);
    this.screen = "drive";
    this.uiDirty = true;
    this.persistProfile();
    this.renderChrome();
    if (this.reviewHold) {
      this.showBanner(
        getReviewDriveBanner(
          reviewConfig?.screen ?? "drive",
          reviewConfig?.routeTreeId ?? this.profile.selectedRouteTreeId,
        ),
      );
    }
    if (!options?.skipAudioPreview) {
      await this.audio.previewMusicPack(musicPack);
    }
    if (!this.reviewHold) {
      crazyGameplayStart();
    }
  }

  private startFrameLoop() {
    const frame = (now: number) => {
      const dt = Math.min((now - this.lastTime) / 1000, 0.033);
      this.lastTime = now;
      this.tick(dt);
      requestAnimationFrame(frame);
    };

    requestAnimationFrame(frame);
  }

  private tick(dt: number) {
    if (this.bannerTimer > 0) {
      this.bannerTimer = Math.max(0, this.bannerTimer - dt);
    }

    if (this.simulation && !this.paused && !this.reviewHold) {
      const previousStage = this.lastSnapshot?.stageLabel;
      this.simulation.update(dt, this.input.snapshot());
      const snapshot = this.simulation.getSnapshot(this.profile.options.filmGrainEnabled);
      const events = this.simulation.pullEvents();
      this.lastSnapshot = snapshot;
      if (snapshot.stageLabel !== previousStage) {
        this.audio.playStageCue(snapshot.render.segment.weatherModifier, snapshot.render.segment.scenery);
        this.uiDirty = true;
      }
      this.audio.playEvents(events);
      this.audio.updateDrive(snapshot.speed, true, {
        branchChoice: snapshot.branchChoice,
        distanceRemaining: Math.max(0, RUN_DISTANCE - snapshot.distance),
        lowTime: snapshot.timer < 8,
      });
      this.handleRunEvents(events, snapshot);

      if (snapshot.completed || snapshot.failed) {
        const summary = this.simulation.getSummary();
        if (summary) {
          this.finishRun(summary);
        }
      }
    } else if (this.simulation && (this.paused || this.reviewHold)) {
      this.audio.updateDrive(0, false);
    } else {
      this.audio.updateDrive(0, false);
      this.advanceMenuBackdrop(dt);
    }

    this.handleKeyboardUi();
    this.renderScene();
    this.renderDynamicHud();
    this.renderOverlay();
  }

  private handleKeyboardUi() {
    if (this.screen === "drive") {
      if (this.reviewHold) {
        if (this.input.consume("confirm")) {
          this.reviewHold = false;
          this.uiDirty = true;
          this.renderChrome();
          void this.audio.previewMusicPack(getMusicPackById(this.profile.selectedMusicPackId));
        } else if (this.input.consume("back")) {
          this.simulation = null;
          this.lastSnapshot = null;
          this.reviewHold = false;
          this.screen = "title";
          this.uiDirty = true;
          this.renderChrome();
        }
        return;
      }

      if (this.input.consume("back")) {
        this.paused = !this.paused;
        if (this.paused) {
          crazyGameplayStop();
        } else {
          crazyGameplayStart();
        }
        this.uiDirty = true;
        this.renderChrome();
      } else if (this.paused && this.input.consume("confirm")) {
        this.paused = false;
        crazyGameplayStart();
        this.uiDirty = true;
        this.renderChrome();
      }
      return;
    }

    if (this.input.consume("confirm")) {
      if (this.screen === "title") {
        this.screen = "route-brief";
        this.uiDirty = true;
        this.renderChrome();
        return;
      }

      if (this.screen === "route-brief") {
        void this.startDrive();
        return;
      }
    }

    if (this.input.consume("back") && this.screen !== "title") {
      this.screen = "title";
      this.uiDirty = true;
      this.renderChrome();
    }
  }

  private finishRun(summary: SummaryStats) {
    if (!this.reviewConfig) {
      addRecord(this.profile, summary.record);
      this.profile.lastLoadout.lastBranch = summary.branch;
      if (!this.profile.unlocks.storyFlags.includes(summary.branch)) {
        this.profile.unlocks.storyFlags = [...this.profile.unlocks.storyFlags, summary.branch];
      }
      this.persistProfile();
    }
    this.summary = summary;
    this.simulation = null;
    this.lastSnapshot = null;
    this.paused = false;
    this.reviewHold = false;
    this.screen = "summary";
    crazyGameplayStop();
    if (summary.outcome === "success") {
      crazyHappytime();
    }
    this.uiDirty = true;
    this.renderChrome();
  }

  private showReviewSummary(config: ReviewModeConfig) {
    this.summary = createReviewSummary(config);
    this.simulation = null;
    this.lastSnapshot = null;
    this.paused = false;
    this.reviewHold = false;
    this.screen = "summary";
    this.showBanner({
      kicker: "Review mode",
      title: config.screen === "timeout" ? "Timeout preview loaded" : "Summary preview loaded",
      subtitle:
        config.screen === "timeout"
          ? "This is a deterministic failure-state run-end screen for fast capture and mood review."
          : "This is a deterministic run-end screen for fast capture and layout review.",
      tone: "info",
    });
    this.uiDirty = true;
    this.renderChrome();
  }

  private handleRunEvents(events: RunEvent[], snapshot: DriveSnapshot) {
    for (const event of events) {
      if (event.type === "checkpoint") {
        const routeTree = getRouteTreeById(this.profile.lastLoadout.routeTreeId);
        this.showBanner({
          kicker: `Checkpoint ${event.checkpointIndex}`,
          title: `${routeTree.checkpoints[event.checkpointIndex - 1]?.label ?? "Checkpoint secured"}`,
          subtitle: `+${event.bonus}s banked. Keep the line tidy for the next gate.`,
          tone: "checkpoint",
        });
        this.uiDirty = true;
      } else if (event.type === "branch") {
        const branch = getBranchById(event.branchId, this.profile.lastLoadout.routeTreeId);
        this.showBanner({
          kicker: "Route locked",
          title: branch.name,
          subtitle: branch.description,
          tone: "branch",
        });
        this.uiDirty = true;
      } else if (event.type === "near-miss") {
        this.showBanner({
          kicker: "Road event",
          title: "Near miss",
          subtitle: "Clean pass. Bonus score secured.",
          tone: "info",
        });
      } else if (event.type === "collision") {
        this.showBanner({
          kicker: "Warning",
          title: "Impact",
          subtitle: "Speed and time lost. Reset the rhythm.",
          tone: "danger",
        });
      } else if (event.type === "story") {
        this.showBanner({
          kicker: event.beat.speaker,
          title: event.beat.title,
          subtitle: event.beat.subtitle,
          tone: event.beat.tone,
        });
      } else if (event.type === "finish") {
        this.showBanner({
          kicker: getRouteTreeById(this.profile.lastLoadout.routeTreeId).title,
          title: "Tape delivered",
          subtitle: `The ${
            snapshot.branchChoice
              ? getBranchById(snapshot.branchChoice, this.profile.lastLoadout.routeTreeId).name
              : "city route"
          } opens into the arrival district.`,
          tone: "scenic",
        });
      }
    }
  }

  private showBanner(banner: BannerState) {
    this.banner = banner;
    this.bannerTimer = banner.tone === "scenic" ? 3.2 : 2.4;
  }

  private renderScene() {
    if (this.simulation && this.lastSnapshot) {
      this.renderer.render(this.lastSnapshot.render);
      return;
    }

    this.renderer.render(this.getMenuRenderSnapshot());
  }

  private renderDynamicHud() {
    if (this.uiDirty) {
      this.renderChrome();
    }

    if (this.screen !== "drive" || !this.lastSnapshot) {
      return;
    }

    const timer = this.queryOptional<HTMLElement>("[data-field='timer']");
    const checkpoint = this.queryOptional<HTMLElement>("[data-field='checkpoint']");
    const speed = this.queryOptional<HTMLElement>("[data-field='speed']");
    const score = this.queryOptional<HTMLElement>("[data-field='score']");
    const branch = this.queryOptional<HTMLElement>("[data-field='branch']");
    const prompt = this.queryOptional<HTMLElement>("[data-field='prompt']");
    const support = this.queryOptional<HTMLElement>("[data-field='support']");
    const distance = this.queryOptional<HTMLElement>("[data-field='distance']");
    const stageDescription = this.queryOptional<HTMLElement>("[data-field='stage-description']");
    const nearMisses = this.queryOptional<HTMLElement>("[data-field='near-misses']");
    const collisions = this.queryOptional<HTMLElement>("[data-field='collisions']");
    const routeFill = this.queryOptional<HTMLElement>("[data-field='route-fill']");

    if (timer) {
      timer.textContent = `${this.lastSnapshot.timer.toFixed(1)}s`;
      timer.parentElement?.classList.toggle("warning", this.lastSnapshot.timer < 8);
    }
    if (checkpoint) {
      checkpoint.textContent = `${this.lastSnapshot.checkpointIndex}/${this.lastSnapshot.checkpointCount}`;
    }
    if (speed) {
      speed.textContent = `${Math.round(this.lastSnapshot.speed)} km/h`;
    }
    if (score) {
      score.textContent = `${Math.round(this.lastSnapshot.score)}`;
    }
    if (branch) {
      branch.textContent = this.lastSnapshot.branchChoice
        ? getBranchById(
            this.lastSnapshot.branchChoice,
            this.profile.lastLoadout.routeTreeId,
          ).name
        : "Choose at split";
    }
    if (prompt) {
      prompt.textContent = this.reviewHold
        ? "Review snapshot loaded."
        : this.lastSnapshot.activePrompt;
    }
    if (support) {
      support.textContent = this.reviewHold
        ? "Deterministic in-drive state. Resume live run when you want motion and audio."
        : this.lastSnapshot.supportPrompt;
    }
    if (distance) {
      distance.textContent = `${formatMeters(this.lastSnapshot.distance)} / ${formatMeters(RUN_DISTANCE)}`;
    }
    if (stageDescription) {
      stageDescription.textContent = this.lastSnapshot.stageDescription;
    }
    if (nearMisses) {
      nearMisses.textContent = `${this.lastSnapshot.nearMisses}`;
    }
    if (collisions) {
      collisions.textContent = `${this.lastSnapshot.collisions}`;
    }
    if (routeFill) {
      routeFill.style.width = `${Math.round(
        (this.lastSnapshot.distance / RUN_DISTANCE) * 100,
      )}%`;
    }
  }

  private renderOverlay() {
    const markup = getOverlayMarkup(this.getViewModel());
    if (markup === this.lastOverlayMarkup) {
      return;
    }

    this.lastOverlayMarkup = markup;
    this.overlayLayer.innerHTML = markup;
  }

  private renderChrome() {
    this.uiDirty = false;
    const activeRouteTree = getRouteTreeById(this.getActiveRouteTreeId());
    this.shell.dataset.screen = this.screen;
    this.shell.dataset.routeTree = activeRouteTree.id;
    this.shell.style.setProperty("--accent", activeRouteTree.presentation.accent);
    const viewModel = this.getViewModel();
    this.topBar.innerHTML = getTopBarMarkup(viewModel);
    this.featurePanel.innerHTML = getFeaturePanelMarkup(viewModel);
    this.sidePanel.innerHTML = getSidePanelMarkup(viewModel);
    this.bottomRail.innerHTML = getBottomRailMarkup(viewModel);
  }

  private getActiveRouteTreeId(): StoredProfile["selectedRouteTreeId"] {
    if (this.summary) {
      return this.summary.record.routeTreeId;
    }

    if (this.screen === "drive") {
      return this.profile.lastLoadout.routeTreeId;
    }

    return this.profile.selectedRouteTreeId;
  }

  private getViewModel() {
    return {
      screen: this.screen,
      profile: this.profile,
      summary: this.summary,
      snapshot: this.lastSnapshot,
      paused: this.paused,
      reviewMode: Boolean(this.reviewConfig),
      reviewHold: this.reviewHold,
      reviewScreen: this.reviewConfig?.screen ?? null,
      banner: this.banner,
      bannerVisible: this.bannerTimer > 0,
      menuBranch: this.menuBranch,
      attractCard: ATTRACT_CARDS[Math.floor(this.menuDistance / 550) % ATTRACT_CARDS.length],
    };
  }

  private advanceMenuBackdrop(dt: number) {
    this.menuDistance += dt * 150;
    this.menuCurve =
      Math.sin(this.menuDistance * 0.0012) * 0.5 +
      Math.cos(this.menuDistance * 0.00036 + 1.1) * 0.18;
    this.menuLateral = Math.sin(this.menuDistance * 0.00058) * 0.22;
    this.menuBranch = Math.sin(this.menuDistance * 0.00018) > 0 ? "neon" : "harbor";
  }

  private getMenuRenderSnapshot() {
    const distance = this.menuDistance % RUN_DISTANCE;
    const { current, next, transition } = findSegment(distance, this.menuBranch);
    const car = getCarById(this.profile.selectedCarId);

    return {
      distance,
      speed: 166,
      lateral: this.menuLateral,
      roadCurve: this.menuCurve,
      playerBodyColor: car.bodyColor,
      playerStripeColor: car.stripeColor,
      traffic: this.getMenuTraffic(distance),
      segment: current,
      nextSegment: next,
      transition,
      markers: [],
      cameraShake: 0,
      filmGrainEnabled: this.profile.options.filmGrainEnabled,
    };
  }

  private getMenuTraffic(distance: number): TrafficCarState[] {
    return [
      { lane: -0.72, offset: 0.08, color: "#ff77a8" },
      { lane: 0, offset: 0.34, color: "#ffe16f" },
      { lane: 0.72, offset: 0.56, color: "#6ed5ff" },
      { lane: -0.72, offset: 0.84, color: "#7df2a7" },
    ]
      .map((entry, index) => {
        const loop = (distance * 0.00072 + entry.offset) % 1.36;
        const z = 1.32 - loop;
        return {
          id: 1000 + index,
          lane: entry.lane,
          z,
          color: entry.color,
          speedFactor: 1,
          passed: false,
          nearMissed: false,
          widthScale: 0.94 + index * 0.03,
          headlights: this.menuBranch === "neon",
        } satisfies TrafficCarState;
      })
      .filter((car) => car.z > -0.1 && car.z < 1.38);
  }

  private resize() {
    const rawDpr = window.devicePixelRatio || 1;
    const effectiveDpr = Math.min(rawDpr, window.innerWidth < 900 ? 1.5 : 1.85);
    this.renderer.resize(window.innerWidth, window.innerHeight, effectiveDpr);
  }

  private applyProfile() {
    this.audio.setOptions(this.profile.options);
  }

  private persistProfile() {
    if (this.reviewConfig) {
      return;
    }
    saveProfile(this.profile);
  }

  private query<T extends HTMLElement>(selector: string): T {
    const element = this.root.querySelector<T>(selector);
    if (!element) {
      throw new Error(`Missing required element: ${selector}`);
    }
    return element;
  }

  private queryOptional<T extends HTMLElement>(selector: string) {
    return this.root.querySelector<T>(selector);
  }
}

const root = document.getElementById("app");
if (!root) {
  throw new Error("App root not found.");
}

new RedlineHorizonApp(root);
