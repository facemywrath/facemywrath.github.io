let gameVersion = "0.1.x";
let gameVerDiv = document.getElementById("version-bar")
if(gameVerDiv){
  gameVerDiv.textContent = "Version: "+ gameVersion;
}
let loreDataCache = null;
let damageTypeMultipliers = null;
let skillsData = null;
let unitsData = null;
let talentsData = null;
const debugLog = [];
(function () {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    function addToDebugLog(type, ...args) {
        const timestamp = new Date().toISOString();
        const entry = `[${type.toUpperCase()}]  ${timestamp}:  ${args.join(', ')}`;
        debugLog.push(entry);
    }

    console.log = function (...args) {
        addToDebugLog('log', ...args);
        originalLog.apply(console, args);
    };

    console.warn = function (...args) {
        addToDebugLog('warn', ...args);
        originalWarn.apply(console, args);
    };

    console.error = function (...args) {
        addToDebugLog('error', ...args);
        originalError.apply(console, args);
    };

    window.addEventListener("error", function (event) {
        addToDebugLog('global error', event.message, event.filename, event.lineno);
    });

    window.addEventListener("unhandledrejection", function (event) {
        addToDebugLog('unhandled rejection', event.reason, new Error().stack);
    });
})();


Array.prototype.random = function() {
  return this[Math.floor(Math.random() * this.length)];
};
let loadFromGithub = true;
let runAnalysis = true;
let hintData;
const updateSpeed = 100;
let skillToEquip = null; // temporarily holds a skill ID when "Equip" is clicked
let unitToTarget = null;
let skillToTarget = null;
let targetting = false;
let combatHistory = ""
let timeStartedTargetting = 0;
let unitToCast = null;
let unitCounter = 1;
let regenIntervals = [];
let dotIntervals = [];
let burningIntervals = {};
let forceContinue = false;
let talentListeners = [];
let skillIntervals = [];
let isDragging = false;
let isCombatPaused = false;
let startX, startY, scrollLeft, scrollTop;
let statusPopupInterval = null;
const gearTypes = {
  "Helm": {
    slot: "head",
    oreRequired: 9,
    statBoosts: [
      { stat: "evasion", weight: 1, multi: 1.004 },
      { stat: "critChance", weight: 2, multi: 1.002 },
      { stat: "accuracy", weight: 5, multi: 1.004 },
      { stat: "hpRegen", weight: 2, multi: 1.006},
      { stat: "maxSp", weight: 2, multi: 1.009 },
      { stat: "damageTaken", weight: 1, multi: 0.999 }
    ]
  },
  "Circlet": {
    slot: "head",
    oreRequired: 4,
    statBoosts: [
      { stat: "critChance", weight: 1, multi: 1.01 },
      { stat: "mpEfficiency", weight: 5, multi: 0.99 },
      { stat: "maxSp", weight: 3, multi: 1.006 },
      { stat: "cooldownReduction", weight: 2, multi: 0.99 },
      { stat: "critMulti", weight: 3, multi: 1.01 },
      { stat: "lifestealMulti", weight: 1, multi: 1.007 }
    ]
  },
  "Spaulders": {
    slot: "torso",
    oreRequired: 8,
    statBoosts: [
      { stat: "cooldownReduction", weight: 1, multi: 0.991 },
      { stat: "critChance", weight: 2, multi: 1.004 },
      { stat: "damageTaken", weight: 3, multi: 0.99 },
      { stat: "maxHp", weight: 2, multi: 1.01 },
      { stat: "hpRegen", weight: 2, multi: 1.01
      },
      { stat: "evasion", weight: 5, multi: 1.004 }
    ]
  },
  "Cuirass": {
    slot: "torso",
    oreRequired: 15,
    statBoosts: [
      { stat: "maxMp", weight: 2, multi: 1.1 },
      { stat: "maxSp", weight: 5, multi: 1.01 },
      { stat: "damageTaken", weight: 2, multi: 0.993 },
      { stat: "lifestealMulti", weight: 3, multi: 1.008 },
      { stat: "cooldownReduction", weight: 1, multi: 0.998 },
      { stat: "hpRegen", weight: 2, multi: 1.005}
    ]
  },
  "Bracers": {
    slot: "hands",
    oreRequired: 5,
    statBoosts: [
      { stat: "critMulti", weight: 2, multi: 1.003 },
      { stat: "mpEfficiency", weight: 2, multi: 0.994 },
      { stat: "lifestealChance", weight: 1, multi: 1.006 },
      { stat: "evasion", weight: 3, multi: 1.081 },
      { stat: "maxMp", weight: 4, multi: 1.009 },
      { stat: "xpGain", weight: 2, multi: 1.006 }
    ]
  },
  "Gloves": {
    slot: "hands",
    oreRequired: 6,
    statBoosts: [
      { stat: "lifestealChance", weight: 2, multi: 1.01 },
      { stat: "critMulti", weight: 2, multi: 1.008 },
      { stat: "maxSp", weight: 3, multi: 1.005},
      { stat: "cooldownReduction", weight: 3, multi: 0.991 },
      { stat: "evasion", weight: 1, multi: 1.013 },
      { stat: "damageTaken", weight: 2, multi: 0.998 }
    ]
  },
  "Gauntlets": {
    slot: "hands",
    oreRequired: 5,
    statBoosts: [
      { stat: "maxSp", weight: 16, multi: 0.993 },
      { stat: "spRegen", weight: 16, multi: 1.16},
      { stat: "lifestealChance", weight: 2, multi: 1.02 },
      { stat: "cooldownReduction", weight: 1, multi: 0.99 },
      { stat: "hpRegen", weight: 7, multi: 1.02},
      { stat: "xpGain", weight: 2, multi: 1.02 }
    ]
  },
  "Belt": {
    slot: "waist",
    oreRequired: 7,
    statBoosts: [
      { stat: "damageTaken", weight: 2, multi: 0.996 },
      { stat: "hpRegen", weight: 9, multi: 1.02},
      { stat: "maxHp", weight: 12, multi: 1.01 },
      { stat: "evasion", weight: 7, multi: 1.02 },
      { stat: "mpRegen", weight: 7, multi: 1.03 },
      { stat: "cooldownReduction", weight: 1, multi: 0.993 }
    ]
  },
  "Girdle": {
    slot: "waist",
    oreRequired: 9,
    statBoosts: [
      { stat: "lifestealMulti", weight: 6, multi: 1.008 },
      { stat: "hpRegen", weight: 13, multi: 1.004},
      { stat: "critMulti", weight: 12, multi: 1.009 },
      { stat: "evasion", weight: 8, multi: 1.002 },
      { stat: "maxSp", weight: 17, multi: 1.01 },
      { stat: "mpEfficiency", weight: 7, multi: 0.995 }
    ]
  },
  "Greaves": {
    slot: "legs",
    oreRequired: 13,
    statBoosts: [
      { stat: "maxSp", weight: 12, multi: 1.007 },
      { stat: "evasion", weight: 7, multi: 1.006 },
      { stat: "damageTaken", weight: 2, multi: 0.996 },
      { stat: "spRegen", weight: 12, multi: 1.009},
      { stat: "cooldownReduction", weight: 1, multi: 0.998 },
      { stat: "lifestealMulti", weight: 6, multi: 1.02 }
    ]
  },
  "Pants": {
    slot: "legs",
    oreRequired: 11,
    statBoosts: [
      { stat: "maxHp", weight: 12, multi: 1.01 },
      { stat: "evasion", weight: 9, multi: 1.006 },
      { stat: "damageTaken", weight: 2, multi: 0.993 },
      { stat: "hpRegen", weight: 11, multi: 1.004},
      { stat: "critChance", weight: 12, multi: 1.004 },
      { stat: "maxSp", weight: 6, multi: 1.003 }
    ]
  },
  "Boots": {
    slot: "feet",
    oreRequired: 6,
    statBoosts: [
      { stat: "critChance", weight: 1, multi: 1.006 },
      { stat: "evasion", weight: 2, multi: 1.091 },
      { stat: "cooldownReduction", weight: 2, multi: 0.993 },
      { stat: "spRegen", weight: 2, multi: 1.01},
      { stat: "lifestealChance", weight: 3, multi: 1.007 },
      { stat: "damageTaken", weight: 3, multi: 0.997 }
    ]
  },
  "Ring": {
    slot: "hands",
    oreRequired: 1,
    statBoosts: [
      { stat: "xpGain", weight: 2, multi: 1.08},
      { stat: "mpRegen", weight: 2, multi: 1.08},
      { stat: "lifestealChance", weight: 2, multi: 1.1 },
      { stat: "cooldownReduction", weight: 2, multi: 0.951 },
      { stat: "lifestealMulti", weight: 2, multi: 1.08 },
      { stat: "evasion", weight: 2, multi: 1.05 }
    ]
  },
  "Towershield": {
    slot: "weapon",
    oreRequired: 15,
    baseStatBoosts: [{
      stat: "damageTaken", multi: 0.996
    },
    {
      stat: "cooldownReduction", multi: 1.003
    }],
    statBoosts: [
      { stat: "damageTaken", weight: 2, multi: 0.996},
      { stat: "damageAmp", weight: 3, multi: 1.003 },
      { stat: "maxHp", weight: 2, multi: 1.012 },
      { stat: "hpRegen", weight: 3, multi: 1.008 },
      { stat: "critMulti", weight: 1, multi: 1.005 },
      { stat: "cooldownReduction", weight: 2, multi: 0.998 }
    ]
  },
  "Shield": {
    slot: "weapon",
    oreRequired: 10,
    baseStatBoosts: [{
      stat: "damageTaken", multi: 0.998
    },
    {
      stat: "cooldownReduction", multi: 1.001
    }],
    statBoosts: [
      { stat: "damageTaken", weight: 2, multi: 0.996 },
      { stat: "damageAmp", weight: 3, multi: 1.005 },
      { stat: "maxHp", weight: 2, multi: 1.005 },
      { stat: "hpRegen", weight: 3, multi: 1.008 },
      { stat: "critMulti", weight: 1, multi: 1.005 },
      { stat: "cooldownReduction", weight: 2, multi: 0.996 }
    ]
  },
  "Claws": {
    slot: "weapon",
    oreRequired: 11,
    baseStatBoosts: [{
      stat: "damageAmp", multi: 1.01
    },
    {
      stat: "cooldownReduction", multi: 0.999
    }],
    statBoosts: [
      { stat: "maxMp", weight: 2, multi: 1.007 },
      { stat: "mpEfficiency", weight: 3, multi: 0.995 },
      { stat: "mpRegen", weight: 2, multi: 1.003},
      { stat: "lifestealMulti", weight: 1, multi: 1.007 },
      { stat: "lifestealChance", weight: 2, multi: 1.011 },
      { stat: "critChance", weight: 1, multi: 1.006 }
    ]
  },
  "Dagger": {
    slot: "weapon",
    oreRequired: 5,
    baseStatBoosts: [{
      stat: "damageAmp", multi: 1.01
    },
    {
      stat: "critChance", multi: 1.003
    }],
    statBoosts: [
      { stat: "critChance", weight: 2, multi: 1.008 },
      { stat: "cooldownReduction", weight: 1, multi: 0.997 },
      { stat: "critMulti", weight: 2, multi: 1.005 },
      { stat: "lifestealChance", weight: 3, multi: 1.005 },
      { stat: "evasion", weight: 2, multi: 1.011 },
      { stat: "xpGain", weight: 1, multi: 1.002 }
    ]
  },
  "Sword": {
    slot: "weapon",
    oreRequired: 11,
    baseStatBoosts: [{
      stat: "damageAmp", multi: 1.02
    }],
    statBoosts: [
      { stat: "spRegen", weight: 2, multi: 1.006},
      { stat: "critChance", weight: 3, multi: 1.003 },
      { stat: "lifestealMulti", weight: 2, multi: 1.002 },
      { stat: "cooldownReduction", weight: 2, multi: 0.992 },
      { stat: "evasion", weight: 2, multi: 1.007 },
      { stat: "damageTaken", weight: 2, multi: 0.9988 }
    ]
  },
  "Axe": {
    slot: "weapon",
    baseStatBoosts: [{
      stat: "damageAmp", multi: 1.02
    },
    {
      stat: "critMulti", multi: 1.007
    }],
    oreRequired: 13,
    statBoosts: [
      { stat: "lifestealMulti", weight: 3, multi: 1.009},
      { stat: "critMulti", weight: 2, multi: 1.009 },
      { stat: "hpRegen", weight: 2, multi: 1.004},
      { stat: "damageTaken", weight: 1, multi: 0.998 },
      { stat: "cooldownReduction", weight: 2, multi: 0.994 },
      { stat: "xpGain", weight: 3, multi: 1.01 }
    ]
  },
  "Hammer": {
    slot: "weapon",
    baseStatBoosts: [{
      stat: "damageAmp", multi: 1.02
    },
    {
      stat: "maxHp", multi: 1.001
    }],
    oreRequired: 12,
    statBoosts: [
      { stat: "maxSp", weight: 3, multi: 1.003 },
      { stat: "damageTaken", weight: 3, multi: 0.997 },
      { stat: "critMulti", weight: 2, multi: 1.007 },
      { stat: "evasion", weight: 2, multi: 1.003 },
      { stat: "hpRegen", weight: 2, multi: 1.02 },
      { stat: "lifestealMulti", weight: 1, multi: 1.008 }
    ]
  },
  "Bow": {
    slot: "weapon",
    baseStatBoosts: [{
      stat: "damageAmp", multi: 1.01
    },
    {
      stat: "evasion", multi: 1.01
    }],
    oreRequired: 14,
    statBoosts: [
      { stat: "critMulti", weight: 2, multi: 1.013 },
      { stat: "spEfficiency", weight: 2, multi: 0.993 },
      { stat: "critChance", weight: 3, multi: 1.006 },
      { stat: "cooldownReduction", weight: 2, multi: 0.995 },
      { stat: "xpGain", weight: 1, multi: 1.003 },
      { stat: "evasion", weight: 2, multi: 1.01 }
    ]
  }
};
const gearWeights = Object.fromEntries(Object.entries(gearTypes).map(([k, v]) => [k, v.oreRequired]));
const oresData = {
  Runite: {
    tier: 0,
    resistances: { magic: 0.99995 }
  },
  Iron: {
    tier: 0,
    resistances: { physical: 0.99995 }
  },
  Ferrite: {
    tier: 1,
    bonus: { stat: "damageTaken", multi: 0.9993 },
    resistances: {
      physical: 0.9995,
      blunt: 0.9998,
      force: 0.9990,
      shock: 0.9991
    }
  },
  Brawnite: {
    tier: 2,
    bonus: { stat: "critChance", multi: 1.007 },
    resistances: {
      physical: 0.998,
      blunt: 0.993,
      force: 0.991,
      poison: 0.992,
      shock: 0.994
    }
  },
  Mystarium: {
    tier: 1,
    bonus: { stat: "mpRegen", multi: 1.006 },
    resistances: {
      magic: 0.9997,
      arcane: 0.9991,
      psychic: 0.9992
    }
  },
  Spellite: {
    tier: 2,
    bonus: { stat: "cooldownReduction", multi: 0.9986 },
    resistances: {
      magic: 0.996,
      arcane: 0.995,
      spirit: 0.998,
      ethereal: 0.991
    }
  },
  Razorite: {
    tier: 1,
    bonus: { stat: "spEfficiency", multi: 0.9994 },
    resistances: {
      slashing: 0.995,
      physical: 0.9990,
      heat: 0.9991,
      sonic: 0.9992
    }
  },
  Cleavium: {
    tier: 2,
    bonus: { stat: "critMulti", multi: 1.001 },
    resistances: {
      slashing: 0.991,
      physical: 0.992,
      heat: 0.994,
      poison: 0.993
    }
  },
  Needlite: {
    tier: 1,
    bonus: { stat: "evasion", multi: 1.007 },
    resistances: {
      piercing: 0.9993,
      shock: 0.9990,
      force: 0.9992
    }
  },
  Puncturine: {
    tier: 2,
    bonus: { stat: "lifestealChance", multi: 1.006 },
    resistances: {
      piercing: 0.991,
      shock: 0.992,
      force: 0.993,
      gravity: 0.994
    }
  },Cragsteel: {
    tier: 1,
    bonus: { stat: "maxHp", multi: 1.009 },
    resistances: {
      blunt: 0.9990,
      gravity: 0.9991,
      physical: 0.9992
    }
  },
  Smashite: {
    tier: 2,
    bonus: { stat: "lifestealMulti", multi: 1.008 },
    resistances: {
      blunt: 0.991,
      gravity: 0.992,
      void: 0.993,
      poison: 0.994
    }
  },
  Impactor: {
    tier: 1,
    bonus: { stat: "hpRegen", multi: 1.006 },
    resistances: {
      force: 0.9992,
      blunt: 0.9991,
      physical: 0.9990,
      shock: 0.9993
    }
  },
  Pressanite: {
    tier: 2,
    bonus: { stat: "maxMp", multi: 1.001 },
    resistances: {
      force: 0.991,
      blunt: 0.992,
      physical: 0.993,
      sonic: 0.994
    }
  },
  Vilecore: {
    tier: 1,
    bonus: { stat: "mpEfficiency", multi: 0.9993 },
    resistances: {
      corrupt: 0.9990,
      poison: 0.9991,
      void: 0.9992
    }
  },
  Malformite: {
    tier: 2,
    bonus: { stat: "cooldownReduction", multi: 0.998 },
    resistances: {
      corrupt: 0.991,
      poison: 0.992,
      void: 0.993,
      blood: 0.994,
      psychic: 0.995
    }
  },
  Lumenite: {
    tier: 1,
    bonus: { stat: "maxSp", multi: 1.007 },
    resistances: {
      holy: 0.9991,
      radiant: 0.9992,
      spirit: 0.9993,
      arcane: 0.9990
    }
  },
  Haloite: {
    tier: 2,
    bonus: { stat: "spRegen", multi: 1.008 },
    resistances: {
      holy: 0.991,
      radiant: 0.992,
      spirit: 0.993,
      blight: 0.994
    }
  },
  Arkanite: {
    tier: 1,
    bonus: { stat: "xpGain", multi: 1.009 },
    resistances: {
      arcane: 0.9991,
      magic: 0.9992,
      psychic: 0.9993
    }
  },
  Sigilstone: {
    tier: 2,
    bonus: { stat: "critChance", multi: 1.006 },
    resistances: {
      arcane: 0.992,
      magic: 0.993,
      psychic: 0.994,
      ethereal: 0.995
    }
  },
  Prismite: {
    tier: 1,
    bonus: { stat: "mpRegen", multi: 1.009 },
    resistances: {
      elemental: 0.9998,
      heat: 0.9992,
      cold: 0.9993,
      shock: 0.9991
    }
  },
  Essentium: {
    tier: 2,
    bonus: { stat: "lifestealMulti", multi: 1.007 },
    resistances: {
      elemental: 0.992,
      heat: 0.993,
      cold: 0.994,
      shock: 0.995,
      water: 0.996
    }
  },
  Sanguinite: {
    tier: 1,
    bonus: { stat: "lifestealChance", multi: 1.009 },
    resistances: {
      blood: 0.9991,
      corrupt: 0.9993,
      water: 0.9992
    }
  },
  Hemalite: {
    tier: 2,
    bonus: { stat: "critMulti", multi: 1.009 },
    resistances: {
      blood: 0.992,
      corrupt: 0.993,
      poison: 0.994,
      void: 0.995
    }
  },
  Nullite: {
    tier: 1,
    bonus: { stat: "maxHp", multi: 1.001 },
    resistances: {
      void: 0.9993,
      ethereal: 0.9991,
      corrupt: 0.9992
    }
  },
  Abyssium: {
    tier: 2,
    bonus: { stat: "damageTaken", multi: 0.99997 },
    resistances: {
      void: 0.996,
      ethereal: 0.995,
      corrupt: 0.994,
      gravity: 0.993
    }
  },
  Rotstone: {
    tier: 1,
    bonus: { stat: "maxSp", multi: 1.008 },
    resistances: {
      blight: 0.9991,
      poison: 0.9992,
      blood: 0.9993
    }
  },
  Festerite: {
    tier: 2,
    bonus: { stat: "spEfficiency", multi: 0.992 },
    resistances: {
      blight: 0.993,
      poison: 0.994,
      blood: 0.995,
      nature: 0.996
    }
  },
  Ectrium: {
    tier: 1,
    bonus: { stat: "spRegen", multi: 1.006 },
    resistances: {
      spirit: 0.9991,
      ethereal: 0.9992,
      holy: 0.9993
    }
  },
  Soulvein: {
    tier: 2,
    bonus: { stat: "mpEfficiency", multi: 0.994 },
    resistances: {
      spirit: 0.996,
      ethereal: 0.995,
      holy: 0.994,
      radiant: 0.993
    }
  },
  Solarium: {
    tier: 1,
    bonus: { stat: "maxMp", multi: 1.009 },
    resistances: {
      radiant: 0.9991,
      light: 0.9992,
      spirit: 0.9993,
      arcane: 0.9990
    }
  },
  Gleamite: {
    tier: 2,
    bonus: { stat: "xpGain", multi: 1.004 },
    resistances: {
      radiant: 0.993,
      holy: 0.994,
      arcane: 0.995,
      shock: 0.996
    }
  },
  Phasemite: {
    tier: 1,
    bonus: { stat: "evasion", multi: 1.008 },
    resistances: {
      ethereal: 0.9994,
      psychic: 0.9991,
      magic: 0.9992
    }
  },
  Driftglass: {
    tier: 2,
    bonus: { stat: "lifestealMulti", multi: 1.009 },
    resistances: {
      ethereal: 0.992,
      psychic: 0.993,
      magic: 0.994,
      sonic: 0.995
    }
  },
  Echoite: {
    tier: 1,
    bonus: { stat: "hpRegen", multi: 1.007 },
    resistances: {
      sonic: 0.9991,
      shock: 0.9992,
      force: 0.9993
    }
  },
  Resonium: {
    tier: 2,
    bonus: { stat: "cooldownReduction", multi: 0.997 },
    resistances: {
      sonic: 0.993,
      shock: 0.992,
      force: 0.991,
      gravity: 0.994
    }
  },
  Massium: {
    tier: 1,
    bonus: { stat: "maxHp", multi: 1.007 },
    resistances: {
      gravity: 0.9991,
      blunt: 0.9992,
      force: 0.9993
    }
  },
  Gravitite: {
    tier: 2,
    bonus: { stat: "critMulti", multi: 1.008 },
    resistances: {
      gravity: 0.992,
      blunt: 0.993,
      force: 0.994,
      cold: 0.995
    }
  },
  Mindore: {
    tier: 1,
    bonus: { stat: "mpRegen", multi: 1.01 },
    resistances: {
      psychic: 0.9991,
      arcane: 0.9992,
      spirit: 0.9993
    }
  },
  Noctite: {
    tier: 2,
    bonus: { stat: "damageTaken", multi: 0.99 },
    resistances: {
      psychic: 0.991,
      arcane: 0.992,
      spirit: 0.993,
      void: 0.994
    }
  },
  Verdite: {
    tier: 1,
    bonus: { stat: "hpRegen", multi: 1.008 },
    resistances: {
      nature: 0.9991,
      poison: 0.9992,
      water: 0.9993
    }
  },
  Floracite: {
    tier: 2,
    bonus: { stat: "lifestealChance", multi: 1.007 },
    resistances: {
      nature: 0.993,
      poison: 0.994,
      water: 0.995,
      blight: 0.996
    }
  },
  Aqualith: {
    tier: 1,
    bonus: { stat: "maxSp", multi: 1.009 },
    resistances: {
      water: 0.9991,
      cold: 0.9992,
      nature: 0.9993
    }
  },
  Drownite: {
    tier: 2,
    bonus: { stat: "spEfficiency", multi: 0.991 },
    resistances: {
      water: 0.993,
      cold: 0.994,
      nature: 0.995,
      poison: 0.996
    }
  },
  Pyronite: {
    tier: 1,
    bonus: { stat: "maxMp", multi: 1.007 },
    resistances: {
      heat: 0.9991,
      elemental: 0.9992,
      shock: 0.9993
    }
  },
  Embercore: {
    tier: 2,
    bonus: { stat: "mpEfficiency", multi: 0.992 },
    resistances: {
      heat: 0.993,
      elemental: 0.994,
      shock: 0.995,
      cold: 0.996
    }
  },
  Voltite: {
    tier: 1,
    bonus: { stat: "critChance", multi: 1.008 },
    resistances: {
      shock: 0.9991,
      sonic: 0.9992,
      force: 0.9993
    }
  },
  Sparksteel: {
    tier: 2,
    bonus: { stat: "evasion", multi: 1.01 },
    resistances: {
      shock: 0.993,
      sonic: 0.994,
      force: 0.995,
      water: 0.996
    }
  },
  Cryostone: {
    tier: 1,
    bonus: { stat: "cooldownReduction", multi: 0.995 },
    resistances: {
      cold: 0.9991,
      water: 0.9992,
      heat: 0.9993
    }
  },
  Frostrine: {
    tier: 2,
    bonus: { stat: "xpGain", multi: 1.007 },
    resistances: {
      cold: 0.993,
      water: 0.994,
      heat: 0.995,
      poison: 0.996
    }
  },
  Venomite: {
    tier: 1,
    bonus: { stat: "lifestealMulti", multi: 1.01 },
    resistances: {
      poison: 0.9991,
      corrupt: 0.9992,
      blight: 0.9993
    }
  },
  Toxinite: {
    tier: 2,
    bonus: { stat: "damageTaken", multi: 0.992 },
    resistances: {
      poison: 0.993,
      corrupt: 0.994,
      blight: 0.995,
      blood: 0.996
    }
  }
};
const itemQualities = {
  rusty: "#AAAAAA",
  common: "#FFFFFF",       // Gray
  uncommon: "#1EFF00",     // Green
  rare: "#0070FF",         // Blue
  epic: "#A335EE",         // Purple
  legendary: "#FF8000",    // Orange
  mythic: "#E6CC80",       // Gold
  artifact: "#B30000",     // Dark Red
  divine: "#00FFFF",       // Cyan
  cursed: "#5500AA"        // Dark Purple
};
const statGroups = [{
        title: "Health (HP)",
        class: "hp",
        stats: [
            { label: "Current", key: "hp" },
            { label: "Max", key: "maxHp" },
            { label: "Regen", key: "hpRegen" }
        ]
    }, {
        title: "Stamina (SP)",
        class: "sp",
        stats: [
            { label: "Current", key: "sp" },
            { label: "Max", key: "maxSp" },
            { label: "Regen", key: "spRegen" },
            { label: "Efficiency", key: "spEfficiency" }
        ]
    }, {
        title: "Mana (MP)",
        class: "mp",
        stats: [
            { label: "Current", key: "mp" },
            { label: "Max", key: "maxMp" },
            { label: "Regen", key: "mpRegen" },
            { label: "Efficiency", key: "mpEfficiency" }
        ]
    }, {
        title: "Combat",
        class: "combat",
        stats: [
            { label: "Cooldown Reduction", key: "cooldownReduction" },
            { label: "Damage Taken", key: "damageTaken" },
            { label: "Accuracy", key: "accuracy" },
            { label: "Evasion", key: "evasion" }

        ]
    }, {
        title: "Critical",
        class: "crit",
        stats: [
            { label: "Crit Chance", key: "critChance" },
            { label: "Crit Multiplier", key: "critMulti" }
        ]
    }, {
        title: "Lifesteal",
        class: "lifesteal",
        stats: [
            { label: "Lifesteal %", key: "lifestealMulti" },
            { label: "Lifesteal Chance", key: "lifestealChance" }
        ]
    }, {
        title: "Misc",
        class: "misc",
        stats: [
            { label: "XP Gain Multi", key: "xpGain" }
        ]
    }];
let combatLogFilters = {
  ally: true,
  enemy: true,
  flavorText: false,
  evasion: false,
  damage: true,
  heal: true,
  summon: true,
  revive: true,
  buff: false,
  interrupt: true,
  debuff: false,
  condition: false,
  siphon: true,
  cleanse: false
}
let combatLogFilterColors = {
  flavorText: {
    ally: "#cc1",
    enemy: "#c62"
  },
  evasion: {
    ally: "#aff",
    enemy: "#77f"
  },
  damage: {
    ally: "#2f2",
    enemy: "#f22"
  },
  heal: {
    ally: "#dd0",
    enemy: "#c22"
  },
  summon: {
    ally: "#d2d",
    enemy: "#828"
  },
  revive: {
    ally: "#dd0",
    enemy: "#c22"
  },
  buff: {
    ally: "#2f2",
    enemy: "#f22"
  },
  siphon: {
    ally: "#aa1",
    enemy: "#a31"
  },
  debuff: {
    ally: "#2f2",
    enemy: "#f22"
  },
  condition: {
    ally: "#ff9",
    enemy: "#cc6"
  },
  interrupt: {
    ally: "#f73",
    enemy: "#a62"
  }
}
const damageTypeBreakdown = {
  // Elemental children
  heat: { elemental: 1 },
  water: { elemental: 1 },
  shock: { elemental: 1 },
  cold: { elemental: 1 },
  nature: { elemental: 1 },
  poison: {elemental: 0.8, nature: 0.2},

  // Magic root branches
  arcane: { magic: 1 },
  holy: { magic: 1 },
  corrupt: { magic: 1 },
  elemental: { magic: 1},

  // Mixed / Composite types
  blight: {corrupt: 0.8, magic: 0.2},
  radiant: { holy: 0.8, heat: 0.2 },
  blood: { corrupt: 0.5, nature: 0.5 },
  force: { physical: 0.8, magic: 0.2 },
  void: { corrupt: 0.2, arcane: 0.8 },
  spirit: { corrupt: 0.5, holy: 0.5 },
  sonic: { force: 0.5, magic: 0.5 },
  gravity: { force: 0.9, magic: 0.1 },
  psychic: { arcane: 0.8, nature: 0.2 },
  ethereal: { holy: 0.5, magic: 0.5 },

  // Physical children
  slashing: { physical: 1 },
  piercing: { physical: 1 },
  blunt: { physical: 1 }
};
let settings = {
  confirmLeaveCombat: true,
  confirmTrashItem: true,
  friendlyFire: false,
  autoTimer: 5,
  autoTarget: true,
  showDebug: false,
  hardReset: {
    lastClick: 0,
    clickCount: 0,
    timeout: 1000
  }
}

const conditionsData = {
  Stunned: {
  description: (caster) => {
    return `Target cannot make actions while stunned.`;
  },
  init: () => {
    statusStartEvent.on((event) => {
      const target = event.target;
      const caster = event.caster;

      const isValid = (
        player.inCombat &&
        findUnitById(target.id) &&
        target.conditions &&
        target.conditions["Stunned"]
      );

      // Only apply logic if this is the *first* time stunned
      if (isValid && target.conditions["Stunned"].stacks > 0) {
        // Initialize stunTimeouts array if not present
        if (!target.stunTimeouts) target.stunTimeouts = [];

        updateCombatLog(`${target.name} has become stunned!`, caster, ["condition", target.isAlly ? "ally" : "enemy"]);
         console.log(event.effect.duration.base)
        const timeout = setTimeout(() => {
          // Re-check combat state and if target is still stunned
          if (
            player.inCombat &&
            findUnitById(target.id) &&
            target.conditions &&
            target.conditions["Stunned"]
          ) {
            delete target.conditions["Stunned"];
            target.stunTimeouts = []
            updateCombatLog(`${target.name} is no longer stunned!`, caster, ["condition", target.isAlly ? "ally" : "enemy"], "#c3c", "#929");
            statusEndEvent.emit({ effect: event.effect, caster, target, skillId: event.skillId });
            updateStatusButton(target);
          }
        }, calculateEffectiveValue(event.effect.duration, event, caster, target, 1));

        target.stunTimeouts.push(timeout);
      }
    });
  }
},
  Burning: {
  description: (caster) => {
    return `Burning deals damage over time for each stack, and then reduces stacks by 1 every tick.`;
  },
  _initialized: false,
  init: () => {
    if (conditionsData.Burning._initialized) return;
    conditionsData.Burning._initialized = true;

    const burningIntervals = {};

    statusStartEvent.on((event) => {
      
      const target = event.target;
      const caster = event.caster;

      if (!player.inCombat) return;

      const unit = findUnitById(target.id);
      if (!unit) return;

      if (!target.conditions || !target.conditions["Burning"] || target.conditions["Burning"].stacks === 0) {
        return;
      }

      if (!target.border) {
        target.border = {
          name: "Burning",
          color: "linear-gradient(#d66,#b66)",
        };
        resetUnitBorder(target.id);
      }

      if (!burningIntervals[target.id]) {
        burningIntervals[target.id] = setInterval(() => {
          if (!player.inCombat) return;

          const unit = findUnitById(target.id);
          if (!unit || !unit.isAlive) return;

          if (!target.conditions) target.conditions = {};
          if (!target.conditions["Burning"]) {
            target.conditions["Burning"] = { stacks: 0 };
          }

          const burning = target.conditions["Burning"];

          if (burning.stacks > 0) {
            const damage = damageUnit(undefined, target, "heat", burning.stacks);
            const reduction = Math.max(1, Math.floor(burning.stacks / 4));
            burning.stacks = Math.max(0, burning.stacks - reduction);

            updateCombatLog(`${target.name} takes ${damage} ${getDamageTypeIcon("heat")} damage from burning alive!`, caster, ["condition", target.isAlly ? "ally" : "enemy"]);
            updateStatusButton(target);
          } else {
            clearInterval(burningIntervals[target.id]);
            delete burningIntervals[target.id];

            delete target.conditions["Burning"];

            if (target.border?.name === "Burning") {
              delete target.border;
              resetUnitBorder(target.id);
            }

            updateStatusButton(target);
          }

        }, 1000);
      }
    });
  }
  },
  Corruption: {
    description: (caster) => {
      return `Once reaching 5 stacks, reset stacks and deal 3 ${getDamageTypeIcon("blight")} damage per stack, plus 1 base damage per point of the casters willpower.<br>Total: ${(caster.attributes.willpower + 15)}`
    },
    init: () => {
      statusStartEvent.on((event) => {
        let target = event.target
        let caster = event.caster
        if (target.conditions && target.conditions["Corruption"] && target.conditions["Corruption"].stacks >= 5) {
          let dmg = target.conditions["Corruption"].stacks*3+caster.attributes.willpower
          let finalDmg = damageUnit(caster, target, "blight", dmg)
          target.conditions["Corruption"].stacks = 0;
          Log(`Corruption takes hold of ${target.name}, dealing ${finalDmg.toFixed(2)} ${getDamageTypeIcon("blight")} damage.`, caster, ["condition", caster.isAlly?"ally":"enemy"])
        }
      });
    }
  }
};
function generateUniqueUnitID() {
  return unitCounter++;
}
let combatUnits = [];
player = {
  name: "Reaper",
  id: 0,
  characterId: 0,
  index: 0,
  level: 1,
  classData: {
  },
  xp: 0,
  maxXp: 30,
  attributePoints: 0,
  skillSlots: 2,
  inventorySlots: 8,
  beatenZones: 0,
  beatenTiers: 0,
  totalResistances: {},
  bonusResistances: [],
  discoveredEnemies: [],
  inCombat: false,
  isAlly: true,
  isPlayer: true,
  isAlive: true,
  attributes: {
    strength: 5,
    dexterity: 5,
    constitution: 5,
    intellect: 5,
    wisdom: 5,
    willpower: 5
  },
  attributesGained: {
    strength: 5,
    dexterity: 5,
    constitution: 5,
    intellect: 5,
    wisdom: 5,
    willpower: 5
  },
  stats: {
    hp: {
      display: "HP",
      value: 70
    },
    maxHp: {
      display: "Max HP",
      base: 45,
      scaling: [{
        target: "caster", stat: "constitution", scale: 4
      },
      {target: "caster", stat: "strength", scale: 1.01, effect: "multi"},
      {target: "caster", stat: "tier", scale: 3}],
      value: 45
    },
    hpRegen: {
      display: "HP Regen",
      base: 0,
      scaling: [{
        target: "caster", stat: "constitution", scale: 0.05
      }],
      value: 0
    },
    sp: {
      display: "SP",
      value: 50
    },
    maxSp: {
      display: "Max SP",
      base: 20,
      scaling: [{
        target: "caster", stat: "constitution", scale: 2
      }],
      value: 20
    },
    spRegen: {
      display: "SP Regen",
      base: 1,
      scaling: [{
        target: "caster", stat: "strength", scale: 0.1
      }],
      value: 1
    },
    spEfficiency: {
      display: "SP Efficiency",
      base: 1,
      scaling: [{
        target: "caster", stat: "dexterity", scale: -0.01
      }],
      value: 1
    },
    mp: {
      display: "MP",
      value: 20
    },
    maxMp: {
      display: "Max MP",
      base: 40,
      scaling: [{
        target: "caster", stat: "intellect", scale: 1.25
      },
        {
          target: "caster", stat: "willpower", scale: 1.25
        }],
      value: 40,
    },
    mpRegen: {
      display: "MP Regen",
      base: 1,
      scaling: [{
        target: "caster", stat: "wisdom", scale: 0.1
      }],
      value: 1
    },
    mpEfficiency: {
      display: "MP Efficiency",
      base: 1,
      scaling: [{
        target: "caster", stat: "wisdom", scale: -0.005
      },
      {
        target: "caster", stat: "willpower", scale: -0.002
      }],
      value: 1
    },
    damageTaken: {
      display: "Damage Taken",
      base: 1,
      value: 1
    },
    critChance: {
      display: "Critical Hit Chance",
      base: 0,
    },
    critMulti: {
      display: "Critical Hit Damage Multiplier",
      base: 2
    },
    evasion: {
      display: "Evasion",
      value: 1,
      base: 1,
      scaling: [{
        "target": "caster",
        "stat": "wisdom",
        "scale": 1
      }]
    },
    accuracy: {
      display: "Accuracy",
      value: 1,
      base: 1,
      scaling: [{
        "target": 'caster',
        "stat": "dexterity",
        "scale": 1
      }]
    },
    lifestealMulti: {
      display: "Lifesteal Damage Percent",
      value: 0
    },
    lifestealChance: {
      display: "Lifesteal Chance",
      value: 0
    },
    cooldownReduction: {
      display: "Cooldown Reduction",
      base: 0.1,
      value: 0.1
    },
    armorPenetration: {
      display: "Armor Penetration",
      value: 1
    },
    magicPenetration: {
      display: "Magic Penetration",
      value: 1
    },
    xpGain: {
      display: "XP Multi",
      value: 20,
      base: 20,
      scaling: [{
        target: "caster", stat: "intellect", scale: 0.003
      },
      {
        target: "caster", stat: "wisdom", scale: 0.003
      }
        ]
    }
  },
  inventory: {
    equipped: {
      head: null,
      torso: null,
      waist: null,
      legs: null,
      hands: null,
      feet: null,
      weapon: null
    },
    storage: []
  },
  skills: {
    equipped: [],
    learned: [
],
    combatData: {
      targets: {},
      lastUsed: {}
    }
  },
  zoneProgress: {
    
  },
  currentZone: {},
  planetsProgress: {},
  conditions: [],
  buffs: [],
  debuffs: [],
  data: {
    kills: {},
    deaths: 0,
    deathsInARow: 0,
    prestigeCount: 0
  }
};
const originalPlayer = JSON.parse(JSON.stringify(player))
const classToPlanet = {
  "Reaper": "Dreadthorn",
  "Mystic": "Ferrania",
  "Pyromancer": "Cinderrift",
  "Chronomancer": "Fractalis",
  "Voidcaller": "Hollowreach",
  "Foresworn": "Halcyon Bastion",
  "Ironveil": "Gravemount"
};
async function getLoreData() {
  menuContent = document.getElementById("menu-content");
  try {
    if (!loreDataCache) {

      const baseURL = loadFromGithub?"https://raw.githubusercontent.com/facemywrath/facemywrath.github.io/main/mythos/":"";

      const [
        loreRes,
        multiplierRes,
        skillsRes,
        unitsRes,
        talentsRes
      ] = await Promise.all([
        fetch(baseURL + "game_lore_data.json"),
        fetch(baseURL + "damageType_multipliers.json"),
        fetch(baseURL + "skills.json"),
        fetch(baseURL + "units.json"),
        fetch(baseURL + "talents.json")
      ]);
      console.log("GAME VERSION: "+gameVersion)
      console.log("fetching loredata");
      loreDataCache = await loreRes.json();
      console.log("fetching skillsdata");
      skillsData = await skillsRes.json();
      console.log("fetching damage type");
      damageTypeMultipliers = normalizeDamageTypeMultipliers(await multiplierRes.json());
      console.log("fetching units data");
      unitsData = await unitsRes.json();
      console.log("fetching talents data");
      talentsData = await talentsRes.json();

      const allTypes = Object.keys(damageTypeMultipliers);
      Object.keys(skillsData).forEach(sk => {
        skillsData[sk].levelUpEffects = findSkillLevelScalingPaths(skillsData[sk]);
      });

      function formatDamageTypesInText(text) {
        for (const type of allTypes) {
          const regex = new RegExp(`\\b(${type})\\b`, 'gi');
          if (regex.test(text)) {
            text = text.replace(regex, match => `${match} ${getDamageTypeIcon(type)}`);
          }
        }
        return text;
      }

      for (const race in loreDataCache.races) {
        loreDataCache.races[race].bonuses = loreDataCache.races[race].bonuses.map(line =>
          formatDamageTypesInText(line)
        );
      }

      for (const cls in loreDataCache.classes) {
        loreDataCache.classes[cls].bonuses = loreDataCache.classes[cls].bonuses.map(line =>
          formatDamageTypesInText(line)
        );
      }
    }

    Object.keys(conditionsData).forEach(key => conditionsData[key].init());
    return loreDataCache;

  } catch (e) {
    console.error(e.stack, e)
    menuContent.textContent = e.stack;
  }
}
function updateMenuButton(btn, string) {
  const icon = getComputedStyle(btn).getPropertyValue('--icon').trim();
  btn.style.backgroundImage = `${string}, ${icon}`
}
function normalizeDamageTypeMultipliers(data) {
  const normalized = {};
  for (const type in data) {
    const lowerType = type.toLowerCase();
    normalized[lowerType] = {};
    for (const target in data[type]) {
      normalized[lowerType][target.toLowerCase()] = data[type][target];
    }
  }
  return normalized;
}
document.addEventListener("DOMContentLoaded", async () => {
  try {
    await getLoreData();
    document.getElementById("loading-screen").classList.add("hidden");
    initializeMenuButtons();
    // const saved = localStorage.getItem("playerCharacter");
    // player = saved ? JSON.parse(saved) : null;

    renderCharacterMenu();
  } catch (e) {
    console.error("Failed to load game data:", e);
    document.getElementById("loading-screen").innerText = "Failed to load. Check console for details.";
  }
});
function setSectionVisibility(id, vis) {
  const el = document.getElementById(id);
  el.style.display = vis == true ? 'block': 'none';
}

function toggleSection(id) {
  const el = document.getElementById(id);
  el.style.display = el.style.display === 'none' ? 'block': 'none';
}
function recalculateStat(unit, statName) {
  const attr = unit.attributes;
  const stat = unit.stats[statName];
  if (statName == "hp" || statName == "sp" || statName == "mp") {
    return;
  }
  if (!stat) {
    console.warn(`Stat "${statName}" not found on unit.`);
    return;
  }
  if (isNaN(stat.value)) {
    console.error("Stat set to 0 from NaN", statName, stat);
    stat.value = 0;
  }

  let base = calculateEffectiveValue(stat, unit.stats, unit);
  if (isNaN(base)) {
    console.error("base is NaN", stat);
  }
  if(unit.id == 0 && unit.skills.learned){
const talentEffects = [].concat(...unit.skills.learned
  .filter(s => s.type === "talent" && s.active)
  .flatMap(t => 
    (talentsData[t.id]?.effects || []).map(effect => ({
      talentId: t.id,
      talentData: effect
    }))
  )
  .filter(e => e.talentData?.type === "statBonus" && e.talentData.stat === statName));
   talentEffects.forEach(e => {
     let eff = calculateEffectiveValue(e.talentData, e, unit, undefined, unit.skills.learned.find(s => s.id == e.talentId).level)
     console.log(e, eff)
     if(e.talentData.effect && e.talentData.effect == "multi"){
       console.log("Multiplying "+statName+" by " + eff)
       base *= eff;
     }else{
       console.log("Adding " + eff + " to " +  statName)
       base += eff
     }
   })
  
  }
  
  let gearMulti = 1;
  if(unit == player){
    gearMulti = Object.values(player.inventory.equipped)
    .filter(item => item && Array.isArray(item.totalBonuses))
    .flatMap(item => item.totalBonuses)
    .filter(bonus => bonus.stat === statName)
    .reduce((total, bonus) => total * bonus.multi, 1);
  }
  let buffMulti = 1;
  let debuffMulti = 1;
  

  // Handle stat buffs
  if (unit.buffs && unit.buffs.length > 0) {
    unit.buffs.forEach(buff => {
      if (buff.statType === "stat" && buff.stat.toLowerCase() === statName.toLowerCase()) {
         
          if (buff.effect === "add") {
            base += buff.value;
          } else if (buff.effect === "multi") {
            buffMulti *= buff.value;
          }
        
      }
    });
  }

  // Handle stat debuffs
  if (unit.debuffs && unit.debuffs.length > 0) {
    unit.debuffs.forEach(debuff => {
      if (debuff.statType === "stat" && debuff.stat.toLowerCase() === statName.toLowerCase()) {
         
          if (debuff.effect === "add") {
            base += debuff.value;
          } else if (debuff.effect === "multi") {
            debuffMulti *= debuff.value;
          }
        
      }
    });
  }

  // Remove expired buffs and debuffs
  

  let oldValue = stat.value;
  stat.value = gearMulti * debuffMulti * buffMulti * base;

  const hpStats = ["hp", "maxHp"];
  const spStats = ["sp", "maxSp"];
  const mpStats = ["mp", "maxMp"];

  recalculateStatEvent.emit({unit: unit, statName: statName, oldValue: oldValue, newValue: stat.value});
  updateStatDisplay(unit, statName)
  if(!player.inCombat){
    return;
  }
  if (hpStats.includes(statName)) {
  updateCombatBar(unit, "hp");
    return;
  }
  if (spStats.includes(statName)) {
    updateCombatBar(unit, "sp");
    return;
  }
  if (mpStats.includes(statName)) {
    updateCombatBar(unit, "mp");
  }
}
function recalculateDerivedStats(unit) {
  const attr = unit.attributes;
  const stats = unit.stats;

  Object.keys(stats).forEach(stat => {
    recalculateStat(unit, stat)
  })
}
function getDamageMultiplier(fromType, toType) {
  if (!damageTypeMultipliers) return 1.0;
  return damageTypeMultipliers[fromType.toLowerCase()]?.[toType.toLowerCase()] ?? 1.0;
}
function getEffectiveMultipliers(sourceType) {
  sourceType = sourceType.toLowerCase();
  const result = [];
  const row = damageTypeMultipliers[sourceType];
  if (row) {
    for (const target in row) {
      if (row[target] !== 1.0) {
        result.push({
          target, value: row[target]
        });
      }
    }
  }
  return result;
}
function getEffectiveResistances(targetType) {
    targetType = targetType.toLowerCase();
    const result = {};
    for (const source in damageTypeMultipliers) {
        const row = damageTypeMultipliers[source];
        if (row[targetType] !== undefined && row[targetType] !== 1.0) {
            result[source] = row[targetType];
        }
    }
    return result;
}
// Character creation handler
function handleCharacterCreation() {

  document.getElementById("menu-content").classList.remove("hidden")
  const name = document.getElementById("char-name").value.trim();
  const race = document.getElementById("char-race").value;
  const chosenClass = document.getElementById("char-class").value

  if (!name) {
    alert("Please enter a name.");
    return;
  }
  if (race == "") {
    alert("Please select a Race.");
    return;
  }
  if (chosenClass == "") {
    alert("Please select a Class.");
    return;
  }
  Object.assign(player, {
    name,
    race,
    class: chosenClass,
    damageType: loreDataCache.races[race].damageType
  });
  
  
  unlockClass(chosenClass)
  
  


  const startingPlanet = classToPlanet[chosenClass];
  player.planet = startingPlanet;
  player.progressingPlanet = startingPlanet
  player.planetsProgress[player.planet] = {
    zonesCompleted: 0,
    completed: false,
    timesCompleted: 0
  }
  
  const loreEntry = loreDataCache.planets[startingPlanet].description;
  const zoneLogs = Object.entries(loreDataCache.zones)
  .filter(([zone]) => loreEntry && zone.includes(startingPlanet.split(" ")[0]))
  .map(([zone, desc]) => ">" + zone + ": " + desc);
  showMenu("journey");
  let damageTypes = "none"
  if (loreDataCache.planets[startingPlanet].damageTypes) {
    damageTypes = loreDataCache.planets[startingPlanet].damageTypes
    .map(type => getDamageTypeIcon(type))
    .join(", ");
  }
  document.getElementById("menu-buttons").classList.remove("hidden")
  document.getElementById("top-bar").style.display = "flex"
  document.getElementById("planet-name").textContent = startingPlanet
  document.getElementById("zone-name").style.display = "none"
  document.getElementById("encounter-bar").classList.add("hidden")
  console.log("You awaken on the planet of " + startingPlanet + ".", loreEntry, ...zoneLogs, "Select the Combat menu to begin your journey.")
  logMessage(["You awaken on the planet of " + startingPlanet + ".", loreEntry, ...zoneLogs, `Enemies here deal ${damageTypes} damage`, "Select the Journey menu to begin your adventure."]);


  localStorage.setItem("playerCharacter", JSON.stringify(player));

  // Show top menu bar again
  document.getElementById("menu-buttons").style.display = "flex";

  // Set main-area to show the planet image
  document.getElementById("main-area").innerHTML = `
  <img src="images/${startingPlanet}.png" alt="${startingPlanet}" class="zone-art">
  `;


  recalculateDerivedStats(player);
  console.log(player.stats)
  

  // Set menu-content to load the lore screen

}

function planetAnalysis(){
  let unitsToFinish = []
  loreDataCache.planets[player.planet].zones.forEach(zone => {
    unitsToFinish.push(zoneUnitReport(zone));
  })
  const summary = [...new Set(unitsToFinish.flat())];
  const zoneNames = loreDataCache.planets[player.planet].zones;
  const uniqueUnits = new Set();

  zoneNames.forEach(zoneName => {
    const units = loreDataCache.zones[zoneName]?.units || [];
   units.forEach(unit => uniqueUnits.add(unit));
  });

  const totalUniqueUnits = uniqueUnits.size;
  console.log("Final Report Summary", "Units to finish: " + summary.join(", "), "Total Units Completed: " + (totalUniqueUnits-summary.length) + "/" + totalUniqueUnits)
  
}
// Maps race to their defensivedamage type
function getRaceDamageType(race) {
  const mapping = {
    Human: "Physical",
    Undead: "Blight",
    Other: "Nature",
    Automaton: "Force",
    Seraphim: "Radiant",
    Voidborn: "Void",
    Spiritkin: "Spirit",
    Pyrrhan: "Heat"
  };
  return mapping[race] || "Physical";
}

// Menu button listener
function initializeMenuButtons() {
  document.querySelectorAll("#menu-buttons button").forEach(button => {
    if(button.id == "skills-btn"){
      button.style.position = "relative"
      let spPip = document.createElement('div')
      spPip.id = "skills-pip"
      spPip.textContent="0"
      button.appendChild(spPip)
    }
    button.addEventListener("click", () => {
      const menu = button.dataset.menu;
      if (player.inCombat && settings.confirmLeaveCombat) {
        setTimeout(() => showPopup(`
          <h2 style="color: #d88">Are you sure?</h2>
          <span>Opening another menu in combat will cancel the encounter. You'll have to restart this fight.</span>
          <div style="display: flex; margin-top: 70px; position: relative;">
          <button style="background: linear-gradient(#844,#633); position: absolute; bottom: 1em; left: 1em; border-radius: 1em;" onclick="showMenu('${menu}')">Continue</button>
          <button style="background: linear-gradient(#484,#363); position: absolute; bottom: 1em; right: 1em; border-radius: 1em;" onclick="document.getElementById('popup-overlay').remove()">Go Back</button>
          </div>
          `), 1);
        return;
      }
      showMenu(menu);
    });
  });
}
(async () => {
  const loreData = await fetch('game_lore_data.json').then(res => res.json());
  const classSelect = document.getElementById("char-class");
  if (classSelect) {
    classSelect.innerHTML = '<option value="">-- Select a class --</option>';
    for (const className in loreData.classes) {
      const option = document.createElement("option");
      option.value = className;
      option.textContent = className;
      classSelect.appendChild(option);
    }
    classSelect.disabled = false;

  }
});




// Menu switching logi
// Load log screen with planet intro and zone info
function loadLoreLog() {
  const menu = document.getElementById("menu-content");
  menu.style.display = 'block'
  menu.innerHTML = `<div id="log-box" class="log-box" readonly></div>`;

  const logBox = document.getElementById("log-box");

  logBox.style.display = "block"
  logBox.scrollTop = 0
}
// Logging function with timestamp
function logMessage(lines) {
  return;
  const logBox = document.getElementById("log-box");
  if (!logBox) return;

  const now = new Date();
  const timestamp = now.toLocaleTimeString("en-US", {
    hour12: false
  });

  lines.forEach((line, index) => {
    const prefix = index === 0 ? `[${timestamp}] `: "";
    const formattedLine = `<div class="log-line">${prefix}> ${line}</div>`;
    logBox.innerHTML += formattedLine;
  });

  logBox.scrollTop = logBox.scrollHeight;
}
function clearLog() {
  logBox = document.getElementById("log-box")
  logBox.textContent = ""
}
// Reusable function to a bar visually
function updateBar(fillId, textId, label, current, max) {
  const percent = max > 0 ? (current / max) * 100: 0;
  document.getElementById(fillId).style.width = percent + "%";
  document.getElementById(textId).innerText = `${label} (${current} / ${max})`;
}
function recalculateTotalResistances(unit) {
    const now = Date.now();
    let breakdownMap = damageTypeBreakdown;

    // Clean expired bonus resistances
    unit.bonusResistances = (unit.bonusResistances || []).filter(b => now <= b.timeExpired);

    // Get base resistances
    let baseResistances = getEffectiveResistances(unit.damageType);

    // Flatten bonus resistances
    const flatBonuses = {};
    if (unit.bonusResistances && unit.bonusResistances.length > 0) {
        for (const bonus of unit.bonusResistances) {
            const type = bonus.damageType.toLowerCase();
            const breakdown = getDamageComponents(type, breakdownMap);
            for (const [compType, weight] of Object.entries(breakdown)) {
                const key = compType.toLowerCase();
                flatBonuses[key] = (flatBonuses[key] || 1) * Math.pow(bonus.value, weight);
            }
        }
    }
    // Flatten gear-based resistances
    const gearBonuses = {};
    if (unit == player && player.inventory && player.inventory.equipped) {
        Object.values(player.inventory.equipped).filter(i => i).forEach(item => {
          
            if (item?.totalResistances) {
                for (const [type, value] of Object.entries(item.totalResistances)) {
                    const key = type.toLowerCase();
                    gearBonuses[key] = (gearBonuses[key] || 1) * value;
                }
            }
        })
    }

    // Merge all resistances
    const resistances = {};
    const allTypes = new Set([
        ...Object.keys(baseResistances).map(t => t.toLowerCase()),
        ...Object.keys(flatBonuses),
        ...Object.keys(gearBonuses),
        ...Object.keys(breakdownMap)
    ]);

   for (const type of allTypes) {
    const base = 1 - (baseResistances[type] ?? 1); // how much is blocked
    const bonus = 1 - (flatBonuses[type] ?? 1);
    const gear = 1 - (gearBonuses[type] ?? 1);

    // total blocked = 1 - (damage taken)
    const totalBlocked = 1 - ((1 - base) * (1 - bonus) * (1 - gear));

    resistances[type] = 1 - totalBlocked; // store back as a multiplier (1 means no resistance)
}

    // Final calculation
    unit.totalResistances = {};
    for (const type of allTypes) {
        unit.totalResistances[type] = getEffectiveResistanceMultiplier(type, resistances, breakdownMap);
    }
}

// Sample player and enemy data
function increaseAttribute(attr) {
  if (player.attributePoints > 0) {
    player.attributesGained[attr]++;
    player.attributePoints--;
    calculateAttributes(player);
    let affectedStats = Object.keys(player.stats).filter(s =>
      player.stats[s].scaling &&
      player.stats[s].scaling.some(sc => sc.stat.toLowerCase() === attr.toLowerCase())
    );
    console.log(affectedStats)
    affectedStats.forEach(s => {
    recalculateStat(player, s);

      // Update the stat on the page if the element exists
      const statElement = document.getElementById(`stat-${s}`);
      if (statElement) {
        const valueSpan = statElement.querySelector('span:last-child');
        if (valueSpan) {
          valueSpan.textContent = player.stats[s].value.toFixed(2);
        }
      }
    });

    // Re-render only the attribute points part
    updateAttributesSection();
  }
}

function showCharacterCreation(charId) {
  player.characterId = charId
  const data = null;
  const menuButtons = document.getElementById("menu-buttons");

  if (!data) {
    menuButtons.style.display = "none";
    const mainArea = document.getElementById("main-area");

    mainArea.innerHTML = `
    <div id="character-creation">
    <h2>Create Your Character</h2>
    <label for="char-name">Name:</label><br />
    <input type="text" id="char-name" placeholder="Enter your name" /><br /><br />

    <label for="char-race">Race:</label><br />
    <select id="char-race"></select>
    <div id="race-desc" class="desc-box"></div><br />

    <label for="char-class">Class:</label><br />
    <select id="char-class"></select>
    <div id="class-desc" class="desc-box"></div><br />

    <button id="start-game">Begin Adventure</button>
    </div>
    `;

    const raceSelect = document.getElementById("char-race");
    const classSelect = document.getElementById("char-class");

    raceSelect.innerHTML = ""; // clear first
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "-- Select a Race --";
    raceSelect.appendChild(defaultOption);

    Object.keys(loreDataCache.races).forEach(r => {
      const opt = document.createElement("option");
      opt.value = r;
      const raceDisplay = loreDataCache.races[r];
      text = `${(raceDisplay.display || r)}`;

      opt.innerHTML = text;
      raceSelect.appendChild(opt);
    });

    classSelect.innerHTML = ""; // clear first
    const secondDefaultOption = document.createElement("option")
    secondDefaultOption.value = ""
    secondDefaultOption.textContent = "-- Select a Class --";
    classSelect.appendChild(secondDefaultOption);

    Object.keys(loreDataCache.classes).forEach(r => {
      if (r == "Pyromancer" || r == "Voidcaller") {


        const opt = document.createElement("option");
        opt.value = r;
        opt.textContent = r;
        classSelect.appendChild(opt);
      }
    });
    raceSelect.selectedIndex = 0;
    classSelect.selectedIndex = 0;
    raceSelect.addEventListener("change",
      () => {
        const race = raceSelect.value;
        const info = loreDataCache.races[race];
        const desc = document.getElementById("race-desc");
        if (info && desc) {

          desc.innerHTML = `<p>${info.description}</p><p>Resistances: ` + getDamageTypeIcon(info.damageType) +" <span style='color: #777'>(Tap icon for more info)</span>" + "</p>" + info.bonuses.map(b => `<p>> ${b}</p>`).join("");
        }
      });

    classSelect.addEventListener("change",
      () => {
        const cls = classSelect.value;
        const info = loreDataCache.classes[cls];
        const desc = document.getElementById("class-desc");
        if (info && desc) {
          const attributes = info.attributes
          const attributeNames = ["Strength", "Dexterity", "Constitution", "Intellect", "Wisdom", "Willpower"];
          const result = attributes
              .map((value, index) => value > 0 ? `+${value} ${attributeNames[index]}` : null)
              .filter(text => text !== null)
              .join(", ");
          desc.innerHTML = `<p>${info.description}</p><p>${result}</p>` + info.bonuses.map(b => `<p>> ${b}</p>`).join("");
        }
        if(info && info.starterSkill){
          desc.innerHTML += "<p>Starter Skill: " + fromCamelCase(info.starterSkill) + "</p>"
        }


      });

    // Trigger default descriptions
    // Trigger default descriptions only if a valid value exists
    if (raceSelect.options.length > 1) {
      raceSelect.dispatchEvent(new Event("change"));
    }

    if (classSelect.options.length > 1) {

      classSelect.dispatchEvent(new Event("change"));
    }
    const startButton = document.getElementById("start-game");
    if (startButton) {
      startButton.addEventListener("click", handleCharacterCreation);
    }
  } else {
    showMenu("character");
  }
}



function arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    let setA = new Set(a);
    let setB = new Set(b);
    for (let item of setA) {
        if (!setB.has(item)) return false;
    }
    return true;
}


function showMenu(menu) {
  document.querySelectorAll(".popup-overlay").forEach(e=>e.remove())
  saveCharacter()
  player.inCombat = false
  updateMenuButton(document.getElementById(menu + "-btn"), "linear-gradient(rgba(255,255,255,0.5),rgba(50,50,50,0.5))")
  const main = document.getElementById("main-area");
  const menuContent = document.getElementById("menu-content");
  menuContent.onclick = null
  main.innerHTML = "";
  menuContent.innerHTML = "";
  document.querySelectorAll("#menu-buttons button").forEach(btn => {
    btn.classList.toggle("active",
      btn.dataset.menu === menu);
  });
  skillIntervals.forEach(ski => clearInterval(ski));
  regenIntervals.forEach(regi => clearInterval(regi))
  skillIntervals = []
  regenIntervals = [];
  document.querySelectorAll(".menu-section").forEach(section => {
    section.style.display = section.id === `${menu}-menu` ? "block": "none";
  });

  switch (menu) {
case "planets":
    let menu = document.getElementById('menu-content');
    if (!menu) {
        console.error("No #menu-content found");
        break;
    }
    menu.innerHTML = ''; // Clear previous content
    let planetsUnlocked = Object.keys(loreDataCache.planets).filter(planet => player.planetsProgress[planet] && (player.planetsProgress[planet].timesCompleted>0 || player.planet == planet || player.progressingPlanet == planet));
    let planetsCompleted = Object.keys(loreDataCache.planets).filter(planet => planetsUnlocked.includes(planet) && player.planetsProgress[planet] && player.planetsProgress[planet].completed);
    let allPlanetsCompleted = arraysEqual(planetsUnlocked, planetsCompleted)
    let planetsToDisplay = Object.keys(loreDataCache.planets).filter(p => loreDataCache.planets[p].startingPlanet || player.planetsProgress[p])
    
    for (let planetIndex in planetsToDisplay) {
      let planetKey = planetsToDisplay[planetIndex]
        let planet = loreDataCache.planets[planetKey];
        let progress = player.planetsProgress[planetKey] || { zonesCompleted: 0, completed: false, timesCompleted: 0 };

        // Skip if never visited, not completed, and not the current planet
        if (!allPlanetsCompleted && !progress.timesCompleted && !progress.completed && player.planet && player.planet !== planetKey) {
            continue;
        }

        // --- Create the bar container ---
        let bar = document.createElement('div');
        bar.className = 'planet-bar';
        bar.style.display = 'flex';
        bar.style.alignItems = 'center';
        bar.style.justifyContent = 'space-between';
      
        bar.style.border = '1px solid #555';
        if(player.planet == planetKey){
          bar.style.border = "1px solid green"
        }
        bar.style.background = '#222';
        bar.style.padding = '0.5em';
        bar.style.cursor = 'pointer';

        // --- Left section: image and planet name ---
        let leftSection = document.createElement('div');
        leftSection.style.display = 'flex';
        leftSection.style.alignItems = 'center';

        let img = document.createElement('img');
        img.src = `images/${planetKey}.png`;
        img.alt = planetKey;
        img.className = 'zone-art';
        img.style.width = '64px';
        img.style.height = '64px';
        img.style.marginRight = '1em';

        let name = document.createElement('div');
        name.innerHTML = planetKey.toUpperCase() + (player.planet == planetKey?" <span style='color:#999font-size:0.7em;'>(You are here)</span>":"");
        name.style.color = '#fff';
        name.style.fontSize = '1.2em';
        name.style.fontWeight = 'bold';

        leftSection.appendChild(img);
        leftSection.appendChild(name);

        // --- Right section: completion state only ---
        let rightSection = document.createElement('div');
        rightSection.style.textAlign = 'right';

        let stateText = document.createElement('div');
        if (!progress.completed) {
            if (player.planet !== planetKey) {
                stateText.textContent = 'NEVER VISITED';
                stateText.style.color = 'red';
            } else {
                stateText.textContent = 'IN PROGRESS';
                stateText.style.color = 'yellow';
            }
        } else {
            stateText.textContent = 'COMPLETED';
            stateText.style.color = '#8f8';
        }
        rightSection.appendChild(stateText);

        bar.appendChild(leftSection);
        bar.appendChild(rightSection);

        // --- Create the collapsible subdiv ---
        let infoDiv = document.createElement('div');
        infoDiv.className = 'planet-info';
        infoDiv.style.display = 'none';
        infoDiv.style.background = '#333';
        infoDiv.style.color = '#ccc';
        infoDiv.style.padding = '0.5em';
        infoDiv.style.border = '1px solid #555';
        infoDiv.style.marginBottom = '1em';
        let descText = document.createElement('div');
        descText.style.border = '1px solid #888'
        descText.style.borderRadius = "0.5em";
        descText.style.padding="0.5em";
        descText.style.backgroundColor = "#000";
        descText.style.marginBottom="0.5em"
        descText.textContent=planet.description || "Nothing is known about this planet.";
        
        infoDiv.appendChild(descText);
        let classText = document.createElement('div');
        classText.textContent = (planet.startingClass?"Ideal Class: "+planet.startingClass:"");
        infoDiv.appendChild(classText);
        // Zones completed
        let maxZones = (planet.zones && planet.zones.length) || 0;
        let zonesText = document.createElement('div');
        zonesText.textContent = `Zones Completed: ${progress.zonesCompleted}/${maxZones}`;
        infoDiv.appendChild(zonesText);

        // Times completed (only if > 0)
        if (progress.timesCompleted > 0) {
            let timesText = document.createElement('div');
            timesText.textContent = `Completed ${progress.timesCompleted} time${progress.timesCompleted > 1 ? 's' : ''}`;
            infoDiv.appendChild(timesText);
        }
        

        // Visit button
        let visitButton = document.createElement('button');
        visitButton.textContent = 'Visit Planet';
        if(player.planet == planetKey){
          visitButton.textContent="Current Planet"
          visitButton.disabled = true;
        }
        visitButton.style.marginTop = '0.5em';
        visitButton.onclick = function(e) {
            e.stopPropagation(); // Prevent bar click from toggling the infoDiv again
            
            // Replace this with your visit logic:
            console.log(`Visiting ${planetKey}`);
        };
        infoDiv.appendChild(visitButton);

        // --- Toggle behavior ---
        bar.onclick = function() {
            // Close all other infoDivs first
            let allInfoDivs = document.querySelectorAll('.planet-info');
            allInfoDivs.forEach(div => {
                if (div !== infoDiv) div.style.display = 'none';
            });

            // Toggle this planet's infoDiv
            infoDiv.style.display = (infoDiv.style.display === 'block') ? 'none' : 'block';
        };

        menu.appendChild(bar);
        menu.appendChild(infoDiv);
    }
    break;
    case "skills":

      const content = document.getElementById('menu-content');

      content.addEventListener('mousedown', (e) => {
        isDragging = true;
        content.style.cursor = 'grabbing';
        startX = e.pageX - content.offsetLeft;
        startY = e.pageY - content.offsetTop;
        scrollLeft = content.scrollLeft;
        scrollTop = content.scrollTop;
      });

      content.addEventListener('mouseup', () => {
        isDragging = false;
        content.style.cursor = 'grab';
      });

      content.addEventListener('mouseleave', () => {
        isDragging = false;
        content.style.cursor = 'grab';
      });

      content.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - content.offsetLeft;
        const y = e.pageY - content.offsetTop;
        const walkX = x - startX;
        const walkY = y - startY;
        content.scrollLeft = scrollLeft - walkX;
        content.scrollTop = scrollTop - walkY;
      });
      renderSkillTree();
      break;
    case "character":
      main.innerHTML = "";

      menuContent.innerHTML = `
      <div id="character-menu" class="menu-section">
      <div id="character-display">
      <h2>${player.name}</h2>
      <h3>${player.race} ${getDamageTypeIcon(loreDataCache.races[player.race].damageType)} | ${player.class}</h3>
      <button onclick="backToCharSelect()" id="character-selection-btn">Back to Character Select</button>
      </div>
      <div class="menu-header" onclick="toggleSection('attributes-section')"id="attributes-header">Attributes (${player.attributePoints} Points)</div>
      <div id="attributes-section" class="menu-content">
      <!-- Populate attributes dynamically -->
      </div>
      <div class="menu-header" onclick="toggleSection('stats-section')">Stats</div>
      <div id="stats-section" class="menu-content">
      <!-- calculate and show stats on click -->
      </div>
      <div class="menu-header" onclick="toggleSection('resistances-section')">Resistances</div>
      <div id="resistances-section" class="menu-content">
      <!-- Show only non-1.0 resistances with explanation on click -->
      </div>

      <div class="menu-header" onclick="toggleSection('inventory-section')">Inventory</div>
      <div id="inventory-section" class="menu-content">
      <div style="margin-bottom: 10px;">
  <label for="sort-column">Sort by:</label>
  <select id="sort-column">
    <option value="name">Name</option>
    <option value="type">Type</option>
    <option value="quality">Quality</option>
    <option value="count">Count</option>
    <option value="slot">Slot</option>
    <option value="tier">Tier</option>
  </select>

  <label for="sort-direction">Order:</label>
  <select id="sort-direction">
    <option value="asc">Ascending</option>
    <option value="desc">Descending</option>
  </select>
</div>
      <h2>Equipped</h2>
      <div id="equipment-slots" class="equipment-row">
      <div class="equip-slot">
      <div class="slot-label">Head</div>
      <div class="slot-item" id="equip-head">None</div>
      </div>
      <div class="equip-slot">
      <div class="slot-label">Torso</div>
      <div class="slot-item" id="equip-torso">None</div>
      </div>
      <div class="equip-slot">
      <div class="slot-label">Legs</div>
      <div class="slot-item" id="equip-legs">None</div>
      </div>
      <div class="equip-slot">
      <div class="slot-label">Feet</div>
      <div class="slot-item" id="equip-feet">None</div>
      </div>
      <div class="equip-slot">
      <div class="slot-label">Hands</div>
      <div class="slot-item" id="equip-hands">None</div>
      </div>
      <div class="equip-slot">
      <div class="slot-label">Waist</div>
      <div class="slot-item" id="equip-waist">None</div>
      </div>
      <div class="equip-slot">
      <div class="slot-label">Weapon</div>
      <div class="slot-item" id="equip-weapon">None</div>
      </div>
      </div>
      <h2>Storage (<span id='item-count'>${player.inventory.storage.filter(i => i).length}</span>/${player.inventorySlots})</h2>
      <div id="inventory-items">

      <!-- Inventory list -->
      </div>
      </div>

      <div class="menu-header" onclick="toggleSection('skills-section')">Skills</div>
      <div id="skills-section" class="menu-content">
      <h2>Equipped</h2>
      <div id="equipped-skills">
      <div class="skill-slot">Slot 1</div>
      <div class="skill-slot">Slot 2</div>
      <div class="skill-slot">Slot 3</div>
      <div class="skill-slot">Slot 4</div>
      <div class="skill-slot">Slot 5</div>
      <div class="skill-slot">Slot 6</div>
      </div>
      <h2>Learned</h2>
      <div id="learned-skills">
      <!-- List all learned skills -->
      </div>
      </div>
      </div>
      `
      let attributesDiv = document.createElement("div")
      attributesDiv.id = "attributes-div"
      document.getElementById("attributes-section").appendChild(attributesDiv)
      calculateAttributes(player)
      updateAttributesSection();
      updateResistancesSection(player)
      
      let statsDiv = document.createElement("div");
      statsDiv.id = "stats-div"

      let statsHTML = `<div class="stat-block">`;

      const statGroups = [{
        title: "Health (HP)",
        class: "hp",
        stats: [{
          label: "Current", key: "hp"
        },
          {
            label: "Max", key: "maxHp"
          },
          {
            label: "Regen", key: "hpRegen"
          }]
      },
        {
          title: "Stamina (SP)",
          class: "sp",
          stats: [{
            label: "Current", key: "sp"
          },
            {
              label: "Max", key: "maxSp"
            },
            {
              label: "Regen", key: "spRegen"
            },
            {
              label: "Efficiency", key: "spEfficiency"
            }]
        },
        {
          title: "Mana (MP)",
          class: "mp",
          stats: [{
            label: "Current", key: "mp"
          },
            {
              label: "Max", key: "maxMp"
            },
            {
              label: "Regen", key: "mpRegen"
            },
            {
              label: "Efficiency", key: "mpEfficiency"
            }]
        },
        {
          title: "Combat",
          class: "combat",
          stats: [{
            label: "Cooldown Reduction", key: "cooldownReduction"
          },
            {
              label: "Damage Taken", key: "damageTaken"
            }
            ]
        },
        {
          title: "Critical",
          class: "crit",
          stats: [{
            label: "Crit Chance", key: "critChance"
          },
            {
              label: "Crit Multiplier", key: "critMulti"
            }]
        },
        {
          title: "Lifesteal",
          class: "lifesteal",
          stats: [{
            label: "Lifesteal %", key: "lifestealMulti"
          },
            {
              label: "Lifesteal Chance", key: "lifestealChance"
            }]
        },
                {
          title: "Misc",
          class: "misc",
          stats: [{
            label: "XP Gain Multi", key: "xpGain"
            
          }]
        }];


      statGroups.forEach(group => {
        statsHTML += `<div class="stat-row stat-header stat-${group.class}">${group.title}</div>`;
        group.stats.forEach(stat => {
          const data = player.stats[stat.key];
          let label = stat.label;
          if (data.scaling) {
            label += "("+data.scaling.map(sc => sc.stat=="tier"?"LVL":sc.stat.toUpperCase().slice(0, 3)).join("/") + ")";

          }
          const rowClass = group.class ? ` stat-subrow-${group.class}`: '';
          statsHTML += `<div class="stat-subrow${rowClass}" id="stat-${stat.key}"><span>${label}:</span><span>${data.value.toFixed(2)}</span></div>`;
        });
      });

      statsHTML += `</div>`;
      statsDiv.innerHTML = statsHTML;
      document.getElementById("stats-section").appendChild(statsDiv)
      updateInventoryDisplay();
      updateSkillsMenu();
      setSectionVisibility("attributes-section",
        true)
      setSectionVisibility("skills-section",
        false)
      setSectionVisibility("stats-section",
        false)
      setSectionVisibility("inventory-section",
        false)
      setSectionVisibility("resistances-section",
        false)
      break;
case "journey":
  main.innerHTML = `
    <img src="images/${player.planet.toLowerCase()}.png" alt="${player.planet.toLowerCase()}" class="zone-art">
  `;

  if (!player.currentZone || !player.currentZone.name) {
    const zoneMenu = document.createElement("div");
    zoneMenu.id = "zone-menu";

    const zones = loreDataCache.planets[player.planet].zones;
    let index = 0;

    for (let zoneName of zones) {
      const zoneData = loreDataCache.zones[zoneName];

      // Skip if units not defined or previous zone not completed
      if (
        !unitsDefinedForZone(zoneData) ||
        (zoneData.previousZone &&
          (!player.zoneProgress[zoneData.previousZone] ||
            !player.zoneProgress[zoneData.previousZone].completed))
      ) {
        index += 1;
        continue;
      }

      const progress = player.zoneProgress[zoneName]?.count || 1;
      const maxTier = zoneData.maxTier;
      const completed = player.zoneProgress[zoneName]?.completed;
      const inProgress = player.progressingZone === zoneName;

      // Determine background color and status label
      let backgroundStyle = "linear-gradient(#141,#030)";
      let statusLabel = "";
      let headerText = `Zone ${index + 1}: ${zoneName} (${progress}/${maxTier})`;
      if (inProgress) headerText += "<span style='color: #2d2;'> - You are here</span>";
      if (completed) {
        backgroundStyle = "linear-gradient(#141,#030)";
        statusLabel = "<span style='color: #393;'>COMPLETED</span>";
      } else if (inProgress) {
        backgroundStyle = "linear-gradient(#141,#030)";
        statusLabel = "<span style='color: #993;'>CURRENTLY ACTIVE</span>";
      } else if (
        player.progressingZone &&
        !player.zoneProgress[player.progressingZone]?.completed
      ) {
        backgroundStyle = "linear-gradient(#411,#300)";
      }

      // Create zone block container
      const zoneBlock = document.createElement("div");
      zoneBlock.className = "zone-block";
      zoneBlock.style.background = backgroundStyle;

      // Create header
      const header = document.createElement("div");
      header.className = "zone-header";



      header.innerHTML = `
  <button class="zone-dropdown-toggle" data-zone="${zoneName}">
    <span class="dropdown-icon">▾</span> ${headerText}
  </button>
`;
      zoneBlock.appendChild(header);

      // Create dropdown content (initially hidden)
      const dropdown = document.createElement("div");
      dropdown.className = "zone-dropdown-content";
      dropdown.style.display = "none";

      // XP reward
      let zoneReward = "";
      if (zoneData.reward?.xp) {
        const xpGained = completed ? player.zoneProgress[zoneName].xpGained : zoneData.reward.xp * (player.beatenZones + 1);
        zoneReward += `<br><span style="color: ${completed ? "#5a5" : "#d9d"};">Reward: ${xpGained} xp${completed ? " (Gained)" : ""}</span>`;
      }

      const recLevel = getEffectiveTier(zoneName, 1);
      const levelDiff = (1 / Math.max(1, recLevel - player.classData[player.class].level)) * 255;
      const color = `rgb(${255 - levelDiff},${levelDiff},0)`;

      let locked = player.progressingZone &&
        !player.zoneProgress[player.progressingZone]?.completed &&
        player.progressingZone !== zoneName &&
        (!player.zoneProgress[zoneName] || !player.zoneProgress[zoneName].completed);

      let zoneBtn = `<button class="zone-button"${locked ? ">LOCKED" : ` onclick="showZone('${zoneName}')">Select Zone`}</button>`;
      let damageTypesText = "<span style='color: #d55;'>Damage Types: "+ getZoneDamageTypes(zoneName).map(damageType => getDamageTypeIcon(damageType)).join("")+"</span>"
      
      dropdown.innerHTML = `
        <div style="margin-top: 5px;">
          <h3>${statusLabel}</h3>
          <span style="color: ${color};">Recommended Level: ${recLevel}</span>
          ${zoneReward}
          <br>${damageTypesText}
          <br>Progress: ${progress}/${maxTier}
          <p>${zoneData.description}</p>
          ${zoneBtn}
        </div>
      `;

      zoneBlock.appendChild(dropdown);
      zoneMenu.appendChild(zoneBlock);
      index += 1;
    }

    if (!zoneMenu.hasChildNodes()) {
      zoneMenu.innerHTML = "<span>No zones accessible for this planet.</span>";
    }

    menuContent.innerHTML = `
      <div class="planet-intro-box">
        <span class="planet-intro-text">
          Welcome to the planet of ${player.planet}${loreDataCache.planets[player.planet].description ? ", " + decapitalize(loreDataCache.planets[player.planet].description) : ""}${player.currentZone ? " Choose a zone to start exploring." : ""}
        </span>
      </div>
    `;
    menuContent.appendChild(zoneMenu);

    // Dropdown toggle logic
zoneMenu.addEventListener("click", (e) => {
  const toggleBtn = e.target.closest(".zone-dropdown-toggle");
  if (toggleBtn) {
    const clickedZone = toggleBtn.dataset.zone;
    const allBlocks = zoneMenu.querySelectorAll(".zone-block");

    allBlocks.forEach(block => {
      const btn = block.querySelector(".zone-dropdown-toggle");
      const content = block.querySelector(".zone-dropdown-content");

      if (btn.dataset.zone === clickedZone) {
        const isNowVisible = content.style.display === "none";
        content.style.display = isNowVisible ? "block" : "none";
        block.classList.toggle("open", isNowVisible);
      } else {
        content.style.display = "none";
        block.classList.remove("open");
      }
    });
  }
});
  } else {
    showZone(player.currentZone.name);
    document.getElementById("enemy-count").textContent = `${player.currentZone.count} / ${loreDataCache.zones[player.currentZone.name].maxTier}`;
  }
  break;
    case "classes":
      showClassMenu();
      break;
    case "settings":
      main.innerHTML = "";
      menuContent.innerHTML = `
      <div class="settingsMenu" style="display: flex; flex-direction: column; align-items: center; gap: 2em; padding-top: 2em;">

      <div style="text-align: center;">
      <button id="hard-reset-btn" onclick="hardReset(${player.characterId})">Hard Reset</button>
      <div style="margin-top: 0.5em;">Confirm before leaving combat</div>
      <label class="toggle-switch">
        <input type="checkbox" id="forceConfirmToggleBtn">
      <span class="slider"></span>
      </label>
      <div style="margin-top: 0.5em;">Show Debug</div>
      <label class="toggle-switch">
        <input type="checkbox" id="debug-toggle">
      <span class="slider"></span>
      </label>
      <div>Confirm before trashing items</div>
      <label class="toggle-switch">
        <input type="checkbox" id="forceConfirmTrashBtn">
      <span class="slider"></span>
      </label>
      </div>

      <div style="text-align: center;">
      <div style="margin-bottom: 0.5em;">Enable Friendly Fire</div>
      <label class="toggle-switch">
      <input type="checkbox" id="friendlyFireToggleBtn">
      <span class="slider"></span>
      </label>
      </div>
          
      <div style="text-align: center;">
      <div style="margin-bottom: 0.5em;">Enable Auto Target</div>
      <label class="toggle-switch">
      <input type="checkbox" id="autoTargetToggleBtn">
      <span class="slider"></span>
      </label>
      </div>


      <div style="text-align: center;">
      <div style="margin-bottom: 0.5em;">AutoContinue Timer: <span id="autoTimerValue">${settings.autoTimer}</span></div>
      <input type="range" id="autoTimerSlider" min="1" max="5" step="1" value="${settings.autoTimer}">
      </div>

      </div>
      `;

      trashToggle = document.getElementById("forceConfirmTrashBtn");
      trashToggle.checked = settings.confirmTrashItem;
      trashToggle.addEventListener("change", function () {
        settings.confirmTrashItem = trashToggle.checked;
      });
      debugToggle = document.getElementById("debug-toggle");
      debugToggle.checked = settings.showDebug;
      debugToggle.addEventListener("change", function () {
        settings.showDebug = debugToggle.checked;
        if(settings.showDebug){
          document.getElementById("debug-overlay").classList.remove("hidden")
        }else{
          document.getElementById("debug-overlay").classList.add("hidden")
        }
      });
      confirmToggle = document.getElementById("forceConfirmToggleBtn");
      confirmToggle.checked = settings.confirmLeaveCombat;
      confirmToggle.addEventListener("change", function () {
        settings.confirmLeaveCombat = confirmToggle.checked;
      });

      friendlyFireToggle = document.getElementById("friendlyFireToggleBtn");
      friendlyFireToggle.checked = settings.friendlyFire;
      friendlyFireToggle.addEventListener("change", function () {
        settings.friendlyFire = friendlyFireToggle.checked;
      });
      
      autoTargetToggle = document.getElementById("autoTargetToggleBtn");
      autoTargetToggle.checked = settings.autoTarget;
      autoTargetToggle.addEventListener("change", function () {
        settings.autoTarget = autoTargetToggle.checked;
      });

      autoTimerSlider = document.getElementById("autoTimerSlider");
      autoTimerValue = document.getElementById("autoTimerValue");
      autoTimerSlider.addEventListener("input", function () {
        settings.autoTimer = parseInt(autoTimerSlider.value);
        autoTimerValue.textContent = settings.autoTimer;
      });
      break;
  }
}

function updateStatDisplay(unit, statKey) {
  const statData = unit.stats[statKey];
  const statElement = document.getElementById(`stat-${statKey}`);
  if (!statData || !statElement) return;

  const spans = statElement.getElementsByTagName("span");
  if (spans.length !== 2) return;

  // Build the label text
  let label = "";
  for (const group of statGroups) {
    const match = group.stats.find(stat => stat.key === statKey);
    if (match) {
      label = match.label;
      break;
    }
  }

  if (statData.scaling) {
    const scalingLabel = statData.scaling
      .map(sc => sc.stat === "tier" ? "LVL" : sc.stat.toUpperCase().slice(0, 3))
      .join("/");
    label += `(${scalingLabel})`;
  }

  // Update the DOM
  spans[0].textContent = label + ":";
  spans[1].textContent = statData.value.toFixed(2);
}
function getZoneDamageTypes(zoneName) {
  const zone = loreDataCache.zones[zoneName];
  const damageTypes = new Set();

  if (zone?.units) {
    for (const zoneUnit of zone.units) {
      const unit = unitsData.find(u => u && u.name == zoneUnit.name);
      if (unit?.damageType) {
        damageTypes.add(unit.damageType.toLowerCase());
      }
    }
  }

  return Array.from(damageTypes);
}
function unitsDefinedForZone(zone) {
  for (let u of zone.units) {
    if (!getUnitDataFromType(u.name)) {
      return false
    }
  }
  return true;
}
function leaveZone() {
  delete player.currentZone.name
  showMenu("journey");
}
function showZone(zone, force) {
  if (!player.currentZone || player.currentZone.name != zone) {
    
    if(!force){
        setTimeout(() => showPopup(`
          <h2 style="color: #d88">Are you sure?</h2>
          <span>Once you select this zone, you cant explore a new one until beating it.</span>
          <div style="display: flex; margin-top: 70px; position: relative;">
          <button style="background: linear-gradient(#844,#633); position: absolute; bottom: 1em; left: 1em; border-radius: 1em;" onclick="showZone('${zone}', true)">Continue</button>
          <button style="background: linear-gradient(#484,#363); position: absolute; bottom: 1em; right: 1em; border-radius: 1em;" onclick="document.getElementById('popup-overlay').remove()">Go Back</button>
          </div>
          `), 1);
        return;
    }
    player.currentZone = {
      name: zone,
      count: player.zoneProgress[zone]?.count || 1
    }
    if(!player.zoneProgress[zone]){
    player.zoneProgress[zone] = {
      count: player.currentZone.count,
    }
    }
  }
  if ((!player.progressingZone || player.progressingZone != zone) && !player.zoneProgress[zone].completed) {
    player.progressingZone = zone
    player.zoneProgress[zone].starterTier = player.beatenTiers + (5*player.beatenZones);
  }

  initializeCombatUnits(zone);
  let encounterDisplay = document.getElementById("encounter-bar");
  let zoneDisplay = document.getElementById("zone-name")
  let prevEncBtn = document.getElementById("last-encounter-btn")
  prevEncBtn.style.display = "block"
  encounterDisplay.classList.remove("hidden")
  encounterDisplay.style.display = "flex";
  zoneDisplay.textContent = player.currentZone.name;
  zoneDisplay.style.display = "block"


  document.getElementById("enemy-count").textContent = `${player.currentZone.count} / ${loreDataCache.zones[player.currentZone.name].maxTier}`
  document.getElementById("menu-content").innerHTML = `
  <div style="position: relative;" class="zone-menu">
  <button class="zone-button" onclick="startCombat()">Begin Combat</button>
  <div id="zone-units-list">
  <button style="position: absolute; top: 0px; left: 5px;" class="zone-button" onclick="leaveZone()">Go Back</button>
  </div>
  </div>
  `
  let units = loreDataCache.zones[player.currentZone.name].units
  let unitsList = document.getElementById("zone-units-list");
  let discoveredUnits = units.filter(u => {
    let uData = getUnitDataFromType(u.name);
    if (uData) {
      if (player.discoveredEnemies && player.discoveredEnemies.includes(uData.name)) {
        return true;
      }
    }
    return false;
  });
  let discoveredCount = discoveredUnits.length;
  let totalUnits = units.length;
  unitsList.innerHTML += `<h3>Units Discovered ${discoveredCount}/${totalUnits}:</h3><br>`
  units.forEach(u => {
    let uData = getUnitDataFromType(u.name);
    if (discoveredUnits.includes(u)) {
      unitsList.innerHTML += `
      <button class="unit-btn" id="${uData.name}-btn" onclick="setTimeout(() => showUnitPopup(undefined, '${uData.name}'), 1)">${uData.name}</button><br>
      `
    } else {

      unitsList.innerHTML += `
      <button class="unit-btn" id="${uData.name}-btn">???</button><br>
      `
    }
  })
}
function getEffectiveTier(zone, tier) {
  if (loreDataCache.zones[zone] && loreDataCache.zones[zone].baseTier) {
    tier += loreDataCache.zones[zone].baseTier;
  }
  if (player.zoneProgress[zone] && player.zoneProgress[zone].starterTier) {
    tier += player.zoneProgress[zone].starterTier
  } 
  return tier;
}
function initializeCombatUnits(zone) {
  let tier = player.currentZone.count;
  if (loreDataCache.zones[zone].previousZone) {
    tier += loreDataCache.zones[loreDataCache.zones[zone].previousZone].maxTier;
  }

  // Find the weight object that matches the tier
  const unitCountRange = loreDataCache.zones[zone].unitCountWeights.find(w =>
    tier >= w.range[0] && tier <= w.range[1]
  );

  // Fallback in case no range matches
  const weights = unitCountRange ? unitCountRange.weights: [1];

  const totalUnitCount = getWeightedRandomIndex(weights);
  combatUnits = [player];
  let effectiveTier = Math.max(1,player.currentZone.count - (totalUnitCount-1))
  for (let i = 0; i < totalUnitCount; i++) {
    combatUnits.push(getRandomUnit(false, effectiveTier, player.currentZone.name));
  }
}
function getWeightedRandomIndex(weights) {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const rand = Math.random() * totalWeight;
  let cumulative = 0;

  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i];
    if (rand < cumulative) return i+1;
  }
}
function showPopup(html) {

  const existingPopup = document.getElementById("popup-overlay");
  if (existingPopup) existingPopup.remove();
  const overlay = document.createElement("div");
  overlay.id = "popup-overlay";
  overlay.className="popup-overlay"
  overlay.style.position = "fixed";
  overlay.style.top = 0;
  overlay.style.left = 0;
  overlay.style.width = "100vw";
  overlay.style.height = "100vh";
  overlay.style.zIndex = 48;
  overlay.style.transition = "background-color 1s ease"
  overlay.style.background = "rgba(0,0,0,0.0)";
  overlay.addEventListener("click", () =>{
    document.querySelectorAll(".popup-overlay").forEach(e=>e.remove());
  } )

  // Create popup
  const popup = document.createElement("div");
  popup.className = "popup";
  popup.style.position = "absolute";
  popup.style.left = "50%";
  popup.style.top = "50%";
  popup.style.transform = "translate(-50%, -50%)";
  popup.style.zIndex = 1000;
  popup.style.backgroundColor = "#666";
  popup.style.color = "#fff";
  popup.style.padding = "10px";
  popup.style.border = "2px solid #444";
  popup.style.borderRadius = "10px";
  popup.style.maxWidth = "80vw";
  popup.style.maxHeight = "80vh";
  popup.style.overflowY = "auto";
  popup.style.boxShadow = "0 0 10px #000";
  popup.innerHTML = html;
  overlay.appendChild(popup);
  document.body.appendChild(overlay)
  setTimeout(() => overlay.style.backgroundColor = "rgba(0,0,0,0.4)", 10);
}
function startCombat(force) {
  if (!isCombatPaused && !force && player.skills.equipped.length == 0) {
    let html = `
    <h2 style="color: #d88;">Are you sure?</h2>
    <span>You're currently attempting to start combat without any skills equipped. This will make it impossible to win. Are you sure you want to continue?</span>
    <div style="display: flex; margin-top: 70px; position: relative;">
    <button style="background: linear-gradient(#844,#633); position: absolute; bottom: 1em; left: 1em; border-radius: 1em;" onclick="startCombat(true)">Continue</button>
    <button style="background: linear-gradient(#484,#363); position: absolute; bottom: 1em; right: 1em; border-radius: 1em;" onclick="showMenu('character')">Go Back</button>
    </div>
    `
    setTimeout(() => showPopup(html), 1);
    return;
  }
  
  if(player.inCombat){
    return;
  }
  
  let main = document.getElementById("main-area")
  let menuContent = document.getElementById("menu-content");
  menuContent.innerHTML = "";
  main.innerHTML = `
  <div class="crew-wrapper">
  <div class="crew-container" id="player-crew">
  <!-- Player and crew members will be rendered here -->
  </div>
  </div>
  <div class="crew-wrapper">
  <div class="crew-container" id="enemy-crew">
  </div>
  </div>
  `;
  
  // Example crew renng
  updateEncounterBar();
  player.inCombat = true
  resetIntervals();
  removeTalentListeners(player)
  initializeTalentListeners(player)

  const crewContainer = document.getElementById("player-crew");
  
  const enemyContainer = document.getElementById("enemy-crew");
  
  combatUnits.forEach(unit => {
    const unitTable = buildUnitTable(unit, unit.isAlly || unit.isPlayer, unit.isPlayer)
    if (unit.isAlly || unit.isPlayer) {
      crewContainer.appendChild(unitTable)
    } else {
      enemyContainer.appendChild(unitTable)
    }
    unit.isAlive = true
    if(unit.skills.combatData.perCombat){
      delete unit.skills.combatData.perCombat
    }
    recalculateDerivedStats(unit);
    recalculateTotalResistances(unit);
    resetBuffData(unit);
    resetUnitStatCaps(unit);
    updateCombatBar(unit, "hp")
    updateCombatBar(unit, "sp")
    updateCombatBar(unit, "mp")
    updateUnitRegens(unit);
  })
  combatUnits.forEach(unit => {
    regenIntervals[unit.id] = setInterval(() => {
      if (player.inCombat && findUnitById(unit.id)) {
        updateUnitRegens(unit); // Or loop through all allies
      } else {
        clearInterval(regenIntervals[unit.id]);
      }
    },
      1000);
    if (!unit.isAlly) {
      initializeEnemyTargets(unit)
    }
    unit.skills.equipped.map(skill => skill.id).filter(s => s).forEach((skillId) => {
      if(unit.isPlayer){
          unit.skills.combatData.targets[skillId] ={
            target: undefined,
            active: false
          }
      }
      // If the skill doesnt require a target, or it has a target and that target exists, or auto target is enabled, 
      if ((skillsData[skillId] && !skillsData[skillId].requiresTarget) || (unit.skills.combatData.targets[skillId] !== undefined && findUnitById(unit.skills.combatData.targets[skillId].target)) || settings.autoTarget) {
        targetData = unit.skills.combatData.targets;
        if(settings.autoTarget && (unit.isPlayer || unit.isAlly)){
          potentialTargets = getPotentialTargets(unit.id, skillsData[skillId].target);
          if(potentialTargets && potentialTargets.length > 0){
            unit.skills.combatData.targets[skillId] ={
              target:  combatUnits.find(u => u.id != unit.id && potentialTargets.some(t => t.id == u.id)),
              active: true
            }
          }
        }
        targetData = unit.skills.combatData.targets;
        unit.skills.combatData.targets[skillId] = {
          target: targetData[skillId] && targetData[skillId].target != undefined?targetData[skillId].target:undefined,
          active: true
        };
        resetSkillCooldown(unit, skillId);
      }
      skillIntervals[unit.id] = setInterval(() => {
        if (player.inCombat && findUnitById(unit.id)) {
          updateProgressBar(skillId, unit); // Or loop through all allies
        } else {
          clearInterval(skillIntervals[unit.id])
        }
      },
        updateSpeed);
    });

  })



  // Zones and begin combat

  menuContent.innerHTML = `
  <div id="combat-log" style="position: relative; width: 100%; height: 200px; background: #111; font-family: monospace;">
    <div id="combat-log-text" style="width: 100%; height: 100%; overflow-y: auto; color: #0f0; padding: 5px;">
      <!-- Log text goes here -->
    </div>
    <button id="combat-log-filter-btn"
      style="position: absolute; bottom: 0.5em; right: 0.5em; color: #ddd; background-color: #222; border-radius: 1em; border: 1px solid #666;"
      onclick="setTimeout(() => showCombatLogFilterPopup(), 1)">Filters</button>
  </div>
`;

}
function showCombatLogFilterPopup() {
  // Remove existing popup if present
  const existing = document.getElementById("combat-log-popup-overlay");
  if (existing) existing.remove();

  // Create overlay
  const overlay = document.createElement("div");
  overlay.id = "combat-log-popup-overlay";
  overlay.style.position = "fixed";
  overlay.style.top = 0;
  overlay.style.left = 0;
  overlay.style.width = "100vw";
  overlay.style.height = "100vh";
  overlay.style.backgroundColor = "rgba(0, 0, 0, 0.4)";
  overlay.style.zIndex = 999;
  overlay.addEventListener("click", closeCombatLogPopup);

  // Create popup container
  const popup = document.createElement("div");
  popup.className = "popup";
  popup.style.position = "absolute";
  popup.style.top = "50%";
  popup.style.left = "50%";
  popup.style.transform = "translate(-50%, -50%)";
  popup.style.background = "#222";
  popup.style.color = "#fff";
  popup.style.padding = "1em";
  popup.style.borderRadius = "10px";
  popup.style.zIndex = 1000;
  popup.style.minWidth = "200px";
  popup.style.boxShadow = "0 0 10px rgba(0,0,0,0.5)";
  popup.addEventListener("click", e => e.stopPropagation()); // Prevent overlay close when clicking popup

  // Close button
  const closeBtn = document.createElement("div");
  closeBtn.textContent = "X";
  closeBtn.style.position = "absolute";
  closeBtn.style.top = "0.5em";
  closeBtn.style.right = "0.5em";
  closeBtn.style.cursor = "pointer";
  closeBtn.style.fontWeight = "bold";
  
  closeBtn.addEventListener("click", closeCombatLogPopup);
  popup.appendChild(closeBtn);

  // Header
  const header = document.createElement("div");
  header.innerHTML = `<strong>Combat Log Filters</strong>`;
  header.style.marginBottom = "1em";
  popup.appendChild(header);

  // Checkbox list
  for (let key in combatLogFilters) {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = `filter-${key}`;
    checkbox.checked = combatLogFilters[key];
    checkbox.addEventListener("change", (e) => {
      combatLogFilters[key] = e.target.checked;
    });

    const label = document.createElement("label");
    label.htmlFor = `filter-${key}`;
    label.textContent = " " + capitalize(key);
    label.style.marginLeft = "0.5em";

    const row = document.createElement("div");
    row.appendChild(checkbox);
    row.appendChild(label);
    row.style.marginBottom = "0.7em";

    popup.appendChild(row);
  }

  overlay.appendChild(popup);
  document.body.appendChild(overlay);
}

function closeCombatLogPopup() {
  const overlay = document.getElementById("combat-log-popup-overlay");
  if (overlay) overlay.remove();
}
function initializeEnemyTargets(unit){
  unit.skills.equipped.forEach(s => {
        let enemyTarget = getEnemyTarget(unit,
          s.id,
          skillsData[s.id].target)

        unit.skills.combatData.targets[s.id] = {
          target: enemyTarget.id,
          active: true
        }
      })
}
function resetIntervals(){
  skillIntervals.forEach(i => clearInterval(i))
  regenIntervals.forEach(i => clearInterval(i))
  Object.values(burningIntervals).forEach(i => clearInterval(i))
}
function resetUnitStatCaps(unit){
  unit.stats.hp.value = unit.stats.maxHp.value;
  unit.stats.sp.value = unit.stats.maxSp.value;
  unit.stats.mp.value = unit.stats.maxMp.value;
}
function resetSkillCooldown(unit, skillId, init) {
  let skillData = skillsData[skillId]
  let initialCooldown = skillData?skillData.initialCooldown || 0:0;
  let skillCooldown = calculateSkillCooldown(unit, skillId);
  if(initialCooldown){
    initialCooldown = skillCooldown - initialCooldown;
  }
  unit.skills.combatData.lastUsed[skillId] = Date.now() - (initialCooldown)*1000;
  updateProgressBar(skillId, unit);
}
function updateCombatLog(text, caster, tags, color, colorEnemy) {
  if (!player.inCombat) return;
  const log = document.getElementById("combat-log-text");
  const logFilterBtn = document.getElementById("combat-log-filter-btn")
  if(!caster){
    if(!color){
      color = "#777";
    }
  }else{
  if(colorEnemy){
    color = caster.isAlly?color:colorEnemy
  }
  if(!color){
    if(tags && tags.length > 0){
      color = combatLogFilterColors[tags[0]][caster.isAlly?"ally":"enemy"];
    }else{
    color = caster?caster.isAlly?"#2f2": "#f22": "#fff"
    }
  }
  }

  let flag = true;
  if(tags && tags.length > 0){
    tags.forEach(tag => {
      if(!combatLogFilters[tag]){
        flag = false;
      }
    })
  }
  if(!flag){
    return;
  }
  log.innerHTML += `<span style="color:${color};">&gt; ${text}<br></span>`;
  log.scrollTop = log.scrollHeight; // auto-scroll
  logFilterBtn.style.bottom = "0.5em";
}
function getEnemyTarget(unit, skillId, targetType) {
  let baseTarget = undefined;

  if (targetType == "singleEnemy" || targetType == "adjacent" || targetType == "randomEnemy") {
    targetType = "randomEnemy";
    livingEnemies = combatUnits.filter(u => u.isAlive && u.isAlly != unit.isAlly);

    if (livingEnemies.length == 0) {
  checkIfCombatFinished();
      return null;
    } else {
      baseTarget = livingEnemies[Math.floor(Math.random()*livingEnemies.length)]
    }
  } else if (targetType == "singleAlly" || targetType == "randomAlly") {
    targetType = randomAlly;
    livingAllies = combatUnits.filter(u => u.isAlive && u.isAlly == unit.isAlly);
    if (livingAllies.length == 0) {
      checkIfCombatFinished();
      return null;
    } else {
      baseTarget = livingAllies[Math.floor(Math.random()*livingAllies.length)]
    }
  }

  return getTarget(unit, baseTarget, targetType);
}

function renderSkillTree() {
  const skillTree = loreDataCache.classes[player.class].skillTree;
  const learnedSkills = player.skills.learned;
  const affordableSkills = getAvailableSkills();

  const menuContent = document.getElementById("menu-content");
  const mainArea = document.getElementById("main-area");

  menuContent.innerHTML = '';
  mainArea.innerHTML = `<span style="font-size: 26px;">Points: ${player.classData[player.class].skillPoints}<br></span><div style="padding: 1em;"><em>Select a skill to view details</em></div>`;

  const treeContainer = document.createElement("div");
  menuContent.onclick = () => {
    mainArea.innerHTML = `<span style="font-size: 26px;">Points: ${player.classData[player.class].skillPoints}<br></span><div style="padding: 1em;"><em>Select a skill to view details</em></div>`;
  };
  treeContainer.className = "skill-tree";
  treeContainer.id = "skill-tree";
  treeContainer.style.position = "relative";

  const linesSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  linesSvg.classList.add("lines");
  linesSvg.id = "tree-lines";
  treeContainer.appendChild(linesSvg);
  menuContent.appendChild(treeContainer);

  const skillMap = {};
  skillTree.forEach(skill => skillMap[skill.id] = { ...skill, children: [] });
  skillTree.forEach(skill => {
    if (skill.previousSkill) skillMap[skill.previousSkill].children.push(skill.id);
  });

  const roots = skillTree.filter(skill => !skill.previousSkill).map(s => s.id);

  const nodePositions = {};
  let nextX = 0;
  const levelHeight = 120;
  const nodeWidth = 100;

  function layoutTree(nodeId, depth) {
    const node = skillMap[nodeId];
    const children = node.children;
    let width = 0;

    if (children.length === 0) {
      width = nodeWidth;
      nodePositions[nodeId] = { x: nextX, y: depth * levelHeight };
      nextX += width + 30;
    } else {
      const childXs = children.map(child => layoutTree(child, depth + 1));
      width = childXs.reduce((a, b) => a + b, 0);
      const center = (childXs[0] + childXs[childXs.length - 1]) / 2;
      nodePositions[nodeId] = { x: center, y: depth * levelHeight };
    }

    return nodePositions[nodeId].x;
  }

  roots.forEach(root => layoutTree(root, 0));

  const allX = Object.values(nodePositions).map(pos => pos.x);
  const allY = Object.values(nodePositions).map(pos => pos.y);
  const minX = Math.min(...allX);
  const maxX = Math.max(...allX);
  const offsetX = -minX;

  skillTree.forEach(skill => {
    const base = nodePositions[skill.id];
    const x = base.x + offsetX;
    const y = base.y;

    const learned = learnedSkills.find(s => s.id === skill.id);
    const currentLevel = learned ? learned.level : 0;
    const isTalent = skill.type && skill.type === "talent";
    const isUnlocked = currentLevel > 0;
    const isAvailable = affordableSkills.some(s => s.id === skill.id);

    const dataSource = isTalent ? talentsData : skillsData;
    const isActive = isTalent?learned?learned.active:false:false
    const data = dataSource[skill.id] || { name: "(Missing Data)" };

    const node = document.createElement("div");
    node.setAttribute("data-skill-id", skill.id);
    node.className = "skill-node";
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;

    const content = document.createElement("div");
    content.id = `${skill.id}-skill-node`
    content.className = "skill-node-content";
    if(isTalent){
      content.classList.add("talent")
      if(isActive){
        content.classList.add("activeTalent")
      }
    }else{
      content.classList.add("skill")
    }
    content.innerText = `\n${data.name}\n(${currentLevel}/${skill.maxLevel})`;

    node.appendChild(content);
    node.onclick = (e) => {
      e.stopPropagation();
      showSkillDetails(skill);
    };

    if (isAvailable && !learned) {
      node.classList.add("available");
    } else if (learned) {
      node.classList.add("started");
    } else if (!isUnlocked) {
      node.classList.add("locked");
      if (skill.previousSkill) {
        const previous = learnedSkills.find(s => s.id === skill.previousSkill);
        const prevLevel = previous ? previous.level : 0;
        const required = skill.previousSkillLevelRequired || 1;
        const needed = required - prevLevel;
        if (needed > 0) {
          const lockOverlay = document.createElement("img");
          lockOverlay.src = "images/skill_lockout.png";
          lockOverlay.style.position = "absolute";
          lockOverlay.style.left = "0";
          lockOverlay.style.top = "0";
          lockOverlay.style.width = "100%";
          lockOverlay.style.height = "100%";
          lockOverlay.style.pointerEvents = "none";

          const lockText = document.createElement("div");
          lockText.innerText = needed;
          lockText.style.position = "absolute";
          lockText.style.top = "57%";
          lockText.style.left = "50%";
          lockText.style.transform = "translate(-50%, -50%)";
          lockText.style.color = "#d77";
          lockText.style.fontSize = "14px";
          lockText.style.fontWeight = "bold";
          lockText.style.textShadow = "1px 1px 2px black";
          lockText.style.pointerEvents = "none";

          node.appendChild(lockOverlay);
          node.appendChild(lockText);
        }
      }
    }

    if (isTalent) {
      node.classList.add("talent");
      if(skill.recursive){
        node.classList.add("recursive")
      }
    }

    treeContainer.appendChild(node);

    if (skill.previousSkill) {
      const parent = nodePositions[skill.previousSkill];
      const parentCenterX = parent.x + offsetX + 50;
      const parentBottomY = parent.y + 50;
      const childCenterX = x + 50;
      const childTopY = y;
      const midY = (parentBottomY + childTopY) / 2;

      const makeLine = (x1, y1, x2, y2) => {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", x1);
        line.setAttribute("y1", y1);
        line.setAttribute("x2", x2);
        line.setAttribute("y2", y2);
        line.setAttribute("stroke", "#aaa");
        line.setAttribute("stroke-width", "2");
        return line;
      };

      linesSvg.appendChild(makeLine(parentCenterX, parentBottomY, parentCenterX, midY));
      linesSvg.appendChild(makeLine(parentCenterX, midY, childCenterX, midY));
      linesSvg.appendChild(makeLine(childCenterX, midY, childCenterX, childTopY));
    }
  });

  setTimeout(() => {
    const maxX = Math.max(...Object.values(nodePositions).map(pos => pos.x + offsetX))+5;
    const maxY = Math.max(...allY);

    treeContainer.style.width = `${maxX + nodeWidth}px`;
    treeContainer.style.height = `${maxY + levelHeight}px`;

    const rootPos = nodePositions[roots[0]];
    const rootCenterX = rootPos.x + offsetX + nodeWidth / 2;
    const rootCenterY = rootPos.y + 25;

    menuContent.scrollLeft = rootCenterX - menuContent.clientWidth / 2;
    menuContent.scrollTop = rootCenterY - menuContent.clientHeight / 2;
  }, 0);
}
function updateEncounterBar(){
  let encounterDisplay = document.getElementById("encounter-bar");
  let zoneDisplay = document.getElementById("zone-name")
  let prevEncBtn = document.getElementById("last-encounter-btn")
  prevEncBtn.style.display = "block"
  encounterDisplay.classList.remove("hidden")
  encounterDisplay.style.display = "flex";
  zoneDisplay.textContent = player.currentZone.name;
  zoneDisplay.style.display = "block"


  document.getElementById("enemy-count").textContent = `${player.currentZone.count} / ${loreDataCache.zones[player.currentZone.name].maxTier}`
}
function updateSkillDisplay(skillId) {
  const skill = loreDataCache.classes[player.class].skillTree.find(s => s.id === skillId);
  const learnedSkills = player.skills.learned;
  const affordableSkills = getAvailableSkills();
  const isTalent = skill.type === "talent";
  const node = document.querySelector(`.skill-node[data-skill-id="${skillId}"]`);
  if (!node) return;

  const learned = learnedSkills.find(s => s.id === skillId);
  const dataSource = isTalent ? talentsData : skillsData;
  const currentLevel = learned ? learned.level : 0;
  const isUnlocked = currentLevel > 0;
  const isAvailable = affordableSkills.some(s => s.id === skill.id);

  // Reset classes
  node.className = "skill-node";
  if (!isUnlocked) node.classList.add("locked");
  if (isAvailable && !learned) node.classList.add("available");
  if (learned) node.classList.add("started");
  if (isTalent) node.classList.add("talent");
  if (skill.recursive) node.classList.add("recursive");

  // Update text
  const contentDiv = node.querySelector(".skill-node-content");
  if (contentDiv) {
    contentDiv.innerText = `\n${dataSource[skill.id].name}\n(${currentLevel}/${skill.maxLevel})`;
  }

  // Update or re-add lock overlay if necessary
  const existingOverlay = node.querySelector("img");
  const existingText = node.querySelector("div:not(.skill-node-content)");
  if (existingOverlay) node.removeChild(existingOverlay);
  if (existingText) node.removeChild(existingText);

  if (!isUnlocked && skill.previousSkill) {
    const previous = learnedSkills.find(s => s.id === skill.previousSkill);
    const prevLevel = previous ? previous.level : 0;
    const required = skill.previousSkillLevelRequired || 1;
    const needed = required - prevLevel;
    if (needed > 0) {
      const lockOverlay = document.createElement("img");
      lockOverlay.src = "images/skill_lockout.png";
      lockOverlay.style.position = "absolute";
      lockOverlay.style.left = "0";
      lockOverlay.style.top = "0";
      lockOverlay.style.width = "100%";
      lockOverlay.style.height = "100%";
      lockOverlay.style.pointerEvents = "none";

      const lockText = document.createElement("div");
      lockText.innerText = needed;
      lockText.style.position = "absolute";
      lockText.style.top = "57%";
      lockText.style.left = "50%";
      lockText.style.transform = "translate(-50%, -50%)";
      lockText.style.color = "#d77";
      lockText.style.fontSize = "14px";
      lockText.style.fontWeight = "bold";
      lockText.style.textShadow = "1px 1px 2px black";
      lockText.style.pointerEvents = "none";

      node.appendChild(lockOverlay);
      node.appendChild(lockText);
    }
  }
}
function showSkillDetails(skill, isAvailable = false) {
  isAvailable = getAvailableSkills().some(s => s.id == skill.id)
  const mainArea = document.getElementById("main-area");
  const isTalent = skill.type === "talent";
  const dataSource = isTalent ? talentsData : skillsData;
  const skillData = dataSource[skill.id] || {
    name: "(Missing Name)",
    description: "No description available.",
    levelUpEffects: []
  };

  const learned = player.skills.learned.find(s => s.id === skill.id);
  const level = learned ? learned.level : 0;
  const isMaxed = level >= skill.maxLevel;
  const canLevel = isAvailable;
  const isActive = isTalent?learned?learned.active:false:false
  let skillCost = skill.cost;
  if (!learned) {
    if (skill.unlockCost) {
      skillCost = skill.unlockCost;
    } else {
      skillCost += Object.keys(player.skills.learned).length;
    }
  }

  const buttonLabel = level > 0
    ? (isMaxed ? "Maxed Out" : "Level Up")
    : (isTalent ? "Unlock Talent" : "Unlock Skill");
  const checkbox = `
  <label style="padding-left: 2em;">
    <input type="checkbox" id="talent-checkbox" ${isActive ? "checked" : ""}>
    <span id="checkbox-label">${isActive ? " On" : " Off"}</span>
  </label>
`;
  const skillTree = loreDataCache.classes[player.class].skillTree;
  const skillTreeData = skillTree.find(s => s.id == skill.id);

  let unlockReqs = "";

  if (level === 0 && skillTreeData?.previousSkill && skillTreeData.previousSkillLevelRequired) {
    const prevSkillId = skillTreeData.previousSkill;
    const prevIsTalent = talentsData[prevSkillId] !== undefined;
    const prevDataSource = prevIsTalent ? talentsData : skillsData;
    const prevSkillData = prevDataSource[prevSkillId];

    const prevLearned = player.skills.learned.find(s => s.id === prevSkillId);
    const prevLevel = prevLearned ? prevLearned.level : 0;
    const requirementMet = prevLevel >= skillTreeData.previousSkillLevelRequired;

    unlockReqs = `<span style="color: ${requirementMet ? "#5c5" : "#c55"}">
      Requires ${prevSkillData?.name || "(Missing)"} Lv. ${skillTreeData.previousSkillLevelRequired} ${!requirementMet?"("+prevLevel + "/" + skillTreeData.previousSkillLevelRequired + ")":""}
    </span><br>`;
  }
  let infoBtn = isTalent?"":`<button style="border-radius: 1em;" onclick="setTimeout(() => showSkillPopup('${skill.id}', false, undefined, undefined, '${player.id}'), 1)">i</button>`
  mainArea.innerHTML = `
    <span style="font-size: 26px;">Points: ${player.classData[player.class].skillPoints}</span>
    <div style="padding: 1em">
      <span style="color: #f0f0f0; font-size: 16px;"><strong>${skillData.name}</strong>${infoBtn}</span><br>
      <em>(${isTalent?(skillTreeData.recursive?"Recursive ":"")+"Talent":"Skill"})</em>
<br><br>
      <span style="color:#77a;"><strong>Level:</strong> ${level} / ${skill.maxLevel}</span> |
      <span style="color: #a7a;"><strong> ${level == 0?"Unlock ":""}Cost:</strong> ${skillCost} Skill Point${skillCost !== 1 ? 's' : ''}</span>
      <br>
      ${unlockReqs}
      <span style="margin-top: 0.5em">${Array.isArray(skillData.description)?skillData.description.map(line => `<br><span style='color: #9c9;'>- ${line}</span>`).join(""):skillData.description || ""}</span>
      <br>
      <span style="margin-top: 0.5em">
      ${formatSkillLevelScalingsWithLabels(skill.id, skillData.levelUpEffects || [])}
      <button
        id="skill-upgrade-btn"
        style="margin-top: 1em; padding: 0.5em 1em; font-size: 1em;"
        ${canLevel ? '' : 'disabled'}
      >
        ${buttonLabel}
      </button>
      ${level > 0 && isTalent?checkbox:""}
    </div>
  `;

  if (canLevel) {
    const upgradeBtn = document.getElementById("skill-upgrade-btn");
    upgradeBtn.addEventListener("click", () => levelUpSkill(skill.id, skillCost));
  }
  const toggleCheckbox = document.getElementById("talent-checkbox");
  if(toggleCheckbox){
toggleCheckbox.addEventListener("change", (e) => {
  learned.active = !learned.active;
  let nodeEle = document.getElementById(`${skill.id}-skill-node`);
  if(learned.active){
    nodeEle.classList.add("activeTalent")
  }else{
    nodeEle.classList.remove("activeTalent")
  }
  document.getElementById("checkbox-label").textContent = learned.active?" On":" Off"
});
}
}

function levelUpSkill(skillId, cost) {
  const skillTree = loreDataCache.classes[player.class].skillTree;
  const skill = skillTree.find(s => s.id === skillId);
  let learned = player.skills.learned.find(s => s.id === skillId);
  if (player.classData[player.class].skillPoints >= cost && (!learned || learned.level < skill.maxLevel)) {
    player.classData[player.class].skillPoints -= cost;
    if (learned) {
      learned.level += 1;
    } else {
      player.skills.learned.push({
        id: skillId, level: 1, type: skill.type || "skill"
      });
      learned = player.skills.learned.find(s => s.id === skillId);
    }

  }
  
  
  recalculateDerivedStats(player)
  if(skill.type == "talent"){
    if(learned.level == 1){
      learned.active = true;
      
    }
    let talentData = talentsData[skill.id];
    if(talentData && talentData.effects){
      calculateAttributes(player)
    }
  }
  showSkillDetails(skill, player.classData[player.class].skillPoints >= cost && learned.level < skill.maxLevel)
  updateAllSkillDisplays(); // re-render to update display
let spPip = document.getElementById('skills-pip');
    let skillPoints = player.classData[player.class].skillPoints
      spPip.textContent = skillPoints <100?skillPoints:""
}
function updateAllSkillDisplays() {
  const skillTree = loreDataCache.classes[player.class].skillTree;
  skillTree.forEach(skill => updateSkillDisplay(skill.id));
}
function nextEncounter(force) {

  if (!player.currentZone) return;

  if (player.currentZone.count >= loreDataCache.zones[player.currentZone.name].maxTier) return;
  if (player.currentZone.count >= player.zoneProgress[player.currentZone.name].count) return;
  if (!force && player.inCombat && settings.confirmLeaveCombat) {

    setTimeout(() => showPopup(`
      <h2 style="color: #d88">Are you sure?</h2>
      <span>Opening another menu in combat will cancel the encounter. You'll have to restart this fight.</span>
      <div style="display: flex; margin-top: 70px; position: relative;">
      <button style="background: linear-gradient(#844,#633); position: absolute; bottom: 1em; left: 1em; border-radius: 1em;" onclick="nextEncounter(true)">Continue</button>
      <button style="background: linear-gradient(#484,#363); position: absolute; bottom: 1em; right: 1em; border-radius: 1em;" onclick="document.getElementById('popup-overlay').remove()">Go Back</button>
      </div>
      `), 1);
    return;
  }

  player.inCombat = false;

  player.currentZone.count += 1;
  document.getElementById("enemy-count").textContent = `${player.currentZone.count} / ${loreDataCache.zones[player.currentZone.name].maxTier}`
  showMenu("journey");
}
function lastEncounter(force) {
  if (!player.currentZone) return;
  if (player.currentZone.count <= 1) return;
  if (!force && player.inCombat && settings.confirmLeaveCombat) {
    setTimeout(() => showPopup(`
      <h2 style="color: #d88">Are you sure?</h2>
      <span>Opening another menu in combat will cancel the encounter. You'll have to restart this fight.</span>
      <div style="display: flex; margin-top: 70px; position: relative;">
      <button style="background: linear-gradient(#844,#633); position: absolute; bottom: 1em; left: 1em; border-radius: 1em;" onclick="lastEncounter(true)">Continue</button>
      <button style="background: linear-gradient(#484,#363); position: absolute; bottom: 1em; right: 1em; border-radius: 1em;" onclick="document.getElementById('popup-overlay').remove()">Go Back</button>
      </div>
      `), 1);
    return;
  }
  player.inCombat = false;

  player.currentZone.count -= 1;
  document.getElementById("enemy-count").textContent = `${player.currentZone.count} / ${loreDataCache.zones[player.currentZone.name].maxTier}`
  showMenu("journey")
}
function updateInventoryDisplay() {
  const inventoryContainer = document.getElementById("inventory-items");
  if (!inventoryContainer) return;

  const sortColumn = document.getElementById("sort-column")?.value || "name";
  const sortDirection = document.getElementById("sort-direction")?.value || "asc";

  // Filter and copy items
  let items = player.inventory.storage
    .map((item, originalIndex) => item ? { ...item, originalIndex } : null)
    .filter(item => item); // Only filled slots

  // Sort the items
  items.sort((a, b) => {
    let aVal = a[sortColumn] ?? "";
    let bVal = b[sortColumn] ?? "";

    if (sortColumn === "count" || sortColumn === "tier") {
      aVal = parseInt(aVal) || 0;
      bVal = parseInt(bVal) || 0;
    } else {
      aVal = String(aVal).toLowerCase();
      bVal = String(bVal).toLowerCase();
    }

    if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  // Attach sorting listeners if not already attached
  document.getElementById("sort-column")?.removeEventListener("change", updateInventoryDisplay);
  document.getElementById("sort-direction")?.removeEventListener("change", updateInventoryDisplay);
  document.getElementById("sort-column")?.addEventListener("change", updateInventoryDisplay);
  document.getElementById("sort-direction")?.addEventListener("change", updateInventoryDisplay);

  let tableHtml = `
    <table class="inventory-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Type</th>
          <th>Quality</th>
          <th>Count</th>
          <th>Slot</th>
          <th>Equip</th>
          <th>Trash</th>
        </tr>
      </thead>
      <tbody>
  `;

  // Add rows for filled items (sorted)
  items.forEach((item, index) => {
    const nameCell = `
      <td style="color: ${itemQualities[item?.quality || "common"]}; cursor: pointer;" onclick="setTimeout(() => showItemPopup(player.inventory.storage[${item.originalIndex}]), 1)">
        ${item.name} ${item.tier ? "(T" + item.tier + ")" : ""}
      </td>
    `;
    const typeCell = `<td>${item.type}</td>`;
    const qualityCell = `<td>${capitalize(item.quality)}</td>`;
    const countCell = `<td>${item.count}</td>`;
    const slotCell = `<td>${capitalize(item.slot) || ""}</td>`;

    const equipBtn = item.type == "Gear"
      ? `<button class="equip-btn" onclick="tryEquipItem(${item.originalIndex})">Equip</button>`
      : "";
    const trashBtn = `<button class="unequip-btn" onclick="trashItem(${item.originalIndex})">Trash</button>`;

    tableHtml += `<tr>${nameCell}${typeCell}${qualityCell}${countCell}${slotCell}<td>${equipBtn}</td><td>${trashBtn}</td></tr>`;
  });

  // Add rows for empty slots
  const emptySlots = player.inventorySlots - items.length;
  document.getElementById("item-count").textContent = (player.inventorySlots-emptySlots) + ""
  for (let i = 0; i < emptySlots; i++) {
    tableHtml += `
      <tr>
        <td colspan="7" style="color: #666; text-align: center; font-style: italic;">Empty Slot</td>
      </tr>
    `;
  }

  tableHtml += `</tbody></table>`;
  inventoryContainer.innerHTML = tableHtml;

  // Equipped item display (unchanged)
  const equipSlots = ["head", "torso", "legs", "waist", "feet", "hands", "weapon"];
  equipSlots.forEach(slot => {
    const slotElement = document.getElementById(`equip-${slot}`);
    const item = player.inventory.equipped[slot];

    if (slotElement) {
      if (item) {
        slotElement.innerHTML = `
          <div class="equip-rect" style="border: 1px solid #666; padding: 4px 8px; margin: 4px; display: flex; flex-direction: column; align-items: center; background-color: #222; color: ${itemQualities[item.quality || "common"]}; cursor: pointer;">
            <div onclick="setTimeout(() => showItemPopup(player.inventory.equipped['${slot}']), 1)" style="margin-bottom: 4px;">
              ${item.name} (T${item.tier})
            </div>
            <button class="unequip-btn" onclick="unequipItem('${slot}')">Unequip</button>
          </div>
        `;
      } else {
        slotElement.innerHTML = `
          <div class="equip-rect" style="border: 1px solid #666; padding: 4px 8px; margin: 4px; display: inline-block; background-color: #222; color: #aaa;">
            None
          </div>
        `;
      }
    }
  });
}
function trashItem(index, force){
      if(!force && settings.confirmTrashItem){
        setTimeout(() => showPopup(`
          <h2 style="color: #d88">Are you sure?</h2>
          <span>Are you sure you want to delete this item?</span>
          <div style="display: flex; margin-top: 70px; position: relative;">
          <button style="background: linear-gradient(#844,#633); position: absolute; bottom: 1em; left: 1em; border-radius: 1em;" onclick="trashItem('${index}', true)">Continue</button>
          <button style="background: linear-gradient(#484,#363); position: absolute; bottom: 1em; right: 1em; border-radius: 1em;" onclick="document.getElementById('popup-overlay').remove()">Go Back</button>
          </div>
          `), 1);
        return;
    }
    player.inventory.storage.splice(index, 1);
  recalculateDerivedStats(player);
  // Optionally refresh the UI here
  updateInventoryDisplay();
  let items = player.inventory.storage
    .map((item, originalIndex) => item ? { ...item, originalIndex } : null)
    .filter(item => item); // Only filled slots
const emptySlots = player.inventorySlots - items.length;
  document.getElementById("item-count").textContent = (player.inventorySlots-emptySlots) + ""
  updateResistancesSection(player)
}
function tryEquipItem(index) {
  if (index >= player.inventory.storage.length) {
    console.error("Couldn't equip due to bad index");
    return;
  }

  let item = player.inventory.storage[index];
  if (!item || item.type !== "Gear") {
    console.error("Invalid item for equipping", item);
    return;
  }

  let slot = item.slot?.toLowerCase();
  let equippedTypes = Object.keys(player.inventory.equipped);
  if (!equippedTypes.includes(slot)) {
    console.warn(`Item type ${slot} is not equippable.`);
    return;
  }

  let equippedItem = player.inventory.equipped[slot];

  // If swapping with another item
  if (equippedItem) {
    // Replace equipped slot first
    player.inventory.equipped[slot] = item;

    // Replace storage item with the previously equipped item
    player.inventory.storage[index] = equippedItem;

    console.log(`Swapped ${equippedItem.name} with ${item.name} in the ${slot} slot.`);
  } else {
    // No item equipped — check if inventory has space to remove from it
    player.inventory.equipped[slot] = item;
    player.inventory.storage.splice(index, 1);
    console.log(`Equipped ${item.name} in the ${slot} slot.`);
  }

  recalculateDerivedStats(player);
  updateInventoryDisplay();
  let items = player.inventory.storage
    .map((item, originalIndex) => item ? { ...item, originalIndex } : null)
    .filter(item => item); // Only filled slots
const emptySlots = player.inventorySlots - items.length;
  document.getElementById("item-count").textContent = (player.inventorySlots-emptySlots) + ""
  updateResistancesSection(player);
}
function unequipItem(slot, returnItem = true) {
  const item = player.inventory.equipped[slot];
  if (!item) return null;

  if (returnItem) {
    const storage = player.inventory.storage;
    if (storage.filter(i => i).length >= player.inventorySlots) {
      console.warn("Cannot unequip — inventory full.");
      return false;
    }
    storage.push(item);
  }

  player.inventory.equipped[slot] = null;
  recalculateDerivedStats(player);
  updateInventoryDisplay();
  updateResistancesSection(player);

  return item;
}
function isEquivalentItem(item1, item2){
  if(item1.name != item2.name) return false;
  if(item1.type != item2.type) return false;
  if(item1.type == "Gear") return false;
  return true;
}
function addItem(item) {
  const inventory = player.inventory.storage;

  // Check if there's room
  if (inventory.filter(i => i).length >= player.inventorySlots) {
    console.warn("Inventory is full!");
    return false;
  }

  // Try to stack item if already exists (stackable items)
  for (let i = 0; i < inventory.length; i++) {
    let currentItem = inventory[i];
    if (currentItem && isEquivalentItem(item, currentItem) && item.count) {
      currentItem.count += item.count;
      return true;
    }
  }

  // Find first empty slot
  for (let i = 0; i < player.inventorySlots; i++) {
    if (!inventory[i]) {
      inventory[i] = { ...item }; // clone to avoid reference issues
      if (!inventory[i].count) inventory[i].count = 1;
      updateInventoryDisplay();
      return true;
    }
  }

  console.warn("Could not add item — no open slots found.");
  return false;
}
function resetBuffData(unit){
  unit.buffs = []
  unit.debuffs = []
  unit.conditions = []
}
function updateSkillsMenu() {
  const menu = document.getElementById("skills-section");
  menu.innerHTML = ""; // Clear current menu

  const learnedHeader = document.createElement("h3");
  learnedHeader.textContent = "Learned Skills";
  menu.appendChild(learnedHeader);

  const learnedTable = document.createElement("table");
  learnedTable.style.width = "100%";
  learnedTable.style.borderCollapse = "collapse";
  learnedTable.style.marginBottom = "20px";
  menu.appendChild(learnedTable);

  let currentRow = null;
  player.skills.learned.filter(sk => !sk.type || sk.type == "skill").forEach((sk, index) => {
    const skillId = sk.id
    const skill = skillsData[skillId];

    if (index % 2 === 0) {
      currentRow = learnedTable.insertRow();
    }

    const cell = currentRow.insertCell();
    cell.style.border = "1px solid #555";
    cell.style.padding = "6px";
    cell.style.verticalAlign = "middle";

    const name = document.createElement("span");
  
    name.textContent = `${skill.name} (${sk.level})`;
    name.style.color = "#0bf";
    name.style.cursor = "pointer";
    name.style.marginRight = "6px";
    name.style.fontSize = "12px"
    name.onclick = () => setTimeout(() => showSkillPopup(skillId, false, player), 1);

    cell.appendChild(name);

    if (player.skills.equipped.length == 0 || !player.skills.equipped.map(s => s && s.id).includes(skillId)) {
      const equipBtn = document.createElement("button");
      equipBtn.className = "equip-btn";
      equipBtn.textContent = "Equip";
      equipBtn.style.fontSize = "12px"
      equipBtn.style.marginLeft = "8px";
      equipBtn.onclick = () => {
        if (player.inCombat) {
          console.log("Can't change skills during combat.");
          return;
        }
        skillToEquip = sk;
        console.log(`Select a slot to equip ${skill.name}`);
        updateSkillsMenu();
      };
      cell.appendChild(equipBtn);
    } else {
      const unequipBtn = document.createElement("button");
      unequipBtn.textContent = "Unequip";

      unequipBtn.className = "unequip-btn";
      unequipBtn.onclick = () => {

        if (player.inCombat) {
          log("Can't unequip during combat.");
          return;
        }

        player.skills.equipped[player.skills.equipped.find(skill => skill.id == skillId)] = undefined;
        updateSkillsMenu();
      };
      cell.appendChild(unequipBtn)
    }
  });

  // Divider
  const equippedHeader = document.createElement("h3");
  equippedHeader.textContent = "Equipped Skills";
  equippedHeader.style.marginTop = "20px";
  menu.appendChild(equippedHeader);

  const slotsContainer = document.createElement("div");
  slotsContainer.style.display = "flex";
  slotsContainer.style.flexWrap = "wrap";
  slotsContainer.style.gap = "10px";
  slotsContainer.style.maxWidth = "400px";
  menu.appendChild(slotsContainer);

  for (let i = 0; i < player.skillSlots; i++) {
    const sk = player.skills.equipped[i] || null;
    const skillId = sk?sk.id: null
    const slot = document.createElement("div");
    slot.style.border = "2px solid #555";
    slot.style.borderRadius = "6px";
    slot.style.padding = "6px";
    slot.style.width = "120px";
    slot.style.textAlign = "center";
    slot.style.background = skillId ? "#222": skillToEquip ? "#447": "#111";

    if (skillId) {
      const skill = skillsData[skillId];
      const name = document.createElement("div");
      name.textContent = `${skill.name} (${sk.level})`;
      name.style.color = "#0bf";
      name.style.cursor = "pointer";
      name.onclick = () => setTimeout(() => showSkillPopup(skillId, false, player), 1);

      const unequipBtn = document.createElement("button");
      unequipBtn.textContent = "Unequip";
      unequipBtn.className = "unequip-btn";
      unequipBtn.onclick = () => {
        if (player.inCombat) {
          log("Can't unequip during combat.");
          return;
        }
        player.skills.equipped[i] = null;
        updateSkillsMenu();
      };

      slot.appendChild(name);
      slot.appendChild(unequipBtn);
    } else {
      const label = document.createElement("div");
      label.textContent = "Empty Slot";
      label.style.color = "#888";
      slot.appendChild(label);
    }

    if (!player.inCombat) {
      slot.style.cursor = "pointer";
      slot.onclick = () => {
        if (skillToEquip && !player.skills.equipped.find(s => s && s.id == skillToEquip.id)) {
          player.skills.equipped[i] = skillToEquip;
          if (!player.skills.combatData.targets || !player.skills.combatData.targets[skillToEquip.id]) player.skills.combatData.targets[skillToEquip.id] = {};
          skillToEquip = null;
          updateSkillsMenu();
        }
      };
    }

    slotsContainer.appendChild(slot);
  }
}

function updateAttributesSection() {
    let attributesDiv = document.getElementById("attributes-div");
    let attrHtml = ``;
    const classAttributeBonuses = loreDataCache.classes[player.class].attributes;
    let attrIndex = 0;
    let primary = -1;
    let secondary = -1;

    // Identify primary and secondary bonuses
    if (classAttributeBonuses && classAttributeBonuses.length > 0) {
        let sortedAttrs = classAttributeBonuses
            .map((value, index) => ({ value, index }))
            .sort((a, b) => b.value - a.value)  // descending order
            .map(v => v.index);
        primary = sortedAttrs[0];
        if (classAttributeBonuses.length > 1) {
            secondary = sortedAttrs[1];
        }
    }

    // Build the attribute rows
    Object.keys(player.attributes).forEach(attr => {
        const base = player.attributes[attr];
        const bonus = (classAttributeBonuses[attrIndex] || 0);
        const hasAttributePoints = player.attributePoints > 0;

        // Level up button
        const plusBtn = hasAttributePoints
            ? `<button class="plus-btn" onclick="increaseAttribute('${attr}')">+</button>`
            : "";

        // Primary/Secondary label
        let primaryOrSecondary = "";
        if (attrIndex === primary) {
            primaryOrSecondary = "(PRIMARY)";
        } else if (attrIndex === secondary) {
            primaryOrSecondary = "(SECONDARY)";
        }

        // Attribute row HTML
        attrHtml += `
        <div id="${attr}-display" class="attr-div">
            <span>${capitalize(attr)}: ${base} (+${bonus})</span>
            <span style="font-size: 0.7em; color: #060;"><strong>${primaryOrSecondary} </strong></span>${plusBtn}
        </div>
        `;
        attrIndex++;
    });

    attributesDiv.innerHTML = attrHtml;
    document.getElementById("attributes-header").textContent = `Attributes (${player.attributePoints})`;
}

function buildUnitTable(member, isAlly, isPlayer) {
  let xpBar = ""
  let infoBtn = `
  <button class="info-btn"
  style="font-size: 6px;
  border-radius: 2em;
  position: absolute;
  top: 2px;
  right: 2px;"
  onclick="setTimeout(() => showUnitPopup(${member.id}),1)"
  >i</button>
  `
  let statusBtn = `
  <button id="status-btn-${member.id}"
  style="font-size: 6px;
  border-radius: 2em;
  position: absolute;
  top: 2px;
  left: 2px;
  padding: 0;
  overflow: hidden;
  height: 10px;
  display: flex;
  border: 1px solid black;"
  onclick="setTimeout(() => showStatusPopup(${member.id}),1)">

  <span style="flex: 1; display: flex; justify-content: center; align-items: center;
  background: linear-gradient(#060, #2a2);
  color: white;">${member.buffs.length}</span>

  <span style="flex: 1; display: flex; justify-content: center; align-items: center;
  background: linear-gradient(#600, #a22);
  color: white;">${member.debuffs.length}</span>

  <span style="flex: 1; display: flex; justify-content: center; align-items: center;
  background: linear-gradient(#306, #838);
  color: white;">${member.conditions.length}</span>
  </button>
  `;
  if (isPlayer) {
    xpBar = `
    <div class="bar xp-bar" style="height: 1em; display: flex; align-items: center; position: relative; margin-left: 20%; width: 60%">
    <div
    class="xp-bar fill"
    id="bar-fill-${member.id}-xp"
    style="width: ${(member.xp / member.maxXp) * 100}%; position: absolute; height: 100%; top: 0; left: 0; z-index: 0;">
    </div>
    <div
    class="bar-text"
    style="font-size: 8px; position: relative; z-index: 1; width: 100%; text-align: center;"
    id="bar-text-${member.id}-xp">
    XP (${member.xp.toFixed(0)}/${member.maxXp})
    </div>
    </div>
    `
  }
  const div = document.createElement("div");
  div.className = `${isAlly ? "ally": "enemy"}-box` + " unit-box";
  div.id = member.id + "-unit-box";
  div.onclick = () => {
    setTimeout(() => {
      if(skillToTarget){
      let potentialTargets = getPotentialTargets(findUnitById(unitToCast), skillToTarget?skillsData[skillToTarget].target:null)
      if (((potentialTargets && potentialTargets.includes(member)) || settings.friendlyFire) &&unitToTarget == null && targetting && Date.now() - timeStartedTargetting > 100) {
        unitToTarget = member.id;
        targetting = false;
        selectSkillTarget(unitToCast);
        document.querySelectorAll(".unit-box").forEach((box) => {
          let hitChanceBox = document.getElementById(member.id + '-hitChance')
          if(hitChanceBox){
            hitChanceBox.remove();
          }
          box.style.setProperty('--border-gradient', 'linear-gradient(to right, black, black)');
        });
      }
    }
    },
      3);
  }
  div.style.position = "relative"
  div.innerHTML = `
  <strong>${member.name}</strong><br />
  <p class="unit-type">${member.race} ${isPlayer ? getDamageTypeIcon(loreDataCache.races[member.race].damageType,
    true) + " | " + member.class + " ("+member.level+")": "("+member.tier+") "+ getDamageTypeIcon(member.damageType,
    true)} </p>
  ${xpBar}
  <div class="bar ${isPlayer ? "player-": isAlly ? "": "enemy-"}hp-bar">
  <div
  class="bar-fill"
  id="bar-fill-${member.id}-hp"
  style="width: ${(member.stats.hp.value / member.stats.maxHp.value) * 100}%;">
  </div>
  <div
  class="bar-text"
  id="bar-text-${member.id}-hp">
  HP (${member.stats.hp.value.toFixed(1)}/${member.stats.maxHp.value.toFixed(1)})
  </div>
  </div>
  ${infoBtn}
  ${statusBtn}
  <div class="row-bars">
  <div class="bar mp-bar">
  <div
  class="bar-fill"
  id="bar-fill-${member.id}-mp"
  style="width: ${(member.stats.mp.value / member.stats.maxMp.value) * 100}%;">
  </div>
  <div
  class="bar-text"
  id="bar-text-${member.id}-mp">
  MP (${member.stats.mp.value}/${member.stats.maxMp.value})
  </div>
  </div>

  <div class="bar sp-bar">
  <div
  class="bar-fill"
  id="bar-fill-${member.id}-sp"
  style="width: ${(member.stats.sp.value / member.stats.maxSp.value) * 100}%;">
  </div>
  <div
  class="bar-text"
  id="bar-text-${member.id}-sp">
  SP (${member.stats.sp.value}/${member.stats.maxSp.value})
  </div>
  </div>
  </div>
  `;

  // Append skills
  if (member.skills.equipped && member.skills.equipped.length > 0) {
    const skillsContainer = document.createElement("div");
    skillsContainer.className = "skills-container";
    skillsContainer.id = `skills-container-${member.id}`
    skillsContainer.style.display = 'grid';
    skillsContainer.style.gridTemplateColumns = 'repeat(auto-fit, inmax(30%, 100%))';


    member.skills.equipped.filter(skill => skill && (!skill.requiredTier || (skill.requiredTier && skill.requiredTier <= member.tier))).map(skill => skill.id).forEach(skillId => {
      let skillFrame = updateSkillUnitDisplay(skillId, member)
      if (skillFrame)
        skillsContainer.appendChild(skillFrame)
    });

    div.appendChild(skillsContainer);
  }

  return div;
}
function updateStatusButton(unit) {
  if (!player.inCombat || !unit.isAlive) {
    return;
  }
  const statusBtn = document.getElementById(`status-btn-${unit.id}`)
  if(!statusBtn){
    return;
  }
  if (!unit.buffs) {
    unit.buffs = [];
  }
  if (!unit.debuffs) {
    unit.debuffs = [];
  }
  if (!unit.conditions) {
    unit.conditions = [];
  }
  const currentTime = Date.now();
  let removeBuffs = [];
  let removeDebuffs = [];
  unit.buffs.forEach(buff => {
    if (buff.startTime + buff.duration <= currentTime) {
        removeBuffs.push(buff);
     }
  });
  unit.debuffs.forEach(debuff => {
    if (debuff.startTime + debuff.duration <= currentTime) {
      removeDebuffs.push(debuff);
    }
  })
  
  
  unit.buffs = unit.buffs.filter(buff => !removeBuffs.includes(buff));
  unit.debuffs = unit.debuffs.filter(debuff => !removeDebuffs.includes(debuff));
  if (unit.buffs.length === 0 && unit.debuffs.length === 0 && unit.conditions.length === 0) {
    statusBtn.style.background = "linear-gradient(#9c9,#696)"
  } else {
    statusBtn.style.background = "linear-gradient(#c55,#833)"
  }
  statusBtn.innerHTML = `
  <span style="flex: 1; display: flex; justify-content: center; align-items: center;
  background: linear-gradient(#060, #2a2);
  color: white;">${unit.buffs.length}</span>

  <span style="flex: 1; display: flex; justify-content: center; align-items: center;
  background: linear-gradient(#600, #a22);
  color: white;">${unit.debuffs.length}</span>

  <span style="flex: 1; display: flex; justify-content: center; align-items: center;
  background: linear-gradient(#306, #838);
  color: white;">${Object.keys(unit.conditions).length}</span>
  </button>`
}
function updateCombatBar(member, stat) {
  if (!member.isAlive || !player.inCombat) {
    clearInterval(regenIntervals[member.id])
    return;
  }
  const fillBar = document.getElementById(`bar-fill-${member.id}-${stat}`);
  const textBar = document.getElementById(`bar-text-${member.id}-${stat}`);
  if (!fillBar || !textBar || !member.stats[stat] || !member.stats[`max${stat.charAt(0).toUpperCase() + stat.slice(1)}`]) {
    const stack = new Error().stack;
    console.log(stack);
    console.warn(`Could not update bar: missing data for ${member.name} ${stat}`, member, combatUnits, document.getElementById("main-area").innerHTML);
    return;
  }

  let current = member.stats[stat].value;
  const max = member.stats[`max${capitalize(stat)}`].value;
  if (current > max) {
    member.stats[stat].value = max;
    current = member.stats[stat].value;
  }
  const percentage = (current / max) * 100;
  textBar.style.overflow = "auto"
  fillBar.style.width = `${percentage}%`;
  resizeTextToFitParent(textBar)
  textBar.textContent = `${stat.toUpperCase()} (${current.toFixed(1)}/${max.toFixed(1)})`;
}
function resizeTextToFitParent(element, maxFontSize = 100, minFontSize = 1) {
  if (!element || !element.parentElement) {
    console.error("cant reduce font size", element, new Error().stack)
    return;
  }
  const parent = element.parentElement;
  let fontSize = maxFontSize;

  element.style.whiteSpace = "nowrap"; // keep on one line

  // Try decreasing font size until it fits the parent's width
  while (fontSize > minFontSize && element.scrollWidth > parent.clientWidth) {
    fontSize--;
    element.style.fontSize = fontSize + "px";
  }
}
let lastError = 0;
function updateProgressBar(skillId, member) {
  const skill = skillsData[skillId];
  if (!skill) {
    if (lastError + 3000 > Date.now()) {
      return;
    }
    lastError = Date.now();
    console.error("updateProgressBar skill is null", skillId, skillsData);

  }
  
  const combatData = member.skills.combatData;
  const skillData = combatData.targets?.[skillId] || {};
  const hasTarget = skillData.target !== undefined && findUnitById(skillData.target);
  const requiresTarget = skill.requiresTarget;
  const isTargeting = targetting && skillToTarget === skillId && unitToCast === member.id;
  const isTargetAlive = hasTarget && findUnitById(skillData.target).isAlive
  const isOn = skillData.active;
  const canUnitAfford = canAfford(member, skill.cost)
  const innerBar = document.querySelector(`.progress-inner-bar[data-skill-id="${skillId}-${member.id}"]`);
  const barContainer = document.querySelector(`.progress-outer-bar[data-skill-id="${skillId}-${member.id}"]`);
  if (!barContainer || !innerBar || !combatData) return;
  let isStunned = member.conditions && member.conditions["Stunned"];
  
  if ((isCombatPaused || isStunned) && combatData.lastUsed[skillId]) {
    combatData.lastUsed[skillId] += updateSpeed
  }
  const lastUse = combatData.lastUsed[skillId] || 0;
  const cooldown = calculateSkillCooldown(member, skillId) || 0;
  if (cooldown == 0) {
    if (lastError + 3000 < Date.now()) {
      console.error("SKILL CD 0", member, skillId);
      lastError = Date.now()
    }
  }
      if(hasTarget){
        let hitChanceDiv = document.getElementById(member.id + "-" + skillId + "-hitChance")
        if(hitChanceDiv){
      let caster = member;
      let unit = findUnitById(skillData.target)
      let evStat = unit.stats.evasion
      let evasion = getStatValue("evasion", evStat, unit, undefined, undefined);
      let acStat = caster.stats.accuracy;
      let accuracy = getStatValue("accuracy", acStat, caster, unit, undefined) ;

      let hitChance = 1-getEvasionChance(accuracy, evasion);

      hitChanceDiv.textContent = "Hit Chance: " + (hitChance*100).toFixed(2)+"%";
      
        }
    }
  const now = Date.now(); // or Date.now(), but perf.now is higher resolution
  const elapsed = Math.max(0, now - lastUse)/1000;
  const pct = Math.min(1, elapsed / cooldown); // 0 to 1



  //if(player.inCombat){
  if (pct >= 1 && isOn && player.inCombat && member.isAlive) {
    //console.log(pct)
    castSkill(skillId, member, skillData && skillData.target != undefined?findUnitById(skillData.target): null)

  }
  if (pct < 1) {
    //  console.log(`pct ${Math.floor(pct * 100)}`)
  }
  let potentialTargets = getPotentialTargets(member, skillsData[skillId].target);
  
  if (!isTargetAlive && requiresTarget && isOn && potentialTargets.length > 0 && settings.autoTarget && player.inCombat) {
 //   console.error("forcing retarget", new Error().stack, potentialTargets, member, skillId)
    member.skills.combatData.targets[skillId].target = potentialTargets[0].id
  } else {}
  let label = document.getElementById(`${member.id}-${skillId}-target-display`)
  if (label && isStunned) {

    label.textContent = "Stunned";

  } else {
    if (hasTarget && label) {

      label.textContent = findUnitById(skillData.target).name;
    }
    if (!requiresTarget && label) {
      label.textContent = fromCamelCase(skill.target);
    }
  }
  if(!canUnitAfford && label){
    let costText = Object.keys(skill.cost).filter(c => skill.cost[c] > 0 && skill.cost[c] > member.stats[c].value).map(s => s.toUpperCase()).join(", ");
    label.textContent="Not Enough " + costText;
  }
  innerBar.style.background = isStunned?"linear-gradient(#838, #515)": canUnitAfford?!member.isAlive?"linear-gradient(#c44, #844)":isOn
  ? "linear-gradient(#4c4, #282)": !requiresTarget || (hasTarget && isTargetAlive)?"linear-gradient(#cb4,#863)":"linear-gradient(#c44, #844)":"linear-gradient(#080,#040)";
  innerBar.style.width = `${Math.floor(pct * 100)}%`;
  barContainer.style.background = isStunned?'#000': canUnitAfford?!member.isAlive?"linear-gradient(#c44,#844)":isOn
  ? "linear-gradient(#474, #252)": !requiresTarget || (hasTarget && isTargetAlive)?"linear-gradient(#874,#652)": "linear-gradient(#744, #522)":"linear-gradient(#050,#030)";
  if (label) {
    resizeTextToFitParent(label)
  }
  
  //  }
}
function fromCamelCase(text) {
  return text
  .replace(/([a-z])([A-Z])/g, '$1 $2') // insert space before capital letters
  .replace(/^./, str => str.toUpperCase()); // capitalize first letter
}

function updateSkillUnitDisplay(skillId, member) {
  const skill = skillsData[skillId];
  if (!skill || combatUnits.length == 0) {
    return
  }
  const skillData = member.skills.combatData.targets?.[skillId] || {};
  const requiresTarget = skill.requiresTarget;
  const isOn = skillData.active;
  const hasTarget = skillData.target !== undefined && findUnitById(skillData.target);
  const isTargeting = targetting && skillToTarget === skillId && unitToCast === member.id;
  const isTargetAlive = hasTarget && findUnitById(skillData.target).isAlive
  const skillDiv = document.createElement("div");
  skillDiv.id = `${member.id}-${skillId}-skill-block`;
  skillDiv.className = "skill-block";
  skillDiv.style.display = "flex";
  skillDiv.style.flexDirection = "column";
  skillDiv.style.alignItems = "center";
  skillDiv.style.border = "1px solid black";
  skillDiv.style.padding = "0.5em";
  skillDiv.style.cursor = "default";

  // Skill name
  const nameDiv = document.createElement("div");
  nameDiv.innerHTML = `<strong>${skill.name} ${member.skills.equipped.find(sk => sk.id == skillId).level}</strong>`;
  nameDiv.onclick = (e) => {
    if (!targetting) {
      e.stopPropagation();
      showSkillPopup(skillId, true, member);
    }
  };
  skillDiv.appendChild(nameDiv);

  // Progress bar outer container
  const barContainer = document.createElement("div");
  barContainer.style.position = "relative";
  barContainer.style.width = "90%";
  barContainer.style.height = "12px";
  barContainer.style.borderRadius = "0.5em";
  barContainer.style.marginTop = ".1em";
  barContainer.style.marginBottom = "0.5em";
  barContainer.style.border = "1px solid black";
  barContainer.className = "progress-outer-bar";
  barContainer.dataset.skillId = `${skillId}-${member.id}`
  barContainer.style.overflow = "hidden";
  barContainer.style.cursor = "pointer";
  barContainer.style.background = isOn
  ? "linear-gradient(#474, #252)": !requiresTarget || (hasTarget && isTargetAlive)?"linear-gradient(#874,#652)": "linear-gradient(#744, #522)";

  // Inner fill bar
  const innerBar = document.createElement("div");
  innerBar.className = "progress-inner-bar";
  innerBar.dataset.skillId = `${skillId}-${member.id}`
  innerBar.style.position = "absolute";
  innerBar.style.top = "0";
  innerBar.style.left = "0";
  innerBar.style.height = "100%";

  //This will be updated by updateProgressBar
  innerBar.style.background = isOn
  ? "linear-gradient(#4c4, #282)": !requiresTarget || (hasTarget && isTargetAlive)?"linear-gradient(#cb4,#863)": "linear-gradient(#c44, #844)";
  innerBar.style.transition = "width "+(updateSpeed/1000)+"s ease";
  innerBar.style.zIndex = "1";

  // Overlay label
  
    const label = document.createElement("div");
    label.id = `${member.id}-${skillId}-target-display`;

    label.style.position = "absolute";
    label.style.top = "0";
    label.style.left = "0";
    label.style.width = "100%";
    label.style.height = "100%";
    label.style.display = "flex";

    label.style.justifyContent = "center";
    label.style.fontSize = "0.5em";
    label.style.color = "#fff";
    label.style.pointerEvents = "none";
    label.style.zIndex = "2";
    if (hasTarget) {
      let target = findUnitById(skillData.target)
      if(target){
      label.textContent = target.name;
      }
    } else if(!requiresTarget){
      label.textContent = fromCamelCase(skill.target)
    }
    barContainer.appendChild(label);
    resizeTextToFitParent(label)
  

  barContainer.appendChild(innerBar);

  barContainer.onclick = (e) => {
    if (targetting || !(member.isAlly || member.isPlayer)) return;
    e.stopPropagation();
    const skillEntry = member.skills.combatData.targets?.[skillId];

    if (skillEntry) {
      toggleSkill(member.id, skillId);
      innerBar.style.background = isOn
      ? "linear-gradient(#4c4, #282)": !requiresTarget || (hasTarget && isTargetAlive)?"linear-gradient(#cb4,#863)": "linear-gradient(#c44, #844)";
    }
  };
  
  skillDiv.appendChild(barContainer);

  // Bottom row with Target + Info button
  const bottomRow = document.createElement("div");
  bottomRow.style.display = "flex";
  bottomRow.style.justifyContent = "space-between";
  bottomRow.style.width = "100%";
  bottomRow.style.marginTop = "0.3em";

  if (member.isAlly && requiresTarget) {
    const targetBtn = document.createElement("button");
    targetBtn.className = "target-skill-btn";
    targetBtn.textContent = isTargeting
    ? "Untarget": hasTarget
    ? "Retarget": "Target";
    targetBtn.onclick = (e) => {
      e.stopPropagation();
      skillToTarget = skillId;
      unitToCast = member.id;
      startTargetting(skillId, member.id);
    };
    bottomRow.appendChild(targetBtn);
  }
          let hitChanceDiv = document.createElement("div");
      hitChanceDiv.id = member.id + '-'+skillId+'-hitChance'
      hitChanceDiv.style.fontSize = "0.7em"
    if(hasTarget){
      let caster = member;
      let unit = findUnitById(skillData.target)
      let evStat = unit.stats.evasion
      let evasion = getStatValue("evasion", evStat, unit, undefined, undefined);
      let acStat = caster.stats.accuracy;
      let accuracy = getStatValue('accuracy', acStat, caster, unit, undefined) ;

      let hitChance = 1-getEvasionChance(accuracy, evasion);

      hitChanceDiv.textContent = "Hit Chance: " + (hitChance*100).toFixed(2)+"%";
      
      
    }
    bottomRow.appendChild(hitChanceDiv)
  



  skillDiv.appendChild(bottomRow);

  return skillDiv;
}
function zoneUnitReport(zone){
  const units = loreDataCache.zones[zone].units;
  let logReport = ["Starting Unit Report: " + zone];
 // console.log(zone, units)
 let unitsToFinish = [];
  for(let u of units) {
    logReport.push("Analyzing Unit " + u.name);
    let unitData = getUnitDataFromType(u.name)
    if (!unitData) {
      logReport.push("Unit not found");
      logReport.push(JSON.stringify(u, null, 2));
      unitsToFinish.push(u.name);
      continue;
    };
    if (unitData.skills.equipped.length == 0) {
      logReport.push("Unit has no skills");
      unitsToFinish.push(u.name)
      continue
    }
    logReport.push("Analyzing skills...");
    unitData.skills.equipped.forEach(s => {
      if(!s){
        logReport.push("Found undefined skill");
        logReport.push(JSON.stringify(s, null, 2));
        unitsToFinish.push(u.name)
      }else if(!s.id){
        logReport.push("Skill has no id")
        logReport.push(JSON.stringify(s, null, 2))
        unitsToFinish.push(u.name)
      }else if(!skillsData[s.id]){
        logReport.push("Skill " + s.id + " not designed yet.");
        unitsToFinish.push(u.name)
      }
    });
  }
  console.log(logReport.join(", "))
  return unitsToFinish;
  
}
function findUnitsForZone(zone, tier) {
  const units = loreDataCache.zones[zone].units;
 // console.log(zone, units)
  const eligibleUnits = units
  .filter(u => tier >= u.levels.min && tier <= u.levels.max)
  .filter(u => {
    let unitData = getUnitDataFromType(u.name)
    if (!unitData) return false;
    if (unitData.skills.equipped.length == 0) {
      return true;
    }
    return unitData.skills.equipped.every(s => s && s.id && skillsData[s.id]);
  });
 // console.log(zone, eligibleUnits)
  return eligibleUnits;
}
function getRandomUnit(isAlly, tier, zone) {
  const units = loreDataCache.zones[zone].units;
  
  // Filter units based on tier within level range
  let eligibleUnits = findUnitsForZone(zone,
    tier);
  tier = getEffectiveTier(zone,
    tier);
  if (eligibleUnits.length === 0) {
    console.warn("No eligible units found for tier " + tier + " in zone " + zone);
    return null;
  }
  // Calculate total weight
  const totalWeight = eligibleUnits.reduce((sum, u) => sum + u.weight, 0);

  // Pick a random value between 0 and total weight
  let rand = Math.random() * totalWeight;

  // Select a unit based on weight
  let selected;
  for (let i = 0; i < eligibleUnits.length; i++) {
    rand -= eligibleUnits[i].weight;
    if (rand <= 0) {
      selected = eligibleUnits[i];
      break;
    }
  }

  // Fallback in case something went wrong
  if (!selected) selected = eligibleUnits[eligibleUnits.length - 1];

  // Find the full unit data from unitsData
  const unitBase = unitsData.find(u => u.name === selected.name);
  if (!unitBase) {
    console.error("Unit not found in unitsData:", selected.name);
    return null;
  }

  // Create and return the unit
  let unit = createUnit(unitBase.name.toLowerCase(), isAlly, tier);
  unit.debuffs = [];
  unit.buffs = [];
  unit.conditions = [];
  unit.isAlive = true;
  recalculateDerivedStats(unit);
  unit.stats.hp.value = unit.stats.maxHp.value;
  return unit;
}
function killUnit(unit, killer){
  unit.isAlive = false;
  let frame = document.getElementById(unit.id + "-unit-box");
  if(unit.isSummon && frame){
    frame.remove()
  }

  deathEvent.emit({target: unit, killer: killer});
}
function updateUnitRegens(unit) {
  if (unit.stats.hp.value <= 0) {
    killUnit(unit)
    checkIfCombatFinished();
    return;
  }
  if (unit.stats.hp.value < unit.stats.maxHp.value && unit.isAlive) {
    unit.stats.hp.value = Math.max(0, Math.min(unit.stats.maxHp.value, unit.stats.hp.value + unit.stats.hpRegen.value))
    updateCombatBar(unit, "hp");
  }
  if (unit.stats.sp.value < unit.stats.maxSp.value && unit.isAlive) {
    unit.stats.sp.value = Math.max(0, Math.min(unit.stats.maxSp.value, unit.stats.sp.value + unit.stats.spRegen.value))
    updateCombatBar(unit, "sp");
  }
  if (unit.stats.mp.value < unit.stats.maxMp.value && unit.isAlive) {
    unit.stats.mp.value = Math.max(0, Math.min(unit.stats.maxMp.value, unit.stats.mp.value + unit.stats.mpRegen.value))
    updateCombatBar(unit, "mp");
  }
}
function createUnit(unitType, isAlly, tier) {
  let unitBase = JSON.parse(JSON.stringify(getUnitDataFromType(unitType)));
  unitBase.id = generateUniqueUnitID();
  unitBase.isAlly = isAlly;
  unitBase.tier = tier;
  Object.keys(unitBase.attributes).forEach(attr => {
    unitBase.attributes[attr] = unitBase.attributes[attr] + Math.floor(unitBase.attributesPerLevel[attr]*tier);
  })
  unitBase.skills.equipped = unitBase.skills.equipped.filter(skill => {
  return !skill.tierRequired || skill.tierRequired <= unitBase.tier;
});
  unitBase.stats.hp.value = unitBase.stats.maxHp.value

  return unitBase
}
document.addEventListener("click", function () {
  document.querySelectorAll(".popup").forEach(popup => popup.remove());
});
function getDamageTypeIcon(damageType, clickable) {
  let onClick = `onclick="setTimeout(() =>{ showDamageTypePopup('${damageType.toLowerCase()}')},1);"`
  return `<span class="icon ${damageType.toLowerCase()}" ${onClick}></span>`;
}
//POPUPS
function showSkillPopup(skillId, inCombat, member, unitByName, unitById) {
  if (unitByName) {
    member = getUnitDataFromType(unitByName);
  }
  if(unitById == 0){
    member = player
  }
  const skill = skillsData[skillId];
  if (!skill) {
    console.error(`skill not found: ${skillId}`);
    return;
  }

  const existingPopup = document.getElementById("popup-overlay");
  if (existingPopup) existingPopup.remove();

  const overlay = document.createElement("div");
  overlay.id = "popup-overlay";
  Object.assign(overlay.style, {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    zIndex: 999,
    background: "rgba(0,0,0,0.0)"
  });
  overlay.addEventListener("click", () => overlay.remove());

  const popup = document.createElement("div");
  popup.className = "popup";
  Object.assign(popup.style, {
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    zIndex: 1000,
    backgroundColor: "#111",
    color: "#fff",
    padding: "10px",
    border: "2px solid #444",
    borderRadius: "10px",
    maxWidth: "80vw",
    maxHeight: "80vh",
    overflowY: "auto",
    boxShadow: "0 0 10px #000"
  });
  let mpEfficiency = member.stats?.mpEfficiency.value || 1;
  let spEfficiency = member.stats?.spEfficiency.value || 1;
  const costParts = [];
  if (skill.cost?.mp * mpEfficiency) costParts.push(`${skill.cost.mp} MP`);
  if (skill.cost?.sp * spEfficiency) costParts.push(`${skill.cost.sp} SP`);
  if (skill.cost?.hp) costParts.push(`${skill.cost.hp} HP`);
  const costString = costParts.length ? costParts.join(", "): "No cost";

  let effectsTableRows = "";
  let skillFound = member.skills.equipped.find(s => s && s.id == skillId)
  let skillLevel = 1
  if(!skillFound || !skillFound.level){
    skillFound = member.skills.learned.find(s => s && s.id == skillId);
    
  }
  if(skillFound && skillFound.level){
      skillLevel = skillFound.level
    }
  if (skill.effects) {
    effectsTableRows = skill.effects.map(e => {
      let desc = "";
      switch (e.type) {
        case "damage":
          const isPhysicalType = isPhysical(e.damageType);

          let targetFlag = false;
          let scalingText = "";
          if (e.scaling) {
            e.scaling.forEach(sc => {
              scalingText += ` + (${sc.scale} x ${fromCamelCase(sc.target)} ${fromCamelCase(sc.stat)})`
              if (sc.target != "caster") {
                targetFlag = true;
              }
            })
          }
          if (!targetFlag) {
            desc = `Deal ${calculateEffectiveValue(e, skillId,  member, undefined, skillLevel)} damage. `;
          } else {
            desc = `Deal damage equal to `
          }
          desc += `<span style="color: #999">(${e.base.toFixed(2)}${scalingText})</span>`
          break;
        
        case "summon":
          let isAlly = e.isAlly
          let unitName = e.unit;
          let unitTier = e.tier;
          desc = `Summon an ${isAlly?"allied": "enemy"} ${unitName} (${unitTier})`
          break;
        case "cleanse":
          let toCleanse = e.name;
          let stacks = e.stacks || "all"
          desc = `Cleanse ${stacks} stacks of ${toCleanse}`
          break;
        case "energySiphon":
          let amount = calculateEffectiveValue(e, skillId, member, null, skillLevel)
          desc = `Steal ${amount} ${capitalize(e.energyType)} from the enemy.`
          break;
        case "buff":
        case "debuff":
          e.value = calculateEffectiveValue(e.value, skillId, member, undefined, skillLevel)
          const sign = (e.effect === "multi" ? "×":e.type == "buff"? "+":"-");
          
          e.duration = calculateEffectiveValue(e.duration, skillId, member, undefined, skillLevel)
          if(e.resistanceType){
            desc = `${capitalize(e.resistanceType)} Damage Taken * ${(e.value).toFixed(2)} for ${(e.duration/1000).toFixed(2)}s`
            break;
          }
          value = e.value.toFixed(2);
          
          desc = `${sign}${value} ${fromCamelCase(e.stat)} for ${(e.duration / 1000).toFixed(2)}s`;

          break;
        case "dot":
          desc = `${e.base} ${edamageType || "neutral"} over ${e.duration}s`;
          break;
        case "condition":
          if (e.name && conditionsData[e.name] && e.stacks) {
            let targetFlag = false;
            let scalingText = "";
            if (e.stacks.scaling) {
              e.stacks.scaling.forEach(sc => {
                if (sc.target == "caster") {
                  scalingText += ` + (${sc.scale} x ${sc.target}'s ${fromCamelCase(sc.stat)})`
                } else {
                  targetFlag = true;
                }
              })
            }
            desc = `Apply ${calculateEffectiveValue(e.stacks, skillId,
              member,
              undefined,
              skillLevel)} stack(s) of ${e.name} <span style="color: #999">(${e.stacks.base.toFixed(2)}${scalingText})</span>`;
          }
          break;
        default:
          desc = "Unknown effect";
        }

        return `
        <tr>
        <td style="border: 1px solid #333; padding: 4px;">${e.type == "damage" || e.type == "dot"?getDamageTypeIcon(e.damageType) + " ": ""}${e.type}</td>
        <td style="border: 1px solid #333; padding: 4px;">${e.target ? fromCamelCase(e.target): skill.target ? fromCamelCase(skill.target): "-"}</td>
        <td style="border: 1px solid #333; padding: 4px;">${desc}</td>
        </tr>
        `;
      }).join("");
    }
    let initCdHtml = "";
    if(skill.initialCooldown){
      initCdHtml = `<tr><th style="text-align:left; border-bottom: 1px solid #444;">Initial Cooldown</th><td style="border-bottom: 1px solid #444;">${skill.initialCooldown.toFixed(2)}s</td></tr>`
    }

    let perCombatMaxHtml = "";
    if (skill.perCombatMax !== undefined) {
      perCombatMaxHtml = `<tr><th style="text-align:left; border-bottom: 1px solid #444;">Per Combat Max Uses</th><td style="border-bottom: 1px solid #444;">${skill.perCombatMax}</td></tr>`
    }

    popup.innerHTML = `
    <div style="font-size: 18px; font-weight: bold; color: #0bf;">${skill.name}</div>
    <div style="color: #aaa; margin-top: 6px;">${Array.isArray(skill.description)?skill.description.join("<br>- "):skill.description || "No description provided."}</div>

    <button id="toggle-details-btn" style="margin-top: 10px; padding: 4px 10px; background: #222; border: 1px solid #555; color: #0bf; border-radius: 4px; cursor: pointer;">
    See More
    </button>

    <div id="skill-details-section" style="display: none; margin-top: 10px;">
    <table style="width: 100%; border-collapse: collapse;">
    <tr><th style="text-align:left; border-bottom: 1px solid #444;">Cost</th><td style="border-bottom: 1px solid #444;">${costString}</td></tr>
    <tr><th style="text-align:left; border-bottom: 1px solid #444;">Cooldown</th><td style="border-bottom: 1px solid #444;">${calculateSkillCooldown(member,
      skillId).toFixed(2)}s</td></tr>
      ${initCdHtml}
      ${perCombatMaxHtml}
    <tr><th style="text-align:left; border-bottom: 1px solid #444;">Target</th><td style="border-bottom: 1px solid #444;">${fromCamelCase(skill.target) || "None"}</td></tr>
    </table>

    ${effectsTableRows ? `
    <div style="margin-top: 12px; font-weight: bold; color: #0bf;">Effects:</div>
    <table style="margin-top: 6px; width: 100%; border-collapse: collapse;">
    <tr style="background: #222;">
    <th style="text-align:left; border: 1px solid #333; padding: 4px;">Type</th>
    <th style="text-align:left; border: 1px solid #333; padding: 4px;">Target</th>
    <th style="text-align:left; border: 1px solid #333; padding: 4px;">Description</th>
    </tr>
    ${effectsTableRows}
    </table>`: ''}
    </div>
    `;

    overlay.appendChild(popup);
    document.body.appendChild(overlay);

    // Add toggle button logic
    const toggleBtn = document.getElementById("toggle-details-btn");
    const detailsSection = document.getElementById("skill-details-section");
    toggleBtn.addEventListener("click",
      (e) => {
        e.stopPropagation();
        const isVisible = detailsSection.style.display === "block";
        detailsSection.style.display = isVisible ? "none": "block";
        toggleBtn.textContent = isVisible ? "See More": "See Less";
      });
}
  function findSkillLevelScalingPaths(obj) {
    const results = [];

    function recursiveSearch(value, path = []) {
      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          recursiveSearch(item, [...path, index]);
        });
      } else if (typeof value === 'object' && value !== null) {
        if ('scaling' in value && Array.isArray(value.scaling)) {
          const hasSkillLevel = value.scaling.some(s => s.stat === 'skillLevel');
          if (hasSkillLevel) {
            results.push(path);
          }
        }

        for (const key in value) {
          recursiveSearch(value[key], [...path, key]);
        }
      }
    }

    recursiveSearch(obj);
    return results;
  }
  function calculateTalentCooldown(unit, talentId, effect){
    let skill = talentsData[talentId];
    if(!unit || !skill){
      console.error("calculateTalentCooldown error");
      return 0;
    }
        let cdr = 1;
    if (unit.stats.cooldownReduction && unit.stats.cooldownReduction.value > 0) {
      cdr = unit.stats.cooldownReduction.value;
    } else {
      console.error(`Unit ${unit.name} has no cdr`)
      cdr = 1;
    }
    
    let skillLevel = 0;

    skillFound = unit.skills.learned.find(s => s && s.id === talentId);
    if(skillFound && skillFound.level){
      skillLevel = skillFound.level;
    }else{
      console.error("SKILL NOT FOUND", talentId)
    }
    let cd = cdr*calculateEffectiveValue(effectcooldown, skillId, unit, undefined, skillLevel);
    if(skill.cooldown.min){
      cd = Math.max(skill.cooldown.min, cd);
    }
    if(skill.cooldown.max){
      cd = Math.min(skill.cooldown.max, cd);
    }
    return Math.max(updateSpeed/1000,
      cd);
  }
  function calculateSkillCooldown(unit, skillId) {
    let skill = skillsData[skillId];
    if (!unit || !skill) {
       console.error("calculateSkillCooldown skill or unit not found", unit, skill, skillId);
      return 0;
      
    }
    let cdr = 1;
    if (unit.stats.cooldownReduction && unit.stats.cooldownReduction.value > 0) {
      cdr = unit.stats.cooldownReduction.value;
    } else {
      console.error(`Unit ${unit.name} has no cdr`)
      cdr = 0.01;
    }
    let skillFound = unit.skills.equipped.find(s => s && s.id === skillId);
    let skillLevel = 0;
    if(!skillFound || !skillFound.level){
      
      skillFound = unit.skills.learned.find(s => s && s.id === skillId);
    }
    if(skillFound && skillFound.level){
      skillLevel = skillFound.level;
    }else{
      console.error("SKILL NOT FOUND", skillId)
    }
    let cd = cdr*calculateEffectiveValue(skill.cooldown, skillId,unit, undefined, skillLevel);
    if(skill.cooldown.min){
      cd = Math.max(skill.cooldown.min, cd);
    }
    if(skill.cooldown.max){
      cd = Math.min(skill.cooldown.max, cd);
    }
    return Math.max(updateSpeed/1000,
      cd);
  }
  function showItemPopup(item) {
  const existingPopup = document.getElementById("popup-overlay");
  if (existingPopup) existingPopup.remove();

  const overlay = document.createElement("div");
  overlay.id = "popup-overlay";
  overlay.style.position = "fixed";
  overlay.style.top = 0;
  overlay.style.left = 0;
  overlay.style.width = "100vw";
  overlay.style.height = "100vh";
  overlay.style.zIndex = 999;
  overlay.style.background = "rgba(0,0,0,0.0)";
  overlay.addEventListener("click", () => overlay.remove());

  const popup = document.createElement("div");
  popup.className = "popup";
  popup.style.position = "absolute";
  popup.style.left = "50%";
  popup.style.top = "50%";
  popup.style.transform = "translate(-50%, -50%)";
  popup.style.zIndex = 1000;
  popup.style.backgroundColor = "#111";
  popup.style.color = "#fff";
  popup.style.padding = "10px";
  popup.style.border = "2px solid #444";
  popup.style.borderRadius = "10px";
  popup.style.maxWidth = "80vw";
  popup.style.maxHeight = "80vh";
  popup.style.overflowY = "auto";
  popup.style.boxShadow = "0 0 10px #000";

  let oreDiv = item.ores && item.ores.length > 0
    ? `<div style="color: #aaa; margin-top: 6px;">Alloy: ${item.ores.map(obj => {
        let key = Object.keys(obj)[0];
        return `${key} (${obj[key]})`;
      }).join(', ')}</div>`
    : "";

  let oreBonusDiv = item.oreBonuses && Object.keys(item.oreBonuses).length > 0
    ? `<div style="color: #8cf; margin-top: 6px;">Alloy Bonuses:<br>${Object.entries(item.oreBonuses).map(
        ([stat, multi]) => `- ${fromCamelCase(stat)}: ×${multi.toFixed(3)}`
      ).join('<br>')}</div>`
    : "";

  let gearBonusDiv = item.gearBonuses && Object.keys(item.gearBonuses).length > 0
    ? `<div style="color: #fc8; margin-top: 6px;">Gear Bonuses:<br>${Object.entries(item.gearBonuses).map(
        ([stat, { multi, count }]) => {
          const stars = "⭐".repeat(Math.max(0, count - 1));
          return `- ${fromCamelCase(stat)}: ×${multi.toFixed(3)} ${stars}`;
        }
      ).join('<br>')}</div>`
    : "";

  let resistanceDiv = item.totalResistances && Object.keys(item.totalResistances).length > 0
    ? `<div style="color: #8d8; margin-top: 6px;">Resistances:<br>${Object.entries(item.totalResistances).map(
        ([type, value]) => `- ${capitalize(type)} ${getDamageTypeIcon(type)}: ×${value.toFixed(3)}`
      ).join('<br>')}</div>`
    : "";

  popup.innerHTML = `
    <div style="color: ${itemQualities[item.quality || "common"]}; font-size: 18px; font-weight: bold;">${item.name} ${item.tier ? "(T" + item.tier + ")" : ""}</div>
    <div style="color: #aaa; margin-top: 8px;">${item.quality ? capitalize(item.quality) + " " : ""}${item.type}</div>
    <div style="color: #aaa; margin-top: 4px;">${item.type == "Gear" ? "A wearable item" : item.description || "This item has no description."}</div>
    ${oreDiv}
    ${oreBonusDiv}
    ${gearBonusDiv}
    ${resistanceDiv}
  `;

  overlay.appendChild(popup);
  document.body.appendChild(overlay);
}
  function getDirectParentBreakdownString(type) {
    const breakdownMap = damageTypeBreakdown
    type = type.toLowerCase();
    const parents = breakdownMap[type];
    if (!parents) return `${getDamageTypeIcon(type)} × 100%`; // It's a root

    return Object.entries(parents)
        .map(([parent, value]) => `${getDamageTypeIcon(parent)} × ${Math.round(value * 100)}%`)
        .join(" ");
}
  function showDamageTypePopup(damageType) {

    if (targetting) {
      return;
    }
    const bonuses = getEffectiveMultipliers(damageType);
    const resistances = getEffectiveResistances(damageType);
  
    const vulnerableTo = Object.entries(resistances)
    .filter(([type, value]) => value > 1)
    .map(([type, value]) => ({ source: type, value: value }));

    const resistantTo = Object.entries(resistances)
    .filter(([type, value]) => value < 1)
    .map(([type, value]) => ({ source: type, value: value }));
    const bonusDamage = bonuses.filter(b => b.value > 1);
    const lessDamage = bonuses.filter(b => b.value < 1);
    
    const formatList = (arr, key) =>
    arr.map(entry => `<li>${capitalize(entry[key])} ${getDamageTypeIcon(entry[key])} × ${entry.value}</li>`).join("");
    const breakdown = damageTypeBreakdown[damageType.toLowerCase()];
    let breakdownText = undefined;
    if(breakdown){
       breakdownText = getDirectParentBreakdownString(damageType);

    }
    
    const popup = document.createElement("div");
    popup.className = "popup";

    popup.innerHTML = `
    <div class="popup-header">
    <strong>${capitalize(damageType)} ${getDamageTypeIcon(damageType)}</strong>
    </div>
    <div>Parents: ${breakdownText || "None"}</div>
    <div class="popup-section">
    <h4>Bonus Damage Against:</h4>
    <ul>${formatList(bonusDamage, "target")}</ul>
    </div>
    <div class="popup-section">
    <h4>Less Damage Against:</h4>
    <ul>${formatList(lessDamage, "target")}</ul>
    </div>
    <div class="popup-section">
    <h4>Vulnerable Against:</h4>
    <ul>${formatList(vulnerableTo, "source")}</ul>
    </div>
    <div class="popup-section">
    <h4>Resistant Against:</h4>
    <ul>${formatList(resistantTo, "source")}</ul>
    </div>
    `;

    document.body.appendChild(popup);


    // Delay attaching the click listener so the current click doesn't trigger it
    setTimeout(() => {
      const closeHandler = () => {
        popup.remove();
        document.removeEventListener("click", closeHandler);
      };

      document.addEventListener("click", closeHandler);
    }, 0);

    // Prevent click inside the popup from closing it

  }
  //SKILL logic
  function castSkill(skillId, caster, target) {
    //console.log(skillId
    if (caster.conditions && caster.conditions["Stunned"]) return;
    const skill = skillsData[skillId];
    if (!skill) return;

    // console.log("csst7jg")
    // Check cost and cooldown
    if (!canAfford(caster, skill.cost)){
      return;
    } 
    let skillFound = caster.skills.equipped.find(s => s && s.id == skillId);
    if(!skillFound){
      skillFound = caster.skills.learned.find(s => s && s.id == skillId);
    }
    if(!caster.skills.combatData.perCombat){
      caster.skills.combatData.perCombat = {
        [skillId]: 0
      }
    }
    let castAmount = caster.skills.combatData.perCombat[skillId];
    if(castAmount === undefined){
      caster.skills.combatData.perCombat[skillId] = 0;
      castAmount = 0;
    }
    let perCombatMax = 0;
    if(skill.perCombatMax){
      perCombatMax = calculateEffectiveValue(skill.perCombatMax, skill, caster, undefined, skillFound.level)
    }
    if(perCombatMax && perCombatMax <= castAmount){
      return;
    }
    caster.skills.combatData.perCombat[skillId]++;
    
    let statBonuses = skill.statBonuses;

    spendResources(caster, skill.cost);
    
    caster.skills.combatData.lastUsed[skillId] = Date.now();
    // Execute effects (if any)
    let originalTarget = target;
    target = getTarget(caster, target, skill.target);
    if(skill.flavorText){
      updateCombatLog(skill.flavorText.replaceAll("{casterName}", caster.name).replaceAll("{targetName}", !Array.isArray(target)?target.name:"Fix Later"), caster, ["flavorText", caster.isAlly?"ally":"enemy"])
    }

    if (skill.effects) {
      let skillContext = {
        target: target,
        caster: caster,
        id: skillId,
        statBonuses: statBonuses
      }
      for (const effect of skill.effects) {
        if (effect)
          applyEffect(effect, caster, target, skillId, originalTarget, skillContext);
      }
    }

    // Execute custom code if defined
    potentialTargets = getPotentialTargets(caster, skill.target)
    if (potentialTargets.length > 0 && settings.autoTarget && (!originalTarget || !originalTarget.isAlive)) {
      caster.skills.combatData.targets[skillId].target = potentialTargets[0].id
      caster.skills.combatData.targets[skillId].active = true
    }
    castSkillEvent.emit({skillId: skillId, caster: caster, target: target})
  }
  function createListenerCallback(effect, unit, talentId) {
  return (event) => {
    if (!passesTriggerConditions(effect, event, unit, talentId)) return;
    if(!unit.skills.combatData.perCombat){
      unit.skills.combatData.perCombat={};
    }
    if(!unit.skills.combatData.perCombat[talentId]){
      unit.skills.combatData.perCombat[talentId] = 0;
    }
    unit.skills.combatData.perCombat[talentId] += 1;
    if(!unit.skills.combatData.lastUse){
      unit.skills.combatData.lastUse = {}
    }
    unit.skills.combatData.lastUse[talentId] = Date.now();
    let skillContext = {
      target: event.target || null,
      caster: event.caster || null,
      id: talentId,
      unitSummoned: event.unitSummoned || null
    }
    
    if(!event.target && event.unitSummoned){
      event.target = event.unitSummoned
    }
    for (let eff of effect.effects) {
    applyEffect(eff, unit, event.target, talentId, undefined, skillContext);
    }
  };
}
function passesTriggerConditions(effect, event, unit, talentId) {
  const talentInfo = unit.skills.learned.find(s => s.id == talentId);
  if(!talentInfo){
    return false;
  }
  if(!talentInfo.active){
    return false;
  }
  const trigger = effect.trigger;
  if (trigger.condition && event.effect?.name !== trigger.condition) return false;
  if (trigger.target && trigger.target !== "any") {
    console.log("uh",event)
    const targets = getPotentialTargets(unit, undefined, trigger.target, talentId);
    if (!targets.includes(event.target)) return false;
    console.log("passed")
  }
  if (trigger.caster && trigger.caster !== "any") {
    const casters = getPotentialTargets(unit, trigger.caster);
    if (!casters.includes(event.caster)) return false;
  }
  if(trigger.skillId && trigger.skillId != "any" && event.skillId  != trigger.skillId){
    return false;
  }
  if(trigger.unitName && (!event.unitSummoned || event.unitSummoned.name != trigger.unitName)){
    console.log("wrong unit", trigger.unitName, event.unitSummoned?event.unitSummoned.name:"No unit summoned")
    return false;
  }
  if(trigger.cooldown){
    if(unit.skills.combatData.lastUse[talentId] && unit.skills.combatData.lastUse[talentId] + calculateTalentCooldown(unit, talentId, trigger) > Date.now()){
      return false;
    }
  }
  if(trigger.damageType && trigger.damageType != event.damageType){
    return false;
  }
  if(trigger.perCombatMax){
    
    if(!unit.skills.combatData.perCombat){
      unit.skills.combatData.perCombat = {}
    }
    let castsThisCombat = unit.skills.combatData.perCombat[talentId] || 0;
    
    if(castsThisCombat >= trigger.perCombatMax){
      return false;
    }
    
  }
  if(trigger.stat && trigger.stat != "any" && trigger.stat != event.stat){
    return false;
  }
  return true;
}
  function isPhysical(damageType) {
    let physicalTypes = ["slashing",
      "blunt",
      "piercing",
      "force"];
    return physicalTypes.includes(damageType.toLowerCase())
  }
  function calculateAttributes(unit){
    if(!unit.attributesGained){
      return;
    }
    for(let attrName of Object.keys(unit.attributesGained)){
        let base = unit.attributesGained[attrName] ?? 0;
        
    let additiveBuff = 0;
    let multiplierBuff = 1;
    const talentEffects = [].concat(...unit.skills.learned
  .filter(s => s && s.type === "talent" && s.active)
  .flatMap(t => 
    (talentsData[t.id]?.effects || []).map(effect => ({
      talentId: t.id,
      talentData: effect
    }))
  )
  .filter(e => e.talentData?.type === "attrBonus" && e.talentData.stat === attrName));
    // Handle buffs
    if (talentEffects && talentEffects.length > 0) {
      talentEffects.forEach(eff => {
        let skillLevel = unit.skills.learned.find(s => s.id == eff.talentId).level || 0
        if (eff.talentData.type === "attrBonus" && eff.talentData.stat == attrName) {
          if (eff.talentData.effect === "add") {
            additiveBuff += eff.talentData.base + eff.talentData.perLevel*(skillLevel-1);
            
          } else if (eff.talentData.effect === "multi") {
            multiplierBuff *= (eff.talentData.base * Math.pow(eff.talentData.perLevel, skillLevel))
          }
        }
      });
      
      
    }
    unit.attributes[attrName] = (base + additiveBuff) * multiplierBuff
    }
    
  }
  function getEffectiveAttribute(unit, attrName) {
    let base = unit.attributes[attrName] ?? 0;

    let additiveBuff = 0;
    let multiplierBuff = 1;

    let additiveDebuff = 0;
    let multiplierDebuff = 1;

    const now = Date.now();

    // Handle buffs
    if (unit.buffs && Array.isArray(unit.buffs)) {
      unit.buffs.forEach(buff => {
        if (
          buff.statType === "attribute" &&
          buff.stat === attrName &&
          (buff.startTime + buff.duration > now)
        ) {
          if (buff.effect === "add") {
            additiveBuff += buff.value;
          } else if (buff.effect === "multi") {
            multiplierBuff *= buff.value;
          }
        }
      });
    }

    // Handle debuffs
    if (unit.debuffs && Array.isArray(unit.debuffs)) {

      unit.debuffs.forEach(debuff => {
        if (
          debuff.statType === "attribute" &&
          debuff.stat === attrName &&
          (debuff.startTime + debuff.duration > now)
        ) {
          if (debuff.effect === "add") {
            additiveDebuff += debuff.value; // typically negative
          } else if (debuff.effect === "multi") {
            multiplierDebuff *= debuff.value;
          }
        }
      });
    }

    // Apply in order: buffs first, then debuffs
    let effective = (base + additiveBuff) * multiplierBuff;
    effective = (effective + additiveDebuff) * multiplierDebuff;

    return effective;
  }
  function getTarget(caster, target, targetType, skillContext) {
    if(targetType == "singleAlly" || targetType == "singleEnemy"){
      if(!target){
        console.error("no target found", new Error().stack)
      }
      return target;
    }
    let livingUnits = combatUnits.filter(u => u && u.isAlive);
    if (targetType) {

      switch (targetType) {
      case "allEnemies":
        target = combatUnits.filter(unit => unit.isAlive && unit.isAlly != caster.isAlly);
        break;

      case "allAllies":
        target = combatUnits.filter(unit => unit.isAlive && unit.isAlly == caster.isAlly);
        break;

      case "all":
        target = combatUnits.filter(unit => unit.isAlive);
        break;
      case "random":
        target = livingUnits[Math.floor(Math.random()*livingUnits.length)]
        break;
      case "randomAlly":
        let filteredAllies = combatUnits.filter(u => u.isAlly == caster.isAlly && u.isAlive)
        target = filteredAllies[Math.floor(Math.random()*filteredAllies.length)]
        break;
      case "randomEnemy":
        let filteredEnemies = combatUnits.filter(u => u.isAlly != caster.isAlly && u.isAlive);
        target = filteredEnemies[Math.floor(Math.random()*filteredEnemies.length)];
        break;
      case "caster":
      case "self":
        target = caster;
        break;
      case "adjacent":
        const origin = Array.isArray(target)?target[0]: target;
        const adjacentTargets = [origin];
        const unitId = origin.id;

        // Check left
        if (unitId > 0) {
          const left = findUnitById(unitId - 1);
          if (left && left.isAlly === origin.isAlly && left.isAlive) {
            adjacentTargets.push(left);
          }
        }

        // Check right
        if (unitId < combatUnits.length - 1) {
          const right = findUnitById(unitId + 1);
          if (right && right.isAlly === origin.isAlly && right.isAlive) {
            adjacentTargets.push(right);
          }
        }

        target = adjacentTargets;
        break;
        case "skillTarget":
          if(!skillContext){
            console.error("skill context not found", targetType, new Error().stack)
          }
          return skillContext.target;
          break;
      }
    } else {
      target = getPotentialTargets(caster, targetType);
      }
    return target;

  }
  
  function initializeTalentListeners(unit) {
  unit.talentListeners = [];

  unit.skills.learned
    .filter(skill => skill.type === "talent")
    .forEach(talent => {
      const talentData = talentsData[talent.id];
      if (!talentData?.effects) return;

      talentData.effects.forEach(effect => {
        if (effect.type !== "listener" || !effect.trigger?.event) return;

        const eventName = effect.trigger.event;
        const eventType = new EventType(eventName);
        const callback = createListenerCallback(effect, unit, talent.id);
        
        eventType.on(callback);
        unit.talentListeners.push({ event: eventName, callback });
      });
    });
}
  function applyEffect(effect, caster, target, skillId, originalTarget, skillContext) {
    let pushedEffect = null;
    if (!skillId) {
      console.error("no skill defined");
    }
    
    if (!caster.skills.combatData.targets[skillId] && caster.skills.learned.find(s=> s.id == skillId).type != "talent") {
      console.error("no skill found", caster.skills.combatData)
      return;
    }
    // Always treat target as array

    if (effect.target) {
      target = getTarget(caster, originalTarget, effect.target, skillContext);
    }
    if (!Array.isArray(target)) target = [target];
    
    let skillLevel = 1;
    let skillFound = caster.skills.equipped.find(s => s.id == skillId);
    if(!skillFound){
      skillFound = caster.skills.learned.find(s => s.id == skillId);
    }
    if(skillFound){
      skillLevel = skillFound.level || 1;
    }
    let sign = "";
    let value = ""
    console.log(skillId, effect, "made it this far")
    // Apply effect to each target in the array
    for (let unit of Array.isArray(target)?target: [target]) {
      if (!unit) {
        continue;
      }
      switch (effect.type) {
      case "damage":
        if(skillContext && skillContext.statBonuses){
          console.log(skillId, JSON.stringify(skillContext.statBonuses, null, 2))
        }
        let critChance = getStatValue("critChance", caster.stats.critChance, caster, target, undefined, skillContext) ;
        let critMulti = 1
        if(Math.random()*100 < critChance){
          critMulti = getStatValue("critMulti", caster.stats.critMulti, caster, target, undefined, skillContext) ;
        }
        let total = critMulti*calculateEffectiveValue(effect, skillId, caster, unit, skillLevel, skillContext)
        let finalDamage = damageUnit(caster, unit, effect.damageType, total, skillContext)


        updateCombatLog(`${critMulti > 1? "CRITICAL HIT! ":""}${caster.name} deals ${finalDamage.toFixed(2)} ${getDamageTypeIcon(effect.damageType)} damage to ${unit.name}`, caster, ["damage", caster.isAlly?"ally":"enemy"]);
        break;
      case "interrupt":
        let interruptAmount = calculateEffectiveValue(effect, skillId, caster, undefined, skillLevel, skillContext);
        let override = effect.overrideCooldown;
        Object.keys(unit.skills.combatData.lastUsed).forEach(s => {
          if(!override){
          unit.skills.combatData.lastUsed[s] =  Math.min(Date.now, interruptAmount+unit.skills.combatData.lastUsed[s])
          }else{
            unit.skills.combatData.lastUsed[s] = interruptAmount+unit.skills.combatData.lastUsed[s]
          }
        })
        updateCombatLog(`${caster.name} interrupted ${unit.name} by ${interruptAmount.toFixed(2)}`, caster, ["interrupt", caster.isAlly?"ally":"enemy"])
        break;
        case "debug":
          let msg = effect.text;
          updateCombatLog(msg, caster, [])
          console.log("Debug effect", msg)
          break;
      case "summon":
        let unitToSummon = effect.unit;
        let tier = calculateEffectiveValue(effect.tier, skillId, caster, undefined, skillLevel, skillContext)
        let unitData = createUnit(unitToSummon, effect.isAlly, tier);
        const crewContainer = document.getElementById("player-crew");
        const enemyContainer = document.getElementById("enemy-crew");
        unitData.isAlly = effect.isAlly?caster.isAlly: !caster.isAlly
        unitData.debuffs = [];
        unitData.buffs = [];
        unitData.conditions = [];
        unitData.isSummon = true;
        combatUnits.push(unitData)

        if (unitData.isAlly || unitData.isPlayer) {
          crewContainer.appendChild(buildUnitTable(unitData, unitData.isAlly, false))
        } else {
          enemyContainer.appendChild(buildUnitTable(unitData, unitData.isAlly, false))
        }
        unitData.isAlive = true
        isPlayer = false

        recalculateTotalResistances(unitData);
        recalculateDerivedStats(unitData);
        unitData.stats.hp.value = unitData.stats.maxHp.value;
        unitData.stats.sp.value = unitData.stats.maxSp.value;
        unitData.stats.mp.value = unitData.stats.maxMp.value;
        regenIntervals[unitData.id] = setInterval(() => {
          if (player.inCombat && findUnitById(unitData.id)) {
            updateUnitRegens(unitData); // Or loop through all allies
          } else {
            clearInterval(regenIntervals[unitData.id]);
          }
        },
          1000);
        if (!unitData.isAlly) {
          unitData.skills.equipped.forEach(s => {
            let enemyTarget = getEnemyTarget(unitData,
              s.id,
              skillsData[s.id].target)

            unitData.skills.combatData.targets[s.id] = {
              target: enemyTarget.id,
              active: true
            }
          })
        }
        unitData.skills.equipped.map(skill => skill.id).filter(s => s).forEach((skillId) => {
          if ((skillsData[skillId] && !skillsData[skillId].requiresTarget) || (unitData.skills.combatData.targets[skillId] !== undefined && findUnitById(unitData.skills.combatData.targets[skillId].target))) {
            targetData = unitData.skills.combatData.targets;
            unitData.skills.combatData.targets[skillId] = {
              target: targetData[skillId] && targetData[skillId].target?targetData[skillId].target: undefined,
              active: true
            };
            resetSkillCooldown(unitData, skillId);


          } else {
            let potentialTargets = getPotentialTargets(unitData, skillsData[skillId].target);
            unitData.skills.combatData.targets[skillId] = {
              target: potentialTargets[0].id,
              active: true
            }
          }
          skillIntervals[unitData.id] = setInterval(() => {
            if (player.inCombat && findUnitById(unitData.id)) {
              updateProgressBar(skillId, unitData); // Or loop through all allies
            } else {
              clearInterval(skillIntervals[unitData.id])
            }
          },
            updateSpeed);
        })
        summonUnitEvent.emit({
          effect: effect,
          caster: caster,
          unitSummoned: unitData,
          skillId: skillId
        })
        updateCombatLog(`${caster.name} summoned an ${unitData.isAlly?"ally":"enemy"} ${unitData.name}(${unitData.tier})`, caster, ["summon", caster.isAlly?"ally":"enemy"])

        break;
      case "cleanse":
        let toCleanse = effect.name;
        let stacks = effect.stacks || "all";
        if(unit.conditions[toCleanse]){
          if(stacks = "all"){
            stacks = unit.conditions[toCleanse].stacks;
          }else if(stacks = "half"){
            stacks = unit.conditions[toCleanse].stacks/2
          }
          unit.conditions[toCleanse].stacks = Math.max(0,unit.conditions[toCleanse].stacks - stacks);
          let desc = `${caster.name} cleansed ${stacks} stacks of ${toCleanse} on ${unit.name}`;
          updateCombatLog(desc, "cleanse", caster.isAlly?"ally":"enemy");
        }
        break;
      case "siphonEnergy":
        let amount = calculateEffectiveValue(effect, skillId, caster, target, skillLevel, skillContext);
        let energyType = effect.energyType;
        let multi = calculateEffectiveValue(effect.multi, skillId, caster, target, skillLevel, skillContext)
        if(unit.stats[energyType]){
          let gainDiff = Math.min(amount,unit.stats[energyType].value)
          unit.stats[energyType].value = Math.max(0,unit.stats[energyType].value-amount)
          caster.stats[energyType].value = Math.min(caster.stats[`max${capitalize(energyType)}`].value,multi*gainDiff);
          desc = `${caster.name} stole ${(gainDiff).toFixed(2)} ${capitalize(energyType)} from ${unit.name}`
          if(gainDiff*multi != 0){
            desc += `, gaining ${(gainDiff*multi).toFixed(2)}`
          }else{desc+="."}
          console.log(unit, caster)
            updateCombatLog(desc,
          caster, ["siphon",caster.isAlly?"ally":"enemy"]);
          updateCombatBar(unit, energyType)
          updateCombatBar(caster, energyType)
        }
        break;
      case "buff":

        pushedEffect = JSON.parse(JSON.stringify(effect));
        pushedEffect.startTime = Date.now()
        pushedEffect.duration = calculateEffectiveValue(pushedEffect.duration, skillId, caster, unit, skillLevel, skillContext);
        pushedEffect.value = calculateEffectiveValue(pushedEffect.value, skillId, caster, unit, skillLevel, skillContext)

        let isResistanceEffect = pushedEffect.resistanceType
                statusStartEvent.emit({effect: effect,
          caster: caster,
          target: unit,
          skillId: skillId})
        unit.buffs.push(pushedEffect);
        if(isResistanceEffect){
          
          if(!unit.bonusResistances)unit.bonusResistances=[]
          let res = {
            damageType: isResistanceEffect,
            value: pushedEffect.value,
            timeExpired: pushedEffect.duration + Date.now()
          };
          unit.bonusResistances.push(res);
          
          recalculateTotalResistances(unit)
          updateStatusButton(unit);
          break;
        }
        
        setTimeout(() => {
          if (findUnitById(unit.id)) {
            const index = unit.buffs.findIndex(e => e.name === pushedEffect.name && e.startTime === pushedEffect.startTime);
            if (index !== -1) {
              unit.buffs.splice(index, 1);
              recalculateDerivedStats(unit);
              updateStatusButton(unit);
              if (isResistanceEffect) {
                if (unit.totalResistances)
                {
                  
                }
                }
              updateCombatBar(unit, "hp");
              updateCombatBar(unit, "mp");
              updateCombatBar(unit, "sp");
            }
          }
          statusEndEvent.emit({effect: effect, caster: caster, target: target, skillId: skillId});

        },
          pushedEffect.duration);
        updateStatusButton(unit);
        recalculateDerivedStats(unit);

        sign = (effect.type === "buff" ? pushedEffect.value < 0?"-": "+": "-");

        valueStr = effect.effect === "add"
        ? pushedEffect.value.toFixed(2): ((effect.type === "buff" ? Math.abs(pushedEffect.value - 1): Math.abs(1 - pushedEffect.value)) * 100).toFixed(2) + "%";
        desc = `${caster.name} inlicts ${effect.type} on ${unit.name}: ${sign}${valueStr} ${fromCamelCase(effect.stat)} for ${(pushedEffect.duration / 1000).toFixed(2)}s`;
        updateCombatLog(desc,
          caster, ["buff",caster.isAlly?"ally":"enemy"]);

        break;
      case "debuff":
        pushedEffect = JSON.parse(JSON.stringify(effect));
        pushedEffect.duration =calculateEffectiveValue(pushedEffect.duration, skillId,
          caster,
          unit,
          skillLevel, skillContext);
        pushedEffect.value = calculateEffectiveValue(pushedEffect.value, skillId,
          caster,
          unit,
          skillLevel, skillContext)
        pushedEffect.startTime = Date.now();
        statusStartEvent.emit({effect: effect,
          caster: caster,
          target: unit,
          skillId: skillId})
        unit.debuffs.push(pushedEffect);
        setTimeout(() => {
          if (findUnitById(unit.id)) {
            const index = unit.debuffs.findIndex(e => e.name === pushedEffect.name && e.startTime === pushedEffect.startTime);
            if (index !== -1) {
              unit.debuffs.splice(index, 1);
              updateStatusButton(unit);
              recalculateDerivedStats(unit);
              updateCombatBar(unit, "hp");
              updateCombatBar(unit, "mp");
              updateCombatBar(unit, "sp");
            }
          }
          statusEndEvent.emit({effect: effect, caster: caster, target: target, skillId: skillId});

        },
          pushedEffect.duration);
        updateStatusButton(unit);
        recalculateDerivedStats(unit);
        
        sign = (effect.type === "buff" ? effect.value < 0?"-": "+": "-");
        valueStr = effect.effect === "add"
        ? effect.value.toFixed(2): ((effect.type === "buff" ? Math.abs(pushedEffect.value - 1): Math.abs(1 - pushedEffect.value)) * 100).toFixed(2) + "%";
        desc = `${caster.name} inlicts ${effect.type} on ${unit.name}: ${sign}${valueStr} ${fromCamelCase(effect.stat)} for ${(pushedEffect.duration / 1000).toFixed(2)}s`;
        updateCombatLog(desc,
          caster, ["debuff",caster.isAlly?"ally":"enemy"])

        break;

      case "dot":

        break;

      case "heal":
        if (!unit.isAlive) break;
        
        let base = calculateEffectiveValue(effect, skillId, caster, unit, skillLevel || 1, skillContext)

        unit.stats.hp.value = Math.min(unit.stats.maxHp.value, unit.stats.hp.value + base);
        updateCombatBar(unit, "hp");
        updateCombatLog(`${caster.name} healed ${unit.name} for ${base.toFixed(2)} hp.`, caster, ["heal", caster.isAlly?"ally":"enemy"])
        break;

      case "revive":
        if (unit.isAlive) break;
        unit.isAlive = true;
        unit.stats.hp.value = 1;
        updateCombatBar(unit, "hp");
        updateCombatLog(`${caster.name} revived ${unit.name}!!`, caster, ["revive", caster.isAlly?"ally":"enemy"])
        break;

      case "condition":
        if (!conditionsData || !conditionsData[effect.name]) {
          console.warn(`Unknown condition: ${effect.name}`);
          return;
        }

        if (!unit.conditions) unit.conditions = {};
        const condition = effect.name;
        const stacksToAdd = calculateEffectiveValue(effect.stacks, skillId, caster, unit, skillLevel, skillContext) || 1;

        if (!unit.conditions[condition]) {
          unit.conditions[condition] = {
            stacks: 0
          }
        }

        unit.conditions[condition].stacks += stacksToAdd;
        unit.conditions[condition].caster = caster
        conditionStackEvent.emit({effect: effect, caster: caster, target: unit, skillId: skillId, stacks: stacksToAdd})
        statusStartEvent.emit({effect: effect, caster: caster, target: unit, skillId: skillId})
        updateStatusButton(unit)
        
        break;
        case "fun":
          console.log("hm")
  let funFn = null;

  // 1. If already a real function
  if (typeof effect.fun === "function") {
    funFn = effect.fun;

  // 2. If it's a named function in the registry

  // 3. If it has funBody and funParams → compile and cache
  } else if (effect.funBody) {

    if (!effect._compiledFun) {
      try {
        const funBodyStr = Array.isArray(effect.funBody)
          ? effect.funBody.join("\n")
          : effect.funBody;

        effect._compiledFun = new Function(...[        "caster",
        "unit",
        'skillId',
        'originalTarget',
        'skillContext',
        'skillLevel',
        'effect',
        "applyEffectEvent",
        "updateCombatLog",
        "calculateEffectiveValue",
        "getTarget"], funBodyStr);
      } catch (e) {
        console.error(`Error compiling funBody:`, e, effect);
      }
    }

    funFn = effect._compiledFun;
  }
  console.log(skillContext, funFn.toString())
  // Now execute the function if valid
  if (typeof funFn === "function") {
    try {
      funFn(
        caster,
        unit, // <== NOTE! pass *unit*, not target array
        skillId,
        originalTarget,
        skillContext,
        skillLevel,
        effect,
        applyEffectEvent,
        updateCombatLog,
        calculateEffectiveValue,
        getTarget
      );
    } catch (e) {
      console.error(`Error executing fun effect "${effect.fun || '[anonymous funBody]'}":`, e);
    }
  } else {
    console.warn(`Effect of type "fun" does not have a valid .fun or .funBody/.funParams`, effect);
  }
  break;
      }
    }
  applyEffectEvent.emit({effect: effect, caster: caster, target: target, skillId: skillId, skillContext: skillContext})
  }
  function removeTalentListeners(unit) {
  unit.skills.combatData.perCombat = {};
  if (!unit.talentListeners) return;
  for (const { event, callback } of unit.talentListeners) {
    new EventType(event).removeListener(callback);
  }
  unit.talentListeners = [];
}
  function damageUnit(caster, target, damageType, amount, skillContext) {
    if(!target.stats.evasion){
      target.stats.evasion = {
        value: 1,
        base: 1,
        scaling: []
      }
    }
    if(caster && !caster.stats.accuracy){
      caster.stats.accuracy = {
        value: 1,
        base: 1,
        scaling: []
      }
    }
    if(caster){
      let evStat = target.stats.evasion
      let evasion = getStatValue("evasion", evStat, target, undefined, undefined, skillContext);
      let acStat = caster.stats.accuracy;
      let accuracy = getStatValue("accuracy", acStat, caster, target, undefined, skillContext) ;

      let evasionChance = getEvasionChance(accuracy, evasion)*100;
      if (Math.floor(Math.random()*100) < evasionChance) {
        updateCombatLog(`${target.name} evaded damage!`, caster, ["evasion", target.isAlly?"ally":"enemy"]);
        return 0;
      }
    }
    
    recalculateTotalResistances(target);
    let resist = 1;
    if (target.totalResistances && target.totalResistances[damageType.toLowerCase()]) {
      resist = target.totalResistances[damageType.toLowerCase()]
    
    }
    let damageAmp = 1;
    if(caster){
      if(caster.stats && !caster.stats.damageAmp){
      caster.stats.damageAmp = {
        display: "Damage Amplifier",
        value: 1,
        base: 1,
        scaling: []
      }
      damageAmp = getStatValue("damageAmp", caster.stats.damageAmp, caster, target, undefined, skillContext) ;
      }
    }
    let damageTaken = 1;
          if(target.stats && !target.stats.damageTaken){
      target.stats.damageTaken = {
        display: "Damage Taken",
        value: 1,
        base: 1,
        scaling: []
      }
      damageTaken = getStatValue("damageTaken", target.stats.damageTaken, target, caster, undefined, undefined) ;
      }
    const total = amount * resist * damageTaken * damageAmp;
   // console.log(target.name, damageType, total, amount, resist)
   if(caster){
    let lsChance = getStatValue("lifestealChance", caster.stats.lifestealChance, caster, target, undefined, skillContext) ;
    let lsMulti = getStatValue("lifestealMulti", caster.stats.lifestealMulti, caster, target, undefined, skillContext) ;
    if(lsChance && lsMulti && caster.isAlive){
      let rand = Math.random()*100;
      if(rand < lsChance){
        let base = total * lsMulti
      caster.stats.hp.value = Math.min(caster.stats.maxHp.value, caster.stats.hp.value + base);
      updateCombatLog(`${caster.name} drained ${base.toFixed(2)} HP from ${target.name}`, caster, ["heal", caster.isAlly?"ally":"enemy"])
      updateCombatBar(caster, "hp");
      }
    }
    }
    target.stats.hp.value = Math.max(target.stats.hp.value - total, 0);
    updateCombatBar(target, "hp");
   if(caster){
    onDamageEvent.emit({caster: caster, target: target, damageType: damageType, damage: Math.min(target.stats.hp.value, total)})
   }
    if (target.stats.hp.value <= 0) {
      killUnit(target, caster)
      checkIfCombatFinished();
    }
    return total;
  }
  function toggleEquipSkill(skill) {
    if (player.inCombat) {
      console.log("You can't change skills during combat.");
      return;
    }

    const equipped = player.skills.equipped.filter(id => id); // removes nulls
    const learned = player.skills.learned;

    const index = 0;
    equipped.forEach(s => {
      if (s.id == skill.id) {
        return;
      }
      index++;
    })

    if (index !== -1) {
      equipped.splice(index, 1); // Unequip
      console.log(`Unequipped ${skillsData[skill.id].name}`);
    } else {
      if (!learned.includes(skill.id)) {
        console.log("You haven't learned that skill.");
        return;
      }

      if (equipped.length >= player.skillSlots) {
        console.log(`You can only equip up to ${player.skillSlots} skills.`);
        return;
      }

      if (equipped.find(s => s.id == skill.id)) {
        log("That skill is already equipped.");
        return;
      }
      equipped.push(skill); // Equip
      console.log(`Equipped ${skillsData[skill.id].name}`);
    }

    updateSkillUI(); // Update your visual skill list if needed
  }
  function isSkillOn(skillId, unit) {
    if (!unit.skills.combatData.targets[skillId]) {
      return false;
    }
    return unit.skills.combatData.targets[skillId].active;
  }
  function toggleSkill(unitId, skillId) {

    const unit = findUnitById(unitId); // Write this helper if needed

    if (!unit.skills.combatData.targets[skillId]) {
      unit.skills.combatData.targets[skillId] = {
        active: true,
        target: null
      };
    } else {
      unit.skills.combatData.targets[skillId].active = !unit.skills.combatData.targets[skillId].active;
    }
    console.log(`Skill ${skillId} toggled for ${unit.name}: ${unit.skills.combatData.targets[skillId].active}`);
    resetUnitSkillDisplays(unit)
  }
  function selectSkillTarget(unitId) {
    const unit = findUnitById(unitId);
    // Implement a UI for selecting target; for now, simulate a target selection:
    const skillId = skillToTarget;
    const targetUnitId = unitToTarget;


    if (!unit.skills.combatData.targets || !unit.skills.combatData.targets[skillId]) unit.skills.combatData.targets[skillId] = {};
    unit.skills.combatData.targets[skillId].target = targetUnitId;
    resetUnitSkillDisplays(unit)
    console.log(`Skill ${skillId} target set to ${findUnitById(targetUnitId).name} for ${unit.name}`);
    document.querySelectorAll('.unit-box').forEach(box => {
      let hitChanceDiv = document.getElementById(unitId + '-hitChance')
      if(hitChanceDiv){
        hitChanceDiv.remove();
      }
      box.style.border = '1px solid black';
    })
    targetting = false;
    unitToTarget = null;

  }


  function resetUnitSkillDisplays(unit) {
    unit.skills.equipped.map(skill => skill.id).forEach(skillId => {
      let skillFrame = updateSkillUnitDisplay(skillId, unit);
      let skillDiv = document.getElementById(`${unit.id}-${skillId}-skill-block`)
      if (skillFrame && skillDiv)
        skillDiv.parentNode.replaceChild(skillFrame, skillDiv)
    });
  }
  function startTargetting(skillId, casterId) {
    if (targetting) {
      targetting = false;
      findUnitById(casterId).skills.combatData.targets[skillId] = null;
      skillToTarget = null;
      resetUnitSkillDisplays(findUnitById(unitToCast))
      unitToCast = null;
      unitToTarget = null;
      document.querySelectorAll('.unit-box').forEach(box => {
        let unitId = parseInt(box.id.match(/\d+/)[0]);
        console.log("removing", unitId + '-hitChance')
        document.getElementById(unitId + '-hitChance').remove();
        resetUnitBorder(unitId);
      })
      
      return;
    }
    skillToTarget = skillId;
    unitToCast = casterId;
    let caster = findUnitById(casterId)
    let potentialTargets = getPotentialTargets(findUnitById(casterId), skillsData[skillId].target)
    document.querySelectorAll('.unit-box').forEach(box => {
      let unitId = parseInt(box.id.match(/\d+/)[0]);
      let unit = findUnitById(unitId);
      if (unit.isAlive) {
        if (settings.friendlyFire || potentialTargets.includes(unit)) {
      let evStat = unit.stats.evasion
      let evasion = getStatValue("evasion", evStat, unit, undefined, undefined);
      let acStat = caster.stats.accuracy;
      let accuracy = getStatValue("accuracy", acStat, caster, unit, undefined) ;

      let hitChance = 1-getEvasionChance(accuracy, evasion);
      let hitChanceDiv = document.createElement("div");
      hitChanceDiv.id = unitId + '-hitChance'
      hitChanceDiv.textContent = "Hit Chance: " + (hitChance*100).toFixed(2)+"%";
      hitChanceDiv.style.fontSize = "0.7em"
      console.log("adding", hitChanceDiv.id)
      box.appendChild(hitChanceDiv)
          box.style.setProperty('--border-gradient', 'linear-gradient(to right, #99f, #66a)');
        }
      } else {
        if (settings.friendlyFire || potentialTargets.includes(unit)) {
          box.style.setProperty('--border-gradient', 'linear-gradient(to right, #ff0, #aa0)');
        }
      }
    });
    targetting = true;
    let skillDiv = document.getElementById(`${casterId}-${skillId}-skill-block`)
    let skillFrame = updateSkillUnitDisplay(skillId,
      findUnitById(casterId))
    if (skillDiv && skillFrame) {
      skillDiv.parentNode.replaceChild(skillFrame, skillDiv)
    }
    timeStartedTargetting = Date.now()
  }
  function resetUnitBorder(unitId){
            let unit = findUnitById(unitId);

        if(unit){
                      let box = document.getElementById(unitId + "-unit-box")
          if(unit.border && unit.border.color){
          box.style.setProperty(`--border -gradient`, unit.border.color);
          
        }else{
        box.style.setProperty('--border-gradient', 'linear-gradient(to right, #000, #000)');
        }
        }
  }
function getPotentialTargets(caster, targetType) {
  
  
  switch (targetType) {
    case "singleEnemy":
    case "randomEnemy":
    case "allEnemies":
      return combatUnits.filter(u => u.isAlly != caster.isAlly && u.isAlive);

    case "singleAlly":
    case "randomAlly":
    case "allAllies":
      return combatUnits.filter(u => u.isAlly == caster.isAlly && u.isAlive);

    case "random":
    case "all":
      return combatUnits.filter(u => u.isAlive);

    case "self":
    case "caster":
      return [caster];

    default:
      console.warn(`Unknown target type: ${targetType}`);
      return null;
  }
}
function findUnitById(id) {
    // Search through player, allies, and enemies as needed
    if(!id && id != 0){
      return null
    }
    if (player.id === id) return player;
    for (let u of combatUnits) {
      //console.log(`Checking ID ${u.id} (${typeof u.id})`)
      if (u == null) continue;
      if (u.id === id) return u;
    }
    if (id === undefined || id === null) {
      if (Date.now() < lastError + 3000) {

        console.error(`id: ${id} / ${new Error().stack}`)
      }
      lastError = Date.now();
      return;
    }
    return null;
  }
  function canAfford(player, cost) {
    for (const key in cost) {
      // Check if the stat exists on the player
      if (!player.stats[key]) return false;
      // Check if the player has enough of that stat
      if (player.stats[key].value < cost[key]) return false;
    }
    return true;
  }
  function spendResources(player, cost) {
    for (const key in cost) {
      if (player.stats[key]) {
        player.stats[key].value -= cost[key];
        updateCombatBar(player, key)
      }
    }
  }


  function getUnitDataFromType(unitType) {
    let unit = unitsData.find(unit => unit.name.toLowerCase() === unitType.toLowerCase())
    if (!unit) return unit
    return JSON.parse(JSON.stringify(unit));
  }
  function showUnitPopup(unitId, unitType) {
  
    let unit = findUnitById(unitId)
    if(!unit && unitType){
      unit = getUnitDataFromType(unitType)
    }
  const existingPopup = document.getElementById("popup-overlay");
    if (existingPopup) existingPopup.remove();

    // Build the HTML for attributes
    let html = `<div class="popup-unit-header">${unit.name}</div>`;
    html += `<div class="unit-attributes">`;
    Object.keys(unit.attributes).forEach(attr => {
        const base = getEffectiveAttribute(unit, attr);
        html += `
            <div id="${attr}-display" class="attr-div">
            ${attr.charAt(0).toUpperCase() + attr.slice(1)}: ${base.toFixed(2)}
            </div>`;
    });
    html += `</div>`;

    // Create stat groups like the player version
    

    // Build stats HTML
    let statsHTML = `<div class="stat-block">`;
    statGroups.forEach(group => {
        statsHTML += `<div class="stat-row stat-header stat-${group.class}">${group.title}</div>`;
        group.stats.forEach(stat => {
            const data = unit.stats[stat.key];
            if (!data) return;
            let label = stat.label;
            if (data.scaling) {
              
                label += "(" + data.scaling.map(sc => sc.stat == "tier"?unit.isPlayer?"LVL":"TIER":sc.stat.toUpperCase().slice(0, 3)).join("/") + ")";
            }
            const rowClass = group.class ? ` stat-subrow-${group.class}` : '';
            statsHTML += `<div class="stat-subrow${rowClass}" id="stat-${stat.key}">
                            <span>${label}:</span>
                            <span>${data.value.toFixed(2)}</span>
                          </div>`;
        });
    });
    statsHTML += `</div>`;

    // Overlay setup
    const overlay = document.createElement("div");
    overlay.id = "popup-overlay";
    overlay.style.position = "fixed";
    overlay.style.top = 0;
    overlay.style.left = 0;
    overlay.style.width = "100vw";
    overlay.style.height = "100vh";
    overlay.style.zIndex = 999;
    overlay.style.background = "rgba(0,0,0,0.0)";
    overlay.addEventListener("click", () => overlay.remove());

    // Popup container
    const popup = document.createElement("div");
    popup.className = "popup";
    popup.style.position = "absolute";
    popup.style.left = "50%";
    popup.style.top = "50%";
    popup.style.transform = "translate(-50%, -50%)";
    popup.style.zIndex = 1000;
    popup.style.backgroundColor = "#666";
    popup.style.color = "#fff";
    popup.style.padding = "10px";
    popup.style.border = "2px solid #444";
    popup.style.borderRadius = "10px";
    popup.style.maxWidth = "80vw";
    popup.style.maxHeight = "80vh";
    popup.style.overflowY = "auto";
    popup.style.boxShadow = "0 0 10px #000";

    // Assemble the popup content
    popup.innerHTML = html;
    popup.innerHTML += statsHTML;

    // Skills list
    const skillContainer = document.createElement("div");
    skillContainer.innerHTML = `<div class="stat-row stat-header">Skills</div>`;
    unit.skills.equipped.forEach(skill => {
        const skillRow = document.createElement("div");
        skillRow.className = "stat-subrow";

        const button = document.createElement("button");
        button.textContent = skillsData[skill.id].name;
        button.addEventListener("click", () => {
            setTimeout(() => showSkillPopup(skill.id, player.inCombat, unit), 1);
        });

        skillRow.appendChild(button);
        skillContainer.appendChild(skillRow);
    });

    popup.appendChild(skillContainer);
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
}

function getAvailableSkills() {
  const learnedSkills = Object.fromEntries(
    player.skills.learned.map(s => [s.id, s.level])
  );

  const tree = loreDataCache.classes[player.class].skillTree;
  const availableSkills = [];

  for (let skill of tree) {
    const learnedLevel = learnedSkills[skill.id] || 0;
    const nextLevel = learnedLevel + 1;

    if (learnedLevel >= skill.maxLevel) continue;

    let cost = skill.cost;
    if (learnedLevel === 0) {
      cost = skill.unlockCost ?? (cost + Object.keys(learnedSkills).length);
    }

    if (player.classData[player.class].skillPoints < cost) continue;

    if (skill.previousSkill) {
      const prevLevel = learnedSkills[skill.previousSkill] || 0;
      if (prevLevel < skill.previousSkillLevelRequired) continue;
    }

    availableSkills.push({
      id: skill.id,
      nextLevel,
      cost
    });
  }

  return availableSkills;
}
  function checkIfCombatFinished() {
    if(!player.inCombat){
      return false;
    }
    let enemiesAlive = combatUnits.filter(unit => unit.isAlive && !unit.isAlly);
    let alliesAlive = combatUnits.filter(unit => unit.isAlive && unit.isAlly);
    if (alliesAlive.length === 0) {
      finishCombat(false);
      return true;
    }
    if (enemiesAlive.length === 0) {
      finishCombat(true);
      return true;
    } else {
      return false;
    }
  }
  function finishCombat(win) {
  document.querySelectorAll(".popup").forEach(e => e.remove());
  let menuContent = document.getElementById("menu-content");
  menuContent.innerHTML = "";
  combatUnits.forEach(u => {
    u.skills.combatData.target = [];
    removeTalentListeners(u);
  });
  player.inCombat = false;
  skillIntervals.forEach(ski => clearInterval(ski));
  regenIntervals.forEach(regi => clearInterval(regi));
  skillIntervals = [];
  regenIntervals = [];

  let defeated = combatUnits.filter(unit => !unit.isAlive && !unit.isAlly && !unit.isSummon);
  combatUnits = [];

  let finDiv = document.createElement("div");
  finDiv.style.display = "flex";
  finDiv.style.flexDirection = "column";
  finDiv.style.textAlign = "center";
  finDiv.style.alignItems = "center";

  let levelUpDiv = document.createElement("div");

  let xpBar = `
<div class="bar xp-bar" style="height: 1em; display: flex; margin-bottom: 2em; align-items: center; position: relative; width: 100%; max-width: 400px;">
      <div class="xp-bar fill" id="bar-fill-${player.id}-xp"
        style="width: ${(player.xp / player.maxXp) * 100}%; position: absolute; height: 25px; top: 0; left: 0; z-index: 0;">
      </div>
      <div class="bar-text"
        style="font-size: 8px; position: relative; z-index: 1; width: 100%; text-align: center;"
        id="bar-text-${player.id}-xp">
        XP (<span id="xp-display">${player.xp}</span>/${player.maxXp})
      </div>
    </div>`;

  let mainArea = document.getElementById("main-area");
  mainArea.innerHTML = "";

  if (win) {
    finDiv.innerHTML += "<h1>You are Victorious!</h1><br>";
    finDiv.innerHTML += xpBar;

    let messageDiv = document.createElement("div");
    messageDiv.style.display = "flex";
    messageDiv.style.flexDirection = "column";
    messageDiv.style.alignItems = "center";
    messageDiv.style.marginBottom = "1em";

    let oldXp = player.xp;
    let levelUps = 0;

    if (!player.discoveredEnemies) player.discoveredEnemies = [];

    defeated.forEach(unit => {
      let xpModifier = Math.min(2,(50 + unit.tier) / (50 + player.classData[player.class].level)) * player.stats.xpGain.value;
      let xpGained = Math.floor((unit.xp * unit.tier / 2 + unit.tier) * xpModifier);

      // XP gain
      messageDiv.innerHTML += `<div><span>${unit.name} defeated: </span><span style="color: #d8a">${xpGained} xp!</span></div>`;

      // Item drops
      let dropAmount = Math.min(3,rollLogRandom(Math.pow(unit.tier, 1.2) * 10));
      if (dropAmount) {
        for (let drop = 0; drop < dropAmount; drop++) {
          let randomSlotType = Object.keys(player.inventory.equipped).random();

          let filteredGearEntries = Object.entries(gearTypes).filter(([name, data]) => data.slot === randomSlotType);
          let filteredGearWeights = Object.fromEntries(filteredGearEntries.map(([name, data]) => [name, data.oreRequired]));

          let gearTypeName = invertedWeightedRandom(filteredGearWeights)[0];
          let gearType = gearTypes[gearTypeName];
          let tier = unit.tier;
          let oreRequired = gearType.oreRequired;
          let inputOres = [];

          for (let i = 0; i < oreRequired; i++) {
            const oreName = Object.keys(oresData)
              .filter(o => loreDataCache.planets[player.planet].gearOres.includes(o) && oresData[o].tier <= rollLogRandom(tier))
              .random();
            const existing = inputOres.find(entry => Object.keys(entry)[0] === oreName);
            if (existing) existing[oreName]++;
            else inputOres.push({ [oreName]: 1 });
          }

          let quality = Object.keys(itemQualities)[getRandomQuality(tier)];
          let gear = buildGear(gearTypeName, tier, quality, inputOres);
          if(addItem(gear)){

          let dropDiv = document.createElement("div");
          let itemSpan = document.createElement("span");
          itemSpan.textContent = `[ ${gear.name} ]`;
          itemSpan.style.color = itemQualities[gear.quality];
          itemSpan.style.cursor = "pointer";
          itemSpan.onclick = () => setTimeout(()=>showItemPopup(gear),1);
          dropDiv.innerText = "Received ";
          dropDiv.appendChild(itemSpan);
          messageDiv.appendChild(dropDiv);
          }
        }
      }

      // Discovery
      if (!player.discoveredEnemies.includes(unit.name)) {
        let discoveryXp = unit.discoveryXp * xpModifier || 0;
        if (discoveryXp > 0) {
          messageDiv.innerHTML += `
            <div><span style="color: #aa5">${unit.name} discovered! </span><span style="color: #d8a">${discoveryXp.toFixed(1)} xp!</span></div>`;
        }
        xpGained += discoveryXp;
        player.discoveredEnemies.push(unit.name);

        let discoverableEnemies = loreDataCache.zones[player.currentZone.name].units;
        let allDiscovered = discoverableEnemies.every(e => player.discoveredEnemies.includes(e));
        if (allDiscovered) {
          let fullDiscoveryXp = loreDataCache.zones[player.currentZone.name].fullDiscoveryXp || 0;
          xpGained += fullDiscoveryXp;
          if (fullDiscoveryXp > 0) {
            messageDiv.innerHTML += `
              <div><span style="color: #aa5">All units in ${player.currentZone.name} discovered! </span><span style="color: #d8a">${fullDiscoveryXp} xp!</span></div>`;
          }
        }
      }

      player.xp += xpGained;
      levelUps += checkLevelUp() || 0;
    });

    if (levelUps > 0) {
      let levelUpMsg = document.createElement("h3");
      levelUpMsg.textContent = `Level Up x${levelUps}`;
      levelUpMsg.style.color = "#8f8";
      messageDiv.appendChild(levelUpMsg);
    }

    finDiv.appendChild(messageDiv);

    let max = loreDataCache.zones[player.currentZone.name].maxTier;
    if (player.currentZone.count === max && !player.zoneProgress[player.currentZone.name].completed) {
      finDiv.innerHTML += `<h3>You have completed this zone!</h3><br><h3>New Skill Slot Unlocked!</h3>`;
      let reward = loreDataCache.zones[player.currentZone.name].reward;
      player.skillSlots = Math.min(6, player.skillSlots + 1);
      player.zoneProgress[player.currentZone.name].completed = true;
      player.beatenZones++;
      player.beatenTiers += max;
      delete player.progressingZone;

      if (reward?.xp) {
        let bonusXp = reward.xp * player.beatenZones;
        finDiv.innerHTML += `<h3>Gained ${bonusXp} xp</h3>`;
        player.zoneProgress[player.currentZone.name].xpGained = bonusXp;
        player.xp += bonusXp;
        let extraLevelUps = checkLevelUp();
        if (extraLevelUps) {
          levelUps += extraLevelUps;
        }
      }
    }

    player.zoneProgress[player.currentZone.name].count = Math.min(Math.max(player.currentZone.count + 1, player.zoneProgress[player.currentZone.name].count), max);

    mainArea.appendChild(finDiv);
    mainArea.appendChild(levelUpDiv);

    animateXpGain({
      elementId: "xp-display",
      barId: "bar-fill-0-xp",
      startXp: oldXp,
      endXp: player.xp,
      maxXp: player.maxXp,
      duration: 2500
    });

  } else {
    finDiv.innerHTML += "<h1>You Have Died!</h1><br>";
    finDiv.innerHTML += xpBar;
    mainArea.appendChild(finDiv);
    mainArea.appendChild(levelUpDiv);
  }

  saveCharacter();
  initializeCombatUnits(player.currentZone.name);

  if (win) {
    menuContent.innerHTML += `
      <button style="width: 50%; margin: 2em 25%; border-radius: 2em;" id="continue-btn" ${forceContinue ? `class="countdown-button"` : ""}>
        <span class="label">Continue?</span>
        <div class="progress-fill"></div>
      </button>`;
  }

  menuContent.innerHTML += `
    <button style="width: 50%; margin: 0% 25%; border-radius: 2em;" id="repeat-btn" ${!forceContinue || !win ? `class="countdown-button"` : ""}>
      <span class="label">Repeat?</span>
      <div class="progress-fill"></div>
    </button>`;

  const button = document.querySelector('.countdown-button');
  if (forceContinue && win) {
    countdownAutoClick(button, "Continue?", 1000 * settings.autoTimer, () => {
      forceContinue = true;
      nextEncounter(true);
      startCombat(true);
    });
    document.getElementById("repeat-btn").onclick = () => {
      forceContinue = false;
      startCombat(true);
    };
  } else {
    countdownAutoClick(button, "Repeat?", 1000 * settings.autoTimer, () => {
      forceContinue = false;
      startCombat(true);
    });
  }

  if (win) {
    player.data.deathsInARow = 0;
    document.getElementById("continue-btn").onclick = () => {
      forceContinue = true;
      nextEncounter(true);
      startCombat(true);
    };
  } else {
    player.data.deathsInARow += 1;
    if (player.data.deathsInARow >= 3) {
      addHint("last-encounter-btn");
      isCombatPaused = true;
      showPopup(`
        <h2 style="color: #d88">Hint: Encounter Tiers</h2>
        You have died ${player.data.deathsInARow} times in a row. As you beat enemies, you progress into more difficult tiers. Pressing the highlighted button will send you back to a previous tier. Try it!
      `);
    }
  }
}
function addHint(elementId, useOverlay) {
    const target = document.getElementById(elementId);
    if (!target) {
        console.warn(`No element found with id '${elementId}'`);
        return;
    }
    if(hintData){
      return;
    }
    // Store the original z-index
    hintData={
      originalZ: target.style.zIndex || getComputedStyle(target).zIndex || 0,
      originalBorder: target.style.border}
    // Create the overlay
    
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.className="popup-overlay"
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0)'; // Slight black hue
    overlay.style.zIndex = 49; // One below the target element
    overlay.style.transition = "background-color 1s ease"
    overlay.onclick = function() {
      isCombatPaused = false;
        target.style.zIndex = hintData.riginalZ;
        target.style.border = hintData.originalBorder;
        hintData = undefined;
        document.querySelectorAll(".popup-overlay").forEach(e => e.remove());
    };

    document.body.appendChild(overlay);
    if(useOverlay){
    setTimeout(()=>overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.4)',10); // Slight black hue
    }

    // Raise the target element
    target.style.zIndex = 50;
    target.style.border = "2px solid blue"

    // Click handler to remove the overlay and reset z-index
    
}
  function showClassMenu() {
    let menu = document.getElementById('menu-content');
    if (!menu) {
        console.error("No #menu-content found");
        return;
    }

    menu.innerHTML = '';

    for (let className in player.classData) {
        let classInfo = player.classData[className];
        if (!classInfo || classInfo.level <= 0) continue;

        let lore = loreDataCache.classes[className];
        if (!lore) {
            console.warn(`No lore data found for class ${className}`);
            continue;
        }

        // ---- ROW ----
        let row = document.createElement('div');
        row.classList.add('class-row');
        row.style.display = 'flex';
        row.style.marginTop = "1em";
        row.style.marginBottom = "1em";
        row.style.border = "2px solid #aaa";
        if(className == player.class){
          row.style.border = "2px solid #393"
        }
        row.style.alignItems = 'center';
        row.style.padding = '0.5em';
        if(lore.bgcolor){
          row.style.background = `linear-gradient(90deg, ${lore.bgcolor}, #000)`;
        }
        

        // Icon
        let img = document.createElement('img');
        img.src = `images/${className.toLowerCase()}.png`;
        img.alt = className;
        img.style.width = '48px';
        img.style.height = '48px';
        img.style.marginRight = '10px';

        // Info
        let info = document.createElement('div');

        let title = document.createElement('div');
        let currentText = className == player.class?" (Selected)":""
        title.textContent = `${className} (Level ${classInfo.level})${currentText}`;
        title.style.fontWeight = 'bold';

        let desc = document.createElement('div');
        desc.textContent = lore.description || 'No description available.';

        info.appendChild(title);
        info.appendChild(desc);

        row.appendChild(img);
        row.appendChild(info);

// ---- SUBDIV ----
let subdiv = document.createElement('div');
subdiv.style.display = 'none';
subdiv.style.marginTop = '0.5em';
subdiv.style.padding = '0.75em';
subdiv.style.borderTop = '1px solid rgba(255, 255, 255, 0.2)';
subdiv.style.background = 'linear-gradient(to right, #222, #333)';
subdiv.style.color = '#ddd';
subdiv.style.borderRadius = '4px';
subdiv.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.3)';
subdiv.textContent = className

// Skill Points
let spText = document.createElement('div');
spText.textContent = `Skill Points: ${classInfo.skillPoints || 0}`;
spText.style.marginBottom = '0.5em';
spText.style.fontWeight = 'bold';
spText.style.color = '#fff';

// Skills Unlocked
let skUnlockText = document.createElement('div');
if (lore && lore.skillTree) {
    let count = lore.skillTree.length;
    let unlockedCount = player.skills.learned.filter(s => s && s.level &&
    lore.skillTree.some(sk => sk.id === s.id)).length;
    skUnlockText.textContent = `Skills Unlocked: ${unlockedCount} / ${count}`;
} else {
    skUnlockText.textContent = 'No Skills Unlocked';
}
skUnlockText.style.marginBottom = '0.5em';
skUnlockText.style.color = '#ccc';

// Button
let button = document.createElement('button');
button.style.padding = '0.5em 1em';
button.style.fontWeight = 'bold';
button.style.border = '1px solid #666';
button.style.borderRadius = '3px';
button.style.backgroundColor = '#555';
button.style.color = '#fff';
button.style.cursor = 'pointer';
button.style.marginTop = '0.5em';
button.onmouseover = () => button.style.backgroundColor = '#666';
button.onmouseout = () => button.style.backgroundColor = '#555';

if (player.class === className) {
    button.textContent = 'Current Class';
    button.disabled = true;
    button.style.backgroundColor = '#444';
    button.style.cursor = 'default';
} else {
    button.textContent = 'Select Class';
    button.onclick = () => selectClass(className);
}

subdiv.appendChild(spText);
subdiv.appendChild(skUnlockText);
subdiv.appendChild(button);
        // Append
        menu.appendChild(row);
        menu.appendChild(subdiv);

        // Click to toggle
        row.onclick = function() {
          let vis = subdiv.style.display == "block";
            document.querySelectorAll('#menu-content > div:nth-child(even)').forEach(d => {
                d.style.display = 'none';
            });
            subdiv.style.display = vis?'none':'block';
        };
    }
}
function selectClass(className){
  player.class = className
  showMenu("classes")
}
function unlockClass(className){
  if(player.classData[className])return;
  player.classData[className] = {
    level: 1,
    skillPoints: 0
  }
  if(loreDataCache.classes[className] && loreDataCache.classes[className].starterSkill && skillsData[loreDataCache.classes[className].starterSkill]){
    let starterSkill = {
    id: loreDataCache.classes[className].starterSkill,
    level: 1
  };
  player.skills.learned.push(starterSkill)
  if(player.skills.equipped.filter(s => s).length < player.skillSlots){
    player.skills.equipped.push(starterSkill)
  }
  }
}
function showClassDetails(className){
  
}
  function checkLevelUp() {
    if (player.xp < player.maxXp) {
      return 0;
    }
    player.xp -= player.maxXp;
    player.level += 1;
    player.classData[player.class].level += 1;
    player.maxXp += 20 + player.classData[player.class].level*3;
    let keys = Object.keys(player.attributes);
    for (let i = 0; i < 6; i++) {
      player.attributesGained[keys[i]] += loreDataCache.classes[player.class].attributes[i];
    }
    player.attributePoints += 3;

    player.classData[player.class].skillPoints += 1;

    updateMenuButton(document.getElementById("character-btn"), "linear-gradient(rgba(50,230,50,0.5),rgba(30,180,30,0.5))")
    if (getAvailableSkills().length > 0) {
      updateMenuButton(document.getElementById("skills-btn"), "linear-gradient(rgba(50,230,50,0.5),rgba(30,180,30,0.5))")
      
    }
    let spPip = document.getElementById('skills-pip');
    let skillPoints = player.classData[player.class].skillPoints
      spPip.textContent = skillPoints <100?skillPoints:""
    return 1+checkLevelUp();
  }
  
  
  function countdownAutoClick(button, text, durationInMs, onClick) {
    const bar = button.querySelector('.progress-fill');
    const label = button.querySelector('.label');
    let startTime = Date.now();
    let clicked = false;

    const totalSeconds = Math.ceil(durationInMs / 1000);

    function update() {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, durationInMs - elapsed);
      const progress = remaining / durationInMs;

      bar.style.width = (progress * 100) + '%';
      label.textContent = `${text} (${Math.ceil(remaining / 1000)})`;

      if (remaining > 0 && !clicked) {
        requestAnimationFrame(update);
      } else if (!clicked) {
        triggerClick();
      }
    }

    function triggerClick() {
      if (clicked || !button.parentNode || !button.parentNode.contains(button)) return;
      clicked = true;
      button.disabled = true;
      label.textContent = 'Clicked!';
      if (typeof onClick === 'function') onClick();
    }

    button.addEventListener('click', triggerClick);
    update();
  }
  function animateXpGain( {
    elementId = "xp-display", barId = "bar-fill-0-xp", startXp, endXp, maxXp, duration = 1000
  }) {
    const textElement = document.getElementById(elementId);
    const barElement = document.getElementById(barId);
    const startTime = performance.now();

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = progress * (2 - progress); // ease-out

      const currentXp = Math.floor(startXp + (endXp - startXp) * eased);
      const percentage = Math.min(1, currentXp / maxXp) * 100;
      if (currentXp > maxXp) {
        currentXp -= maxXp;
        endXp -= maxXp
        startXp -= maxXp
        maxXp += 20;
      }

      textElement.textContent = currentXp.toFixed(2);
      barElement.style.width = `${percentage}%`;

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }

    requestAnimationFrame(update);
  }
  function easeNumber(element, start, end, duration = 1000) {
    const startTime = performance.now();

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = progress * (2 - progress); // ease-out

      const value = Math.floor(start + (end - start) * eased);
      element.textContent = value.toLocaleString();

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }

    requestAnimationFrame(update);
  }
function getEvasionChance(attackerAccuracy, targetEvasion, K = 9, x = 1) {
  
  const hitChance = Math.pow(targetEvasion, x) / 
                    (Math.pow(targetEvasion, x) + Math.pow(attackerAccuracy, x) * K);

  const evasionChance = hitChance;

  // Optional clamp to keep values between 0% and 99%
  if(evasionChance == NaN){
    evasionChance = 0.01;
  }
  return Math.max(0.01, Math.min(0.95, evasionChance));
}

function getStatValue(statName, block, caster, target, skillLevel, skillContext){
  let statValue = calculateEffectiveValue(block, statName, caster, target, skillLevel, skillContext);
        if(skillContext && skillContext.statBonuses){
          console.log("1Bonusing " + statName, JSON.stringify(skillContext.statBonuses, null, 2))
          if(skillContext.statBonuses[statName]){
            let statBonus = skillContext.statBonuses[statName];
            let value = calculateEffectiveValue(statBonus.value, skillContext, caster, target, skillLevel, undefined)
            if(statBonus.effect == "multi"){
              statValue *= value
            }else if(statBonus.effect == "override"){
              statValue = value;
            }else{
              statValue += value;
            }
            console.log("2Bonusing " + statName, statValue)
          }
          
        }
  return statValue;
}
  function calculateEffectiveValue(block, parentObject, caster, target, skillLevel, skillContext) {
    if (!block) {
      console.error("No block defined", new Error().stack);
      return null;
    }

    if (block.base === undefined) {
      if (block.value === undefined) {
        console.error("Block doesn't have a .base or .value", JSON.stringify(block, null, 2), JSON.stringify(parentObject, null, 2), new Error().stack);
        return block;
      } else {
        block.base = block.value;
      }
    }

    let value = block.base;

    if (!Array.isArray(block.scaling) || block.scaling.length === 0) {
      return value;
    }

    for (const scaleEntry of block.scaling) {
      
      const targets = getTarget(caster, target, scaleEntry.target || "self", skillContext);

      target = Array.isArray(targets)?targets:[targets];
      
      const stat = scaleEntry.stat;
      const scale = scaleEntry.scale;
      const effect = scaleEntry.effect || "add";
      let statValue = 0;
      let statType = "";
      for(let entity of target){
      if (entity.attributes?.[stat] !== undefined) {
        statType = "Attribute"
        statValue = entity.attributes[stat];
      } else if (entity.stats?.[stat]?.value !== undefined) {
        statType="Stat"
        statValue = entity.stats[stat].value;

      } else if(conditionsData[stat]){
        statValue = entity.conditions[stat]?.stacks || 0;
      } else if (stat === "skillLevel") {
        statValue = skillLevel;
      }else if (stat === "tier"){
        let tier = 0;
        if(entity.isPlayer){
          tier = entity.classData[player.class].level;
        }else{
          tier = entity.tier || 0;
        }
        statValue = tier;
      } else if(stat == "skillTarget"){
        
        }else {
        console.warn(`Stat "${stat}" not found in ${scaleEntry.target}`, scaleEntry);
        console.log(entity.conditions, entity.conditions[stat], stat)
      }

      if (typeof value !== "number") {
        console.error("Value is not a number", value);
      }
      if(!effect || effect == "add"){
      value += statValue * scale;
      }
      else{
        value *= Math.pow(scale, statValue);
      }
    }
      

    
    }
if (typeof block.min === "number") {
  value = Math.max(value, block.min);
}
if (typeof block.max === "number") {
  value = Math.min(value, block.max);
}

// Apply multipliers if defined
if (block.multipliers && typeof block.multipliers === "object") {
  for (const key of Object.keys(block.multipliers)) {
    const multiplierFn = block.multipliers[key];
    if (typeof multiplierFn === "function") {
      try {
        value = multiplierFn(value, {
          caster,
          target,
          skillLevel,
          skillContext,
          parentObject,
          block
        });
      } catch (e) {
        console.error(`Error applying multiplier "${key}":`, e);
      }
    } else {
      console.warn(`Multiplier "${key}" is not a function`);
    }
  }
}
return value;
}
  
  function setStatValue(entity, stat, value) {
  if (entity.attributes?.[stat] !== undefined) {
    entity.attributes[stat] = value;
    return;
  }

  if (entity.stats?.[stat]?.value !== undefined) {
    entity.stats[stat].value = value;
    return;
  }

  if (conditionsData[stat]) {
    if (!entity.conditions[stat]) entity.conditions[stat] = { stacks: 0 };
    entity.conditions[stat].stacks = value;
    return;
  }

  if (stat === "skillLevel" && typeof skillLevel === "number") {
    skillLevel = value;
    return;
  }

  if (stat === "tier") {
    if (entity.isPlayer) {
      entity.classData[player.class].level = value;
    } else {
      entity.tier = value;
    }
    return;
  }

  console.warn(`Stat "${stat}" not found in ${scaleEntry?.target}`, scaleEntry);
  console.log(entity.conditions, entity.conditions?.[stat], stat);
}
  
  function formatSkillLevelScalingsWithLabels(skillId, paths) {
  const results = [];
  const skillData = skillsData[skillId];
  const skillName = skillData?.name || skillId;

  if (!paths) {
    console.log("no paths");
    return "";
  }

  for (const path of paths) {
    // Follow the path to get to the scaling object
    let value = skillData;
    for (let i = 0; i < path.length; i++) {
      value = value[path[i]];
    }

    // Handle scaling
    let isDuration = path.includes("duration");
    const scalingArray = value.scaling || [];
    const skillLevelScales = scalingArray
      .filter(s => s.stat === "skillLevel")
      .map(s => {
        const prefix = isDuration ? "Duration " : "";
        const sign = s.scale >= 0 ? (!s.effect || s.effect === "add" ? "+" : "*") : "";
        const scaleValue = isDuration ? (s.scale / 1000) + "s" : s.scale;
        return `${prefix}${sign}${scaleValue} per level`;
      })
      .join("<br>");

    // Build label
    let label = path.join('.'); // default fallback

    if (path.includes("effects")) {
      const effectIndex = path[path.indexOf("effects") + 1];
      const effect = skillData.effects?.[effectIndex];

      if (effect && effect.type) {
        const type = effect.type;
        const count = skillData.effects
          .slice(0, effectIndex + 1)
          .filter(e => e.type === type).length;

        if (type === "summon") {
          if (path.includes("tier")) {
            label = `Summon Tier (${count})`;
          } else {
            label = `Summon (${count})`;
          }
        } else if (type === "condition") {
          if (path.includes("stacks")) {
            label = `${capitalize(effect.name)} Stacks (${count})`;
          } else {
            label = `${capitalize(effect.name)} (${count})`;
          }
        } else {
          label = `${capitalize(type)} (${count})`;
        }
      }
    }

    // Append formatted result
    results.push(`<span style="color: #9c9;">--${fromCamelCase(label)} ${skillLevelScales}</span><br>`);
  }

  return results.join(" ");
}

// Helper to capitalize first letter
function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

  function showStatusPopup(unitId, x = 100, y = 100) {
    let unit = findUnitById(unitId)
    const existingPopup = document.getElementById("popup-overlay");
    if (existingPopup) existingPopup.remove();
    const overlay = document.createElement("div");
    overlay.id = "popup-overlay";
    overlay.style.position = "fixed";
    overlay.style.top = 0;
    overlay.style.left = 0;
    overlay.style.width = "100vw";
    overlay.style.height = "100vh";
    overlay.style.zIndex = 999;
    overlay.style.background = "rgba(0,0,0,0.0)";
    // Create popup
    const popup = document.createElement("div");
    popup.className = "popup";
    popup.style.position = "absolute";
    popup.style.left = "50%";
    popup.style.top = "50%";
    popup.style.transform = "translate(-50%, -50%)";
    popup.style.zIndex = 1000;
    popup.style.backgroundColor = "#666";
    popup.style.color = "#fff";
    popup.style.padding = "10px";
    popup.style.border = "2px solid #444";
    popup.style.borderRadius = "10px";
    popup.style.maxWidth = "80vw";
    popup.style.maxHeight = "80vh";
    popup.style.overflowY = "auto";
    popup.style.boxShadow = "0 0 10px #000";

    function renderStatusBars() {
      popup.innerHTML = "Statuses:";
      popup.classList.remove("hidden");

      const now = Date.now();

      function addEffectBar(effect, type, color) {
        
        const remaining = Math.max(0, effect.duration - (now - effect.startTime));
        if(remaining <= 0){
          return;
        }
        const pct = (remaining / effect.duration) * 100;

        const bar = document.createElement("div");
        bar.className = "bar";
        bar.style.background = "#333";
        bar.style.position = 'relative';

        const fill = document.createElement("div");
        fill.className = "bar-fill";
        fill.style.width = pct + "%";
        fill.style.background = color;
        let resistanceType = effect.resistanceType;
        let name = effect.name?effect.name: effect.type == "debuff" || effect.type == "buff"?`${capitalize(effect.type)} ${resistanceType?capitalize(resistanceType) + " Resistance":(effect.stat)
        } ${effect.effect == "add"?"+": "x"}${resistanceType?(1/effect.value).toFixed(2):effect.value.toFixed(2)}: ${(remaining/1000).toFixed(2)}s`: "undefined"
        if (effect.type == "condition" && effect.stacks) {
          name += ` (${effect.stacks})`
          bar.onclick = (e) => setTimeout(() => {
            e.stopPropagation();
            showPopup(`
              <div>${effect.name}:</div><br>
              <span>${conditionsData[effect.name].description(unit.conditions[effect.name].caster, unit)}</span>
              `)}, 1);
        }
        let label = document.createElement("div");
        label.style.position = "absolute";
        label.style.left = "50%";
        label.style.top = "50%";

        label.style.transform = "translate(-50%, -50%)";
        label.style.color = "white";
        label.style.pointerEvents = "none";
        label.style.zIndex = "1"
        label.textContent = name
        bar.appendChild(fill);
        bar.appendChild(label)
        popup.appendChild(bar);
        resizeTextToFitParent(label)
      }

      if (!unit.buffs) {
        unit.buffs = [];
      }
      if (!unit.debuffs) {
        unit.debuffs = [];
      }
      if (!unit.conditions) {
        unit.conditions = [];
      }
      if (unit.buffs.length === 0 && unit.debuffs.length === 0 && Object.keys(unit.conditions).length === 0) {
        popup.innerHTML = "Statuses: None"
      } else {
        popup.innerHTML = "Statuses:";
      }
      unit.buffs.forEach(buff => addEffectBar(buff, "buff", "green"));
      unit.debuffs.forEach(debuff => addEffectBar(debuff, "debuff", "red"));
      Object.keys(unit.conditions).forEach(con => {

        const conCopy = {}; // prevent mutation
        conCopy.type = "condition";
        conCopy.name = con;
        conCopy.stacks = unit.conditions[con].stacks || 1;
        conCopy.descriptionText = conditionsData[con].description(unit.conditions[con].caster, unit);
        addEffectBar(conCopy, "condition", "purple");
      });
    }

    clearInterval(statusPopupInterval);
    renderStatusBars();
    statusPopupInterval = setInterval(renderStatusBars, updateSpeed);
    overlay.addEventListener("click", () =>
      {
        clearInterval(statusPopupInterval)
        overlay.remove();
      })
    overlay.appendChild(popup);
    document.body.appendChild(overlay)
  }

  // Global event listener registry
  const eventListeners = {};

  // Event class
  class EventType {
    constructor(name) {
      this.name = name;

      // Initialize array for listeners if not already present
      if (!eventListeners[name]) {
        eventListeners[name] = [];
      }
    }

    // Emit event to all listeners for this name
    emit(...args) {
      const listeners = eventListeners[this.name] || [];
      for (const listener of listeners) {
         listener(...args);
      }
    }
    removeListener(callback) {
  const listeners = eventListeners[this.name];
  if (!listeners) return;

  const index = listeners.indexOf(callback);
  if (index !== -1) {
    listeners.splice(index, 1);
  }
}

    // Optional: allow adding listeners from instance
    on(callback) {
      eventListeners[this.name].push(callback);
    }
  }

  // Example usage:

  // Create an event type
  const onDamageEvent = new EventType("onDamage");
  const summonUnitEvent = new EventType("summonUnit");
  const statusStartEvent = new EventType("statusStart");
  const statusEndEvent = new EventType("statusEnd");
  const applyEffectEvent = new EventType("applyEffect");
  const conditionStackEvent = new EventType("conditionStack")
  const castSkillEvent = new EventType("castSkill");
  const startCombatEvent = new EventType("startCombat");
  const finishCombatEvent = new EventType("finishCombat");
  const recalculateStatEvent = new EventType("recalculateStat");
  const levelUpEvent = new EventType("levelUp");
  const deathEvent = new EventType("death");

  recalculateStatEvent.on((u, s, o, n) => {
    if (u.isAlly) {}
  })
  function capitalize(str) {
    if (!str) return "";
    return str[0].toUpperCase() + str.slice(1).toLowerCase();
  }
  function decapitalize(str) {
    if (!str) return "";
    return str[0].toLowerCase() + str.slice(1);
  }
  
  function getDamageComponents(type, breakdownMap, multiplier = 1, result = {}) {
    type = type.toLowerCase();

    // Add or accumulate current type’s contribution
    result[type] = (result[type] || 0) + multiplier;

    const breakdown = breakdownMap[type];
    if (!breakdown || Object.keys(breakdown).length === 0) {
        return result;
    }

    for (const [parent, percent] of Object.entries(breakdown)) {
        getDamageComponents(parent, breakdownMap, multiplier * percent, result);
    }
    
    return result;
}
function getEffectiveResistanceMultiplier(type, resistances, breakdownMap) {
  //if(type != "magic") return;
    const components = getDamageComponents(type, breakdownMap);

    let blocked = 0;
    
    for (const [compType, fraction] of Object.entries(components)) {
        const resist = resistances[compType.toLowerCase()] ?? 1; // 1 = no resistance
        const effect = 1 - resist; // amount blocked by this component
        
        blocked += fraction * effect;
    }

    const finalMultiplier = Math.max(0, 1 - blocked); // ensure it's not negative
    return finalMultiplier;
}


function hardReset(characterId) {
  const now = Date.now();
  const btn = document.getElementById('hard-reset-btn');
  const { hardReset } = settings;

  if (now - hardReset.lastClick > hardReset.timeout) {
    hardReset.clickCount = 0;
  }

  hardReset.lastClick = now;
  hardReset.clickCount++;

  if (hardReset.resetTimer) {
    clearTimeout(hardReset.resetTimer);
  }

  hardReset.resetTimer = setTimeout(() => {
    hardReset.clickCount = 0;
    btn.textContent = "Hard Reset";
  }, hardReset.timeout);

  if (hardReset.clickCount === 1) {
    btn.textContent = "Click 2 more times to confirm reset...";
  } else if (hardReset.clickCount === 2) {
    btn.textContent = "1 more click to confirm reset...";
  } else if (hardReset.clickCount >= 3) {
    const confirmed = confirm("Are you sure you want to hard reset? This will delete all data.");
    if (confirmed) {
      localStorage.removeItem(`mythos-character-slot-${characterId}`);
      location.reload();
    } else {
      btn.textContent = "Hard Reset";
    }
    hardReset.clickCount = 0;
    clearTimeout(hardReset.resetTimer);
  }
}


function renderCharacterMenu() {
  const container = document.getElementById('main-area');
  container.innerHTML = ''; // Clear previous content
  const saveKey = `mythos-saveData`;
  const saveString = localStorage.getItem(saveKey);
  let unlockedSlots = 3;
  if (saveString) {
    const saveData = JSON.parse(saveString);
    unlockedSlots = saveData.characterSlots || 3;
  }

  for (let i = 1; i <= 5; i++) {
    const key = `mythos-character-slot-${i}`;
    const data = localStorage.getItem(key);
    const slot = document.createElement('div');
    slot.className = 'character-slot';

    if (i > unlockedSlots) {
      slot.classList.add("locked");
      slot.innerHTML = `
        <h3>Slot ${i}: Locked</h3>
      `;
      container.appendChild(slot);
      continue;
    }

    if (data) {
      try {
        slot.classList.add("used");
        const char = JSON.parse(data).playerData;
        const classLevel = (char.classData?.[char.class]?.level) || 0;

        slot.innerHTML = `
          <div class="character-info-container" style="display: flex; align-items: center; position: relative;">
                          <button class="char-info-btn" onclick="showCharacterPopup(${i})">i</button>
            <img src="images/${char.class}.png" alt="Character Class Icon" style="width: 64px; height: 64px; margin-right: 10px;">
            <div>
              <h3>Slot ${i}: ${char.name} (Lv ${char.level})</h3>
              <p>${char.race} - ${char.class} (Class Lv ${classLevel})</p>
              <div class="slot-buttons">
                <button class='select-char-btn' onclick="selectCharacter(${i})">Select</button>
                <button class="delete-char-btn" onclick="deleteCharacter(${i})">Delete</button>
              </div>
            </div>
          </div>
        `;
      } catch (e) {
        deleteCharacter(i);
      }
    } else {
      slot.classList.add("empty");
      slot.innerHTML = `
        <h3>Slot ${i}: Empty</h3>
        <div class="slot-buttons">
          <button onclick="showCharacterCreation(${i})">Create New Character</button>
        </div>
      `;
    }

    container.appendChild(slot);
  }
}

function backToCharSelect(){
  saveCharacter();
  player = JSON.parse(JSON.stringify(originalPlayer))
  document.getElementById("menu-content").classList.add("hidden")
  document.getElementById("menu-buttons").classList.add("hidden")
  renderCharacterMenu();
}

function selectCharacter(slot) {
  // Replace with your character loading logic
  console.log(`Character in slot ${slot} selected.`);
  
  
  const key = `mythos-character-slot-${slot}`;
    const data = JSON.parse(localStorage.getItem(key));
    const char = data.playerData;
    player = char;
    settings = data.settingsData
    let testGear = false;
    if(testGear){
    Object.keys(gearTypes).forEach(gt => {
      let inputOres = []
          for (let i = 0; i < gearTypes[gt].oreRequired; i++) {
            const oreName = Object.keys(oresData)
              .random();
            const existing = inputOres.find(entry => Object.keys(entry)[0] === oreName);
            if (existing) existing[oreName]++;
            else inputOres.push({ [oreName]: 1 });
          }

      Object.keys(itemQualities).slice(0,6).forEach(quality => {

        player.inventory.storage.push(buildGear(gt, 1, quality, inputOres))
      })
    })
    }
    document.getElementById("menu-content").classList.remove("hidden")
    
    document.getElementById("top-bar").style.display = "flex"
    document.getElementById("menu-buttons").classList.remove("hidden")
    showMenu("journey")
    if(runAnalysis){
    planetAnalysis();
    }
}

function deleteCharacter(slot) {
  if (confirm('Are you sure you want to delete the character in slot '+slot+' ?')) {
    localStorage.removeItem(`mythos-character-slot-${slot}`);
    renderCharacterMenu();
  }
}

function saveCharacter(){
  let saveData = {
    settingsData: settings,
    playerData: player
  }
  localStorage.setItem(`mythos-character-slot-${player.characterId}`, JSON.stringify(saveData))
}


function showCharacterPopup(id) {
  const data = localStorage.getItem(`mythos-character-slot-${id}`);
  if (!data) return alert("Character not found.");

  let parsed;
  try {
    parsed = JSON.parse(data);
  } catch (e) {
    return alert("Failed to parse character data.");
  }

  const classData = parsed.playerData?.classData || {};
  const classNames = Object.keys(classData).map(key => [key, `(${classData[key].level})`]);
  const classLevels = Object.keys(classData).map(name => classData[name].level);

  while (classNames.length < 3) {
    classNames.push("Empty");
    classLevels.push(0);
  }

  // Generate point colors based on class bgcolor
  const pointColors = Object.keys(classData).map(name => {
    return loreDataCache.classes?.[name]?.bgcolor || "#888";
  });

  const existing = document.getElementById("popup-overlay");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "popup-overlay";
  Object.assign(overlay.style, {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    zIndex: 48,
    backgroundColor: "rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  });
  overlay.className = "popup-overlay";
  overlay.addEventListener("click", () => overlay.remove());

  const popup = document.createElement("div");
  Object.assign(popup.style, {
    backgroundColor: "#2e2e2e",
    color: "#fff",
    padding: "20px",
    borderRadius: "12px",
    maxWidth: "90vw",
    width: "350px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
    textAlign: "center",
    border: "1px solid #888"
  });

  const title = document.createElement("h2");
  title.textContent = "Character Class Levels";
  title.style.marginBottom = "10px";
  title.style.fontFamily = "sans-serif";

  const canvas = document.createElement("canvas");
  const canvasId = `radarChart-${id}`;
  canvas.id = canvasId;
  canvas.width = 300;
  canvas.height = 300;
  canvas.style.marginTop = "10px";

  popup.appendChild(title);
  popup.appendChild(canvas);
  overlay.appendChild(popup);
  document.body.appendChild(overlay);

  const ctx = canvas.getContext("2d");
  new Chart(ctx, {
    type: 'radar',
    data: {
      labels: classNames,
      datasets: [{
        label: 'Class Levels',
        data: classLevels,
        backgroundColor: 'rgba(30, 144, 255, 0.1)',
        borderColor: 'dodgerblue',
        pointBackgroundColor: pointColors,
        pointBorderColor: pointColors,
        pointHoverBackgroundColor: pointColors,
        pointHoverBorderColor: '#fff',
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        r: {
          beginAtZero: true,
          suggestedMax: Math.max(...classLevels),
          grid: {
            color: 'rgba(255,255,255,0.1)'
          },
          pointLabels: {
            color: '#fff',
            font: {
              size: 12,
              family: 'sans-serif'
            }
          },
          ticks: {
            stepSize: Math.floor(parsed.playerData.level/30)*10,            // Force ticks to increment by 5
            max: Math.max(...classLevels), // Hard max
            color: '#ccc',
            font: {
              size: 7,
              family: 'sans-serif'
            },
            backdropColor: 'transparent'
          }
        }
      }
    }
  });
}
function buildGear(gearType, tier, quality, ores) {
  const gear = gearTypes[gearType];
  const oreList = ores;
  const qualityBonusCount = {
    rusty: 0, common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5,
    mythic: 6, artifact: 6, divine: 0, cursed: 0
  }[quality.toLowerCase()];

  const oreBonuses = {};
  const baseBonuses = {}; // 🧱 Static baseStatBoosts from gear type
  const rolledBonuses = {}; // 🎲 Rolled gear bonuses (still separate from base)
  const resistances = {};
  let rolledBonusCount = 0;
  // --- Apply Ore Bonuses ---
  for (const oreEntry of oreList) {
  
    const [oreName, amount] = Object.entries(oreEntry)[0];
    const ore = oresData[oreName];
    console.log(oreName, "??")
    if (ore.bonus) {
      console.log(oreName, ore.bonus)
      const stat = ore.bonus.stat;
      const multi = ore.bonus.multi;
      const adjusted = multi < 1 ? (1 / (1 + 0.0005 * tier)) : (1 + 0.0005 * tier);
      if (!oreBonuses[stat]) oreBonuses[stat] = 1;
      oreBonuses[stat] *= Math.pow(multi * adjusted, amount);
    }
    else{
      console.log(oreName,"no ore bonus")
    }
    if (ore.resistances) {
      for (const [res, resVal] of Object.entries(ore.resistances)) {
        if (!resistances[res]) resistances[res] = 1;
        resistances[res] *= Math.pow(resVal / (1 + 0.0005 * tier), amount);
      }
    }
  }

  // --- Apply Base Gear Bonuses (baseStatBoosts) ---
  if (gear.baseStatBoosts) {
    for (const boost of gear.baseStatBoosts) {
      const stat = boost.stat;
      const baseMulti = boost.multi;
      const adjusted = baseMulti < 1 ? (1 / (1 + 0.001 * tier)) : (1 + 0.001 * tier);
      baseBonuses[stat] = {
        multi: baseMulti * adjusted,
        count: 1
      };
    }
  }

  // --- Roll Weighted Bonuses ---
  function rollWeightedStats(stats, rollCount) {
    const allStats = [];
    for (const s of stats) {
      for (let i = 0; i < s.weight; i++) {
        allStats.push(s);
      }
    }

    for (let i = 0; i < rollCount; i++) {
      const statEntry = allStats[Math.floor(Math.random() * allStats.length)];
      const stat = statEntry.stat;
      const baseMulti = statEntry.multi;

      if (!rolledBonuses[stat]) {
        const adjusted = baseMulti < 1 ? (1 / (1 + 0.001 * tier)) : (1 + 0.001 * tier);
        rolledBonuses[stat] = {
          multi: baseMulti * adjusted,
          count: 1
        };
        rolledBonusCount++;
      } else {
        const enhancementMultiplier = 1 + (qualityBonusCount * 0.03);
        let current = rolledBonuses[stat].multi;

        if (current < 1) {
          current = 1 / current;
          current *= enhancementMultiplier;
          rolledBonuses[stat].multi = 1 / current;
        } else {
          rolledBonuses[stat].multi = current * enhancementMultiplier;
        }

        rolledBonuses[stat].count += 1;
      }
    }
  }

  rollWeightedStats(gear.statBoosts, qualityBonusCount);

  // --- Merge baseBonuses + rolledBonuses into gearBonuses ---
  const gearBonuses = {};
  const allGearStats = new Set([...Object.keys(baseBonuses), ...Object.keys(rolledBonuses)]);

  for (const stat of allGearStats) {
    const base = baseBonuses[stat]?.multi || 1;
    const roll = rolledBonuses[stat]?.multi || 1;
    const count = (baseBonuses[stat]?.count || 0) + (rolledBonuses[stat]?.count || 0);

    gearBonuses[stat] = {
      multi: parseFloat((base * roll).toFixed(6)),
      count: count
    };
  }

  // --- Final totalBonuses = oreBonuses * gearBonuses ---
  const totalBonuses = {};
  const allStats = new Set([...Object.keys(oreBonuses), ...Object.keys(gearBonuses)]);
  for (const stat of allStats) {
    const ore = oreBonuses[stat] || 1;
    const gear = gearBonuses[stat]?.multi || 1;
    totalBonuses[stat] = parseFloat((ore * gear).toFixed(6));
  }

  return {
    name: gearType,
    type: "Gear",
    slot: gear.slot,
    tier: tier,
    count: 1,
    quality: quality,
    ores: ores,
    rolledBonusCount: rolledBonusCount,
    oreBonuses: Object.fromEntries(Object.entries(oreBonuses).map(([s, m]) => [s, parseFloat(m.toFixed(6))])),
    gearBonuses: Object.fromEntries(
      Object.entries(gearBonuses).map(([stat, { multi, count }]) => [
        stat,
        { multi: parseFloat(multi.toFixed(6)), count }
      ])
    ),
    totalBonuses: Object.entries(totalBonuses).map(([stat, multi]) => ({ stat, multi })),
    totalResistances: Object.fromEntries(
      Object.entries(resistances).map(([res, multi]) => [res, parseFloat(multi.toFixed(6))])
    )
  };
}
function invertedWeightedRandom(dict) {
  // Convert object to entries
  const entries = Object.entries(dict);

  // Calculate inverted weights (1 / weight), avoiding division by 0
  const invertedWeights = entries.map(([key, weight]) => {
    const safeWeight = weight <= 0 ? 0.001 : weight;
    return [key, 1 / safeWeight];
  });

  // Calculate total weight
  const total = invertedWeights.reduce((sum, [, w]) => sum + w, 0);

  // Roll a random number
  let roll = Math.random() * total;

  // Pick the entry based on inverted weights
  for (const [key, weight] of invertedWeights) {
    if (roll < weight) return [key, dict[key]];
    roll -= weight;
  }

  // Fallback (shouldn't happen if weights are valid)
  return invertedWeights[0];
}

// Returns 0, 1, or 2 depending on power level
function rollLogRandom(power) {
  if (power < 10) return 0;

  const logP = Math.log10(power);
  const maxTier = Math.floor(logP);
  const weights = [];

  const rampPower = 3; // higher = rarer higher tiers

  // Base tier weight (always fallback)
  weights.push(1); // tier 0

  for (let i = 1; i <= maxTier; i++) {
    const w = Math.max(0, logP - i) ** rampPower;
    weights.push(w);
  }

  const total = weights.reduce((a, b) => a + b, 0);
  const roll = Math.random() * total;

  let cumulative = 0;
  for (let i = weights.length - 1; i >= 0; i--) {
    cumulative += weights[i];
    if (roll < cumulative) return i;
  }

  return 0;
}
function updateResistancesSection(unit) {
  // Step 1: Recalculate total resistances
  recalculateTotalResistances(unit);

  // Step 2: Get the section to update
  const resistSection = document.getElementById("resistances-section");
  if (!resistSection) return;

  // Step 3: Clear the section
  resistSection.innerHTML = "";

  // Step 4: Build table header
  let tableHTML = `<div class="resist-table">
                     <div class="resist-row resist-header">
                       <div class="resist-cell">Damage Type</div>
                       <div class="resist-cell">Final Damage Taken Multiplier</div>
                     </div>`;

  // Step 5: Add each resistance that isn't exactly 1
  for (const [type, value] of Object.entries(unit.totalResistances)) {
    if (value !== 1) {
      tableHTML += `<div class="resist-row">
                      <div class="resist-cell">${capitalize(type)} ${getDamageTypeIcon(type)}</div>
                      <div class="resist-cell">${value.toFixed(4)}</div>
                    </div>`;
    }
  }

  tableHTML += `</div>`;

  // Step 6: Set the new HTML
  resistSection.innerHTML = tableHTML;
}
function getRandomQuality(tier, maxQuality = 6) {
  const weights = [];

  for (let q = 0; q <= maxQuality; q++) {
    if (q === 0) {
      weights.push(1); // Base weight for quality 0
    } else {
      const weight = (Math.pow(tier, 0.6)/10) / (Math.pow(q, 4) + 1);
      weights.push(weight);
    }
  }

  // Normalize weights
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const normalized = weights.map(w => w / totalWeight);

  // Random selection based on weights
  const rand = Math.random();
  let cumulative = 0;

  for (let i = 0; i < normalized.length; i++) {
    cumulative += normalized[i];
    if (rand < cumulative) return i;
  }

  return maxQuality; // Fallback
}

function showDebugPopup() {
    let logText = ""
    if(debugLog && debugLog.length > 0){
      logText = debugLog.join('\n');
    }else{
      logText = "There is nothing here";
    }
    logText +=`\nPLAYERDATA: ${JSON.stringify(player, null, 2)}`
    logText +=`\nCOMBATUNITS: ${JSON.stringify(combatUnits, null, 2)}`
    logText +=`\nSETTINGS: ${JSON.stringify(settings, null, 2)}`
    
    const html = `
        <div style="background: linear-gradient('#555','#222'); display: flex; flex-direction: column; width: 100%;">
            <textarea readonly style="
                width: 100%;
                height: 300px;
                resize: none;
                overflow-y: scroll;
                white-space: pre;
                background: #f0f0f0;
                color: #000;
                padding: 10px;
                border: 1px solid #ccc;
                font-family: monospace;
                font-size: 7px;
            ">${logText}</textarea>
            <button onclick="event.stopPropagation();
            navigator.clipboard.writeText(\`${logText.replace(/`/g, '\\`')}\`)">
                Copy to Clipboard
            </button>
        </div>
    `;

    setTimeout(() => showPopup(html), 1);
}

