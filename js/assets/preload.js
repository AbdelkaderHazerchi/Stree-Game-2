// ======================== PRELOAD ASSETS ========================
// Extracted from game.js:390-423 - no logic changed
import { TILE_ASSETS, ROAD_CROSSWALK_IMG, SAND_IMG, PAVEMENT_IMG, SHOP_BUILDING_1_IMG } from "./tileAssets.js?v=26";
import { VEHICLE_ASSETS, EXPLOSION_ASSET } from "./vehicleAssets.js?v=26";

function loadImgWithTimeout(asset, timeoutMs=3000){
  return new Promise((resolve)=>{
    let done=false;
    const finish=()=>{ if(done) return; done=true; resolve(); };
    const timer=setTimeout(finish, timeoutMs);
    asset.img = new Image();
    asset.img.onload = ()=>{ clearTimeout(timer); finish(); };
    asset.img.onerror = ()=>{ clearTimeout(timer); console.warn('[preload] failed', asset.src); finish(); };
    asset.img.src = asset.src;
  });
}
export function preloadAssets() {
  return Promise.all([
    ...Object.values(TILE_ASSETS).map(a=> loadImgWithTimeout(a)),
    loadImgWithTimeout(ROAD_CROSSWALK_IMG),
    loadImgWithTimeout(SAND_IMG),
    loadImgWithTimeout(PAVEMENT_IMG),
    loadImgWithTimeout(SHOP_BUILDING_1_IMG),
    ...VEHICLE_ASSETS.map(a=> loadImgWithTimeout(a)),
    loadImgWithTimeout(EXPLOSION_ASSET),
  ]);
}
