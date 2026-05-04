import type { RouteTreeDefinition } from "../game/types";

export const PRIMARY_ROUTE_TREE: RouteTreeDefinition = {
  id: "azure-coast-run",
  title: "Azure Coast Run",
  strapline: "Coast road to skyline stage",
  story:
    "Carry the Mirador Skyline festival master tape from the coast road to the city before the last gate closes.",
  totalDistance: 9200,
  branchDistance: 5050,
  branchHintDistance: 800,
  checkpoints: [
    { distance: 1800, bonus: 14, label: "Azure Coast Gate" },
    { distance: 3600, bonus: 13, label: "Causeway Midpoint" },
    { distance: 5600, bonus: 12, label: "Split Recovery Gate" },
    { distance: 7600, bonus: 11, label: "Skyline Entry Gate" },
  ],
  branches: [
    {
      id: "harbor",
      name: "Harbor Slip",
      strapline: "Low road, dock lights, tighter rhythm",
      description:
        "The scenic lower line. It ducks toward cranes, ferry lights, and denser traffic pockets before the skyline opens up.",
      risk: "Higher weave density, slightly calmer curves.",
      accent: "#79f0ff",
      scenicMomentTitle: "Dock light glide",
      scenicMomentSubtitle: "Low road postcard under cranes and stacked brake lights.",
    },
    {
      id: "neon",
      name: "Neon Express",
      strapline: "High road, open throttle, city glow",
      description:
        "The glamorous fast route. Broader sweepers, heavier speed, and a cleaner charge into the financial district.",
      risk: "Faster flow, wider curves, larger collision penalties at speed.",
      accent: "#ff70b3",
      scenicMomentTitle: "Skyline ribbon road",
      scenicMomentSubtitle: "High road postcard with billboards, glass, and blue neon haze.",
    },
  ],
  stageOrder: [
    { stageId: "azure-coast", branch: "all" },
    { stageId: "mirage-causeway", branch: "all" },
    { stageId: "harbor-slip", branch: "harbor" },
    { stageId: "neon-express", branch: "neon" },
    { stageId: "skyline-finish", branch: "all" },
  ],
  storyBeatIds: [
    "dispatch-intro",
    "cassette-reminder",
    "rival-checkin",
    "route-split-warning",
    "harbor-scenic",
    "rival-harbor",
    "neon-scenic",
    "rival-neon",
    "final-approach",
  ],
  presentation: {
    accent: "#ffd46d",
    titleEyebrow: "Festival drop",
    titleBody:
      "Azure Coast Run should feel like the expensive postcard version of the city delivery fantasy: warm coast start, clean split, and a glamorous arrival under the Mirador lights.",
    routeCardTitle: "Golden coast into city glass",
    routeCardBody:
      "This board sells the original Redline fantasy in one pass: palms and sea glare first, then a choice between dock rhythm and neon altitude before Mirador opens ahead.",
    soundscapeTitle: "Warm wind, brake-light hiss, skyline bloom",
    soundscapeBody:
      "The road mood here is seaside wash into sodium lamps and finally mirrored glass. It should feel like the soundtrack is chasing the horizon with you, not sitting underneath it.",
    destinationMood: "Premium festival arrival",
    destinationGlow:
      "Even before the finish, Azure Coast Run should read as a glossy city-night promise with enough warmth to keep the whole sprint romantic rather than severe.",
  },
  endings: {
    harbor: {
      destination: "Mirador Harbor Promenade",
      title: "Harbor arrival",
      subtitle: "You slipped under the cranes, held the dock rhythm, and delivered the tape with the skyline rising above the water.",
      postcard:
        "Mirador Harbor Promenade feels intimate and cinematic: ferry lights below, skyline above, festival glow waiting at the edge of the docks.",
      arrivalTitle: "Festival barges answer the dock line",
      arrivalSubtitle:
        "The last gate opens over the harbor road and the skyline stage answers with reflections off the water, crane lights, and a crowd already leaning over the railings.",
      festivalCue:
        "The promenade crowd sees the tape van arrive first, then your taillights. The whole low road feels like it paid off at once.",
      soundtrackCue:
        "The selected music pack lands warm and close here, like the final bars are echoing between warehouses and the festival deck.",
    },
    neon: {
      destination: "Mirador Skyline Deck",
      title: "Express arrival",
      subtitle: "You took the elevated line, kept the speed honest, and delivered the tape straight into the city lights.",
      postcard:
        "Mirador Skyline Deck lands like a premium postcard: glass towers, cold neon, and the stage district opening under the expressway.",
      arrivalTitle: "Skyline lights open like a stage reveal",
      arrivalSubtitle:
        "The express spills you straight into the festival district: mirrored towers, overpass glow, and a clean final sightline to the Mirador deck.",
      festivalCue:
        "This payoff feels widescreen and expensive. The city does not just receive the tape; it seems to flare on in response.",
      soundtrackCue:
        "The chosen music pack hits hardest here, where the last melody feels like it is syncing to signs, glass, and the final tower reflections.",
    },
  },
};

export const AFTERGLOW_ROUTE_TREE: RouteTreeDefinition = {
  id: "afterglow-heights-run",
  title: "Afterglow Heights Run",
  strapline: "Coast transfer to the hilltop afterparty",
  story:
    "The main stage is already breathing. Now the afterparty cassette has to clear the coast, pick a district line, and make Lumen Heights before the last observatory lights fade.",
  totalDistance: 9200,
  branchDistance: 5050,
  branchHintDistance: 800,
  checkpoints: [
    { distance: 1800, bonus: 14, label: "Azure Relay Gate" },
    { distance: 3600, bonus: 13, label: "Causeway Crown" },
    { distance: 5600, bonus: 12, label: "District Transfer Gate" },
    { distance: 7600, bonus: 11, label: "Heights Ascent Gate" },
  ],
  branches: [
    {
      id: "harbor",
      name: "Marina Underpass",
      strapline: "Low line, ferries, amber service road",
      description:
        "The lower afterparty line. It cuts through the marina service lanes, ferry glare, and amber gantries before the climb toward Lumen Heights.",
      risk: "Tighter packs, calmer arcs, and more tunnel-shadow traffic.",
      accent: "#7de3c8",
      scenicMomentTitle: "Ferry glass run",
      scenicMomentSubtitle: "Marina postcard under ferry windows, sodium rails, and warm harbor reflections.",
    },
    {
      id: "neon",
      name: "Crown Vista",
      strapline: "High line, terrace ramps, electric overlook",
      description:
        "The upper afterparty line. It takes terrace ramps, rooftop edges, and a colder climb into the hilltop district.",
      risk: "Cleaner flow, faster descents, and harsher punishment near the walls.",
      accent: "#ffd27b",
      scenicMomentTitle: "Terrace light climb",
      scenicMomentSubtitle: "High road postcard with balcony lights, hillside glass, and the observatory ring glowing ahead.",
    },
  ],
  stageOrder: [
    { stageId: "azure-coast", branch: "all" },
    { stageId: "mirage-causeway", branch: "all" },
    { stageId: "marina-underpass", branch: "harbor" },
    { stageId: "crown-vista", branch: "neon" },
    { stageId: "afterglow-heights", branch: "all" },
  ],
  storyBeatIds: [
    "afterglow-dispatch",
    "afterglow-dj",
    "afterglow-rival",
    "afterglow-split-warning",
    "afterglow-marina-scenic",
    "afterglow-marina-rival",
    "afterglow-crown-scenic",
    "afterglow-crown-rival",
    "afterglow-final-approach",
  ],
  presentation: {
    accent: "#ffd08b",
    titleEyebrow: "Afterparty relay",
    titleBody:
      "Afterglow Heights Run should feel more intimate and elevated than the main festival board: terrace ramps, ferry spillover, observatory light, and a city already glowing below the finish.",
    routeCardTitle: "Hilltop afterglow over the sleeping city",
    routeCardBody:
      "This board is about the second reveal. The coast and causeway return, but the payoff climbs into balconies, hill roads, and the sense that the city is now scenery beneath you.",
    soundscapeTitle: "Ferry wash, terrace echo, observatory shimmer",
    soundscapeBody:
      "The soundstage here should feel closer and more nocturnal: tunnel wash on the lower line, terrace air on the upper line, then a softer, more elevated arrival than Mirador's main-stage charge.",
    destinationMood: "Hilltop afterparty reveal",
    destinationGlow:
      "Afterglow Heights should feel like the city's private encore: fewer crowds in frame, more balcony light, and a finish that lands as a late-night invitation instead of a headline spectacle.",
  },
  setpieces: [
    {
      id: "ferry-underpass-bottleneck",
      distance: 7420,
      branch: "harbor",
      speaker: "Dispatch",
      tone: "radio",
      title: "Ferry spillover ahead",
      subtitle:
        "Service-road traffic is unloading across the marina tunnel. Read the gaps early and keep the cassette away from the barriers.",
      trafficPattern: [
        { lane: 0, z: 0.84, speedFactor: 0.82, color: "#ffc27f", widthScale: 1.02 },
        { lane: 0.72, z: 0.64, speedFactor: 0.86, color: "#7fe3ef", widthScale: 0.96 },
        { lane: -0.72, z: 0.46, speedFactor: 0.9, color: "#ff9d74", widthScale: 0.98 },
      ],
    },
    {
      id: "sera-observatory-squeeze",
      distance: 7480,
      branch: "neon",
      speaker: "Rival / Sera",
      tone: "rival",
      title: "Sera closes the overlook",
      subtitle:
        "Terrace traffic stacks across the ramp. Split the lane clean, keep the cassette alive, and do not brush the wall.",
      trafficPattern: [
        { lane: 0.72, z: 0.86, speedFactor: 0.84, color: "#ff8f74", widthScale: 0.94 },
        { lane: -0.72, z: 0.66, speedFactor: 0.88, color: "#ffd27b", widthScale: 0.98 },
        { lane: 0, z: 0.5, speedFactor: 0.92, color: "#7fe8ff", widthScale: 1.02 },
        { lane: 0.72, z: 0.34, speedFactor: 0.86, color: "#ff9dc7", widthScale: 0.96 },
      ],
    },
  ],
  endings: {
    harbor: {
      destination: "Lumen Heights Marina Terrace",
      title: "Marina terrace arrival",
      subtitle:
        "You held the lower line through the ferries and amber gantries, then climbed into the afterparty lights with the cassette still warm.",
      postcard:
        "Lumen Heights Marina Terrace feels intimate and expensive in a different way: ferry decks below, hillside lights above, and an afterparty that sounds close before you can see it.",
      arrivalTitle: "The terrace opens above the ferry lane",
      arrivalSubtitle:
        "The last climb clears the marina and the afterparty unfolds in warm tiers of balcony light, rail reflections, and a crowd already turned toward the overlook.",
      festivalCue:
        "This payoff feels social and close-up. The cassette reaches the terrace and the whole lower route suddenly reads like a deliberate warm-up set.",
      soundtrackCue:
        "The chosen music pack lands with a softer afterglow here, as if the final bars are climbing the hillside with you.",
    },
    neon: {
      destination: "Lumen Heights Observatory Ring",
      title: "Observatory arrival",
      subtitle:
        "You took the upper terraces, kept the pace clean, and delivered the afterparty cassette straight into the observatory glow.",
      postcard:
        "Lumen Heights Observatory Ring lands as a hilltop postcard: terrace glass, amber beacons, and the city stretched below the overlook.",
      arrivalTitle: "The hilltop opens into an afterparty crown",
      arrivalSubtitle:
        "The terrace ramps spill into a circular overlook where the observatory lights, rooftop glass, and city afterglow feel like the whole climb was staged for this reveal.",
      festivalCue:
        "This payoff feels elevated and ceremonial. The city sits below you while the afterparty ring takes the cassette and turns the whole climb into a finish line.",
      soundtrackCue:
        "The chosen music pack lands crisp and panoramic here, as if the last melody is stretching across the whole skyline at once.",
    },
  },
};
