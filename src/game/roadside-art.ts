/**
 * Code-drawn roadside art: billboard faces and the skyline layout.
 *
 * Billboard faces are painted once per (set, variant) into a small offscreen
 * canvas and then scaled by the road renderer, so each frame costs one
 * drawImage per sign. All brands and slogans are invented for the game.
 */

type SignSet = {
  /** Panel gradient, top to bottom. */
  bg: [string, string];
  ink: string;
  sub: string;
  accent: string;
  slogans: Array<[headline: string, tagline: string]>;
};

const SIGN_SETS: Record<string, SignSet> = {
  "festival-posters": {
    bg: ["#ffcf6e", "#ff7a8a"],
    ink: "#2a0f2e",
    sub: "#4a1838",
    accent: "#fff3c4",
    slogans: [
      ["SUNWAVE FEST", "Live on the pier tonight"],
      ["COAST FM 88.4", "Windows down, volume up"],
      ["PALMLINE COLA", "Ice cold since '84"],
    ],
  },
  "causeway-signage": {
    bg: ["#1d3a66", "#0d1a33"],
    ink: "#ffe08a",
    sub: "#9fd8ff",
    accent: "#ff9a5c",
    slogans: [
      ["BRIDGE LINE", "Next exit: the skyline"],
      ["NIGHTDRIVE", "Stay in the fast lane"],
      ["TURBO GLOSS", "Shine at 200 km/h"],
    ],
  },
  "port-logistics": {
    bg: ["#ff9d4d", "#d2482f"],
    ink: "#13202e",
    sub: "#2b1a14",
    accent: "#7fe3ef",
    slogans: [
      ["DOCKSIDE 24/7", "Cargo never sleeps"],
      ["SALT & STEEL", "Port diner, open late"],
      ["TIDEMARK", "Night shift welcome"],
    ],
  },
  "luxury-neon": {
    bg: ["#160b2e", "#2d0f3f"],
    ink: "#8ddfff",
    sub: "#ff9ad8",
    accent: "#ff83d2",
    slogans: [
      ["VELVETINE", "Chrome for the night"],
      ["NEON NOIR", "Watches that glow"],
      ["CLOUD 42", "Rooftop bar, open late"],
    ],
  },
  "marina-afterparty": {
    bg: ["#57e0d0", "#2a7fb8"],
    ink: "#0d1b33",
    sub: "#103049",
    accent: "#ffd27a",
    slogans: [
      ["MARINA BLUE", "Afterparty at slip 9"],
      ["SUNSET YACHTS", "Sail into the glow"],
      ["COCO LAGOON", "Two for one till dawn"],
    ],
  },
  "crown-overlook": {
    bg: ["#2a1846", "#ff7b6b"],
    ink: "#fff1c9",
    sub: "#ffe0f0",
    accent: "#ffd27a",
    slogans: [
      ["CROWN VIEW", "Lookout in 2 km"],
      ["UPPER RIM", "Above the city lights"],
      ["STARGAZE", "Observatory open late"],
    ],
  },
  "skyline-festival": {
    bg: ["#ff6fa8", "#5b2a8a"],
    ink: "#fff6d6",
    sub: "#ffe3f2",
    accent: "#8ddfff",
    slogans: [
      ["MIRADOR LIVE", "Main stage now open"],
      ["RADIO REDLINE", "Deliver the tape"],
      ["SYNTH CITY", "All night, all neon"],
    ],
  },
  "heights-afterparty": {
    bg: ["#0f2a3a", "#1e5a5a"],
    ink: "#84efd0",
    sub: "#ffc07a",
    accent: "#ffc07a",
    slogans: [
      ["LUMEN HEIGHTS", "Afterparty up top"],
      ["AFTERGLOW", "Last lights, best views"],
      ["NIGHT CIRCUIT", "Lap the city once more"],
    ],
  },
};

const FALLBACK_SET = SIGN_SETS["festival-posters"];

export const BILLBOARD_ASPECT = 2.1;
const FACE_W = 252;
const FACE_H = Math.round(FACE_W / BILLBOARD_ASPECT);

export function getSignSet(billboardSet: string): SignSet {
  return SIGN_SETS[billboardSet] ?? FALLBACK_SET;
}

/** Average panel colour, used when a sign is too small to be worth texturing. */
export function getSignFlatColor(billboardSet: string): string {
  return getSignSet(billboardSet).bg[1];
}

export class BillboardFaces {
  private readonly cache = new Map<string, HTMLCanvasElement>();

  constructor() {
    // Faces painted before the web fonts arrive use a fallback face; repaint once they load.
    try {
      void document.fonts?.ready.then(() => this.cache.clear());
    } catch {
      // Font loading API missing: keep the fallback faces.
    }
  }

  get(billboardSet: string, slot: number): HTMLCanvasElement | null {
    const set = getSignSet(billboardSet);
    const variant = ((slot % set.slogans.length) + set.slogans.length) % set.slogans.length;
    const key = `${billboardSet}:${variant}`;
    let face = this.cache.get(key);
    if (!face) {
      face = paintFace(set, variant) ?? undefined;
      if (!face) {
        return null;
      }
      this.cache.set(key, face);
    }
    return face;
  }
}

function paintFace(set: SignSet, variant: number): HTMLCanvasElement | null {
  if (typeof document === "undefined") {
    return null;
  }
  const canvas = document.createElement("canvas");
  canvas.width = FACE_W;
  canvas.height = FACE_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }
  const [headline, tagline] = set.slogans[variant];
  const w = FACE_W;
  const h = FACE_H;

  // Frame: dark steel with a lit top edge.
  ctx.fillStyle = "#0a0e18";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
  ctx.fillRect(0, 0, w, 2);

  // Panel.
  const inset = 7;
  const grad = ctx.createLinearGradient(0, inset, 0, h - inset);
  grad.addColorStop(0, set.bg[0]);
  grad.addColorStop(1, set.bg[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(inset, inset, w - inset * 2, h - inset * 2);

  // Motif, one per variant, kept to the right so the copy stays clear.
  ctx.save();
  ctx.beginPath();
  ctx.rect(inset, inset, w - inset * 2, h - inset * 2);
  ctx.clip();
  if (variant === 0) {
    // Striped sunset disc.
    const cx = w - 52;
    const cy = h - inset;
    ctx.fillStyle = set.accent;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(cx, cy, 44, Math.PI, 0);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = set.bg[1];
    for (let band = 0; band < 5; band += 1) {
      ctx.fillRect(cx - 46, cy - 8 - band * 8, 92, 2 + band * 0.6);
    }
  } else if (variant === 1) {
    // Perspective grid horizon.
    ctx.strokeStyle = set.accent;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1.5;
    const horizon = h * 0.62;
    for (let line = 0; line < 5; line += 1) {
      const y = horizon + (line * line + 1) * 2.6;
      ctx.beginPath();
      ctx.moveTo(w * 0.55, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (let ray = -3; ray <= 3; ray += 1) {
      ctx.beginPath();
      ctx.moveTo(w * 0.8 + ray * 6, horizon);
      ctx.lineTo(w * 0.8 + ray * 34, h);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else {
    // Speed stripes.
    ctx.fillStyle = set.accent;
    ctx.globalAlpha = 0.7;
    for (let stripe = 0; stripe < 3; stripe += 1) {
      const x = w - 92 + stripe * 20;
      ctx.beginPath();
      ctx.moveTo(x, h);
      ctx.lineTo(x + 26, inset);
      ctx.lineTo(x + 36, inset);
      ctx.lineTo(x + 10, h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  // Copy: headline shrinks to fit, tagline below.
  const left = inset + 12;
  const maxWidth = w - left - 22;
  let size = 36;
  ctx.textBaseline = "alphabetic";
  do {
    ctx.font = `italic 800 ${size}px "Public Sans", "Segoe UI", Arial, sans-serif`;
    size -= 1;
  } while (ctx.measureText(headline).width > maxWidth && size > 14);
  ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
  ctx.fillText(headline, left + 2, h * 0.56 + 2);
  ctx.fillStyle = set.ink;
  ctx.fillText(headline, left, h * 0.56);

  ctx.font = `600 15px "Public Sans", "Segoe UI", Arial, sans-serif`;
  ctx.fillStyle = set.sub;
  ctx.fillText(tagline, left + 1, h * 0.82, maxWidth);

  // Accent rule above the headline.
  ctx.fillStyle = set.ink;
  ctx.fillRect(left, inset + 9, 34, 4);

  // Lamp hoods along the top edge.
  ctx.fillStyle = "#1c2233";
  for (let lamp = 0; lamp < 3; lamp += 1) {
    ctx.fillRect(w * (0.2 + lamp * 0.3) - 7, 0, 14, 4);
  }

  return canvas;
}

export type SkylineBuilding = {
  /** Position along the wrapped strip, 0..1. */
  u: number;
  width: number;
  /** Height as a share of the layer's tallest building, 0..1. */
  height: number;
  roof: 0 | 1 | 2 | 3;
};

export type SkylineWindow = { building: number; dx: number; rowFromBase: number };

export type SkylineLayer = {
  buildings: SkylineBuilding[];
  /** Lit windows grouped by colour (index into the window palette) and brightness. */
  windows: SkylineWindow[][];
  windowW: number;
  windowH: number;
  pitchY: number;
  parallax: number;
  baseOffset: number;
  heightScale: number;
};

/** Tallest skyline building at full skyline strength, in px at a 720 px tall screen. */
export const SKYLINE_MAX_PX = 200;

export const WINDOW_COLORS = ["#ffd27a", "#9de5ff", "#ffe8b8", "#ff9fd0"];
export const WINDOW_ALPHAS = [0.85, 0.45];

function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/**
 * Three skyline layers (far, mid, near) with varied widths, heights and roofs,
 * and a fixed set of lit windows per building, so the city does not flicker.
 */
export function buildSkylineLayers(screenW: number, screenH: number): SkylineLayer[] {
  const scale = screenH / 720;
  const specs = [
    { count: 24, wMin: 22, wMax: 48, hMin: 0.3, hMax: 0.62, density: 0.05, win: [2, 2, 6], parallax: 0.25, base: 10, hs: 0.8, seed: 11 },
    { count: 17, wMin: 30, wMax: 62, hMin: 0.35, hMax: 0.85, density: 0.1, win: [3, 3, 8], parallax: 0.5, base: 14, hs: 0.95, seed: 37 },
    { count: 11, wMin: 42, wMax: 84, hMin: 0.4, hMax: 1, density: 0.16, win: [4, 5, 11], parallax: 0.9, base: 18, hs: 1, seed: 71 },
  ];

  return specs.map((spec) => {
    const rand = seeded(spec.seed * 7919 + Math.round(screenW));
    const buildings: SkylineBuilding[] = [];
    const windows: SkylineWindow[][] = WINDOW_COLORS.flatMap(() => WINDOW_ALPHAS.map(() => [] as SkylineWindow[]));
    const [winW, winH, pitch] = spec.win.map((value) => Math.max(1, Math.round(value * scale)));
    // Rows only up to the tallest this layer can get (see SKYLINE_MAX_PX in the renderer).
    const maxRows = Math.ceil((SKYLINE_MAX_PX * scale * spec.hMax * spec.hs) / pitch);

    for (let index = 0; index < spec.count; index += 1) {
      const width = Math.round((spec.wMin + rand() * (spec.wMax - spec.wMin)) * scale);
      const height = spec.hMin + rand() * (spec.hMax - spec.hMin);
      const roof = Math.floor(rand() * 4) as SkylineBuilding["roof"];
      const u = (index + rand() * 0.6) / spec.count;
      buildings.push({ u, width, height, roof });

      // Windows: a column grid, with whole floors and columns sometimes dark.
      const cols = Math.max(1, Math.floor((width - winW * 2) / (winW * 2)));
      const floorBias = rand();
      for (let row = 1; row < maxRows; row += 1) {
        const floorLit = rand() < 0.75 + floorBias * 0.2;
        for (let col = 0; col < cols; col += 1) {
          if (!floorLit || rand() > spec.density * 2.2) {
            continue;
          }
          const colour = rand() < 0.55 ? 0 : Math.floor(rand() * WINDOW_COLORS.length);
          const bright = rand() < 0.6 ? 0 : 1;
          windows[colour * WINDOW_ALPHAS.length + bright].push({
            building: index,
            dx: winW + col * winW * 2,
            rowFromBase: row,
          });
        }
      }
    }

    return {
      buildings,
      windows,
      windowW: winW,
      windowH: winH,
      pitchY: pitch,
      parallax: spec.parallax,
      baseOffset: spec.base * scale,
      heightScale: spec.hs,
    };
  });
}
