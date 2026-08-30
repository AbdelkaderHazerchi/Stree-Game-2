// ======================== GANGS AI ========================
// Extracted from game.js:53023-53074 - no logic changed
import { isWalkable } from "../entities/vehicles.js?v=15";
import { npcs } from "../entities/npcs.js?v=15";
import { shootBullet } from "../combat/shooting.js?v=15";

export function updateGangs() {
  for (const npc of npcs) {
    if (npc.type !== "gang") continue;

    // Chase timer
    if (npc.chaseTimer > 0) npc.chaseTimer--;

    // If being chased, move toward player
    if (npc.chaseTarget && npc.chaseTimer > 0) {
      const target = npc.chaseTarget.inVehicle || npc.chaseTarget;
      const dx = target.x - npc.x;
      const dy = target.y - npc.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 15) {
        npc.angle = Math.atan2(dy, dx);
        const nx = npc.x + Math.cos(npc.angle) * npc.speed;
        const ny = npc.y + Math.sin(npc.angle) * npc.speed;
        if (isWalkable(nx, ny)) {
          npc.x = nx;
          npc.y = ny;
        }
      }

      // Shoot at player if close
      if (dist < 250 && Math.random() < 0.025) {
        const bAngle = Math.atan2(target.y - npc.y, target.x - npc.x);
        shootBullet(npc.x, npc.y, bAngle, false);
      }
    } else {
      // Idle patrol
      npc.timer--;
      if (npc.timer <= 0) {
        npc.angle = Math.random() * Math.PI * 2;
        npc.targetX = npc.x + Math.cos(npc.angle) * (40 + Math.random() * 80);
        npc.targetY = npc.y + Math.sin(npc.angle) * (40 + Math.random() * 80);
        npc.timer = 60 + Math.random() * 100;
      }
      const dx = npc.targetX - npc.x;
      const dy = npc.targetY - npc.y;
      if (Math.hypot(dx, dy) > 5) {
        npc.angle = Math.atan2(dy, dx);
        const nx = npc.x + Math.cos(npc.angle) * npc.speed;
        const ny = npc.y + Math.sin(npc.angle) * npc.speed;
        if (isWalkable(nx, ny)) {
          npc.x = nx;
          npc.y = ny;
        }
      }
    }
  }
}
