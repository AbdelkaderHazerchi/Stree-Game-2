// ======================== PRELOAD ASSETS ========================
// Extracted from game.js:390-423 - no logic changed
import { TILE_ASSETS, ROAD_CROSSWALK_IMG, SAND_IMG } from "./tileAssets.js?v=15";
import { VEHICLE_ASSETS, EXPLOSION_ASSET } from "./vehicleAssets.js?v=15";

export function preloadAssets() {
  return Promise.all([
    ...Object.values(TILE_ASSETS).map(
      (a) =>
        new Promise((resolve) => {
          a.img = new Image();
          a.img.onload = resolve;
          a.img.onerror = resolve;
          a.img.src = a.src;
        }),
    ),
    new Promise((resolve) => {
      ROAD_CROSSWALK_IMG.img = new Image();
      ROAD_CROSSWALK_IMG.img.onload = resolve;
      ROAD_CROSSWALK_IMG.img.onerror = resolve;
      ROAD_CROSSWALK_IMG.img.src = ROAD_CROSSWALK_IMG.src;
    }),
    new Promise((resolve) => {
      SAND_IMG.img = new Image();
      SAND_IMG.img.onload = resolve;
      SAND_IMG.img.onerror = resolve;
      SAND_IMG.img.src = SAND_IMG.src;
    }),
    ...VEHICLE_ASSETS.map(
      (a) =>
        new Promise((resolve) => {
          a.img = new Image();
          a.img.onload = resolve;
          a.img.onerror = resolve;
          a.img.src = a.src;
        }),
    ),
    new Promise((resolve) => {
      EXPLOSION_ASSET.img = new Image();
      EXPLOSION_ASSET.img.onload = resolve;
      EXPLOSION_ASSET.img.onerror = resolve;
      EXPLOSION_ASSET.img.src = EXPLOSION_ASSET.src;
    }),
  ]);
}
