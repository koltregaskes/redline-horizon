import { clamp } from "./config";
import type {
  RenderSnapshot,
  SceneryMode,
  ThemePalette,
} from "./types";

type Geometry = {
  y: number;
  center: number;
  roadHalf: number;
};

export class RoadRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private width = 1280;
  private height = 720;
  private grainPattern: Array<{ x: number; y: number; w: number; h: number; alpha: number }> = [];

  constructor(canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas 2D context is required.");
    }

    this.canvas = canvas;
    this.ctx = context;
  }

  resize(width: number, height: number, dpr: number) {
    this.width = Math.max(320, Math.round(width));
    this.height = Math.max(240, Math.round(height));
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.rebuildGrainPattern();
  }

  render(snapshot: RenderSnapshot) {
    const palette = this.mixPalette(snapshot);
    const horizonY = this.height * (0.335 + snapshot.segment.horizonLift);

    this.ctx.save();
    if (snapshot.cameraShake > 0.02) {
      const offset = snapshot.cameraShake * 8;
      const shakeX = Math.sin(snapshot.distance * 0.071 + snapshot.lateral * 8.3) * offset * 0.5;
      const shakeY = Math.cos(snapshot.distance * 0.063 + snapshot.roadCurve * 6.1) * offset * 0.5;
      this.ctx.translate(shakeX, shakeY);
    }

    this.drawSky(palette, horizonY);
    this.drawBackdrop(snapshot, palette, horizonY);
    this.drawRoad(snapshot, palette, horizonY);
    this.drawRoadside(snapshot, palette, horizonY);
    this.drawBillboards(snapshot, palette, horizonY);
    this.drawMarkers(snapshot, palette, horizonY);
    this.drawTraffic(snapshot, palette, horizonY);
    this.drawPlayer(snapshot, palette);
    this.drawWeather(snapshot, palette, horizonY);

    if (snapshot.filmGrainEnabled) {
      this.drawFilmGrain();
    }

    this.ctx.restore();
  }

  private drawSky(palette: ThemePalette, horizonY: number) {
    const sky = this.ctx.createLinearGradient(0, 0, 0, horizonY + this.height * 0.18);
    sky.addColorStop(0, palette.skyTop);
    sky.addColorStop(0.45, palette.skyMid);
    sky.addColorStop(1, palette.skyBottom);
    this.ctx.fillStyle = sky;
    this.ctx.fillRect(0, 0, this.width, this.height);

    const sunX = this.width * 0.72;
    const sunY = horizonY * 0.52;
    const glow = this.ctx.createRadialGradient(sunX, sunY, 18, sunX, sunY, 120);
    glow.addColorStop(0, this.withAlpha(palette.sun, 0.95));
    glow.addColorStop(0.5, this.withAlpha(palette.glow, 0.45));
    glow.addColorStop(1, this.withAlpha(palette.glow, 0));
    this.ctx.fillStyle = glow;
    this.ctx.fillRect(sunX - 140, sunY - 140, 280, 280);

    this.ctx.fillStyle = palette.sun;
    this.ctx.beginPath();
    this.ctx.arc(sunX, sunY, this.height * 0.06, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawBackdrop(snapshot: RenderSnapshot, palette: ThemePalette, horizonY: number) {
    this.ctx.fillStyle = palette.farSilhouette;
    this.ctx.beginPath();
    this.ctx.moveTo(0, horizonY);
    for (let index = 0; index <= 8; index += 1) {
      const x = (this.width / 8) * index;
      const wave =
        Math.sin(index * 0.9 + snapshot.distance * 0.00018) * 24 +
        Math.cos(index * 1.1 + snapshot.distance * 0.00012) * 18;
      const y = horizonY - 36 - wave - snapshot.segment.skyline * 24;
      this.ctx.lineTo(x, y);
    }
    this.ctx.lineTo(this.width, this.height);
    this.ctx.lineTo(0, this.height);
    this.ctx.closePath();
    this.ctx.fill();

    if (snapshot.segment.scenery !== "neon") {
      this.ctx.fillStyle = palette.sea;
      this.ctx.fillRect(0, horizonY + 8, this.width, this.height * 0.22);
    }

    this.ctx.fillStyle = palette.nearSilhouette;
    this.ctx.beginPath();
    this.ctx.moveTo(0, horizonY + 20);
    for (let index = 0; index <= 12; index += 1) {
      const x = (this.width / 12) * index;
      const wave =
        Math.sin(index * 0.8 + snapshot.distance * 0.00024) * 12 +
        Math.cos(index * 1.5 + snapshot.distance * 0.00018) * 10;
      const y = horizonY + 30 - wave;
      this.ctx.lineTo(x, y);
    }
    this.ctx.lineTo(this.width, this.height);
    this.ctx.lineTo(0, this.height);
    this.ctx.closePath();
    this.ctx.fill();

    this.drawSkyline(snapshot, palette, horizonY);

    this.ctx.fillStyle = this.withAlpha(palette.fog, 0.22 + snapshot.segment.nightLevel * 0.18);
    this.ctx.fillRect(0, horizonY - 18, this.width, this.height - horizonY + 18);
  }

  private drawSkyline(snapshot: RenderSnapshot, palette: ThemePalette, horizonY: number) {
    const skylineStrength = clamp(snapshot.segment.skyline, 0, 1);
    if (skylineStrength < 0.2) {
      return;
    }

    const buildingCount = 10 + Math.round(skylineStrength * 10);
    for (let index = 0; index < buildingCount; index += 1) {
      const width = 28 + (index % 4) * 14 + skylineStrength * 18;
      const height = 40 + (index % 5) * 24 + skylineStrength * 90;
      const x = (index / buildingCount) * this.width + (index % 3) * 18;
      const y = horizonY + 16 - height;
      this.ctx.fillStyle = this.withAlpha(palette.nearSilhouette, 0.9);
      this.ctx.fillRect(x, y, width, height);

      if (skylineStrength > 0.36) {
        this.ctx.fillStyle = this.withAlpha(palette.cityLight, 0.75);
        for (let row = 0; row < 6; row += 1) {
          const windowY = y + 8 + row * 12;
          this.ctx.fillRect(x + 6, windowY, 4, 5);
          this.ctx.fillRect(x + width - 10, windowY + 2, 3, 4);
        }
      }
    }
  }

  private drawRoad(snapshot: RenderSnapshot, palette: ThemePalette, horizonY: number) {
    const slices = 34;
    const stripePhase = Math.floor(snapshot.distance / 42) % 2;

    for (let slice = slices; slice >= 1; slice -= 1) {
      const nearDepth = slice / slices;
      const farDepth = (slice - 1) / slices;
      const near = this.getRoadGeometry(nearDepth, snapshot.roadCurve, snapshot.lateral, horizonY);
      const far = this.getRoadGeometry(farDepth, snapshot.roadCurve, snapshot.lateral, horizonY);

      this.drawQuad(
        far.center - far.roadHalf - 120 * farDepth,
        far.y,
        far.center - far.roadHalf,
        far.y,
        near.center - near.roadHalf,
        near.y,
        near.center - near.roadHalf - 180 * nearDepth,
        near.y,
        palette.shoulder,
      );

      this.drawQuad(
        far.center + far.roadHalf,
        far.y,
        far.center + far.roadHalf + 120 * farDepth,
        far.y,
        near.center + near.roadHalf + 180 * nearDepth,
        near.y,
        near.center + near.roadHalf,
        near.y,
        palette.shoulder,
      );

      this.drawQuad(
        far.center - far.roadHalf,
        far.y,
        far.center + far.roadHalf,
        far.y,
        near.center + near.roadHalf,
        near.y,
        near.center - near.roadHalf,
        near.y,
        palette.road,
      );

      const curbColor = slice % 2 === 0 ? palette.curbA : palette.curbB;
      this.drawQuad(
        far.center - far.roadHalf - 14,
        far.y,
        far.center - far.roadHalf,
        far.y,
        near.center - near.roadHalf,
        near.y,
        near.center - near.roadHalf - 18,
        near.y,
        curbColor,
      );
      this.drawQuad(
        far.center + far.roadHalf,
        far.y,
        far.center + far.roadHalf + 14,
        far.y,
        near.center + near.roadHalf + 18,
        near.y,
        near.center + near.roadHalf,
        near.y,
        curbColor,
      );

      if ((slice + stripePhase) % 2 === 0) {
        this.drawLaneStripe(far, near, 1 / 3, palette.lane);
        this.drawLaneStripe(far, near, 2 / 3, palette.lane);
      }
    }
  }

  private drawRoadside(snapshot: RenderSnapshot, palette: ThemePalette, horizonY: number) {
    const scenery = snapshot.transition < 0.55 ? snapshot.segment.scenery : snapshot.nextSegment.scenery;

    for (let index = 0; index < 15; index += 1) {
      const depth = (index + (snapshot.distance * 0.02 % 1)) / 15;
      const geometry = this.getRoadGeometry(depth, snapshot.roadCurve, snapshot.lateral, horizonY);
      const shoulder = geometry.roadHalf + 40 + depth * 110;
      const leftX = geometry.center - shoulder;
      const rightX = geometry.center + shoulder;
      this.drawRoadsideObject(scenery, leftX, geometry.y, depth, false, palette);
      this.drawRoadsideObject(scenery, rightX, geometry.y, depth, true, palette);
    }
  }

  private drawBillboards(snapshot: RenderSnapshot, palette: ThemePalette, horizonY: number) {
    for (let index = 0; index < 8; index += 1) {
      const depth = (index + (snapshot.distance * 0.01 % 1)) / 8;
      const geometry = this.getRoadGeometry(depth, snapshot.roadCurve, snapshot.lateral, horizonY);
      const signWidth = 30 + depth * 68;
      const signHeight = 18 + depth * 38;
      const leftX = geometry.center - geometry.roadHalf - (36 + depth * 90);
      const rightX = geometry.center + geometry.roadHalf + (36 + depth * 90);
      this.drawBillboardPanel(snapshot.segment.billboardSet, leftX, geometry.y, signWidth, signHeight, false, palette);
      this.drawBillboardPanel(snapshot.segment.billboardSet, rightX, geometry.y, signWidth, signHeight, true, palette);
    }
  }

  private drawRoadsideObject(
    scenery: SceneryMode,
    x: number,
    y: number,
    depth: number,
    rightSide: boolean,
    palette: ThemePalette,
  ) {
    const scale = 0.45 + depth * 1.4;

    if (scenery === "palms") {
      this.ctx.fillStyle = "#6d4b2d";
      this.ctx.fillRect(x - 3 * scale, y - 42 * scale, 6 * scale, 42 * scale);
      this.ctx.fillStyle = rightSide ? palette.roadsidePrimary : palette.roadsideSecondary;
      this.ctx.beginPath();
      this.ctx.moveTo(x, y - 52 * scale);
      this.ctx.lineTo(x - 24 * scale, y - 28 * scale);
      this.ctx.lineTo(x + 20 * scale, y - 24 * scale);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.beginPath();
      this.ctx.moveTo(x, y - 52 * scale);
      this.ctx.lineTo(x - 18 * scale, y - 46 * scale);
      this.ctx.lineTo(x + 18 * scale, y - 18 * scale);
      this.ctx.closePath();
      this.ctx.fill();
      return;
    }

    if (scenery === "causeway") {
      this.ctx.fillStyle = palette.roadsideSecondary;
      this.ctx.fillRect(x - 2 * scale, y - 52 * scale, 4 * scale, 52 * scale);
      this.ctx.fillStyle = palette.roadsidePrimary;
      this.ctx.beginPath();
      this.ctx.arc(x, y - 54 * scale, 8 * scale, 0, Math.PI * 2);
      this.ctx.fill();
      return;
    }

    if (scenery === "harbor") {
      this.ctx.fillStyle = this.withAlpha(palette.roadsideSecondary, 0.85);
      this.ctx.fillRect(x - 18 * scale, y - 20 * scale, 36 * scale, 20 * scale);
      this.ctx.fillStyle = palette.roadsidePrimary;
      this.ctx.fillRect(x - 14 * scale, y - 42 * scale, 7 * scale, 22 * scale);
      this.ctx.fillRect(x + 8 * scale, y - 56 * scale, 6 * scale, 36 * scale);
      this.ctx.strokeStyle = palette.roadsidePrimary;
      this.ctx.lineWidth = Math.max(1, scale * 1.8);
      this.ctx.beginPath();
      this.ctx.moveTo(x - 8 * scale, y - 38 * scale);
      this.ctx.lineTo(x + 18 * scale, y - 60 * scale);
      this.ctx.stroke();
      return;
    }

    this.ctx.fillStyle = this.withAlpha(palette.nearSilhouette, 0.92);
    this.ctx.fillRect(x - 16 * scale, y - 46 * scale, 32 * scale, 46 * scale);
    this.ctx.fillStyle = palette.roadsidePrimary;
    this.ctx.fillRect(x - 20 * scale, y - 28 * scale, 40 * scale, 10 * scale);
    this.ctx.fillStyle = this.withAlpha(palette.roadsideSecondary, 0.92);
    this.ctx.fillRect(x - 10 * scale, y - 18 * scale, 20 * scale, 4 * scale);
  }

  private drawBillboardPanel(
    billboardSet: string,
    x: number,
    y: number,
    width: number,
    height: number,
    rightSide: boolean,
    palette: ThemePalette,
  ) {
    const postHeight = height * 1.8;
    const anchorX = rightSide ? x : x - width;
    this.ctx.fillStyle = this.withAlpha(palette.nearSilhouette, 0.85);
    this.ctx.fillRect(anchorX + width * 0.45, y - postHeight, width * 0.1, postHeight);

    const primary =
      billboardSet === "luxury-neon"
        ? "#8ddfff"
        : billboardSet === "festival-posters"
          ? "#ffd66d"
          : billboardSet === "port-logistics"
            ? "#7fe3ef"
            : palette.roadsidePrimary;
    const secondary =
      billboardSet === "luxury-neon"
        ? "#ff83d2"
        : billboardSet === "festival-posters"
          ? "#ff7c8f"
          : billboardSet === "port-logistics"
            ? "#ffb45f"
            : palette.roadsideSecondary;

    this.ctx.fillStyle = this.withAlpha(primary, 0.9);
    this.ctx.fillRect(anchorX, y - postHeight - height, width, height);
    this.ctx.fillStyle = this.withAlpha(secondary, 0.9);
    this.ctx.fillRect(anchorX + width * 0.08, y - postHeight - height * 0.78, width * 0.84, height * 0.2);
    this.ctx.fillStyle = "#09101d";
    this.ctx.fillRect(anchorX + width * 0.08, y - postHeight - height * 0.44, width * 0.54, height * 0.16);
    this.ctx.fillRect(anchorX + width * 0.08, y - postHeight - height * 0.18, width * 0.72, height * 0.12);
  }

  private drawMarkers(snapshot: RenderSnapshot, palette: ThemePalette, horizonY: number) {
    for (const marker of snapshot.markers) {
      if (marker.distance < 0 || marker.distance > 1500) {
        continue;
      }

      const depth = clamp(1 - marker.distance / 1500, 0.05, 0.84);
      const geometry = this.getRoadGeometry(depth, snapshot.roadCurve, snapshot.lateral, horizonY);
      const poleHeight = 54 + depth * 110;
      const color =
        marker.type === "checkpoint"
          ? palette.sun
          : marker.type === "branch"
            ? palette.roadsidePrimary
            : palette.roadsideSecondary;
      const barWidth = geometry.roadHalf * 1.68;
      const barY = geometry.y - poleHeight;

      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 4 + depth * 6;
      this.ctx.beginPath();
      this.ctx.moveTo(geometry.center - geometry.roadHalf * 1.05, geometry.y);
      this.ctx.lineTo(geometry.center - geometry.roadHalf * 1.05, barY);
      this.ctx.lineTo(geometry.center + geometry.roadHalf * 1.05, barY);
      this.ctx.lineTo(geometry.center + geometry.roadHalf * 1.05, geometry.y);
      this.ctx.stroke();

      this.ctx.fillStyle = this.withAlpha(color, 0.22);
      this.ctx.fillRect(
        geometry.center - barWidth / 2,
        barY - 12 - depth * 18,
        barWidth,
        24 + depth * 16,
      );
    }
  }

  private drawTraffic(snapshot: RenderSnapshot, palette: ThemePalette, horizonY: number) {
    const sorted = [...snapshot.traffic].sort((left, right) => right.z - left.z);
    for (const car of sorted) {
      const depth = clamp(1 - car.z, 0.03, 0.98);
      const geometry = this.getRoadGeometry(depth, snapshot.roadCurve, snapshot.lateral, horizonY);
      const laneCenter = geometry.center + car.lane * geometry.roadHalf * 0.68;
      const width = (14 + depth * 76) * car.widthScale;
      const height = 16 + depth * 94;
      const x = laneCenter - width / 2;
      const y = geometry.y - height;

      this.ctx.fillStyle = this.withAlpha(car.color, 0.22);
      this.ctx.fillRect(x, geometry.y - 6, width, 10 + depth * 10);
      this.ctx.fillStyle = car.color;
      this.ctx.fillRect(x, y, width, height);
      this.ctx.fillStyle = "#12192a";
      this.ctx.fillRect(x + width * 0.16, y + height * 0.14, width * 0.68, height * 0.24);
      this.ctx.fillStyle = palette.lane;
      this.ctx.fillRect(x + width * 0.12, y + height * 0.76, width * 0.18, height * 0.08);
      this.ctx.fillRect(x + width * 0.7, y + height * 0.76, width * 0.18, height * 0.08);

      if (car.headlights && snapshot.segment.nightLevel > 0.4) {
        this.ctx.fillStyle = this.withAlpha("#fef6c2", 0.34);
        this.ctx.fillRect(x + width * 0.12, y + height * 0.16, width * 0.14, height * 0.08);
        this.ctx.fillRect(x + width * 0.74, y + height * 0.16, width * 0.14, height * 0.08);
      }
    }
  }

  private drawPlayer(snapshot: RenderSnapshot, palette: ThemePalette) {
    const baseY = this.height - 132;
    const x = this.width / 2 + snapshot.lateral * 210;
    this.ctx.fillStyle = this.withAlpha(snapshot.playerBodyColor, 0.22);
    this.ctx.fillRect(x - 48, baseY + 72, 96, 18);
    this.ctx.fillStyle = snapshot.playerBodyColor;
    this.ctx.beginPath();
    this.ctx.moveTo(x - 56, baseY + 74);
    this.ctx.lineTo(x - 40, baseY);
    this.ctx.lineTo(x + 40, baseY);
    this.ctx.lineTo(x + 56, baseY + 74);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.fillStyle = snapshot.playerStripeColor;
    this.ctx.fillRect(x - 7, baseY + 6, 14, 62);
    this.ctx.fillStyle = "#131b2f";
    this.ctx.fillRect(x - 28, baseY + 16, 56, 20);
    this.ctx.fillStyle = palette.lane;
    this.ctx.fillRect(x - 44, baseY + 58, 16, 8);
    this.ctx.fillRect(x + 28, baseY + 58, 16, 8);
  }

  private drawWeather(snapshot: RenderSnapshot, palette: ThemePalette, horizonY: number) {
    if (snapshot.segment.weatherModifier === "sea-breeze") {
      this.ctx.fillStyle = this.withAlpha("#ffffff", 0.025);
      for (let index = 0; index < 8; index += 1) {
        const offset = (snapshot.distance * 0.12 + index * 80) % (this.width + 120);
        this.ctx.fillRect(offset - 120, horizonY + 10 + index * 14, 90, 2);
      }
      return;
    }

    if (snapshot.segment.weatherModifier === "harbor-haze") {
      this.ctx.fillStyle = this.withAlpha(palette.fog, 0.14);
      this.ctx.fillRect(0, horizonY + 22, this.width, this.height - horizonY);
      return;
    }

    if (snapshot.segment.weatherModifier === "neon-mist") {
      const mist = this.ctx.createLinearGradient(0, horizonY - 18, this.width, this.height);
      mist.addColorStop(0, this.withAlpha("#8ddfff", 0.04));
      mist.addColorStop(0.5, this.withAlpha("#ff83d2", 0.07));
      mist.addColorStop(1, this.withAlpha(palette.fog, 0.14));
      this.ctx.fillStyle = mist;
      this.ctx.fillRect(0, horizonY - 18, this.width, this.height - horizonY + 18);
    }
  }

  private drawFilmGrain() {
    for (const particle of this.grainPattern) {
      this.ctx.fillStyle = `rgba(255,255,255,${particle.alpha})`;
      this.ctx.fillRect(particle.x, particle.y, particle.w, particle.h);
    }

    this.ctx.fillStyle = "rgba(10, 14, 24, 0.09)";
    for (let y = 0; y < this.height; y += 4) {
      this.ctx.fillRect(0, y, this.width, 1);
    }
  }

  private drawLaneStripe(far: Geometry, near: Geometry, laneRatio: number, color: string) {
    const farLeft = far.center - far.roadHalf;
    const nearLeft = near.center - near.roadHalf;
    const farX = farLeft + far.roadHalf * 2 * laneRatio;
    const nearX = nearLeft + near.roadHalf * 2 * laneRatio;
    this.drawQuad(
      farX - 2,
      far.y,
      farX + 2,
      far.y,
      nearX + 6,
      near.y,
      nearX - 6,
      near.y,
      color,
    );
  }

  private getRoadGeometry(
    depth: number,
    roadCurve: number,
    lateral: number,
    horizonY: number,
  ): Geometry {
    const eased = depth * depth;
    const y = horizonY + eased * (this.height - horizonY);
    const roadHalf = 64 + eased * this.width * 0.39;
    const curveShift = roadCurve * (36 + eased * 250);
    const playerShift = lateral * depth * 95;
    const center = this.width / 2 - curveShift - playerShift;
    return { y, center, roadHalf };
  }

  private drawQuad(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    x4: number,
    y4: number,
    fillStyle: string,
  ) {
    this.ctx.fillStyle = fillStyle;
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.lineTo(x3, y3);
    this.ctx.lineTo(x4, y4);
    this.ctx.closePath();
    this.ctx.fill();
  }

  private mixPalette(snapshot: RenderSnapshot): ThemePalette {
    const keys = Object.keys(snapshot.segment.palette) as Array<keyof ThemePalette>;
    const palette = {} as ThemePalette;

    for (const key of keys) {
      palette[key] = this.mixColor(
        snapshot.segment.palette[key],
        snapshot.nextSegment.palette[key],
        snapshot.transition,
      );
    }

    return palette;
  }

  private mixColor(from: string, to: string, amount: number) {
    const fromRgb = this.hexToRgb(from);
    const toRgb = this.hexToRgb(to);
    const mixed = {
      r: Math.round(fromRgb.r + (toRgb.r - fromRgb.r) * amount),
      g: Math.round(fromRgb.g + (toRgb.g - fromRgb.g) * amount),
      b: Math.round(fromRgb.b + (toRgb.b - fromRgb.b) * amount),
    };
    return `rgb(${mixed.r}, ${mixed.g}, ${mixed.b})`;
  }

  private hexToRgb(value: string) {
    const normalized = value.replace("#", "");
    const digits = normalized.length === 3
      ? normalized
          .split("")
          .map((digit) => digit + digit)
          .join("")
      : normalized;

    return {
      r: Number.parseInt(digits.slice(0, 2), 16),
      g: Number.parseInt(digits.slice(2, 4), 16),
      b: Number.parseInt(digits.slice(4, 6), 16),
    };
  }

  private withAlpha(color: string, alpha: number) {
    if (color.startsWith("rgb")) {
      return color.replace("rgb(", "rgba(").replace(")", `, ${alpha})`);
    }

    const rgb = this.hexToRgb(color);
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
  }

  private rebuildGrainPattern() {
    this.grainPattern = Array.from({ length: 80 }, (_, index) => {
      const x = this.seededUnit(index * 4 + 1) * this.width;
      const y = this.seededUnit(index * 4 + 2) * this.height;
      const w = 1 + this.seededUnit(index * 4 + 3) * 2;
      const h = 1 + this.seededUnit(index * 4 + 4) * 2;
      const alpha = 0.012 + this.seededUnit(index * 4 + 5) * 0.028;
      return { x, y, w, h, alpha };
    });
  }

  private seededUnit(seed: number) {
    const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return value - Math.floor(value);
  }
}
