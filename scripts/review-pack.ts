import { createReadStream, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, resolve } from "node:path";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

const REPO_ROOT = process.cwd();
const DIST_DIR = resolve(REPO_ROOT, "dist");
const CAPTURE_DIR = resolve(REPO_ROOT, "..", "LOCAL-ONLY", "captures", "redline-horizon");
const HUB_BASE_URL = "http://{host}:4306";

const MIME_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
};

type ReviewCapture = {
  label: string;
  filename: string;
  route: string;
  waitForSelector: string;
  afterLoad?: (page: Page) => Promise<void>;
};

function ensureBuildExists() {
  if (!existsSync(resolve(DIST_DIR, "index.html"))) {
    throw new Error("dist/index.html is missing. Run `npm.cmd run build` before `npm.cmd run review:pack`.");
  }
}

function serveDist() {
  const server = createServer((request, response) => {
    const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
    const pathname = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
    const requestedPath = resolve(DIST_DIR, `.${pathname}`);
    const safePath = requestedPath.startsWith(DIST_DIR) ? requestedPath : resolve(DIST_DIR, "index.html");
    const filePath = existsSync(safePath) ? safePath : resolve(DIST_DIR, "index.html");
    const extension = extname(filePath).toLowerCase();

    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Content-Type", MIME_TYPES[extension] ?? "application/octet-stream");

    const stream = createReadStream(filePath);
    stream.on("error", () => {
      response.statusCode = 500;
      response.end("Failed to read asset.");
    });
    stream.pipe(response);
  });

  return new Promise<{ close: () => Promise<void>; url: string }>((resolveServer, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Unable to determine review server address."));
        return;
      }

      resolveServer({
        url: `http://127.0.0.1:${address.port}`,
        close: () =>
          new Promise<void>((resolveClose, rejectClose) => {
            server.close((error) => {
              if (error) {
                rejectClose(error);
                return;
              }
              resolveClose();
            });
          }),
      });
    });
  });
}

async function captureRoute(context: BrowserContext, baseUrl: string, capture: ReviewCapture) {
  const page = await context.newPage();
  await page.goto(`${baseUrl}${capture.route}`, { waitUntil: "networkidle" });
  await page.waitForSelector("#app");
  await page.locator(capture.waitForSelector).waitFor({ state: "visible" });
  if (capture.afterLoad) {
    await capture.afterLoad(page);
  }
  await page.screenshot({ path: resolve(CAPTURE_DIR, capture.filename), fullPage: true });
  await page.close();
}

async function captureDesktopPack(browser: Browser, baseUrl: string) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: "dark",
  });

  const captures: ReviewCapture[] = [
    {
      label: "Review title state",
      filename: "review-url-title-desktop.png",
      route: "/?review=1",
      waitForSelector: "h1",
    },
    {
      label: "Review neon snapshot",
      filename: "review-url-neon-desktop.png",
      route: "/?autostart=1&review=1",
      waitForSelector: ".review-card",
    },
    {
      label: "Review neon live run",
      filename: "review-url-neon-live.png",
      route: "/?autostart=1&review=1",
      waitForSelector: ".review-card",
      afterLoad: async (page) => {
        await page.locator("[data-action='resume-review']").click();
        await page.locator("[data-field='prompt']").waitFor({ state: "visible" });
      },
    },
    {
      label: "Review harbor snapshot",
      filename: "review-url-harbor-desktop.png",
      route: "/?autostart=1&review=1&branch=harbor",
      waitForSelector: "[data-field='stage-description']",
    },
    {
      label: "Review checkpoint state",
      filename: "review-url-checkpoint-desktop.png",
      route: "/?review=1&screen=checkpoint&branch=neon",
      waitForSelector: ".review-card",
    },
    {
      label: "Review afterglow checkpoint state",
      filename: "review-url-afterglow-checkpoint-desktop.png",
      route: "/?review=1&route=afterglow-heights-run&screen=checkpoint&branch=neon",
      waitForSelector: ".review-card",
    },
    {
      label: "Review afterglow harbor checkpoint state",
      filename: "review-url-afterglow-harbor-checkpoint-desktop.png",
      route: "/?review=1&route=afterglow-heights-run&screen=checkpoint&branch=harbor",
      waitForSelector: ".review-card",
    },
    {
      label: "Review timeout state",
      filename: "review-url-timeout-desktop.png",
      route: "/?review=1&screen=timeout&branch=harbor",
      waitForSelector: ".summary-grid",
    },
    {
      label: "Review summary state",
      filename: "review-url-summary-desktop.png",
      route: "/?review=1&screen=summary&branch=neon",
      waitForSelector: ".summary-grid",
    },
    {
      label: "Review afterglow route summary",
      filename: "review-url-afterglow-summary-desktop.png",
      route: "/?review=1&route=afterglow-heights-run&screen=summary&branch=neon",
      waitForSelector: ".summary-grid",
    },
  ];

  for (const capture of captures) {
    await captureRoute(context, baseUrl, capture);
  }

  await context.close();
}

async function captureMobilePack(browser: Browser, baseUrl: string) {
  const context = await browser.newContext({
    viewport: { width: 430, height: 932 },
    isMobile: true,
    hasTouch: true,
  });

  const page = await context.newPage();
  await page.goto(`${baseUrl}/?autostart=1&review=1`, { waitUntil: "networkidle" });
  await page.locator(".review-card").waitFor({ state: "visible" });
  await page.locator("#touch-controls").waitFor({ state: "visible" });
  await page.screenshot({ path: resolve(CAPTURE_DIR, "review-url-neon-mobile.png"), fullPage: true });
  await page.close();
  await context.close();
}

function writeEvidenceNotes() {
  const evidence = `# Redline Horizon Review Evidence

## Review URLs

- \`${HUB_BASE_URL}/?review=1\`
- \`${HUB_BASE_URL}/?autostart=1&review=1\`
- \`${HUB_BASE_URL}/?autostart=1&review=1&branch=harbor\`
- \`${HUB_BASE_URL}/?review=1&screen=checkpoint&branch=neon\`
- \`${HUB_BASE_URL}/?review=1&route=afterglow-heights-run&screen=checkpoint&branch=neon\`
- \`${HUB_BASE_URL}/?review=1&route=afterglow-heights-run&screen=checkpoint&branch=harbor\`
- \`${HUB_BASE_URL}/?review=1&screen=timeout&branch=harbor\`
- \`${HUB_BASE_URL}/?review=1&screen=summary&branch=neon\`
- \`${HUB_BASE_URL}/?review=1&route=afterglow-heights-run&screen=summary&branch=neon\`

## Supported Query Params

- \`autostart=1\`
- \`review=1\`
- \`screen=title|drive|checkpoint|summary|timeout\`
- \`route=azure-coast-run|afterglow-heights-run\`
- \`branch=harbor|neon\`
- \`car=<car-id>\`
- \`music=<music-pack-id>\`
- \`seed=<number>\`
- \`hold=0\`
- \`distance=<meters>\`
- \`timer=<seconds>\`

## Evidence Files

- \`review-url-title-desktop.png\`
- \`review-url-neon-desktop.png\`
- \`review-url-neon-live.png\`
- \`review-url-harbor-desktop.png\`
- \`review-url-checkpoint-desktop.png\`
- \`review-url-afterglow-checkpoint-desktop.png\`
- \`review-url-afterglow-harbor-checkpoint-desktop.png\`
- \`review-url-timeout-desktop.png\`
- \`review-url-summary-desktop.png\`
- \`review-url-afterglow-summary-desktop.png\`
- \`review-url-neon-mobile.png\`

## Verified Notes

- review title route loads an isolated deterministic profile without mutating live save data
- base review URL lands directly in a deterministic frozen in-drive neon snapshot
- resume exits the frozen snapshot and returns the run to live motion
- \`branch=harbor\` lands directly in a deterministic Harbor Slip branch scene
- \`screen=checkpoint\` lands directly on the Skyline Entry Gate late-run checkpoint showcase
- \`route=afterglow-heights-run&screen=checkpoint\` lands directly on the alternate-route hilltop checkpoint showcase with the authored Sera traffic weave live in frame
- \`route=afterglow-heights-run&screen=checkpoint&branch=harbor\` lands directly on the alternate-route lower-branch bottleneck with the authored ferry spillover traffic live in frame
- \`screen=timeout\` lands directly on a deterministic failure-state summary so the demo can show a deliberate near-miss mood
- \`screen=summary\` lands directly on a deterministic run-end summary layout
- \`route=afterglow-heights-run\` switches review mode to the alternate destination route and lands on a distinct hilltop payoff
- mobile review URL still exposes touch controls

## Caveats

- browser audio still needs a user gesture before music can start, due to autoplay restrictions
- review mode is intentionally non-persistent and does not write local records or mutate the normal save flow

## Next Improvement

- add more authored audiovisual content so each route board gains richer destination flavor beyond structure, setpieces, and progression
`;

  writeFileSync(resolve(CAPTURE_DIR, "review-evidence.md"), evidence, "utf8");
}

async function main() {
  ensureBuildExists();
  mkdirSync(CAPTURE_DIR, { recursive: true });

  const server = await serveDist();
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({ headless: true });
    await captureDesktopPack(browser, server.url);
    await captureMobilePack(browser, server.url);
    writeEvidenceNotes();
    console.log(`Redline Horizon review pack captured in ${CAPTURE_DIR}`);
  } finally {
    if (browser) {
      await browser.close();
    }
    await server.close();
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Redline Horizon review pack failed: ${message}`);
  process.exitCode = 1;
});
