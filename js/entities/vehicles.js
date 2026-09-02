// ======================== VEHICLES ========================
// Extracted from game.js:51599, 51650-51796 - no logic changed
import { CFG } from "../core/config.js?v=26";
import { T } from "../core/config.js?v=26";
import { getTile } from "../map/mapUtils.js?v=26";
import { playCarExplosion } from "../audio/sounds.js?v=26";

export let vehicles = [];
export let explosions = [];
export const EXPLOSION_DURATION = 900; // ms matching car_explotion.svg timeline (0-900)
export const EXPLOSION_SIZE = 140; // draw size for explosion overlay
export let explosionImg = null;
export function setExplosionImg(img) { explosionImg = img; }

export const VEHICLE_TYPES = [
  {
    name: "سيدان",
    w: 60,
    h: 32,
    speed: 4.5,
    accel: 0.15,
  },
  {
    name: "رياضية",
    w: 56,
    h: 28,
    speed: 5.5,
    accel: 0.2,
  },
  {
    name: "شاحنة",
    w: 76,
    h: 40,
    speed: 3.5,
    accel: 0.08,
  },
  {
    name: "SUV",
    w: 68,
    h: 36,
    speed: 4.0,
    accel: 0.12,
  },
  {
    name: "سيارة شرطة",
    w: 60,
    h: 32,
    speed: 5.0,
    accel: 0.18,
  },
  {
    name: "BMW-s5",
    w: 58,
    h: 30,
    speed: 5.8,
    accel: 0.22,
  },
  {
    name: "Mercedes-g8",
    w: 72,
    h: 38,
    speed: 5.2,
    accel: 0.2,
  },
];

export function spawnVehicles() {
  vehicles.length = 0;
  explosions.length = 0;
  // Build civilian type pool robustly (exclude police and player-only exclusive cars)
  const civilianPool = VEHICLE_TYPES.filter(t => t.name !== "سيارة شرطة" && t.name !== "BMW-s5" && t.name !== "Mercedes-g8");
  for (let i = 0; i < CFG.NPC_VEHICLE_COUNT; i++) {
    let x,
      y,
      attempts = 0;
    do {
      const tileX = 3 + Math.floor(Math.random() * (CFG.COLS - 6));
      const tileY = 3 + Math.floor(Math.random() * (CFG.ROWS - 6));
      x = tileX * CFG.TILE + CFG.TILE / 2;
      y = tileY * CFG.TILE + CFG.TILE / 2;
      attempts++;
    } while (isOnRoad(x, y) === false && attempts < CFG.MAX_SPAWN_ATTEMPTS);
    // Skip spawn if still off-road after max attempts (sparse map)
    if(!isOnRoad(x,y)) continue;

    const type = civilianPool[Math.floor(Math.random() * civilianPool.length)] || civilianPool[0];
    if(!type) continue;
    // Determine initial direction based on road orientation at spawn
    const spawnTX = Math.floor(x / CFG.TILE);
    const spawnTY = Math.floor(y / CFG.TILE);
    let initAngle = 0;
    if (getTile(spawnTX + 1, spawnTY) === T.ROAD) {
      initAngle = 0;
    } else if (getTile(spawnTX - 1, spawnTY) === T.ROAD) {
      initAngle = Math.PI;
    } else if (getTile(spawnTX, spawnTY + 1) === T.ROAD) {
      initAngle = Math.PI / 2;
    } else if (getTile(spawnTX, spawnTY - 1) === T.ROAD) {
      initAngle = (3 * Math.PI) / 2;
    }
    const health = 15 + Math.floor(Math.random() * 9); // 15-23 bullets to detonate
    const cruiseSpeed = 1.6 + Math.random() * 0.6;
    const v = {
      x,
      y,
      w: type.w,
      h: type.h,
      speed: type.speed + (Math.random() - 0.5) * 0.5,
      cruiseSpeed,
      type: type,
      typeIdx: VEHICLE_TYPES.indexOf(type),
      angle: initAngle,
      vx: 0,
      vy: 0,
      driver: null,
      isPolice: false,
      isPersonal: false,
      siren: false,
      occupied: false,
      hidden: false,
      exploding: false,
      health: health,
      maxHealth: health,
      npcTargetX: x,
      npcTargetY: y,
      npcWaitTimer: 0,
      npcState: "moving",
      moveAngle: initAngle,
    };
    // Place on road facing along road direction
    vehicles.push(v);
  }

  // Police vehicles (capped attempts to avoid infinite loop on water-only maps)
  for (let i = 0; i < CFG.POLICE_VEHICLE_COUNT; i++) {
    let x, y;
    let attempts = 0;
    do {
      const tileX = 3 + Math.floor(Math.random() * (CFG.COLS - 6));
      const tileY = 3 + Math.floor(Math.random() * (CFG.ROWS - 6));
      x = tileX * CFG.TILE + CFG.TILE / 2;
      y = tileY * CFG.TILE + CFG.TILE / 2;
      attempts++;
      if(attempts >= CFG.MAX_SPAWN_ATTEMPTS) break;
    } while (isOnRoad(x, y) === false);
    // Skip if no road found (avoid infinite loop)
    if(!isOnRoad(x,y)) continue;

    const pt = VEHICLE_TYPES[4];
    const pvHealth = 15 + Math.floor(Math.random() * 9);
    const pv = {
      x,
      y,
      w: pt.w,
      h: pt.h,
      speed: CFG.POLICE_SPEED,
      type: pt,
      typeIdx: VEHICLE_TYPES.indexOf(pt),
      angle: Math.random() * Math.PI * 2,
      vx: 0,
      vy: 0,
      driver: null,
      isPolice: true,
      isPersonal: false,
      siren: false,
      occupied: false,
      hidden: false,
      exploding: false,
      health: pvHealth,
      maxHealth: pvHealth,
    };
    vehicles.push(pv);
  }
}

export function explodeVehicle(vi) {
  const v = vehicles[vi];
  if (!v || v.hidden || v.exploding) return null;
  // Hide vehicle immediately, keep in array until animation finishes
  v.hidden = true;
  v.exploding = true;
  // Create explosion effect at vehicle position
  const exp = {
    x: v.x,
    y: v.y,
    t: 0,
    duration: EXPLOSION_DURATION,
    vehicle: v,
    // tie to vehicle reference for removal; also store rotation for debris?
  };
  explosions.push(exp);
  try { playCarExplosion(); } catch {}
  return exp;
}

export function updateExplosions(dt = 16) {
  for (let i = explosions.length - 1; i >= 0; i--) {
    const e = explosions[i];
    e.t += dt;
    if (e.t >= e.duration) {
      // Animation finished -> remove vehicle permanently
      const vi = vehicles.indexOf(e.vehicle);
      if (vi >= 0) vehicles.splice(vi, 1);
      explosions.splice(i, 1);
    }
  }
}

export function clearExplosions() { explosions.length = 0; }

export function isOnRoad(px, py) {
  const tx = Math.floor(px / CFG.TILE);
  const ty = Math.floor(py / CFG.TILE);
  if (tx < 0 || tx >= CFG.COLS || ty < 0 || ty >= CFG.ROWS) return false;
  return getTile(tx, ty) === T.ROAD;
}

export function isWalkable(px, py) {
  const tx = Math.floor(px / CFG.TILE);
  const ty = Math.floor(py / CFG.TILE);
  if (tx < 0 || tx >= CFG.COLS || ty < 0 || ty >= CFG.ROWS) return false;
  const tile = getTile(tx, ty);
  return (
    tile === T.ROAD ||
    tile === T.SIDEWALK ||
    tile === T.PAVEMENT ||
    tile === T.PARK ||
    tile === T.PARKING
  );
}
