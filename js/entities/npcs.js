// ======================== NPCS ========================
// Extracted from game.js:51600, 51602, 51799-51845, 52990-53161, 53658-53739 - no logic changed
import { CFG, T, WEAPONS } from "../core/config.js?v=26";
import { getTile } from "../map/mapUtils.js?v=26";
import { isWalkable } from "./vehicles.js?v=26";
import { player } from "./player.js?v=26";
import { currentMission } from "../missions/missionState.js?v=26";
import { showNotification } from "../ui/hud.js?v=26";
import { updateHUD } from "../ui/hud.js?v=26";
// AI helpers moved to js/ai/ - re-export for compatibility (no logic change)
import { updateGangs } from "../ai/gangs.js?v=26";
import { findPath } from "../ai/pathfinding.js?v=26";
export { updateGangs, findPath };

export let npcs = [];
export let lootItems = [];
export function clearNPCs(){ npcs.length = 0; }
export function clearLoot(){ lootItems.length = 0; }
export function setNpcs(v){ npcs = v; }
export function setLootItems(v){ lootItems = v; }
export function spawnNPCs() {
  npcs = [];
  for (let i = 0; i < CFG.NPC_COUNT; i++) {
    let x, y;
    let attempts=0;
    do {
      const tileX = 3 + Math.floor(Math.random() * (CFG.COLS - 6));
      const tileY = 3 + Math.floor(Math.random() * (CFG.ROWS - 6));
      x = tileX * CFG.TILE + CFG.TILE / 2;
      y = tileY * CFG.TILE + CFG.TILE / 2;
      attempts++;
      if(attempts>=50) break;
    } while (!isWalkable(x, y));
    if(!isWalkable(x,y)) continue;

    const isGang = i >= CFG.NPC_COUNT - CFG.NPC_GANG_COUNT;
    // last NPC_GANG_COUNT are gang members
    npcs.push({
      x,
      y,
      vx: 0,
      vy: 0,
      angle: Math.random() * Math.PI * 2,
      speed: isGang ? 1.0 + Math.random() * 0.8 : 0.5 + Math.random() * 1.0,
      color: isGang
        ? "#8e44ad"
        : [
            "#e74c3c",
            "#3498db",
            "#2ecc71",
            "#f39c12",
            "#9b59b6",
            "#1abc9c",
            "#e67e22",
            "#34495e",
          ][Math.floor(Math.random() * 8)],
      health: isGang ? 40 : 20,
      maxHealth: isGang ? 40 : 20,
      type: isGang ? "gang" : "civilian",
      weapon: isGang,
      state: isGang ? "idle" : "walk",
      targetX: x,
      targetY: y,
      timer: Math.random() * 200,
      size: 12,
      shootTimer: 0,
      chaseTarget: null,
      chaseTimer: 0,
    });
  }
}
export function updateNPCs() {
  for (const npc of npcs) {
    if (npc.type === "gang") continue;
    // handled by updateGangs
    npc.timer--;
    if (npc.timer <= 0) {
      // Pick new direction
      npc.angle = Math.random() * Math.PI * 2;
      npc.targetX = npc.x + Math.cos(npc.angle) * (50 + Math.random() * 100);
      npc.targetY = npc.y + Math.sin(npc.angle) * (50 + Math.random() * 100);
      npc.timer = 60 + Math.random() * 120;
    }

    const dx = npc.targetX - npc.x;
    const dy = npc.targetY - npc.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 5) {
      npc.angle = Math.atan2(dy, dx);
      const nx = npc.x + Math.cos(npc.angle) * npc.speed;
      const ny = npc.y + Math.sin(npc.angle) * npc.speed;

      if (isWalkable(nx, ny)) {
        npc.x = nx;
        npc.y = ny;
      } else {
        npc.timer = 0;
        // pick new direction
      }
    }
  }
}





export function killNPC(index) {
  const npc = npcs[index];
  // Surveillance: any kill fails the mission
  if (currentMission && currentMission.type === "surveillance") {
    currentMission.data.surveillanceKilled = true;
  }
  if (npc.type === "civilian") {
    const moneyDrop = 10 + Math.floor(Math.random() * 30);
    spawnLoot(npc.x, npc.y, "money", moneyDrop);
    showNotification(`💰 مدني قتل! حصلت على $${moneyDrop}`);
    if (currentMission && currentMission.type === "killCivilians") {
      currentMission.data.killCount = (currentMission.data.killCount || 0) + 1;
    }
  } else if (npc.type === "gang") {
    const roll = Math.random();
    const moneyDrop = 20 + Math.floor(Math.random() * 60);
    if (roll < 0.3) {
      spawnLoot(npc.x, npc.y, "money", moneyDrop);
      showNotification(`💰 عصابة قتل! حصلت على $${moneyDrop}`);
    } else if (roll < 0.6) {
      spawnLoot(
        npc.x,
        npc.y,
        "ammo_pistol",
        10 + Math.floor(Math.random() * 15),
      );
      showNotification("📦 عصابة قتل! حصلت على ذخيرة مسدس");
    } else if (roll < 0.8) {
      spawnLoot(npc.x, npc.y, "ammo_smg", 8 + Math.floor(Math.random() * 10));
      showNotification("📦 عصابة قتل! حصلت على ذخيرة رشاش");
    } else {
      spawnLoot(npc.x, npc.y, "ammo_rifle", 5 + Math.floor(Math.random() * 10));
      showNotification("📦 عصابة قتل! حصلت على ذخيرة بندقية");
    }
    player.wanted = Math.min(5, player.wanted + 1);
    if (currentMission && (currentMission.type === "killGang" || currentMission.type === "killTarget")) {
      currentMission.data.killCount = (currentMission.data.killCount || 0) + 1;
    }
  }
  npcs.splice(index, 1);
}
export const AMMO_TYPES = {
  ammo_pistol: "pistol",
  ammo_smg: "smg",
  ammo_rifle: "rifle",
  ammo_shotgun: "shotgun",
};
export function spawnLoot(x, y, type, amount) {
  lootItems.push({
    x: x + (Math.random() - 0.5) * 10,
    y: y + (Math.random() - 0.5) * 10,
    type: type,
    amount: amount,
    timer: 300, // 5 seconds at 60fps
  });
}

export function updateLoot() {
  for (let i = lootItems.length - 1; i >= 0; i--) {
    const l = lootItems[i];
    l.timer--;
    l.y += Math.sin(Date.now() / 200 + i) * 0.1;
    // floating effect

    // Check if player picks it up
    const dist = Math.hypot(player.x - l.x, player.y - l.y);
    if (dist < 20) {
      if (l.type === "money") {
        player.money += l.amount;
        showNotification(`💰 +$${l.amount}`);
      } else if (AMMO_TYPES[l.type]) {
        const wName = AMMO_TYPES[l.type];
        player.ammo[wName] = (player.ammo[wName] || 0) + l.amount;
        showNotification(`📦 +${l.amount} طلقة ${WEAPONS[wName].name}`);
      }
      lootItems.splice(i, 1);
      updateHUD();
      continue;
    }

    if (l.timer <= 0) {
      lootItems.splice(i, 1);
    }
  }
}
