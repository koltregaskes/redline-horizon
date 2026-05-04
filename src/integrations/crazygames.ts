/**
 * CrazyGames SDK wrapper.
 *
 * The CrazyGames SDK v3 script is loaded via `index.html`. When the game runs
 * outside the CrazyGames iframe (local dev, GitHub Pages, etc.) the global
 * `CrazyGames` is undefined and every call here becomes a safe no-op.
 *
 * Lifecycle contract:
 *   - call `crazyGameplayStart()` when an actual play session begins
 *   - call `crazyGameplayStop()` whenever play ends, pauses, or returns to menu
 *
 * Calls are idempotent on our side — the wrapper tracks the current state so
 * paired start/stop calls are safe to over-call.
 */

interface CrazyGamesGameModule {
  gameplayStart?: () => void;
  gameplayStop?: () => void;
  gameLoadingStart?: () => void;
  gameLoadingStop?: () => void;
  happytime?: () => void;
}

interface CrazyGamesAdRequest {
  adFinished?: () => void;
  adError?: (error: unknown) => void;
  adStarted?: () => void;
}

interface CrazyGamesAdModule {
  requestAd?: (type: "midgame" | "rewarded", handlers: CrazyGamesAdRequest) => void;
}

interface CrazyGamesSDK {
  game?: CrazyGamesGameModule;
  ad?: CrazyGamesAdModule;
}

interface CrazyGamesGlobal {
  SDK?: CrazyGamesSDK;
}

declare global {
  interface Window {
    CrazyGames?: CrazyGamesGlobal;
  }
}

let gameplayActive = false;

function getSdk(): CrazyGamesSDK | null {
  if (typeof window === "undefined") return null;
  return window.CrazyGames?.SDK ?? null;
}

export function crazyGameplayStart(): void {
  if (gameplayActive) return;
  gameplayActive = true;
  try {
    getSdk()?.game?.gameplayStart?.();
  } catch (error) {
    // SDK errors must never break the game itself.
    console.warn("[crazygames] gameplayStart failed:", error);
  }
}

export function crazyGameplayStop(): void {
  if (!gameplayActive) return;
  gameplayActive = false;
  try {
    getSdk()?.game?.gameplayStop?.();
  } catch (error) {
    console.warn("[crazygames] gameplayStop failed:", error);
  }
}

export function crazyHappytime(): void {
  try {
    getSdk()?.game?.happytime?.();
  } catch (error) {
    console.warn("[crazygames] happytime failed:", error);
  }
}

/**
 * Request a midgame ad. Calls `onComplete` whether the ad played, errored, or
 * was unavailable — the calling code should always treat this as fire-and-resume.
 *
 * Per CrazyGames guidelines: only request between rounds, never during gameplay,
 * and always pause audio/gameplay around the request.
 */
export function crazyMidgameAd(onComplete: () => void): void {
  const ad = getSdk()?.ad;
  if (!ad?.requestAd) {
    onComplete();
    return;
  }
  let resolved = false;
  const finish = () => {
    if (resolved) return;
    resolved = true;
    onComplete();
  };
  try {
    ad.requestAd("midgame", {
      adFinished: finish,
      adError: finish,
    });
    // Safety net: never wait more than 30s for the SDK callback.
    setTimeout(finish, 30_000);
  } catch (error) {
    console.warn("[crazygames] midgame ad failed:", error);
    finish();
  }
}

export function isCrazyGamesEnvironment(): boolean {
  return getSdk() !== null;
}
