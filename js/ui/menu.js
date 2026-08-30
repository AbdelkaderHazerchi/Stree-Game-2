// ======================== MENU & SAVE ========================
// Extracted from game.js:54587-54847 - no logic changed
import { CFG, G, SAVE_KEY } from "../core/config.js?v=25";
import { gameState, setGameState, currentSaveName, setCurrentSaveName } from "../core/state.js?v=25";
import { player, createPlayer, setPlayer } from "../entities/player.js?v=25";
import { police, clearPolice } from "../entities/police.js?v=25";
import { currentMission, missionsCompleted, setMissionsCompleted, quests, questStatus, activeQuestId, mainQuestIndex, setQuestStatus, setActiveQuestId, setMainQuestIndex, setQuests, setMainQuests, setSideQuests } from "../missions/missionState.js?v=25";
import { startMission, generateMissions } from "../missions/missionSystem.js?v=25";
import { updateMissionUI } from "../missions/missionSystem.js?v=25";
import { updateWantedUI, updateHUD, showNotification } from "./hud.js?v=25";
import { overlay } from "../core/domRefs.js?v=25";
import { buildings } from "../map/mapState.js?v=25";
import { initMap } from "../map/mapGenerator.js?v=25";
import { loadFullMap } from "../map/mapUtils.js?v=25";
import { cam } from "../core/canvas.js?v=25";
import { SETTINGS } from "../input/settings.js?v=25";
import { t } from "./i18n.js?v=25";

function ensurePlayer() {
  // Check imported binding first, then window fallback, then create
  let p = player;
  if (!p && typeof window !== "undefined" && window.player) p = window.player;
  if (!p) {
    try {
      p = createPlayer();
      setPlayer(p);
      if (typeof window !== "undefined") window.player = p;
      console.warn("[menu] player was undefined, created new player", p);
    } catch (e) {
      console.error("[menu] failed to create player", e);
      return null;
    }
  } else {
    // Ensure live binding is set if we used window fallback
    try { if (player !== p) setPlayer(p); } catch {}
  }
  // Ensure map is initialized (prevents black screen)
  try {
    if (!buildings || buildings.length === 0) {
      console.warn("[menu] buildings empty, initializing map");
      initMap();
      loadFullMap();
    }
  } catch (e) {
    console.warn("[menu] map init failed", e);
  }
  // Ensure global
  if (typeof window !== "undefined") window.player = p;
  return p;
}
function getPlayerSafe() {
  let p = player;
  if (!p && typeof window !== "undefined" && window.player) p = window.player;
  if (!p) p = ensurePlayer();
  return p;
}

export function getSaves() {
  try {
    return JSON.parse(localStorage.getItem(SAVE_KEY)) || [];
  } catch (e) {
    return [];
  }
}

export function saveSaves(saves) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(saves));
  } catch (e) {}
}

export function createSaveData(name) {
  const p = ensurePlayer();
  if (!p) {
    console.error("[createSaveData] player still undefined, cannot save");
    return {
      id: Date.now(),
      name: name,
      money: CFG.START_MONEY,
      x: 20 * CFG.TILE + CFG.TILE / 2,
      y: 20 * CFG.TILE + CFG.TILE / 2,
      health: CFG.MAX_HEALTH,
      wanted: 0,
      inVehicle: false,
      missionType: null,
      missionStage: 0,
      missionName: null,
      missionsCompleted: missionsCompleted,
      weapons: ["pistol"],
      currentWeapon: 0,
      ammo: { pistol: 30, smg: 0, rifle: 0, shotgun: 0 },
      color: "#3498db",
      skinColor: "#f5cba7",
      timestamp: Date.now(),
    };
  }
  const v = p.inVehicle;
  // Serialize quest state
  const qStatusObj = {};
  try { if(questStatus instanceof Map) questStatus.forEach((v,k)=> qStatusObj[k]=v); } catch {}
  return {
    id: Date.now(),
    name: name,
    money: p.money,
    x: p.x,
    y: p.y,
    health: p.health,
    wanted: p.wanted,
    inVehicle: !!v,
    missionType: currentMission ? currentMission.type : null,
    missionStage: currentMission ? currentMission.stage : 0,
    missionName: currentMission ? currentMission.name : null,
    // New quest persistence
    questId: currentMission ? (currentMission.questId || (currentMission.quest && currentMission.quest.id) || null) : null,
    activeQuestId: activeQuestId || null,
    mainQuestIndex: (typeof mainQuestIndex==="number" ? mainQuestIndex : 0),
    questStatus: qStatusObj,
    missionsCompleted: missionsCompleted,
    weapons: p.weapons,
    currentWeapon: p.currentWeapon,
    ammo: p.ammo,
    color: p.color,
    skinColor: p.skinColor,
    timestamp: Date.now(),
  };
}

export function applySaveData(data) {
  if (!data) return;
  const p = ensurePlayer();
  if (!p) {
    console.error("[applySaveData] player still undefined, cannot apply save");
    return;
  }
  p.x = data.x;
  p.y = data.y;
  p.money = data.money || CFG.START_MONEY;
  p.health = data.health || CFG.MAX_HEALTH;
  p.wanted = data.wanted || 0;
  setMissionsCompleted(data.missionsCompleted || 0);
  if (data.weapons) p.weapons = data.weapons;
  if (data.currentWeapon !== undefined) p.currentWeapon = data.currentWeapon;
  if (data.ammo) p.ammo = data.ammo;
  if (data.color) p.color = data.color;
  if (data.skinColor) p.skinColor = data.skinColor;
  if (!p.weapons || !p.weapons.length) p.weapons = ["pistol"];
  if (p.currentWeapon === undefined) p.currentWeapon = 0;
  if (!p.ammo) p.ammo = { pistol: 30, smg: 0, rifle: 0, shotgun: 0 };
  // Restore quest system if present — regenerate then apply status
  try{
    if(data.questStatus || data.activeQuestId || typeof data.mainQuestIndex==="number"){
      // Ensure quests are generated (if not already)
      if(!quests || quests.length===0){
        try { generateMissions(); } catch(e){ console.warn("generateMissions in load failed", e); }
      }
      // Restore status map
      const newMap = new Map();
      if(data.questStatus && typeof data.questStatus==="object"){
        Object.entries(data.questStatus).forEach(([k,v])=> newMap.set(k, v));
      } else if(questStatus instanceof Map){
        questStatus.forEach((v,k)=> newMap.set(k,v));
      }
      setQuestStatus(newMap);
      if(typeof data.mainQuestIndex==="number") setMainQuestIndex(data.mainQuestIndex);
      if(data.activeQuestId) setActiveQuestId(data.activeQuestId);
      // If save had active quest, try to restart it
      if(data.questId){
        // Prefer questId
        startMission(data.questId);
      } else if(data.missionType){
        startMission(data.missionType);
      }
      if (currentMission && typeof data.missionStage==="number") currentMission.stage = data.missionStage || 0;
    } else if (data.missionType) {
      startMission(data.missionType);
      if (currentMission) currentMission.stage = data.missionStage || 0;
    }
  } catch(e){ console.warn("quest restore failed", e);
    if (data.missionType) {
      try{ startMission(data.missionType); if (currentMission) currentMission.stage = data.missionStage || 0; } catch{}
    }
  }
  updateWantedUI();
  updateHUD();
  updateMissionUI();
  p.alive = true;
  clearPolice();
  // Ensure camera follows loaded player
  try {
    cam.x = p.x;
    cam.y = p.y;
  } catch (e) { console.warn("cam update failed", e); }
}

export function saveGame(slotName) {
  const saves = getSaves();
  const existing = saves.findIndex((s) => s.name === slotName);
  const data = createSaveData(slotName);
  if (existing >= 0) saves[existing] = data;
  else saves.push(data);
  saveSaves(saves);
  showNotification(t("save.saved", { name: slotName }));
}

export function loadLatestSave() {
  const saves = getSaves();
  if (saves.length === 0) return false;
  saves.sort((a, b) => b.timestamp - a.timestamp);
  applySaveData(saves[0]);
  return true;
}

export function loadSaveById(id) {
  const saves = getSaves();
  const save = saves.find((s) => s.id === id);
  if (save) {
    applySaveData(save);
    return true;
  }
  return false;
}

export function deleteSave(id) {
  let saves = getSaves();
  saves = saves.filter((s) => s.id !== id);
  saveSaves(saves);
}

export function startNewGame(name) {
  if (!name) {
    const locale = SETTINGS.language === "en" ? "en" : "ar";
    name = (SETTINGS.language === "en" ? "Save " : "حفظ ") + new Date().toLocaleDateString(locale);
  }
  setCurrentSaveName(name);
  // Ensure map is ready before player
  try {
    if (!buildings || buildings.length === 0) {
      initMap();
      loadFullMap();
      console.log("[startNewGame] map initialized");
    }
  } catch (e) { console.warn("[startNewGame] map init failed", e); }
  // Ensure player exists and reset to fresh via setPlayer (new object, live binding)
  // createPlayer now internally resolves spawn via mapState (validated)
  let fresh = createPlayer();
  setPlayer(fresh);
  if (typeof window !== "undefined") window.player = fresh;
  let p = fresh;
  clearPolice();
  setMissionsCompleted(0);
  // Reset quest system to initial (first main available, all sides available)
  try{
    // Regenerate from current map data to ensure fresh questStatus
    generateMissions();
  } catch(e){ console.warn("generateMissions in startNewGame failed", e); }
  // Reset camera to player immediately (avoid cam at 0,0)
  try {
    cam.x = p.x;
    cam.y = p.y;
  } catch (e) { console.warn("cam reset failed", e); }
  updateWantedUI();
  updateHUD();
  updateMissionUI();
  // Save fresh game state
  try {
    if (p && p.alive) {
      saveGame(name);
    }
  } catch (e) {
    console.warn("[startNewGame] save failed", e);
  }
  // Reset UI hidden state when starting new game
  const gc = document.getElementById("gameContainer");
  if (gc) gc.classList.remove("ui-hidden");
  document.body.classList.remove("ui-hidden");
  document.documentElement.classList.remove("ui-hidden");
  if (typeof window !== "undefined" && window.resetUIHidden) window.resetUIHidden();
  setGameState(G.PLAYING);
  document.getElementById("mainMenu").style.display = "none";
  document.getElementById("newGameDialog").style.display = "none";
  document.getElementById("pauseMenu").style.display = "none";
  document.getElementById("saveDialog").style.display = "none";
  document.getElementById("loadDialog").style.display = "none";
  overlay.style.display = "none";
  // Ensure render will have valid player; if map not initialized, warn
  try {
    const cam = document.getElementById("gameCanvas");
    if (cam) console.log("[startNewGame] new game started at", p.x, p.y);
  } catch {}
}

export function showPauseMenu() {
  document.getElementById("pauseMenu").style.display = "flex";
}

export function hidePauseMenu() {
  document.getElementById("pauseMenu").style.display = "none";
}

export function showMainMenu() {
  setGameState(G.MENU);
  const gc = document.getElementById("gameContainer");
  if (gc) gc.classList.remove("ui-hidden");
  document.body.classList.remove("ui-hidden");
  document.documentElement.classList.remove("ui-hidden");
  if (typeof window !== "undefined" && window.resetUIHidden) window.resetUIHidden();
  document.getElementById("mainMenu").style.display = "flex";
  document.getElementById("pauseMenu").style.display = "none";
  document.getElementById("saveDialog").style.display = "none";
  document.getElementById("loadDialog").style.display = "none";
  document.getElementById("newGameDialog").style.display = "none";
  overlay.style.display = "none";
}

export function populateSaveSlots(containerId, mode) {
  const container = document.getElementById(containerId);
  const saves = getSaves();
  container.innerHTML = "";
  if (saves.length === 0) {
    container.innerHTML =
      `<div style="color:#666;padding:20px;text-align:center">${t("save.noSaves")}</div>`;
    return;
  }
  saves.sort((a, b) => b.timestamp - a.timestamp);
  const locale = SETTINGS.language === "en" ? "en" : "ar";
  for (const s of saves) {
    const div = document.createElement("div");
    div.className = "save-slot";
    const date = new Date(s.timestamp);
    const dateStr =
      date.toLocaleDateString(locale) +
      " " +
      date.toLocaleTimeString(locale, {
        hour: "2-digit",
        minute: "2-digit",
      });
    const noMission = t("hud.noMission").replace("🎯 ","");
    div.innerHTML = `
      <div>
        <div class="name">${s.name}</div>
        <div class="info">💰 $${s.money} | ${dateStr} | ${s.missionName || noMission}</div>
      </div>
      ${mode === "load" ? '<span style="color:#888">▶</span>' : ""}
      ${mode === "save" ? "" : ""}
    `;
    if (mode === "load") {
      div.onclick = () => {
        if (loadSaveById(s.id)) {
          const gc = document.getElementById("gameContainer");
          if (gc) gc.classList.remove("ui-hidden");
          document.body.classList.remove("ui-hidden");
          document.documentElement.classList.remove("ui-hidden");
          if (typeof window !== "undefined" && window.resetUIHidden) window.resetUIHidden();
          setGameState(G.PLAYING);
          document.getElementById("loadDialog").style.display = "none";
          document.getElementById("mainMenu").style.display = "none";
          overlay.style.display = "none";
          showNotification(t("load.loaded", { name: s.name }));
        }
      };
    } else if (mode === "save") {
      div.onclick = () => {
        saveGame(s.name);
        document.getElementById("saveDialog").style.display = "none";
        hidePauseMenu();
        setGameState(G.PLAYING);
      };
    }
    // Delete button
    const delBtn = document.createElement("button");
    delBtn.className = "delete-btn";
    delBtn.textContent = "🗑";
    delBtn.onclick = (e) => {
      e.stopPropagation();
      deleteSave(s.id);
      populateSaveSlots(containerId, mode);
    };
    div.appendChild(delBtn);
    container.appendChild(div);
  }
}


// Menu button wiring moved to js/main.js (barrel) - no logic change
