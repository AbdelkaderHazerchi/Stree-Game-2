// ======================== MISSION SYSTEM ========================
// Extracted from game.js:51854-52527 - no logic changed
import { CFG, T } from "../core/config.js?v=16";
import { getTile } from "../map/mapUtils.js?v=15";
import { isWalkable } from "../entities/vehicles.js?v=15";
import { vehicles } from "../entities/vehicles.js?v=15";
import { player } from "../entities/player.js?v=15";
import { specialBuildings } from "../map/mapState.js?v=15";
import { showNotification } from "../ui/hud.js?v=15";
import { missionTitle, missionDesc, missionProg } from "../core/domRefs.js?v=15";
import { currentMission, allMissions, sequentialMissionIndex, usingSequentialMissions, missionGivers, checkpoints, particles, missionsCompleted, setCurrentMission, setMissionsCompleted, setAllMissions, setMissionGivers, setSequentialMissionIndex, setUsingSequentialMissions } from "./missionState.js?v=15";

export function generateMissions() {
  allMissions.length = 0;
  missionGivers.length = 0;
  setSequentialMissionIndex(0);

  // ── MODE A: Map editor provided ordered mission givers ──
  if (window._mapMissionGivers && window._mapMissionGivers.length > 0) {
    setUsingSequentialMissions(true);

    const MISSION_REWARDS = {
      taxi: 200,
      race: 500,
      delivery: 300,
      heist: 1000,
      chase: 400,
      collection: 600,
      protect: 350,
      smuggle: 750,
      stealCar: 300,
      transport: 400,
      killPolice: 500,
      killCivilians: 400,
      killGang: 450,
      smuggleProhibited: 800,
      smuggleWeapons: 900,
    };
    const MISSION_DESCS = {
      taxi: "أوصل الركاب إلى وجهاتهم",
      race: "تجاوز نقاط التفتيش في الوقت المحدد",
      delivery: "التقط الطرد وقم بتوصيله",
      heist: "اسرق البنك واهرب من الشرطة",
      chase: "طارد السيارة المستهدفة",
      collection: "اجمع 5 نقاط في جميع أنحاء المدينة",
      protect: "احمِ المنطقة من المجرمين",
      smuggle: "سلم البضاعة عبر المدينة",
      stealCar: "اسرق السيارة المستهدفة",
      transport: "انقل البضاعة عبر المدينة",
      killPolice: "تخلص من عناصر الشرطة",
      killCivilians: "اقتل 5 من المدنيين",
      killGang: "قضِ على أفراد العصابة",
      smuggleProhibited: "هرّب الشحنة بأمان",
      smuggleWeapons: "سلّم الأسلحة إلى الوجهة",
    };

    window._mapMissionGivers.forEach((mg, index) => {
      const type = mg.type || "taxi";
      const reward = MISSION_REWARDS[type] ?? 300;
      const desc = MISSION_DESCS[type] ?? "أكمل المهمة";
      const mDef = {
        name: mg.name || "مهمة",
        desc: desc,
        icon: mg.icon || "⭐",
        type: type,
        reward: reward,
      };
      allMissions.push(mDef);
      missionGivers.push({
        x: mg.x * CFG.TILE + CFG.TILE / 2,
        y: mg.y * CFG.TILE + CFG.TILE / 2,
        type: type,
        mission: mDef,
        taken: false,
        sequenceIndex: index,
      });
    });
    return;
  }

  // ── MODE B: No map data — random placement ──
  setUsingSequentialMissions(false);

  const missionDefs = [
    {
      name: "توصيلة أجرة",
      desc: "أوصل الركاب إلى وجهاتهم",
      icon: "🚕",
      type: "taxi",
      reward: 200,
    },
    {
      name: "سباق شوارع",
      desc: "تجاوز نقاط التفتيش في الوقت المحدد",
      icon: "🏁",
      type: "race",
      reward: 500,
    },
    {
      name: "توصيل طرد",
      desc: "التقط الطرد وقم بتوصيله",
      icon: "📦",
      type: "delivery",
      reward: 300,
    },
    {
      name: "سطو",
      desc: "اسرق البنك واهرب من الشرطة",
      icon: "💰",
      type: "heist",
      reward: 1000,
    },
    {
      name: "مطاردة",
      desc: "طارد السيارة المستهدفة",
      icon: "🚔",
      type: "chase",
      reward: 400,
    },
    {
      name: "جمع",
      desc: "اجمع 5 نقاط في جميع أنحاء المدينة",
      icon: "⭐",
      type: "collection",
      reward: 600,
    },
    {
      name: "حماية",
      desc: "احمِ المنطقة من المجرمين",
      icon: "🛡️",
      type: "protect",
      reward: 350,
    },
    {
      name: "تسليم",
      desc: "سلم البضاعة عبر المدينة",
      icon: "🚛",
      type: "smuggle",
      reward: 750,
    },
  ];
  missionDefs.forEach(md => allMissions.push(md));

  missionDefs.forEach((m) => {
    let gx,
      gy,
      attempts = 0;
    do {
      const tileX = 2 + Math.floor(Math.random() * (CFG.COLS - 6));
      const tileY = 2 + Math.floor(Math.random() * (CFG.ROWS - 6));
      gx = tileX * CFG.TILE + CFG.TILE / 2;
      gy = tileY * CFG.TILE + CFG.TILE / 2;
      attempts++;
    } while (
      (!isWalkable(gx, gy) ||
        vehicles.some((v) => Math.hypot(v.x - gx, v.y - gy) < 60)) &&
      attempts < 100
    );

    missionGivers.push({
      x: gx,
      y: gy,
      type: m.type,
      mission: m,
      taken: false,
    });
  });
}

export function getActiveMissionGiver() {
  if (!usingSequentialMissions) return null;
  if (sequentialMissionIndex >= missionGivers.length) return null;
  const mg = missionGivers[sequentialMissionIndex];
  return mg && !mg.taken ? mg : null;
}

export function startMission(type) {
  if (currentMission) return;

  const mDef = allMissions.find((m) => m.type === type);
  if (!mDef) return;

  const cm = {
    type: type,
    name: mDef.name,
    desc: mDef.desc,
    reward: mDef.reward,
    stage: 0,
    stages: [],
    completed: false,
    failed: false,
    timer: 0,
    data: {},
  };
  setCurrentMission(cm);

  setupMissionStages(cm);
  if (cm.failed) {
    const reason = cm.failReason || "فشل في إعداد المهمة";
    failMission(reason);
    return;
  }
  updateMissionUI();
  showNotification(`🚀 بدء مهمة: ${cm.name}`);
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
  switch (mission.type) {
    case "taxi": {
      for (let i = 0; i < 3; i++) {
        const t = getWalkableTile();
        mission.stages.push({
          type: "goto",
          x: t.x,
          y: t.y,
          label: `اذهب للراكب ${i + 1}`,
          done: false,
        });
      }
      for (let i = 0; i < 3; i++) {
        const t = getWalkableTile();
        mission.stages.push({
          type: "goto",
          x: t.x,
          y: t.y,
          label: `قم بتوصيل الراكب ${i + 1}`,
          done: false,
        });
      }
      break;
    }
    case "race": {
      for (let i = 0; i < 5; i++) {
        const t = getWalkableTile();
        mission.stages.push({
          type: "checkpoint",
          x: t.x,
          y: t.y,
          label: `نقطة تفتيش ${i + 1}`,
          done: false,
          radius: 60,
        });
      }
      mission.timer = 120000;
      break;
    }
    case "delivery": {
      const t1 = getWalkableTile();
      mission.stages.push({
        type: "goto",
        x: t1.x,
        y: t1.y,
        label: "التقط الطرد",
        done: false,
      });
      const t2 = getWalkableTile();
      mission.stages.push({
        type: "goto",
        x: t2.x,
        y: t2.y,
        label: "قم بتوصيل الطرد",
        done: false,
      });
      break;
    }
    case "heist": {
      const bank = specialBuildings.find((b) => b.name === "البنك");
      if (bank) {
        const bt = getWalkableTile();
        mission.stages.push({
          type: "goto",
          x: bt.x,
          y: bt.y,
          label: "اذهب إلى البنك",
          done: false,
        });
      }
      mission.stages.push({
        type: "escape",
        label: "اهرب من الشرطة لمدة 30 ثانية",
        done: false,
        duration: 30000,
      });
      break;
    }
    case "chase": {
      const t = getWalkableTile();
      mission.data.chaseTarget = {
        x: t.x,
        y: t.y,
        vx: 0,
        vy: 0,
        angle: 0,
        speed: 3.0,
      };
      mission.stages.push({
        type: "chase",
        label: "طارد السيارة المستهدفة",
        done: false,
        radius: 200,
      });
      break;
    }
    case "collection": {
      for (let i = 0; i < 5; i++) {
        const t = getWalkableTile();
        mission.stages.push({
          type: "collect",
          x: t.x,
          y: t.y,
          label: `اجمع النقطة ${i + 1}`,
          done: false,
          collected: false,
        });
      }
      break;
    }
    case "protect": {
      const t = getWalkableTile();
      mission.data.protectZone = {
        x: t.x,
        y: t.y,
        radius: 150,
      };
      mission.stages.push({
        type: "protect",
        label: "احمِ المنطقة لمدة 45 ثانية",
        done: false,
        duration: 45000,
      });
      break;
    }
    case "smuggle": {
      for (let i = 0; i < 4; i++) {
        const t = getWalkableTile();
        mission.stages.push({
          type: "dropoff",
          x: t.x,
          y: t.y,
          label: `نقطة تسليم ${i + 1}`,
          done: false,
        });
      }
      break;
    }
    case "killPolice": {
      player.wanted = Math.max(player.wanted, 2);
      showNotification("🚨 الشرطة في الطريق! تخلص منهم.");
      mission.data.killTarget = 5;
      mission.data.killCount = 0;
      mission.stages.push({
        type: "eliminate",
        label: "اقتل 5 من عناصر الشرطة",
        done: false,
        killTarget: 5,
      });
      mission.timer = 120000;
      break;
    }
    case "killCivilians": {
      mission.data.killTarget = 5;
      mission.data.killCount = 0;
      mission.stages.push({
        type: "eliminate",
        label: "اقتل 5 من المدنيين",
        done: false,
        killTarget: 5,
      });
      mission.timer = 120000;
      break;
    }
    case "killGang": {
      mission.data.killTarget = 5;
      mission.data.killCount = 0;
      mission.stages.push({
        type: "eliminate",
        label: "اقتل 5 من رجال العصابة",
        done: false,
        killTarget: 5,
      });
      mission.timer = 120000;
      break;
    }
    case "stealCar": {
      let targetVehicle = null;
      for (const v of vehicles) {
        if (!v.isPolice && !v.occupied) {
          targetVehicle = v;
          break;
        }
      }
      if (!targetVehicle) {
        mission.failed = true;
        mission.failReason = "لا توجد سيارات متاحة للسرقة حالياً";
        return;
      }
      const vehicleId = vehicles.indexOf(targetVehicle);
      mission.data.targetVehicle = targetVehicle;
      mission.data.targetVehicleId = vehicleId;
      mission.stages.push({
        type: "approachVehicle",
        label: "اقترب من السيارة المستهدفة",
        done: false,
        targetVehicleId: vehicleId,
        radius: 60,
      });
      mission.stages.push({
        type: "stealVehicle",
        label: "اسرق السيارة",
        done: false,
        targetVehicleId: vehicleId,
      });
      mission.stages.push({
        type: "escape",
        label: "اهرب من الشرطة لمدة 20 ثانية",
        done: false,
        duration: 20000,
      });
      break;
    }
  }
}

export function updateMission() {
  if (!currentMission || currentMission.completed || currentMission.failed)
    return;

  const m = currentMission;

  // Timer for timed missions
  if (m.timer > 0) {
    m.timer -= 16;
    if (m.timer <= 0) {
      failMission("انتهى الوقت!");
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
      const dist = Math.hypot(px - stage.x, py - stage.y);
      if (dist < 50) {
        stage.done = true;
        advanceStage();
      }
      break;
    }
    case "approachVehicle": {
      const vehicleId = stage.targetVehicleId;
      const vehicle = vehicles[vehicleId];
      if (!vehicle) {
        failMission("السيارة المستهدفة لم تعد موجودة");
        return;
      }
      if (vehicle.occupied && vehicle.driver !== player) {
        failMission("تم سرقة السيارة من قبلك!");
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
      const vehicleId = stage.targetVehicleId;
      const vehicle = vehicles[vehicleId];
      if (!vehicle) {
        failMission("السيارة المستهدفة لم تعد موجودة");
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
      const target = stage.killTarget || 5;
      if (kills >= target) {
        stage.done = true;
        advanceStage();
      }
      break;
    }
  }

  updateMissionUI();
}

export function advanceStage() {
  if (!currentMission) return;
  showNotification(
    `✅ ${currentMission.stages[currentMission.stage].label} - تم!`,
  );
  currentMission.stage++;
  if (currentMission.stage >= currentMission.stages.length) {
    completeMission();
  } else {
    // Trigger wanted for heist escape stage
    if (currentMission.stages[currentMission.stage].type === "escape") {
      player.wanted = Math.min(4, player.wanted + 2);
      showNotification("🚨 الشرطة في المطاردة!");
    }
  }
  updateMissionUI();
}

export function completeMission() {
  if (!currentMission) return;
  currentMission.completed = true;
  setMissionsCompleted(missionsCompleted + 1);
  player.money += currentMission.reward;

  showNotification(`💰 مهمة مكتملة! +$${currentMission.reward}`);

  setTimeout(() => {
    setCurrentMission(null);
    player.wanted = Math.max(0, player.wanted - 2);

    // Sequential mode: advance to next mission
    if (usingSequentialMissions) {
      setSequentialMissionIndex(sequentialMissionIndex + 1);
      if (sequentialMissionIndex >= missionGivers.length) {
        showNotification("🏆 أكملت جميع المهام! مبروك!");
      } else {
        const next = missionGivers[sequentialMissionIndex];
        showNotification(
          `🔓 مهمة جديدة متاحة: ${next.mission.icon} ${next.mission.name}`,
        );
      }
    }

    updateMissionUI();
  }, 2000);
}

export function failMission(reason) {
  if (!currentMission) return;
  currentMission.failed = true;
  showNotification(`❌ فشلت المهمة: ${reason}`);

  setTimeout(() => {
    setCurrentMission(null);
    // Allow retry in sequential mode
    if (usingSequentialMissions) {
      const mg = missionGivers[sequentialMissionIndex];
      if (mg) mg.taken = false;
    }
    updateMissionUI();
  }, 2000);
}

export function updateMissionUI() {
  const cancelBtn = document.getElementById("touchCancelMiss");
  if (!currentMission) {
    if (usingSequentialMissions && missionGivers.length > 0) {
      if (sequentialMissionIndex >= missionGivers.length) {
        missionTitle.textContent = "🏆 جميع المهام مكتملة!";
        missionDesc.textContent = "أحسنت! أكملت جميع مهام الخريطة";
      } else {
        const next = missionGivers[sequentialMissionIndex];
        missionTitle.textContent = `🎯 المهمة ${sequentialMissionIndex + 1}/${missionGivers.length}: ${next.mission.icon} ${next.mission.name}`;
        missionDesc.textContent =
          "اذهب إلى النقطة الصفراء على الخريطة لبدء المهمة";
      }
    } else {
      missionTitle.textContent = "🎯 لا توجد مهمة نشطة";
      missionDesc.textContent = "اذهب إلى النقاط الصفراء على الخريطة لبدء مهمة";
    }
    missionProg.textContent = "";
    if (cancelBtn) cancelBtn.classList.remove("visible");
    return;
  }
  if (cancelBtn) cancelBtn.classList.add("visible");

  const m = currentMission;
  missionTitle.textContent = `🎯 ${m.name}`;

  const stage = m.stages[m.stage];
  if (stage) {
    missionDesc.textContent = `${stage.label} (${m.stage + 1}/${m.stages.length})`;
  } else {
    missionDesc.textContent = "جاري إكمال المهمة...";
  }

  if (m.timer > 0) {
    const secs = Math.ceil(m.timer / 1000);
    if (stage && stage.type === "eliminate") {
      const kills = m.data.killCount || 0;
      const target = stage.killTarget || 5;
      missionProg.textContent = `☠ ${kills}/${target}  ⏱ ${secs}s`;
    } else {
      missionProg.textContent = `⏱ ${secs}s`;
    }
  } else if (stage && stage.type === "eliminate") {
    const kills = m.data.killCount || 0;
    const target = stage.killTarget || 5;
    missionProg.textContent = `☠ ${kills}/${target}`;
  } else {
    missionProg.textContent = "";
  }

  if (m.completed) {
    missionTitle.textContent = "✅ مكتمل!";
    missionDesc.textContent = `حصلت على $${m.reward}`;
  } else if (m.failed) {
    missionTitle.textContent = "❌ فشلت المهمة";
    missionDesc.textContent = "حاول مرة أخرى";
  }
}

