// ======================== TILE ASSETS (SVG) ========================
// Extracted from game.js:365-380 - no logic changed
import { T } from "../core/config.js?v=26";

export const TILE_ASSETS = {
  [T.WATER]: { name: "water", src: "assets/water.svg?v=26", img: null },
  [T.ROAD]: { name: "road", src: "assets/road.svg?v=26", img: null },
  [T.SIDEWALK]: { name: "sand", src: "assets/sand.svg?v=26", img: null },
  [T.BUILDING]: {
    name: "building",
    src: "assets/building_detail.svg?v=26",
    img: null,
  },
  [T.PARK]: { name: "park", src: "assets/park.svg?v=26", img: null },
  [T.PARKING]: { name: "parking", src: "assets/parking.svg?v=26", img: null },
  [T.SPECIAL]: { name: "special", src: "assets/special_detail.svg?v=26", img: null },
  [T.PAVEMENT]: { name: "pavement", src: "assets/pavement.svg?v=26", img: null },
};

export const SAND_IMG = { src: "assets/sand.svg?v=26", img: null };
export const PAVEMENT_IMG = { src: "assets/pavement.svg?v=26", img: null };
export const SHOP_BUILDING_1_IMG = { src: "assets/shop_building_1.svg?v=26", img: null };
export const POLICE_STATION_IMG = { src: "assets/police_station.svg?v=26", img: null };
export const HOSPITAL_IMG = { src: "assets/hospital_building.svg?v=26", img: null };
export const BANK_IMG = { src: "assets/bank_building.svg?v=26", img: null };
