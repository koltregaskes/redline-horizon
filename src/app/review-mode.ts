import { getCarById, getMusicPackById, getRouteTreeById } from "../game/config";
import type { BranchId, RouteTreeId, TrafficCarState } from "../game/types";

export type ReviewScreen = "title" | "drive" | "checkpoint" | "summary" | "timeout";

export type ReviewModeConfig = {
  enabled: boolean;
  autostart: boolean;
  hold: boolean;
  screen: ReviewScreen;
  branch: BranchId;
  carId: string;
  musicPackId: string;
  routeTreeId: RouteTreeId;
  seed: number;
  initialState: {
    distance: number;
    speed: number;
    timer: number;
    checkpointIndex: number;
    score: number;
    dodged: number;
    nearMisses: number;
    collisions: number;
    branchChoice: BranchId;
    lateral: number;
    countdown: number;
    traffic: TrafficCarState[];
  };
};

function parseNumber(value: string | null, fallback: number) {
  if (value === null || value.trim() === "") {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildReviewTraffic(
  branch: BranchId,
  screen: ReviewScreen,
  routeTreeId: RouteTreeId,
): TrafficCarState[] {
  const headlights = branch === "neon" || screen === "checkpoint";
  if (screen === "checkpoint") {
    if (routeTreeId === "afterglow-heights-run" && branch === "harbor") {
      return [
        {
          id: 9301,
          lane: 0,
          z: 0.84,
          color: "#ffc27f",
          speedFactor: 0.82,
          passed: false,
          nearMissed: false,
          widthScale: 1.02,
          headlights,
        },
        {
          id: 9302,
          lane: 0.72,
          z: 0.64,
          color: "#7fe3ef",
          speedFactor: 0.86,
          passed: false,
          nearMissed: false,
          widthScale: 0.96,
          headlights,
        },
        {
          id: 9303,
          lane: -0.72,
          z: 0.48,
          color: "#ff9d74",
          speedFactor: 0.9,
          passed: false,
          nearMissed: false,
          widthScale: 0.98,
          headlights,
        },
      ];
    }

    if (routeTreeId === "afterglow-heights-run" && branch === "neon") {
      return [
        {
          id: 9201,
          lane: 0.72,
          z: 0.84,
          color: "#ff8f74",
          speedFactor: 0.84,
          passed: false,
          nearMissed: false,
          widthScale: 0.94,
          headlights,
        },
        {
          id: 9202,
          lane: -0.72,
          z: 0.64,
          color: "#ffd27b",
          speedFactor: 0.88,
          passed: false,
          nearMissed: false,
          widthScale: 0.98,
          headlights,
        },
        {
          id: 9203,
          lane: 0,
          z: 0.49,
          color: "#7fe8ff",
          speedFactor: 0.92,
          passed: false,
          nearMissed: false,
          widthScale: 1.02,
          headlights,
        },
        {
          id: 9204,
          lane: 0.72,
          z: 0.34,
          color: "#ff9dc7",
          speedFactor: 0.86,
          passed: false,
          nearMissed: false,
          widthScale: 0.96,
          headlights,
        },
      ];
    }

    return [
      {
        id: 9101,
        lane: -0.54,
        z: 0.34,
        color: "#ff77a8",
        speedFactor: 0.92,
        passed: false,
        nearMissed: false,
        widthScale: 0.94,
        headlights,
      },
      {
        id: 9102,
        lane: 0.06,
        z: 0.55,
        color: "#ffe16f",
        speedFactor: 0.88,
        passed: false,
        nearMissed: false,
        widthScale: 1.04,
        headlights,
      },
      {
        id: 9103,
        lane: 0.62,
        z: 0.8,
        color: "#6ed5ff",
        speedFactor: 0.9,
        passed: false,
        nearMissed: false,
        widthScale: 0.96,
        headlights,
      },
    ];
  }

  return [
    {
      id: 9001,
      lane: branch === "harbor" ? -0.46 : -0.62,
      z: 0.22,
      color: "#ff77a8",
      speedFactor: 0.88,
      passed: false,
      nearMissed: false,
      widthScale: 0.98,
      headlights,
    },
    {
      id: 9002,
      lane: 0.1,
      z: 0.45,
      color: "#ffe16f",
      speedFactor: 0.91,
      passed: false,
      nearMissed: false,
      widthScale: 1.02,
      headlights,
    },
    {
      id: 9003,
      lane: branch === "harbor" ? 0.66 : 0.54,
      z: 0.68,
      color: "#6ed5ff",
      speedFactor: 0.84,
      passed: false,
      nearMissed: false,
      widthScale: 0.95,
      headlights,
    },
    {
      id: 9004,
      lane: branch === "harbor" ? -0.05 : 0.28,
      z: 0.9,
      color: "#7df2a7",
      speedFactor: 0.93,
      passed: false,
      nearMissed: false,
      widthScale: 1,
      headlights,
    },
  ];
}

export function parseReviewModeConfig(): ReviewModeConfig | null {
  if (typeof window === "undefined") {
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  if (params.get("review") !== "1") {
    return null;
  }

  const branch = params.get("branch") === "harbor" ? "harbor" : "neon";
  const screen = params.get("screen") === "summary"
    ? "summary"
    : params.get("screen") === "timeout"
      ? "timeout"
    : params.get("screen") === "checkpoint"
      ? "checkpoint"
    : params.get("screen") === "title"
      ? "title"
      : "drive";
  const routeParam = params.get("route");
  const routeTreeId = getRouteTreeById(
    routeParam === "afterglow-heights-run" ? "afterglow-heights-run" : "azure-coast-run",
  ).id as RouteTreeId;
  const carId = getCarById(params.get("car") ?? "solstice-gt").id;
  const defaultMusic = branch === "neon" ? "night-circuit" : "slipstream-serenade";
  const musicPackId = getMusicPackById(params.get("music") ?? defaultMusic).id;
  const checkpointMode = screen === "checkpoint";
  const distance = parseNumber(
    params.get("distance"),
    checkpointMode ? 7565 : branch === "neon" ? 6280 : 6180,
  );
  const timer = parseNumber(params.get("timer"), checkpointMode ? 10.2 : 21.8);
  const speed = parseNumber(params.get("speed"), checkpointMode ? 224 : branch === "neon" ? 204 : 192);
  const seed = Math.max(1, Math.floor(parseNumber(params.get("seed"), 90210)));

  return {
    enabled: true,
    autostart: params.get("autostart") === "1" || screen === "checkpoint",
    hold: params.get("hold") !== "0",
    screen,
    branch,
    carId,
    musicPackId,
    routeTreeId,
    seed,
    initialState: {
      distance,
      speed,
      timer,
      checkpointIndex: distance >= 7600 ? 4 : distance >= 5600 ? 3 : distance >= 3600 ? 2 : 1,
      score: checkpointMode ? (branch === "neon" ? 2540 : 2385) : branch === "neon" ? 2180 : 2060,
      dodged: checkpointMode ? (branch === "neon" ? 41 : 44) : branch === "neon" ? 28 : 32,
      nearMisses: checkpointMode ? 5 : 3,
      collisions: checkpointMode && branch === "harbor" ? 1 : 0,
      branchChoice: branch,
      lateral:
        checkpointMode && routeTreeId === "afterglow-heights-run" && branch === "harbor"
          ? -0.18
          : checkpointMode && routeTreeId === "afterglow-heights-run" && branch === "neon"
            ? -0.04
            : checkpointMode
              ? branch === "neon"
                ? 0.08
                : -0.06
              : branch === "neon"
                ? 0.22
                : -0.28,
      countdown: 0,
      traffic: buildReviewTraffic(branch, screen, routeTreeId),
    },
  };
}
