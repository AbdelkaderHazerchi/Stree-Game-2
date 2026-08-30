// ======================== GAME LOOP ========================
// Extracted from game.js:55391-55438 - no logic changed
import { G } from "./config.js?v=25";
import { gameState, gameOver, setGameOver } from "./state.js?v=25";
import { preloadAssets } from "../assets/preload.js?v=25";
import { initMap } from "../map/mapGenerator.js?v=25";
import { loadFullMap } from "../map/mapUtils.js?v=25";
import { player, createPlayer, setPlayer } from "../entities/player.js?v=25";
import { spawnVehicles } from "../entities/vehicles.js?v=25";
import { spawnNPCs } from "../entities/npcs.js?v=25";
import { generateMissions } from "../missions/missionSystem.js?v=25";
import { updateWantedUI, updateHUD } from "../ui/hud.js?v=25";
import { updateMissionUI } from "../missions/missionSystem.js?v=25";
import { initTouchControls } from "../input/touch.js?v=25";
import { showMainMenu } from "../ui/menu.js?v=25";
import { invPanel } from "./domRefs.js?v=25";
import { render } from "../render/renderer.js?v=25";
import { update } from "./update.js?v=25";
import { cam } from "./canvas.js?v=25";

export function gameLoop() {
  if (gameState === G.PLAYING && !gameOver && player && player.alive) {
    update();
  }
  render();
  requestAnimationFrame(gameLoop);
}

// ======================== INIT ========================
export async function initGame() {
  await preloadAssets();
  initMap();
  loadFullMap();
  // createPlayer now internally resolves spawn via mapState/window._mapSpawnPoint (single source)
  const p = createPlayer();
  setPlayer(p);
  if (typeof window !== "undefined") window.player = p;
  // Sync camera to spawn immediately - ensures engine displays player at correct coordinates
  try { if (cam) { cam.x = p.x; cam.y = p.y; } } catch {}
  spawnVehicles();
  spawnNPCs();
  generateMissions();
  updateWantedUI();
  updateHUD();
  updateMissionUI();
  if (invPanel) invPanel.style.display = "none";

  showMainMenu();
  setGameOver(false);
}

// Start with intro video -- F4 skips intro (robust, prevents browser default)
export const introVideo = document.getElementById("introVideo");
let introFinished = false;
export async function skipIntro() {
  if (introFinished) return;
  introFinished = true;
  if (introVideo && introVideo.parentNode) {
    try { introVideo.pause(); } catch {}
    introVideo.remove();
  } else if (introVideo) {
    try { introVideo.remove(); } catch {}
  }
  const hint = document.getElementById("skipHint");
  if (hint && hint.parentNode) hint.remove();
  await initGame();
  initTouchControls();
  gameLoop();
}
// Expose globally for main.js fallback
if (typeof window !== "undefined") window.skipIntro = skipIntro;
function isF4(e) {
  return e.key === "F4" || e.code === "F4" || e.keyCode === 115 || e.which === 115;
}
function handleF4Skip(e) {
  if (!isF4(e)) return;
  if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable)) return;
  // Prevent browser assigning any other function to F4 (e.g., Alt+F4, address bar, etc.)
  e.preventDefault();
  e.stopPropagation();
  if (e.stopImmediatePropagation) e.stopImmediatePropagation();
  console.log("[F4] skipIntro triggered, introFinished=", introFinished);
  skipIntro();
}
if (introVideo) {
  introVideo.play().catch(()=>{});
  introVideo.addEventListener("ended", () => {
    skipIntro();
  });
  // Robust listeners: capture phase on both window and document, plus keyup to fully block
  window.addEventListener("keydown", handleF4Skip, true);
  document.addEventListener("keydown", handleF4Skip, true);
  window.addEventListener("keyup", (e) => { if (isF4(e)) { e.preventDefault(); e.stopPropagation(); } }, true);
  document.addEventListener("keyup", (e) => { if (isF4(e)) { e.preventDefault(); e.stopPropagation(); } }, true);
  // Also block keypress
  window.addEventListener("keypress", (e) => { if (isF4(e)) { e.preventDefault(); e.stopPropagation(); } }, true);
} else {
  (async () => {
    await skipIntro();
  })();
  // Still register F4 handler even if no video (no-op but prevents default)
  window.addEventListener("keydown", handleF4Skip, true);
  document.addEventListener("keydown", handleF4Skip, true);
}
