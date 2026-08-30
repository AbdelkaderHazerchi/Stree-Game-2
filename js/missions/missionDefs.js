// ======================== MISSION DEFINITIONS ========================
// Extracted from game.js:51854 inline defs (51863-52009) - no logic changed
// Kept as exported constants for reuse; generateMissions retains inline copies to preserve original logic

export const MISSION_REWARDS = {
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

export const MISSION_DESCS = {
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

export const RANDOM_MISSION_DEFS = [
  { name: "توصيلة أجرة", desc: "أوصل الركاب إلى وجهاتهم", icon: "🚕", type: "taxi", reward: 200 },
  { name: "سباق شوارع", desc: "تجاوز نقاط التفتيش في الوقت المحدد", icon: "🏁", type: "race", reward: 500 },
  { name: "توصيل طرد", desc: "التقط الطرد وقم بتوصيله", icon: "📦", type: "delivery", reward: 300 },
  { name: "سطو", desc: "اسرق البنك واهرب من الشرطة", icon: "💰", type: "heist", reward: 1000 },
  { name: "مطاردة", desc: "طارد السيارة المستهدفة", icon: "🚔", type: "chase", reward: 400 },
  { name: "جمع", desc: "اجمع 5 نقاط في جميع أنحاء المدينة", icon: "⭐", type: "collection", reward: 600 },
  { name: "حماية", desc: "احمِ المنطقة من المجرمين", icon: "🛡️", type: "protect", reward: 350 },
  { name: "تسليم", desc: "سلم البضاعة عبر المدينة", icon: "🚛", type: "smuggle", reward: 750 },
];
