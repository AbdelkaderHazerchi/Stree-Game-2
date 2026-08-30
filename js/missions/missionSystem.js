// ======================== MISSION / QUEST SYSTEM (comprehensive overhaul) ========================
// Two-point (Start→End), Main (yellow sequential) / Side (purple all-visible), bilingual AR/EN
// Backward compatible with legacy missionGivers random generation

import { CFG, T } from "../core/config.js?v=25";
import { getTile } from "../map/mapUtils.js?v=25";
import { isWalkable } from "../entities/vehicles.js?v=25";
import { vehicles } from "../entities/vehicles.js?v=25";
import { npcs } from "../entities/npcs.js?v=25";
import { player } from "../entities/player.js?v=25";
import { keys } from "../input/inputState.js?v=25";
import { actionHeld, actionJust } from "../input/keyboard.js?v=25";
import { police } from "../entities/police.js?v=25";
import { specialBuildings } from "../map/mapState.js?v=25";
import { showNotification, updateSuspicionUI, hideSuspicionUI } from "../ui/hud.js?v=25";
import { missionTitle, missionDesc, missionProg } from "../core/domRefs.js?v=25";
import {
  currentMission, allMissions, sequentialMissionIndex, usingSequentialMissions, missionGivers, checkpoints, particles, missionsCompleted,
  setCurrentMission, setMissionsCompleted, setAllMissions, setMissionGivers, setSequentialMissionIndex, setUsingSequentialMissions,
  quests, mainQuests, sideQuests, activeQuestId, questStatus, mainQuestIndex,
  setQuests, setMainQuests, setSideQuests, setActiveQuestId, setQuestStatus, setMainQuestIndex, getQuestById
} from "./missionState.js?v=25";
import { SETTINGS } from "../input/settings.js?v=25";
import { MISSION_REWARDS, MISSION_DESCS, getQuestDisplayTitle, getQuestDisplayDesc, QUEST_TYPE_I18N, getQuestIcon } from "./missionDefs.js?v=25";
import { t } from "../ui/i18n.js?v=25";

// Helper: language
function lang(){ return (SETTINGS && SETTINGS.language==="en") ? "en":"ar"; }
// Helper: title/desc from quest object (bilingual)
function qTitle(q){ return getQuestDisplayTitle(q, lang()); }
function qDesc(q){ return getQuestDisplayDesc(q, lang()); }

function normalizeQuestForRuntime(raw, idx){
  const type = raw.type || "deliverShipment";
  const category = raw.category==="side" ? "side":"main";
  const icon = raw.icon || getQuestIcon(type) || "⭐";
  const reward = typeof raw.reward==="number" ? raw.reward : (MISSION_REWARDS[type] ?? 300);
  let title = raw.title;
  if(!title) title = {ar: (QUEST_TYPE_I18N[type]&&QUEST_TYPE_I18N[type].title.ar)||type, en: (QUEST_TYPE_I18N[type]&&QUEST_TYPE_I18N[type].title.en)||type};
  else if(typeof title==="string") title={ar:title,en:title};
  let desc = raw.desc;
  if(!desc) desc = {ar: (QUEST_TYPE_I18N[type]&&QUEST_TYPE_I18N[type].desc.ar)||"", en: (QUEST_TYPE_I18N[type]&&QUEST_TYPE_I18N[type].desc.en)||""};
  else if(typeof desc==="string") desc={ar:desc,en:desc};
  const start = raw.start ? {x:Math.floor(raw.start.x), y:Math.floor(raw.start.y)} : (typeof raw.x==="number" ? {x:Math.floor(raw.x), y:Math.floor(raw.y)} : {x:0,y:0});
  const end = raw.end ? {x:Math.floor(raw.end.x), y:Math.floor(raw.end.y)} : (typeof raw.endX==="number"? {x:Math.floor(raw.endX), y:Math.floor(raw.endY)} : {x: Math.min(CFG.COLS-1, start.x+4), y: start.y});
  return { id: raw.id||`q_${category}_${idx}_${type}_${start.x}_${start.y}`, category, type, icon, reward, order: (typeof raw.order==="number"? raw.order: idx), start, end, title, desc };
}

export function generateMissions() {
  allMissions.length = 0;
  missionGivers.length = 0;
  quests.length = 0;
  mainQuests.length = 0;
  sideQuests.length = 0;
  // reset quest status
  if(questStatus instanceof Map) questStatus.clear();
  else { setQuestStatus(new Map()); }
  setActiveQuestId(null);
  setMainQuestIndex(0);
  setSequentialMissionIndex(0);

  const hasQuests = window._mapQuests && window._mapQuests.length>0;
  const hasLegacyMG = window._mapMissionGivers && window._mapMissionGivers.length>0;

  if (hasQuests) {
    // New two-point system
    setUsingSequentialMissions(true);
    const normalized = window._mapQuests.map((raw, idx)=> normalizeQuestForRuntime(raw, idx));
    // sort mains by order
    normalized.sort((a,b)=>{
      if(a.category!==b.category) return a.category==="main" ? -1:1;
      if(a.category==="main") return (a.order||0)-(b.order||0);
      return 0;
    });
    // reassign main orders sequentially
    let mo=0;
    normalized.forEach(q=>{ if(q.category==="main") q.order=mo++; });
    // push to state
    normalized.forEach(q=>{
      quests.push(q);
      if(q.category==="main") mainQuests.push(q); else sideQuests.push(q);
      // build legacy-compatible missionGivers entry + allMissions
      const mDef = {
        name: getQuestDisplayTitle(q,"ar"), // legacy ar fallback
        desc: getQuestDisplayDesc(q,"ar"),
        icon: q.icon,
        type: q.type,
        reward: q.reward,
        // keep bilingual for new UI
        title: q.title,
        questId: q.id,
        category: q.category,
        start: q.start,
        end: q.end
      };
      allMissions.push(mDef);
      const sx = q.start.x * CFG.TILE + CFG.TILE/2;
      const sy = q.start.y * CFG.TILE + CFG.TILE/2;
      const ex = q.end.x * CFG.TILE + CFG.TILE/2;
      const ey = q.end.y * CFG.TILE + CFG.TILE/2;
      missionGivers.push({
        x: sx, y: sy,
        endX: ex, endY: ey,
        type: q.type,
        mission: mDef,
        questId: q.id,
        category: q.category,
        taken: false,
        completed: false,
        order: q.order,
        title: q.title,
        desc: q.desc,
        icon: q.icon
      });
    });
    // Initialize questStatus: first main available, rest locked; sides available
    mainQuests.forEach((q, idx)=>{
      questStatus.set(q.id, idx===0 ? "available" : "locked");
    });
    sideQuests.forEach(q=> questStatus.set(q.id, "available"));
    return;
  }

  if (hasLegacyMG) {
    // Legacy migration: _mapMissionGivers flat start points -> treat as main sequential with auto end offset
    setUsingSequentialMissions(true);
    const MISSION_REWARDS_LEG = { taxi:200, race:500, delivery:300, heist:1000, chase:400, collection:600, protect:350, smuggle:750, stealCar:300, transport:400, killPolice:500, killCivilians:400, killGang:450, smuggleProhibited:800, smuggleWeapons:900 };
    const MISSION_DESCS_LEG = { taxi:"أوصل الركاب إلى وجهاتهم", race:"تجاوز نقاط التفتيش في الوقت المحدد", delivery:"التقط الطرد وقم بتوصيله", heist:"اسرق البنك واهرب من الشرطة", chase:"طارد السيارة المستهدفة", collection:"اجمع 5 نقاط في جميع أنحاء المدينة", protect:"احمِ المنطقة من المجرمين", smuggle:"سلم البضاعة عبر المدينة", stealCar:"اسرق السيارة المستهدفة", transport:"انقل البضاعة عبر المدينة", killPolice:"تخلص من عناصر الشرطة", killCivilians:"اقتل 5 من المدنيين", killGang:"قضِ على أفراد العصابة", smuggleProhibited:"هرّب الشحنة بأمان", smuggleWeapons:"سلّم الأسلحة إلى الوجهة" };
    window._mapMissionGivers.forEach((mg, index)=>{
      const type = mg.type||"taxi";
      const reward = MISSION_REWARDS_LEG[type]??300;
      const descAr = MISSION_DESCS_LEG[type]??"أكمل المهمة";
      const descEn = type;
      const titleAr = mg.title&&mg.title.ar ? mg.title.ar : (QUEST_TYPE_I18N[type] ? QUEST_TYPE_I18N[type].title.ar : type);
      const titleEn = mg.title&&mg.title.en ? mg.title.en : (QUEST_TYPE_I18N[type] ? QUEST_TYPE_I18N[type].title.en : type);
      const sx = Math.floor(mg.x), sy=Math.floor(mg.y);
      const ex = mg.end ? Math.floor(mg.end.x) : Math.min(CFG.COLS-1, sx+4);
      const ey = mg.end ? Math.floor(mg.end.y) : sy;
      const quest = {
        id: mg.id||`q_main_${index}_${type}_${sx}_${sy}`,
        category:"main", type, icon: mg.icon||"⭐", reward, order:index,
        start:{x:sx,y:sy}, end:{x:ex,y:ey},
        title:{ar:titleAr,en:titleEn}, desc:{ar:descAr,en:descEn}
      };
      quests.push(quest); mainQuests.push(quest);
      const mDef={ name:titleAr, desc:descAr, icon:quest.icon, type, reward, title:quest.title, questId:quest.id, category:"main", start:quest.start, end:quest.end };
      allMissions.push(mDef);
      missionGivers.push({ x:sx*CFG.TILE+CFG.TILE/2, y:sy*CFG.TILE+CFG.TILE/2, endX:ex*CFG.TILE+CFG.TILE/2, endY:ey*CFG.TILE+CFG.TILE/2, type, mission:mDef, questId:quest.id, category:"main", taken:false, order:index, title:quest.title, desc:quest.desc, icon:quest.icon });
      questStatus.set(quest.id, index===0?"available":"locked");
    });
    return;
  }

  // ── MODE B: No map data — random placement for 11 quest types ──
  setUsingSequentialMissions(false);
  // Yellow mains sequential, purple sides all visible
  const mainDefs = [
    { name:"توصيل شحنة", desc:"سلّم الشحنة إلى الموقع المحدد (شحنة واحدة)", icon:"📦", type:"deliverShipment", reward:400 },
    { name:"قتل هدف", desc:"اقتل العصابة المحددة على الخريطة (مرة واحدة)", icon:"💀", type:"killTarget", reward:500 },
    { name:"زرع قنبلة", desc:"ازرع القنبلة واهرب", icon:"💣", type:"plantBomb", reward:700 },
    { name:"مطاردة صامتة", desc:"اتبع السيارة دون اقتراب/ابتعاد شديد", icon:"🕵️", type:"silentPursuit", reward:600 },
  ];
  const sideDefs = [
    { name:"نقل شخص", desc:"انقل شخصًا إلى الموقع المحدد (مرة واحدة)", icon:"🚕", type:"transportPerson", reward:350 },
    { name:"هروب بالسيارة", desc:"استقل سيارة فتطاردك الشرطة ثم اهرب إلى الموقع المحدد", icon:"🚨", type:"escapeCar", reward:800 },
    { name:"سرقة سيارة", desc:"اسرق سيارة ثم قدها إلى الموقع المحدد (مرة واحدة)", icon:"🚗", type:"stealCar", reward:300 },
    { name:"مراقبة", desc:"ابق داخل الدائرة 30 ثانية", icon:"👁️", type:"surveillance", reward:450 },
    { name:"اجتماع", desc:"تحدث إلى جهة الاتصال", icon:"💬", type:"meeting", reward:200 },
    { name:"سرقة", desc:"اسرق الغرض (20 ثانية)", icon:"🦹", type:"theft", reward:650 },
    { name:"تسليم مسروقات", desc:"سلّم الغرض للموقع", icon:"🎒", type:"deliverLoot", reward:350 },
  ];
  let questCounter=0;
  function randomWalkablePixel(){
    let gx,gy,attempts=0;
    do{
      const tileX=2+Math.floor(Math.random()*(CFG.COLS-6));
      const tileY=2+Math.floor(Math.random()*(CFG.ROWS-6));
      gx=tileX*CFG.TILE+CFG.TILE/2; gy=tileY*CFG.TILE+CFG.TILE/2;
      attempts++;
    }while( (!isWalkable(gx,gy) || vehicles.some(v=>Math.hypot(v.x-gx,v.y-gy)<60)) && attempts<100);
    return {x:gx,y:gy};
  }
  function pixelToTile(p){ return {x: Math.floor(p.x/CFG.TILE), y: Math.floor(p.y/CFG.TILE)}; }
  // Mains sequential
  mainDefs.forEach((mDef, idx)=>{
    const startPx=randomWalkablePixel();
    const endPx=getWalkableTile();
    const st=pixelToTile(startPx), en=pixelToTile(endPx);
    let params = mDef.params ? {...mDef.params} : undefined;
    if(mDef.type==="meeting"){
      params = params || {};
      params.meetingAr = "مرحباً يا بطل";
      params.meetingEn = "Hello hero";
    }
    const q={ id:`q_main_rand_${questCounter++}`, category:"main", type:mDef.type, icon:mDef.icon, reward:mDef.reward, order:idx, start:st, end:en, title:{ar:mDef.name,en:mDef.type}, desc:{ar:mDef.desc,en:mDef.desc}, params, itemName: params?.itemName, meetingAr: params?.meetingAr, meetingEn: params?.meetingEn };
    quests.push(q); mainQuests.push(q);
    const legacyDef={ name:mDef.name, desc:mDef.desc, icon:mDef.icon, type:mDef.type, reward:mDef.reward, title:q.title, questId:q.id, category:"main", start:st, end:en };
    allMissions.push(legacyDef);
    missionGivers.push({ x:startPx.x, y:startPx.y, endX:endPx.x, endY:endPx.y, type:mDef.type, mission:legacyDef, questId:q.id, category:"main", taken:false, order:idx, title:q.title, desc:q.desc, icon:mDef.icon });
    questStatus.set(q.id, idx===0?"available":"locked");
  });
  // Sides all available
  sideDefs.forEach((mDef, idx)=>{
    const startPx=randomWalkablePixel();
    const endPx=getWalkableTile();
    const st=pixelToTile(startPx), en=pixelToTile(endPx);
    let params = mDef.params ? {...mDef.params} : undefined;
    // For meeting, add random bilingual message
    if(mDef.type==="meeting"){
      params = params || {};
      params.meetingAr = "لدي معلومات لك";
      params.meetingEn = "I have intel for you";
    }
    const q={ id:`q_side_rand_${questCounter++}`, category:"side", type:mDef.type, icon:mDef.icon, reward:mDef.reward, order:idx, start:st, end:en, title:{ar:mDef.name,en:mDef.type}, desc:{ar:mDef.desc,en:mDef.desc}, params, itemName: params?.itemName, meetingAr: params?.meetingAr, meetingEn: params?.meetingEn };
    quests.push(q); sideQuests.push(q);
    const legacyDef={ name:mDef.name, desc:mDef.desc, icon:mDef.icon, type:mDef.type, reward:mDef.reward, title:q.title, questId:q.id, category:"side", start:st, end:en };
    allMissions.push(legacyDef);
    missionGivers.push({ x:startPx.x, y:startPx.y, endX:endPx.x, endY:endPx.y, type:mDef.type, mission:legacyDef, questId:q.id, category:"side", taken:false, order:idx, title:q.title, desc:q.desc, icon:mDef.icon });
    questStatus.set(q.id, "available");
  });
  // Keep sequential index for mains
  setMainQuestIndex(0);
}

export function getActiveMissionGiver() {
  // For backward compat: return the currently available main quest's giver (yellow)
  if (mainQuests.length===0 && sideQuests.length===0) {
    if (!usingSequentialMissions) return null;
    if (sequentialMissionIndex >= missionGivers.length) return null;
    const mg = missionGivers[sequentialMissionIndex];
    return mg && !mg.taken ? mg : null;
  }
  if (mainQuests.length>0){
    const idx = mainQuestIndex;
    if(idx>=mainQuests.length) return null;
    const q=mainQuests[idx];
    const status = questStatus.get(q.id);
    if(status!=="available") return null;
    // also if there's an active mission, don't show giver (already captured)
    if(activeQuestId) return null;
    // find giver
    const mg=missionGivers.find(g=>g.questId===q.id);
    return mg && !mg.taken ? mg : null;
  }
  return null;
}

// New helpers for renderer/minimap/HUD
export function getVisibleStartGivers(){
  const list=[];
  // Main: only one yellow at a time (next available)
  if(mainQuests.length>0){
    const q=mainQuests[mainQuestIndex];
    if(q && questStatus.get(q.id)==="available" && !activeQuestId){
      const mg=missionGivers.find(g=>g.questId===q.id && !g.completed);
      if(mg) list.push(mg);
    }
  } else if(usingSequentialMissions){
    const ag=getActiveMissionGiver();
    if(ag) list.push(ag);
  }
  // Sides: all purple dots available (and not active/completed)
  sideQuests.forEach(q=>{
    if(questStatus.get(q.id)==="available" && q.id!==activeQuestId){
      const mg=missionGivers.find(g=>g.questId===q.id && !g.completed);
      if(mg) list.push(mg);
    }
  });
  // Fallback if no quest system but legacy random (usingSequentialMissions false)
  if(list.length===0 && !hasQuestSystem()){
    missionGivers.filter(mg=>!mg.taken && !mg.completed).forEach(mg=>list.push(mg));
  }
  return list;
}
function hasQuestSystem(){ return quests.length>0; }
export function getActiveEndGiver(){
  if(!activeQuestId) return null;
  const q = getQuestById(activeQuestId);
  if(!q) return null;
  // end pixel
  const mg=missionGivers.find(g=>g.questId===q.id);
  if(!mg) return null;
  return { x: mg.endX, y: mg.endY, questId:q.id, category:q.category };
}
export function getQuestByIdForSystem(id){
  return quests.find(q=>q.id===id) || getQuestById(id) || null;
}

export function startMission(typeOrId) {
  if (currentMission) return;
  // First try to find quest by id
  let quest = null;
  let mDef = null;
  // Search by questId
  if (quests.length>0){
    quest = quests.find(q=>q.id===typeOrId) || null;
    if(quest){
      mDef = allMissions.find(m=>m.questId===quest.id) || { name:qTitle(quest), desc:qDesc(quest), icon:quest.icon, type:quest.type, reward:quest.reward, title:quest.title, questId:quest.id, category:quest.category, start:quest.start, end:quest.end };
    }
  }
  // Fallback search by type (legacy)
  if(!mDef){
    mDef = allMissions.find((m) => m.type === typeOrId);
    if(mDef && mDef.questId){
      quest = quests.find(q=>q.id===mDef.questId) || null;
    }
  }
  if (!mDef) return;
  // If quest found, check availability
  if(quest){
    const status = questStatus.get(quest.id);
    if(status!=="available") return;
  }

  const cm = {
    type: mDef.type,
    name: mDef.name || qTitle(quest || {type:mDef.type, icon:mDef.icon}),
    desc: mDef.desc || qDesc(quest || {type:mDef.type}),
    reward: mDef.reward,
    stage: 0,
    stages: [],
    completed: false,
    failed: false,
    timer: 0,
    data: {},
    questId: mDef.questId || null,
    category: mDef.category || (quest?quest.category:"main"),
    title: mDef.title || (quest?quest.title:{ar:mDef.name,en:mDef.name}),
    icon: mDef.icon || (quest?quest.icon:"⭐"),
    quest: quest || null
  };
  setCurrentMission(cm);
  if(quest){
    setActiveQuestId(quest.id);
    questStatus.set(quest.id, "active");
    // mark giver taken
    const mg=missionGivers.find(g=>g.questId===quest.id);
    if(mg) mg.taken=true;
  } else {
    // legacy giver taken handling (find by type first not taken)
    const mg=missionGivers.find(g=>g.type===mDef.type && !g.taken);
    if(mg) mg.taken=true;
  }

  setupMissionStages(cm);
  if (cm.failed) {
    const reason = cm.failReason || (lang()==="en" ? "Failed to setup mission" : "فشل في إعداد المهمة");
    failMission(reason);
    return;
  }
  updateMissionUI();
  const displayName = quest ? qTitle(quest) : cm.name;
  showNotification(lang()==="en" ? `🚀 Started: ${displayName}` : `🚀 بدء مهمة: ${displayName}`);
}

export function getWalkableTile() {
  for (let attempt = 0; attempt < 50; attempt++) {
    const tx = 2 + Math.floor(Math.random() * (CFG.COLS - 6));
    const ty = 2 + Math.floor(Math.random() * (CFG.ROWS - 6));
    const px = tx * CFG.TILE + CFG.TILE / 2;
    const py = ty * CFG.TILE + CFG.TILE / 2;
    if (isWalkable(px, py))
      return {
        x: px,
        y: py,
      };
  }
  return {
    x: 20 * CFG.TILE + CFG.TILE / 2,
    y: 20 * CFG.TILE + CFG.TILE / 2,
  };
}

export function setupMissionStages(mission) {
  // New 5 quest types only
  // All quests use two-point (start→end) where end is editor-defined drop-off.
  // Quest content after capturing first point is displayed in HUD via updateMissionUI.
  const questEnd = (()=> {
    if(mission.quest && mission.quest.end) return {x: mission.quest.end.x*CFG.TILE+CFG.TILE/2, y: mission.quest.end.y*CFG.TILE+CFG.TILE/2};
    if(mission.questId){
      const mg=missionGivers.find(g=>g.questId===mission.questId);
      if(mg && mg.endX) return {x: mg.endX, y: mg.endY};
    }
    return null;
  })();
  const questStartPixel = (()=> {
    if(mission.quest && mission.quest.start) return {x: mission.quest.start.x*CFG.TILE+CFG.TILE/2, y: mission.quest.start.y*CFG.TILE+CFG.TILE/2};
    return null;
  })();
  // Helper to get editor-defined end with walkable correction
  function getQuestDropOff(){
    if(!questEnd) return getWalkableTile();
    let fx=questEnd.x, fy=questEnd.y;
    if(!isWalkable(fx,fy)){
      const near=findNearestWalkableForQuest(mission.quest ? mission.quest.end.x : Math.floor(fx/CFG.TILE), mission.quest ? mission.quest.end.y : Math.floor(fy/CFG.TILE));
      if(near){ fx=near.x; fy=near.y; }
    }
    return {x:fx,y:fy};
  }
  switch (mission.type) {
    case "deliverShipment": {
      const drop = getQuestDropOff();
      mission.stages.push({
        type: "dropoff",
        x: drop.x, y: drop.y,
        label: "سلّم الشحنة إلى الموقع المحدد",
        labelEn: "Deliver shipment to marked location",
        done: false,
        radius: 50
      });
      break;
    }
    case "silentPursuit": {
      // Follow a car without getting too close/far, suspicion bar
      let targetVehicle = null;
      for(const v of vehicles){ if(!v.isPolice && !v.occupied){ targetVehicle=v; break; } }
      if(!targetVehicle){
        // spawn a temp target car near quest start
        const sx = mission.quest ? mission.quest.start.x*CFG.TILE+CFG.TILE/2 : player.x+120;
        const sy = mission.quest ? mission.quest.start.y*CFG.TILE+CFG.TILE/2 : player.y;
        // create a dummy target vehicle object
        targetVehicle = { x:sx, y:sy, vx:0, vy:0, angle:0, w:32, h:16, type:{name:"Target Car", accel:0.2, speed:2.5}, isPolice:false, occupied:false, isSilentTarget:true };
        vehicles.push(targetVehicle);
      }
      const tid = vehicles.indexOf(targetVehicle);
      mission.data.silentTargetId = tid;
      mission.data.silentTarget = targetVehicle;
      mission.data.suspicion = 0;
      mission.data.followDuration = 30000;
      mission.data.followTimer = 0;
      mission.data.minDist = 80;
      mission.data.maxDist = 250;
      // Make target move slowly in a loop
      targetVehicle.vx = Math.cos(Math.random()*Math.PI*2)*1.2;
      targetVehicle.vy = Math.sin(Math.random()*Math.PI*2)*1.2;
      mission.stages.push({
        type: "follow",
        label: "تتبع السيارة بصمت",
        labelEn: "Follow car silently",
        done:false,
        targetVehicleId: tid,
        duration: 30000
      });
      break;
    }
    case "surveillance": {
      const center = questStartPixel || getWalkableTile();
      const cx = center.x, cy = center.y;
      mission.data.surveillanceCenter = {x:cx, y:cy};
      mission.data.surveillanceRadius = 110;
      mission.data.surveillanceTime = 0;
      mission.data.surveillanceDuration = 30000;
      mission.data.surveillanceStartWanted = player.wanted;
      mission.stages.push({
        type: "surveillance",
        x: cx, y: cy,
        label: "ابق داخل الدائرة 30 ثانية دون قتل أو شرطة",
        labelEn: "Stay inside circle 30s, no kills, no police",
        done:false,
        radius: 110,
        duration: 30000
      });
      break;
    }
    case "plantBomb": {
      const plantPos = questStartPixel || getWalkableTile();
      const drop = getQuestDropOff();
      mission.data.plantPos = {x: plantPos.x, y: plantPos.y};
      mission.data.plantPlanted = false;
      mission.data.plantHold = 0;
      mission.stages.push({
        type: "plantBomb",
        x: plantPos.x, y: plantPos.y,
        label: "ازرع القنبلة (ثبت E)",
        labelEn: "Plant bomb (hold E)",
        done:false,
        radius: 50
      });
      mission.stages.push({
        type: "dropoff",
        x: drop.x, y: drop.y,
        label: "اهرب إلى خط النهاية",
        labelEn: "Escape to finish line",
        done:false,
        radius: 55
      });
      // plantBomb's final is already dropoff, prevent generic duplicate
      mission.data.noGenericEnd = true;
      break;
    }
    case "meeting": {
      const meetPos = questStartPixel || getWalkableTile();
      const drop = getQuestDropOff();
      // Spawn meeting NPC
      const q = mission.quest;
      const msgAr = (q && q.params && q.params.meetingAr) || q.meetingAr || "مرحباً، لدينا معلومات مهمة.";
      const msgEn = (q && q.params && q.params.meetingEn) || q.meetingEn || "Hello, we have important intel.";
      mission.data.meetingPos = {x: meetPos.x, y: meetPos.y};
      mission.data.meetingMsgAr = msgAr;
      mission.data.meetingMsgEn = msgEn;
      mission.data.meetingDone = false;
      // Spawn NPC for meeting
      const npcMeet = {
        x: meetPos.x + (Math.random()-0.5)*10,
        y: meetPos.y + (Math.random()-0.5)*10,
        angle: 0,
        speed: 0.2,
        type: "civilian",
        color: "#ffd700",
        size: 12,
        health: 999,
        maxHealth: 999,
        isMeetingNpc: true,
        questId: q ? q.id : mission.questId,
        meetingAr: msgAr,
        meetingEn: msgEn
      };
      npcs.push(npcMeet);
      mission.data.meetingNpc = npcMeet;
      mission.stages.push({
        type: "meeting",
        x: meetPos.x, y: meetPos.y,
        label: "تحدث إلى الشخص (اضغط E)",
        labelEn: "Talk to contact (press E)",
        done:false,
        radius: 55
      });
      mission.stages.push({
        type: "dropoff",
        x: drop.x, y: drop.y,
        label: "اذهب إلى خط النهاية",
        labelEn: "Go to finish line",
        done:false,
        radius: 50
      });
      mission.data.noGenericEnd = true;
      break;
    }
    case "theft": {
      const theftPos = questStartPixel || getWalkableTile();
      const drop = getQuestDropOff();
      const q = mission.quest;
      const itemName = (q && q.params && q.params.itemName) || q.itemName || "غرض مسروق";
      mission.data.theftPos = {x: theftPos.x, y: theftPos.y};
      mission.data.theftItem = itemName;
      mission.data.theftHold = 0;
      mission.data.theftDuration = 20000;
      mission.data.suspicion = 0;
      mission.data.theftDelivered = false;
      mission.stages.push({
        type: "theft",
        x: theftPos.x, y: theftPos.y,
        label: `اسرق "${itemName}" (ثبّت المسافة)`,
        labelEn: `Steal "${itemName}" (hold Space)`,
        done:false,
        radius: 60,
        itemName: itemName
      });
      mission.stages.push({
        type: "dropoff",
        x: drop.x, y: drop.y,
        label: `سلّم "${itemName}"`,
        labelEn: `Deliver "${itemName}"`,
        done:false,
        radius: 50,
        requiresItem: itemName
      });
      mission.data.noGenericEnd = true;
      break;
    }
    case "deliverLoot": {
      const checkPos = questStartPixel || getWalkableTile();
      const drop = getQuestDropOff();
      const q2 = mission.quest;
      const reqItem = (q2 && q2.params && q2.params.itemName) || q2.itemName || "غرض";
      mission.data.deliverCheckPos = {x: checkPos.x, y: checkPos.y};
      mission.data.requiredItem = reqItem;
      mission.stages.push({
        type: "deliverCheck",
        x: checkPos.x, y: checkPos.y,
        label: `تحقق من حمل "${reqItem}"`,
        labelEn: `Check carrying "${reqItem}"`,
        done:false,
        radius: 55,
        requiredItem: reqItem
      });
      // If end distinct from check pos, add final dropoff (otherwise just check)
      if(Math.hypot(drop.x - checkPos.x, drop.y - checkPos.y) > 30){
        mission.stages.push({
          type: "dropoff",
          x: drop.x, y: drop.y,
          label: "اذهب للتسليم النهائي",
          labelEn: "Go to final delivery",
          done:false,
          radius: 50
        });
        mission.data.noGenericEnd = true;
      }
      break;
    }
    case "killTarget": {
      // Spawn 1 gangster target at start area (marked on map), kill 1 time, then optionally go to end
      // For kill, we spawn a specific target NPC near start; the stage is eliminate 1
      const spawnAt = questStartPixel || getWalkableTile();
      // try to spawn target gang NPC 30-60px around start
      try{
        const { npcs } = awaitImportNpcs();
        // We will lazily push via dynamic import helper below; for now set data for target position
        mission.data.targetSpawn = {x: spawnAt.x, y: spawnAt.y};
        // Inject a gang NPC directly if npcs array available synchronously
        // Use direct import if available
        if(typeof spawnQuestTarget === "function"){
          // placeholder
        }
      } catch{}
      // Instead, create target data and actual spawn will be done via helper spawnGangTarget()
      // We'll spawn now synchronously via direct manipulation if npcs imported
      try {
        // Import npcs lazily via global (avoid circular)
        // We have access to npcs array via dynamic check: if we can import, do it
      } catch{}
      // For now, push NPC via helper function after switch
      mission.data.killTarget = 1;
      mission.data.killCount = 0;
      mission.data.targetType = "gang";
      mission.stages.push({
        type: "eliminate",
        label: "اقتل الهدف المحدد (عصابة)",
        labelEn: "Kill the marked gang target",
        done: false,
        killTarget: 1,
        targetKind: "gang"
      });
      // Also create a visual target NPC at spawn location (handled via ensureTargetSpawned below)
      // No extra pickup stage; after kill, generic final dropoff will handle second point if distinct
      break;
    }
    case "transportPerson": {
      // Transport 1 person: spawn civilian at start, pickup then dropoff at editor end
      const pickupPos = questStartPixel || getWalkableTile();
      const drop = getQuestDropOff();
      // Store pickup person location
      mission.data.personPickup = {x: pickupPos.x, y: pickupPos.y};
      mission.data.personPicked = false;
      mission.data.personEntity = null;
      mission.stages.push({
        type: "goto",
        x: pickupPos.x, y: pickupPos.y,
        label: "اذهب إلى الشخص لاصطحابه",
        labelEn: "Go to the person to pick up",
        done: false,
        radius: 45,
        isPickup: true
      });
      mission.stages.push({
        type: "dropoff",
        x: drop.x, y: drop.y,
        label: "انقل الشخص إلى الموقع المحدد",
        labelEn: "Transport person to marked location",
        done: false,
        radius: 50,
        isDropoff: true
      });
      break;
    }
    case "escapeCar": {
      // As soon as player takes a car, police pursue; must escape to editor location
      // Stage 1: steal/enter any car
      let targetVehicle = null;
      for (const v of vehicles) {
        if (!v.isPolice && !v.occupied) { targetVehicle = v; break; }
      }
      if (!targetVehicle) {
        // No car available -> still allow any car entry dynamically; create a placeholder stage that checks any vehicle entry
        mission.data.anyVehicle = true;
        mission.stages.push({
          type: "stealVehicle",
          label: "استقل أي سيارة",
          labelEn: "Enter any car",
          done: false,
          anyVehicle: true
        });
      } else {
        const vehicleId = vehicles.indexOf(targetVehicle);
        mission.data.targetVehicle = targetVehicle;
        mission.data.targetVehicleId = vehicleId;
        mission.stages.push({
          type: "approachVehicle",
          label: "اقترب من السيارة",
          labelEn: "Approach vehicle",
          done: false,
          targetVehicleId: vehicleId,
          radius: 60
        });
        mission.stages.push({
          type: "stealVehicle",
          label: "استقل السيارة",
          labelEn: "Enter vehicle",
          done: false,
          targetVehicleId: vehicleId
        });
      }
      mission.stages.push({
        type: "escape",
        label: "اهرب من الشرطة إلى الموقع (ابقَ مطاردًا 20 ثانية ثم اذهب للتسليم)",
        labelEn: "Escape police (stay wanted 20s)",
        done: false,
        duration: 20000
      });
      // Final dropoff at editor end will be added via generic handler below
      break;
    }
    case "stealCar": {
      let targetVehicle = null;
      for (const v of vehicles) {
        if (!v.isPolice && !v.occupied) { targetVehicle = v; break; }
      }
      if (!targetVehicle) {
        mission.failed = true;
        mission.failReason = lang()==="en" ? "No cars available to steal" : "لا توجد سيارات متاحة للسرقة حالياً";
        return;
      }
      const vehicleId = vehicles.indexOf(targetVehicle);
      mission.data.targetVehicle = targetVehicle;
      mission.data.targetVehicleId = vehicleId;
      const drop = getQuestDropOff();
      mission.stages.push({
        type: "approachVehicle",
        label: "اقترب من السيارة المستهدفة",
        labelEn: "Approach target car",
        done: false,
        targetVehicleId: vehicleId,
        radius: 60,
      });
      mission.stages.push({
        type: "stealVehicle",
        label: "اسرق السيارة",
        labelEn: "Steal car",
        done: false,
        targetVehicleId: vehicleId,
      });
      mission.stages.push({
        type: "dropoff",
        x: drop.x, y: drop.y,
        label: "قد السيارة إلى الموقع المحدد",
        labelEn: "Drive car to marked location",
        done: false,
        radius: 50,
        requiresVehicle: true
      });
      // For stealCar, the final dropoff is already this last stage, so prevent duplicate generic final
      mission.data.noGenericEnd = true;
      break;
    }
    default: {
      // Unknown type -> fallback to single dropoff at end
      const drop = getQuestDropOff();
      mission.stages.push({
        type: "dropoff",
        x: drop.x, y: drop.y,
        label: "اذهب إلى الموقع المحدد",
        labelEn: "Go to marked location",
        done: false
      });
      break;
    }
  }
  // Helper to spawn quest NPCs immediately after stages are defined
  // For killTarget: spawn a gang target at start; for transportPerson: spawn civilian at pickup
  try { ensureQuestNpcSpawn(mission); } catch(e){ console.warn("ensureQuestNpcSpawn failed", e); }
  // ── Two-point final dropoff (spec: second point appears after capturing first, must go there to fully complete) ──
  // Skip if mission already has a dropoff at quest end (e.g., deliverShipment, stealCar) or explicitly opted out
  const lastStage = mission.stages[mission.stages.length-1];
  const hasDropoffAtEnd = lastStage && lastStage.type==="dropoff" && mission.quest && mission.quest.end && Math.hypot(lastStage.x - (mission.quest.end.x*CFG.TILE+CFG.TILE/2), lastStage.y - (mission.quest.end.y*CFG.TILE+CFG.TILE/2)) < 80;
  if(mission.data.noGenericEnd) {
    // stealCar already has its own dropoff at end, don't add generic
  } else if (hasDropoffAtEnd) {
    // already ends with dropoff at quest location, just mark it as questEnd
    lastStage.isQuestEnd = true;
    mission.data.questEnd = {x:lastStage.x, y:lastStage.y};
  } else if (mission.quest && mission.quest.end) {
    const q = mission.quest;
    const ex = q.end.x * CFG.TILE + CFG.TILE/2;
    const ey = q.end.y * CFG.TILE + CFG.TILE/2;
    // Validate walkable, else fallback to nearest walkable nearby
    let fx=ex, fy=ey;
    if(!isWalkable(fx,fy)){
      const nearest = findNearestWalkableForQuest(q.end.x, q.end.y);
      if(nearest){ fx=nearest.x; fy=nearest.y; }
    }
    const isVehicleQuest = mission.type==="escapeCar" || mission.type==="stealCar";
    mission.stages.push({
      type: "dropoff",
      x: fx, y: fy,
      label: lang()==="en" ? "Go to drop-off point to complete" : "اذهب إلى نقطة التسليم لإنهاء المهمة",
      labelEn: "Go to drop-off point to complete",
      labelAr: "اذهب إلى نقطة التسليم لإنهاء المهمة",
      done: false,
      isQuestEnd: true,
      requiresVehicle: isVehicleQuest
    });
    mission.data.questEnd = {x:fx,y:fy};
  } else if (mission.questId) {
    // quest referenced via missionGivers but not full object -> derive from giver
    const mg = missionGivers.find(g=>g.questId===mission.questId);
    if(mg && mg.endX){
      const fx=mg.endX, fy=mg.endY;
      // avoid duplicate if last stage already at this end
      const dup = mission.stages.length && mission.stages[mission.stages.length-1].x===fx && mission.stages[mission.stages.length-1].y===fy;
      if(!dup){
        const isVeh = mission.type==="escapeCar" || mission.type==="stealCar";
        mission.stages.push({
          type:"dropoff", x:fx, y:fy,
          label: lang()==="en" ? "Go to drop-off point to complete" : "اذهب إلى نقطة التسليم لإنهاء المهمة",
          labelEn: "Go to drop-off point to complete",
          done:false, isQuestEnd:true, requiresVehicle: isVeh
        });
        mission.data.questEnd={x:fx,y:fy};
      } else {
        mission.stages[mission.stages.length-1].isQuestEnd = true;
        mission.data.questEnd={x:fx,y:fy};
      }
    }
  }
}

function ensureQuestNpcSpawn(mission){
  if(!mission || !mission.quest) return;
  const q=mission.quest;
  if(mission.type==="killTarget"){
    // Avoid duplicate spawn if already exists for this quest
    const exists = npcs.some(n=> n.isQuestTarget && n.questId===q.id);
    if(exists) return;
    const sx = q.start.x*CFG.TILE+CFG.TILE/2;
    const sy = q.start.y*CFG.TILE+CFG.TILE/2;
    // Find walkable near start
    let px=sx, py=sy;
    if(!isWalkable(px,py)){
      const near=findNearestWalkableForQuest(q.start.x,q.start.y);
      if(near){ px=near.x; py=near.y; }
    }
    // Slight random offset to avoid exact tile center stacking
    px += (Math.random()-0.5)*12;
    py += (Math.random()-0.5)*12;
    // Create gang target (killable, 1 hit = 40 health)
    const npc = {
      x: px, y: py,
      angle: Math.random()*Math.PI*2,
      speed: 0.6, // slower, stays near spawn
      type: "gang",
      color: "#ff3366",
      size: 13,
      health: 40,
      maxHealth: 40,
      isQuestTarget: true,
      questId: q.id,
      targetFor: "killTarget"
    };
    npcs.push(npc);
    mission.data.targetNpc = npc;
    showNotification(lang()==="en" ? "💀 Target gangster spawned on map!" : "💀 ظهرت العصابة الهدف على الخريطة!");
  } else if(mission.type==="transportPerson"){
    const exists = npcs.some(n=> n.isQuestPerson && n.questId===q.id);
    if(exists) return;
    const px = mission.data.personPickup ? mission.data.personPickup.x : (q.start.x*CFG.TILE+CFG.TILE/2);
    const py = mission.data.personPickup ? mission.data.personPickup.y : (q.start.y*CFG.TILE+CFG.TILE/2);
    const npc = {
      x: px, y: py,
      angle: 0,
      speed: 0.2, // stays put
      type: "civilian",
      color: "#44ffaa",
      size: 11,
      health: 999,
      maxHealth: 999,
      isQuestPerson: true,
      questId: q.id,
      isPickupTarget: true
    };
    npcs.push(npc);
    mission.data.personEntity = npc;
    showNotification(lang()==="en" ? "👤 Person waiting at marked location" : "👤 الشخص بانتظارك في الموقع المحدد");
  }
}

function findNearestWalkableForQuest(tx,ty){
  const walkable = new Set([T.ROAD, T.SIDEWALK, T.PAVEMENT, T.PARK, T.PARKING]);
  for(let r=1;r<=8;r++){
    for(let dx=-r;dx<=r;dx++) for(let dy of [-r, r]){
      const nx=tx+dx, ny=ty+dy;
      if(nx<0||nx>=CFG.COLS||ny<0||ny>=CFG.ROWS) continue;
      const px=nx*CFG.TILE+CFG.TILE/2, py=ny*CFG.TILE+CFG.TILE/2;
      if(isWalkable(px,py)) return {x:px,y:py};
    }
    for(let dy=-r+1; dy<=r-1; dy++) for(let dx of [-r, r]){
      const nx=tx+dx, ny=ty+dy;
      if(nx<0||nx>=CFG.COLS||ny<0||ny>=CFG.ROWS) continue;
      const px=nx*CFG.TILE+CFG.TILE/2, py=ny*CFG.TILE+CFG.TILE/2;
      if(isWalkable(px,py)) return {x:px,y:py};
    }
  }
  return null;
}

export function updateMission() {
  if (!currentMission || currentMission.completed || currentMission.failed)
    return;

  const m = currentMission;

  // Timer for timed missions
  if (m.timer > 0) {
    m.timer -= 16;
    if (m.timer <= 0) {
      failMission(lang()==="en" ? "Time's up!" : "انتهى الوقت!");
      return;
    }
  }

  // Check current stage
  const stage = m.stages[m.stage];
  if (!stage) {
    completeMission();
    return;
  }

  const px = player.x;
  const py = player.y;

  switch (stage.type) {
    case "goto":
    case "checkpoint":
    case "collect": {
      const dist = Math.hypot(px - stage.x, py - stage.y);
      const radius = stage.radius || 50;
      if (dist < radius) {
        if(stage.isPickup && m.type==="transportPerson"){
          const idx = npcs.findIndex(n=> n.isQuestPerson && n.questId===m.questId);
          if(idx>=0){ npcs.splice(idx,1); }
          m.data.personPicked = true;
          showNotification(lang()==="en" ? "👤 Person picked up! Now transport them." : "👤 تم اصطحاب الشخص! انقله الآن.");
        }
        stage.done = true;
        if (stage.type === "collect") stage.collected = true;
        advanceStage();
      }
      break;
    }
    case "escape": {
      if (player.wanted > 0) {
        stage.timer = (stage.timer || 0) + 16;
        if (stage.timer >= stage.duration) {
          stage.done = true;
          advanceStage();
        }
      }
      break;
    }
    case "chase": {
      const t = m.data.chaseTarget;
      if (t) {
        const dist = Math.hypot(px - t.x, py - t.y);
        if (dist < stage.radius) {
          stage.done = true;
          advanceStage();
        }
        // Move chase target away
        t.angle = Math.atan2(py - t.y, px - t.x);
        t.x -= Math.cos(t.angle) * t.speed;
        t.y -= Math.sin(t.angle) * t.speed;
      }
      break;
    }
    case "protect": {
      stage.timer = (stage.timer || 0) + 16;
      if (stage.timer >= stage.duration) {
        stage.done = true;
        advanceStage();
      }
      break;
    }
    case "dropoff": {
      if(stage.requiresVehicle && !player.inVehicle){
        break;
      }
      if(m.type==="transportPerson" && !m.data.personPicked){
        break;
      }
      const dist = Math.hypot(px - stage.x, py - stage.y);
      const needRadius = stage.radius || 50;
      if (dist < needRadius) {
        stage.done = true;
        advanceStage();
      }
      break;
    }
    case "approachVehicle": {
      const vehicleId = stage.targetVehicleId;
      const vehicle = vehicles[vehicleId];
      if (!vehicle) {
        failMission(lang()==="en" ? "Target car gone" : "السيارة المستهدفة لم تعد موجودة");
        return;
      }
      if (vehicle.occupied && vehicle.driver !== player) {
        failMission(lang()==="en" ? "Car stolen by someone else!" : "تم سرقة السيارة من قبلك!");
        return;
      }
      const dist = Math.hypot(player.x - vehicle.x, player.y - vehicle.y);
      const radius = stage.radius || 50;
      if (dist < radius) {
        stage.done = true;
        advanceStage();
      }
      break;
    }
    case "stealVehicle": {
      if(stage.anyVehicle){
        if(player.inVehicle){
          stage.done = true;
          advanceStage();
        }
        break;
      }
      const vehicleId = stage.targetVehicleId;
      const vehicle = vehicles[vehicleId];
      if (!vehicle) {
        failMission(lang()==="en" ? "Target car gone" : "السيارة المستهدفة لم تعد موجودة");
        return;
      }
      if (player.inVehicle === vehicle) {
        stage.done = true;
        advanceStage();
      }
      break;
    }
    case "eliminate": {
      const kills = m.data.killCount || 0;
      const target = stage.killTarget || 1;
      if (kills >= target) {
        stage.done = true;
        // Clean up any remaining quest target NPCs
        if(m.type==="killTarget"){
          // remove any leftover target NPC for this quest
          for(let i=npcs.length-1;i>=0;i--){
            if(npcs[i].isQuestTarget && npcs[i].questId===m.questId) npcs.splice(i,1);
          }
        }
        advanceStage();
      }
      break;
    }
    case "follow": {
      const vid = stage.targetVehicleId;
      const veh = vehicles[vid];
      if(!veh){
        failMission(lang()==="en" ? "Target car lost" : "ضاعت السيارة الهدف");
        break;
      }
      // Move target car slowly in a simple patrol (if not already moving)
      if(!veh.vx && !veh.vy){
        veh.vx = Math.cos(Date.now()/2000)*1.0;
        veh.vy = Math.sin(Date.now()/2000)*1.0;
      } else {
        // slight random walk
        veh.vx += (Math.random()-0.5)*0.04;
        veh.vy += (Math.random()-0.5)*0.04;
        const sp = Math.hypot(veh.vx, veh.vy);
        const maxSp = 1.6;
        if(sp > maxSp){ veh.vx = veh.vx/sp*maxSp; veh.vy = veh.vy/sp*maxSp; }
        if(isWalkable(veh.x + veh.vx*2, veh.y + veh.vy*2)){
          veh.x += veh.vx; veh.y += veh.vy;
          veh.angle = Math.atan2(veh.vy, veh.vx);
        } else {
          veh.vx *= -1; veh.vy *= -1;
        }
      }
      const dist = Math.hypot(player.x - veh.x, player.y - veh.y);
      const minD = m.data.minDist || 80;
      const maxD = m.data.maxDist || 250;
      let suspicionDelta = 0;
      if(dist < minD) suspicionDelta = (minD - dist)/minD * 0.9;
      else if(dist > maxD) suspicionDelta = (dist - maxD)/ (maxD*0.5) * 0.7;
      else suspicionDelta = -0.4; // recover when in band
      m.data.suspicion = Math.max(0, Math.min(100, (m.data.suspicion||0) + suspicionDelta));
      // Update HUD suspicion bar via custom event or direct DOM
      try { if(typeof updateSuspicionUI==="function") updateSuspicionUI(m.data.suspicion, dist, minD, maxD); } catch{}
      // Fail if suspicion max
      if(m.data.suspicion >= 100){
        failMission(lang()==="en" ? "You were detected! Too close/far." : "تم كشفك! اقتراب/ابتعاد شديد.");
        break;
      }
      m.data.followTimer = (m.data.followTimer||0) + 16;
      if(m.data.followTimer >= (stage.duration||30000)){
        stage.done = true;
        // cleanup suspicion
        m.data.suspicion = 0;
        try{ updateSuspicionUI(0); }catch{}
        advanceStage();
      }
      break;
    }
    case "surveillance": {
      const center = m.data.surveillanceCenter;
      if(!center) break;
      const dist = Math.hypot(player.x - center.x, player.y - center.y);
      const radius = stage.radius || 110;
      if(dist > radius){
        failMission(lang()==="en" ? "Left surveillance area" : "غادرت منطقة المراقبة");
        break;
      }
      if(player.wanted > 0){
        failMission(lang()==="en" ? "Police alerted! No stars allowed." : "تم تنبيه الشرطة! لا يسمح بالنجوم.");
        break;
      }
      // Check if any kill happened during surveillance (use flag set by killNPC)
      if(m.data.surveillanceKilled){
        failMission(lang()==="en" ? "Killing not allowed during surveillance" : "القتل ممنوع أثناء المراقبة");
        break;
      }
      m.data.surveillanceTime = (m.data.surveillanceTime||0) + 16;
      // Update progress text via missionProg
      if(m.data.surveillanceTime >= (stage.duration||30000)){
        stage.done = true;
        advanceStage();
      }
      break;
    }
    case "plantBomb": {
      const dist = Math.hypot(player.x - stage.x, player.y - stage.y);
      if(dist > (stage.radius||50)) break;
      // Require holding E (enterExit) to plant
      const holding = (typeof actionHeld==="function" ? actionHeld("enterExit") : false) || (typeof keys!=="undefined" && (keys["e"]||keys["E"]));
      // Also support Space as alternative
      const spaceHeld = (typeof keys!=="undefined" && (keys[" "]||keys["Space"]||keys["space"]));
      const isHolding = holding || spaceHeld;
      if(isHolding){
        m.data.plantHold = (m.data.plantHold||0) + 16;
        if(m.data.plantHold >= 3000){
          stage.done = true;
          m.data.plantPlanted = true;
          showNotification(lang()==="en" ? "💣 Bomb planted! Escape!" : "💣 تم زرع القنبلة! اهرب!");
          // Optional explosion timer visual? Not needed
          advanceStage();
        }
      } else {
        // Reset if released? For plant, we can keep progress but slowly decay
        if(m.data.plantHold>0) m.data.plantHold = Math.max(0, m.data.plantHold - 32);
      }
      break;
    }
    case "meeting": {
      const dist = Math.hypot(player.x - stage.x, player.y - stage.y);
      if(dist > (stage.radius||55)) break;
      // Require pressing E to talk
      const justPressed = (typeof actionJust==="function" ? actionJust("enterExit") : false);
      if(justPressed){
        const q = m.quest;
        const msgAr = (q && q.params && q.params.meetingAr) || q.meetingAr || m.data.meetingMsgAr || "مرحباً";
        const msgEn = (q && q.params && q.params.meetingEn) || q.meetingEn || m.data.meetingMsgEn || "Hello";
        const msg = lang()==="en" ? msgEn : msgAr;
        showNotification(`💬 ${msg}`);
        // Show dialogue overlay? Use notification for now, maybe also HUD
        stage.done = true;
        m.data.meetingDone = true;
        // Remove meeting NPC
        for(let i=npcs.length-1;i>=0;i--){
          if(npcs[i].isMeetingNpc && npcs[i].questId===m.questId) npcs.splice(i,1);
        }
        advanceStage();
      }
      break;
    }
    case "theft": {
      const dist = Math.hypot(player.x - stage.x, player.y - stage.y);
      if(dist > (stage.radius||60)){
        // If player leaves theft area, reset hold
        if(m.data.theftHold>0) m.data.theftHold = 0;
        break;
      }
      // Detect if someone approaches (NPC or police within 90px)
      let someoneNear = false;
      for(const n of npcs){
        if(Math.hypot(n.x - player.x, n.y - player.y) < 90){ someoneNear = true; break; }
      }
      if(!someoneNear){
        for(const p of police){
          if(Math.hypot(p.x - player.x, p.y - player.y) < 110){ someoneNear = true; break; }
        }
      }
      const holdingSpace = (typeof keys!=="undefined" && (keys[" "]||keys["Space"]||keys["space"]||keys["Spacebar"])) || (typeof actionHeld==="function" && actionHeld("enterExit"));
      // Actually theft spec says hold spacebar, so check space
      const space = (typeof keys!=="undefined" && (keys[" "]||keys["space"]||keys["Space"]));
      // Fallback to actionHeld shoot? Use space
      const isHolding = space;
      if(someoneNear){
        if(isHolding){
          // Holding while someone near increases suspicion fast
          m.data.suspicion = Math.min(100, (m.data.suspicion||0) + 1.2);
          if(m.data.suspicion >= 100){
            failMission(lang()==="en" ? "Detected while stealing!" : "تم كشفك أثناء السرقة!");
            break;
          }
        }
        // Must release space if someone approaches - if holding, we already increased suspicion, but spec says must release
        // If player is holding while someone near, we penalize; if they release, suspicion decays
        if(!isHolding){
          m.data.suspicion = Math.max(0, (m.data.suspicion||0) - 1.5);
        }
        // Don't progress while someone near
        break;
      } else {
        // No one near, holding progresses theft
        if(isHolding){
          m.data.theftHold = (m.data.theftHold||0) + 16;
          m.data.suspicion = Math.max(0, (m.data.suspicion||0) - 0.5);
          if(m.data.theftHold >= (m.data.theftDuration||20000)){
            stage.done = true;
            const itemName = stage.itemName || m.data.theftItem || "غرض";
            // Grant item to inventory
            if(!player.inventory) player.inventory=[];
            player.inventory.push(itemName);
            // Also add to loot? Use inventory
            showNotification(lang()==="en" ? `🦹 Stole "${itemName}"! Now deliver.` : `🦹 سرقت "${itemName}"! الآن سلّمها.`);
            m.data.theftHold = 0;
            m.data.suspicion = 0;
            advanceStage();
          }
        } else {
          // Released space resets progress per spec
          if(m.data.theftHold>0){
            m.data.theftHold = 0;
            // per spec, suspicion resets on release
            m.data.suspicion = 0;
          }
        }
      }
      // Update suspicion UI
      try{ if(typeof updateSuspicionUI==="function") updateSuspicionUI(m.data.suspicion||0, null, null, null, m.data.theftHold||0, 20000); }catch{}
      break;
    }
    case "deliverCheck": {
      const dist = Math.hypot(player.x - stage.x, player.y - stage.y);
      if(dist > (stage.radius||55)) break;
      const req = stage.requiredItem || m.data.requiredItem || "";
      const hasItem = player.inventory && player.inventory.includes(req);
      if(hasItem){
        stage.done = true;
        // Consume item? Keep for deliver
        // Remove one instance
        const idx = player.inventory.indexOf(req);
        if(idx>=0) player.inventory.splice(idx,1);
        showNotification(lang()==="en" ? `🎒 Delivered "${req}"` : `🎒 تم تسليم "${req}"`);
        advanceStage();
      } else {
        // Show hint that missing item
        // Use missionProg to show missing
        // Don't fail, just wait
      }
      break;
    }
  }

  updateMissionUI();
}

export function advanceStage() {
  if (!currentMission) return;
  const lab = lang()==="en" ? (currentMission.stages[currentMission.stage].labelEn || currentMission.stages[currentMission.stage].label) : currentMission.stages[currentMission.stage].label;
  showNotification(
    `✅ ${lab} - ${lang()==="en"?"done":"تم!"}`,
  );
  currentMission.stage++;
  if (currentMission.stage >= currentMission.stages.length) {
    completeMission();
  } else {
    // Trigger wanted for heist escape stage
    if (currentMission.stages[currentMission.stage].type === "escape") {
      player.wanted = Math.min(4, player.wanted + 2);
      showNotification(lang()==="en" ? "🚨 Police chase!" : "🚨 الشرطة في المطاردة!");
    }
  }
  updateMissionUI();
}

export function completeMission() {
  if (!currentMission) return;
  currentMission.completed = true;
  setMissionsCompleted(missionsCompleted + 1);
  player.money += currentMission.reward;

  showNotification(lang()==="en" ? `💰 Mission complete! +$${currentMission.reward}` : `💰 مهمة مكتملة! +$${currentMission.reward}`);

  const completedQuestId = currentMission.questId || (currentMission.quest && currentMission.quest.id);
  const completedCategory = currentMission.category || "main";

  setTimeout(() => {
    setCurrentMission(null);
    player.wanted = Math.max(0, player.wanted - 2);

    // Quest system completion
    if(completedQuestId){
      const q = quests.find(x=>x.id===completedQuestId);
      if(q) questStatus.set(q.id, "completed");
      const mg = missionGivers.find(g=>g.questId===completedQuestId);
      if(mg){ mg.taken=true; mg.completed=true; }
      setActiveQuestId(null);
      try{ hideSuspicionUI(); }catch{}
      // Cleanup quest NPCs (kill target, transport person) on complete
      for(let i=npcs.length-1;i>=0;i--){
        if(npcs[i].questId===completedQuestId) npcs.splice(i,1);
      }
      if(q && q.category==="main"){
        // advance main index to next available
        let idx = mainQuests.findIndex(x=>x.id===completedQuestId);
        if(idx===mainQuestIndex){
          setMainQuestIndex(mainQuestIndex+1);
          // unlock next main
          const next = mainQuests[mainQuestIndex];
          if(next) questStatus.set(next.id, "available");
        }
        if (mainQuestIndex >= mainQuests.length) {
          showNotification(lang()==="en" ? "🏆 All main missions complete! Congrats!" : "🏆 أكملت جميع المهام الرئيسية! مبروك!");
        } else {
          const nxt = mainQuests[mainQuestIndex];
          if(nxt) showNotification(lang()==="en" ? `🔓 New main available: ${nxt.icon} ${qTitle(nxt)}` : `🔓 مهمة رئيسية جديدة متاحة: ${nxt.icon} ${qTitle(nxt)}`);
        }
      } else if(q && q.category==="side"){
        showNotification(lang()==="en" ? `✅ Side quest complete: ${qTitle(q)}` : `✅ مهمة جانبية مكتملة: ${qTitle(q)}`);
      }
    } else if (usingSequentialMissions) {
      // legacy fallback
      setSequentialMissionIndex(sequentialMissionIndex + 1);
      if (sequentialMissionIndex >= missionGivers.length) {
        showNotification(lang()==="en" ? "🏆 All missions complete! Congrats!" : "🏆 أكملت جميع المهام! مبروك!");
      } else {
        const next = missionGivers[sequentialMissionIndex];
        showNotification(
          lang()==="en" ? `🔓 New mission available: ${next.mission.icon} ${next.mission.name}` : `🔓 مهمة جديدة متاحة: ${next.mission.icon} ${next.mission.name}`,
        );
      }
    }

    updateMissionUI();
  }, 2000);
}

export function failMission(reason) {
  if (!currentMission) return;
  currentMission.failed = true;
  showNotification(`❌ ${lang()==="en" ? "Failed:" : "فشلت المهمة:"} ${reason}`);

  const failedQuestId = currentMission.questId;
  setTimeout(() => {
    setCurrentMission(null);
    // Allow retry: reset quest to available and cleanup spawned NPCs
    if(failedQuestId){
      questStatus.set(failedQuestId, "available");
      const mg=missionGivers.find(g=>g.questId===failedQuestId);
      if(mg) mg.taken=false;
      setActiveQuestId(null);
      try{ hideSuspicionUI(); }catch{}
      for(let i=npcs.length-1;i>=0;i--){
        if(npcs[i].questId===failedQuestId) npcs.splice(i,1);
      }
    } else if (usingSequentialMissions) {
      const mg = missionGivers[sequentialMissionIndex];
      if (mg) mg.taken = false;
    }
    updateMissionUI();
  }, 2000);
}

export function updateMissionUI() {
  const cancelBtn = document.getElementById("touchCancelMiss");
  const missionBox = document.getElementById("missionBox");
  // Category styling
  if(missionBox){
    missionBox.classList.remove("mission-main","mission-side");
    if(currentMission && currentMission.category==="side") missionBox.classList.add("mission-side");
    else if(currentMission) missionBox.classList.add("mission-main");
  }
  if (!currentMission) {
    // No active mission: show next available hint
    if (quests.length>0) {
      // Prefer main next, else side available hint
      const nextMain = mainQuests[mainQuestIndex];
      if(nextMain && questStatus.get(nextMain.id)==="available"){
        missionTitle.textContent = lang()==="en" ? `🎯 Main ${mainQuestIndex+1}/${mainQuests.length}: ${nextMain.icon} ${qTitle(nextMain)}` : `🎯 المهمة الرئيسية ${mainQuestIndex+1}/${mainQuests.length}: ${nextMain.icon} ${qTitle(nextMain)}`;
        missionDesc.textContent = lang()==="en" ? "Go to yellow marker to start" : "اذهب إلى النقطة الصفراء لبدء المهمة";
      } else if(sideQuests.some(q=>questStatus.get(q.id)==="available")){
        const availSide = sideQuests.find(q=>questStatus.get(q.id)==="available");
        missionTitle.textContent = lang()==="en" ? `🟣 Side: ${availSide.icon} ${qTitle(availSide)}` : `🟣 جانبية: ${availSide.icon} ${qTitle(availSide)}`;
        missionDesc.textContent = lang()==="en" ? "Go to purple dots for side quests" : "اذهب إلى النقاط البنفسجية للمهمات الجانبية";
      } else if(mainQuestIndex >= mainQuests.length && mainQuests.length>0){
        missionTitle.textContent = lang()==="en" ? "🏆 All mains complete!" : "🏆 جميع المهام الرئيسية مكتملة!";
        missionDesc.textContent = lang()==="en" ? "Great job! No more main quests" : "أحسنت! أكملت جميع المهام الرئيسية";
      } else {
        missionTitle.textContent = lang()==="en" ? "🎯 No active mission" : "🎯 لا توجد مهمة نشطة";
        missionDesc.textContent = lang()==="en" ? "Go to quest markers to start" : "اذهب إلى نقاط المهمات لبدء مهمة";
      }
    } else if (usingSequentialMissions && missionGivers.length > 0) {
      if (sequentialMissionIndex >= missionGivers.length) {
        missionTitle.textContent = lang()==="en" ? "🏆 All missions complete!" : "🏆 جميع المهام مكتملة!";
        missionDesc.textContent = lang()==="en" ? "Great! You finished all missions" : "أحسنت! أكملت جميع مهام الخريطة";
      } else {
        const next = missionGivers[sequentialMissionIndex];
        missionTitle.textContent = `🎯 ${lang()==="en" ? `Mission ${sequentialMissionIndex + 1}/${missionGivers.length}` : `المهمة ${sequentialMissionIndex + 1}/${missionGivers.length}`}: ${next.mission.icon} ${next.mission.name}`;
        missionDesc.textContent =
          lang()==="en" ? "Go to yellow dot to start" : "اذهب إلى النقطة الصفراء على الخريطة لبدء المهمة";
      }
    } else {
      missionTitle.textContent = lang()==="en" ? "🎯 No active mission" : "🎯 لا توجد مهمة نشطة";
      missionDesc.textContent = lang()==="en" ? "Go to yellow dots to start a mission" : "اذهب إلى النقاط الصفراء على الخريطة لبدء مهمة";
    }
    missionProg.textContent = "";
    if (cancelBtn) cancelBtn.classList.remove("visible");
    return;
  }
  if (cancelBtn) cancelBtn.classList.add("visible");

  const m = currentMission;
  const quest = m.quest || (m.questId ? quests.find(q=>q.id===m.questId) : null);
  const displayTitle = quest ? qTitle(quest) : m.name;
  missionTitle.textContent = `${m.category==="side"?"🟣":"🎯"} ${displayTitle}`;
  // Status line: bilingual quest objective + stage label
  const stage = m.stages[m.stage];
  if (stage) {
    const lab = lang()==="en" ? (stage.labelEn || stage.label) : stage.label;
    const obj = quest ? qDesc(quest) : "";
    // Show quest content + current status per spec (top right)
    if(quest && stage.isQuestEnd){
      missionDesc.textContent = `${obj} — ${lab} (${m.stage + 1}/${m.stages.length})`;
    } else {
      missionDesc.textContent = `${lab} (${m.stage + 1}/${m.stages.length})`;
    }
    // If stage has isQuestEnd, indicate drop-off
    if(stage.isQuestEnd){
      missionDesc.textContent = (lang()==="en" ? "🏁 Go to green drop-off to finish" : "🏁 اذهب إلى نقطة التسليم الخضراء لإنهاء المهمة") + ` (${m.stage+1}/${m.stages.length})`;
    }
  } else {
    missionDesc.textContent = lang()==="en" ? "Finishing..." : "جاري إكمال المهمة...";
  }

  if(!stage){
    missionProg.textContent = "";
  } else if(m.type==="silentPursuit"){
    const sus = Math.round(m.data.suspicion||0);
    const elapsed = Math.round((m.data.followTimer||0)/1000);
    const total = Math.round(((stage && stage.duration)||30000)/1000);
    missionProg.textContent = `${lang()==="en"?"Suspicion":"الشك"} ${sus}% | ${elapsed}/${total}s`;
  } else if(m.type==="surveillance"){
    const elapsed = Math.round((m.data.surveillanceTime||0)/1000);
    const total = Math.round(((stage && stage.duration)||30000)/1000);
    const remain = Math.max(0, total - elapsed);
    missionProg.textContent = `${lang()==="en"?"Stay":"ابق"} ${remain}s | ${lang()==="en"?"No kill/police":"لا قتل/شرطة"}`;
  } else if(m.type==="plantBomb"){
    if(stage?.type==="plantBomb"){
      const hold = Math.round((m.data.plantHold||0)/1000*10)/10;
      missionProg.textContent = `${lang()==="en"?"Planting":"زرع"} ${hold}/3.0s (hold E)`;
    } else {
      missionProg.textContent = `${lang()==="en"?"Escape":"اهرب"} ${quest ? `${lang()==="en"?"Progress":"التقدم"} ${m.stage}/${m.stages.length}` : ""}`;
    }
  } else if(m.type==="theft"){
    if(stage?.type==="theft"){
      const hold = Math.round((m.data.theftHold||0)/1000*10)/10;
      const sus = Math.round(m.data.suspicion||0);
      missionProg.textContent = `${lang()==="en"?"Stealing":"سرقة"} ${hold}/20s | ${lang()==="en"?"Suspicion":"شك"} ${sus}%`;
    } else {
      missionProg.textContent = `${lang()==="en"?"Deliver":"سلّم"} ${quest ? qTitle(quest) : ""}`;
    }
  } else if(m.type==="meeting"){
    missionProg.textContent = stage?.type==="meeting" ? (lang()==="en" ? "Press E to talk" : "اضغط E للتحدث") : `${lang()==="en"?"Go":"اذهب"} ${m.stage+1}/${m.stages.length}`;
  } else if(m.type==="deliverLoot"){
    const req = stage?.requiredItem || m.data.requiredItem || "";
    missionProg.textContent = `${lang()==="en"?"Need":"تحتاج"} "${req}" | ${hasItemCheck(req) ? (lang()==="en"?"Have it":"لديك") : (lang()==="en"?"Missing":"مفقود")}`;
  } else if (m.timer > 0) {
    const secs = Math.ceil(m.timer / 1000);
    if (stage && stage.type === "eliminate") {
      const kills = m.data.killCount || 0;
      const target = stage.killTarget || 1;
      missionProg.textContent = `☠ ${kills}/${target}  ⏱ ${secs}s`;
    } else {
      missionProg.textContent = `⏱ ${secs}s`;
    }
  } else if (stage && stage.type === "eliminate") {
    const kills = m.data.killCount || 0;
    const target = stage.killTarget || 1;
    missionProg.textContent = `☠ ${kills}/${target}`;
  } else {
    if(m.quest && m.stages.length){
      missionProg.textContent = quest ? `${lang()==="en"?"Progress":"التقدم"} ${m.stage}/${m.stages.length}` : "";
    } else {
      missionProg.textContent = "";
    }
  }

  if (m.completed) {
    missionTitle.textContent = lang()==="en" ? "✅ Complete!" : "✅ مكتمل!";
    missionDesc.textContent = lang()==="en" ? `Got $${m.reward}` : `حصلت على $${m.reward}`;
  } else if (m.failed) {
    missionTitle.textContent = lang()==="en" ? "❌ Failed" : "❌ فشلت المهمة";
    missionDesc.textContent = lang()==="en" ? "Try again" : "حاول مرة أخرى";
  }
}
function hasItemCheck(name){
  try{ return player && player.inventory && player.inventory.includes(name); }catch{ return false; }
}
// Auto-update HUD when language changes (bilingual quest titles)
if(typeof window!=="undefined"){
  window.addEventListener("languageChanged", ()=>{ try{ updateMissionUI(); } catch{} });
}
