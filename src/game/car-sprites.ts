/**
 * Rear-view car sprites, baked from the Kenney Car Kit (CC0) 3D models.
 *
 * There is no free 2D pack of rear-view cars, so these were rendered offline
 * in three.js: camera behind the car, key/fill/rim lighting, transparent
 * background, cropped to the alpha bounds. `body` is the dominant paint colour
 * of each render, which is how a traffic car's tint picks its sprite.
 *
 * Images load asynchronously and every lookup returns null until ready, so the
 * renderer keeps its original vector drawing until the art is available.
 */

export interface CarSprite {
  name: string;
  body: string;
  /** width / height of the baked image, used to keep the road-space aspect. */
  aspect: number;
  image: HTMLImageElement;
}

interface SpriteSpec {
  name: string;
  body: string;
  aspect: number;
}

/** Traffic vehicles, with the body colour measured at bake time. */
const TRAFFIC_SPECS: SpriteSpec[] = [
  { name: "sedan", body: "#db5836", aspect: 1.086 },
  { name: "sedan-sports", body: "#e8785a", aspect: 1.281 },
  { name: "hatchback-sports", body: "#298956", aspect: 1.274 },
  { name: "suv", body: "#248654", aspect: 1.068 },
  { name: "suv-luxury", body: "#d49436", aspect: 1.048 },
  { name: "van", body: "#434a94", aspect: 1.036 },
  { name: "truck", body: "#379865", aspect: 1.094 },
  { name: "taxi", body: "#dda84a", aspect: 0.936 },
  { name: "police", body: "#c42722", aspect: 1.089 },
  { name: "race-future", body: "#434695", aspect: 1.51 },
  { name: "delivery", body: "#489c62", aspect: 0.906 },
  { name: "ambulance", body: "#ca452a", aspect: 0.804 },
  { name: "firetruck", body: "#bd392b", aspect: 0.995 },
  { name: "garbage-truck", body: "#06764b", aspect: 0.991 },
];

/** The player's hero car - low and wide, which reads best from behind. */
const PLAYER_SPEC: SpriteSpec = { name: "race", body: "#ec8976", aspect: 1.853 };

const loaded = new Map<string, CarSprite>();
let started = false;
let ready = false;

export function areCarSpritesReady(): boolean {
  return ready;
}

/** Kicks off loading once; safe to call from the render loop. */
export function loadCarSprites(): void {
  if (started || typeof Image === "undefined") return;
  started = true;

  const specs = [...TRAFFIC_SPECS, PLAYER_SPEC];
  let remaining = specs.length;

  specs.forEach((spec) => {
    const image = new Image();
    image.onload = () => {
      loaded.set(spec.name, { ...spec, image });
      remaining -= 1;
      if (remaining === 0) ready = loaded.size > 0;
    };
    image.onerror = () => {
      remaining -= 1;
      if (remaining === 0) ready = loaded.size > 0;
    };
    image.src = new URL(`assets/sprites/${spec.name}.png`, document.baseURI).href;
  });
}

export function getPlayerSprite(): CarSprite | null {
  if (!ready) return null;
  return loaded.get(PLAYER_SPEC.name) ?? null;
}

function parseHex(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  const full = value.length === 3
    ? value.split("").map((c) => c + c).join("")
    : value;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/**
 * Picks the traffic sprite whose paint is closest to the car's colour, so each
 * car keeps the identity the simulation gave it. Falls back to a stable
 * per-colour choice if the colour cannot be parsed.
 */
export function pickTrafficSprite(color: string): CarSprite | null {
  if (!ready) return null;

  let target: [number, number, number];
  try {
    target = parseHex(color);
    if (target.some((c) => Number.isNaN(c))) throw new Error("unparsed");
  } catch {
    const index = color.length % TRAFFIC_SPECS.length;
    return loaded.get(TRAFFIC_SPECS[index].name) ?? null;
  }

  let best: CarSprite | null = null;
  let bestDistance = Infinity;
  for (const spec of TRAFFIC_SPECS) {
    const sprite = loaded.get(spec.name);
    if (!sprite) continue;
    const [r, g, b] = parseHex(spec.body);
    const distance = (r - target[0]) ** 2 + (g - target[1]) ** 2 + (b - target[2]) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = sprite;
    }
  }
  return best;
}
