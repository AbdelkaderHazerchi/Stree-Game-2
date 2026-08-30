// ======================== TILE ASSETS (SVG) ========================
// Extracted from game.js:365-380 - no logic changed
import { T } from "../core/config.js?v=25";

export const TILE_ASSETS = {
  [T.WATER]: { name: "water", src: "assets/water.svg", img: null },
  [T.ROAD]: { name: "road", src: "assets/road.svg", img: null },
  [T.SIDEWALK]: { name: "sand", src: "assets/sand.svg", img: null },
  [T.BUILDING]: {
    name: "building",
    src: "assets/building_detail.svg",
    img: null,
  },
  [T.PARK]: { name: "park", src: "assets/park.svg", img: null },
  [T.PARKING]: { name: "parking", src: "assets/parking.svg", img: null },
  [T.SPECIAL]: { name: "special", src: "assets/special_detail.svg", img: null },
  [T.PAVEMENT]: { name: "pavement", src: "assets/pavement.svg", img: null },
};

export const ROAD_CROSSWALK_IMG = { src: "assets/road_crosswalk.svg", img: null };
export const SAND_IMG = { src: "assets/sand.svg", img: null };
export const PAVEMENT_IMG = { src: "assets/pavement.svg", img: null };
