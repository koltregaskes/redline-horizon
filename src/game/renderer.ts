import { clamp } from "./config";
import { getPlayerSprite, loadCarSprites, pickTrafficSprite } from "./car-sprites";
import {
  BILLBOARD_ASPECT,
  BillboardFaces,
  SKYLINE_MAX_PX,
  WINDOW_ALPHAS,
  WINDOW_COLORS,
  buildSkylineLayers,
  getSignFlatColor,
  type SkylineLayer,
} from "./roadside-art";
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
  private skyImg: HTMLImageElement | null = null;
  private skyReady = false;
  private readonly billboardFaces = new BillboardFaces();
  private skylineLayers: SkylineLayer[] = [];
  private readonly skylineXs: number[] = [];

  constructor(canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas 2D context is required.");
    }

    this.canvas = canvas;
    this.ctx = context;

    const skyImg = new Image();
    skyImg.onload = () => { this.skyReady = true; };
    skyImg.src = new URL("assets/img/sky.jpg", document.baseURI).href;
    this.skyImg = skyImg;

    loadCarSprites();
  }

  resize(width: number, height: number, dpr: number) {
    this.width = Math.max(320, Math.round(width));
    this.height = Math.max(240, Math.round(height));
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.rebuildGrainPattern();
    this.skylineLayers = buildSkylineLayers(this.width, this.height);
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

    this.drawSky(snapshot, palette, horizonY);
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

  private drawSky(snapshot: RenderSnapshot, palette: ThemePalette, horizonY: number) {
    if (this.skyReady && this.skyImg) {
      const skyBottom = horizonY + this.height * 0.05;
      const overscan = this.width * 0.18;
      const drawW = this.width + overscan * 2;
      const drift = Math.sin(snapshot.distance * 0.00004) * overscan * 0.6;
      const curve = clamp(snapshot.roadCurve * 40, -overscan, overscan);
      const x = -overscan + clamp(drift - curve, -overscan, overscan);
      this.ctx.drawImage(this.skyImg, x, 0, drawW, skyBottom);
      return;
    }

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
    if (!this.skyReady) {
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

    // Three layers, far to near. Each far layer gets a haze wash before the next
    // is drawn, so the city reads with depth. Window sets are fixed per building.
    const ctx = this.ctx;
    const scale = this.height / 720;
    const maxPx = (60 + skylineStrength * (SKYLINE_MAX_PX - 60)) * scale;
    const span = this.width * 1.3;
    const lead = (span - this.width) / 2;
    const curveShift = clamp(snapshot.roadCurve * 60, -80, 80);
    const lit = skylineStrength > 0.36;
    const xs = this.skylineXs;
    const lastLayer = this.skylineLayers.length - 1;

    this.skylineLayers.forEach((layer, layerIndex) => {
      const base = horizonY + layer.baseOffset;
      const shift = curveShift * layer.parallax;
      xs.length = 0;

      ctx.fillStyle = palette.nearSilhouette;
      for (const building of layer.buildings) {
        const x = (((building.u * span + shift) % span) + span) % span - lead;
        xs.push(x);
        const w = building.width;
        const h = building.height * maxPx * layer.heightScale;
        const top = base - h;
        ctx.fillRect(x, top, w, h);
        if (building.roof === 1) {
          ctx.fillRect(x + w * 0.18, top - h * 0.07, w * 0.64, h * 0.07 + 1);
        } else if (building.roof === 2) {
          ctx.fillRect(x + w * 0.5 - scale, top - h * 0.16, 2 * scale, h * 0.16 + 1);
        } else if (building.roof === 3) {
          ctx.beginPath();
          ctx.moveTo(x, top + 1);
          ctx.lineTo(x + w, top - w * 0.28);
          ctx.lineTo(x + w, top + 1);
          ctx.closePath();
          ctx.fill();
        }
      }

      if (lit) {
        const dim = layerIndex === 0 ? 0.55 : layerIndex === 1 ? 0.8 : 1;
        layer.windows.forEach((bucket, bucketIndex) => {
          const colour = WINDOW_COLORS[Math.floor(bucketIndex / WINDOW_ALPHAS.length)];
          const alpha = WINDOW_ALPHAS[bucketIndex % WINDOW_ALPHAS.length];
          ctx.fillStyle = this.withAlpha(colour, alpha * dim);
          for (const win of bucket) {
            const building = layer.buildings[win.building];
            const h = building.height * maxPx * layer.heightScale;
            const windowY = base - win.rowFromBase * layer.pitchY;
            if (windowY - layer.windowH < base - h + layer.pitchY * 0.6) {
              continue;
            }
            const x = xs[win.building] + win.dx;
            if (x < -8 || x > this.width) {
              continue;
            }
            ctx.fillRect(x, windowY - layer.windowH, layer.windowW, layer.windowH);
          }
        });

        // Aircraft warning lights on the antenna roofs of the near layer.
        if (layerIndex === lastLayer) {
          ctx.fillStyle = this.withAlpha("#ff5a6a", 0.9);
          layer.buildings.forEach((building, index) => {
            if (building.roof === 2) {
              const h = building.height * maxPx * layer.heightScale;
              ctx.fillRect(
                xs[index] + building.width * 0.5 - 1.5 * scale,
                base - h * 1.16 - 2 * scale,
                3 * scale,
                3 * scale,
              );
            }
          });
        }
      }

      if (layerIndex < lastLayer) {
        const haze = ctx.createLinearGradient(0, base - maxPx, 0, base);
        haze.addColorStop(0, this.withAlpha(palette.fog, 0));
        haze.addColorStop(1, this.withAlpha(palette.fog, 0.3));
        ctx.fillStyle = haze;
        ctx.fillRect(0, base - maxPx, this.width, maxPx);
      }
    });
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

    // A roadside object keeps the same slot while it travels towards the camera.
    const slotBase = Math.floor(snapshot.distance * 0.02);
    for (let index = 0; index < 15; index += 1) {
      const depth = (index + (snapshot.distance * 0.02 % 1)) / 15;
      const slot = index - slotBase;
      const geometry = this.getRoadGeometry(depth, snapshot.roadCurve, snapshot.lateral, horizonY);
      const shoulder = geometry.roadHalf + 40 + depth * 110;
      const leftX = geometry.center - shoulder;
      const rightX = geometry.center + shoulder;
      this.drawRoadsideObject(scenery, leftX, geometry.y, depth, false, palette, slot * 2);
      this.drawRoadsideObject(scenery, rightX, geometry.y, depth, true, palette, slot * 2 + 1);
    }
  }

  private drawBillboards(snapshot: RenderSnapshot, palette: ThemePalette, horizonY: number) {
    const slotBase = Math.floor(snapshot.distance * 0.01);
    for (let index = 0; index < 8; index += 1) {
      const depth = (index + (snapshot.distance * 0.01 % 1)) / 8;
      const slot = index - slotBase;
      const geometry = this.getRoadGeometry(depth, snapshot.roadCurve, snapshot.lateral, horizonY);
      const signWidth = 34 + depth * 110;
      const signHeight = signWidth / BILLBOARD_ASPECT;
      const leftX = geometry.center - geometry.roadHalf - (36 + depth * 90);
      const rightX = geometry.center + geometry.roadHalf + (36 + depth * 90);
      this.drawBillboardPanel(snapshot.segment.billboardSet, leftX, geometry.y, signWidth, signHeight, false, palette, slot * 2);
      this.drawBillboardPanel(snapshot.segment.billboardSet, rightX, geometry.y, signWidth, signHeight, true, palette, slot * 2 + 1);
    }
  }

  private drawRoadsideObject(
    scenery: SceneryMode,
    x: number,
    y: number,
    depth: number,
    rightSide: boolean,
    palette: ThemePalette,
    slot: number,
  ) {
    const scale = 0.45 + depth * 1.4;

    if (scenery === "palms") {
      this.drawPalm(x, y, scale, rightSide, palette, slot);
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

    this.drawNeonStreetPiece(x, y, scale, rightSide, palette, slot);
  }

  private drawPalm(x: number, y: number, scale: number, rightSide: boolean, palette: ThemePalette, slot: number) {
    const ctx = this.ctx;
    const vary = this.seededUnit(slot * 3 + 7);
    const lean = (rightSide ? 1 : -1) * (0.5 + vary * 0.7);
    const height = (44 + this.seededUnit(slot * 5 + 3) * 16) * scale;
    const topX = x + lean * 14 * scale;
    const topY = y - height;

    // Curved, tapering trunk: a dark core with a lit edge.
    ctx.lineCap = "round";
    ctx.strokeStyle = "#4e321d";
    ctx.lineWidth = Math.max(1.5, 5 * scale);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + lean * 1.5 * scale, y - height * 0.55, topX, topY);
    ctx.stroke();
    if (scale > 0.7) {
      ctx.strokeStyle = "#8a5d36";
      ctx.lineWidth = 1.4 * scale;
      ctx.beginPath();
      ctx.moveTo(x + 1.6 * scale, y);
      ctx.quadraticCurveTo(x + lean * 1.5 * scale + 1.4 * scale, y - height * 0.55, topX + scale, topY + 2 * scale);
      ctx.stroke();
    }
    ctx.lineCap = "butt";

    // Fronds: drooping leaf shapes around the crown, back ones darker.
    const fronds = scale > 0.7 ? 8 : 5;
    for (let pass = 0; pass < 2; pass += 1) {
      ctx.fillStyle = pass === 0 ? this.withAlpha(palette.roadsideSecondary, 0.95) : palette.roadsidePrimary;
      for (let k = pass; k < fronds; k += 2) {
        const angle = -Math.PI - 0.35 + (k / (fronds - 1)) * (Math.PI + 0.7) + lean * 0.12;
        const length = (20 + (((k + slot) % 3) + 3) % 3 * 4) * scale;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const tipX = topX + cos * length;
        const tipY = topY + sin * length * 0.5 + length * 0.42;
        const upperX = topX + cos * length * 0.5;
        const upperY = topY + sin * length * 0.5 - length * 0.3;
        ctx.beginPath();
        ctx.moveTo(topX, topY);
        ctx.quadraticCurveTo(upperX, upperY, tipX, tipY);
        ctx.quadraticCurveTo(upperX, upperY + length * 0.24, topX, topY + 1.5 * scale);
        ctx.fill();
      }
    }

    if (scale > 0.8) {
      ctx.fillStyle = "#3a2614";
      ctx.beginPath();
      ctx.arc(topX - 2 * scale, topY + 2.5 * scale, 2.2 * scale, 0, Math.PI * 2);
      ctx.arc(topX + 2 * scale, topY + 3 * scale, 2.2 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawNeonStreetPiece(
    x: number,
    y: number,
    scale: number,
    rightSide: boolean,
    palette: ThemePalette,
    slot: number,
  ) {
    const ctx = this.ctx;
    const towardRoad = rightSide ? -1 : 1;

    if (((slot % 3) + 3) % 3 === 2) {
      // Neon pylon: a dark column with a glowing tube and a lit cap.
      ctx.fillStyle = this.withAlpha(palette.nearSilhouette, 0.95);
      ctx.fillRect(x - 6 * scale, y - 56 * scale, 12 * scale, 56 * scale);
      ctx.fillStyle = this.withAlpha(palette.roadsideSecondary, 0.22);
      ctx.fillRect(x - 9 * scale, y - 54 * scale, 18 * scale, 46 * scale);
      ctx.fillStyle = palette.roadsideSecondary;
      ctx.fillRect(x - 1.5 * scale, y - 52 * scale, 3 * scale, 42 * scale);
      ctx.fillStyle = palette.roadsidePrimary;
      ctx.fillRect(x - 7 * scale, y - 60 * scale, 14 * scale, 4 * scale);
      return;
    }

    // Street lamp: pole, arm over the road, lamp head and a soft pool of light.
    const poleTop = y - 66 * scale;
    const headX = x + towardRoad * 18 * scale;
    ctx.fillStyle = this.withAlpha(palette.roadsidePrimary, 0.3);
    ctx.beginPath();
    ctx.ellipse(headX, poleTop + 5 * scale, 9 * scale, 5 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = this.withAlpha(palette.nearSilhouette, 0.95);
    ctx.fillRect(x - 1.5 * scale, poleTop, 3 * scale, 66 * scale);
    ctx.fillRect(x, poleTop, towardRoad * 19 * scale, 2.4 * scale);
    ctx.fillStyle = palette.roadsidePrimary;
    ctx.fillRect(headX - 5 * scale, poleTop + 1.5 * scale, 10 * scale, 2.6 * scale);
  }

  private drawBillboardPanel(
    billboardSet: string,
    x: number,
    y: number,
    width: number,
    height: number,
    rightSide: boolean,
    palette: ThemePalette,
    slot: number,
  ) {
    const ctx = this.ctx;
    const postHeight = height * 1.6;
    const anchorX = rightSide ? x : x - width;
    const bottom = y - postHeight;
    const top = bottom - height;

    // Two legs and a catwalk under the face.
    ctx.fillStyle = this.withAlpha(palette.nearSilhouette, 0.92);
    const leg = Math.max(1, width * 0.035);
    ctx.fillRect(anchorX + width * 0.22 - leg / 2, bottom, leg, postHeight);
    ctx.fillRect(anchorX + width * 0.78 - leg / 2, bottom, leg, postHeight);
    ctx.fillRect(anchorX + width * 0.04, bottom, width * 0.92, Math.max(1, height * 0.05));

    const face = width >= 18 ? this.billboardFaces.get(billboardSet, slot) : null;
    if (face) {
      ctx.drawImage(face, anchorX, top, width, height);
    } else {
      ctx.fillStyle = getSignFlatColor(billboardSet);
      ctx.fillRect(anchorX, top, width, height);
    }
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

      const sprite = pickTrafficSprite(car.color);
      if (sprite) {
        // Keep the baked render's aspect so vehicles do not squash as the road
        // scales them; anchor the wheels to the road contact point.
        const drawHeight = width / sprite.aspect;
        const drawY = geometry.y - drawHeight;
        this.ctx.fillStyle = this.withAlpha("#05070d", 0.3);
        this.ctx.beginPath();
        this.ctx.ellipse(laneCenter, geometry.y - 2, width * 0.46, Math.max(2, drawHeight * 0.09), 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.drawImage(sprite.image, x, drawY, width, drawHeight);

        if (car.headlights && snapshot.segment.nightLevel > 0.4) {
          this.ctx.fillStyle = this.withAlpha("#ff6a4a", 0.5);
          this.ctx.fillRect(x + width * 0.1, drawY + drawHeight * 0.5, width * 0.16, drawHeight * 0.07);
          this.ctx.fillRect(x + width * 0.74, drawY + drawHeight * 0.5, width * 0.16, drawHeight * 0.07);
        }
        continue;
      }

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

    const sprite = getPlayerSprite();
    if (sprite) {
      const drawWidth = 190;
      const drawHeight = drawWidth / sprite.aspect;
      const drawY = baseY + 82 - drawHeight;
      this.ctx.fillStyle = this.withAlpha("#05070d", 0.34);
      this.ctx.beginPath();
      this.ctx.ellipse(x, baseY + 80, drawWidth * 0.44, drawHeight * 0.13, 0, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.drawImage(sprite.image, x - drawWidth / 2, drawY, drawWidth, drawHeight);
      return;
    }

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
