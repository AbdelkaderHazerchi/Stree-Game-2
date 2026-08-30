// ======================== HUD ========================
// Extracted from game.js:52742-52749, 53772-53800 - i18n integrated
import { CFG, WEAPONS } from "../core/config.js?v=16";
import { healthFill, moneySpan, ammoSpan, wantedEl, notifEl, weaponNameEl, ammoMaxEl } from "../core/domRefs.js?v=15";
import { player } from "../entities/player.js?v=15";
import { cam, W, H, zoom } from "../core/canvas.js?v=15";
import { worldMouseX, worldMouseY, mouseX, mouseY, setWorldMouseX, setWorldMouseY } from "../input/inputState.js?v=15";
import { t, getWeaponName } from "./i18n.js?v=16";

export function updateCamera() {
  if (!player) return;
  const target = player.inVehicle || player;
  if (!target || target.x === undefined) return;
  cam.x = target.x;
  cam.y = target.y;
  setWorldMouseX((mouseX - W / 2) / zoom + cam.x);
  setWorldMouseY((mouseY - H / 2) / zoom + cam.y);
}

export function updateHUD() {
  if (!player) return;
  const pct = Math.max(0, (player.health / player.maxHealth) * 100);
  if (healthFill) healthFill.style.width = pct + "%";
  if (moneySpan) moneySpan.textContent = player.money;
  if (player.weapons && player.weapons.length) {
    const wName = player.weapons[player.currentWeapon];
    const w = WEAPONS[wName];
    if (w && weaponNameEl) weaponNameEl.textContent = w.icon + " " + getWeaponName(wName);
    const ammo = player.ammo[wName] || 0;
    if (ammoSpan) ammoSpan.textContent = ammo;
    if (ammoMaxEl) ammoMaxEl.textContent = "∞";
  }
}

export function updateWantedUI() {
  if (!player) {
    if (wantedEl) wantedEl.innerHTML = "";
    return;
  }
  let html = "";
  for (let i = 0; i < 5; i++) {
    html += `<span class="wantedStar ${i < player.wanted ? "active" : ""}">★</span>`;
  }
  if (wantedEl) wantedEl.innerHTML = html;
}

export function showNotification(msg) {
  notifEl.textContent = msg;
  notifEl.style.opacity = 1;
  setTimeout(() => {
    notifEl.style.opacity = 0;
  }, 2000);
}
