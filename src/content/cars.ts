import type { CarDefinition } from "../game/types";

export const CAR_MANIFEST: CarDefinition[] = [
  {
    id: "solstice-gt",
    name: "Solstice GT",
    tagline: "Balanced sunset cruiser",
    accent: "#ffd36d",
    bodyColor: "#f7d966",
    stripeColor: "#13213b",
    portraitTitle: "Festival poster favorite",
    portraitGradient: ["#ffcc74", "#ff7f74"],
    description:
      "The studio poster car: stable on sweepers, forgiving in traffic, and fast enough to feel expensive.",
    flavorText:
      "Chosen by drivers who want the postcard route to still feel heroic when the timer tightens.",
    topSpeed: 234,
    acceleration: 0.8,
    grip: 0.92,
    boost: 0.84,
    draftGain: 1,
    collisionPenalty: 1,
    unlockRule: {
      type: "default",
      label: "Available from the first run.",
    },
  },
  {
    id: "monarch-xr",
    name: "Monarch XR",
    tagline: "Long-legged night machine",
    accent: "#7ce6ff",
    bodyColor: "#62d6ff",
    stripeColor: "#0b1428",
    portraitTitle: "Financial-district missile",
    portraitGradient: ["#74d7ff", "#466eff"],
    description:
      "The fastest car in the line-up. It carries speed brilliantly but asks for cleaner inputs once the road tightens.",
    flavorText:
      "Best when you trust the elevated line and keep the wheel calm through the late skyline sweepers.",
    topSpeed: 248,
    acceleration: 0.74,
    grip: 0.84,
    boost: 0.92,
    draftGain: 1.08,
    collisionPenalty: 1.18,
    unlockRule: {
      type: "medal",
      value: "Silver",
      label: "Intended early unlock after proving a silver-pace run.",
    },
  },
  {
    id: "aero-vista",
    name: "Aero Vista",
    tagline: "Agile route-split specialist",
    accent: "#ff8bb8",
    bodyColor: "#ff6ea9",
    stripeColor: "#1d1730",
    portraitTitle: "Late-braking harbor knife",
    portraitGradient: ["#ff6ea9", "#ffaf6a"],
    description:
      "Sharper turn-in and easy recovery make this the safest pick if you want to flirt with near misses and late route choices.",
    flavorText:
      "Feels lighter on its feet, happiest when the run asks for decisions more than raw velocity.",
    topSpeed: 228,
    acceleration: 0.88,
    grip: 1,
    boost: 0.78,
    draftGain: 0.96,
    collisionPenalty: 0.92,
    unlockRule: {
      type: "default",
      label: "Available from the first run.",
    },
  },
];
