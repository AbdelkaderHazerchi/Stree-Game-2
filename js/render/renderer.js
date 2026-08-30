// ======================== RENDER ========================
// Extracted from game.js:53803-54453 - no logic changed
import { CFG, T, G } from "../core/config.js?v=25";
import { ctx, W, H, zoom, cam, miniCtx } from "../core/canvas.js?v=25";
import { getTile } from "../map/mapUtils.js?v=25";
import { TILE_ASSETS, ROAD_CROSSWALK_IMG, SAND_IMG } from "../assets/tileAssets.js?v=25";
import { VEHICLE_ASSETS, EXPLOSION_ASSET } from "../assets/vehicleAssets.js?v=25";
import { LS_ZONES } from "../map/mapData.js?v=25";
import { VEHICLE_TYPES, vehicles, explosions, EXPLOSION_SIZE, EXPLOSION_DURATION } from "../entities/vehicles.js?v=25";
import { player } from "../entities/player.js?v=25";
import { npcs, lootItems } from "../entities/npcs.js?v=25";
import { police } from "../entities/police.js?v=25";
import { bullets } from "../entities/bullets.js?v=25";
import { buildingColor, buildingHeight, buildingShape, buildingRotation, specialBuildings, buildings } from "../map/mapState.js?v=25";
import { missionGivers, currentMission, usingSequentialMissions, quests } from "../missions/missionState.js?v=25";
import { getActiveMissionGiver, getVisibleStartGivers, getActiveEndGiver } from "../missions/missionSystem.js?v=25";
import { SETTINGS } from "../input/settings.js?v=25";
import { getNearShopName } from "../ui/shop.js?v=25";
import { renderMinimap } from "../ui/minimap.js?v=25";
import { isAiming, worldMouseX, worldMouseY } from "../input/inputState.js?v=25";
import { gameState } from "../core/state.js?v=25";

console.log("RENDERER v6 2x2 fix adjacent disappearance", Date.now());
 // ======================== LOW BUILDING (<=3 floors) HELPERS ========================
function hexToRgb(hex) {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}
function lightenHex(hex, amt) {
  const { r, g, b } = hexToRgb(hex);
  const nr = Math.round(r + (255 - r) * amt);
  const ng = Math.round(g + (255 - g) * amt);
  const nb = Math.round(b + (255 - b) * amt);
  return rgbToHex(Math.min(255, nr), Math.min(255, ng), Math.min(255, nb));
}
function hashTile(x, y) {
  let h = (x * 374761393) ^ (y * 668265263);
  h = (h ^ (h >>> 13)) * 1274126177;
  return (h >>> 0);
}
function drawCapsule(x, y, w, h, color) {
  const r = h / 2;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(x + r, y + h);
  ctx.arc(x + r, y + r, r, Math.PI / 2, -Math.PI / 2);
  ctx.closePath();
  ctx.fill();
}
function drawLowBuilding(px, py, col, tx, ty, h, span = 1, shapeOverride=null, rotOverride=0) {
  const TILE = CFG.TILE * span;
  const rot = ((rotOverride||0)%4+4)%4;
  let needsRestore=false;
  let drawPx=px, drawPy=py;
  if(rot!==0){
    const cx=px+TILE/2, cy=py+TILE/2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot*Math.PI/2);
    ctx.translate(-TILE/2,-TILE/2);
    drawPx=0; drawPy=0;
    needsRestore=true;
  }
  const borderW = Math.round(TILE * 0.075);
  const borderCol = lightenHex(col, 0.18);
  const innerX = drawPx + borderW;
  const innerY = drawPy + borderW;
  const innerW = TILE - borderW * 2;
  const innerH = TILE - borderW * 2;
  if(needsRestore){
    ctx.fillStyle=borderCol; ctx.fillRect(0,0,TILE,TILE);
    ctx.fillStyle=col; ctx.fillRect(borderW,borderW,innerW,innerH);
  } else {
    ctx.fillStyle=borderCol; ctx.fillRect(drawPx,drawPy,TILE,TILE);
    ctx.fillStyle=col; ctx.fillRect(innerX,innerY,innerW,innerH);
  }
  let variant;
  if(shapeOverride!==null && shapeOverride!==undefined) variant = ((shapeOverride%3)+3)%3;
  else {
    const seed = (hashTile(tx, ty) ^ (h * 0x9e3779b9)) >>> 0;
    variant = seed % 3;
  }
  const iX = needsRestore ? borderW : innerX;
  const iY = needsRestore ? borderW : innerY;
  const capW = Math.round(innerW * 0.30);
  const capH = Math.round(innerH * 0.075);
  const capGap = Math.round(innerH * 0.025);
  if (variant === 0) {
    const cx = iX + Math.round(innerW * 0.08);
    const cy0 = iY + Math.round(innerH * 0.14);
    drawCapsule(cx, cy0, capW, capH, "#8E9196");
    drawCapsule(cx, cy0 + capH + capGap, capW, capH, "#8E9196");
    const doorW = Math.round(innerW * 0.24);
    const doorH = Math.round(innerH * 0.42);
    const dx = iX + innerW - doorW - Math.round(innerW * 0.08);
    const dy = iY + innerH - doorH - Math.round(innerH * 0.08);
    ctx.fillStyle = "#8D8D8F";
    ctx.fillRect(dx, dy, doorW, doorH);
  } else if (variant === 1) {
    const capW2 = Math.round(innerW * 0.32);
    const cx = iX + innerW - capW2 - Math.round(innerW * 0.08);
    const cy0 = iY + Math.round(innerH * 0.14);
    drawCapsule(cx, cy0, capW2, capH, "#F2F2F2");
    drawCapsule(cx, cy0 + capH + capGap, capW2, capH, "#F2F2F2");
    const doorW = Math.round(innerW * 0.24);
    const doorH = Math.round(innerH * 0.52);
    const dx = iX + Math.round(innerW * 0.08);
    const dy = iY + innerH - doorH - Math.round(innerH * 0.08);
    ctx.fillStyle = "#2E2E32";
    ctx.fillRect(dx, dy, doorW, doorH);
  } else {
    const doorDark = "#3A393E";
    const tallW = Math.round(innerW * 0.28);
    const tallH = Math.round(innerH * 0.52);
    const tx1 = iX + innerW - tallW - Math.round(innerW * 0.09);
    const ty1 = iY + Math.round(innerH * 0.09);
    ctx.fillStyle = doorDark;
    ctx.fillRect(tx1, ty1, tallW, tallH);
    const smallW = Math.round(innerW * 0.24);
    const smallH = Math.round(innerH * 0.32);
    const tx2 = iX + Math.round(innerW * 0.09);
    const ty2 = iY + innerH - smallH - Math.round(innerH * 0.09);
    ctx.fillStyle = doorDark;
    ctx.fillRect(tx2, ty2, smallW, smallH);
  }
  if(needsRestore) ctx.restore();
}
function isBuildingOrigin(x, y, col, h) {
  const leftSame = x > 0 && buildingColor[y]?.[x - 1] === col && buildingHeight[y]?.[x - 1] === h;
  const topSame = y > 0 && buildingColor[y - 1]?.[x] === col && buildingHeight[y - 1]?.[x] === h;
  return !leftSame && !topSame;
}
function drawShop(px, py, S, shopName, rotOverride=0){
  const rot = ((rotOverride||0)%4+4)%4;
  let drawPx=px, drawPy=py;
  let needsRestore=false;
  if(rot!==0){
    const cx=px+S/2, cy=py+S/2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot*Math.PI/2);
    ctx.translate(-S/2, -S/2);
    drawPx=0; drawPy=0;
    needsRestore=true;
  }
  const n = (shopName||"").toLowerCase();
  let awningType = "generic";
  let doorPos = "se";
  let barPos = "bottomMid";
  if(n.includes("binco") || n.includes("clothing")){ awningType="red"; doorPos="se"; barPos="bottomMid"; }
  else if(n.includes("car") || n.includes("سيارات") || n.includes("showroom")){ awningType="blue"; doorPos="sw"; barPos="leftMid"; }
  else if(n.includes("casino") || n.includes("كازينو") || n.includes("caligula")){ awningType="gold"; doorPos="se"; barPos="leftMid"; }
  else if(n.includes("ammu")){ awningType="black"; doorPos="se"; barPos="bottomMid"; }
  else if(n.includes("clinic") || n.includes("عيادة")){ awningType="red"; doorPos="sw"; barPos="bottomMid"; }
  else if(n.includes("bank") || n.includes("بنك")){ awningType="gold"; doorPos="center"; barPos="leftMid"; }
  const borderCol = "#6b7280";
  const innerCol = "#2e3545";
  let awningDark, awningLight;
  if(awningType==="blue"){ awningDark="#1e3a5c"; awningLight="#5b8fd4"; }
  else if(awningType==="red"){ awningDark="#9b2c2c"; awningLight="#f9e6e6"; }
  else if(awningType==="gold"){ awningDark="#7a5a10"; awningLight="#f7d65a"; }
  else if(awningType==="black"){ awningDark="#1f2937"; awningLight="#9ca3af"; }
  else { awningDark="#374151"; awningLight="#d1d5db"; }
  const bw = Math.max(3, Math.round(S*0.065));
  ctx.fillStyle = borderCol;
  ctx.fillRect(drawPx, drawPy, S, S);
  ctx.fillStyle = innerCol;
  ctx.fillRect(drawPx+bw, drawPy+bw, S-bw*2, S-bw*2);
  const doorSize = Math.round(S*0.22);
  let doorX, doorY;
  if(doorPos==="sw"){ doorX = drawPx + bw + Math.round(S*0.08); doorY = drawPy + S - bw - doorSize - Math.round(S*0.06); }
  else if(doorPos==="se"){ doorX = drawPx + S - bw - doorSize - Math.round(S*0.08); doorY = drawPy + S - bw - doorSize - Math.round(S*0.06); }
  else { doorX = drawPx + Math.round((S - doorSize)/2); doorY = drawPy + S - bw - doorSize - Math.round(S*0.06); }
  ctx.fillStyle = "#cbd5e1";
  ctx.fillRect(doorX, doorY, doorSize, doorSize);
  ctx.fillStyle = "#0f1115";
  ctx.beginPath();
  ctx.arc(doorX+doorSize/2, doorY+doorSize/2, doorSize*0.32, 0, Math.PI*2);
  ctx.fill();
  const barW = Math.round(S*0.24);
  const barH = Math.max(2, Math.round(S*0.045));
  const barGap = Math.round(S*0.022);
  let barX, barY0;
  if(barPos==="leftMid"){
    barX = drawPx + bw + Math.round(S*0.08);
    barY0 = drawPy + bw + Math.round(S*0.30);
  } else {
    barX = doorX - barW - Math.round(S*0.06);
    if(doorPos==="sw"){ barX = doorX + doorSize + Math.round(S*0.06); }
    barY0 = doorY + Math.round(doorSize*0.15);
    if(barX < drawPx+bw+2) barX = drawPx+bw+2;
    if(barX+barW > drawPx+S-bw-2) barX = drawPx+S-bw-2-barW;
  }
  ctx.fillStyle = "#9ca3af";
  for(let i=0;i<2;i++){
    const by = barY0 + i*(barH+barGap);
    const r = barH/2;
    ctx.beginPath();
    ctx.moveTo(barX+r, by);
    ctx.lineTo(barX+barW-r, by);
    ctx.arc(barX+barW-r, by+r, r, -Math.PI/2, Math.PI/2);
    ctx.lineTo(barX+r, by+barH);
    ctx.arc(barX+r, by+r, r, Math.PI/2, -Math.PI/2);
    ctx.closePath();
    ctx.fill();
  }
  const awningW = Math.round(S*0.86);
  const awningH = Math.round(S*0.16);
  const awningX = drawPx + Math.round((S - awningW)/2);
  const awningY = drawPy + S;
  const awR = Math.max(2, Math.round(awningH*0.18));
  ctx.fillStyle = awningDark;
  ctx.beginPath();
  ctx.moveTo(awningX, awningY);
  ctx.lineTo(awningX+awningW, awningY);
  ctx.lineTo(awningX+awningW, awningY+awningH-awR);
  ctx.quadraticCurveTo(awningX+awningW, awningY+awningH, awningX+awningW-awR, awningY+awningH);
  ctx.lineTo(awningX+awR, awningY+awningH);
  ctx.quadraticCurveTo(awningX, awningY+awningH, awningX, awningY+awningH-awR);
  ctx.lineTo(awningX, awningY);
  ctx.closePath();
  ctx.fill();
  const numStripes = 12;
  const stripeW = awningW / numStripes;
  for(let i=0;i<numStripes;i++){
    if(i%2===0) continue;
    ctx.fillStyle = awningLight;
    const sx = awningX + i*stripeW;
    ctx.fillRect(sx+1, awningY+1, stripeW-1, awningH-2);
  }
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fillRect(awningX, awningY, awningW, Math.max(1, Math.round(awningH*0.12)));
  if(needsRestore) ctx.restore();
}

export function render() {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-cam.x, -cam.y);

  // Visible tile range (accounting for zoom)
  const viewW = W / zoom;
  const viewH = H / zoom;
  const startTX = Math.max(0, Math.floor((cam.x - viewW / 2) / CFG.TILE) - 2);
  const endTX = Math.min(
    CFG.COLS - 1,
    Math.ceil((cam.x + viewW / 2) / CFG.TILE) + 2,
  );
  const startTY = Math.max(0, Math.floor((cam.y - viewH / 2) / CFG.TILE) - 2);
  const endTY = Math.min(
    CFG.ROWS - 1,
    Math.ceil((cam.y + viewH / 2) / CFG.TILE) + 2,
  );

  // Draw tiles
  for (let y = startTY; y <= endTY; y++) {
    for (let x = startTX; x <= endTX; x++) {
      const tile = getTile(x, y);
      const px = x * CFG.TILE;
      const py = y * CFG.TILE;

      switch (tile) {
        case T.WATER: {
          const a = TILE_ASSETS[T.WATER];
          if (a.img && a.img.complete)
            ctx.drawImage(a.img, px, py, CFG.TILE, CFG.TILE);
          ctx.fillStyle = `rgba(255,255,255,${0.04 + Math.sin(Date.now() / 800 + x * 0.5 + y * 0.3) * 0.02})`;
          ctx.fillRect(
            px + 4,
            py + 4 + Math.sin(Date.now() / 600 + x + y) * 2,
            CFG.TILE - 8,
            2,
          );
          break;
        }
        case T.ROAD: {
          const a = TILE_ASSETS[T.ROAD];
          if (a.img && a.img.complete)
            ctx.drawImage(a.img, px, py, CFG.TILE, CFG.TILE);
          const isInterX =
            (x > 0 && getTile(x - 1, y) === T.ROAD) ||
            (x < CFG.COLS - 1 && getTile(x + 1, y) === T.ROAD);
          const isInterY =
            (y > 0 && getTile(x, y - 1) === T.ROAD) ||
            (y < CFG.ROWS - 1 && getTile(x, y + 1) === T.ROAD);
          const isIntersection = isInterX && isInterY;
          if (isIntersection) {
            if (ROAD_CROSSWALK_IMG.img && ROAD_CROSSWALK_IMG.img.complete)
              ctx.drawImage(ROAD_CROSSWALK_IMG.img, px, py, CFG.TILE, CFG.TILE);
          } else {
            ctx.fillStyle = "rgba(255,200,0,0.3)";
            const isVer = y > 0 && getTile(x, y - 1) === T.ROAD;
            if (isVer && x > 0 && getTile(x - 1, y) !== T.ROAD) {
              for (let i = 0; i < 4; i++) {
                if (i % 2 === 0)
                  ctx.fillRect(px + CFG.TILE / 2 - 1, py + 2 + i * 10, 2, 7);
              }
            } else if (!isVer && y > 0 && getTile(x, y - 1) !== T.ROAD) {
              for (let i = 0; i < 4; i++) {
                if (i % 2 === 0)
                  ctx.fillRect(px + 2 + i * 10, py + CFG.TILE / 2 - 1, 7, 2);
              }
            }
          }
          break;
        }
        case T.SIDEWALK: {
          // Sand - constant sandy yellow (#e8d4a0) - no environment tint
          const img = TILE_ASSETS[T.SIDEWALK];
          if (img.img && img.img.complete)
            ctx.drawImage(img.img, px, py, CFG.TILE, CFG.TILE);
          // Fallback constant fill if image not loaded
          else {
            ctx.fillStyle = "#e8d4a0";
            ctx.fillRect(px, py, CFG.TILE, CFG.TILE);
          }
          break;
        }
        case T.PAVEMENT: {
          const a = TILE_ASSETS[T.PAVEMENT];
          if (a.img && a.img.complete)
            ctx.drawImage(a.img, px, py, CFG.TILE, CFG.TILE);
          else {
            ctx.fillStyle = "#8a8a8a";
            ctx.fillRect(px, py, CFG.TILE, CFG.TILE);
          }
          break;
        }
        case T.BUILDING:
          // Buildings are drawn from buildings[] list after tile loop (2x2)
          break;
        case T.PARK: {
          const a = TILE_ASSETS[T.PARK];
          if (a.img && a.img.complete)
            ctx.drawImage(a.img, px, py, CFG.TILE, CFG.TILE);
          break;
        }
        case T.PARKING: {
          const a = TILE_ASSETS[T.PARKING];
          if (a.img && a.img.complete)
            ctx.drawImage(a.img, px, py, CFG.TILE, CFG.TILE);
          if (x % 4 === 0) {
            ctx.fillStyle = "rgba(255,200,0,0.15)";
            ctx.fillRect(px + CFG.TILE / 2 - 1, py, 2, CFG.TILE);
          }
          break;
        }
        case T.SPECIAL:
          // Special buildings (shops) are drawn as grouped 2x2 shops via drawShop() below
          break;
      }
    }
  }

  // Draw buildings (2x2, 4 sqm) from buildings list - with selectable shape and 90° rotation
  for (const b of buildings) {
    const bx = b.x * CFG.TILE;
    const by = b.y * CFG.TILE;
    const col = b.color;
    const h = b.height;
    const span = b.w || 2;
    const S = CFG.TILE * span;
    if (bx + S < cam.x - viewW / 2 - 100 || bx > cam.x + viewW / 2 + 100 || by + S < cam.y - viewH / 2 - 100 || by > cam.y + viewH / 2 + 100) continue;
    const shape = (b.shape !== undefined ? b.shape : (b.shapeOverride !== undefined ? b.shapeOverride : ((buildingShape[b.y] && buildingShape[b.y][b.x] != null) ? buildingShape[b.y][b.x] : null)));
    const rot = (b.rotation !== undefined ? b.rotation : (b.rot !== undefined ? b.rot : ((buildingRotation[b.y] && buildingRotation[b.y][b.x] != null) ? buildingRotation[b.y][b.x] : 0)));
    if (h <= 3) {
      drawLowBuilding(bx, by, col, b.x, b.y, h, span, shape, rot);
    } else {
      const r = ((rot%4)+4)%4;
      if(r!==0){
        const cx=bx+S/2, cy=by+S/2;
        ctx.save(); ctx.translate(cx,cy); ctx.rotate(r*Math.PI/2); ctx.translate(-S/2,-S/2);
        ctx.fillStyle = col; ctx.fillRect(0, 0, S, S);
        const sameRight = b.x + span < CFG.COLS && buildingColor[b.y]?.[b.x + span] === col;
        const sameBottom = b.y + span < CFG.ROWS && buildingColor[b.y + span]?.[b.x] === col;
        ctx.fillStyle = "rgba(0,0,0,0.2)";
        if (!sameRight) ctx.fillRect(S - 4, 0, 3, S);
        if (!sameBottom) ctx.fillRect(0, S - 4, S, 3);
        const ba = TILE_ASSETS[T.BUILDING];
        if (ba.img && ba.img.complete) {
          for (let dy = 0; dy < span; dy++) for (let dx = 0; dx < span; dx++) ctx.drawImage(ba.img, dx * CFG.TILE, dy * CFG.TILE, CFG.TILE, CFG.TILE);
        }
        ctx.restore();
      } else {
        ctx.fillStyle = col;
        ctx.fillRect(bx, by, S, S);
        const sameRight = b.x + span < CFG.COLS && buildingColor[b.y]?.[b.x + span] === col;
        const sameBottom = b.y + span < CFG.ROWS && buildingColor[b.y + span]?.[b.x] === col;
        ctx.fillStyle = "rgba(0,0,0,0.2)";
        if (!sameRight) ctx.fillRect(bx + S - 4, by, 4, S);
        if (!sameBottom) ctx.fillRect(bx, by + S - 4, S, 4);
        const ba = TILE_ASSETS[T.BUILDING];
        if (ba.img && ba.img.complete) {
          for (let dy = 0; dy < span; dy++) for (let dx = 0; dx < span; dx++) ctx.drawImage(ba.img, bx + dx * CFG.TILE, by + dy * CFG.TILE, CFG.TILE, CFG.TILE);
        }
      }
    }
  }

  // Draw zone name labels (when player is nearby) - guard if player undefined
  const target = (player && (player.inVehicle || player)) || cam;
  for (const z of LS_ZONES) {
    const zcx = ((z.x1 + z.x2) / 2) * CFG.TILE + CFG.TILE / 2;
    const zcy = ((z.y1 + z.y2) / 2) * CFG.TILE + CFG.TILE / 2;
    if (Math.hypot(target.x - zcx, target.y - zcy) < 500) {
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(zcx - 70, zcy - 10, 140, 22);
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = "bold 13px Arial";
      ctx.textAlign = "center";
      ctx.fillText(z.name, zcx, zcy + 5);
    }
  }

  // Draw special buildings (shops) as grouped 4 sqm (2x2) with reference design
  {
    const sbMap = new Map();
    for (const sb of specialBuildings) sbMap.set(sb.x + "," + sb.y, sb);
    const sbVisited = new Set();
    for (const sb of specialBuildings) {
      const key = sb.x + "," + sb.y;
      if (sbVisited.has(key)) continue;
      const group = [];
      const stack = [sb];
      sbVisited.add(key);
      while (stack.length > 0) {
        const cur = stack.pop();
        group.push(cur);
        for (const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]]) {
          const nk = cur.x + dx + "," + (cur.y + dy);
          if (!sbVisited.has(nk)) {
            const n = sbMap.get(nk);
            if (n && n.name === cur.name) { sbVisited.add(nk); stack.push(n); }
          }
        }
      }
      const minX = Math.min(...group.map(s=>s.x));
      const maxX = Math.max(...group.map(s=>s.x));
      const minY = Math.min(...group.map(s=>s.y));
      const maxY = Math.max(...group.map(s=>s.y));
      const groupW = maxX - minX + 1;
      const groupH = maxY - minY + 1;
      const shopPx = minX * CFG.TILE;
      const shopPy = minY * CFG.TILE;
      const shopW = groupW * CFG.TILE;
      const shopH = groupH * CFG.TILE;
      const S = Math.max(shopW, shopH); // for 2x2 S=192
      // Viewport cull (include awning below)
      const awningH = Math.round(S * 0.16);
      if (shopPx + S < cam.x - viewW/2 - 50 || shopPx > cam.x + viewW/2 + 50 ||
          shopPy + S + awningH < cam.y - viewH/2 - 50 || shopPy > cam.y + viewH/2 + 50) {
        // still may need label? skip draw but label cull below will handle
      } else {
        const isShop2x2 = groupW===2 && groupH===2 && group.length===4;
        if (isShop2x2) {
          const shopRot = (buildingRotation[minY] && buildingRotation[minY][minX] != null) ? buildingRotation[minY][minX] : 0;
          drawShop(shopPx, shopPy, S, sb.name, shopRot);
        } else {
          // Fallback per-tile for irregular groups
          for (const g of group) {
            const px = g.x * CFG.TILE, py = g.y * CFG.TILE;
            if (px + CFG.TILE < cam.x - viewW/2 - 20 || px > cam.x + viewW/2 + 20 ||
                py + CFG.TILE < cam.y - viewH/2 - 20 || py > cam.y + viewH/2 + 20) continue;
            ctx.fillStyle = g.color || "#cc8844";
            ctx.fillRect(px, py, CFG.TILE, CFG.TILE);
            ctx.strokeStyle = "rgba(255,255,255,0.15)";
            ctx.strokeRect(px+1, py+1, CFG.TILE-2, CFG.TILE-2);
          }
        }
      }
      // Label (show when near)
      const cx = ((minX + maxX + 1)/2) * CFG.TILE;
      const cy = ((minY + maxY + 1)/2) * CFG.TILE;
      if (Math.hypot(target.x - cx, target.y - cy) < 320) {
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(cx - 40, cy - 26, 80, 16);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 10px Arial";
        ctx.textAlign = "center";
        ctx.fillText(sb.name, cx, cy - 14);
      }
    }
  }

  // Draw quest givers — Main yellow sequential, Side purple dots (spec)
  const _mgsToDraw = (quests && quests.length>0)
    ? getVisibleStartGivers()
    : (usingSequentialMissions ? (getActiveMissionGiver()? [getActiveMissionGiver()] : []) : missionGivers.filter((mg) => !mg.taken));

  for (const mg of _mgsToDraw) {
    const isSide = mg.category==="side";
    const baseColor = isSide ? "#a855f7" : "#ffd700";
    const pulse = Math.sin(Date.now() / 300) * 0.3 + 0.7;
    // Glow
    ctx.shadowColor = baseColor;
    ctx.shadowBlur = isSide ? 18 : 20;
    ctx.fillStyle = isSide ? `rgba(168, 85, 247, ${pulse})` : `rgba(255, 215, 0, ${pulse})`;
    ctx.beginPath();
    ctx.arc(mg.x, mg.y, isSide ? 12 : 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Inner dot
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(mg.x, mg.y, isSide ? 5 : 6, 0, Math.PI * 2);
    ctx.fill();
    // Side quests get purple dot inner ring for minimap parity
    if(isSide){
      ctx.strokeStyle="rgba(168,85,247,0.45)"; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(mg.x, mg.y, 8,0,Math.PI*2); ctx.stroke();
    }
    // Label background — bilingual title
    const lang = (SETTINGS && SETTINGS.language==="en") ? "en":"ar";
    let displayName = mg.mission.name;
    let displayIcon = mg.mission.icon||"⭐";
    if(mg.title && typeof mg.title==="object"){
      displayName = (lang==="en" ? (mg.title.en||mg.title.ar) : (mg.title.ar||mg.title.en)) || displayName;
    }
    if(mg.icon) displayIcon = mg.icon;
    // also handle quest title bilingual
    if(mg.questId){
      // find quest for richer bilingual
      const qq = quests.find(q=>q.id===mg.questId);
      if(qq && qq.title){
        displayName = (lang==="en" ? (qq.title.en||qq.title.ar) : (qq.title.ar||qq.title.en)) || displayName;
        displayIcon = qq.icon || displayIcon;
      }
    }
    const labelText = `${displayIcon} ${displayName}`;
    ctx.fillStyle = "rgba(0,0,0,0.8)";
    const tw = Math.max(28, labelText.length * 6.5 + 12);
    ctx.fillRect(mg.x - tw / 2, mg.y - 28, tw, 16);
    // Label text
    ctx.fillStyle = isSide ? "#c084fc" : "#ffd700";
    ctx.font = "bold 10px Arial";
    ctx.textAlign = "center";
    ctx.fillText(labelText, mg.x, mg.y - 16);
    // Reward
    ctx.fillStyle = "#aaa";
    ctx.font = "8px Arial";
    const reward = mg.mission.reward ?? mg.reward ?? "";
    if(reward) ctx.fillText(`$${reward}`, mg.x, mg.y + 30);
  }
  // Active quest End marker (green) — appears immediately after capturing Start (spec: second point appears)
  const activeEnd = (typeof getActiveEndGiver==="function") ? getActiveEndGiver() : null;
  if(activeEnd && currentMission && !currentMission.completed && !currentMission.failed){
    const ex=activeEnd.x, ey=activeEnd.y;
    const epulse = Math.sin(Date.now()/350)*0.25+0.75;
    ctx.save();
    ctx.shadowColor="#22c55e"; ctx.shadowBlur=18;
    ctx.fillStyle=`rgba(34,197,94,${epulse})`;
    ctx.beginPath(); ctx.arc(ex,ey,16,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
    ctx.fillStyle="#fff"; ctx.beginPath(); ctx.arc(ex,ey,6,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#22c55e"; ctx.font="bold 9px Arial"; ctx.textAlign="center";
    ctx.fillText("🏁", ex, ey+3);
    ctx.fillStyle="rgba(0,0,0,0.7)"; ctx.fillRect(ex-24, ey-26, 48, 12);
    ctx.fillStyle="#4ade80"; ctx.font="bold 7px Arial";
    const isEn = SETTINGS && SETTINGS.language==="en";
    ctx.fillText(isEn ? "DROP-OFF" : "التسليم", ex, ey-18);
    // dashed line from player to end when active
    const pTarget = player ? (player.inVehicle || player) : null;
    if(pTarget){
      ctx.strokeStyle=`rgba(34,197,94,${0.35*epulse})`; ctx.lineWidth=2; ctx.setLineDash([7,6]);
      ctx.beginPath(); ctx.moveTo(pTarget.x, pTarget.y); ctx.lineTo(ex,ey); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.restore();
  }

  // Draw mission checkpoints
  if (currentMission && !currentMission.completed && !currentMission.failed) {
    const stage = currentMission.stages[currentMission.stage];
    // New mission extra visuals inserted before generic checkpoint
    if(currentMission.type==="surveillance" && currentMission.data.surveillanceCenter){
      const c = currentMission.data.surveillanceCenter;
      const r = currentMission.data.surveillanceRadius || 110;
      ctx.save();
      ctx.strokeStyle = "rgba(0, 200, 255, 0.55)";
      ctx.lineWidth = 2;
      ctx.setLineDash([8,6]);
      ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, Math.PI*2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(0, 200, 255, 0.08)";
      ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#00ccff";
      ctx.beginPath(); ctx.arc(c.x, c.y, 4, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
    if(currentMission.type==="silentPursuit" && currentMission.data.silentTarget){
      const tv = currentMission.data.silentTarget;
      if(tv){
        ctx.save();
        ctx.strokeStyle = "rgba(255, 215, 0, 0.9)";
        ctx.lineWidth = 2;
        ctx.setLineDash([6,4]);
        ctx.strokeRect(tv.x - 18, tv.y - 10, 36, 20);
        ctx.setLineDash([]);
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(tv.x - 22, tv.y - 22, 44, 12);
        ctx.fillStyle = "#ffd700";
        ctx.font = "bold 7px Arial"; ctx.textAlign="center";
        ctx.fillText("TARGET", tv.x, tv.y - 14);
        ctx.restore();
      }
    }
    if (stage && stage.x) {
      const pulse = Math.sin(Date.now() / 400) * 0.3 + 0.7;
      ctx.fillStyle = `rgba(0, 255, 100, ${pulse})`;
      ctx.shadowColor = "#00ff64";
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(stage.x, stage.y, (stage.radius || 50) / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Waypoint line
      ctx.strokeStyle = `rgba(0, 255, 100, ${pulse * 0.3})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      const wpTarget = (player && (player.inVehicle || player)) || cam;
      ctx.moveTo(wpTarget.x, wpTarget.y);
      ctx.lineTo(stage.x, stage.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Chase target
    if (currentMission.type === "chase" && currentMission.data.chaseTarget) {
      const t = currentMission.data.chaseTarget;
      ctx.fillStyle = "#ff4444";
      ctx.shadowColor = "#ff0000";
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Protect zone
    if (currentMission.type === "protect" && currentMission.data.protectZone) {
      const z = currentMission.data.protectZone;
      ctx.strokeStyle = "rgba(0, 255, 100, 0.4)";
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 10]);
      ctx.beginPath();
      ctx.arc(z.x, z.y, z.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // Draw NPCs
  for (const npc of npcs) {
    ctx.save();
    ctx.translate(npc.x, npc.y);
    const sz = npc.size;

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath();
    ctx.ellipse(0, sz * 0.5, sz * 0.8, sz * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    const legSwing = Math.sin(Date.now() / 200 + npc.x) * 2;
    ctx.strokeStyle = "#2c3e50";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-2, sz * 0.3);
    ctx.lineTo(-3 + legSwing, sz * 0.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(2, sz * 0.3);
    ctx.lineTo(3 - legSwing, sz * 0.9);
    ctx.stroke();

    // Body
    ctx.fillStyle = npc.type === "gang" ? "#8e44ad" : npc.color;
    ctx.beginPath();
    ctx.arc(0, 0, sz, 0, Math.PI * 2);
    ctx.fill();

    // Gang glow
    if (npc.type === "gang") {
      ctx.shadowColor = "#8e44ad";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(0, 0, sz, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      // Weapon
      ctx.fillStyle = "#555";
      ctx.fillRect(6, -2, 10, 3);
      ctx.fillStyle = "#333";
      ctx.fillRect(12, -3, 4, 5);
      // Hat
      ctx.fillStyle = "#2c3e50";
      ctx.fillRect(-6, -sz - 3, 12, 4);
    }

    // Head
    const headR = sz * 0.55;
    ctx.fillStyle = "#f5cba7";
    ctx.beginPath();
    ctx.arc(0, -sz, headR, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = "#333";
    const eOff =
      Math.cos(npc.angle) > 0.3 ? 1 : Math.cos(npc.angle) < -0.3 ? -1 : 0;
    ctx.fillRect(-2 + eOff, -sz - 1, 2, 2);
    ctx.fillRect(1 + eOff, -sz - 1, 2, 2);

    // Direction arrow
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    const al = sz * 1.2;
    ctx.moveTo(Math.cos(npc.angle) * al, Math.sin(npc.angle) * al);
    ctx.lineTo(
      Math.cos(npc.angle + 2.5) * al * 0.5,
      Math.sin(npc.angle + 2.5) * al * 0.5,
    );
    ctx.lineTo(
      Math.cos(npc.angle - 2.5) * al * 0.5,
      Math.sin(npc.angle - 2.5) * al * 0.5,
    );
    ctx.fill();

    // Highlight quest NPCs (meeting, killTarget, transport)
    if(npc.isQuestTarget){
      ctx.strokeStyle = "#ff3366";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, -6, 16, 0, Math.PI*2); ctx.stroke();
      ctx.fillStyle = "rgba(255,51,102,0.15)";
      ctx.beginPath(); ctx.arc(0, -6, 16, 0, Math.PI*2); ctx.fill();
    }
    if(npc.isQuestPerson){
      ctx.strokeStyle = "#44ffaa";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, -6, 14, 0, Math.PI*2); ctx.stroke();
    }
    if(npc.isMeetingNpc){
      ctx.strokeStyle = "#ffd700";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, -6, 15, 0, Math.PI*2); ctx.stroke();
      ctx.fillStyle = "rgba(255,215,0,0.12)";
      ctx.beginPath(); ctx.arc(0, -6, 15, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }

  // Draw loot items
  for (const l of lootItems) {
    const pulse = 0.7 + Math.sin(Date.now() / 150 + l.x) * 0.3;
    ctx.globalAlpha = pulse;
    if (l.type === "money") {
      ctx.fillStyle = "#ffd700";
      ctx.shadowColor = "#ffd700";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(l.x, l.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "8px Arial";
      ctx.textAlign = "center";
      ctx.fillText("$", l.x, l.y + 3);
    } else if (l.type.startsWith("ammo")) {
      const colors = {
        ammo_pistol: "#ff8800",
        ammo_smg: "#ff4488",
        ammo_rifle: "#44ff88",
        ammo_shotgun: "#ff44ff",
      };
      ctx.fillStyle = colors[l.type] || "#ff8800";
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 12;
      ctx.fillRect(l.x - 4, l.y - 3, 8, 6);
      ctx.fillRect(l.x - 2, l.y - 5, 4, 10);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#fff";
      ctx.font = "7px Arial";
      ctx.textAlign = "center";
      ctx.fillText(l.amount, l.x, l.y + 8);
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  // Draw vehicles (hidden ones are exploding - skip rendering)
  for (const v of vehicles) {
    if (v.hidden) continue;
    ctx.save();
    ctx.translate(v.x, v.y);
    ctx.rotate(v.angle);

    const hw = v.w / 2,
      hh = v.h / 2;

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(2, 3, hw + 2, hh + 1, 0, 0, Math.PI * 2);
    ctx.fill();

    // Car body color
    ctx.fillStyle = v.isPolice ? "#ffffff" : v.color;
    ctx.beginPath();
    ctx.moveTo(-hw + 4, -hh);
    ctx.lineTo(hw - 4, -hh);
    ctx.quadraticCurveTo(hw, -hh, hw, -hh + 4);
    ctx.lineTo(hw, hh - 4);
    ctx.quadraticCurveTo(hw, hh, hw - 4, hh);
    ctx.lineTo(-hw + 4, hh);
    ctx.quadraticCurveTo(-hw, hh, -hw, hh - 4);
    ctx.lineTo(-hw, -hh + 4);
    ctx.quadraticCurveTo(-hw, -hh, -hw + 4, -hh);
    ctx.closePath();
    ctx.fill();

    // Draw vehicle SVG overlay (wheels, windows, lights)
    const typeIdx = VEHICLE_TYPES.indexOf(v.type);
    const va = typeIdx >= 0 ? VEHICLE_ASSETS[typeIdx] : null;
    if (va && va.img && va.img.complete) {
      ctx.drawImage(va.img, -hw, -hh, v.w, v.h);
    }

    ctx.restore();
  }

  // Draw car explosions using car_explotion.svg - hide vehicle then animate then remove
  for (const e of explosions) {
    const p = Math.max(0, Math.min(1, e.t / e.duration));
    // Scale curve mimicking SVG pop: fast grow then slight shrink while fading
    let scale;
    if (p < 0.2) scale = 0.35 + p * 3.25; // 0.35 -> 1.0
    else if (p < 0.65) scale = 1.0 + (p - 0.2) * 0.33; // 1.0 -> 1.15
    else scale = 1.15 - (p - 0.65) * 1.0; // fade shrink
    const alpha = p < 0.12 ? p / 0.12 : p > 0.75 ? (1 - p) / 0.25 : 1;
    // Cull offscreen
    if (e.x + EXPLOSION_SIZE < cam.x - W / 2 - 100 || e.x - EXPLOSION_SIZE > cam.x + W / 2 + 100 ||
        e.y + EXPLOSION_SIZE < cam.y - H / 2 - 100 || e.y - EXPLOSION_SIZE > cam.y + H / 2 + 100) continue;
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    // Additive glow
    ctx.shadowColor = "#ff6600";
    ctx.shadowBlur = 18 * (1 - p * 0.7);
    const size = EXPLOSION_SIZE * scale;
    if (EXPLOSION_ASSET.img && EXPLOSION_ASSET.img.complete && EXPLOSION_ASSET.img.naturalWidth) {
      ctx.drawImage(EXPLOSION_ASSET.img, -size / 2, -size / 2, size, size);
    } else {
      // Fallback canvas explosion if SVG not yet loaded
      ctx.fillStyle = "#ff6600";
      ctx.beginPath(); ctx.arc(0, 0, size * 0.35, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ffd700";
      ctx.beginPath(); ctx.arc(0, 0, size * 0.22, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(0, 0, size * 0.12, 0, Math.PI * 2); ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // Draw police (on-foot only)
  for (const p of police) {
    if (p.inVehicle) continue;
    ctx.save();
    ctx.translate(p.x, p.y);
    const sz = p.size;

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath();
    ctx.ellipse(0, sz * 0.5, sz * 0.8, sz * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = "#2244aa";
    ctx.beginPath();
    ctx.arc(0, 0, sz, 0, Math.PI * 2);
    ctx.fill();

    // Badge / star
    ctx.fillStyle = "#ffd700";
    ctx.font = "10px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("⭐", 0, 1);

    // Head
    const headR = sz * 0.55;
    ctx.fillStyle = "#f5cba7";
    ctx.beginPath();
    ctx.arc(0, -sz, headR, 0, Math.PI * 2);
    ctx.fill();

    // Police hat
    ctx.fillStyle = "#1a1a6e";
    ctx.fillRect(-7, -sz - headR - 1, 14, 5);
    ctx.fillStyle = "#ffd700";
    ctx.fillRect(-4, -sz - headR - 2, 8, 2);

    // Eyes
    ctx.fillStyle = "#333";
    const eOff =
      Math.cos(p.angle) > 0.3 ? 1 : Math.cos(p.angle) < -0.3 ? -1 : 0;
    ctx.fillRect(-2 + eOff, -sz - 1, 2, 2);
    ctx.fillRect(1 + eOff, -sz - 1, 2, 2);

    // Direction arrow
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    const al = sz * 1.2;
    ctx.moveTo(Math.cos(p.angle) * al, Math.sin(p.angle) * al);
    ctx.lineTo(
      Math.cos(p.angle + 2.5) * al * 0.5,
      Math.sin(p.angle + 2.5) * al * 0.5,
    );
    ctx.lineTo(
      Math.cos(p.angle - 2.5) * al * 0.5,
      Math.sin(p.angle - 2.5) * al * 0.5,
    );
    ctx.fill();

    ctx.restore();
  }

  // Draw bullets
  for (const b of bullets) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);

    ctx.fillStyle = b.isPlayer ? "#ffff00" : "#ff4444";
    ctx.shadowColor = b.isPlayer ? "#ffff00" : "#ff4444";
    ctx.shadowBlur = 4;
    ctx.fillRect(-5, -1, 10, 2);
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  // Draw shop hint
  const nearShopName = getNearShopName() || (typeof window !== 'undefined' ? window.nearShopName : null);
  if (player && player.alive && player.onFoot && nearShopName) {
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    const tw = nearShopName.length * 8 + 20;
    ctx.fillRect(player.x - tw / 2, player.y - 40, tw, 18);
    ctx.fillStyle = "#44ff88";
    ctx.font = "bold 11px Arial";
    ctx.textAlign = "center";
    ctx.fillText("[E] " + nearShopName, player.x, player.y - 27);
  }

  // Draw vehicle entry hint
  if (player && player.alive && player.onFoot && !nearShopName) {
    let nearVeh = null;
    for (const v of vehicles) {
      if (v.occupied) continue;
      if (v.hidden || v.exploding) continue;
      if (Math.hypot(player.x - v.x, player.y - v.y) < 80) {
        nearVeh = v;
        break;
      }
    }
    if (nearVeh) {
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(player.x - 35, player.y - 40, 70, 18);
      ctx.fillStyle = "#ffd700";
      ctx.font = "bold 11px Arial";
      ctx.textAlign = "center";
      ctx.fillText("[E] دخول", player.x, player.y - 27);
    }
  }

  // Draw player
  if (player && player.alive) {
    const p = player;
    if (player.onFoot) {
      ctx.save();
      ctx.translate(p.x, p.y);

      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.beginPath();
      ctx.ellipse(2, 4, 14, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Legs (direction indicator)
      ctx.strokeStyle = "#2c3e50";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-3, 5);
      ctx.lineTo(-5 + Math.cos(Date.now() / 200) * 3, 14);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(3, 5);
      ctx.lineTo(5 + Math.sin(Date.now() / 200) * 3, 14);
      ctx.stroke();

      // Body
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(0, 0, p.size, 0, Math.PI * 2);
      ctx.fill();

      // Shirt detail
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.7;
      ctx.fillRect(-6, 2, 12, 4);
      ctx.globalAlpha = 1;

      // Head
      ctx.fillStyle = p.skinColor;
      ctx.beginPath();
      ctx.arc(0, -12, 7, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      const eyeOff =
        p.angle > Math.PI / 4 && p.angle < (3 * Math.PI) / 4
          ? -1
          : p.angle < -Math.PI / 4 && p.angle > (-3 * Math.PI) / 4
            ? 1
            : 0;
      ctx.fillStyle = "#333";
      ctx.fillRect(-3 + eyeOff, -14, 2, 2);
      ctx.fillRect(1 + eyeOff, -14, 2, 2);

      // Weapon indicator (black rectangle)
      ctx.fillStyle = "#222";
      ctx.save();
      ctx.rotate(p.angle);
      ctx.fillRect(-5, 0, 16, 2.5);
      ctx.restore();

      ctx.restore();
    } else {
      // In vehicle - draw highlight
      const v = p.inVehicle;
      ctx.save();
      ctx.translate(v.x, v.y);
      ctx.rotate(v.angle);
      // Selection ring
      ctx.strokeStyle = `rgba(255,255,0,${0.3 + Math.sin(Date.now() / 300) * 0.2})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(-v.w / 2 - 3, -v.h / 2 - 3, v.w + 6, v.h + 6);
      ctx.setLineDash([]);
      // Driver label
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(-15, -v.h / 2 - 18, 30, 14);
      ctx.fillStyle = "#ffd700";
      ctx.font = "9px Arial";
      ctx.textAlign = "center";
      ctx.fillText("🚗 أنت", 0, -v.h / 2 - 8);
      ctx.restore();
    }
  }

  // Aiming line — right mouse hold, shows exact fire direction, slows walking 2.5x
  if (isAiming && player && player.alive && player.onFoot && gameState === G.PLAYING) {
    const startX = player.x;
    const startY = player.y;
    const dx = worldMouseX - startX;
    const dy = worldMouseY - startY;
    const dist = Math.hypot(dx, dy);
    if (dist > 5) {
      const angle = Math.atan2(dy, dx);
      const length = Math.min(dist, 600);
      const endX = startX + Math.cos(angle) * length;
      const endY = startY + Math.sin(angle) * length;

      // Outer glow
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,0,0.9)";
      ctx.lineWidth = 2.2 / zoom;
      ctx.setLineDash([8 / zoom, 6 / zoom]);
      ctx.lineDashOffset = -(Date.now() / 60) % (14 / zoom);
      ctx.shadowColor = "#ffff00";
      ctx.shadowBlur = 8 / zoom;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;

      // Inner core line
      ctx.strokeStyle = "rgba(255,255,255,0.95)";
      ctx.lineWidth = 0.9 / zoom;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // Endpoint dot
      ctx.fillStyle = "#ffff00";
      ctx.shadowColor = "#ffff00";
      ctx.shadowBlur = 6 / zoom;
      ctx.beginPath();
      ctx.arc(endX, endY, 4 / zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(endX, endY, 1.6 / zoom, 0, Math.PI * 2);
      ctx.fill();

      // Start circle
      ctx.strokeStyle = "rgba(255,255,0,0.5)";
      ctx.lineWidth = 1 / zoom;
      ctx.beginPath();
      ctx.arc(startX, startY, 9 / zoom, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }
  }

  ctx.restore();

  // ==== MINIMAP ====
  renderMinimap();
}

