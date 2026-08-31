// ======================== MAP STATE ========================
// Extracted from game.js:470-475 + 51118-51213 - no logic changed
import { CFG } from "../core/config.js?v=26";

// ======================== MAP ========================
export let map = [];
export let buildings = [];
export let specialBuildings = [];
export let buildingColor = [];
export let buildingHeight = [];
export let buildingShape = [];
export let buildingRotation = [];

// Spawn point in tile coordinates {x,y} or null if not defined
export let spawnPoint = null;
export function setSpawnPoint(v) { spawnPoint = v; }
export function getSpawnPoint() { return spawnPoint; }
// Returns pixel coordinates {x,y} at tile center for the spawn, or null if none
export function getSpawnPixel() {
  if (!spawnPoint || typeof spawnPoint.x !== "number" || typeof spawnPoint.y !== "number") return null;
  const TILE = (CFG && CFG.TILE) || 96;
  return { x: spawnPoint.x * TILE + TILE / 2, y: spawnPoint.y * TILE + TILE / 2 };
}

export function setMap(v) { map = v; }
export function setBuildings(v) { buildings = v; }
export function setSpecialBuildings(v) { specialBuildings = v; }
export function setBuildingColor(v) { buildingColor = v; }
export function setBuildingHeight(v) { buildingHeight = v; }
export function setBuildingShape(v) { buildingShape = v; }
export function setBuildingRotation(v) { buildingRotation = v; }
export function clearBuildings() { buildings.length = 0; }
export function clearSpecialBuildings() { specialBuildings.length = 0; }

export const PALETTES = {
  hills: [
    "#C4A882",
    "#D2B48C",
    "#DEB887",
    "#E8C396",
    "#C4956A",
    "#D4A574",
    "#BC8F8F",
    "#A0826A",
    "#B8966E",
  ],
  downtown: [
    "#808080",
    "#999999",
    "#A0A0A0",
    "#707070",
    "#B0B0B0",
    "#606060",
    "#888888",
    "#A8A8A8",
    "#C0C0C0",
    "#585858",
    "#7A7A7A",
    "#969696",
  ],
  suburb: [
    "#F5DEB3",
    "#FAEBD7",
    "#FFE4C4",
    "#E8D5B7",
    "#FFF8DC",
    "#F0E68C",
    "#FFFACD",
    "#EEDD82",
    "#FDF5E6",
  ],
  market: [
    "#D2B48C",
    "#DEB887",
    "#A0A0A0",
    "#C0C0C0",
    "#F5DEB3",
    "#E8C396",
    "#D4A574",
    "#B0A090",
  ],
  midtown: [
    "#999999",
    "#A8A8A8",
    "#888888",
    "#707070",
    "#B8B8B8",
    "#787878",
    "#A0A0A0",
    "#858585",
  ],
  airport: [
    "#B0B0B0",
    "#C8C8C8",
    "#A0A0A0",
    "#D0D0D0",
    "#909090",
    "#BBBBBB",
    "#A9A9A9",
  ],
  industrial: [
    "#696969",
    "#808080",
    "#778899",
    "#708090",
    "#A9A9A9",
    "#545454",
    "#7A7A7A",
    "#8B8B83",
  ],
  beach: [
    "#F5DEB3",
    "#FFE4B5",
    "#FFDAB9",
    "#FAEBD7",
    "#E8D5B7",
    "#FFF5EE",
    "#FDF5E6",
    "#FFF8DC",
  ],
  docks: [
    "#708090",
    "#778899",
    "#B0C4DE",
    "#7A8B8B",
    "#A9A9A9",
    "#6B7B8D",
    "#8A9A9A",
  ],
};
