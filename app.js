const canvas = document.getElementById("roadCanvas");
const ctx = canvas.getContext("2d");
const speedValue = document.getElementById("speedValue");
const distanceValue = document.getElementById("distanceValue");
const trafficValue = document.getElementById("trafficValue");

const keys = new Set();
const state = {
  speed: 0,
  lateral: 0,
  distance: 0,
  dodged: 0,
  roadOffset: 0,
  roadCurve: 0,
  cars: [],
};

function spawnCar() {
  state.cars.push({
    lane: [-0.8, 0, 0.8][Math.floor(Math.random() * 3)],
    z: 1.2 + Math.random() * 0.8,
    color: ["#ff6e5b", "#5cc8ff", "#ffe16b"][Math.floor(Math.random() * 3)],
  });
}

for (let i = 0; i < 6; i += 1) spawnCar();

function update(dt) {
  const throttle = keys.has("arrowup") || keys.has("w");
  const brake = keys.has("arrowdown") || keys.has("s");
  const left = keys.has("arrowleft") || keys.has("a");
  const right = keys.has("arrowright") || keys.has("d");

  if (throttle) state.speed += 90 * dt;
  else state.speed -= 32 * dt;
  if (brake) state.speed -= 120 * dt;
  state.speed = Math.max(0, Math.min(220, state.speed));

  const steer = (right ? 1 : 0) - (left ? 1 : 0);
  state.lateral = Math.max(-1.05, Math.min(1.05, state.lateral + steer * dt * 1.85));
  state.lateral *= 0.96;

  state.distance += state.speed * dt;
  state.roadOffset += state.speed * dt * 0.012;
  state.roadCurve = Math.sin(state.distance * 0.0018) * 0.62 + Math.sin(state.distance * 0.00057 + 1.8) * 0.24;

  for (const car of state.cars) {
    car.z -= (0.18 + state.speed * 0.004) * dt;
  }

  for (const car of state.cars) {
    if (car.z < -0.1) {
      car.z = 1.5 + Math.random() * 0.6;
      car.lane = [-0.8, 0, 0.8][Math.floor(Math.random() * 3)];
      state.dodged += 1;
    }

    if (car.z < 0.16 && Math.abs(car.lane - state.lateral) < 0.28) {
      state.speed *= 0.55;
      car.z = 1.7;
      car.lane = [-0.8, 0, 0.8][Math.floor(Math.random() * 3)];
    }
  }
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.62);
  sky.addColorStop(0, "#2d3f87");
  sky.addColorStop(0.36, "#f6877f");
  sky.addColorStop(0.62, "#ffd597");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height * 0.62);

  ctx.fillStyle = "#f7b15d";
  ctx.beginPath();
  ctx.arc(canvas.width * 0.72, canvas.height * 0.22, 56, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#4e6f98";
  ctx.beginPath();
  ctx.moveTo(0, canvas.height * 0.38);
  ctx.lineTo(140, canvas.height * 0.3);
  ctx.lineTo(260, canvas.height * 0.36);
  ctx.lineTo(420, canvas.height * 0.29);
  ctx.lineTo(610, canvas.height * 0.38);
  ctx.lineTo(760, canvas.height * 0.32);
  ctx.lineTo(960, canvas.height * 0.41);
  ctx.lineTo(960, canvas.height * 0.62);
  ctx.lineTo(0, canvas.height * 0.62);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#2c6da0";
  ctx.fillRect(0, canvas.height * 0.5, canvas.width, canvas.height * 0.16);

  ctx.fillStyle = "#1b2741";
  ctx.fillRect(0, canvas.height * 0.62, canvas.width, canvas.height * 0.38);
}

function drawRoad() {
  const horizonY = canvas.height * 0.36;
  const roadBottomWidth = canvas.width * 0.82;
  const roadTopWidth = canvas.width * 0.1;
  const centerShift = state.lateral * 90 + state.roadCurve * 160;

  ctx.fillStyle = "#444d58";
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2 - roadTopWidth / 2 - centerShift * 0.12, horizonY);
  ctx.lineTo(canvas.width / 2 + roadTopWidth / 2 - centerShift * 0.12, horizonY);
  ctx.lineTo(canvas.width / 2 + roadBottomWidth / 2 - centerShift, canvas.height);
  ctx.lineTo(canvas.width / 2 - roadBottomWidth / 2 - centerShift, canvas.height);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#c9b07b";
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2 - roadTopWidth / 2 - centerShift * 0.12 - 55, horizonY);
  ctx.lineTo(canvas.width / 2 - roadTopWidth / 2 - centerShift * 0.12, horizonY);
  ctx.lineTo(canvas.width / 2 - roadBottomWidth / 2 - centerShift - 72, canvas.height);
  ctx.lineTo(canvas.width / 2 - roadBottomWidth / 2 - centerShift - 145, canvas.height);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(canvas.width / 2 + roadTopWidth / 2 - centerShift * 0.12, horizonY);
  ctx.lineTo(canvas.width / 2 + roadTopWidth / 2 - centerShift * 0.12 + 55, horizonY);
  ctx.lineTo(canvas.width / 2 + roadBottomWidth / 2 - centerShift + 145, canvas.height);
  ctx.lineTo(canvas.width / 2 + roadBottomWidth / 2 - centerShift + 72, canvas.height);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#c7d0dc";
  for (let i = 0; i < 26; i += 1) {
    const depth = (i + (state.roadOffset % 1)) / 26;
    const y = horizonY + depth * depth * (canvas.height - horizonY);
    const width = 8 + depth * 22;
    const height = 8 + depth * 32;
    const roadCenter = canvas.width / 2 - centerShift * depth - state.roadCurve * depth * depth * 130;
    ctx.fillRect(roadCenter - width / 2, y, width, height);
  }

  ctx.fillStyle = "#d4443d";
  for (let i = 0; i < 14; i += 1) {
    const depth = i / 14;
    const y = horizonY + depth * depth * (canvas.height - horizonY);
    const roadCenter = canvas.width / 2 - centerShift * depth - state.roadCurve * depth * depth * 130;
    const roadHalf = (roadTopWidth * 0.5) + (roadBottomWidth * 0.5 - roadTopWidth * 0.5) * depth;
    const curbWidth = 10 + depth * 14;
    ctx.fillRect(roadCenter - roadHalf - curbWidth, y, curbWidth, 8 + depth * 18);
    ctx.fillRect(roadCenter + roadHalf, y, curbWidth, 8 + depth * 18);
  }
}

function drawRoadside() {
  const horizonY = canvas.height * 0.36;
  for (let i = 0; i < 18; i += 1) {
    const depth = (i + (state.roadOffset % 1)) / 18;
    const y = horizonY + depth * depth * (canvas.height - horizonY);
    const roadCenter = canvas.width / 2 - (state.lateral * 90 + state.roadCurve * 160) * depth - state.roadCurve * depth * depth * 130;
    const roadHalf = 60 + depth * 320;
    const palmHeight = 28 + depth * 96;
    const leftX = roadCenter - roadHalf - 34 - depth * 90;
    const rightX = roadCenter + roadHalf + 34 + depth * 90;

    [leftX, rightX].forEach((x, index) => {
      ctx.fillStyle = "#65462d";
      ctx.fillRect(x - 3, y - palmHeight, 6, palmHeight);
      ctx.fillStyle = index === 0 ? "#2b9f63" : "#35b774";
      ctx.beginPath();
      ctx.moveTo(x, y - palmHeight - 18);
      ctx.lineTo(x - 24, y - palmHeight + 8);
      ctx.lineTo(x + 24, y - palmHeight + 4);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x, y - palmHeight - 18);
      ctx.lineTo(x - 22, y - palmHeight - 6);
      ctx.lineTo(x + 14, y - palmHeight + 16);
      ctx.closePath();
      ctx.fill();
    });
  }
}

function drawTraffic() {
  const horizonY = canvas.height * 0.36;
  for (const car of state.cars.slice().sort((a, b) => b.z - a.z)) {
    const t = 1 - car.z;
    const y = horizonY + t * t * (canvas.height - horizonY);
    const width = 14 + t * 64;
    const height = 18 + t * 74;
    const x = canvas.width / 2 + car.lane * (110 + t * 240) - width / 2 - state.lateral * t * 130 - state.roadCurve * t * 180;
    ctx.fillStyle = car.color;
    ctx.fillRect(x, y - height, width, height);
    ctx.fillStyle = "#101826";
    ctx.fillRect(x + width * 0.18, y - height * 0.72, width * 0.64, height * 0.3);
  }
}

function drawPlayerCar() {
  const x = canvas.width / 2 + state.lateral * 220;
  const y = canvas.height - 110;
  ctx.fillStyle = "#ffdb71";
  ctx.fillRect(x - 34, y - 54, 68, 110);
  ctx.fillStyle = "#18243c";
  ctx.fillRect(x - 24, y - 38, 48, 28);
}

function render() {
  drawBackground();
  drawRoad();
  drawRoadside();
  drawTraffic();
  drawPlayerCar();
  speedValue.textContent = `${Math.round(state.speed)} km/h`;
  distanceValue.textContent = `${Math.round(state.distance)} m`;
  trafficValue.textContent = `${state.dodged}`;
}

let lastTime = performance.now();
function frame(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.033);
  lastTime = now;
  update(dt);
  render();
  requestAnimationFrame(frame);
}

window.addEventListener("keydown", (event) => keys.add(event.key.toLowerCase()));
window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));

render();
requestAnimationFrame(frame);
