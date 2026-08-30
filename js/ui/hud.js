// ======================== HUD ========================
// Extracted from game.js:52742-52749, 53772-53800 - i18n integrated
import { CFG, WEAPONS } from "../core/config.js?v=25";
import { healthFill, moneySpan, ammoSpan, wantedEl, notifEl, weaponNameEl, ammoMaxEl } from "../core/domRefs.js?v=25";
import { player } from "../entities/player.js?v=25";
import { cam, W, H, zoom } from "../core/canvas.js?v=25";
import { worldMouseX, worldMouseY, mouseX, mouseY, setWorldMouseX, setWorldMouseY } from "../input/inputState.js?v=25";
import { t, getWeaponName } from "./i18n.js?v=25";

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

export function updateSuspicionUI(suspicion, dist, minD, maxD, theftHold, theftDuration){
  const container = document.getElementById("suspicionContainer");
  const fill = document.getElementById("suspicionFill");
  const val = document.getElementById("suspicionValue");
  const theftEl = document.getElementById("theftProgress");
  if(!container || !fill) return;
  // Show container if suspicion relevant or theft progress
  const showSuspicion = typeof suspicion==="number" && suspicion>0.5;
  const showTheft = typeof theftHold==="number" && typeof theftDuration==="number" && theftDuration>0;
  if(showSuspicion || showTheft){
    container.style.display = "block";
  } else {
    // Hide if no active suspicion and no theft in progress (but keep visible if theftHold>0)
    if((!showTheft || theftHold===0) && suspicion<1){
      container.style.display = "none";
      return;
    }
    if(suspicion<1 && !showTheft) { container.style.display="none"; return; }
    container.style.display="block";
  }
  if(typeof suspicion==="number"){
    const pct = Math.max(0, Math.min(100, suspicion));
    fill.style.width = pct + "%";
    if(val) val.textContent = Math.round(pct) + "%";
    if(pct>80) fill.style.background = "linear-gradient(90deg, #ff3366, #ff0000)";
    else if(pct>50) fill.style.background = "linear-gradient(90deg, #ffaa00, #ff3366)";
    else fill.style.background = "linear-gradient(90deg, #ffcc00, #ff8800)";
  }
  if(theftEl){
    if(showTheft){
      theftEl.style.display = "block";
      const sec = (theftHold/1000).toFixed(1);
      const total = (theftDuration/1000).toFixed(0);
      theftEl.textContent = `Hold Space: ${sec} / ${total}s` + (typeof dist==="number" ? ` | Dist: ${Math.round(dist)}` : "");
      // Also update suspicion label
      const label = document.getElementById("suspicionLabel");
      if(label) label.textContent = "🦹 Theft Progress";
    } else {
      theftEl.style.display = "none";
      const label = document.getElementById("suspicionLabel");
      if(label) label.textContent = "👁️ Suspicion";
    }
  }
}

export function hideSuspicionUI(){
  const c=document.getElementById("suspicionContainer");
  if(c) c.style.display="none";
}
