// ======================== POLICE ========================
// Extracted from game.js:51601, 53162-53531 - no logic changed
import { CFG, T } from "../core/config.js?v=26";
import { getTile } from "../map/mapUtils.js?v=26";
import { player } from "./player.js?v=26";
import { vehicles } from "./vehicles.js?v=26";
import { isWalkable, isOnRoad } from "./vehicles.js?v=26";
import { shootBullet } from "../combat/shooting.js?v=26";
import { findPath } from "../ai/pathfinding.js?v=26";
import { updateWantedUI } from "../ui/hud.js?v=26";
import { playerDie } from "./player.js?v=26";
// Traffic helpers moved to js/ai/traffic.js - re-export for compatibility
import { pickRandomDest, chooseBestDir, updateTraffic } from "../ai/traffic.js?v=26";
export { pickRandomDest, chooseBestDir, updateTraffic };

export let police = [];
export function clearPolice(){ police.length = 0; }
export function setPolice(v){ police = v; }
export let _policeLastWanted = 0;

export function updatePolice() {
  if (player.wanted <= 0) {
    _policeLastWanted = 0;
    return;
  }

  if (player.wanted > _policeLastWanted) {
    for (const p of police) {
      p.active = true;
      p.forgetTimer = 240;
    }
  }
  _policeLastWanted = player.wanted;

  while (police.length < player.wanted * 2) {
    let px, py;
    let attempts = 0;
    do {
      const tx = Math.floor(2 + Math.random() * (CFG.COLS - 4));
      const ty = Math.floor(2 + Math.random() * (CFG.ROWS - 4));
      px = tx * CFG.TILE + CFG.TILE / 2;
      py = ty * CFG.TILE + CFG.TILE / 2;
      attempts++;
      if(attempts >= 50) break;
    } while (!isWalkable(px, py));
    if(!isWalkable(px,py)) break;

    police.push({
      x: px,
      y: py,
      vx: 0,
      vy: 0,
      angle: 0,
      speed: CFG.POLICE_SPEED + player.wanted * 0.2,
      state: "chase",
      color: "#ffffff",
      size: 10,
      timer: 0,
      health: 30,
      inVehicle: null,
      active: true,
      forgetTimer: 180,
      targetVehicle: null,
      path: null,
      pathTimer: 0,
    });
  }

  while (police.length > player.wanted * 3) {
    let remIdx = -1;
    for (let i = police.length - 1; i >= 0; i--) {
      if (!police[i].active) {
        remIdx = i;
        break;
      }
    }
    if (remIdx === -1) remIdx = police.length - 1;
    const p = police.splice(remIdx, 1)[0];
    if (p.inVehicle) {
      p.inVehicle.driver = null;
      p.inVehicle.occupied = false;
    }
  }

  const target = player.inVehicle || player;
  const playerInVehicle = player.inVehicle !== null;
  const minDist = CFG.TILE * 2;
  const maxDist = CFG.TILE * 3;
  const forgetDist = CFG.TILE * 10;
  const astarRange = CFG.TILE * 15;

  for (const p of police) {
    const dist = Math.hypot(target.x - p.x, target.y - p.y);
    const distTiles = Math.floor(dist / CFG.TILE);

    if (p.forgetTimer > 0) p.forgetTimer--;

    if (distTiles > 10 && p.active && p.forgetTimer === 0) {
      p.active = false;
      p.path = null;
    }

    if (!p.active) continue;

    if (playerInVehicle && !p.inVehicle) {
      let nearest = null;
      let nearestDist = Infinity;
      for (const v of vehicles) {
        if (!v.isPolice || v.occupied || v.hidden || v.exploding || v.isPersonal) continue;
        const d = Math.hypot(p.x - v.x, p.y - v.y);
        if (d < nearestDist) {
          nearestDist = d;
          nearest = v;
        }
      }
      if (nearest && nearestDist < CFG.TILE * 2) {
        p.inVehicle = nearest;
        nearest.occupied = true;
        nearest.driver = p;
        nearest.angle = Math.atan2(target.y - nearest.y, target.x - nearest.x);
        p.vx = 0;
        p.vy = 0;
        p.path = null;
        p.targetVehicle = null;
      } else if (nearest) {
        p.targetVehicle = nearest;
      }
    }

    if (!playerInVehicle && p.inVehicle) {
      const v = p.inVehicle;
      v.driver = null;
      v.occupied = false;
      // Place cop at nearest walkable offset
      let offX = v.x + 30, offY = v.y + 30;
      let tries = 0;
      while(tries < 8 && !isWalkable(offX, offY)){
        offX = v.x + (Math.random()-0.5)*60;
        offY = v.y + (Math.random()-0.5)*60;
        tries++;
      }
      p.x = isWalkable(offX, offY) ? offX : v.x;
      p.y = isWalkable(offX, offY) ? offY : v.y;
      p.inVehicle = null;
      p.targetVehicle = null;
    }

    if (p.targetVehicle && !p.inVehicle) {
      const tv = p.targetVehicle;
      if (tv.occupied) {
        p.targetVehicle = null;
      }
      const tvDist = Math.hypot(tv.x - p.x, tv.y - p.y);
      if (tvDist < CFG.TILE * 2) {
        p.inVehicle = tv;
        tv.occupied = true;
        tv.driver = p;
        tv.angle = Math.atan2(target.y - tv.y, target.x - tv.x);
        p.vx = 0;
        p.vy = 0;
        p.path = null;
        p.targetVehicle = null;
      }
    }

    if (p.inVehicle) {
      const v = p.inVehicle;
      const dx = target.x - v.x;
      const dy = target.y - v.y;
      const dist2 = Math.hypot(dx, dy);

      let desiredAngle = Math.atan2(dy, dx);
      if (dist2 < minDist) desiredAngle = Math.atan2(-dy, -dx);

      let angleDiff = desiredAngle - v.angle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      v.angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), 0.06);

      let accel = 0;
      if (dist2 > maxDist) accel = 0.15;
      else if (dist2 < minDist) accel = -0.12;

      v.vx += Math.cos(v.angle) * accel;
      v.vy += Math.sin(v.angle) * accel;

      const spd = CFG.POLICE_SPEED + player.wanted * 0.3;
      const currentSpeed = Math.hypot(v.vx, v.vy);
      if (currentSpeed > spd) {
        v.vx = (v.vx / currentSpeed) * spd;
        v.vy = (v.vy / currentSpeed) * spd;
      }

      v.vx *= 0.97;
      v.vy *= 0.97;

      const nx = v.x + v.vx;
      const ny = v.y + v.vy;
      if (isOnRoad(nx, ny)) {
        v.x = nx;
        v.y = ny;
      } else {
        v.vx *= -0.5;
        v.vy *= -0.5;
      }

      p.x = v.x;
      p.y = v.y;
    } else {
      const moveTarget = p.targetVehicle || target;
      const dx = moveTarget.x - p.x;
      const dy = moveTarget.y - p.y;

      p.pathTimer--;
      if (!p.path || p.path.length === 0 || p.pathTimer <= 0) {
        if (dist < astarRange || p.targetVehicle) {
          p.path = findPath(p.x, p.y, moveTarget.x, moveTarget.y, 40);
          p.pathTimer = 20 + Math.floor(Math.random() * 15);
        } else {
          p.path = null;
        }
      }

      let moved = false;
      if (p.path && p.path.length > 0) {
        const wp = p.path[0];
        const wpX = wp.x * CFG.TILE + CFG.TILE / 2;
        const wpY = wp.y * CFG.TILE + CFG.TILE / 2;
        const toWp = Math.hypot(wpX - p.x, wpY - p.y);

        if (toWp < 8) {
          p.path.shift();
        } else {
          p.angle = Math.atan2(wpY - p.y, wpX - p.x);
          const nx = p.x + Math.cos(p.angle) * p.speed;
          const ny = p.y + Math.sin(p.angle) * p.speed;
          if (isWalkable(nx, ny)) {
            p.x = nx;
            p.y = ny;
            moved = true;
          } else {
            p.path = null;
          }
        }
      }

      const moveDist = p.targetVehicle ? Math.hypot(dx, dy) : dist;
      if (!moved && moveDist > maxDist && moveDist > 10) {
        p.angle = Math.atan2(dy, dx);
        const nx = p.x + Math.cos(p.angle) * p.speed;
        const ny = p.y + Math.sin(p.angle) * p.speed;
        if (isWalkable(nx, ny)) {
          p.x = nx;
          p.y = ny;
        } else {
          p.angle += (Math.random() - 0.5) * 0.5;
          const tnx = p.x + Math.cos(p.angle) * p.speed;
          const tny = p.y + Math.sin(p.angle) * p.speed;
          if (isWalkable(tnx, tny)) {
            p.x = tnx;
            p.y = tny;
          }
        }
      } else if (!moved && moveDist < minDist && !p.targetVehicle) {
        p.angle = Math.atan2(-dy, -dx);
        const nx = p.x + Math.cos(p.angle) * p.speed * 0.4;
        const ny = p.y + Math.sin(p.angle) * p.speed * 0.4;
        if (isWalkable(nx, ny)) {
          p.x = nx;
          p.y = ny;
        }
      }
    }

    const actualTarget = player.inVehicle || player;
    const distToPlayer = Math.hypot(actualTarget.x - p.x, actualTarget.y - p.y);
    if (distToPlayer < 300 && Math.random() < 0.02) {
      const bAngle = Math.atan2(actualTarget.y - p.y, actualTarget.x - p.x);
      shootBullet(p.x, p.y, bAngle, false);
    }

    if (!player.inVehicle && !p.inVehicle && distToPlayer < 25) {
      player.health -= 5 * (CFG.DAMAGE_MUL || 1);
      player.wanted = Math.max(0, player.wanted - 1);
      updateWantedUI();
      if (player.health <= 0) playerDie();
    }
  }
}







