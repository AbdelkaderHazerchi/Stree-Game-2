// ======================== MISSION STATE ========================
// Extracted from game.js:51604-51605, 51848-51852 - no logic changed

export let checkpoints = [];
export let missionGivers = [];
export let particles = [];
export let currentMission = null;
export let missionsCompleted = 0;
export let allMissions = [];
export let sequentialMissionIndex = 0;
export let usingSequentialMissions = false;

export function setCurrentMission(v){ currentMission = v; }
export function setMissionsCompleted(v){ missionsCompleted = v; }
export function setAllMissions(v){ allMissions = v; }
export function setMissionGivers(v){ missionGivers = v; }
export function setSequentialMissionIndex(v){ sequentialMissionIndex = v; }
export function setUsingSequentialMissions(v){ usingSequentialMissions = v; }
export function clearCheckpoints(){ checkpoints.length = 0; }
export function clearMissionGivers(){ missionGivers.length = 0; }
