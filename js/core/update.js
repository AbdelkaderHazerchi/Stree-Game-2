// ======================== UPDATE ========================
// Extracted from game.js:52751-52888 - no logic changed
import { CFG, T } from "./config.js?v=26";
import { G } from "./config.js?v=26";
import { gameState, setGameState } from "./state.js?v=26";
import { player } from "../entities/player.js?v=26";
import { vehicles, isWalkable, isOnRoad, updateExplosions } from "../entities/vehicles.js?v=26";
import { npcs, lootItems } from "../entities/npcs.js?v=26";
import { police } from "../entities/police.js?v=26";
import { getTile } from "../map/mapUtils.js?v=26";
import { specialBuildings } from "../map/mapState.js?v=26";
import { act, actJust, isAiming, worldMouseX, worldMouseY, keys } from "../input/inputState.js?v=26";
import { actionJust, actionHeld } from "../input/keyboard.js?v=26";
import { updateInput } from "../input/keyboard.js?v=26";
import { closeInventory, toggleInventory, switchWeapon, switchWeaponSlot } from "../ui/inventory.js?v=26";
import { handleEnterExit, handleHorn, cancelMission } from "../input/keyboard.js?v=26";
import { fireWeapon } from "../combat/shooting.js?v=26";
import { updateNPCs } from "../entities/npcs.js?v=26";
import { updateGangs } from "../ai/gangs.js?v=26";
import { updatePolice } from "../entities/police.js?v=26";
import { updateBullets } from "../entities/bullets.js?v=26";
import { updateLoot } from "../entities/npcs.js?v=26";
import { updateTraffic } from "../ai/traffic.js?v=26";
import { updateCamera, updateHUD, updateWantedUI } from "../ui/hud.js?v=26";
import { currentMission, missionGivers, usingSequentialMissions, quests } from "../missions/missionState.js?v=26";
import { updateMission, startMission, getActiveMissionGiver, getVisibleStartGivers } from "../missions/missionSystem.js?v=26";
import { showPauseMenu } from "../ui/menu.js?v=26";
import { SHOPS, setNearShopName } from "../ui/shop.js?v=26";
import { updateCityMusic, updateMenuMusic, handleMachineGunTrigger } from "../audio/sounds.js?v=26";
import { getCurrentWeapon } from "../combat/shooting.js?v=26";
import { isMeetingActive, closeMeeting, advanceMeeting } from "../ui/meeting.js?v=26";
import { isChatActive, advanceChat, startRandomChatNearPlayer, closeChat, getNearbyNpc, getCurrentChat } from "../ui/chat.js?v=26";

export function update() {
  if (!player || !player.alive) return;

  // Input (keyboard + gamepad)
  updateInput();

  // Chat: ESC closes chat before pausing, E advances chat
  if (isChatActive()) {
    if (actJust.pause || (keys && (keys["escape"] || keys["Escape"]))) {
      closeChat();
      return;
    }
    if (actJust.enterExit) {
      advanceChat();
      return;
    }
  }

  // Meeting: ESC closes meeting before pausing, E advances meeting (single advance, prevents skip)
  if (isMeetingActive()) {
    if (actJust.pause || (keys && (keys["escape"] || keys["Escape"]))) {
      closeMeeting();
      return;
    }
    if (actJust.enterExit) {
      advanceMeeting();
      return;
    }
  }

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
    // Meeting dialog: E/ESC handled at top (single advance), here only handle inventory/cancel/horn and block other actions
    if (isMeetingActive()) {
      if (actionJust("inventory") || actionJust("cancelMission")) {
        closeMeeting();
      }
      if (actionJust("horn")) handleHorn();
      // Block all other actions while meeting active (E/ESC already handled at top with return)
    } else if (isChatActive()) {
      // Generic NPC chat: E near any NPC picks random chat (priority: meeting > shop/vehicle > chat)
      if (actionJust("enterExit")) {
        advanceChat();
      } else if (actionJust("pause") || (keys && (keys["escape"] || keys["Escape"]))) {
        closeChat();
      }
      if (actionJust("inventory") || actionJust("cancelMission")) {
        closeChat();
      }
      // While chatting, still allow horn etc but block vehicle/shop enter
      if (actionJust("horn")) handleHorn();
      // Don't process other enterExit actions while chatting
    } else {
      if (actionJust("enterExit")) {
        let handledAsChat = false;
        try {
          let nearShop = false;
          for(const sb of specialBuildings){
            if(!SHOPS[sb.name]) continue;
            const sx = sb.x * CFG.TILE + CFG.TILE/2;
            const sy = sb.y * CFG.TILE + CFG.TILE/2;
            if(Math.hypot(player.x - sx, player.y - sy) < 70){ nearShop = true; break; }
          }
          let nearVehicle = false;
          if(!nearShop){
            for(const v of vehicles){
              if(v.occupied || v.hidden || v.exploding) continue;
              if(Math.hypot(player.x - v.x, player.y - v.y) < 80){ nearVehicle = true; break; }
            }
          }
          let inMeetingRadius = false;
          if(currentMission && currentMission.stages && currentMission.stages[currentMission.stage]?.type==="meeting"){
            const st = currentMission.stages[currentMission.stage];
            if(st && typeof st.x==="number" && Math.hypot(player.x - st.x, player.y - st.y) < (st.radius||55)){
              inMeetingRadius = true;
            }
          }
          if(!nearShop && !nearVehicle && !inMeetingRadius){
            const npc = getNearbyNpc(70);
            if(npc){
              handledAsChat = startRandomChatNearPlayer();
            }
          }
        } catch(e){ try{ handledAsChat = startRandomChatNearPlayer(); }catch{} }
        if(!handledAsChat){
          handleEnterExit();
        }
      }
      if (actionJust("horn")) handleHorn();
      if (actionJust("cancelMission")) cancelMission();
      if (actionJust("inventory")) toggleInventory();
      if (actionJust("weaponNext")) switchWeapon(1);
      if (actionJust("weaponSlot1")) switchWeaponSlot(0);
      if (actionJust("weaponSlot2")) switchWeaponSlot(1);
      if (actionJust("weaponSlot3")) switchWeaponSlot(2);
      if (actionJust("weaponSlot4")) switchWeaponSlot(3);
      if (actionJust("weaponSlot5")) switchWeaponSlot(4);
      if (act.shoot && player.shootCooldown <= 0) fireWeapon();
    }
  }

  // Machine gun loop: stop when trigger lifted (gun2_shot.mp3)
  try {
    const cw = getCurrentWeapon();
    const curName = cw ? player.weapons[player.currentWeapon] : null;
    handleMachineGunTrigger(act.shoot, curName);
  } catch {}

  // City music: loops during gameplay not in pause/menu; menu music loops only in MENU
  try { updateCityMusic(gameState, G); } catch {}
  try { updateMenuMusic(gameState, G); } catch {}

  // Shoot cooldown
  if (player.shootCooldown > 0) player.shootCooldown -= 16;

  // Player movement (freeze while chatting)
  if (isChatActive() || isMeetingActive()) {
    // Auto-close if moved far from chat/meeting NPC
    try {
      if (isChatActive()) {
        const cur = getCurrentChat();
        if (cur && cur.npc) {
          const d = Math.hypot(player.x - cur.npc.x, player.y - cur.npc.y);
          if (d > 130) closeChat();
        }
      }
      if (isMeetingActive() && currentMission && currentMission.data && currentMission.data.meetingPos) {
        const d = Math.hypot(player.x - currentMission.data.meetingPos.x, player.y - currentMission.data.meetingPos.y);
        if (d > 130) closeMeeting();
      }
    } catch {}
    // Freeze player during meeting/chat
  } else {
    updatePlayer();
  }
  // Also auto-close check after movement (in case just unfrozen? already handled)
  try {
    if (isChatActive()) {
      const cur2 = getCurrentChat();
      if (cur2 && cur2.npc) {
        const d2 = Math.hypot(player.x - cur2.npc.x, player.y - cur2.npc.y);
        if (d2 > 130) closeChat();
      }
    }
    if (isMeetingActive() && currentMission && currentMission.data && currentMission.data.meetingPos) {
      const d2 = Math.hypot(player.x - currentMission.data.meetingPos.x, player.y - currentMission.data.meetingPos.y);
      if (d2 > 130) closeMeeting();
    }
  } catch {}

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

  // Wanted stars decay is now handled in police.js (6 squares / 20s)

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
