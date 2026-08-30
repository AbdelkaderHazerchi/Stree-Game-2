// ======================== UPDATE ========================
// Extracted from game.js:52751-52888 - no logic changed
import { CFG, T } from "./config.js?v=25";
import { G } from "./config.js?v=25";
import { gameState, setGameState } from "./state.js?v=25";
import { player } from "../entities/player.js?v=25";
import { vehicles, isWalkable, isOnRoad, updateExplosions } from "../entities/vehicles.js?v=25";
import { npcs, lootItems } from "../entities/npcs.js?v=25";
import { police } from "../entities/police.js?v=25";
import { getTile } from "../map/mapUtils.js?v=25";
import { specialBuildings } from "../map/mapState.js?v=25";
import { act, actJust, isAiming, worldMouseX, worldMouseY } from "../input/inputState.js?v=25";
import { actionJust, actionHeld } from "../input/keyboard.js?v=25";
import { updateInput } from "../input/keyboard.js?v=25";
import { closeInventory, toggleInventory, switchWeapon, switchWeaponSlot } from "../ui/inventory.js?v=25";
import { handleEnterExit, handleHorn, cancelMission } from "../input/keyboard.js?v=25";
import { fireWeapon } from "../combat/shooting.js?v=25";
import { updateNPCs } from "../entities/npcs.js?v=25";
import { updateGangs } from "../ai/gangs.js?v=25";
import { updatePolice } from "../entities/police.js?v=25";
import { updateBullets } from "../entities/bullets.js?v=25";
import { updateLoot } from "../entities/npcs.js?v=25";
import { updateTraffic } from "../ai/traffic.js?v=25";
import { updateCamera, updateHUD, updateWantedUI } from "../ui/hud.js?v=25";
import { currentMission, missionGivers, usingSequentialMissions, quests } from "../missions/missionState.js?v=25";
import { updateMission, startMission, getActiveMissionGiver, getVisibleStartGivers } from "../missions/missionSystem.js?v=25";
import { showPauseMenu } from "../ui/menu.js?v=25";
import { SHOPS, setNearShopName } from "../ui/shop.js?v=25";

export function update() {
  if (!player || !player.alive) return;

  // Input (keyboard + gamepad)
  updateInput();

  // Process frame-based actions
  if (actJust.pause && gameState === G.PLAYING) {
    if (player.showInventory) {
      closeInventory();
      return;
    }
    setGameState(G.PAUSED);
    showPauseMenu();
    return;
  }
  if (player.alive) {
    if (actionJust("enterExit")) handleEnterExit();
    if (actionJust("horn")) handleHorn();
    if (actionJust("cancelMission")) cancelMission();
    if (actionJust("inventory")) toggleInventory();
    if (actionJust("weaponNext")) switchWeapon(1);
    if (actionJust("weaponSlot1")) switchWeaponSlot(0);
    if (actionJust("weaponSlot2")) switchWeaponSlot(1);
    if (actionJust("weaponSlot3")) switchWeaponSlot(2);
    if (actionJust("weaponSlot4")) switchWeaponSlot(3);
    if (actionJust("weaponSlot5")) switchWeaponSlot(4);
    // Continuous shooting (hold space)
    if (act.shoot && player.shootCooldown <= 0) fireWeapon();
  }

  // Shoot cooldown
  if (player.shootCooldown > 0) player.shootCooldown -= 16;

  // Player movement
  updatePlayer();

  // NPCs
  updateNPCs();

  // Gang members
  updateGangs();

  // Police
  updatePolice();

  // Bullets
  updateBullets();

  // Loot items
  updateLoot();

  // Vehicles AI (traffic)
  updateTraffic();

  // Explosions (hide -> animate -> remove)
  updateExplosions(16);

  // Camera
  updateCamera();

  // Wanted timer decay
  if (player.wanted > 0 && !currentMission) {
    player.wantedTimer += 16;
    if (player.wantedTimer > 15000) {
      player.wanted--;
      player.wantedTimer = 0;
      if (player.wanted < 0) player.wanted = 0;
      updateWantedUI();
    }
  } else if (player.wanted > 0) {
    player.wantedTimer = 0;
  }

  // Mission
  updateMission();

  // Check quest/mission givers proximity — two-point: capture Start to activate, HUD shows content, End appears (green) to complete
  if (!currentMission) {
    // Use new quest-aware visibility: mains sequential yellow, sides purple all visible
    if(quests && quests.length>0){
      const visibles = getVisibleStartGivers();
      for(const mg of visibles){
        const dist = Math.hypot(player.x - mg.x, player.y - mg.y);
        if(dist < 60){
          // Start via questId (preferred) — preserves bilingual title/desc
          if(mg.questId) startMission(mg.questId);
          else startMission(mg.type);
          // mg.taken will be set inside startMission, but also ensure status
          break;
        }
      }
    } else if (usingSequentialMissions) {
      const activeMg = getActiveMissionGiver();
      if (activeMg) {
        const dist = Math.hypot(player.x - activeMg.x, player.y - activeMg.y);
        if (dist < 60) {
          startMission(activeMg.type);
          activeMg.taken = true;
        }
      }
    } else {
      for (const mg of missionGivers) {
        if (mg.taken) continue;
        const dist = Math.hypot(player.x - mg.x, player.y - mg.y);
        if (dist < 60) {
          startMission(mg.type);
          mg.taken = true;
          break;
        }
      }
    }
  }

  // Check shop proximity
  let _near = null;
  for (const sb of specialBuildings) {
    // Shops have distinct emoji names
    if (!SHOPS[sb.name]) continue;
    const sx = sb.x * CFG.TILE + CFG.TILE / 2;
    const sy = sb.y * CFG.TILE + CFG.TILE / 2;
    if (Math.hypot(player.x - sx, player.y - sy) < 70) {
      _near = sb.name;
      break;
    }
  }
  setNearShopName(_near);

  // Update UI
  updateHUD();
}

export function updatePlayer() {
  if (!player || !player.alive) return;

  if (player.inVehicle) {
    const v = player.inVehicle;
    const speed = Math.hypot(v.vx, v.vy);

    let turnRate = 0.035 + Math.max(0, 0.045 - speed * 0.006);
    turnRate = Math.max(0.02, Math.min(0.07, turnRate));

    if (actionHeld("left")) v.angle -= turnRate;
    if (actionHeld("right")) v.angle += turnRate;

    let accelForce = 0;
    if (actionHeld("up")) {
      accelForce = v.type.accel;
    } else if (actionHeld("down")) {
      if (speed > 0.5) {
        accelForce = -v.type.accel * 1.2;
      } else {
        accelForce = -v.type.accel * 0.7;
      }
    }

    v.vx += Math.cos(v.angle) * accelForce;
    v.vy += Math.sin(v.angle) * accelForce;

    if (Math.abs(accelForce) > 0.001) {
      v.vx *= 0.97;
      v.vy *= 0.97;
    } else {
      v.vx *= 0.94;
      v.vy *= 0.94;
    }

    const stx = Math.floor(v.x / CFG.TILE);
    const sty = Math.floor(v.y / CFG.TILE);
    let speedMul = 1.0;
    if (stx >= 0 && stx < CFG.COLS && sty >= 0 && sty < CFG.ROWS) {
      const stile = getTile(stx, sty);
      if (stile === T.SIDEWALK || stile === T.PAVEMENT) speedMul = 0.9;
      else if (stile === T.PARK) speedMul = 0.75;
    }
    const surfaceSpeed = v.speed * speedMul;

    const currentSpeed = Math.hypot(v.vx, v.vy);
    if (currentSpeed > surfaceSpeed) {
      v.vx = (v.vx / currentSpeed) * surfaceSpeed;
      v.vy = (v.vy / currentSpeed) * surfaceSpeed;
    }
    if (currentSpeed < 0.05 && accelForce === 0) {
      v.vx = 0;
      v.vy = 0;
    }

    const nx = v.x + v.vx;
    const ny = v.y + v.vy;
    if (isOnRoad(nx, ny) || isWalkable(nx, ny)) {
      v.x = nx;
      v.y = ny;
    } else if (isOnRoad(nx, v.y)) {
      v.x = nx;
      v.vy *= -0.3;
    } else if (isOnRoad(v.x, ny)) {
      v.y = ny;
      v.vx *= -0.3;
    } else {
      v.vx *= -0.5;
      v.vy *= -0.5;
    }

    player.x = v.x;
    player.y = v.y;
    player.angle = v.angle;
  } else {
    let dx = 0, dy = 0;
    if (actionHeld("up")) dy = -1;
    if (actionHeld("down")) dy = 1;
    if (actionHeld("left")) dx = -1;
    if (actionHeld("right")) dx = 1;

    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      dx /= len;
      dy /= len;
      // When aiming, face mouse; otherwise face movement direction
      if (isAiming && player.onFoot && player.alive) {
        const mdx = worldMouseX - player.x;
        const mdy = worldMouseY - player.y;
        if (Math.hypot(mdx, mdy) > 5) player.angle = Math.atan2(mdy, mdx);
      } else {
        player.angle = Math.atan2(dy, dx);
      }

      // Aiming slows walking speed by 2.5x while right mouse is held (on foot)
      const aiming = isAiming && player.onFoot && player.alive;
      const effectiveSpeed = aiming ? player.speed / 2.5 : player.speed;

      const nx = player.x + dx * effectiveSpeed;
      const ny = player.y + dy * effectiveSpeed;

      if (isWalkable(nx, ny)) {
        player.x = nx;
        player.y = ny;
      } else if (isWalkable(nx, player.y)) {
        player.x = nx;
      } else if (isWalkable(player.x, ny)) {
        player.y = ny;
      }
    } else if (isAiming && player.onFoot && player.alive) {
      // Even when not moving, keep player facing mouse while aiming
      const dxm = worldMouseX - player.x;
      const dym = worldMouseY - player.y;
      if (Math.hypot(dxm, dym) > 5) {
        player.angle = Math.atan2(dym, dxm);
      }
    }
  }
}
