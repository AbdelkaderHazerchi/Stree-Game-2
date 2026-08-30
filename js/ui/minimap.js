// ======================== MINIMAP ========================
// Extracted from game.js:54454-54575 - no logic changed
import { CFG, T } from "../core/config.js?v=16";
import { miniCtx, miniCanvas, cam, W, H, zoom } from "../core/canvas.js?v=15";
import { getTile } from "../map/mapUtils.js?v=15";
import { LS_ZONES } from "../map/mapData.js?v=15";
import { specialBuildings } from "../map/mapState.js?v=15";
import { player } from "../entities/player.js?v=15";
import { police } from "../entities/police.js?v=15";
import { missionGivers, currentMission, usingSequentialMissions } from "../missions/missionState.js?v=15";
import { getActiveMissionGiver } from "../missions/missionSystem.js?v=15";

export function renderMinimap() {
  const mc = miniCtx;
  const mw = miniCanvas.width;
  const mh = miniCanvas.height;
  mc.clearRect(0, 0, mw, mh);

  const scale = mw / (CFG.COLS * CFG.TILE);
  const ox = (cam.x - W / zoom / 2) * scale;
  const oy = (cam.y - H / zoom / 2) * scale;
  const vw = (W / zoom) * scale;
  const vh = (H / zoom) * scale;

  // Draw zone-based background first
  for (const z of LS_ZONES) {
    const zx = z.x1 * CFG.TILE * scale;
    const zy = z.y1 * CFG.TILE * scale;
    const zw = (z.x2 - z.x1 + 1) * CFG.TILE * scale;
    const zh = (z.y2 - z.y1 + 1) * CFG.TILE * scale;
    const zoneColors = {
      hills: "#B8966E",
      downtown: "#808080",
      suburb: "#E8D5B7",
      market: "#C4A882",
      midtown: "#909090",
      airport: "#B0B0B0",
      industrial: "#778899",
      beach: "#EECBAD",
      docks: "#7A8B8B",
    };
    mc.fillStyle = zoneColors[z.pal] || "#888";
    mc.fillRect(zx, zy, zw, zh);
  }

  // Draw map details on top
  for (let y = 0; y < CFG.ROWS; y += 2) {
    for (let x = 0; x < CFG.COLS; x += 2) {
      const tile = getTile(x, y);
      const px = x * CFG.TILE * scale;
      const py = y * CFG.TILE * scale;
      const s = CFG.TILE * 2 * scale;

      if (tile === T.WATER) {
        mc.fillStyle = "#1a5276";
        mc.fillRect(px, py, s, s);
      } else if (tile === T.ROAD) {
        mc.fillStyle = "rgba(80,80,80,0.5)";
        mc.fillRect(px, py, s, s);
      } else if (tile === T.PARK) {
        mc.fillStyle = "#3a7a33";
        mc.fillRect(px + 1, py + 1, s - 2, s - 2);
      } else if (tile === T.PARKING) {
        mc.fillStyle = "#555560";
        mc.fillRect(px, py, s, s);
      } else if (tile === T.SIDEWALK) {
        mc.fillStyle = "#d4bc7a";
        mc.fillRect(px, py, s, s);
      } else if (tile === T.SPECIAL) {
        const sb = specialBuildings.find((b) => b.x === x && b.y === y);
        if (sb) {
          mc.fillStyle = sb.color;
          mc.fillRect(px, py, s, s);
        }
      }
    }
  }

  // Zone name labels on minimap
  mc.font = "7px Arial";
  mc.textAlign = "center";
  for (const z of LS_ZONES) {
    const zcx = ((z.x1 + z.x2) / 2) * CFG.TILE * scale;
    const zcy = ((z.y1 + z.y2) / 2) * CFG.TILE * scale;
    mc.fillStyle = "rgba(255,255,255,0.25)";
    mc.fillText(z.name.replace(/ .*/, ""), zcx, zcy + 2);
  }

  // Viewport rect
  mc.strokeStyle = "rgba(255,255,255,0.5)";
  mc.lineWidth = 1;
  mc.strokeRect(ox, oy, vw, vh);

  // Player dot
  const p = player.inVehicle || player;
  mc.fillStyle = "#00ff00";
  mc.beginPath();
  mc.arc(p.x * scale, p.y * scale, 3, 0, Math.PI * 2);
  mc.fill();

  // Mission givers
  const _minimapMgs = usingSequentialMissions
    ? getActiveMissionGiver()
      ? [getActiveMissionGiver()]
      : []
    : missionGivers.filter((mg) => !mg.taken);

  for (const mg of _minimapMgs) {
    mc.fillStyle = "#ffd700";
    mc.beginPath();
    mc.arc(mg.x * scale, mg.y * scale, 2, 0, Math.PI * 2);
    mc.fill();
  }

  // Mission objective
  if (currentMission && !currentMission.completed && !currentMission.failed) {
    const stage = currentMission.stages[currentMission.stage];
    if (stage && stage.x) {
      mc.fillStyle = "#00ff64";
      mc.beginPath();
      mc.arc(stage.x * scale, stage.y * scale, 3, 0, Math.PI * 2);
      mc.fill();
    }
  }

  // Police
  for (const p of police) {
    mc.fillStyle = "#ff0000";
    mc.beginPath();
    mc.arc(p.x * scale, p.y * scale, 2, 0, Math.PI * 2);
    mc.fill();
  }
}

