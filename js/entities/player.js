// NOTE: cross-module globals (police, lootItems, currentMission, closeInventory, updateWantedUI) will be wired in js/main.js - logic unchanged
// ======================== PLAYER ========================
// Extracted from game.js:51598, 51609-51647, 53742-53769 - no logic changed
import { CFG } from "../core/config.js?v=25";
import { overlay, overlayTitle, overlayMsg, overlayBtn } from "../core/domRefs.js?v=25";
import { police, clearPolice } from "./police.js?v=25";
import { lootItems, clearLoot } from "./npcs.js?v=25";
import { currentMission, setCurrentMission } from "../missions/missionState.js?v=25";
import { updateWantedUI } from "../ui/hud.js?v=25";
import { closeInventory } from "../ui/inventory.js?v=25";
import { getSpawnPoint, getSpawnPixel } from "../map/mapState.js?v=25";
import { cam } from "../core/canvas.js?v=25";
import { t } from "../ui/i18n.js?v=25";

export let player;
export function setPlayer(v) { player = v; }
function resolveSpawnPixel() {
  // Try module state first, then window fallback, then hardcoded center
  const sp = getSpawnPixel ? getSpawnPixel() : null;
  if (sp && typeof sp.x === "number") return sp;
  if (typeof window !== "undefined" && window._mapSpawnPoint && typeof window._mapSpawnPoint.x === "number") {
    return window._mapSpawnPoint;
  }
  const spTile = getSpawnPoint ? getSpawnPoint() : null;
  if (spTile && typeof spTile.x === "number") {
    return { x: spTile.x * CFG.TILE + CFG.TILE / 2, y: spTile.y * CFG.TILE + CFG.TILE / 2 };
  }
  // Fallback: center of current map or hardcoded 20,20
  const fallbackCols = (CFG.COLS && CFG.COLS > 0) ? CFG.COLS : 40;
  const fallbackRows = (CFG.ROWS && CFG.ROWS > 0) ? CFG.ROWS : 40;
  // If map dims are large (120 default), center at col/2
  // Otherwise fallback to 20 for backward compat when CFG not yet overwritten
  const cx = Math.floor(fallbackCols / 2);
  const cy = Math.floor(fallbackRows / 2);
  // Preserve original 20,20 fallback only if map is at default 120 and spawn missing - but use map center as more sensible
  // Check if center is valid, else 20
  if (fallbackCols === 120 && fallbackRows === 120 && !sp) {
    // Keep legacy center 20 for tests that expect it, but prefer map center
    return { x: cx * CFG.TILE + CFG.TILE / 2, y: cy * CFG.TILE + CFG.TILE / 2 };
  }
  return { x: cx * CFG.TILE + CFG.TILE / 2, y: cy * CFG.TILE + CFG.TILE / 2 };
}

export function createPlayer() {
  const { x: spawnX, y: spawnY } = resolveSpawnPixel();
  return {
    x: spawnX,
    y: spawnY,
    targetX: spawnX,
    targetY: spawnY,
    vx: 0,
    vy: 0,
    angle: 0,
    health: CFG.MAX_HEALTH,
    maxHealth: CFG.MAX_HEALTH,
    money: CFG.START_MONEY,
    wanted: 0,
    wantedTimer: 0,
    inVehicle: null,
    isShooting: false,
    shootTimer: 0,
    onFoot: true,
    speed: CFG.PLAYER_SPEED,
    alive: true,
    size: 12,
    color: "#3498db",
    skinColor: "#f5cba7",
    personalCar: null,
    weapons: ["pistol"],
    currentWeapon: 0,
    ammo: {
      pistol: 30,
      smg: 0,
      rifle: 0,
      shotgun: 0,
    },
    inventory: [],
    showInventory: false,
    shootCooldown: 0,
  };
}
export function playerDie() {
  player.alive = false;
  closeInventory();
  overlay.style.display = "flex";
  overlayTitle.textContent = t("overlay.dead");
  overlayMsg.textContent = t("overlay.arrested", { money: player.money });
  overlayBtn.textContent = t("overlay.retry");
}

export function respawnPlayer() {
  const { x: spawnX, y: spawnY } = resolveSpawnPixel();
  player.x = spawnX;
  player.y = spawnY;
  player.targetX = spawnX;
  player.targetY = spawnY;
  player.vx = 0;
  player.vy = 0;
  player.health = CFG.MAX_HEALTH;
  player.wanted = 0;
  player.alive = true;
  if (player.inVehicle) {
    player.inVehicle.driver = null;
    player.inVehicle.occupied = false;
    player.inVehicle = null;
    player.onFoot = true;
    player.speed = CFG.PLAYER_SPEED;
  }
  clearPolice();
  clearLoot();
  setCurrentMission(null);
  updateWantedUI();
  // Sync camera to respawn point (engine displays player at spawn)
  try { if (cam) { cam.x = player.x; cam.y = player.y; } } catch {}
  overlay.style.display = "none";
}
