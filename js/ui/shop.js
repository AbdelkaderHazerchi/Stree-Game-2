// ======================== SHOP ========================
// Extracted from game.js:54848-55168 - no logic changed
import { CFG } from "../core/config.js?v=26";
import { player, respawnPlayer } from "../entities/player.js?v=26";
import { vehicles, VEHICLE_TYPES, isOnRoad } from "../entities/vehicles.js?v=26";
import { police, clearPolice } from "../entities/police.js?v=26";
import { showNotification, updateHUD, updateWantedUI } from "./hud.js?v=26";
import { overlay, overlayBtn } from "../core/domRefs.js?v=26";

export const SHOPS = {
  "🔫 Ammu-Nation": {
    title: "🔫 Ammu-Nation",
    items: [
      {
        name: "طلقات مسدس (x20)",
        price: 100,
        desc: "20 طلقة للمسدس",
        icon: "📦",
        action: (p) => {
          p.ammo.pistol = (p.ammo.pistol || 0) + 20;
          showNotification("📦 +20 طلقة مسدس");
        },
      },
      {
        name: "رشاش SMG",
        price: 2000,
        desc: "رشاش سريع +50 طلقة",
        icon: "🔫",
        action: (p) => {
          if (!p.weapons.includes("smg")) p.weapons.push("smg");
          p.ammo.smg = (p.ammo.smg || 0) + 50;
          showNotification("🔫 رشاش +50 طلقة");
        },
      },
      {
        name: "بندقية",
        price: 3000,
        desc: "بندقية قوية +30 طلقة",
        icon: "🔫",
        action: (p) => {
          if (!p.weapons.includes("rifle")) p.weapons.push("rifle");
          p.ammo.rifle = (p.ammo.rifle || 0) + 30;
          showNotification("🔫 بندقية +30 طلقة");
        },
      },
      {
        name: "شوزن",
        price: 2500,
        desc: "شوزن عنقودي +15 طلقة",
        icon: "🔫",
        action: (p) => {
          if (!p.weapons.includes("shotgun")) p.weapons.push("shotgun");
          p.ammo.shotgun = (p.ammo.shotgun || 0) + 15;
          showNotification("🔫 شوزن +15 طلقة");
        },
      },
      {
        name: "ذخيرة متنوعة (50)",
        price: 300,
        desc: "50 طلقة لكل سلاح",
        icon: "📦",
        action: (p) => {
          for (const k in p.ammo) p.ammo[k] = (p.ammo[k] || 0) + 50;
          showNotification("📦 +50 لكل سلاح");
        },
      },
    ],
  },
  "👕 Binco": {
    title: "👕 Binco - الأزياء",
    items: [
      {
        name: "أحمر",
        price: 200,
        desc: "لون أحمر",
        icon: "🔴",
        color: "#e74c3c",
        action: (p) => {
          p.color = "#e74c3c";
        },
      },
      {
        name: "أزرق",
        price: 200,
        desc: "لون أزرق",
        icon: "🔵",
        color: "#3498db",
        action: (p) => {
          p.color = "#3498db";
        },
      },
      {
        name: "أخضر",
        price: 200,
        desc: "لون أخضر",
        icon: "🟢",
        color: "#2ecc71",
        action: (p) => {
          p.color = "#2ecc71";
        },
      },
      {
        name: "أصفر",
        price: 200,
        desc: "لون أصفر",
        icon: "🟡",
        color: "#f1c40f",
        action: (p) => {
          p.color = "#f1c40f";
        },
      },
      {
        name: "بنفسجي",
        price: 200,
        desc: "لون بنفسجي",
        icon: "🟣",
        color: "#9b59b6",
        action: (p) => {
          p.color = "#9b59b6";
        },
      },
      {
        name: "برتقالي",
        price: 200,
        desc: "لون برتقالي",
        icon: "🟠",
        color: "#e67e22",
        action: (p) => {
          p.color = "#e67e22";
        },
      },
      {
        name: "أبيض",
        price: 200,
        desc: "لون أبيض",
        icon: "⬜",
        color: "#ecf0f1",
        action: (p) => {
          p.color = "#ecf0f1";
        },
      },
      {
        name: "أسود",
        price: 200,
        desc: "لون أسود",
        icon: "⬛",
        color: "#2c3e50",
        action: (p) => {
          p.color = "#2c3e50";
        },
      },
    ],
  },
  "🚗 معرض سيارات": {
    title: "🚗 معرض السيارات",
    items: [
      {
        name: "سيدان عائلي",
        price: 5000,
        desc: "سيارة عائلية موثوقة",
        icon: "🚗",
        carType: 0,
        action: (p) => {
          givePersonalCar(0);
        },
      },
      {
        name: "سيارة رياضية",
        price: 12000,
        desc: "سيارة فارهة وسريعة",
        icon: "🏎️",
        carType: 1,
        action: (p) => {
          givePersonalCar(1);
        },
      },
      {
        name: "SUV كبيرة",
        price: 8000,
        desc: "سيارة دفع رباعي",
        icon: "🚙",
        carType: 3,
        action: (p) => {
          givePersonalCar(3);
        },
      },
      {
        name: "BMW-s5",
        price: 15000,
        desc: "سيارة سيدان فاخرة عالية الأداء",
        icon: "🚗",
        carType: 5,
        action: (p) => {
          givePersonalCar(5);
        },
      },
      {
        name: "Mercedes-g8",
        price: 17000,
        desc: "سيارة دفع رباعي فاخرة وقوية",
        icon: "🚙",
        carType: 6,
        action: (p) => {
          givePersonalCar(6);
        },
      },
    ],
  },
  "💊 عيادة": {
    title: "💊 عيادة LS",
    items: [
      {
        name: "علاج كامل",
        price: 100,
        desc: "استعادة الصحة كاملة",
        icon: "❤️",
        action: (p) => {
          p.health = p.maxHealth;
        },
      },
      {
        name: "درع واقي",
        price: 300,
        desc: "درع إضافي +50 صحة",
        icon: "🛡️",
        action: (p) => {
          p.maxHealth = 150;
          p.health = Math.min(p.health + 50, 150);
        },
      },
      {
        name: "إزالة المطلوبين",
        price: 500,
        desc: "إزالة نجوم الشرطة",
        icon: "🌟",
        action: (p) => {
          p.wanted = 0;
          clearPolice();
          updateWantedUI();
        },
      },
    ],
  },
  "🎰 Casino": {
    title: "🎰 Casino - الكازينو",
    items: [
      {
        name: "حزمة مال $500",
        price: 400,
        desc: "اربح $500 مقابل $400",
        icon: "💰",
        action: (p) => {
          p.money += 500;
          showNotification("🎰 ربحت $500!");
        },
      },
      {
        name: "حزمة مال $1200",
        price: 1000,
        desc: "اربح $1200",
        icon: "💰",
        action: (p) => {
          p.money += 1200;
          showNotification("🎰 ربحت $1200!");
        },
      },
      {
        name: "حزمة صحة الحظ",
        price: 250,
        desc: "استعادة الصحة + درع صغير",
        icon: "🍀",
        action: (p) => {
          p.health = p.maxHealth;
          const bonus = 20 + Math.floor(Math.random() * 30);
          p.money += bonus;
          showNotification(`🍀 حظ سعيد! +$${bonus}`);
        },
      },
    ],
  },
  // Alias for English name used in map editor dropdown
  "🎰 كازينو": {
    title: "🎰 Casino - الكازينو",
    items: [
      {
        name: "حزمة مال $500",
        price: 400,
        desc: "اربح $500 مقابل $400",
        icon: "💰",
        action: (p) => {
          p.money += 500;
          showNotification("🎰 ربحت $500!");
        },
      },
      {
        name: "حزمة مال $1200",
        price: 1000,
        desc: "اربح $1200",
        icon: "💰",
        action: (p) => {
          p.money += 1200;
          showNotification("🎰 ربحت $1200!");
        },
      },
    ],
  },
  // English alias for editor dropdown
  "🚗 Car Showroom": {
    title: "🚗 معرض السيارات",
    items: [
      {
        name: "سيدان عائلي",
        price: 5000,
        desc: "سيارة عائلية موثوقة",
        icon: "🚗",
        carType: 0,
        action: (p) => {
          givePersonalCar(0);
        },
      },
      {
        name: "سيارة رياضية",
        price: 12000,
        desc: "سيارة فارهة وسريعة",
        icon: "🏎️",
        carType: 1,
        action: (p) => {
          givePersonalCar(1);
        },
      },
      {
        name: "SUV كبيرة",
        price: 8000,
        desc: "سيارة دفع رباعي",
        icon: "🚙",
        carType: 3,
        action: (p) => {
          givePersonalCar(3);
        },
      },
      {
        name: "BMW-s5",
        price: 15000,
        desc: "سيارة سيدان فاخرة عالية الأداء",
        icon: "🚗",
        carType: 5,
        action: (p) => {
          givePersonalCar(5);
        },
      },
      {
        name: "Mercedes-g8",
        price: 17000,
        desc: "سيارة دفع رباعي فاخرة وقوية",
        icon: "🚙",
        carType: 6,
        action: (p) => {
          givePersonalCar(6);
        },
      },
    ],
  },
  "🏛️ Police Station": {
    title: "🏛️ Police Station - مركز الشرطة",
    items: [
      {
        name: "إزالة النجوم (رشوة)",
        price: 600,
        desc: "إزالة مستوى المطلوبين بالكامل",
        icon: "🌟",
        action: (p) => {
          p.wanted = 0;
          clearPolice();
          updateWantedUI();
          showNotification("🌟 تم إزالة النجوم - الشرطة صرفت النظر");
        },
      },
      {
        name: "درع الشرطة",
        price: 400,
        desc: "درع واقي +50 صحة",
        icon: "🛡️",
        action: (p) => {
          p.maxHealth = 150;
          p.health = Math.min(p.health + 50, 150);
          showNotification("🛡️ درع الشرطة +50");
        },
      },
      {
        name: "ذخيرة مسدس (x30)",
        price: 180,
        desc: "30 طلقة مسدس",
        icon: "📦",
        action: (p) => {
          p.ammo.pistol = (p.ammo.pistol || 0) + 30;
          showNotification("📦 +30 طلقة مسدس");
        },
      },
      {
        name: "علاج كامل",
        price: 150,
        desc: "استعادة الصحة كاملة",
        icon: "❤️",
        action: (p) => {
          p.health = p.maxHealth;
          showNotification("❤️ تم العلاج الكامل");
        },
      },
    ],
  },
  // Aliases for Police Station (editor or map may store without emoji or with different spacing)
  "🏛️Police Station": {
    title: "🏛️ Police Station - مركز الشرطة",
    items: [
      {
        name: "إزالة النجوم (رشوة)",
        price: 600,
        desc: "إزالة مستوى المطلوبين بالكامل",
        icon: "🌟",
        action: (p) => {
          p.wanted = 0;
          clearPolice();
          updateWantedUI();
          showNotification("🌟 تم إزالة النجوم - الشرطة صرفت النظر");
        },
      },
      {
        name: "درع الشرطة",
        price: 400,
        desc: "درع واقي +50 صحة",
        icon: "🛡️",
        action: (p) => {
          p.maxHealth = 150;
          p.health = Math.min(p.health + 50, 150);
          showNotification("🛡️ درع الشرطة +50");
        },
      },
      {
        name: "ذخيرة مسدس (x30)",
        price: 180,
        desc: "30 طلقة مسدس",
        icon: "📦",
        action: (p) => {
          p.ammo.pistol = (p.ammo.pistol || 0) + 30;
          showNotification("📦 +30 طلقة مسدس");
        },
      },
      {
        name: "علاج كامل",
        price: 150,
        desc: "استعادة الصحة كاملة",
        icon: "❤️",
        action: (p) => {
          p.health = p.maxHealth;
          showNotification("❤️ تم العلاج الكامل");
        },
      },
    ],
  },
  "Police Station": {
    title: "🏛️ Police Station - مركز الشرطة",
    items: [
      {
        name: "إزالة النجوم (رشوة)",
        price: 600,
        desc: "إزالة مستوى المطلوبين بالكامل",
        icon: "🌟",
        action: (p) => {
          p.wanted = 0;
          clearPolice();
          updateWantedUI();
          showNotification("🌟 تم إزالة النجوم - الشرطة صرفت النظر");
        },
      },
      {
        name: "درع الشرطة",
        price: 400,
        desc: "درع واقي +50 صحة",
        icon: "🛡️",
        action: (p) => {
          p.maxHealth = 150;
          p.health = Math.min(p.health + 50, 150);
          showNotification("🛡️ درع الشرطة +50");
        },
      },
      {
        name: "ذخيرة مسدس (x30)",
        price: 180,
        desc: "30 طلقة مسدس",
        icon: "📦",
        action: (p) => {
          p.ammo.pistol = (p.ammo.pistol || 0) + 30;
          showNotification("📦 +30 طلقة مسدس");
        },
      },
      {
        name: "علاج كامل",
        price: 150,
        desc: "استعادة الصحة كاملة",
        icon: "❤️",
        action: (p) => {
          p.health = p.maxHealth;
          showNotification("❤️ تم العلاج الكامل");
        },
      },
    ],
  },
  "🏥 Hospital": {
    title: "🏥 Hospital - مستشفى",
    items: [
      {
        name: "علاج كامل",
        price: 100,
        desc: "استعادة الصحة كاملة",
        icon: "❤️",
        action: (p) => {
          p.health = p.maxHealth;
          showNotification("❤️ تم العلاج الكامل");
        },
      },
      {
        name: "درع طبي",
        price: 300,
        desc: "درع واقي +50 صحة",
        icon: "🛡️",
        action: (p) => {
          p.maxHealth = 150;
          p.health = Math.min(p.health + 50, 150);
          showNotification("🛡️ درع طبي +50");
        },
      },
      {
        name: "إزالة النجوم",
        price: 500,
        desc: "إزالة مستوى المطلوبين",
        icon: "🌟",
        action: (p) => {
          p.wanted = 0;
          clearPolice();
          updateWantedUI();
          showNotification("🌟 تم إزالة النجوم");
        },
      },
      {
        name: "إسعاف سريع",
        price: 200,
        desc: "شفاء فوري +50 صحة",
        icon: "🚑",
        action: (p) => {
          p.health = Math.min(p.health + 50, p.maxHealth);
          showNotification("🚑 تم الإسعاف +50 صحة");
        },
      },
    ],
  },
  // Aliases
  "🏥Hospital": {
    title: "🏥 Hospital - مستشفى",
    items: [
      {
        name: "علاج كامل",
        price: 100,
        desc: "استعادة الصحة كاملة",
        icon: "❤️",
        action: (p) => {
          p.health = p.maxHealth;
          showNotification("❤️ تم العلاج الكامل");
        },
      },
      {
        name: "درع طبي",
        price: 300,
        desc: "درع واقي +50 صحة",
        icon: "🛡️",
        action: (p) => {
          p.maxHealth = 150;
          p.health = Math.min(p.health + 50, 150);
          showNotification("🛡️ درع طبي +50");
        },
      },
      {
        name: "إزالة النجوم",
        price: 500,
        desc: "إزالة مستوى المطلوبين",
        icon: "🌟",
        action: (p) => {
          p.wanted = 0;
          clearPolice();
          updateWantedUI();
          showNotification("🌟 تم إزالة النجوم");
        },
      },
      {
        name: "إسعاف سريع",
        price: 200,
        desc: "شفاء فوري +50 صحة",
        icon: "🚑",
        action: (p) => {
          p.health = Math.min(p.health + 50, p.maxHealth);
          showNotification("🚑 تم الإسعاف +50 صحة");
        },
      },
    ],
  },
  "Hospital": {
    title: "🏥 Hospital - مستشفى",
    items: [
      {
        name: "علاج كامل",
        price: 100,
        desc: "استعادة الصحة كاملة",
        icon: "❤️",
        action: (p) => {
          p.health = p.maxHealth;
          showNotification("❤️ تم العلاج الكامل");
        },
      },
      {
        name: "درع طبي",
        price: 300,
        desc: "درع واقي +50 صحة",
        icon: "🛡️",
        action: (p) => {
          p.maxHealth = 150;
          p.health = Math.min(p.health + 50, 150);
          showNotification("🛡️ درع طبي +50");
        },
      },
      {
        name: "إزالة النجوم",
        price: 500,
        desc: "إزالة مستوى المطلوبين",
        icon: "🌟",
        action: (p) => {
          p.wanted = 0;
          clearPolice();
          updateWantedUI();
          showNotification("🌟 تم إزالة النجوم");
        },
      },
      {
        name: "إسعاف سريع",
        price: 200,
        desc: "شفاء فوري +50 صحة",
        icon: "🚑",
        action: (p) => {
          p.health = Math.min(p.health + 50, p.maxHealth);
          showNotification("🚑 تم الإسعاف +50 صحة");
        },
      },
    ],
  },
  "🏦 Bank": {
    title: "🏦 Bank - بنك",
    items: [
      {
        name: "إيداع أموال",
        price: 100,
        desc: "إيداع $500 في الحساب",
        icon: "💰",
        action: (p) => {
          p.money += 500;
          showNotification("💰 تم إيداع $500");
        },
      },
      {
        name: "قرض سريع",
        price: 500,
        desc: "اقتراض $2000 (سداد $2500)",
        icon: "📝",
        action: (p) => {
          p.money += 2000;
          p.debt = (p.debt || 0) + 2500;
          showNotification("📝 قرض $2000 - سداد $2500");
        },
      },
      {
        name: "خزنة آمنة",
        price: 300,
        desc: "حماية الأموال من السرقة",
        icon: "🔒",
        action: (p) => {
          p.safeMode = true;
          showNotification("🔒 خزنة آمنة مفعلة");
        },
      },
      {
        name: "تحويل بنكي",
        price: 200,
        desc: "نقل أموال بين الحسابات",
        icon: "💳",
        action: (p) => {
          p.money = Math.round(p.money * 1.05);
          showNotification("💳 فائدة بنكية 5%");
        },
      },
    ],
  },
  // Aliases
  "🏦Bank": {
    title: "🏦 Bank - بنك",
    items: [
      {
        name: "إيداع أموال",
        price: 100,
        desc: "إيداع $500 في الحساب",
        icon: "💰",
        action: (p) => {
          p.money += 500;
          showNotification("💰 تم إيداع $500");
        },
      },
      {
        name: "قرض سريع",
        price: 500,
        desc: "اقتراض $2000 (سداد $2500)",
        icon: "📝",
        action: (p) => {
          p.money += 2000;
          p.debt = (p.debt || 0) + 2500;
          showNotification("📝 قرض $2000 - سداد $2500");
        },
      },
      {
        name: "خزنة آمنة",
        price: 300,
        desc: "حماية الأموال من السرقة",
        icon: "🔒",
        action: (p) => {
          p.safeMode = true;
          showNotification("🔒 خزنة آمنة مفعلة");
        },
      },
      {
        name: "تحويل بنكي",
        price: 200,
        desc: "نقل أموال بين الحسابات",
        icon: "💳",
        action: (p) => {
          p.money = Math.round(p.money * 1.05);
          showNotification("💳 فائدة بنكية 5%");
        },
      },
    ],
  },
  "Bank": {
    title: "🏦 Bank - بنك",
    items: [
      {
        name: "إيداع أموال",
        price: 100,
        desc: "إيداع $500 في الحساب",
        icon: "💰",
        action: (p) => {
          p.money += 500;
          showNotification("💰 تم إيداع $500");
        },
      },
      {
        name: "قرض سريع",
        price: 500,
        desc: "اقتراض $2000 (سداد $2500)",
        icon: "📝",
        action: (p) => {
          p.money += 2000;
          p.debt = (p.debt || 0) + 2500;
          showNotification("📝 قرض $2000 - سداد $2500");
        },
      },
      {
        name: "خزنة آمنة",
        price: 300,
        desc: "حماية الأموال من السرقة",
        icon: "🔒",
        action: (p) => {
          p.safeMode = true;
          showNotification("🔒 خزنة آمنة مفعلة");
        },
      },
      {
        name: "تحويل بنكي",
        price: 200,
        desc: "نقل أموال بين الحسابات",
        icon: "💳",
        action: (p) => {
          p.money = Math.round(p.money * 1.05);
          showNotification("💳 فائدة بنكية 5%");
        },
      },
    ],
  },
};

let activeShop = null;
let nearShopName = null;
export function getNearShopName(){ return nearShopName; }
export function setNearShopName(v){ nearShopName = v; if (typeof window !== 'undefined') window.nearShopName = v; }

export function givePersonalCar(typeIndex) {
  // Eject player if driving personal car to avoid orphan inVehicle ref
  if (player.inVehicle && player.inVehicle === player.personalCar) {
    player.inVehicle = null;
    player.onFoot = true;
  }
  // Remove old personal car if exists
  if (player.personalCar) {
    const idx = vehicles.indexOf(player.personalCar);
    if (idx >= 0) vehicles.splice(idx, 1);
    player.personalCar = null;
  }
  // Find a road tile near player
  let px = player.x,
    py = player.y;
  for (let i = 0; i < 30; i++) {
    const nx = player.x + (Math.random() - 0.5) * 200;
    const ny = player.y + (Math.random() - 0.5) * 200;
    if (isOnRoad(nx, ny)) {
      px = nx;
      py = ny;
      break;
    }
  }
  const type = VEHICLE_TYPES[typeIndex];
  if (!type) { showNotification("❌ نوع السيارة غير موجود"); return; }
  const health = 18;
  const car = {
    x: px,
    y: py,
    w: type.w,
    h: type.h,
    speed: type.speed + 0.3,
    cruiseSpeed: 1.6 + Math.random()*0.6,
    type: type,
    typeIdx: typeIndex,
    angle: Math.PI / 2,
    vx: 0,
    vy: 0,
    driver: null,
    isPolice: false,
    siren: false,
    occupied: false,
    isPersonal: true,
    hidden: false,
    exploding: false,
    health, maxHealth: health,
    npcTargetX: px,
    npcTargetY: py,
    npcWaitTimer: 0,
    npcState: "waiting",
    moveAngle: Math.PI / 2,
  };
  vehicles.push(car);
  player.personalCar = car;
  showNotification(`🚗 تم شراء ${type.name}! تظهر باللون الذهبي`);
}

export function openShop(shopName) {
  const shop = SHOPS[shopName];
  if (!shop) return;
  activeShop = shopName;
  document.getElementById("shopTitle").textContent = shop.title;
  const container = document.getElementById("shopItems");
  container.innerHTML = "";
  shop.items.forEach((item, idx) => {
    const div = document.createElement("div");
    div.className = "save-slot";
    const canBuy = player.money >= item.price;
    // Build safely with textContent
    const left = document.createElement("div");
    const nameRow = document.createElement("div");
    nameRow.className = "name";
    nameRow.textContent = `${item.icon || ""} ${item.name} - $${item.price}`;
    // Color price part via span with safe text
    // Already included in textContent above
    const descRow = document.createElement("div");
    descRow.className = "info";
    descRow.textContent = item.desc;
    left.appendChild(nameRow);
    left.appendChild(descRow);
    const btn = document.createElement("button");
    btn.className = "menu-btn";
    btn.style.padding = "6px 16px";
    btn.style.fontSize = "12px";
    btn.style.background = canBuy ? "#ff6b35" : "#444";
    btn.style.color = canBuy ? "#fff" : "#666";
    btn.disabled = !canBuy;
    btn.textContent = canBuy ? "شراء" : "💰";
    if (canBuy) {
      btn.onclick = () => {
        if(player.money < item.price) return;
        player.money -= item.price;
        item.action(player);
        updateHUD();
        openShop(shopName);
        // refresh
        if (shopName === "👕 Binco") showNotification("👕 تم تغيير اللباس!");
        else if (shopName === "💊 عيادة") showNotification("❤️ تم العلاج!");
      };
    }
    div.appendChild(left);
    div.appendChild(btn);
    container.appendChild(div);
  });
  document.getElementById("shopPlayerInfo").textContent =
    `💰 $${player.money} | ❤️ ${Math.round(player.health)}`;
  document.getElementById("shopDialog").style.display = "flex";
}

const _closeShopBtn = document.getElementById("closeShopBtn");
if(_closeShopBtn) _closeShopBtn.onclick = () => {
  const d=document.getElementById("shopDialog");
  if(d) d.style.display = "none";
  activeShop = null;
};

// Overlay button (death/respawn)
if(overlayBtn){
  overlayBtn.addEventListener("click", () => {
    if (!player.alive) {
      respawnPlayer();
    } else {
      if(overlay) overlay.style.display = "none";
    }
  });
}
