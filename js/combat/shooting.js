// ======================== SHOOTING ========================
// Extracted from game.js:52528-52583 - no logic changed
import { CFG, WEAPONS } from "../core/config.js?v=25";
import { bullets } from "../entities/bullets.js?v=25";
import { player } from "../entities/player.js?v=25";
import { isTouchDevice, touchAimAngle } from "../input/touch.js?v=25";
import { worldMouseX, worldMouseY } from "../input/inputState.js?v=25";
import { showNotification, updateHUD } from "../ui/hud.js?v=25";

export function getCurrentWeapon() {
  if (!player || !player.weapons.length) return null;
  const wName = player.weapons[player.currentWeapon];
  return WEAPONS[wName] || null;
}

export function shootBullet(
  ax,
  ay,
  angle,
  isPlayer = true,
  spread = 0,
  bulletSpeed = 0,
) {
  const a = angle + (Math.random() - 0.5) * spread * 2;
  const spd = bulletSpeed || CFG.BULLET_SPEED;
  bullets.push({
    x: ax,
    y: ay,
    vx: Math.cos(a) * spd,
    vy: Math.sin(a) * spd,
    angle: a,
    life: Math.floor((15 * CFG.TILE) / (bulletSpeed || CFG.BULLET_SPEED)),
    isPlayer: isPlayer,
    size: 3,
  });
}

export function fireWeapon() {
  if (!player.alive || player.shootCooldown > 0) return;
  const w = getCurrentWeapon();
  if (!w) return;
  const wName = player.weapons[player.currentWeapon];
  if ((player.ammo[wName] || 0) <= 0) {
    showNotification("🔫 لا ذخيرة!");
    return;
  }
  const target = player.inVehicle || player;
  let angle;
  if (isTouchDevice && !player.inVehicle) {
    angle = touchAimAngle !== null ? touchAimAngle : player.angle;
  } else if (isTouchDevice && player.inVehicle) {
    angle = player.angle;
  } else {
    const dx = worldMouseX - target.x;
    const dy = worldMouseY - target.y;
    angle = Math.atan2(dy, dx);
  }
  for (let i = 0; i < w.bullets; i++) {
    shootBullet(target.x, target.y, angle, true, w.spread, CFG.BULLET_SPEED);
  }
  player.ammo[wName] = Math.max(0, (player.ammo[wName] || 0) - w.ammoPerShot);
  player.shootCooldown = w.fireRate;
  updateHUD();
}
