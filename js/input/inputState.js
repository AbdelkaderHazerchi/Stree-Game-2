// ======================== INPUT STATE ========================
// Extracted from game.js:122-147, 52586-52592, 52643-52645, 52712-52730 - no logic changed
import { canvas, W, H, zoom, cam, ZOOM_MIN, ZOOM_MAX, setZoom } from "../core/canvas.js?v=25";

export const act = {
  up: false,
  down: false,
  left: false,
  right: false,
  enterExit: false,
  shoot: false,
  horn: false,
  cancelMission: false,
  pause: false,
  inventory: false,
  weaponNext: false,
  weaponSlot1: false,
  weaponSlot2: false,
  weaponSlot3: false,
  weaponSlot4: false,
  weaponSlot5: false,
};
export const actJust = {
  ...act,
};
// edge-triggered (true only on press frame)
export const actPrev = {
  ...act,
};

export const keys = {};
document.addEventListener("keydown", (e) => {
  keys[e.key.toLowerCase()] = true;
});
document.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
});
export let worldMouseX = 0,
  worldMouseY = 0;

export let mouseX = 0,
  mouseY = 0;

export let mouseLeftDown = false;
export let mouseRightDown = false;
export let isAiming = false;

export function setWorldMouseX(v) { worldMouseX = v; }
export function setWorldMouseY(v) { worldMouseY = v; }
export function setMouseX(v) { mouseX = v; }
export function setMouseY(v) { mouseY = v; }
export function setMouseLeftDown(v) { mouseLeftDown = v; }
export function setMouseRightDown(v) { mouseRightDown = v; isAiming = v; }
export function setIsAiming(v) { isAiming = v; }

canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;
  worldMouseX = (mouseX - W / 2) / zoom + cam.x;
  worldMouseY = (mouseY - H / 2) / zoom + cam.y;
});

canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom - e.deltaY * 0.001));
  setZoom(newZoom);
}, { passive: false });

canvas.addEventListener("mousedown", (e) => {
  if (e.button === 0) {
    mouseLeftDown = true;
    e.preventDefault();
  } else if (e.button === 2) {
    mouseRightDown = true;
    isAiming = true;
    e.preventDefault();
  }
});
window.addEventListener("mousedown", (e) => {
  if (e.button === 0) mouseLeftDown = true;
  else if (e.button === 2) {
    mouseRightDown = true;
    isAiming = true;
  }
});
canvas.addEventListener("mouseup", (e) => {
  if (e.button === 0) mouseLeftDown = false;
  else if (e.button === 2) {
    mouseRightDown = false;
    isAiming = false;
  }
});
canvas.addEventListener("mouseleave", () => {
});
window.addEventListener("mouseup", (e) => {
  if (e.button === 0) mouseLeftDown = false;
  else if (e.button === 2) {
    mouseRightDown = false;
    isAiming = false;
  }
});
window.addEventListener("blur", () => {
  mouseLeftDown = false;
  mouseRightDown = false;
  isAiming = false;
});
canvas.addEventListener("contextmenu", (e) => e.preventDefault());

window.addEventListener("gamepadconnected", () => {
  // notification handled in hud
});
window.addEventListener("gamepaddisconnected", () => {});
