// ======================== CANVAS SETUP ========================
// Extracted from game.js:425-449, 52736-52740 - no logic changed
export const canvas = document.getElementById("gameCanvas");
export const ctx = canvas.getContext("2d");
export let W, H;
export let zoom = 1.0;
export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 2.5;

export let cam = { x: 0, y: 0 };

export function setZoom(v) { zoom = v; }
export function setW(v) { W = v; }
export function setH(v) { H = v; }

export function resizeCanvas() {
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W;
  canvas.height = H;
}
resizeCanvas();

window.addEventListener('resize', () => {
    const gc = document.getElementById('gameContainer');
    if (gc) {
        canvas.width = gc.clientWidth;
        canvas.height = gc.clientHeight;
        W = gc.clientWidth;
        H = gc.clientHeight;
    } else {
        resizeCanvas();
    }
});

export const miniCanvas = document.getElementById("minimapCanvas");
export const miniCtx = miniCanvas.getContext("2d");
miniCanvas.width = 180;
miniCanvas.height = 180;
