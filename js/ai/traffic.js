// ======================== TRAFFIC AI ========================
// Extracted from game.js:53422-53530 - no logic changed
import { CFG, T } from "../core/config.js?v=16";
import { getTile } from "../map/mapUtils.js?v=15";
import { isOnRoad } from "../entities/vehicles.js?v=15";
import { vehicles } from "../entities/vehicles.js?v=15";

export function pickRandomDest(v) {
  for (let i = 0; i < 50; i++) {
    const tx = 2 + Math.floor(Math.random() * (CFG.COLS - 4));
    const ty = 2 + Math.floor(Math.random() * (CFG.ROWS - 4));
    if (getTile(tx, ty) === T.ROAD) {
      const dx = tx * CFG.TILE + CFG.TILE / 2;
      const dy = ty * CFG.TILE + CFG.TILE / 2;
      if (Math.hypot(v.x - dx, v.y - dy) > CFG.TILE * 4) {
        v.npcTargetX = dx;
        v.npcTargetY = dy;
        return;
      }
    }
  }
}
export function chooseBestDir(v, tx, ty) {
  const dirs = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
  let best = v.moveAngle !== undefined ? v.moveAngle : 0;
  let bestDist = Infinity;
  for (const a of dirs) {
    const nx = v.x + Math.cos(a) * CFG.TILE;
    const ny = v.y + Math.sin(a) * CFG.TILE;
    if (isOnRoad(nx, ny)) {
      let d = Math.hypot(nx - tx, ny - ty);
      if (a === v.moveAngle) d *= 0.85;
      if (d < bestDist) {
        bestDist = d;
        best = a;
      }
    }
  }
  return best;
}
export function updateTraffic() {
  for (const v of vehicles) {
    if (v.hidden || v.exploding) continue;
    if (v.driver) continue;
    if (v.isPolice) continue;
    if (v.isPersonal) continue;
    // personal car stays put

    // State: waiting at destination
    if (v.npcState === "waiting") {
      v.npcWaitTimer--;
      if (v.npcWaitTimer <= 0) {
        v.npcState = "moving";
        pickRandomDest(v);
      }
      continue;
    }

    // State: moving to destination
    const dist = Math.hypot(v.x - v.npcTargetX, v.y - v.npcTargetY);
    if (dist < CFG.TILE * 1.5) {
      v.npcState = "waiting";
      v.npcWaitTimer = 90 + Math.random() * 180;
      continue;
    }

    // Determine current road tile
    const tx = Math.floor(v.x / CFG.TILE);
    const ty = Math.floor(v.y / CFG.TILE);

    // Check if at a 4-way intersection
    const safe = tx > 0 && tx < CFG.COLS - 1 && ty > 0 && ty < CFG.ROWS - 1;
    const isAtInter =
      safe &&
      getTile(tx, ty) === T.ROAD &&
      getTile(tx - 1, ty) === T.ROAD &&
      getTile(tx + 1, ty) === T.ROAD &&
      getTile(tx, ty - 1) === T.ROAD &&
      getTile(tx, ty + 1) === T.ROAD;

    // Re-evaluate direction at intersections or if no direction set
    const needNewDir =
      v.moveAngle === undefined || v.moveAngle === null || isAtInter;
    if (needNewDir) {
      v.moveAngle = chooseBestDir(v, v.npcTargetX, v.npcTargetY);
    }

    // Check if the road ahead is still a road
    const lookAhead = 4;
    const aheadX = v.x + Math.cos(v.moveAngle) * lookAhead;
    const aheadY = v.y + Math.sin(v.moveAngle) * lookAhead;
    if (!isOnRoad(aheadX, aheadY)) {
      v.moveAngle = chooseBestDir(v, v.npcTargetX, v.npcTargetY);
    }

    // Move at steady speed
    const spd = 1.6 + Math.random() * 0.6;
    const nx = v.x + Math.cos(v.moveAngle) * spd;
    const ny = v.y + Math.sin(v.moveAngle) * spd;

    if (isOnRoad(nx, ny)) {
      v.x = nx;
      v.y = ny;
      v.angle = v.moveAngle;
      // Center within the road lane
      const cx = Math.floor(v.x / CFG.TILE) * CFG.TILE + CFG.TILE / 2;
      const cy = Math.floor(v.y / CFG.TILE) * CFG.TILE + CFG.TILE / 2;
      if (v.moveAngle === 0 || v.moveAngle === Math.PI) {
        v.y += (cy - v.y) * 0.15;
      } else {
        v.x += (cx - v.x) * 0.15;
      }
    }
  }
}
