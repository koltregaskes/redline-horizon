import {
  BRANCH_DISTANCE,
  CARS,
  MUSIC_PACKS,
  ROUTE_TREES,
  RUN_DISTANCE,
  formatMeters,
  getBranchById,
  getCarById,
  getMusicPackById,
  getRouteTreeById,
  getSegments,
} from "../game/config";
import type { ReviewScreen } from "./review-mode";
import type {
  AppScreen,
  AssistOptions,
  BranchId,
  DriveSnapshot,
  RouteTreeDefinition,
  StoredProfile,
  SummaryStats,
} from "../game/types";

export type BannerTone = "info" | "checkpoint" | "branch" | "danger" | "radio" | "rival" | "scenic";

export type BannerState = {
  kicker: string;
  title: string;
  subtitle: string;
  tone: BannerTone;
};

export type AttractCard = {
  eyebrow: string;
  title: string;
  body: string;
};

export type AppViewModel = {
  screen: AppScreen;
  profile: StoredProfile;
  summary: SummaryStats | null;
  snapshot: DriveSnapshot | null;
  paused: boolean;
  reviewMode: boolean;
  reviewHold: boolean;
  reviewScreen: ReviewScreen | null;
  banner: BannerState | null;
  bannerVisible: boolean;
  menuBranch: BranchId;
  attractCard: AttractCard;
};

export function getShellMarkup() {
  return `
    <div class="app-shell" data-screen="title">
      <canvas id="road-canvas" class="road-canvas" aria-label="Playable Redline Horizon road"></canvas>
      <div class="ui-layer">
        <header class="top-bar" id="top-bar"></header>
        <main class="panel-grid">
          <section class="feature-panel" id="feature-panel"></section>
          <aside class="side-panel" id="side-panel"></aside>
        </main>
        <div class="overlay-layer" id="overlay-layer"></div>
        <footer class="bottom-rail" id="bottom-rail"></footer>
        <div class="touch-controls" id="touch-controls">
          <button class="touch-button steer" data-touch="left">Left</button>
          <button class="touch-button throttle" data-touch="accelerate">Go</button>
          <button class="touch-button throttle" data-touch="brake">Brake</button>
          <button class="touch-button steer" data-touch="right">Right</button>
        </div>
      </div>
    </div>
  `;
}

export function getTopBarMarkup(model: AppViewModel) {
  const car = getCarById(model.profile.selectedCarId);
  const musicPack = getMusicPackById(model.profile.selectedMusicPackId);
  const routeTree = getRouteTreeById(model.profile.selectedRouteTreeId);

  if (model.screen === "drive" && model.snapshot) {
    return `
      <div class="brand-chip">
        <span class="label">Stage</span>
        <strong>${model.snapshot.stageLabel}</strong>
      </div>
      <div class="hud-chip ${model.snapshot.timer < 8 ? "warning" : ""}">
        <span class="label">Timer</span>
        <strong data-field="timer">${model.snapshot.timer.toFixed(1)}s</strong>
      </div>
      <div class="hud-chip">
        <span class="label">Checkpoint</span>
        <strong data-field="checkpoint">${model.snapshot.checkpointIndex}/${model.snapshot.checkpointCount}</strong>
      </div>
      <div class="hud-chip">
        <span class="label">Speed</span>
        <strong data-field="speed">${Math.round(model.snapshot.speed)} km/h</strong>
      </div>
      <div class="hud-chip">
        <span class="label">Score</span>
        <strong data-field="score">${Math.round(model.snapshot.score)}</strong>
      </div>
      ${
        model.reviewMode
          ? `
            <div class="hud-chip">
              <span class="label">Review</span>
              <strong>${model.reviewHold ? "Paused snapshot" : "Live replay"}</strong>
            </div>
          `
          : ""
      }
    `;
  }

  return `
    <div class="brand-chip">
      <span class="label">Road-trip demo</span>
      <strong>${routeTree.title}</strong>
    </div>
    <div class="hud-chip">
      <span class="label">Selected car</span>
      <strong>${car.name}</strong>
    </div>
    <div class="hud-chip">
      <span class="label">Music pack</span>
      <strong>${musicPack.name}</strong>
    </div>
    <div class="hud-chip">
      <span class="label">Best records</span>
      <strong>${model.profile.records.length}</strong>
    </div>
    ${
      model.reviewMode
        ? `
          <div class="hud-chip">
            <span class="label">Review</span>
            <strong>${model.reviewHold ? "Fast-entry snapshot" : "Deterministic profile"}</strong>
          </div>
        `
        : ""
    }
  `;
}

export function getFeaturePanelMarkup(model: AppViewModel) {
  const car = getCarById(model.profile.selectedCarId);
  const musicPack = getMusicPackById(model.profile.selectedMusicPackId);
  const routeTree = getRouteTreeById(model.profile.selectedRouteTreeId);

  if (model.screen === "route-brief") {
    const harborBranch = getBranchById("harbor", routeTree.id);
    const neonBranch = getBranchById("neon", routeTree.id);
    return `
      <div class="panel-copy">
        <p class="eyebrow">Route Brief</p>
        <h1>${routeTree.title}</h1>
        <p class="lede">${routeTree.story}</p>
        <p class="support-copy">${routeTree.strapline}. Loadout locked: ${car.name} with ${musicPack.name}. Preview cue: ${musicPack.previewCue}</p>
      </div>
      <div class="story-brief">
        <span class="route-label">Mission</span>
        <p>${routeTree.story}</p>
      </div>
      <div class="route-card route-presence-card">
        <div>
          <span class="route-label">Soundstage</span>
          <strong>${routeTree.presentation.soundscapeTitle}</strong>
        </div>
        <p>${routeTree.presentation.soundscapeBody}</p>
      </div>
      <div class="route-card">
        <div>
          <span class="route-label">Branch promise</span>
          <strong>${harborBranch.name} or ${neonBranch.name}</strong>
        </div>
        <p>${harborBranch.risk} ${neonBranch.risk}</p>
      </div>
      <div class="panel-actions">
        <button class="primary-button" data-action="launch-drive">Launch drive</button>
        <button class="ghost-button" data-action="goto-car-select">Car select</button>
        <button class="ghost-button" data-action="goto-music-select">Music select</button>
        <button class="ghost-button" data-action="goto-title">Back to title</button>
      </div>
    `;
  }

  if (model.screen === "car-select") {
    return `
      <div class="panel-copy">
        <p class="eyebrow">Car Select</p>
        <h1>${car.name}</h1>
        <p class="lede">${car.description}</p>
        <p class="support-copy">${car.flavorText}</p>
      </div>
      <div class="stat-grid">
        ${statMeter("Top speed", car.topSpeed / 260, `${car.topSpeed} km/h`)}
        ${statMeter("Acceleration", car.acceleration, `${Math.round(car.acceleration * 100)} / 100`)}
        ${statMeter("Grip", car.grip, `${Math.round(car.grip * 100)} / 100`)}
        ${statMeter("Draft gain", car.draftGain / 1.1, `${Math.round(car.draftGain * 100)} / 100`)}
      </div>
      <div class="panel-actions">
        <button class="primary-button" data-action="goto-route-brief">Continue to route brief</button>
        <button class="ghost-button" data-action="goto-title">Back to title</button>
      </div>
    `;
  }

  if (model.screen === "music-select") {
    return `
      <div class="panel-copy">
        <p class="eyebrow">Music Select</p>
        <h1>${musicPack.name}</h1>
        <p class="lede">${musicPack.description}</p>
        <p class="support-copy">${musicPack.previewCue}</p>
      </div>
      <div class="track-wave">
        <span></span><span></span><span></span><span></span><span></span>
      </div>
      <div class="story-brief">
        <span class="route-label">Branch moods</span>
        <p>Harbor: ${musicPack.routeMood.harbor}</p>
        <p>Neon: ${musicPack.routeMood.neon}</p>
      </div>
      <div class="panel-actions">
        <button class="primary-button" data-action="goto-route-brief">Continue to route brief</button>
        <button class="ghost-button" data-action="goto-title">Back to title</button>
      </div>
    `;
  }

  if (model.screen === "records") {
    return `
      <div class="panel-copy">
        <p class="eyebrow">Records</p>
        <h1>Run archive</h1>
        <p class="lede">Local records stay in this browser so the demo keeps its own replay pressure between sessions.</p>
      </div>
      ${getRecordsMarkup(model.profile)}
      <div class="panel-actions">
        <button class="ghost-button" data-action="clear-records">Clear local records</button>
        <button class="ghost-button" data-action="goto-title">Back to title</button>
      </div>
    `;
  }

  if (model.screen === "options") {
    return `
      <div class="panel-copy">
        <p class="eyebrow">Options</p>
        <h1>Demo tuning</h1>
        <p class="lede">Small switches that help polish the feel without burying the main fantasy under menus.</p>
      </div>
      <div class="options-stack">
        ${optionCard(model.profile.options.musicEnabled, "musicEnabled", "Music playback", "Keep the selected route music pack active in menus and on the road.")}
        ${optionCard(model.profile.options.effectsEnabled, "effectsEnabled", "Engine and event FX", "Checkpoint tones, collisions, radio stings, and the procedural engine layer.")}
        ${optionCard(model.profile.options.tutorialEnabled, "tutorialEnabled", "Tutorial prompts", "Leave onboarding folded into the run instead of front-loading text.")}
        ${optionCard(model.profile.options.filmGrainEnabled, "filmGrainEnabled", "Film grain", "A subtle postcard texture pass over the canvas render.")}
        ${assistCard(model.profile.assists.routeLineEnabled, "routeLineEnabled", "Route line assist", "Keeps the route meter and split preview a little more explicit.")}
        ${assistCard(model.profile.assists.steeringAssistEnabled, "steeringAssistEnabled", "Steering assist", "A gentle recentering aid for players learning the flow.")}
        ${assistCard(model.profile.assists.forgivingTrafficEnabled, "forgivingTrafficEnabled", "Forgiving traffic", "Slightly widens safe gaps for accessibility and mobile runs.")}
      </div>
      <div class="panel-actions">
        <button class="ghost-button" data-action="goto-title">Back to title</button>
      </div>
    `;
  }

  if (model.screen === "summary" && model.summary) {
    const musicPack = getMusicPackById(model.summary.record.musicPackId);
    const summaryHero = getSummaryHeroMarkup(model.summary);
    const summaryPayoff = getSummaryPayoffMarkup(model.summary, musicPack.name);
    return `
      <div class="panel-copy">
        <p class="eyebrow">Run Summary</p>
        <h1>${model.summary.title}</h1>
        <p class="lede">${model.summary.subtitle}</p>
        <p class="support-copy">${model.summary.ending.postcard}</p>
      </div>
      ${summaryHero}
      <div class="summary-medal">${model.summary.medal}</div>
      ${summaryPayoff}
      <div class="summary-grid">
        ${model.summary.scoreLines
          .map(
            (line) => `
              <div class="summary-card">
                <span>${line.label}</span>
                <strong>${line.value}</strong>
              </div>
            `,
          )
          .join("")}
      </div>
      <div class="panel-actions">
        <button class="primary-button" data-action="goto-route-brief">Drive again</button>
        <button class="ghost-button" data-action="goto-title">Back to title</button>
      </div>
    `;
  }

  if (model.screen === "drive" && model.snapshot) {
    return `
      <div class="drive-card">
        <p class="eyebrow">Road feed</p>
        <strong class="drive-stage-title">${model.snapshot.stageLabel}</strong>
        <p class="support-copy" data-field="stage-description">${model.snapshot.stageDescription}</p>
        <div class="route-meter">
          <div class="route-meter-fill" data-field="route-fill" style="width:${Math.round(
            (model.snapshot.distance / RUN_DISTANCE) * 100,
          )}%"></div>
        </div>
        <div class="drive-row">
          <span>Route progress</span>
          <strong data-field="distance">${formatMeters(model.snapshot.distance)} / ${formatMeters(RUN_DISTANCE)}</strong>
        </div>
        <div class="drive-row">
          <span>Branch</span>
          <strong data-field="branch">${
            model.snapshot.branchChoice
              ? getBranchById(model.snapshot.branchChoice, routeTree.id).name
              : "Choose at split"
          }</strong>
        </div>
        <div class="drive-row">
          <span>Traffic cleared</span>
          <strong>${model.snapshot.dodged}</strong>
        </div>
        <div class="drive-row">
          <span>Near misses</span>
          <strong data-field="near-misses">${model.snapshot.nearMisses}</strong>
        </div>
        <div class="drive-row">
          <span>Collisions</span>
          <strong data-field="collisions">${model.snapshot.collisions}</strong>
        </div>
        <div class="panel-actions">
          <button class="ghost-button" data-action="pause-drive">Pause</button>
        </div>
      </div>
    `;
  }

  return `
    <div class="panel-copy">
      <p class="eyebrow">${routeTree.presentation.titleEyebrow}</p>
      <h1>${routeTree.title}</h1>
      <p class="lede">${routeTree.presentation.titleBody}</p>
      <p class="support-copy press-start">Press Enter, A, or tap to roll into the route brief.</p>
    </div>
    <div class="story-brief">
      <span class="route-label">${model.attractCard.eyebrow}</span>
      <p><strong>${model.attractCard.title}</strong></p>
      <p>${model.attractCard.body}</p>
    </div>
    <div class="route-card route-presence-card">
      <div>
        <span class="route-label">Selected route</span>
        <strong>${routeTree.presentation.routeCardTitle}</strong>
      </div>
      <p>${routeTree.presentation.routeCardBody}</p>
    </div>
    <div class="panel-actions">
      <button class="primary-button" data-action="goto-route-brief">Start drive</button>
      <button class="ghost-button" data-action="goto-car-select">Car select</button>
      <button class="ghost-button" data-action="goto-music-select">Music select</button>
      <button class="ghost-button" data-action="goto-records">Records</button>
      <button class="ghost-button" data-action="goto-options">Options</button>
    </div>
  `;
}

export function getSidePanelMarkup(model: AppViewModel) {
  const car = getCarById(model.profile.selectedCarId);
  const musicPack = getMusicPackById(model.profile.selectedMusicPackId);
  const routeTree = getRouteTreeById(model.profile.selectedRouteTreeId);

  if (model.screen === "car-select") {
    return `
      <div class="selector-stack">
        ${CARS.map((entry) => {
          const unlocked = model.profile.unlocks.cars.includes(entry.id);
          return `
            <button class="selector-card ${entry.id === car.id ? "selected" : ""} ${unlocked ? "" : "locked"}" data-action="select-car" data-car-id="${entry.id}" ${unlocked ? "" : "disabled"}>
              <span class="selector-label">${entry.tagline}</span>
              <strong>${entry.name}</strong>
              <small>${unlocked ? entry.portraitTitle : entry.unlockRule.label}</small>
            </button>
          `;
        }).join("")}
      </div>
    `;
  }

  if (model.screen === "music-select") {
    return `
      <div class="selector-stack">
        ${MUSIC_PACKS.map((entry) => {
          const unlocked = model.profile.unlocks.musicPacks.includes(entry.id);
          return `
            <button class="selector-card ${entry.id === musicPack.id ? "selected" : ""} ${unlocked ? "" : "locked"}" data-action="select-music-pack" data-music-pack-id="${entry.id}" ${unlocked ? "" : "disabled"}>
              <span class="selector-label">${entry.theme}</span>
              <strong>${entry.name}</strong>
              <small>${unlocked ? entry.previewCue : entry.unlockRule.label}</small>
            </button>
          `;
        }).join("")}
      </div>
    `;
  }

  if (model.screen === "drive") {
    return "";
  }

  if (model.screen === "summary" && model.summary) {
    const branch = getBranchById(model.summary.branch, model.summary.record.routeTreeId);
    const summaryRoute = getRouteTreeById(model.summary.record.routeTreeId);
    return `
      <div class="info-card">
        <p class="eyebrow">${model.summary.outcome === "timeout" ? "Missed destination" : "Destination"}</p>
        <strong>${model.summary.ending.destination}</strong>
        <p>${
          model.summary.outcome === "timeout"
            ? `This is the arrival you were chasing. The route still reads beautifully, which makes the miss sting in a useful way for the public demo.`
            : model.summary.ending.postcard
        }</p>
      </div>
      <div class="info-card">
        <p class="eyebrow">Route board</p>
        <strong>${summaryRoute.title}</strong>
        <p>${summaryRoute.presentation.destinationGlow}</p>
      </div>
      <div class="info-card">
        <p class="eyebrow">${model.summary.outcome === "timeout" ? "Route pressure" : "Branch taken"}</p>
        <strong>${branch.name}</strong>
        <p>${
          model.summary.outcome === "timeout"
            ? `${branch.name} keeps its identity even in failure: ${branch.risk}`
            : branch.description
        }</p>
      </div>
      <div class="info-card">
        <p class="eyebrow">${model.summary.outcome === "timeout" ? "Soundtrack still live" : "Current loadout"}</p>
        <strong>${car.name}</strong>
        <p>${
          model.summary.outcome === "timeout"
            ? `${musicPack.name} keeps the mood coherent even when the run breaks late.`
            : musicPack.name
        }</p>
      </div>
      ${getProgressionMarkup(model.profile, model.summary.record.routeTreeId)}
    `;
  }

  if (model.screen === "route-brief") {
    return `
      <div class="info-card">
        <p class="eyebrow">Route board</p>
        ${getRouteSelectorMarkup(model.profile)}
      </div>
      <div class="info-card">
        <p class="eyebrow">Route map</p>
        ${getRouteMapMarkup(routeTree, null)}
      </div>
      <div class="info-card">
        <p class="eyebrow">Branches</p>
        ${routeTree.branches
          .map(
            (branch) => `
              <div class="route-branch">
                <strong>${branch.name}</strong>
                <p>${branch.scenicMomentSubtitle}</p>
              </div>
            `,
          )
          .join("")}
      </div>
      <div class="info-card">
        <p class="eyebrow">Loadout</p>
        <strong>${car.name}</strong>
        <p>${musicPack.name}</p>
      </div>
      <div class="info-card">
        <p class="eyebrow">Destination mood</p>
        <strong>${routeTree.presentation.destinationMood}</strong>
        <p>${routeTree.presentation.destinationGlow}</p>
      </div>
      ${getProgressionMarkup(model.profile, routeTree.id)}
    `;
  }

  return `
    <div class="info-card">
      <p class="eyebrow">Route board</p>
      ${getRouteSelectorMarkup(model.profile)}
    </div>
    <div class="info-card">
      <p class="eyebrow">Current car</p>
      <strong>${car.name}</strong>
      <p>${car.portraitTitle}</p>
    </div>
    <div class="info-card">
      <p class="eyebrow">Current music pack</p>
      <strong>${musicPack.name}</strong>
      <p>${musicPack.previewCue}</p>
    </div>
    <div class="info-card">
      <p class="eyebrow">Destination mood</p>
      <strong>${routeTree.presentation.destinationMood}</strong>
      <p>${routeTree.presentation.destinationGlow}</p>
    </div>
    <div class="info-card">
      <p class="eyebrow">Route map</p>
      ${getRouteMapMarkup(routeTree, model.snapshot)}
    </div>
    <div class="info-card">
      <p class="eyebrow">Route split</p>
      ${routeTree.branches.map(
        (branch) => `
          <div class="route-branch">
            <strong>${branch.name}</strong>
            <p>${branch.strapline}</p>
          </div>
        `,
      ).join("")}
    </div>
    ${getProgressionMarkup(model.profile, routeTree.id)}
    <div class="side-actions">
      <button class="ghost-button" data-action="goto-records">Records</button>
      <button class="ghost-button" data-action="goto-options">Options</button>
    </div>
  `;
}

export function getBottomRailMarkup(model: AppViewModel) {
  if (model.screen === "drive" && model.snapshot) {
    return `
      <div class="prompt-stack">
        <strong data-field="prompt">${
          model.reviewHold ? "Review snapshot loaded." : model.snapshot.activePrompt
        }</strong>
        <span data-field="support">${
          model.reviewHold
            ? "Deterministic in-drive state. Resume live run when you want motion and audio."
            : model.snapshot.supportPrompt
        }</span>
      </div>
    `;
  }

  if (model.screen === "summary" && model.summary) {
    return `
      <div class="prompt-stack">
        <strong>${model.reviewMode ? "Deterministic summary preview active." : "Stored locally as a new run record."}</strong>
        <span>${
          model.reviewMode
            ? "This run-end layout is isolated from save data so it can be captured without mutating a live profile."
            : `${model.summary.record.outcome} with ${model.summary.record.nearMisses} near misses and ${model.summary.record.collisions} collisions.`
        }</span>
      </div>
    `;
  }

  return `
    <div class="prompt-stack">
      <strong>${
        model.reviewMode
          ? "Review profile active. This route is isolated from live save data."
          : "Controls: arrows or WASD, gamepad stick or d-pad."
      }</strong>
      <span>${
        model.reviewMode
          ? "Use `?autostart=1&review=1` for the branch slice, add `route=afterglow-heights-run` for the alternate destination, use `?review=1&screen=checkpoint` for the late gate moment, or `?review=1&screen=timeout` for the failure-state mood."
          : "Touch steering and pedal pads appear automatically on smaller screens."
      }</span>
    </div>
  `;
}

export function getOverlayMarkup(model: AppViewModel) {
  if (model.screen !== "drive" || !model.snapshot) {
    return "";
  }

  if (model.reviewHold) {
    const checkpointMode = model.reviewScreen === "checkpoint";
    const reviewRouteTree = getRouteTreeById(model.profile.selectedRouteTreeId);
    const checkpointLabel =
      reviewRouteTree.checkpoints[reviewRouteTree.checkpoints.length - 1]?.label ??
      "Late-run checkpoint";
    return `
      <div class="overlay-card review-card">
        <span class="route-label">Review mode</span>
        <strong>${checkpointMode ? checkpointLabel : "Deterministic drive snapshot"}</strong>
        <p>${
          checkpointMode
            ? `This late-run checkpoint slice proves ${reviewRouteTree.title} has its own authored payoff beat after the branch preview. Resume to carry the gate into the final rush.`
            : "Redline has jumped straight into a stable branch scene for review. Resume whenever you want the live run to continue."
        }</p>
        <div class="panel-actions">
          <button class="primary-button" data-action="resume-review">Resume live run</button>
          <button class="ghost-button" data-action="goto-title">Back to title</button>
        </div>
      </div>
    `;
  }

  if (model.paused) {
    return `
      <div class="overlay-card pause-card">
        <span class="route-label">Run paused</span>
        <h2>${model.snapshot.stageLabel}</h2>
        <p>${model.snapshot.stageDescription}</p>
        <div class="panel-actions">
          <button class="primary-button" data-action="resume-drive">Resume</button>
          <button class="ghost-button" data-action="launch-drive">Restart run</button>
          <button class="ghost-button" data-action="goto-title">Back to title</button>
        </div>
      </div>
    `;
  }

  if (model.snapshot.countdown > 0) {
    return `
      <div class="overlay-card countdown-card">
        <span class="route-label">Start lights</span>
        <strong>${model.snapshot.countdown > 1 ? Math.ceil(model.snapshot.countdown) : "Go"}</strong>
      </div>
    `;
  }

  if (
    model.snapshot.branchChoice === null &&
    model.snapshot.distance >= BRANCH_DISTANCE - 650
  ) {
    const reviewRouteTree = getRouteTreeById(model.profile.lastLoadout.routeTreeId);
    const harborBranch = getBranchById("harbor", reviewRouteTree.id);
    const neonBranch = getBranchById("neon", reviewRouteTree.id);
    const harborFocus = model.snapshot.render.lateral < -0.08;
    const neonFocus = model.snapshot.render.lateral > 0.08;
    return `
      <div class="branch-preview">
        <article class="branch-preview-card ${harborFocus ? "focused" : ""}">
          <span class="route-label">Left line</span>
          <strong>${harborBranch.name}</strong>
          <p>${harborBranch.strapline}</p>
        </article>
        <article class="branch-preview-card ${neonFocus ? "focused" : ""}">
          <span class="route-label">Right line</span>
          <strong>${neonBranch.name}</strong>
          <p>${neonBranch.strapline}</p>
        </article>
      </div>
    `;
  }

  if (model.banner && model.bannerVisible) {
    return `
      <div class="overlay-card banner-card tone-${model.banner.tone}">
        <span class="route-label">${model.banner.kicker}</span>
        <strong>${model.banner.title}</strong>
        <p>${model.banner.subtitle}</p>
      </div>
    `;
  }

  return "";
}

function getRecordsMarkup(profile: StoredProfile) {
  if (profile.records.length === 0) {
    return `
      <div class="records-empty">
        <strong>No runs saved yet.</strong>
        <p>The first complete or failed drive will appear here with its score, branch, and timing details.</p>
      </div>
    `;
  }

  return `
    <div class="records-list">
      ${profile.records
        .map((record) => {
          const car = getCarById(record.carId);
          const musicPack = getMusicPackById(record.musicPackId);
          const branch = getBranchById(record.branch, record.routeTreeId);
          const routeTree = getRouteTreeById(record.routeTreeId);
          return `
            <article class="record-row">
              <div>
                <strong>${record.outcome}</strong>
                <p>${car.name} / ${musicPack.name}</p>
              </div>
              <div>
                <span>${routeTree.title}</span>
                <p>${branch.name} / ${record.score} pts / ${record.medal}</p>
              </div>
              <div>
                <span>${record.timeRemaining.toFixed(1)}s left</span>
                <p>${new Date(record.createdAt).toLocaleDateString()}</p>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function getRouteSelectorMarkup(profile: StoredProfile) {
  return `
    <div class="selector-stack">
      ${ROUTE_TREES.map((routeTree) => {
        const unlocked = profile.unlocks.routes.includes(routeTree.id);
        const selected = routeTree.id === profile.selectedRouteTreeId;
        return `
          <button class="selector-card ${selected ? "selected" : ""} ${unlocked ? "" : "locked"}" data-action="select-route-tree" data-route-tree-id="${routeTree.id}" ${unlocked ? "" : "disabled"}>
            <span class="selector-label">${routeTree.strapline}</span>
            <strong>${routeTree.title}</strong>
            <small>${unlocked ? routeTree.story : "Route locked"}</small>
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function optionCard(enabled: boolean, option: string, title: string, copy: string) {
  return `
    <button class="option-card ${enabled ? "selected" : ""}" data-action="toggle-option" data-option="${option}">
      <div>
        <strong>${title}</strong>
        <p>${copy}</p>
      </div>
      <span>${enabled ? "On" : "Off"}</span>
    </button>
  `;
}

function assistCard(enabled: boolean, assist: keyof AssistOptions, title: string, copy: string) {
  return `
    <button class="option-card ${enabled ? "selected" : ""}" data-action="toggle-assist" data-assist="${assist}">
      <div>
        <strong>${title}</strong>
        <p>${copy}</p>
      </div>
      <span>${enabled ? "On" : "Off"}</span>
    </button>
  `;
}

function statMeter(label: string, ratio: number, value: string) {
  return `
    <div class="meter-card">
      <span>${label}</span>
      <div class="meter-track"><div class="meter-fill" style="width: ${Math.round(
        ratio * 100,
      )}%"></div></div>
      <strong>${value}</strong>
    </div>
  `;
}

function getRouteMapMarkup(routeTree: RouteTreeDefinition, snapshot: DriveSnapshot | null) {
  const branchChoice = snapshot?.branchChoice ?? null;
  const stages = getSegments(branchChoice, routeTree.id);
  const progress = snapshot ? Math.round((snapshot.distance / RUN_DISTANCE) * 100) : 0;

  return `
    <div class="route-map">
      <div class="route-map-track">
        <div class="route-map-progress" style="width:${progress}%"></div>
      </div>
      <div class="route-map-nodes">
        ${stages
          .map((stage, index) => {
            const active = snapshot?.stageLabel === stage.label;
            return `
              <div class="route-node ${active ? "active" : ""}">
                <strong>${index + 1}</strong>
                <span>${stage.label}</span>
              </div>
            `;
          })
          .join("")}
      </div>
    </div>
  `;
}

function getProgressionMarkup(profile: StoredProfile, routeTreeId = profile.selectedRouteTreeId) {
  const routeTree = getRouteTreeById(routeTreeId);
  const harborBranch = getBranchById("harbor", routeTreeId);
  const neonBranch = getBranchById("neon", routeTreeId);
  const routeBoard = profile.unlocks.routeBoards[routeTreeId] ?? {};
  const harborMedal = routeBoard.harbor ?? "Unclaimed";
  const neonMedal = routeBoard.neon ?? "Unclaimed";
  const overallMedal = profile.unlocks.medals.overall ?? "Unclaimed";
  const completedBoards = ROUTE_TREES.filter((entry) => {
    const board = profile.unlocks.routeBoards[entry.id];
    return board?.harbor && board?.neon;
  }).length;
  const routeCoverage = `${completedBoards}/${ROUTE_TREES.length} route boards completed`;
  const nextUnlock = !profile.unlocks.cars.includes("monarch-xr")
    ? "Earn Silver or better on any finished run to secure the Monarch XR."
    : !profile.unlocks.musicPacks.includes("night-circuit")
      ? "Post 2400+ points to unlock the Night Circuit music pack."
      : harborMedal === "Unclaimed" || neonMedal === "Unclaimed"
        ? `Set a medal on both ${routeTree.title} branch lines to complete this route board.`
        : completedBoards < ROUTE_TREES.length
          ? "One route board is still incomplete. Finish both branches there to round out the demo archive."
          : "Both demo route boards are complete. Push cleaner medals and stronger branch runs.";

  return `
    <div class="info-card">
      <p class="eyebrow">Progression</p>
      <strong>Overall medal: ${overallMedal}</strong>
      <p>${routeTree.title}: ${routeCoverage}</p>
      <p>${harborBranch.name}: ${harborMedal}</p>
      <p>${neonBranch.name}: ${neonMedal}</p>
      <p>${nextUnlock}</p>
    </div>
  `;
}

function getSummaryHeroMarkup(summary: SummaryStats) {
  const routeTree = getRouteTreeById(summary.record.routeTreeId);
  if (summary.outcome === "timeout") {
    return `
      <div class="summary-hero summary-hero-failure">
        <span class="route-label">Failure-state mood</span>
        <strong>${summary.ending.destination} stays just out of reach</strong>
        <p>${routeTree.presentation.destinationGlow} The point of this slice is not punishment. It is to prove the demo can land a stylish near-miss and still leave a strong emotional afterimage.</p>
      </div>
    `;
  }

  return `
    <div class="summary-hero">
      <span class="route-label">Arrival payoff</span>
      <strong>${summary.ending.arrivalTitle}</strong>
      <p>${summary.ending.arrivalSubtitle} ${routeTree.presentation.destinationGlow}</p>
    </div>
  `;
}

function getSummaryPayoffMarkup(summary: SummaryStats, musicPackName: string) {
  if (summary.outcome === "timeout") {
    return `
      <div class="summary-payoff-grid">
        <div class="summary-payoff-card summary-payoff-card-failure">
          <span class="route-label">What slipped away</span>
          <strong>${summary.ending.destination}</strong>
          <p>The lights are visible, the crowd is close, and the finish still reads clearly. That contrast makes the miss feel intentional instead of flat.</p>
        </div>
        <div class="summary-payoff-card summary-payoff-card-failure">
          <span class="route-label">Recovery hook</span>
          <strong>${musicPackName}</strong>
          <p>One cleaner checkpoint chain and this exact route turns from heartbreak into arrival. That is the replay promise this demo should leave behind.</p>
        </div>
      </div>
    `;
  }

  return `
    <div class="summary-payoff-grid">
      <div class="summary-payoff-card">
        <span class="route-label">Festival cue</span>
        <strong>${summary.ending.destination}</strong>
        <p>${summary.ending.festivalCue}</p>
      </div>
      <div class="summary-payoff-card">
        <span class="route-label">Soundtrack landing</span>
        <strong>${musicPackName}</strong>
        <p>${summary.ending.soundtrackCue}</p>
      </div>
    </div>
  `;
}
