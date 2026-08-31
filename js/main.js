// ======================== MAIN ENTRY ========================
// Extracted from game.js:54778-54848 + 55391-55438 - no logic changed
// Barrel imports all modules to preserve original load order and side-effects

// Core
import { CFG, T, G, SAVE_KEY, applyDifficulty, DIFFICULTY_PRESETS } from "./core/config.js?v=26";
import { canvas, ctx, W, H, zoom, miniCanvas, miniCtx, resizeCanvas } from "./core/canvas.js?v=26";
import * as DomRefs from "./core/domRefs.js?v=26";
import { gameState, gameOver, currentSaveName, setGameState } from "./core/state.js?v=26";
import { gameLoop, initGame, introVideo } from "./core/gameLoop.js?v=26";

// Assets
import { TILE_ASSETS, ROAD_CROSSWALK_IMG, SAND_IMG } from "./assets/tileAssets.js?v=26";
import { VEHICLE_ASSETS } from "./assets/vehicleAssets.js?v=26";
import { preloadAssets } from "./assets/preload.js?v=26";

// Map
import { MAP_DATA, LS_ZONES } from "./map/mapData.js?v=26";
import { map, buildings, specialBuildings, buildingColor, buildingHeight, PALETTES } from "./map/mapState.js?v=26";
import { getTile, setTile, computeTile, loadFullMap } from "./map/mapUtils.js?v=26";
import { initMap, loadMapFromData, generateBuildingColors, generateMap, placeSpecial, LS_CITY_POLYGON, LS_HARBOR_BAY, getZone } from "./map/mapGenerator.js?v=26";

// Entities
import { player, createPlayer, playerDie, respawnPlayer } from "./entities/player.js?v=26";
import { vehicles, VEHICLE_TYPES, spawnVehicles, isOnRoad, isWalkable } from "./entities/vehicles.js?v=26";
import { npcs, lootItems, spawnNPCs, updateNPCs, killNPC, AMMO_TYPES } from "./entities/npcs.js?v=26";
import { police, updatePolice } from "./entities/police.js?v=26";
import { bullets, updateBullets } from "./entities/bullets.js?v=26";

// Missions
import { missionGivers, currentMission, allMissions } from "./missions/missionState.js?v=26";
import { generateMissions, startMission, updateMission } from "./missions/missionSystem.js?v=26";

// Combat
import { getCurrentWeapon, shootBullet, fireWeapon } from "./combat/shooting.js?v=26";

// AI
import { findPath } from "./ai/pathfinding.js?v=26";
import { updateGangs } from "./ai/gangs.js?v=26";
import { updateTraffic, pickRandomDest, chooseBestDir } from "./ai/traffic.js?v=26";

// Input
import { SETTINGS, KEY_NAMES, setLanguage, setDifficulty } from "./input/settings.js?v=26";
import { act, actJust, actPrev, keys, worldMouseX } from "./input/inputState.js?v=26";
import { updateInput, actionHeld, rebindKey, openSettings, closeSettings, resetKeybinds, buildKeybindList, keyDisplay } from "./input/keyboard.js?v=26";
import { touchHold, initTouchControls } from "./input/touch.js?v=26";
import { t, applyI18n, translations } from "./ui/i18n.js?v=26";

// UI
import { updateHUD, updateWantedUI, showNotification, updateCamera } from "./ui/hud.js?v=26";
import { toggleInventory, renderInventory } from "./ui/inventory.js?v=26";
import { renderMinimap } from "./ui/minimap.js?v=26";
import { getSaves, saveGame, startNewGame, populateSaveSlots, showPauseMenu, hidePauseMenu, showMainMenu } from "./ui/menu.js?v=26";
import { SHOPS, openShop } from "./ui/shop.js?v=26";

// Render
import { render } from "./render/renderer.js?v=26";

// Audio
import { initSounds } from "./audio/sounds.js?v=26";

// Chat (generic NPC chat)
import { initChats, isChatActive, closeChat } from "./ui/chat.js?v=26";

// Expose settings globals for legacy inline handlers (fixes ReferenceError)
if (typeof window !== "undefined") {
  window.SETTINGS = SETTINGS;
  window.KEY_NAMES = KEY_NAMES;
  window.rebindKey = rebindKey;
  window.openSettings = openSettings;
  window.closeSettings = closeSettings;
  window.resetKeybinds = resetKeybinds;
  window.buildKeybindList = buildKeybindList;
  window.keyDisplay = keyDisplay;
  window.t = t;
  window.applyI18n = applyI18n;
  window.applyDifficulty = applyDifficulty;
}

// Apply saved difficulty & language immediately (before game init)
try { applyDifficulty(SETTINGS.difficulty); } catch (e) { console.warn("applyDifficulty failed", e); }
try { applyI18n(); } catch (e) { console.warn("applyI18n failed", e); }
try { initSounds(); } catch (e) { console.warn("initSounds failed", e); }
try { initChats(); } catch (e) { console.warn("initChats failed", e); }

// Re-export for global debugging (preserves original window globals without polluting)
export { CFG, T, G, player, vehicles, npcs, police, bullets, currentMission };

// ======================== MENU BUTTONS ========================
// Verbatim from game.js:54778-54848 (kept here as entry-point wiring; js/ui/menu.js contains same definitions for modular use)
// === MENU BUTTONS ===
document.getElementById("newGameBtn").onclick = () => {
  document.getElementById("newGameDialog").style.display = "flex";
  document.getElementById("saveNameInput").value = "";
  document.getElementById("saveNameInput").focus();
};
document.getElementById("continueBtn").onclick = () => {
  populateSaveSlots("loadSlots", "load");
  document.getElementById("loadDialog").style.display = "flex";
};
document.getElementById("mainSettingsBtn").onclick = () => {
  openSettings();
};
let uiHidden = false;
function resetUIHidden() {
  uiHidden = false;
  const gc = document.getElementById("gameContainer");
  if (gc) gc.classList.remove("ui-hidden");
  document.body.classList.remove("ui-hidden");
  document.documentElement.classList.remove("ui-hidden");
}
function toggleUIHidden() {
  uiHidden = !uiHidden;
  const gc = document.getElementById("gameContainer");
  if (gc) {
    if (uiHidden) gc.classList.add("ui-hidden");
    else gc.classList.remove("ui-hidden");
  }
  if (uiHidden) {
    document.body.classList.add("ui-hidden");
    document.documentElement.classList.add("ui-hidden");
    console.log("[UI] hidden, state=", gameState);
  } else {
    document.body.classList.remove("ui-hidden");
    document.documentElement.classList.remove("ui-hidden");
    console.log("[UI] shown, state=", gameState);
  }
}
// Expose for menu.js to reset on load
window.resetUIHidden = resetUIHidden;
window.toggleUIHidden = toggleUIHidden;
function confirmNewGame() {
  const locale = SETTINGS.language === "en" ? "en" : "ar";
  const prefix = SETTINGS.language === "en" ? "Save " : "حفظ ";
  const name =
    document.getElementById("saveNameInput").value.trim() ||
    prefix + new Date().toLocaleDateString(locale);
  resetUIHidden();
  try {
    startNewGame(name);
  } catch (e) {
    console.error("[confirmNewGame] startNewGame failed", e);
  }
  try {
    saveGame(name);
  } catch (e) {
    console.error("[confirmNewGame] saveGame failed", e);
  }
}
document.getElementById("startNewBtn").onclick = confirmNewGame;
document.getElementById("saveNameInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") confirmNewGame();
});
document.getElementById("cancelNewBtn").onclick = () => {
  document.getElementById("newGameDialog").style.display = "none";
};
document.getElementById("resumeBtn").onclick = () => {
  hidePauseMenu();
  setGameState(G.PLAYING);
};
document.getElementById("saveGameBtn").onclick = () => {
  populateSaveSlots("saveSlots", "save");
  document.getElementById("saveDialog").style.display = "flex";
};
document.getElementById("settingsBtn").onclick = () => {
  hidePauseMenu();
  openSettings();
};
document.getElementById("quitToMenuBtn").onclick = () => {
  hidePauseMenu();
  resetUIHidden();
  showMainMenu();
};
document.getElementById("cancelSaveBtn").onclick = () => {
  document.getElementById("saveDialog").style.display = "none";
  showPauseMenu();
};
document.getElementById("cancelLoadBtn").onclick = () => {
  document.getElementById("loadDialog").style.display = "none";
};

// Settings dialog wiring (keyboard-only, fixes inline onclick)
document.getElementById("closeSettingsBtn")?.addEventListener("click", closeSettings);
document.getElementById("resetKeybindsBtn")?.addEventListener("click", resetKeybinds);
// Clicking outside dialog box should close (optional UX)
document.getElementById("settingsDialog")?.addEventListener("click", (e) => {
  if (e.target.id === "settingsDialog") closeSettings();
});

// Settings tabs — reorganized General vs Controls
document.querySelectorAll(".settings-tab").forEach(btn => {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll(".settings-tab").forEach(b => { b.classList.remove("active"); b.setAttribute("aria-selected","false"); });
    document.querySelectorAll(".settings-panel").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    btn.setAttribute("aria-selected","true");
    const panel = document.getElementById(tab === "general" ? "settingsGeneral" : "settingsControls");
    if (panel) panel.classList.add("active");
  });
});
// Language selector
const langSelect = document.getElementById("langSelect");
if (langSelect) {
  langSelect.value = SETTINGS.language;
  langSelect.addEventListener("change", () => {
    const newLang = langSelect.value;
    setLanguage(newLang);
    applyI18n();
    buildKeybindList();
    const desc = document.getElementById("difficultyDesc");
    if (desc) desc.textContent = t(`diff.${SETTINGS.difficulty}.desc`);
    try { showNotification(t(newLang === "ar" ? "notif.lang.ar" : "notif.lang.en")); } catch {}
  });
}
// Difficulty buttons
function updateDifficultyUI() {
  const diff = SETTINGS.difficulty;
  document.querySelectorAll(".diff-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.diff === diff);
  });
  const desc = document.getElementById("difficultyDesc");
  if (desc) desc.textContent = t(`diff.${diff}.desc`);
}
updateDifficultyUI();
document.querySelectorAll(".diff-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const diff = btn.dataset.diff;
    if (!diff || diff === SETTINGS.difficulty) return;
    setDifficulty(diff);
    applyDifficulty(diff);
    updateDifficultyUI();
    try {
      if (player) {
        const pct = player.maxHealth ? (player.health / player.maxHealth) : 1;
        player.maxHealth = CFG.MAX_HEALTH;
        player.health = Math.round(player.maxHealth * pct);
        if (player.health > player.maxHealth) player.health = player.maxHealth;
        if (player.health < 1) player.health = 1;
        updateHUD();
      }
    } catch {}
    try { showNotification(t(`notif.diff.${diff}`)); } catch {}
  });
});
window.addEventListener("languageChanged", () => {
  applyI18n();
  buildKeybindList();
  updateDifficultyUI();
});

// ESC handler
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    // Chat has priority
    try { if(isChatActive()){ closeChat(); e.preventDefault(); e.stopPropagation(); return; } } catch{}
    const sd = document.getElementById("settingsDialog");
    if (sd && sd.style.display === "flex") {
      closeSettings();
      return;
    }
    // Also close chat dialog if open
    try{ const cd=document.getElementById("chatDialog"); if(cd && cd.style.display==="flex"){ closeChat(); return; } }catch{}
    if (gameState === G.PLAYING && player && player.alive) {
      setGameState(G.PAUSED);
      showPauseMenu();
    } else if (gameState === G.PAUSED) {
      hidePauseMenu();
      setGameState(G.PLAYING);
    } else if (gameState === G.MENU) {
      // Close any open dialogs
      document.getElementById("newGameDialog").style.display = "none";
      document.getElementById("saveDialog").style.display = "none";
      document.getElementById("loadDialog").style.display = "none";
      if (sd) sd.style.display = "none";
    }
  }
});

// F2: Hide / Show UI during gameplay (F2 toggles .ui-hidden on #gameContainer) - robust capture + F4 backup for skip
function isF2(e) {
  return e.key === "F2" || e.code === "F2" || e.keyCode === 113 || e.which === 113;
}
function isF4(e) {
  return e.key === "F4" || e.code === "F4" || e.keyCode === 115 || e.which === 115;
}
function handleF2(e) {
  if (!isF2(e)) return;
  if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable)) return;
  e.preventDefault();
  e.stopPropagation();
  if (e.stopImmediatePropagation) e.stopImmediatePropagation();
  toggleUIHidden();
  console.log("[F2] toggleUIHidden, uiHidden=", uiHidden, "gameState=", gameState);
}
function handleF4(e) {
  if (!isF4(e)) return;
  if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable)) return;
  e.preventDefault();
  e.stopPropagation();
  if (e.stopImmediatePropagation) e.stopImmediatePropagation();
  // Try to skip intro if still present (imported dynamically to avoid circular)
  try {
    const hint = document.getElementById("skipHint");
    const vid = document.getElementById("introVideo");
    if (vid && vid.parentNode) {
      // Call skipIntro from gameLoop if available
      if (typeof window.skipIntro === "function") window.skipIntro();
      else {
        // Fallback direct removal + init
        try { vid.pause(); } catch {}
        vid.remove();
        if (hint && hint.parentNode) hint.remove();
        // dynamic import to init game if needed
        import("./core/gameLoop.js").then(m => { if (m.skipIntro) m.skipIntro(); });
      }
      console.log("[F4] skipIntro triggered");
    }
  } catch (err) { console.warn("F4 handler error", err); }
}
// Use capture phase on both window and document to beat browser defaults and other handlers
window.addEventListener("keydown", handleF2, true);
document.addEventListener("keydown", handleF2, true);
window.addEventListener("keyup", (e) => { if (isF2(e)) { e.preventDefault(); e.stopPropagation(); } }, true);
// F4 backup listener (primary is in gameLoop.js, this is redundant for robustness)
window.addEventListener("keydown", handleF4, true);
document.addEventListener("keydown", handleF4, true);
window.addEventListener("keyup", (e) => { if (isF4(e)) { e.preventDefault(); e.stopPropagation(); } }, true);

// Note: Game loop auto-starts via js/core/gameLoop.js side-effect (introVideo + initGame + gameLoop)
// This barrel ensures correct import order so all side-effects execute as in original game.js
console.log("SG modules loaded - original game.js preserved, now running via ES modules");
