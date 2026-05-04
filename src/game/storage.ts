import {
  CARS,
  DEFAULT_ASSISTS,
  DEFAULT_OPTIONS,
  DEFAULT_ROUTE_TREE_ID,
  MUSIC_PACKS,
  PROFILE_VERSION,
  STORAGE_KEY,
  ROUTE_TREES,
  createDefaultUnlocks,
} from "./config";
import type {
  AppOptions,
  AssistOptions,
  MedalId,
  RunRecord,
  RouteTreeId,
  StoredProfile,
  UnlockState,
} from "./types";

const LEGACY_STORAGE_KEYS = ["redline-horizon-profile-v2", "redline-horizon-profile-v1"];

type RawProfile = Partial<StoredProfile> & {
  selectedTrackId?: string;
  selectedRouteTreeId?: string;
};

function isMedal(value: unknown): value is MedalId {
  return (
    value === "Retry" ||
    value === "Bronze" ||
    value === "Silver" ||
    value === "Gold" ||
    value === "Sunfire"
  );
}

const MEDAL_RANK: Record<MedalId, number> = {
  Retry: 0,
  Bronze: 1,
  Silver: 2,
  Gold: 3,
  Sunfire: 4,
};

function upgradeMedal(current: MedalId | undefined, candidate: MedalId) {
  if (!current) {
    return candidate;
  }

  return MEDAL_RANK[candidate] > MEDAL_RANK[current] ? candidate : current;
}

function normalizeRecords(records: unknown): RunRecord[] {
  if (!Array.isArray(records)) {
    return [];
  }

  return records
    .filter((record): record is Record<string, unknown> => typeof record === "object" && record !== null)
    .map((record, index) => ({
      id: typeof record.id === "string" ? record.id : `legacy-${index}`,
      createdAt:
        typeof record.createdAt === "string" ? record.createdAt : new Date().toISOString(),
      outcome: record.outcome === "Out of time" ? "Out of time" : "Finished",
      carId: typeof record.carId === "string" ? record.carId : CARS[0].id,
      musicPackId:
        typeof record.musicPackId === "string"
          ? record.musicPackId
          : typeof record.trackId === "string"
            ? record.trackId
            : MUSIC_PACKS[0].id,
      routeTreeId:
        typeof record.routeTreeId === "string"
          ? (record.routeTreeId as RouteTreeId)
          : DEFAULT_ROUTE_TREE_ID,
      branch: record.branch === "harbor" ? "harbor" : "neon",
      medal: isMedal(record.medal) ? record.medal : record.outcome === "Out of time" ? "Retry" : "Bronze",
      score: typeof record.score === "number" ? record.score : 0,
      distance: typeof record.distance === "number" ? record.distance : 0,
      timeRemaining: typeof record.timeRemaining === "number" ? record.timeRemaining : 0,
      nearMisses: typeof record.nearMisses === "number" ? record.nearMisses : 0,
      collisions: typeof record.collisions === "number" ? record.collisions : 0,
      totalTime: typeof record.totalTime === "number" ? record.totalTime : 1,
    }));
}

function normalizeUnlocks(unlocks: Partial<UnlockState> | undefined, records: RunRecord[]): UnlockState {
  const defaults = createDefaultUnlocks();
  const unlockedMedals = records.map((record) => record.medal);
  const hasSilverOrBetter = unlockedMedals.some((medal) => medal === "Silver" || medal === "Gold" || medal === "Sunfire");
  const hasStrongScore = records.some((record) => record.score >= 2400);
  const routeBoards = { ...(unlocks?.routeBoards ?? {}) } as UnlockState["routeBoards"];

  for (const record of records) {
    if (record.medal === "Retry") {
      continue;
    }

    routeBoards[record.routeTreeId] = {
      ...(routeBoards[record.routeTreeId] ?? {}),
      [record.branch]: upgradeMedal(routeBoards[record.routeTreeId]?.[record.branch], record.medal),
    };
  }

  return {
    cars: Array.from(
      new Set([...(unlocks?.cars ?? defaults.cars), ...(hasSilverOrBetter ? [CARS[1].id] : [])]),
    ),
    musicPacks: Array.from(
      new Set([
        ...(unlocks?.musicPacks ?? defaults.musicPacks),
        ...(hasStrongScore ? [MUSIC_PACKS[2].id] : []),
      ]),
    ),
    routes: Array.from(new Set((unlocks?.routes ?? defaults.routes) as RouteTreeId[])),
    medals: {
      ...defaults.medals,
      ...(unlocks?.medals ?? {}),
    },
    routeBoards,
    storyFlags: Array.from(new Set(unlocks?.storyFlags ?? defaults.storyFlags)),
  };
}

function createDefaultLoadout() {
  return {
    carId: CARS[0].id,
    musicPackId: MUSIC_PACKS[0].id,
    routeTreeId: DEFAULT_ROUTE_TREE_ID,
    lastBranch: null,
  } as const;
}

function safeParseProfile(raw: string | null): StoredProfile | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as RawProfile;
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }

    const records = normalizeRecords(parsed.records);
    const selectedCarId = typeof parsed.selectedCarId === "string" ? parsed.selectedCarId : CARS[0].id;
    const selectedMusicPackId =
      typeof parsed.selectedMusicPackId === "string"
        ? parsed.selectedMusicPackId
        : typeof parsed.selectedTrackId === "string"
          ? parsed.selectedTrackId
          : MUSIC_PACKS[0].id;
    const selectedRouteTreeId =
      typeof parsed.selectedRouteTreeId === "string"
        ? (parsed.selectedRouteTreeId as RouteTreeId)
        : DEFAULT_ROUTE_TREE_ID;
    const defaultLoadout = createDefaultLoadout();
    const assists: AssistOptions = {
      ...DEFAULT_ASSISTS,
      ...(parsed.assists ?? {}),
    };

    return {
      version: PROFILE_VERSION,
      selectedCarId,
      selectedMusicPackId,
      selectedRouteTreeId,
      options: {
        ...DEFAULT_OPTIONS,
        ...(parsed.options ?? {}),
      },
      assists,
      unlocks: normalizeUnlocks(parsed.unlocks, records),
      lastLoadout: {
        ...defaultLoadout,
        ...(parsed.lastLoadout ?? {}),
      },
      records,
    };
  } catch {
    return null;
  }
}

function readStoredProfile(): StoredProfile | null {
  if (typeof window === "undefined") {
    return null;
  }

  const keys = [STORAGE_KEY, ...LEGACY_STORAGE_KEYS];
  for (const key of keys) {
    const parsed = safeParseProfile(window.localStorage.getItem(key));
    if (parsed) {
      return parsed;
    }
  }

  return null;
}

export function loadProfile(): StoredProfile {
  if (typeof window === "undefined") {
    return createDefaultProfile();
  }

  const parsed = readStoredProfile();
  if (!parsed) {
    return createDefaultProfile();
  }

  return {
    ...parsed,
    selectedCarId: CARS.some((car) => car.id === parsed.selectedCarId)
      ? parsed.selectedCarId
      : CARS[0].id,
    selectedMusicPackId: MUSIC_PACKS.some((musicPack) => musicPack.id === parsed.selectedMusicPackId)
      ? parsed.selectedMusicPackId
      : MUSIC_PACKS[0].id,
    selectedRouteTreeId: ROUTE_TREES.some((routeTree) => routeTree.id === parsed.selectedRouteTreeId)
      ? parsed.selectedRouteTreeId
      : DEFAULT_ROUTE_TREE_ID,
  };
}

export function saveProfile(profile: StoredProfile) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function updateOption(profile: StoredProfile, key: keyof AppOptions, value: boolean) {
  profile.options = {
    ...profile.options,
    [key]: value,
  };
}

export function updateAssist(profile: StoredProfile, key: keyof AssistOptions, value: boolean) {
  profile.assists = {
    ...profile.assists,
    [key]: value,
  };
}

export function addRecord(profile: StoredProfile, record: RunRecord) {
  profile.records = [record, ...profile.records]
    .sort((left, right) => right.score - left.score)
    .slice(0, 12);

  if (record.medal !== "Retry") {
    profile.unlocks.medals.overall = upgradeMedal(profile.unlocks.medals.overall, record.medal);
    profile.unlocks.medals[record.branch] = upgradeMedal(
      profile.unlocks.medals[record.branch],
      record.medal,
    );
    profile.unlocks.routeBoards[record.routeTreeId] = {
      ...(profile.unlocks.routeBoards[record.routeTreeId] ?? {}),
      [record.branch]: upgradeMedal(
        profile.unlocks.routeBoards[record.routeTreeId]?.[record.branch],
        record.medal,
      ),
    };
  }

  if ((record.medal === "Silver" || record.medal === "Gold" || record.medal === "Sunfire") && !profile.unlocks.cars.includes(CARS[1].id)) {
    profile.unlocks.cars = [...profile.unlocks.cars, CARS[1].id];
  }

  if (record.score >= 2400 && !profile.unlocks.musicPacks.includes(MUSIC_PACKS[2].id)) {
    profile.unlocks.musicPacks = [...profile.unlocks.musicPacks, MUSIC_PACKS[2].id];
  }
}

export function createDefaultProfile(): StoredProfile {
  const defaultLoadout = createDefaultLoadout();
  return {
    version: PROFILE_VERSION,
    selectedCarId: defaultLoadout.carId,
    selectedMusicPackId: defaultLoadout.musicPackId,
    selectedRouteTreeId: defaultLoadout.routeTreeId,
    options: { ...DEFAULT_OPTIONS },
    assists: { ...DEFAULT_ASSISTS },
    unlocks: createDefaultUnlocks(),
    lastLoadout: { ...defaultLoadout },
    records: [],
  };
}
