import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  crazyInitialize,
  crazyGameplayStart,
  crazyGameplayStop,
  crazyHappytime,
  crazyMidgameAd,
} from "../src/integrations/crazygames";

const root = process.cwd();

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function readRequired(path: string) {
  assert(existsSync(path), `${path} is missing`);
  return readFileSync(path, "utf8");
}

async function verifySdkLifecycle() {
  let initCalls = 0;
  let gameplayStarts = 0;
  let gameplayStops = 0;
  let happytimes = 0;
  let midgameAds = 0;
  let midgameComplete = 0;

  globalThis.window = {
    CrazyGames: {
      SDK: {
        init: async () => {
          initCalls += 1;
        },
        game: {
          gameplayStart: () => {
            gameplayStarts += 1;
          },
          gameplayStop: () => {
            gameplayStops += 1;
          },
          happytime: () => {
            happytimes += 1;
          },
        },
        ad: {
          requestAd: (type, handlers) => {
            assert(type === "midgame", "midgame ad requested with the wrong ad type");
            midgameAds += 1;
            handlers.adFinished?.();
          },
        },
      },
    },
  } as Window & typeof globalThis;

  const initialized = await crazyInitialize();
  crazyGameplayStart();
  crazyGameplayStart();
  await Promise.resolve();
  crazyGameplayStop();
  crazyGameplayStop();
  await Promise.resolve();
  crazyHappytime();
  await Promise.resolve();

  await Promise.race([
    new Promise<void>((resolvePromise) => {
      crazyMidgameAd(() => {
        midgameComplete += 1;
        resolvePromise();
      });
    }),
    new Promise<void>((_, reject) => {
      setTimeout(() => reject(new Error("midgame ad callback did not resolve within 5s")), 5_000);
    }),
  ]);

  assert(initialized, "SDK should report initialized in the mocked CrazyGames environment");
  assert(initCalls === 1, "SDK init should be awaited exactly once");
  assert(gameplayStarts === 1, "gameplayStart should be idempotent");
  assert(gameplayStops === 1, "gameplayStop should be idempotent");
  assert(happytimes === 1, "happytime should be passed through once");
  assert(midgameAds === 1, "midgame ad should be requested once");
  assert(midgameComplete === 1, "midgame ad completion callback should resolve once");
}

function verifyHtmlPackaging() {
  const sourceHtml = readRequired(resolve(root, "index.html"));
  const builtHtml = readRequired(resolve(root, "dist", "index.html"));
  const viteConfig = readRequired(resolve(root, "vite.config.ts"));

  for (const [label, html] of [
    ["index.html", sourceHtml],
    ["dist/index.html", builtHtml],
  ] as const) {
    assert(
      html.includes("https://sdk.crazygames.com/crazygames-sdk-v3.js"),
      `${label} does not include the CrazyGames SDK v3 script`,
    );
  }

  assert(viteConfig.includes('base: "./"'), "Vite base path should remain relative for portal/iframe uploads");
}

async function main() {
  await verifySdkLifecycle();
  verifyHtmlPackaging();

  console.log("CrazyGames integration verification passed: SDK lifecycle, ad callback, SDK script, relative base path.");
  process.exit(0);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`CrazyGames integration verification failed: ${message}`);
  process.exit(1);
});
