// ======================== RENDER ========================
// Extracted from game.js:53803-54453 - no logic changed
import { CFG, T, G } from "../core/config.js?v=26";
import { ctx, W, H, zoom, cam, miniCtx } from "../core/canvas.js?v=26";
import { getTile } from "../map/mapUtils.js?v=26";
import { TILE_ASSETS, ROAD_CROSSWALK_IMG, SAND_IMG, SHOP_BUILDING_1_IMG } from "../assets/tileAssets.js?v=26";
import { VEHICLE_ASSETS, EXPLOSION_ASSET } from "../assets/vehicleAssets.js?v=26";
import { LS_ZONES } from "../map/mapData.js?v=26";
import { VEHICLE_TYPES, vehicles, explosions, EXPLOSION_SIZE, EXPLOSION_DURATION } from "../entities/vehicles.js?v=26";
import { player } from "../entities/player.js?v=26";
import { npcs, lootItems } from "../entities/npcs.js?v=26";
import { police } from "../entities/police.js?v=26";
import { bullets } from "../entities/bullets.js?v=26";
import { buildingColor, buildingHeight, buildingShape, buildingRotation, specialBuildings, buildings } from "../map/mapState.js?v=26";
import { missionGivers, currentMission, usingSequentialMissions, quests } from "../missions/missionState.js?v=26";
import { getActiveMissionGiver, getVisibleStartGivers, getActiveEndGiver } from "../missions/missionSystem.js?v=26";
import { SETTINGS } from "../input/settings.js?v=26";
import { getNearShopName } from "../ui/shop.js?v=26";
import { renderMinimap } from "../ui/minimap.js?v=26";
import { isAiming, worldMouseX, worldMouseY } from "../input/inputState.js?v=26";
import { gameState } from "../core/state.js?v=26";

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
function darkenHex(hex, amt) {
  const { r, g, b } = hexToRgb(hex);
  const nr = Math.round(r * (1 - amt));
  const ng = Math.round(g * (1 - amt));
  const nb = Math.round(b * (1 - amt));
  return rgbToHex(nr, ng, nb);
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
// ======================== 4-STORY & 5-STORY BUILDINGS (New Shapes) ========================
// Replaces old generic tall building block (removed building_detail.svg usage)
// Designs match provided reference images: 4-story = split windows, 5-story = full windows
function drawFourStoryBuilding(px, py, col, tx, ty, span, shapeOverride, rotOverride){
  const S = CFG.TILE * span;
  const rot = ((rotOverride||0)%4+4)%4;
  let needsRestore=false;
  let ox=px, oy=py;
  if(rot!==0){
    const cx=px+S/2, cy=py+S/2;
    ctx.save();
    ctx.translate(cx,cy);
    ctx.rotate(rot*Math.PI/2);
    ctx.translate(-S/2,-S/2);
    ox=0; oy=0;
    needsRestore=true;
  }
  const borderCol = lightenHex(col, 0.20);
  const wallCol = col;
  const roofCol = "#1E2026";
  const winCol = "#1A2F4A";
  const acWhite = "#E6EAF0";
  const acGray = "#8D8F93";
  const acBlack = "#070A0F";
  const outerBorder = Math.max(3, Math.round(S*0.04));
  ctx.fillStyle = borderCol;
  ctx.fillRect(ox, oy, S, S);
  const innerX = ox + outerBorder;
  const innerY = oy + outerBorder;
  const innerW = S - outerBorder*2;
  const innerH = S - outerBorder*2;
  const roofH = Math.round(innerH * 0.48);
  const wallH = innerH - roofH;
  const wallY = innerY + roofH;
  ctx.fillStyle = roofCol;
  ctx.fillRect(innerX, innerY, innerW, roofH);
  ctx.fillStyle = wallCol;
  ctx.fillRect(innerX, wallY, innerW, wallH);
  const sepH = Math.max(2, Math.round(S*0.012));
  ctx.fillStyle = borderCol;
  ctx.fillRect(innerX, wallY - Math.floor(sepH/2), innerW, sepH);
  const floorCount = 4;
  const topMargin = Math.round(wallH*0.06);
  const doorH = Math.round(wallH*0.13);
  const doorW = Math.round(innerW*0.14);
  const doorMargin = Math.round(wallH*0.04);
  const usableH = wallH - topMargin - doorH - doorMargin - Math.round(wallH*0.03);
  const winH = Math.round(usableH * 0.18);
  const winGapV = Math.round(usableH * 0.06);
  const totalWinH = floorCount*winH + (floorCount-1)*winGapV;
  const startY = wallY + topMargin + Math.max(0, Math.floor((usableH - totalWinH)/2));
  const sideMargin = Math.round(innerW*0.07);
  const midGap = Math.round(innerW*0.06);
  const winW = Math.round((innerW - sideMargin*2 - midGap)/2);
  const leftX = innerX + sideMargin;
  const rightX = leftX + winW + midGap;
  ctx.fillStyle = winCol;
  for(let i=0;i<floorCount;i++){
    const y = startY + i*(winH+winGapV);
    ctx.fillRect(leftX, y, winW, winH);
    ctx.fillRect(rightX, y, winW, winH);
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.fillRect(leftX, y, winW, 1);
    ctx.fillRect(rightX, y, winW, 1);
    ctx.fillStyle = winCol;
  }
  const doorX = innerX + (innerW - doorW)/2;
  const doorY = innerY + innerH - doorH - Math.round(wallH*0.03);
  ctx.fillStyle = "#0F1115";
  ctx.fillRect(doorX, doorY, doorW, doorH);
  const acW = Math.round(innerW * 0.11);
  const acH = Math.round(roofH * 0.20);
  const acGapX = Math.round(innerW * 0.016);
  const acGapY = Math.round(roofH * 0.08);
  let variant;
  if(shapeOverride!==null && shapeOverride!==undefined) variant = ((shapeOverride%3)+3)%3;
  else variant = ((tx + ty) % 2);
  if(variant===0){
    const totalAcW = 4*acW + 3*acGapX;
    const totalAcH = 2*acH + acGapY;
    const acStartX = innerX + (innerW - totalAcW)/2;
    const acStartY = innerY + (roofH - totalAcH)/2;
    for(let r=0;r<2;r++){
      for(let c=0;c<4;c++){
        const ax = acStartX + c*(acW+acGapX);
        const ay = acStartY + r*(acH+acGapY);
        ctx.fillStyle = acWhite; ctx.fillRect(ax, ay, acW, acH);
        ctx.fillStyle = acGray; ctx.fillRect(ax, ay + acH*0.70, acW, acH*0.30);
        ctx.fillStyle = acBlack; ctx.beginPath(); ctx.ellipse(ax+acW/2, ay+acH*0.36, acW*0.36, acH*0.28, 0,0,Math.PI*2); ctx.fill();
      }
    }
  } else if(variant===1){
    const groupW = 2*acW + acGapX;
    const groupH = 2*acH + acGapY;
    const groupGap = Math.round(innerW*0.18);
    const totalW2 = groupW*2 + groupGap;
    const acStartX2 = innerX + (innerW - totalW2)/2;
    const acStartY2 = innerY + (roofH - groupH)/2;
    for(let g=0;g<2;g++){
      const gx = acStartX2 + g*(groupW+groupGap);
      for(let r=0;r<2;r++){
        for(let c=0;c<2;c++){
          const ax = gx + c*(acW+acGapX);
          const ay = acStartY2 + r*(acH+acGapY);
          ctx.fillStyle = acWhite; ctx.fillRect(ax, ay, acW, acH);
          ctx.fillStyle = acGray; ctx.fillRect(ax, ay + acH*0.70, acW, acH*0.30);
          ctx.fillStyle = acBlack; ctx.beginPath(); ctx.ellipse(ax+acW/2, ay+acH*0.36, acW*0.36, acH*0.28, 0,0,Math.PI*2); ctx.fill();
        }
      }
    }
  } else {
    // variant 2 : right-clustered 2x4 (like 5-story primary) but with 4-story split windows
    const totalAcW = 4*acW + 3*acGapX;
    const totalAcH = 2*acH + acGapY;
    const acStartX = innerX + innerW - totalAcW - Math.round(innerW*0.07);
    const acStartY = innerY + (roofH - totalAcH)/2;
    for(let r=0;r<2;r++){
      for(let c=0;c<4;c++){
        const ax = acStartX + c*(acW+acGapX);
        const ay = acStartY + r*(acH+acGapY);
        ctx.fillStyle = acWhite; ctx.fillRect(ax, ay, acW, acH);
        ctx.fillStyle = acGray; ctx.fillRect(ax, ay + acH*0.70, acW, acH*0.30);
        ctx.fillStyle = acBlack; ctx.beginPath(); ctx.ellipse(ax+acW/2, ay+acH*0.36, acW*0.36, acH*0.28, 0,0,Math.PI*2); ctx.fill();
      }
    }
  }
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fillRect(ox + S - Math.max(2, Math.round(S*0.015)), oy, Math.max(2, Math.round(S*0.015)), S);
  ctx.fillRect(ox, oy + S - Math.max(2, Math.round(S*0.015)), S, Math.max(2, Math.round(S*0.015)));
  if(needsRestore) ctx.restore();
}
function drawFiveStoryBuilding(px, py, col, tx, ty, span, shapeOverride, rotOverride){
  const S = CFG.TILE * span;
  const rot = ((rotOverride||0)%4+4)%4;
  let needsRestore=false;
  let ox=px, oy=py;
  if(rot!==0){
    const cx=px+S/2, cy=py+S/2;
    ctx.save();
    ctx.translate(cx,cy);
    ctx.rotate(rot*Math.PI/2);
    ctx.translate(-S/2,-S/2);
    ox=0; oy=0;
    needsRestore=true;
  }
  const borderCol = lightenHex(col, 0.18);
  const wallCol = col;
  const roofCol = "#23262D";
  const winCol = "#5B8FD4";
  const acWhite = "#E9EEF3";
  const acGray = "#8A8D93";
  const acBlack = "#05070A";
  const outerBorder = Math.max(3, Math.round(S*0.04));
  ctx.fillStyle = borderCol;
  ctx.fillRect(ox, oy, S, S);
  const innerX = ox + outerBorder;
  const innerY = oy + outerBorder;
  const innerW = S - outerBorder*2;
  const innerH = S - outerBorder*2;
  const roofH = Math.round(innerH * 0.46);
  const wallH = innerH - roofH;
  const wallY = innerY + roofH;
  ctx.fillStyle = roofCol;
  ctx.fillRect(innerX, innerY, innerW, roofH);
  ctx.fillStyle = wallCol;
  ctx.fillRect(innerX, wallY, innerW, wallH);
  const sepH = Math.max(2, Math.round(S*0.012));
  ctx.fillStyle = borderCol;
  ctx.fillRect(innerX, wallY - Math.floor(sepH/2), innerW, sepH);
  const floorCount = 5;
  const topMargin = Math.round(wallH*0.05);
  const doorH = Math.round(wallH*0.11);
  const doorW = Math.round(innerW*0.13);
  const doorMargin = Math.round(wallH*0.04);
  const usableH = wallH - topMargin - doorH - doorMargin - Math.round(wallH*0.02);
  const winH = Math.round(usableH * 0.14);
  const winGapV = Math.round(usableH * 0.045);
  const totalWinH = floorCount*winH + (floorCount-1)*winGapV;
  const startY = wallY + topMargin + Math.max(0, Math.floor((usableH - totalWinH)/2));
  const sideMargin = Math.round(innerW*0.06);
  const winW = innerW - sideMargin*2;
  const winX = innerX + sideMargin;
  ctx.fillStyle = winCol;
  for(let i=0;i<floorCount;i++){
    const y = startY + i*(winH+winGapV);
    ctx.fillRect(winX, y, winW, winH);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fillRect(winX, y, winW, 1);
    ctx.fillStyle = winCol;
  }
  const doorX = innerX + (innerW - doorW)/2;
  const doorY = innerY + innerH - doorH - Math.round(wallH*0.03);
  ctx.fillStyle = "#0F1115";
  ctx.fillRect(doorX, doorY, doorW, doorH);
  const acW = Math.round(innerW * 0.105);
  const acH = Math.round(roofH * 0.20);
  const acGapX = Math.round(innerW * 0.015);
  const acGapY = Math.round(roofH * 0.08);
  let variant;
  if(shapeOverride!==null && shapeOverride!==undefined) variant = ((shapeOverride%3)+3)%3;
  else variant = ((tx + ty) % 2);
  if(variant===0){
    const totalAcW = 4*acW + 3*acGapX;
    const totalAcH = 2*acH + acGapY;
    const acStartX = innerX + innerW - totalAcW - Math.round(innerW*0.07);
    const acStartY = innerY + (roofH - totalAcH)/2;
    for(let r=0;r<2;r++){
      for(let c=0;c<4;c++){
        const ax = acStartX + c*(acW+acGapX);
        const ay = acStartY + r*(acH+acGapY);
        ctx.fillStyle = acWhite; ctx.fillRect(ax, ay, acW, acH);
        ctx.fillStyle = acGray; ctx.fillRect(ax, ay + acH*0.70, acW, acH*0.30);
        ctx.fillStyle = acBlack; ctx.beginPath(); ctx.ellipse(ax+acW/2, ay+acH*0.36, acW*0.34, acH*0.27, 0,0,Math.PI*2); ctx.fill();
      }
    }
  } else if(variant===1){
    const totalAcW = 4*acW + 3*acGapX;
    const totalAcH = 2*acH + acGapY;
    const acStartX = innerX + (innerW - totalAcW)/2;
    const acStartY = innerY + (roofH - totalAcH)/2;
    for(let r=0;r<2;r++){
      for(let c=0;c<4;c++){
        const ax = acStartX + c*(acW+acGapX);
        const ay = acStartY + r*(acH+acGapY);
        ctx.fillStyle = acWhite; ctx.fillRect(ax, ay, acW, acH);
        ctx.fillStyle = acGray; ctx.fillRect(ax, ay + acH*0.70, acW, acH*0.30);
        ctx.fillStyle = acBlack; ctx.beginPath(); ctx.ellipse(ax+acW/2, ay+acH*0.36, acW*0.34, acH*0.27, 0,0,Math.PI*2); ctx.fill();
      }
    }
  } else {
    // variant 2 : split left/right 2x2 groups
    const groupW = 2*acW + acGapX;
    const groupH = 2*acH + acGapY;
    const groupGap = Math.round(innerW*0.18);
    const totalW2 = groupW*2 + groupGap;
    const acStartX2 = innerX + (innerW - totalW2)/2;
    const acStartY2 = innerY + (roofH - groupH)/2;
    for(let g=0;g<2;g++){
      const gx = acStartX2 + g*(groupW+groupGap);
      for(let r=0;r<2;r++){
        for(let c=0;c<2;c++){
          const ax = gx + c*(acW+acGapX);
          const ay = acStartY2 + r*(acH+acGapY);
          ctx.fillStyle = acWhite; ctx.fillRect(ax, ay, acW, acH);
          ctx.fillStyle = acGray; ctx.fillRect(ax, ay + acH*0.70, acW, acH*0.30);
          ctx.fillStyle = acBlack; ctx.beginPath(); ctx.ellipse(ax+acW/2, ay+acH*0.36, acW*0.34, acH*0.27, 0,0,Math.PI*2); ctx.fill();
        }
      }
    }
  }
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fillRect(ox + S - Math.max(2, Math.round(S*0.015)), oy, Math.max(2, Math.round(S*0.015)), S);
  ctx.fillRect(ox, oy + S - Math.max(2, Math.round(S*0.015)), S, Math.max(2, Math.round(S*0.015)));
  if(needsRestore) ctx.restore();
}
function drawSingleStoryBuilding(px, py, col, tx, ty, span, shapeOverride, rotOverride){
  const S = CFG.TILE * span;
  const rot = ((rotOverride||0)%4+4)%4;
  let needsRestore=false;
  let ox=px, oy=py;
  if(rot!==0){
    const cx=px+S/2, cy=py+S/2;
    ctx.save();
    ctx.translate(cx,cy);
    ctx.rotate(rot*Math.PI/2);
    ctx.translate(-S/2,-S/2);
    ox=0; oy=0;
    needsRestore=true;
  }
  const borderCol = lightenHex(col, 0.18);
  const roofCol = col;
  const wallCol = darkenHex(col, 0.06);
  const outerBorder = Math.max(3, Math.round(S*0.04));
  ctx.fillStyle = borderCol;
  ctx.fillRect(ox, oy, S, S);
  const innerX = ox + outerBorder;
  const innerY = oy + outerBorder;
  const innerW = S - outerBorder*2;
  const innerH = S - outerBorder*2;
  const roofH = Math.round(innerH * 0.80);
  const wallH = innerH - roofH;
  const wallY = innerY + roofH;
  ctx.fillStyle = roofCol;
  ctx.fillRect(innerX, innerY, innerW, roofH);
  ctx.fillStyle = wallCol;
  ctx.fillRect(innerX, wallY, innerW, wallH);
  const sepH = Math.max(2, Math.round(S*0.012));
  ctx.fillStyle = borderCol;
  ctx.fillRect(innerX, wallY - Math.floor(sepH/2), innerW, sepH);
  // bottom windows and door - shared base but color variant per shape
  let variant;
  if(shapeOverride!==null && shapeOverride!==undefined) variant = ((shapeOverride%3)+3)%3;
  else {
    const seed = (hashTile(tx, ty) ^ 0x9e3779b9) >>> 0;
    variant = seed % 3;
  }
  // side windows and door configuration per variant
  // variant 0 : central AC + dual vents, brown sides + black door (image 1)
  // variant 1 : brown rectangle + vertical double AC, brown sides + black door (image 2)
  // variant 2 : tall gray rectangle + single AC, black sides + brown door (image 3)
  const sideWinW = Math.round(innerW * 0.22);
  const sideWinH = Math.round(wallH * 0.55);
  const sideY = wallY + Math.round(wallH * 0.20);
  const leftX = innerX + Math.round(innerW * 0.12);
  const rightX = innerX + innerW - sideWinW - Math.round(innerW * 0.12);
  const doorW = Math.round(innerW * 0.13);
  const doorH = Math.round(wallH * 0.75);
  const doorX = innerX + (innerW - doorW)/2;
  const doorY = innerY + innerH - doorH - Math.max(1, Math.round(S*0.01));
  let sideCol, doorCol;
  if(variant===2){
    sideCol = "#1A1E22";
    doorCol = "#3D2814";
  } else {
    sideCol = "#3D2814";
    doorCol = "#0F1115";
  }
  ctx.fillStyle = sideCol;
  ctx.fillRect(leftX, sideY, sideWinW, sideWinH);
  ctx.fillRect(rightX, sideY, sideWinW, sideWinH);
  ctx.fillStyle = doorCol;
  ctx.fillRect(doorX, doorY, doorW, doorH);
  // roof structures per variant
  const acWhite = "#E6EAF0";
  const acGray = "#8D8F93";
  const acBlack = "#070A0F";
  if(variant===0){
    // single central AC (left-center) + dual small vents at top-right
    const acW = Math.round(innerW * 0.13);
    const acH = Math.round(innerW * 0.13);
    const acX = innerX + Math.round(innerW * 0.30);
    const acY = innerY + Math.round(roofH * 0.45);
    ctx.fillStyle = acWhite;
    ctx.fillRect(acX, acY, acW, acH);
    ctx.fillStyle = acGray;
    ctx.fillRect(acX, acY + acH*0.78, acW, acH*0.22);
    ctx.fillStyle = acBlack;
    ctx.beginPath();
    ctx.ellipse(acX+acW/2, acY+acH*0.40, acW*0.38, acH*0.32, 0,0,Math.PI*2);
    ctx.fill();
    // dual vents - two small black ovals at top-right corner
    const ventW = Math.round(innerW * 0.07);
    const ventH = Math.round(innerW * 0.055);
    const ventY = innerY + Math.round(roofH * 0.08);
    const ventX1 = innerX + innerW - ventW*2 - Math.round(innerW*0.04) - Math.round(innerW*0.02);
    const ventX2 = ventX1 + ventW + Math.round(innerW*0.01);
    ctx.fillStyle = acBlack;
    ctx.beginPath(); ctx.ellipse(ventX1+ventW/2, ventY+ventH/2, ventW/2, ventH/2, 0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(ventX2+ventW/2, ventY+ventH/2, ventW/2, ventH/2, 0,0,Math.PI*2); ctx.fill();
  } else if(variant===1){
    // large brown rectangle at top-left + vertical double AC on right
    const brW = Math.round(innerW * 0.52);
    const brH = Math.round(roofH * 0.32);
    const brX = innerX + Math.round(innerW * 0.06);
    const brY = innerY + Math.round(roofH * 0.08);
    ctx.fillStyle = "#8B5A2B";
    ctx.fillRect(brX, brY, brW, brH);
    ctx.fillStyle = "#5C3A16";
    ctx.fillRect(brX, brY + brH*0.78, brW, brH*0.22);
    // vertical double AC on right side
    const acW = Math.round(innerW * 0.11);
    const acH = Math.round(innerW * 0.11);
    const acGap = Math.round(innerW * 0.015);
    const acX = innerX + innerW - acW - Math.round(innerW * 0.08);
    const acY1 = innerY + Math.round(roofH * 0.35);
    const acY2 = acY1 + acH + acGap;
    for(const ay of [acY1, acY2]){
      ctx.fillStyle = acWhite; ctx.fillRect(acX, ay, acW, acH);
      ctx.fillStyle = acGray; ctx.fillRect(acX, ay + acH*0.76, acW, acH*0.24);
      ctx.fillStyle = acBlack; ctx.beginPath(); ctx.ellipse(acX+acW/2, ay+acH*0.40, acW*0.34, acH*0.30, 0,0,Math.PI*2); ctx.fill();
    }
  } else {
    // variant 2 : tall light gray rectangle on left + single AC on right
    const grayW = Math.round(innerW * 0.20);
    const grayH = Math.round(roofH * 0.52);
    const grayX = innerX + Math.round(innerW * 0.14);
    const grayY = innerY + Math.round(roofH * 0.30);
    ctx.fillStyle = "#9AA0A6";
    ctx.fillRect(grayX, grayY, grayW, grayH);
    ctx.fillStyle = "#5A5E62";
    ctx.fillRect(grayX, grayY + grayH*0.78, grayW, grayH*0.22);
    // single AC on right middle
    const acW = Math.round(innerW * 0.12);
    const acH = Math.round(innerW * 0.12);
    const acX = innerX + innerW - acW - Math.round(innerW * 0.14);
    const acY = innerY + Math.round(roofH * 0.45);
    ctx.fillStyle = acWhite; ctx.fillRect(acX, acY, acW, acH);
    ctx.fillStyle = acGray; ctx.fillRect(acX, acY + acH*0.76, acW, acH*0.24);
    ctx.fillStyle = acBlack; ctx.beginPath(); ctx.ellipse(acX+acW/2, acY+acH*0.40, acW*0.36, acH*0.30, 0,0,Math.PI*2); ctx.fill();
  }
  // subtle shadow at right/bottom edge
  ctx.fillStyle = "rgba(0,0,0,0.14)";
  ctx.fillRect(ox + S - Math.max(2, Math.round(S*0.015)), oy, Math.max(2, Math.round(S*0.015)), S);
  ctx.fillRect(ox, oy + S - Math.max(2, Math.round(S*0.015)), S, Math.max(2, Math.round(S*0.015)));
  if(needsRestore) ctx.restore();
}
function isBuildingOrigin(x, y, col, h) {
  const leftSame = x > 0 && buildingColor[y]?.[x - 1] === col && buildingHeight[y]?.[x - 1] === h;
  const topSame = y > 0 && buildingColor[y - 1]?.[x] === col && buildingHeight[y - 1]?.[x] === h;
  return !leftSame && !topSame;
}
function drawShop(px, py, S, shopName, rotOverride=0, skipAwning=false){
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
  if(!skipAwning){
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
  }
  if(needsRestore) ctx.restore();
}
function isNewShopDesign(sb){
  if(!sb || (sb.design !== "new" && sb.shopDesign !== "new")) return false;
  const n = (sb.name||"").toLowerCase();
  // eligible: car showroom, binco/clothing, casino, general store
  if(n.includes("car") || n.includes("سيارات") || n.includes("showroom")) return true;
  if(n.includes("binco") || n.includes("clothing") || n.includes("ملابس")) return true;
  if(n.includes("casino") || n.includes("كازينو") || n.includes("caligula")) return true;
  if(n.includes("general")) return true;
  return false;
}
function drawShopNew(px, py, S, shopName, rotOverride=0, skipAwning=false){
  const rot = ((rotOverride||0)%4+4)%4;
  let drawPx = px, drawPy = py;
  let needsRestore = false;
  if(rot!==0){
    const cx = px+S/2, cy = py+S/2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot*Math.PI/2);
    ctx.translate(-S/2, -S/2);
    drawPx = 0; drawPy = 0;
    needsRestore = true;
  }
  const img = SHOP_BUILDING_1_IMG.img;
  // SVG viewBox 0 0 300 300 already contains full shop (building + ACs + striped awning + supports)
  // Draw at S×S so it perfectly replaces the previous procedural building+awning
  if(img && img.complete && img.naturalWidth){
    if(!skipAwning){
      ctx.drawImage(img, drawPx, drawPy, S, S);
    } else {
      // Neighbor in awning direction — hide awning/bottom ~22% to avoid overlap
      // Awning starts at ~233/300 ≈78% from top, so clip to top 78%
      ctx.save();
      ctx.beginPath();
      ctx.rect(drawPx, drawPy, S, Math.round(S*0.78));
      ctx.clip();
      ctx.drawImage(img, drawPx, drawPy, S, S);
      ctx.restore();
    }
  } else {
    // Fallback while image is loading — dark building placeholder
    const bw = Math.max(3, Math.round(S*0.04));
    ctx.fillStyle = "#c3c3c3";
    ctx.fillRect(drawPx, drawPy, S, S);
    ctx.fillStyle = "#353639";
    ctx.fillRect(drawPx+2, drawPy+2, S-4, S-4);
    ctx.fillStyle = "#c3c3c3";
    ctx.fillRect(drawPx+bw, drawPy+bw, S-bw*2, S-bw*2);
    ctx.fillStyle = "#353639";
    ctx.fillRect(drawPx+bw+2, drawPy+bw+2, S-bw*4, S-bw*4);
    ctx.fillStyle = "#fff";
    ctx.font = `bold ${Math.max(8, Math.round(S*0.08))}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText("SHOP", drawPx+S/2, drawPy+S/2);
  }
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
    if (h === 1) {
      drawSingleStoryBuilding(bx, by, col, b.x, b.y, span, shape, rot);
    } else if (h <= 3) {
      drawLowBuilding(bx, by, col, b.x, b.y, h, span, shape, rot);
    } else if (h === 4) {
      drawFourStoryBuilding(bx, by, col, b.x, b.y, span, shape, rot);
    } else {
      drawFiveStoryBuilding(bx, by, col, b.x, b.y, span, shape, rot);
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

  // Draw special buildings (shops) as distinct 2x2 blocks (fix: adjacent same-type shops no longer merged)
  {
    const sbMap = new Map();
    for (const sb of specialBuildings) sbMap.set(sb.x + "," + sb.y, sb);
    const sbVisited = new Set();
    for (const sb of specialBuildings) {
      const key = sb.x + "," + sb.y;
      if (sbVisited.has(key)) continue;
      // Try to detect a valid 2x2 shop with this tile as top-left
      const right = sbMap.get((sb.x+1)+","+sb.y);
      const down = sbMap.get(sb.x+","+(sb.y+1));
      const diag = sbMap.get((sb.x+1)+","+(sb.y+1));
      let isOrigin2x2 = false;
      let group = null;
      if (right && down && diag && right.name===sb.name && down.name===sb.name && diag.name===sb.name) {
        // Check that all 4 are not already visited (ensures greedy left-to-right, top-to-bottom partitioning)
        if (!sbVisited.has((sb.x+1)+","+sb.y) && !sbVisited.has(sb.x+","+(sb.y+1)) && !sbVisited.has((sb.x+1)+","+(sb.y+1))) {
          isOrigin2x2 = true;
          group = [sb, right, down, diag];
          for (const g of group) sbVisited.add(g.x+","+g.y);
        }
      }
      if (isOrigin2x2 && group) {
        const minX = sb.x, minY = sb.y;
        const S = 2 * CFG.TILE;
        const shopPx = minX * CFG.TILE;
        const shopPy = minY * CFG.TILE;
        const shopRot = (buildingRotation[minY] && buildingRotation[minY][minX] != null) ? buildingRotation[minY][minX] : 0;
        // Determine if there's a shop directly in awning direction to avoid overlap
        let hasShopInAwningDir = false;
        const rot = ((shopRot%4)+4)%4;
        // Awning direction in world tiles: 0=south,1=west,2=north,3=east
        let checkX1, checkY1, checkX2, checkY2;
        if (rot===0) { // south
          checkX1 = minX; checkY1 = minY+2; checkX2 = minX+1; checkY2 = minY+2;
        } else if (rot===1) { // west (awning to west)
          checkX1 = minX-1; checkY1 = minY; checkX2 = minX-1; checkY2 = minY+1;
        } else if (rot===2) { // north
          checkX1 = minX; checkY1 = minY-1; checkX2 = minX+1; checkY2 = minY-1;
        } else { // east
          checkX1 = minX+2; checkY1 = minY; checkX2 = minX+2; checkY2 = minY+1;
        }
        if (sbMap.has(checkX1+","+checkY1) || sbMap.has(checkX2+","+checkY2)) {
          hasShopInAwningDir = true;
        }
        // New-Striped uses taller supports (0.115*S awning + 0.025 gap + 0.15 center), old uses 0.16*S — use max for culling
        const awningExtra = hasShopInAwningDir ? 0 : Math.round(S * 0.30);
        if (shopPx + S < cam.x - viewW/2 - 50 || shopPx > cam.x + viewW/2 + 50 ||
            shopPy + S + awningExtra < cam.y - viewH/2 - 50 || shopPy > cam.y + viewH/2 + 50) {
          // culled
        } else {
          if(isNewShopDesign(sb)){
            drawShopNew(shopPx, shopPy, S, sb.name, shopRot, hasShopInAwningDir);
          } else {
            drawShop(shopPx, shopPy, S, sb.name, shopRot, hasShopInAwningDir);
          }
        }
        // Label
        const cx = (minX+1) * CFG.TILE;
        const cy = (minY+1) * CFG.TILE;
        if (Math.hypot(target.x - cx, target.y - cy) < 320) {
          ctx.fillStyle = "rgba(0,0,0,0.7)";
          ctx.fillRect(cx - 40, cy - 26, 80, 16);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 10px Arial";
          ctx.textAlign = "center";
          ctx.fillText(sb.name, cx, cy - 14);
        }
      } else {
        // Not a 2x2 origin - check if this tile is part of a 2x2 already visited (should be skipped) or orphan single tile
        // If this tile was not visited as part of a 2x2 but is isolated, draw as single tile fallback
        // Since we only mark origins and their 3 neighbors as visited, any tile that is not an origin but is interior of a 2x2 will already be visited, so we skip.
        // Only orphan tiles (not part of any 2x2) reach here as singletons.
        if (sbVisited.has(key)) continue; // already part of a 2x2, skip fallback (should not happen because we checked visited at top)
        sbVisited.add(key);
        const px = sb.x * CFG.TILE, py = sb.y * CFG.TILE;
        if (px + CFG.TILE < cam.x - viewW/2 - 20 || px > cam.x + viewW/2 + 20 ||
            py + CFG.TILE < cam.y - viewH/2 - 20 || py > cam.y + viewH/2 + 20) continue;
        ctx.fillStyle = sb.color || "#cc8844";
        ctx.fillRect(px, py, CFG.TILE, CFG.TILE);
        ctx.strokeStyle = "rgba(255,255,255,0.15)";
        ctx.strokeRect(px+1, py+1, CFG.TILE-2, CFG.TILE-2);
        // Label for single tile
        const cx = px + CFG.TILE/2;
        const cy = py + CFG.TILE/2;
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

    // Draw vehicle SVG overlay (wheels, windows, lights) - robust to deserialized types
    let va = null;
    if(typeof v.typeIdx === 'number' && v.typeIdx >=0 && VEHICLE_ASSETS[v.typeIdx]){
      va = VEHICLE_ASSETS[v.typeIdx];
    } else {
      const typeIdx = VEHICLE_TYPES.indexOf(v.type);
      va = typeIdx >= 0 ? VEHICLE_ASSETS[typeIdx] : null;
      if(!va && v.type && v.type.name){
        va = VEHICLE_ASSETS.find(a=> a.name.toLowerCase().includes(v.type.name.slice(0,3).toLowerCase())) || null;
      }
    }
    if (va && va.img && va.img.complete && va.img.naturalWidth) {
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

