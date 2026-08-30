// ======================== PATHFINDING ========================
// Extracted from game.js:53076-53160 - no logic changed
import { CFG, T } from "../core/config.js?v=25";
import { getTile } from "../map/mapUtils.js?v=25";

export function findPath(sx, sy, ex, ey, maxSteps) {
  const startX = Math.floor(sx / CFG.TILE);
  const startY = Math.floor(sy / CFG.TILE);
  const endX = Math.floor(ex / CFG.TILE);
  const endY = Math.floor(ey / CFG.TILE);

  const h = Math.abs(endX - startX) + Math.abs(endY - startY);
  if (h > maxSteps || h === 0) return null;

  const COLS = CFG.COLS;
  const total = COLS * CFG.ROWS;
  const idx = (x, y) => y * COLS + x;

  const open = [];
  const closed = new Uint8Array(total);
  const gScore = new Float32Array(total);
  const parentX = new Int16Array(total);
  const parentY = new Int16Array(total);

  for (let i = 0; i < total; i++) gScore[i] = Infinity;

  const si = idx(startX, startY);
  gScore[si] = 0;
  open.push({ x: startX, y: startY, f: h });

  const dirs = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ];
  let iterations = 0;
  const MAX_ITER = 1500;

  while (open.length > 0 && iterations < MAX_ITER) {
    iterations++;
    let best = 0;
    for (let i = 1; i < open.length; i++) {
      if (open[i].f < open[best].f) best = i;
    }
    const cur = open.splice(best, 1)[0];
    const ci = idx(cur.x, cur.y);

    if (cur.x === endX && cur.y === endY) {
      const path = [];
      let cx = cur.x,
        cy = cur.y;
      while (cx !== startX || cy !== startY) {
        path.unshift({ x: cx, y: cy });
        const pi = idx(cx, cy);
        cx = parentX[pi];
        cy = parentY[pi];
      }
      return path;
    }

    closed[ci] = 1;

    for (const [dx, dy] of dirs) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (nx < 0 || nx >= COLS || ny < 0 || ny >= CFG.ROWS) continue;
      const ni = idx(nx, ny);
      if (closed[ni]) continue;
      const tile = getTile(nx, ny);
      if (tile === T.BUILDING || tile === T.WATER || tile === T.SPECIAL)
        continue;

      const tentG = gScore[ci] + 1;
      if (tentG < gScore[ni]) {
        parentX[ni] = cur.x;
        parentY[ni] = cur.y;
        gScore[ni] = tentG;
        const nf = tentG + Math.abs(endX - nx) + Math.abs(endY - ny);
        const existing = open.findIndex((n) => n.x === nx && n.y === ny);
        if (existing >= 0) {
          open[existing].f = nf;
        } else {
          open.push({ x: nx, y: ny, f: nf });
        }
      }
    }
  }
  return null;
}
