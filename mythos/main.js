let loreDataCache = null;
let damageTypeMultipliers = null;
let skillsData = null;
let unitsData = null;
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
let skillIntervals = [];
let isDragging = false;
let startX, startY, scrollLeft, scrollTop;
let statusPopupInterval = null;
let settings = {
  confirmLeaveCombat: true,
  friendlyFire: false
}
const conditionsData = {
  Stunned: {
    description: (caster) => {
      return `Target can not make actions while stunned.`
    },
    init: () => {
      statusStartEvent.on((effect, caster, target, skillId) => {
        if (player.inCombat && findUnitById(target.id) && target.conditions && target.conditions["Stunned"] && target.conditions["Stunned"].stacks > 0) {
          if(!target.stunTimeouts){
            target.stunTimeouts = [];
          }
          target.stunTimeouts.push(setTimeout(() => {
            if (player.inCombat && findUnitById(target.id) && target.conditions && target.conditions["Stunned"] && target.conditions["Stunned"].stacks > 0) {
              if(target.stunTimeouts){
                target.stunTimeouts.forEach(st => clearTimeout(st));
              }
              delete target.conditions["Stunned"];
              statusEndEvent.emit(effect, caster, target, skillId);
              updateStatusButton(target)
            }
          },
            effect.duration));
        }
      });
    }
  },
  Burning: {
    description: (caster) => {
      return `Burning deals damage over time for each stack, and then reduces stacks by 1 every tick.`
    },
    init: () => {
      statusStartEvent.on((effect,
        caster,
        target,
        skillId) => {
        if (player.inCombat && findUnitById(target.id) && target.conditions && target.conditions["Burning"] && target.conditions["Burning"].stacks > 0) {
          burningIntervals[target.id] = setInterval(() => {
            if (player.inCombat && findUnitById(target.id) && target.conditions && target.conditions["Burning"]) {
              if (target.conditions["Burning"].stacks > 0) {
                let finalDmg = damageUnit(caster, target, "heat", target.conditions["Burning"].stacks)
                target.conditions["Burning"].stacks -= 1;
                updateStatusButton(target)
                updateCombatLog(`${target.name} took ${finalDmg} ${getDamageTypeIcon("heat")} damage from Burning.`, caster, target)
              } else {
                updateStatusButton(target)
                clearInterval(burningIntervals[target.id])
              }
            } else {
              clearInterval(burningIntervals[target.id])
            }
          },
            1500 * (9/(10+target.conditions["Burning"].stacks)))
        }
      });
    }
  },
  Corruption: {
    description: (caster) => {
      return `Once reaching 5 stacks, reset stacks and deal 3 ${getDamageTypeIcon("blight")} damage per stack, plus 1 base damage per point of the casters willpower.<br>Total: ${(caster.attributes.willpower + 15)}`
    },
    init: () => {
      statusStartEvent.on((effect,
        caster,
        target,
        skillId) => {
        if (target.conditions && target.conditions["Corruption"] && target.conditions["Corruption"].stacks >= 5) {
          let dmg = target.conditions["Corruption"].stacks*3+caster.attributes.willpower
          let finalDmg = damageUnit(caster, target, "blight", dmg)
          target.conditions["Corruption"].stacks = 0;
          updateCombatLog(`Corruption takes hold of ${target.name}, dealing ${finalDmg} ${getDamageTypeIcon("blight")} damage.`, caster)
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
  index: 0,
  level: 1,
  xp: 0,
  maxXp: 30,
  attributePoints: 0,
  skillPoints: 0,
  totalResistances: {}, statusResistances: {},
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
stats: {
  hp: {
    display: "HP",
    value: 70
  },
  maxHp: {
    display: "Max HP",
    base: 20,
      scaling: [{ target: "caster", stat: "constitution", scale: 10 }],
    value: 70
  },
  hpRegen: {
    display: "HP Regen",
    base: 0,
    scaling: [{ target: "caster", stat: "constitution", scale: 0.05 }],
    value: 0
  },
  sp: {
    display: "SP",
    value: 50
  },
  maxSp: {
    display: "Max SP",
    base: 20,
    scaling: [{ target: "caster", stat: "constitution", scale: 2 }],
    value: 20
  },
  spRegen: {
    display: "SP Regen",
    base: 1,
    scaling: [{ target: "caster", stat: "strength", scale: 0.1 }],
    value: 1
  },
  spEfficiency: {
    display: "SP Efficiency",
    base: 1,
    scaling: [{ target: "caster", stat: "dexterity", scale: -0.01 }],
    value: 1
  },
  mp: {
    display: "MP",
    value: 20
  },
  maxMp: {
    display: "Max MP",
    base: 20,
    scaling: [
      { target: "caster", stat: "wisdom", scale: 2 },
      { target: "caster", stat: "willpower", scale: 3 }
    ],
    value: 20
  },
  mpRegen: {
    display: "MP Regen",
    base: 1,
    scaling: [{ target: "caster", stat: "intellect", scale: 0.1 }],
    value: 1
  },
  mpEfficiency: {
    display: "MP Efficiency",
    base: 1,
    scaling: [{ target: "caster", stat: "wisdom", scale: -0.01 }],
    value: 1
  },
  attackPower: {
    display: "Attack Power",
    base: 5,
    scaling: [{ target: "caster", stat: "strength", scale: 2 }],
    value: 1
  },
  spellPower: {
    display: "Spell Power",
    base: 5,
    scaling: [{ target: "caster", stat: "intellect", scale: 2 }],
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
  evasionChance: {
    display: "Evasion Chance",
    value: 0
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
    base: 1,
    scaling: [
      { target: "caster", stat: "dexterity", scale: -0.005 },
      { target: "caster", stat: "wisdom", scale: -0.005 }
    ],
    value: 1
  },
  armorPenetration: {
    display: "Armor Penetration",
    value: 1
  },
  magicPenetration: {
    display: "Magic Penetration",
    value: 1
  }
},
  inventory: {
    equipped: {
      head: null,
      torso: null,
      legs: null,
      hands: null,
      feet: null,
      weapon: null
    },
    storage: {
      swordOfApophis: {
        display: "Sword of Apophis",
        equippable: true,
        type: "Weapon",
        count: 1,
        color: "#d84",
        description: "An ancient relic that once belonged to the God of Chaos",
        bonuses: [`- Basic attacks deal an additional 1-30 ${getDamageTypeIcon("blight")} damage.`, "- Become the God of Chaos."]
      },
      valkyriesHelmet: {
        display: "Helm of the Valkyrie",
        equippable: true,
        type: "Head",
        count: 1,
        color: "#dd7",
        description: "A helmet forged by the divine. Grants the user power over life and death.",
        bonuses: [`- 25% Resistance to ${getDamageTypeIcon("blight")} damage.`, `- 25% Bonus ${getDamageTypeIcon('radiant')} Damage Dealt.`]
      }
    }
  },
  skills: {
    equipped: [],
    learned: [],
    combatData: {
      targets: {},
      lastUsed: {}
    }
  },
  zoneProgress: [],
  zone: {},
  conditions: [],
  buffs: [],
  debuffs: [],
};
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

  if (!loreDataCache) {
    const [loreRes,
      multiplierRes,
      skillsRes,
      unitsRes] = await Promise.all([
        fetch("game_lore_data.json"),
        fetch("damageType_multipliers.json"),
        fetch("skills.json"),
        fetch("units.json")
      ]);
    console.log("fetching loredata")
    loreDataCache = await loreRes.json();
    console.log("fetching skillsdata")
    skillsData = await skillsRes.json();
    console.log("fetching damage type")
    damageTypeMultipliers = normalizeDamageTypeMultipliers(await multiplierRes.json());
    unitsData = await unitsRes.json();
    const allTypes = Object.keys(damageTypeMultipliers);
    Object.keys(skillsData).forEach(sk => {
      skillsData[sk].levelUpEffects = findSkillLevelScalingPaths(skillsData[sk]);
    })
    
    function formatDamageTypesInText(text) {

      for (const type of allTypes) {
        const regex = new RegExp(`\\b(${type})\\b`, 'gi'); // 'gi' so it finds all variants
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

  return loreDataCache;
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

    if (true) {
      damageTypeMultipliers = normalizeDamageTypeMultipliers(damageTypeMultipliers);
      Object.values(conditionsData).forEach(con => {
        con.init();
      })
      showCharacterCreation();
    } else {
      document.getElementById("menu-buttons").style.display = "flex";
      showMenu("lore");
    }
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
  if(statName == "hp" || statName == "sp" || statName == "mp"){
    return;
  }
  if (!stat) {
    console.warn(`Stat "${statName}" not found on unit.`);
    return;
  }
  if(isNaN(stat.value)){
    console.error("yeah")
    stat.value = 0;
  }
  console.log(stat);
  let base = calculateEffectiveValue(stat, unit)
  if(base == NaN){
    console.error("base is nan", stat)
  }
  let buffMulti = 1;
  let debuffMulti = 1;
  const currentTime = Date.now();

  // Handle stat buffs
  if (unit.buffs && unit.buffs.length > 0) {
    const buffs = unit.buffs.filter(
      buff =>
      buff.statType === "stat" &&
      buff.stat.toLowerCase() === statName.toLowerCase() &&
      (buff.startTime + buff.duration > currentTime)
    );

    buffs.forEach(buff => {
      if (buff.effect === "add") {
        base += buff.value;
      } else if (buff.effect === "multi") {
        buffMulti *= buff.value;
      }
    });
  }

  // Handle stat debuffs
  if (unit.debuffs && unit.debuffs.length > 0) {
    const debuffs = unit.debuffs.filter(
      debuff =>
      debuff.statType === "stat" &&
      debuff.stat.toLowerCase() === statName.toLowerCase() &&
      (debuff.startTime + debuff.duration > currentTime)
    );

    debuffs.forEach(debuff => {
      if (debuff.effect === "add") {
        base += debuff.value;
      } else if (debuff.effect === "multi") {
        debuffMulti *= debuff.value;
      }
    });
  }
  let oldValue = stat.value;
  stat.value = debuffMulti * buffMulti * base
  hpStats = ["hp", "maxHp"];
  spStats = ["sp", "maxSp"];
  mpStats = ["mp", "maxMp"];
  recalculateStatEvent.emit(unit, statName, oldValue, stat.value);
  
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
  const result = [];
  for (const source in damageTypeMultipliers) {
    const row = damageTypeMultipliers[source];
    if (row[targetType] !== undefined && row[targetType] !== 1.0) {
      result.push({
        source, value: row[targetType]
      });
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
    damageType: getRaceDamageType(race)
  });



  const startingPlanet = classToPlanet[chosenClass];
  player.planet = startingPlanet;

  const loreEntry = loreDataCache.planets[startingPlanet].description;
  const zoneLogs = Object.entries(loreDataCache.zones)
  .filter(([zone]) => loreEntry && zone.includes(startingPlanet.split(" ")[0]))
  .map(([zone, desc]) => ">" + zone + ": " + desc);
  showMenu("lore");
  let damageTypes = "none"
  if (loreDataCache.planets[startingPlanet].damageTypes) {
    damageTypes = loreDataCache.planets[startingPlanet].damageTypes
    .map(type => getDamageTypeIcon(type))
    .join(", ");
  }
  document.getElementById("top-bar").style.display = "flex"
  document.getElementById("planet-name").textContent = startingPlanet
  document.getElementById("zone-name").style.display = "none"
  document.getElementById("encounter-bar").style.display = "none"
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
  if (loreDataCache.classes[player.class].starterSkill) {
    let starterSkill = {
      id: loreDataCache.classes[player.class].starterSkill,
      level: 1
    };
    if (skillsData[starterSkill.id]) {

      player.skills.learned.push(starterSkill)
      player.skills.equipped.push(starterSkill)
    }
  

  }

  // Set menu-content to load the lore screen

}
// Maps race to their defensivedamage type
function getRaceDamageType(race) {
  const mapping = {
    Human: "Physical",
    Undead: "Blight",
    Fae: "Nature",
    Construct: "Force",
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

  let totalResistances = getEffectiveResistances(unit.damageType.toLowerCase());
  unit.totalResistances = totalResistances;
}

// Sample player and enemy data
function increaseAttribute(attr) {
  if (player.attributePoints > 0) {
    player.attributes[attr]++;
    player.attributePoints--;
    recalculateDerivedStats(player);
    // Re-render the character menu
    updateAttributesSection();
  }
}


function showCharacterCreation() {

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
      text = `${(raceDisplay.display || r)}  (${loreDataCache.races[r].damageType.capitalize()})`;

      opt.innerHTML = text;
      raceSelect.appendChild(opt);
    });

    classSelect.innerHTML = ""; // clear first
    const secondDefaultOption = document.createElement("option")
    secondDefaultOption.value = ""
    secondDefaultOption.textContent = "-- Select a Class --";
    classSelect.appendChild(secondDefaultOption);

    Object.keys(loreDataCache.classes).forEach(r => {
      if(r == "Pyromancer"){
        
    
      const opt = document.createElement("option");
      opt.value = r;
      opt.textContent = r;
      classSelect.appendChild(opt);
      }
    });
    raceSelect.selectedIndex = 0;
    classSelect.selectedIndex = 0;
    raceSelect.addEventListener("change", () => {
      const race = raceSelect.value;
      const info = loreDataCache.races[race];
      const desc = document.getElementById("race-desc");
      if (info && desc) {
        desc.innerHTML = `<p>${info.description}</p>` + info.bonuses.map(b => `<p>> ${b}</p>`).join("");
      }
    });

    classSelect.addEventListener("change",
      () => {
        const cls = classSelect.value;
        const info = loreDataCache.classes[cls];
        const desc = document.getElementById("class-desc");
        if (info && desc) {
          desc.innerHTML = `<p>${info.description}</p>` + info.bonuses.map(b => `<p>> ${b}</p>`).join("");
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
    showMenu("lore");
  }
}

function tryEquipItem(index) {
  const keys = Object.keys(player.inventory.storage);
  if (index >= keys.length) {
    return;
  }

  let item = player.inventory.storage[keys[index]];
  if (item.equippable == false) {
    return;
  }

  let type = item.type;
  let equippableTypes = ["head",
    "torso",
    "legs",
    "hands",
    "feet",
    "weapon"];
  if (!equippableTypes.includes(type.toLowerCase())) {
    console.log(`Item of type ${item.type} not equippable`);
    return;
  }

  let equippedItem = player.inventory.equipped[type];

  if (equippedItem == null) {
    console.log(`Equipped ${item.display} in the ${type} slot.`);
  } else {
    // Return the currently equipped item back to storage
    player.inventory.storage[keys[index]] = equippedItem;
    console.log(`Swapped ${equippedItem.display} with ${item.display} in the ${type} slot.`);
  }

  // Equip the new item
  player.inventory.equipped[type.toLowerCase()] = item;

  // Remove item from storage (since it's now equipped)
  delete player.inventory.storage[keys[index]];

  // Optionally refresh the UI here
  updateInventoryDisplay();

}
function showMenu(menu) {
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

  document.querySelectorAll(".menu-section").forEach(section => {
    section.style.display = section.id === `${menu}-menu` ? "block": "none";
  });

  switch (menu) {
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
      <h2>Equipped</h2>
      <div id="equipment-slots" class="equipment-row">
      <div class="equip-slot">
      <div class="slot-label">Head</div>
      <div class="slot-item" id="equip-head">None</div>
      </div>
      <div class="equip-slot">
      <div class="slot-label">Torso</div>
      <div class="slot-item" id="equip-torso">Plated Vest</div>
      </div>
      <div class="equip-slot">
      <div class="slot-label">Legs</div>
      <div class="slot-item" id="equip-legs">None</div>
      </div>
      <div class="equip-slot">
      <div class="slot-label">Feet</div>
      <div class="slot-item" id="equip-feet">Rugged Boots</div>
      </div>
      <div class="equip-slot">
      <div class="slot-label">Hands</div>
      <div class="slot-item" id="equip-hands">None</div>
      </div>
      <div class="equip-slot">
      <div class="slot-label">Weapon</div>
      <div class="slot-item" id="equip-weapon">Rusty Scythe</div>
      </div>
      </div>
      <h2>Storage</h2>
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
      updateAttributesSection();
      let statsDiv = document.createElement("div");
      statsDiv.id = "stats-div"

      let statsHTML = `<div class="stat-block">`;

const statGroups = [
  {
    title: "Health (HP)",
    class: "hp",
    stats: [
      { label: "Current", key: "hp" },
      { label: "Max", key: "maxHp" },
      { label: "Regen", key: "hpRegen" }
    ]
  },
  {
    title: "Stamina (SP)",
    class: "sp",
    stats: [
      { label: "Current", key: "sp" },
      { label: "Max", key: "maxSp" },
      { label: "Regen", key: "spRegen" },
      { label: "Efficiency", key: "spEfficiency" }
    ]
  },
  {
    title: "Mana (MP)",
    class: "mp",
    stats: [
      { label: "Current", key: "mp" },
      { label: "Max", key: "maxMp" },
      { label: "Regen", key: "mpRegen" },
      { label: "Efficiency", key: "mpEfficiency" }
    ]
  },
  {
    title: "Combat",
    class: "combat",
    stats: [
      { label: "Attack Power", key: "attackPower" },
      { label: "Spell Power", key: "spellPower" },
      { label: "Cooldown Reduction", key: "cooldownReduction" },
      { label: "Armor Penetration", key: "armorPenetration" },
      { label: "Magic Penetration", key: "magicPenetration" }
    ]
  },
  {
    title: "Critical",
    class: "crit",
    stats: [
      { label: "Crit Chance", key: "critChance" },
      { label: "Crit Multiplier", key: "critMulti" }
    ]
  },
  {
    title: "Lifesteal",
    class: "lifesteal",
    stats: [
      { label: "Lifesteal %", key: "lifestealMulti" },
      { label: "Lifesteal Chance", key: "lifestealChance" }
    ]
  }
];


statGroups.forEach(group => {
  statsHTML += `<div class="stat-row stat-header stat-${group.class}">${group.title}</div>`;
  group.stats.forEach(stat => {
    const data = player.stats[stat.key];
    let label = stat.label;
    if (data.scaling) {
      label += "("+data.scaling.map(sc => sc.stat.toUpperCase().slice(0, 3)).join("/") + ")";
      
    }
    const rowClass = group.class ? ` stat-subrow-${group.class}` : '';
    statsHTML += `<div class="stat-subrow${rowClass}"><span>${label}:</span><span>${data.value}</span></div>`;
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
      <img src="images/${player.planet}.png" alt="${player.planet}" class="zone-art">
      `;
      if (!player.zone || !player.zone.name) {
        const zoneMenu = document.createElement("div")
        zoneMenu.id = "zone-menu";
        zoneMenu.innerHTML = ""; // Clear previous content

        const zones = loreDataCache.planets[player.planet].zones;
        index = 0;
        for (let zoneName of zones) {
          const zoneData = loreDataCache.zones[zoneName];
          console.log(unitsDefinedForZone(zoneData))
          if (!unitsDefinedForZone(zoneData) || (zoneData.previousZone && (!player.zoneProgress[zoneData.previousZone] || player.zoneProgress[zoneData.previousZone].count < loreDataCache.zones[zoneData.previousZone].maxTier))) {
            index += 1;
            
            continue;
          }
          const zoneBlock = document.createElement("div");
          zoneBlock.className = "zone-block";
          zoneBlock.innerHTML = `
          <h3>Zone ${index + 1}: ${zoneName}</h3>
          <span><br>Progress: ${player.zoneProgress[zoneName]?player.zoneProgress[zoneName].count:1}/${loreDataCache.zones[zoneName].maxTier}
          <p>${zoneData.description}</p>
          <button class="zone-button" onclick="showZone('${zoneName}')">Select Zone</button>
          `;
          zoneMenu.appendChild(zoneBlock);
          index += 1;
        }
        if (zoneMenu.innerHTML == "") {
          zoneMenu.innerHTML = "<span>No zones finished for this planet."
        }
        menuContent.appendChild(zoneMenu)
      } else {
        showZone(player.zone.name)
        document.getElementById("enemy-count").textContent = `${player.zone.count} / ${loreDataCache.zones[player.zone.name].maxTier}`
      }
      break;
    case "lore":
      loadLoreLog();
      break;
    case "settings":
      main.innerHTML = "";
      menuContent.innerHTML = `
      <div class="settingsMenu" style="display: flex; flex-direction: column; align-items: center; gap: 2em; padding-top: 2em;">

      <div style="text-align: center;">
      <div style="margin-bottom: 0.5em;">Confirm before leaving combat</div>
      <label class="toggle-switch">
      <input type="checkbox" id="forceConfirmToggleBtn">
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

      </div>
      `;

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
  }
}
function unitsDefinedForZone(zone) {
  for (let u of zone.units) {
    if (!getUnitDataFromType(u.name)) {
      console.log(u.name)
      return false
    }
  }
  return true;
}
function leaveZone(){
  delete player.zone.name
  showMenu("journey");
}
function showZone(zone) {
  if (!player.zone || player.zone.name != zone) {
    player.zone = {
      name: zone,
      count: player.zoneProgress[zone]?.count || 1
    }
    player.zoneProgress[zone] = {
      count: player.zone.count,
      discoveredEnemies: []
    }
  }
  initializeCombatUnits(zone);
  let encounterDisplay = document.getElementById("encounter-bar");
  let zoneDisplay = document.getElementById("zone-name")
  let prevEncBtn = document.getElementById("last-encounter-btn")
  prevEncBtn.style.display = "block"
  encounterDisplay.style.display = "flex";
  zoneDisplay.textContent = player.zone.name;
  zoneDisplay.style.display = "block"


  document.getElementById("enemy-count").textContent = `${player.zone.count} / ${loreDataCache.zones[player.zone.name].maxTier}`
  document.getElementById("menu-content").innerHTML = `
  <div style="position: relative;" class="zone-menu">
  <button class="zone-button" onclick="startCombat()">Begin Combat</button>
  <div id="zone-units-list">
  <button style="position: absolute; top: 0px; left: 5px;" class="zone-button" onclick="leaveZone()">Go Back</button>
  <button style="position: absolute; top: 0px; left: 5px;" class="zone-button" onclick="leaveZone()">Go Back</button>
  </div>
  </div>
  `
  let units = findUnitsForZone(zone, player.zone.count);
  let unitsList = document.getElementById("zone-units-list");
  let discoveredUnits = units.filter(u => {
    let uData = getUnitDataFromType(u.name);
    if (uData) {
      if (player.zoneProgress[zone].discoveredEnemies && player.zoneProgress[zone].discoveredEnemies.includes(uData.name)) {
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
      <button class="unit-btn" id="${uData.name}-btn" onclick="setTimeout(() => showUnitPopup('${uData.name}'), 1)">${uData.name}</button><br>
      `
    } else {

      unitsList.innerHTML += `
      <button class="unit-btn" id="${uData.name}-btn">???</button><br>
      `
    }
  })
}
function getEffectiveTier(zone, tier) {
  if (loreDataCache.zones[zone] && loreDataCache.zones[zone].previousZone) {
    tier += getEffectiveTier(loreDataCache.zones[zone].previousZone, tier + loreDataCache.zones[loreDataCache.zone[zone].previousZone].maxTier);
  }
  return tier;
}
function initializeCombatUnits(zone) {
  let tier = player.zone.count;
  if (loreDataCache.zones[zone].previousZone) {
    tier += loreDataCache.zones[loreDataCache.zones[zone].previousZone].maxTier
  }
  let totalUnitCount = getWeightedRandomIndex(loreDataCache.zones[zone].unitCountWeights);
  combatUnits = [player]
  for (let i = 0; i < totalUnitCount; i++) {
    combatUnits.push(getRandomUnit(false, player.zone.count, player.zone.name))
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
  overlay.style.position = "fixed";
  overlay.style.top = 0;
  overlay.style.left = 0;
  overlay.style.width = "100vw";
  overlay.style.height = "100vh";
  overlay.style.zIndex = 999;
  overlay.style.background = "rgba(0,0,0,0.0)";
  overlay.addEventListener("click", () => overlay.remove());

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
}
function startCombat(force) {
  if (!force && player.skills.equipped.length == 0) {
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
  player.inCombat = true

  let main = document.getElementById("main-area")
  let menuContent = document.getElementById("menu-content");
  menuContent.innerHTML = "";
  main.innerHTML = `
  <div class="crew-container" id="player-crew">
  <!-- Player and crew members will be rendered here -->
  </div>
  <div class="crew-container" id="enemy-crew">
  </div>
  `;

  // Example crew renng
  let encounterDisplay = document.getElementById("encounter-bar");
  let zoneDisplay = document.getElementById("zone-name")
  let prevEncBtn = document.getElementById("last-encounter-btn")
  prevEncBtn.style.display = "block"
  encounterDisplay.style.display = "flex";
  zoneDisplay.textContent = player.zone.name;
  zoneDisplay.style.display = "block"


  document.getElementById("enemy-count").textContent = `${player.zone.count} / ${loreDataCache.zones[player.zone.name].maxTier}`



  const crewContainer = document.getElementById("player-crew");
  isPlayer = true
  player.stats.hp.value = player.stats.maxHp.value
  const enemyContainer = document.getElementById("enemy-crew");
  skillIntervals.forEach(i => clearInterval(i))
  regenIntervals.forEach(i => clearInterval(i))
  combatUnits.forEach(unit => {

    if (unit.isAlly || unit.isPlayer) {
      crewContainer.appendChild(buildUnitTable(unit, unit.isAlly || isPlayer, isPlayer))
    } else {
      enemyContainer.appendChild(buildUnitTable(unit, unit.isAlly || isPlayer, isPlayer))
    }
    unit.isAlive = true
    isPlayer = false
    recalculateTotalResistances(unit);
    recalculateDerivedStats(unit);
    unit.stats.hp.value = unit.stats.maxHp.value;
    unit.stats.sp.value = unit.stats.maxSp.value;
    unit.stats.mp.value = unit.stats.maxMp.value;
    regenIntervals[unit.id] = setInterval(() => {
      if (player.inCombat && findUnitById(unit.id)) {
        updateUnitRegens(unit); // Or loop through all allies
      } else {
        clearInterval(regenIntervals[unit.id]);
      }
    },
      1000);
    unit.skills.equipped.map(skill => skill.id).filter(s => s).forEach((skillId) => {
      if ((skillsData[skillId] && !skillsData[skillId].requiresTarget) || (unit.skills.combatData.targets[skillId] !== undefined && findUnitById(unit.skills.combatData.targets[skillId].target))) {
        targetData = unit.skills.combatData.targets;
        unit.skills.combatData.targets[skillId] = {
          target: targetData[skillId] && targetData[skillId].target?targetData[skillId].target: undefined,
          active: true
        };
        let cd = calculateSkillCooldown(unit, skillId)
        unit.skills.combatData.lastUsed[skillId] = Date.now() + cd
        console.log(`${unit.name} : ${skillId} : ${cd}`)
      }
      skillIntervals[unit.id] = setInterval(() => {
        if (player.inCombat && findUnitById(unit.id)) {
          updateProgressBar(skillId, unit); // Or loop through all allies
        } else {
          clearInterval(skillIntervals[unit.id])
        }
      },
        100);
    });

  })
  


  // Zones and begin combat
  combatUnits.filter(u => u && !u.isAlly).forEach(u => {
    u.skills.equipped.forEach(s => {
      let enemyTarget = getEnemyTarget(u,
        s.id,
        skillsData[s.id].target)
      console.log(enemyTarget.name)
      u.skills.combatData.targets[s.id] = {
        target: enemyTarget.id,
        active: true
      }
    })
  });
  menuContent.innerHTML = `
 <div id="combat-log" style="width:100%; height:200px; background:#111; color:#0f0; font-family:monospace; overflow-y:auto; padding:5px;"></div>
  `
  
}
function updateCombatLog(text, caster) {
  const log = document.getElementById("combat-log");
  log.innerHTML += `<span style="color:${caster?caster.isAlly?"#2f2":"#f22":"#fff"};">&gt; ${text}<br></span>`;
  log.scrollTop = log.scrollHeight; // auto-scroll
}
function getEnemyTarget(unit, skillId, targetType) {
  let baseTarget = undefined;
  console.log(`targetType for ${unit.name} ${skillId}: ${targetType}`)
  if (targetType == "singleEnemy" || targetType == "adjacent") {
    targetType = "randomEnemy";
    livingEnemies = combatUnits.filter(u => u.isAlive && u.isAlly != unit.isAlly);
    console.log(`checkinv fr ${unit.name}`)
    console.log(livingEnemies)
    if (livingEnemies.length == 0) {
      checkIfCombatFinished();
      return null;
    } else {
      baseTarget = livingEnemies[Math.floor(Math.random()*livingEnemies.length)]
    }
  } else if (targetType == "singleAlly") {
    targetType = randomAlly;
    livingAllies = combatUnits.filter(u => u.isAlive && u.isAlly == unit.isAlly);
    if (livingAllies.length == 0) {
      checkIfCombatFinished();
      return null;
    } else {
      baseTarget = livingAllies[Math.floor(Math.random()*livingAllies.length)]
    }
  }
  console.log(`baseTarget: ${baseTarget}`)
  return getTarget(unit, baseTarget, targetType, skillId);
}

function renderSkillTree() {
  const skillTree = loreDataCache.classes[player.class].skillTree;
  const learnedSkills = player.skills.learned;
  const affordableSkills = getAvailableSkills();
  console.log(affordableSkills)
  const menuContent = document.getElementById("menu-content");
  const mainArea = document.getElementById("main-area");

  menuContent.innerHTML = '';
  mainArea.innerHTML = `<span style="font-size: 26px;">Points: ${player.skillPoints}<br></span><div style="padding: 1em;"><em>Select a skill to view details</em></div>`;

  const treeContainer = document.createElement("div");
  menuContent.onclick = () => {
    mainArea.innerHTML = `<span style="font-size: 26px;">Points: ${player.skillPoints}<br></span><div style="padding: 1em;"><em>Select a skill to view details</em></div>`;
  }
  treeContainer.className = "skill-tree";
  treeContainer.id = "skill-tree";
  treeContainer.style.position = "relative";
  treeContainer.style.minHeight = "1200px";

  const linesSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  linesSvg.classList.add("lines");
  linesSvg.id = "tree-lines";
  treeContainer.appendChild(linesSvg);
  menuContent.appendChild(treeContainer);

  const skillMap = {};
  skillTree.forEach(skill => skillMap[skill.id] = {
    ...skill, children: []
  });
  skillTree.forEach(skill => {
    if (skill.previousSkill) skillMap[skill.previousSkill].children.push(skill.id);
  });

  const roots = skillTree.filter(skill => !skill.previousSkill).map(s => s.id);

  const nodePositions = {};
  let nextX = 0;
  const levelHeight = 120;
  const nodeWidth = 120;

  function layoutTree(nodeId,
    depth) {
    const node = skillMap[nodeId];
    const children = node.children;
    let width = 0;

    if (children.length === 0) {
      width = nodeWidth;
      nodePositions[nodeId] = {
        x: nextX,
        y: depth * levelHeight
      };
      nextX += width + 30;
    } else {
      const childXs = children.map(child => layoutTree(child, depth + 1));
      width = childXs.reduce((a, b) => a + b, 0);
      const startX = childXs[0];
      const endX = childXs[childXs.length - 1];
      const center = (startX + endX) / 2;
      nodePositions[nodeId] = {
        x: center,
        y: depth * levelHeight
      };
    }

    return nodePositions[nodeId].x;
  }

  roots.forEach(root => layoutTree(root, 0));

  const allX = Object.values(nodePositions).map(pos => pos.x);
  const minX = Math.min(...allX);
  const maxX = Math.max(...allX);
  const estimatedTreeWidth = (maxX - minX) + nodeWidth + 200;
  treeContainer.style.minWidth = `${estimatedTreeWidth}px`;

  const rootX = nodePositions[roots[0]].x;
  const offsetX = estimatedTreeWidth - (rootX + nodeWidth / 2);

  skillTree.forEach(skill => {
    const base = nodePositions[skill.id];
    const x = base.x + offsetX;
    const y = base.y;

    const learned = learnedSkills.find(s => s.id === skill.id);
    const currentLevel = learned ? learned.level: 0;
    const isUnlocked = currentLevel > 0;
    const isAvailable = !!getAvailableSkills()[skill.id];
    console.log("isAva", isAvailable, skill.id, affordableSkills)
    const node = document.createElement("div");
    node.setAttribute("data-skill-id", skill.id);
    node.className = "skill-node";
    if (!isUnlocked) node.classList.add("locked");
    if (isAvailable && !learned) node.classList.add("available");
    if (learned) node.classList.add("started")


    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    node.innerText = `\n${skillsData[skill.id].name}\n(${currentLevel}/${skill.maxLevel})`;

    node.onclick = (e) => {
      e.stopPropagation();
      showSkillDetails(skill, !!getAvailableSkills()[skill.id]);
    }
    treeContainer.appendChild(node);

    if (skill.previousSkill) {
      const parent = nodePositions[skill.previousSkill];

      const parentCenterX = parent.x + offsetX + 50;
      const parentBottomY = parent.y + 50;

      const childCenterX = x + 50;
      const childTopY = y;

      const midY = (parentBottomY + childTopY) / 2;

      const line1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line1.setAttribute("x1", parentCenterX);
      line1.setAttribute("y1", parentBottomY);
      line1.setAttribute("x2", parentCenterX);
      line1.setAttribute("y2", midY);
      line1.setAttribute("stroke", "#aaa");
      line1.setAttribute("stroke-width", "2");

      const line2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line2.setAttribute("x1", parentCenterX);
      line2.setAttribute("y1", midY);
      line2.setAttribute("x2", childCenterX);
      line2.setAttribute("y2", midY);
      line2.setAttribute("stroke", "#aaa");
      line2.setAttribute("stroke-width", "2");

      const line3 = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line3.setAttribute("x1", childCenterX);
      line3.setAttribute("y1", midY);
      line3.setAttribute("x2", childCenterX);
      line3.setAttribute("y2", childTopY);
      line3.setAttribute("stroke", "#aaa");
      line3.setAttribute("stroke-width", "2");

      linesSvg.appendChild(line1);
      linesSvg.appendChild(line2);
      linesSvg.appendChild(line3);
    }
  });

  setTimeout(() => {
    menuContent.scrollLeft = (treeContainer.scrollWidth / 2) - (menuContent.clientWidth / 2);
  },
    0);
}
function updateSkillDisplay(skillId) {
  const skill = loreDataCache.classes[player.class].skillTree.find(s => s.id === skillId);
  const learnedSkills = player.skills.learned;
  const affordableSkills = getAvailableSkills();

  const node = document.querySelector(`.skill-node[data-skill-id="${skillId}"]`);
  if (!node) return;

  const learned = learnedSkills.find(s => s.id === skillId);
  const currentLevel = learned ? learned.level: 0;
  const isUnlocked = currentLevel > 0;
  const isAvailable = !!affordableSkills[skill.id];

  // Reset classes
  node.className = "skill-node";
  if (!isUnlocked) node.classList.add("locked");
  if (isAvailable && !learned) node.classList.add("available");
  if (learned) node.classList.add("started");

  node.innerText = `\n${skillsData[skill.id].name}\n(${currentLevel}/${skill.maxLevel})`;
}
function showSkillDetails(skill, isAvailable = false) {
  const mainArea = document.getElementById("main-area");
  const learned = player.skills.learned.find(s => s.id === skill.id);
  const level = learned ? learned.level: 0;
  const description = skillsData[skill.id]?.description || "No description available.";
  const isMaxed = level >= skill.maxLevel;
  const canLevel = isAvailable;
  console.log(`isAvailable?`, isAvailable, skill.id)
  const buttonLabel = level > 0 ? (isMaxed ? "Maxed Out": "Level Up"): "Unlock Skill";

  mainArea.innerHTML = `
  <span style="font-size: 26px;">Points: ${player.skillPoints}</span>
  <div style="padding: 1em">
  <h3 style="color: #f0f0f0">${skillsData[skill.id].name}</h3><span style="color:#77a;"><strong>Level:</strong> ${level} / ${skill.maxLevel}</span> | <span style="color: #a7a;"><strong> Cost:</strong> ${skill.cost} Skill Point${skill.cost !== 1 ? 's': ''}</span>
  <br>
  <span style="margin-top: 0.5em">${description}</span>
  <br>
  <span style="margin-top: 0.5em">
  ${formatSkillLevelScalingsWithLabels(skill.id,skillsData[skill.id].levelUpEffects)}
  <button
  id="skill-upgrade-btn"
  style="margin-top: 1em; padding: 0.5em 1em; font-size: 1em;"
  ${canLevel ? '': 'disabled'}
  >
  ${buttonLabel}
  </button>
  </div>
  `;

  if (canLevel) {
    const upgradeBtn = document.getElementById("skill-upgrade-btn");
    upgradeBtn.addEventListener("click", () => levelUpSkill(skill.id, skill.cost));
  }
}
function levelUpSkill(skillId, cost) {
  const skillTree = loreDataCache.classes[player.class].skillTree;
  const skill = skillTree.find(s => s.id === skillId);
  let learned = player.skills.learned.find(s => s.id === skillId);

  if (player.skillPoints >= cost && (!learned || learned.level < skill.maxLevel)) {
    player.skillPoints -= cost;
    if (learned) {
      learned.level += 1;
    } else {
      player.skills.learned.push({
        id: skillId, level: 1
      });
      learned = player.skills.learned.find(s => s.id === skillId);
    }

  }
  showSkillDetails(skill, player.skillPoints >= cost && learned.level < skill.maxLevel)
  updateAllSkillDisplays(); // re-render to update display
}
function updateAllSkillDisplays() {
  const skillTree = loreDataCache.classes[player.class].skillTree;
  skillTree.forEach(skill => updateSkillDisplay(skill.id));
}
function nextEncounter(force) {
  console.log("--")
  if (!player.zone) return;

  if (player.zone.count >= loreDataCache.zones[player.zone.name].maxTier) return;
  if (player.zone.count >= player.zoneProgress[player.zone.name].count) return;
  if (!force && player.inCombat && settings.confirmLeaveCombat) {
    console.log("??")
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

  player.zone.count += 1;
  document.getElementById("enemy-count").textContent = `${player.zone.count} / ${loreDataCache.zones[player.zone.name].maxTier}`
  showMenu("journey");
}
function lastEncounter(force) {
  if (!player.zone) return;
  if (player.zone.count <= 1) return;
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

  player.zone.count -= 1;
  document.getElementById("enemy-count").textContent = `${player.zone.count} / ${loreDataCache.zones[player.zone.name].maxTier}`
  showMenu("journey")
}
function updateInventoryDisplay() {
  const inventoryContainer = document.getElementById("inventory-items");
  if (!inventoryContainer) return;

  let itemIndex = 0;
  let invHtml = ``;

  Object.keys(player.inventory.storage).forEach(key => {
    const item = player.inventory.storage[key];
    const equippableBtn = item.equippable
    ? `<button class="equip-btn" onclick="tryEquipItem(${itemIndex})">Equip</button>`: "";

    invHtml += `
    <div class="item-display">
    <button class="menu-header" style="color: ${item.color};" onclick="setTimeout(() => showItemPopup(player.inventory.storage['${key}']),1)">
    ${item.display} (${item.count})
    </button>
    ${equippableBtn}
    </div>
    `;
    itemIndex++;
  });

  inventoryContainer.innerHTML = invHtml;

  // Update equipped items
  const equipSlots = ["head",
    "torso",
    "legs",
    "feet",
    "hands",
    "weapon"];
  equipSlots.forEach(slot => {
    const slotElement = document.getElementById(`equip-${slot}`);
    const item = player.inventory.equipped[slot];

    if (slotElement) {
      slotElement.innerHTML = item
      ? `
      <div style="color: ${item.color}; cursor: pointer;" onclick="setTimeout(() => showItemPopup(player.inventory.equipped['${slot}']),1)">
      ${item.display}
      </div>
      <button class="unequip-btn" onclick="unequipItem('${slot}')">Unequip</button>
      `: "None";
    }
  });
}
function unequipItem(slot) {
  const item = player.inventory.equipped[slot];
  if (!item) return;

  // Add item back to storage
  const key = `${item.display}-${Date.now()}`; // or another way to create a unique key
  player.inventory.storage[key] = item;

  // Clear equipped slot
  player.inventory.equipped[slot] = null;

  // Refresh UI
  updateInventoryDisplay();
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
  player.skills.learned.forEach((sk, index) => {
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
        console.log("ghnu")
        if (player.inCombat) {
          log("Can't unequip during combat.");
          return;
        }
        console.log(player.skills.equipped[skillId])
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

  for (let i = 0; i < 6; i++) {
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
        if (skillToEquip && !player.skills.equipped.find(s => s.id == skillToEquip.id)) {
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
  let attributesDiv = document.getElementById("attributes-div")
  let attrHtml = ``
  const classAttributeBonuses = loreDataCache.classes[player.class].attributes;
  let attrIndex = 0;

  Object.keys(player.attributes).forEach(attr => {
    const base = player.attributes[attr];
    const bonus = (classAttributeBonuses[attrIndex] || 0);
    const hasAttributePoints = player.attributePoints > 0
    const plusBtn = `<button class="plus-btn" onclick="increaseAttribute('${attr}')">+</button>
    `
    attrHtml += `
    <div id="${attr}-display" class="attr-div">
    ${attr.capitalize()}: ${base} (+${bonus}) ${hasAttributePoints?plusBtn: ""}
    </div>
    `;
    attrIndex++;
  });
  attributesDiv.innerHTML = attrHtml
  document.getElementById("attributes-header").textContent = `Attributes (${player.attributePoints})`
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
    XP (${member.xp}/${member.maxXp})
    </div>
    </div>
    `
  }
  const div = document.createElement("div");
  div.className = `${isAlly ? "ally": "enemy"}-box` + " unit-box";
  div.id = member.id + "-unit-box";
  div.onclick = () => {
    setTimeout(() => {
      let potentialTargets = getPotentialTargets(findUnitById(unitToCast), skillsData[skillToTarget])
      if ((potentialTargets.includes(member) || settings.friendlyFire) && unitToTarget == null && targetting && Date.now() - timeStartedTargetting > 100) {
        unitToTarget = member.id;
        targetting = false;
        selectSkillTarget(unitToCast);
        document.querySelectorAll(".unit-box").forEach((box) => {
          box.style.setProperty('--border-gradient', 'linear-gradient(to right, black, black)');
        });
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
    skillsContainer.style.gridTemplateColumns = 'repeat(auto-fit, minmax(35%, 1fr))';

    console.log(member.skills.equipped)
    member.skills.equipped.map(skill => skill.id).forEach(skillId => {
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
  if (!unit.buffs) {
    unit.buffs = [];
  }
  if (!unit.debuffs) {
    unit.debuffs = [];
  }
  if (!unit.conditions) {
    unit.conditions = [];
  }
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
    console.warn(`Could not update bar: missing data for ${member.name} ${stat}`);
    return;
  }

  let current = member.stats[stat].value;
  const max = member.stats[`max${stat.charAt(0).toUpperCase() + stat.slice(1)}`].value;
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
  if (!element || !element.parentElement){
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
    console.log(skillId)
    console.log(skillsData)
  }

  const combatData = member.skills.combatData;
  const skillData = combatData.targets?.[skillId] || {};
  const hasTarget = skillData.target !== undefined && findUnitById(skillData.target);
  const requiresTarget = skill.requiresTarget;
  const isTargeting = targetting && skillToTarget === skillId && unitToCast === member.id;
  const isTargetAlive = hasTarget && findUnitById(skillData.target).isAlive
  const isOn = skillData.active;

  const innerBar = document.querySelector(`.progress-inner-bar[data-skill-id="${skillId}-${member.id}"]`);
  const barContainer = document.querySelector(`.progress-outer-bar[data-skill-id="${skillId}-${member.id}"]`);
  if (!barContainer || !innerBar || !combatData) return;
  let isStunned = member.conditions && member.conditions["Stunned"];
  if(isStunned && combatData.lastUsed[skillId]){
    combatData.lastUsed[skillId] +=100
  }
  const lastUse = combatData.lastUsed[skillId] || 0;
  const cooldown = calculateSkillCooldown(member, skillId) || 0;
  if (cooldown == 0) {
    if(lastError + 3000 < Date.now()){
      console.error("SKILL CD 0",member,skillId);
      lastError = Date.now()
    }
  }
  const now = Date.now(); // or Date.now(), but perf.now is higher resolution
  const elapsed = Math.max(0, now - lastUse)/1000;
  const pct = Math.min(1, elapsed / cooldown); // 0 to 1



  //if(player.inCombat){
  if (pct >= 1 && isOn && player.inCombat) {
    //console.log(pct)

    castSkill(skillId, member, skillData && skillData.target?findUnitById(skillData.target): null)

  }
  if (pct < 1) {
    //  console.log(`pct ${Math.floor(pct * 100)}`)
  }
  let enemiesAlive = combatUnits.filter(unit => unit.isAlive && unit.isAlly != member.isAlly);
  if (!isTargetAlive && requiresTarget && isOn && enemiesAlive.length > 0) {
    member.skills.combatData.targets[skillId].target = enemiesAlive[0].id
  } else {}
  let label = document.getElementById(`${member.id}-${skillId}-target-display`)
  if(label && isStunned){
    
    label.textContent = "Stunned";
    
  }
  else{
  if (hasTarget && label) {

    label.textContent = findUnitById(skillData.target).name;
  }
  if (!requiresTarget && label) {
    label.textContent = fromCamelCase(skill.target);
  }
  }
  
  innerBar.style.background = isStunned?"linear-gradient(#838, #515)":isOn 
  ? "linear-gradient(#4c4, #282)": !requiresTarget || (hasTarget && isTargetAlive)?"linear-gradient(#cb4,#863)": "linear-gradient(#c44, #844)";
  innerBar.style.width = `${Math.floor(pct * 100)}%`;
  barContainer.style.background = isStunned?'#000': isOn
  ? "linear-gradient(#474, #252)": !requiresTarget || (hasTarget && isTargetAlive)?"linear-gradient(#874,#652)": "linear-gradient(#744, #522)";
  if(label){
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
  innerBar.style.transition = "width 0.1s ease";
  innerBar.style.zIndex = "1";

  // Overlay label
  if (hasTarget || !requiresTarget) {
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
      label.textContent = findUnitById(skillData.target).name;
    } else {
      label.textContent = fromCamelCase(skill.target)
    }
    barContainer.appendChild(label);
    resizeTextToFitParent(label)
  }

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



  skillDiv.appendChild(bottomRow);

  return skillDiv;
}
function findUnitsForZone(zone, tier) {
  const units = loreDataCache.zones[zone].units;
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
  return eligibleUnits;
}
function getRandomUnit(isAlly, tier, zone) {
  const units = loreDataCache.zones[zone].units;
  tier = getEffectiveTier(zone,
    tier);
  // Filter units based on tier within level range
  let eligibleUnits = findUnitsForZone(zone,
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
function updateUnitRegens(unit) {
  if (unit.stats.hp.value <= 0) {
    unit.isAlive = false;
    checkIfCombatFinished();
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
function showSkillPopup(skillId, inCombat, member, unitByName) {
  if (unitByName) {
    member = getUnitDataFromType(unitByName);
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

  const costParts = [];
  if (skill.cost?.mp) costParts.push(`${skill.cost.mp} MP`);
  if (skill.cost?.sp) costParts.push(`${skill.cost.sp} SP`);
  if (skill.cost?.hp) costParts.push(`${skill.cost.hp} HP`);
  const costString = costParts.length ? costParts.join(", "): "No cost";

  let effectsTableRows = "";
  if (skill.effects) {
    effectsTableRows = skill.effects.map(e => {
      let desc = "";
      switch (e.type) {
      case "damage":
        const isPhysicalType = isPhysical(e.damageType);
        const statMulti = 1 + (isPhysicalType ? member.stats.attackPower.value: member.stats.spellPower.value) * 0.01;
        let targetFlag = false;
        let scalingText = "";
        if(e.scaling){
          e.scaling.forEach(sc => {
            if(sc.target == "caster"){
            scalingText += ` + (${sc.scale} x ${sc.target}'s ${fromCamelCase(sc.stat)})`
            }else{
              targetFlag=true;
            }
          })
        }
        if(!targetFlag){
        desc = `Deal ${calculateEffectiveValue(e, member, undefined, member.skills.equipped.find(s=>s.id==skillId).level)} damage. (${statMulti.toFixed(2)}×(${e.base.toFixed(2)}${scalingText})`;
        }else{
          desc = `Deal damage equal to ${statMulti.toFixed(2)}×(${e.base.toFixed(2)}${scalingText}`
        }
        break;
      case "summon":
        let isAlly = e.isAlly
        let unitName = e.unit;
        let unitTier = e.tier;
        desc = `Summon an ${isAlly?"allied":"enemy"} ${unitName} (${unitTier})`
        break;
      case "buff":
      case "debuff":
        const sign = (e.type === "buff" ? "+": "-");
        e.value = calculateEffectiveValue(e.value, member, undefined, member.skills.equipped.find(s=>s.id==skillId).level)
        e.duration = calculateEffectiveValue(e.duration, member, undefined, member.skills.equipped.find(s=>s.id==skillId).level)
         value = e.effect === "add"
        ? value.toFixed(2): ((e.type === "buff" ? value - 1: 1 - value) * 100).toFixed(2) + "%";
        desc = `${sign}${value} ${fromCamelCase(e.stat)} for ${(e.duration / 1000).toFixed(2)}s`;
        
        break;
      case "dot":
        desc = `${e.base} ${e.damageType || "neutral"} over ${e.duration}s`;
        break;
      case "condition":
        if (e.name && conditionsData[e.name] && e.stacks) {
          desc = `Apply ${e.stacks} stack(s) of ${e.name}`;
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

  popup.innerHTML = `
  <div style="font-size: 18px; font-weight: bold; color: #0bf;">${skill.name}</div>
  <div style="color: #aaa; margin-top: 6px;">${skill.description || "No description provided."}</div>

  <button id="toggle-details-btn" style="margin-top: 10px; padding: 4px 10px; background: #222; border: 1px solid #555; color: #0bf; border-radius: 4px; cursor: pointer;">
  See More
  </button>

  <div id="skill-details-section" style="display: none; margin-top: 10px;">
  <table style="width: 100%; border-collapse: collapse;">
  <tr><th style="text-align:left; border-bottom: 1px solid #444;">Cost</th><td style="border-bottom: 1px solid #444;">${costString}</td></tr>
  <tr><th style="text-align:left; border-bottom: 1px solid #444;">Cooldown</th><td style="border-bottom: 1px solid #444;">${calculateSkillCooldown(member,
    skillId).toFixed(1)}s</td></tr>
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
function calculateSkillCooldown(unit, skillId) {
  let skill = skillsData[skillId];
  if (!unit || !skill) {
    console.error("failed to calculate cd")
    console.log(unit);
    console.log(skill)
    console.log(skillId)
    return 0;
  }
  let cdr = 1;
  if (unit.stats.cooldownReduction && unit.stats.cooldownReduction.value > 0) {
    cdr = unit.stats.cooldownReduction.value;
  } else {
    console.error(`Unit ${unit.name} has no cdr`)
  }
  let cd = cdr*calculateEffectiveValue(skill.cooldown, unit, undefined, skillLevel=unit.skills.equipped.find(s => s.id === skillId).level||0);
  
  return Math.max(0.1,
    cd);
}
function showItemPopup(item) {

  // Close existing popup if present
  const existingPopup = document.getElementById("popup-overlay");
  if (existingPopup) existingPopup.remove();

  // Create overlay to close on click
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

  // Create the popup
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

  // Fill with item content (same as in inventory)
  popup.innerHTML = `
  <div style="color: ${item.color}; font-size: 18px; font-weight: bold;">${item.display}</div>
  <div style="color: #aaa; margin-top: 8px;">${item.type}</div>
  <div style="color: #aaa; margin-top: 4px;">${item.description}</div>
  <div style="color: #aaa; margin-top: 6px;">${item.bonuses.join("<br>")}</div>
  `;

  overlay.appendChild(popup);
  document.body.appendChild(overlay);
}
function showDamageTypePopup(damageType) {
  console.log(damageType);
  if (targetting) {
    return;
  }
  const bonuses = getEffectiveMultipliers(damageType);
  const resistances = getEffectiveResistances(damageType);

  const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1);

  const bonusDamage = bonuses.filter(b => b.value > 1);
  const lessDamage = bonuses.filter(b => b.value < 1);
  const vulnerableTo = resistances.filter(r => r.value > 1);
  const resistantTo = resistances.filter(r => r.value < 1);

  const formatList = (arr, key) =>
  arr.map(entry => `<li>${capitalize(entry[key])} ${getDamageTypeIcon(entry[key])} × ${entry.value}</li>`).join("");

  const popup = document.createElement("div");
  popup.className = "popup";

  popup.innerHTML = `
  <div class="popup-header">
  <strong>${capitalize(damageType)} ${getDamageTypeIcon(damageType)}</strong>
  </div>
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
  castSkillEvent.emit(skillId, caster, target);
  // console.log("csst7jg")
  // Check cost and cooldown
  if (!canAfford(caster, skill.cost)) return;
  spendResources(caster, skill.cost);
  caster.skills.combatData.lastUsed[skillId] = Date.now();
  // Execute effects (if any)
  let originalTarget = target;
  target = getTarget(caster, target, skill.target, skillId);
  if (skill.effects) {
    for (const effect of skill.effects) {
      if (effect)
        applyEffect(effect, caster, target, skillId, originalTarget);
    }
  }

  // Execute custom code if defined
  if (skill.onCast) {
    try {
      const log = console.log; // or custom game log function
      const fn = new Function("caster", "target", "log", skill.onCast);
      fn(caster, target, log);

    } catch (e) {
      console.error(`Error in skill '${skillId}':`, e);
    }
  }
  let enemiesAlive = combatUnits.filter(unit => unit.isAlive && caster.isAlly != unit.isAlly);
  if (enemiesAlive.length > 0) {
    caster.skills.combatData.targets[skillId].target = enemiesAlive[0].id
    caster.skills.combatData.targets[skillId].active = true
  }
}
function isPhysical(damageType) {
  let physicalTypes = ["slashing",
    "blunt",
    "piercing",
    "force"];
  return physicalTypes.includes(damageType.toLowerCase())
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
function getTarget(caster, target, targetType, skillId) {
  let livingUnits = combatUnits.filter(u => u.isAlive);
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
    }
  } else if (!targetType || targetType == "singleEnemy" || targetType == "singleAlly") {
    if ((Array.isArray(target) && !findUnitById(target[0].id)) ||!findUnitById(target.id)) {
      console.error(targetType)
      caster.skills.combatData.targets[skillId] = {
        target: undefined,
        active: false
      }
    }
  }


  return target;

}
function applyEffect(effect, caster, target, skillId, originalTarget) {
  let pushedEffect = null;
  if (!skillId) {
    console.error("no skill defined");
    console.error(skill)
  }
  if (!caster.skills.combatData.targets[skillId]) {
    console.error("no skill found", caster.skills.combatData)
    return;
  }
  // Always treat target as array

  if (effect.target) {
    target = getTarget(caster, originalTarget, effect.target, skillId);
  }
  if (!Array.isArray(target)) target = [target];
  applyEffectEvent.emit(effect, caster, target, skillId)
  let sign = "";
  let value = ""
  // Apply effect to each target in the array
  for (let unit of Array.isArray(target)?target: [target]) {
    if (!unit) continue;
    switch (effect.type) {
    case "damage":

      let statMulti = 1 + (isPhysical(effect.damageType) ? caster.stats.attackPower.value: caster.stats.spellPower.value) * 0.01;
      console.log("effect.scaling",skillId,effect.scaling)
      let total = statMulti * (calculateEffectiveValue(effect, caster, unit, caster.skills.equipped.find(s=>s.id==skillId).level))
      let finalDamage = damageUnit(caster, unit, effect.damageType, total)
      if (unit.stats.hp.value === 0) {
        unit.isAlive = false;
        checkIfCombatFinished();
      }

      updateCombatLog(`${caster.name} deals ${finalDamage.toFixed(2)} ${getDamageTypeIcon(effect.damageType)} damage to ${unit.name}`, caster);
      break;
    case "interrupt":
      let interruptAmount = effect.base || 0;
      if(effect.scaling){
        interruptAmount += (effect.scale || 0) * caster.attributes[effect.scaling]
      }
      
      Object.keys(unit.skills.combatData.lastUsed).forEach(s => {
        unit.skills.combatData.lastUsed[s] = Math.min(Date.now(), interruptAmount+unit.skills.combatData.lastUsed[s])
      })
      updateCombatLog(`${caster} interrupted unit by ${interruptAmount}`)
      break;
    case "summon":
      let unitToSummon = effect.unit;
      let unitData = createUnit(unitToSummon, effect.isAlly, effect.tier);
      const crewContainer = document.getElementById("player-crew");
      const enemyContainer = document.getElementById("enemy-crew");
      unitData.isAlly = effect.isAlly?caster.isAlly:!caster.isAlly
      unitData.debuffs = [];
      unitData.buffs = [];
      unitData.conditions = [];
      combatUnits.push(unitData)
      console.log(unitData);
      if (unitData.isAlly || unitData.isPlayer) {
        crewContainer.appendChild(buildUnitTable(unitData, unitData.isAlly || isPlayer, isPlayer))
      } else {
        enemyContainer.appendChild(buildUnitTable(unitData, unitData.isAlly || isPlayer, isPlayer))
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
      }, 1000);
      unitData.skills.equipped.map(skill => skill.id).filter(s => s).forEach((skillId) => {
        if ((skillsData[skillId] && !skillsData[skillId].requiresTarget) || (unitData.skills.combatData.targets[skillId] !== undefined && findUnitById(unitData.skills.combatData.targets[skillId].target))) {
          targetData = unitData.skills.combatData.targets;
          unitData.skills.combatData.targets[skillId] = {
            target: targetData[skillId] && targetData[skillId].target?targetData[skillId].target: undefined,
            active: true
          };
          let cd = calculateSkillCooldown(unitData, skillId)
          unitData.skills.combatData.lastUsed[skillId] = Date.now() + cd
          console.log(`${unitData.name} : ${skillId} : ${cd}`)
        }
        skillIntervals[unitData.id] = setInterval(() => {
          if (player.inCombat && findUnitById(unitData.id)) {
            updateProgressBar(skillId, unitData); // Or loop through all allies
          } else {
            clearInterval(skillIntervals[unitData.id])
          }
        },100);
      })
      if(!unitData.isAlly){
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
        break;
    case "siphon":
      pushedEffect = JSON.parse(JSON.stringify(effect));
      pushedEffect.startTime = Date.now();
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
        statusEndEvent.emit(effect, caster, target, skillId);

      },
        pushedEffect.duration);
      updateStatusButton(unit);
      recalculateDerivedStats(unit);
      statusStartEvent.emit(effect,
        caster,
        unit,
        skillId);
      break;
    case "buff":
      console.log(unit.stats.hp.value, effect)
      pushedEffect = JSON.parse(JSON.stringify(effect));
      pushedEffect.startTime = Date.now()
      pushedEffect.duration = calculateEffectiveValue(pushedEffect.duration, caster, unit, caster.skills.equipped.find(s => s.id == skillId).level);
      pushedEffect.value = calculateEffectiveValue(pushedEffect.value, caster, unit, caster.skills.equipped.find(s => s.id == skillId).level)
      console.log(unit.stats.hp.value, pushedEffect)
      unit.buffs.push(pushedEffect);
      console.log(unit.stats.hp.value, pushedEffect)
      setTimeout(() => {
        if (findUnitById(unit.id)) {
          const index = unit.buffs.findIndex(e => e.name === pushedEffect.name && e.startTime === pushedEffect.startTime);
          if (index !== -1) {
            unit.buffs.splice(index, 1);
            recalculateDerivedStats(unit);
            updateStatusButton(unit);
            updateCombatBar(unit, "hp");
            updateCombatBar(unit, "mp");
            updateCombatBar(unit, "sp");
          }
        }
        statusEndEvent.emit(effect, caster, target, skillId);

      },
        pushedEffect.duration);
      updateStatusButton(unit);
    recalculateDerivedStats(unit);
      statusStartEvent.emit(effect,
        caster,
        unit,
        skillId);
         sign = (effect.type === "buff" ? pushedEffect.value < 0?"-":"+": "-");
         console.log(unit.stats.hp.value, pushedEffect)
         valueStr = effect.effect === "add"
        ? pushedEffect.value.toFixed(2): ((effect.type === "buff" ? Math.abs(pushedEffect.value - 1): Math.abs(1 - pushedEffect.value)) * 100).toFixed(2) + "%";
        desc = `${caster.name} inlicts ${effect.type} on ${unit.name}: ${sign}${valueStr} ${fromCamelCase(effect.stat)} for ${(pushedEffect.duration / 1000).toFixed(2)}s`;
      updateCombatLog(desc, caster)
      console.log(unit.stats.hp.value, pushedEffect)
      break;
    case "debuff":
      pushedEffect = JSON.parse(JSON.stringify(effect));
      pushedEffect.duration = calculateEffectiveValue(pushedEffect.duration, caster, unit, caster.skills.equipped.find(s => s.id == skillId).level);
      pushedEffect.value = calculateEffectiveValue(pushedEffect.value, caster, unit, caster.skills.equipped.find(s => s.id == skillId).level)
      pushedEffect.startTime = Date.now();
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
        statusEndEvent.emit(effect, caster, target, skillId);

      },
        pushedEffect.duration);
      updateStatusButton(unit);
      recalculateDerivedStats(unit);
      statusStartEvent.emit(effect,
        caster,
        unit,
        skillId);
         sign = (effect.type === "buff" ? effect.value < 0?"-": "+": "-");
         valueStr = effect.effect === "add"
        ? effect.value.toFixed(2): ((effect.type === "buff" ? Math.abs(pushedEffect.value - 1): Math.abs(1 - pushedEffect.value)) * 100).toFixed(2) + "%";
        desc = `${caster.name} inlicts ${effect.type} on ${unit.name}: ${sign}${valueStr} ${fromCamelCase(effect.stat)} for ${(pushedEffect.duration / 1000).toFixed(2)}s`;
      updateCombatLog(desc, caster)
      
      break;

    case "dot":

      break;

    case "heal":
      if (!unit.isAlive) break;
      let base = effect.base + effect.scale * caster.attributes[effect.scaling];
      console.log("healing " + base)
      unit.stats.hp.value = Math.min(unit.stats.maxHp.value, unit.stats.hp.value + base);
    updateCombatBar(unit, "hp");
      break;

    case "revive":
      if (unit.isAlive) break;
      unit.isAlive = true;
      unit.stats.hp.value = 1;
      updateCombatBar(unit, "hp");
      break;

    case "condition":
      if (!conditionsData || !conditionsData[effect.name]) {
        console.warn(`Unknown condition: ${effect.name}`);
        return;
      }

      if (!unit.conditions) unit.conditions = {};
      const condition = effect.name;
      const stacksToAdd = calculateEffectiveValue(effect.stacks, caster, unit, caster.skills.equipped.find(s=>s.id==skillId).level) || 1;

      if (!unit.conditions[condition]) {
        unit.conditions[condition] = {
          stacks: 0
        }
      }
      unit.conditions[condition].stacks += stacksToAdd;
      unit.conditions[condition].caster = caster
      updateStatusButton(unit)
      console.log(`${unit.name} gains ${stacksToAdd} stack(s) of ${condition} (total: ${unit.conditions[condition].stacks})`);
      statusStartEvent.emit(effect, caster, unit, skillId)
      break;
    }
  }
}
function damageUnit(caster, target, damageType, amount) {
  if(target.stats.evasionChance && target.stats.evasionChance.value){
    let stat = target.stats.evasionChance
    let val = stat.value;
    if(Math.floor(Math.random()*100)<val){
      updateCombatLog(`${target.name} evaded damage!`, caster);
      return 0;
    }
  }
  const resist = getDamageMultiplier(damageType, target.damageType);
  const total = amount * resist;
  onDamageEvent.emit(caster, target, damageType, Math.min(target.stats.hp.value, total))
  target.stats.hp.value = Math.max(target.stats.hp.value - total, 0);
  updateCombatBar(target, "hp");
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

    if (equipped.length >= 6) {
      console.log("You can only equip up to 6 skills.");
      return;
    }
    console.log("equupped");
    console.log(equipped)
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
  console.log(unitId, combatUnits, unit);
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
  console.log(skillToTarget)

  if (!unit.skills.combatData.targets || !unit.skills.combatData.targets[skillId]) unit.skills.combatData.targets[skillId] = {};
  unit.skills.combatData.targets[skillId].target = targetUnitId;
  resetUnitSkillDisplays(unit)
  console.log(`Skill ${skillId} target set to ${findUnitById(targetUnitId).name} for ${unit.name}`);
  document.querySelectorAll('.unit-box').forEach(box => {
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
      box.style.setProperty('--border-gradient', 'linear-gradient(to right, #000, #000)');

    })
    return;
  }
  skillToTarget = skillId;
  unitToCast = casterId;
  console.log("start targetting");
  let potentialTargets = getPotentialTargets(findUnitById(casterId), skillsData[skillId])
  document.querySelectorAll('.unit-box').forEach(box => {
    let unitId = parseInt(box.id.match(/\d+/)[0]);
    let unit = findUnitById(unitId);
    if (unit.isAlive) {
      if (settings.friendlyFire || potentialTargets.includes(unit)) {
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

function getPotentialTargets(caster, skill) {
  if(!skill){
    console.error("Skill undefined")
  }
  if (!skill.requiresTarget) {
    return null;
  }
  if (skill.target == "singleEnemy") {
    return combatUnits.filter(u => u.isAlly != caster.isAlly);
  }
  if (skill.target == "singleAlly") {
    return combatUnits.filter(u => u.isAlly == caster.isAlly);
  }
  return null;
}
function findUnitById(id) {
  // Search through player, allies, and enemies as needed
  if (id === undefined || id === null) {
    if (Date.now() < lastError + 3000) {
      console.error(new Error().stack)
    }
    lastError = Date.now();
    return null;
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
function getAvailableSkills() {
  const learnedSkills = Object.fromEntries(
    player.skills.learned.map(s => [s.id, s.level])
  );

  const tree = loreDataCache.classes[player.class].skillTree;
  const availableSkills = [];

  for (let skill of tree) {
    const learnedLevel = learnedSkills[skill.id] || 0;
    const nextLevel = learnedLevel + 1;
    //    console.log(skill, learnedLevel)
    // Skip if max level already reached
    if (learnedLevel >= skill.maxLevel) continue;

    // Skip if not enough points
    if (player.skillPoints < skill.cost) continue;

    // Check if there is a previous skill requirement
    if (skill.previousSkill) {
      const prevLevel = learnedSkills[skill.previousSkill] || 0;
      // console.log(`skill ${skill.id} has prev ${skill.previousSkill}: ${prevLevel} / ${skill.previousSkillLevelRequired}`)
      if (prevLevel < skill.previousSkillLevelRequired) continue;
    }
    let skillToPush = {
      id: skill.id,
      nextLevel: nextLevel,
      cost: skill.cost
    }
    console.log("pushing skill", skillToPush)
    availableSkills.push(skillToPush);
  }
  console.log("pushing skills", Object.fromEntries(availableSkills.map(s => [s.id, s])))
  return Object.fromEntries(availableSkills.map(s => [s.id, s]));
}

function showUnitPopup(unitId) {

  let unit = findUnitById(unitId)
  if (!unit) {
    unit = getUnitDataFromType(unitId);
  }

  let html = `<div class="popup-unit-header">${unit.name}</div><div class="unit-attributes">`;
  // Attributes section
  let attrIndex = 0;
  console.log("displaying info")
  console.log(unit)
  Object.keys(unit.attributes).forEach(attr => {
    const base = getEffectiveAttribute(unit, attr);
    html += `
    <div id="${attr}-display" class="attr-div">
    ${attr.charAt(0).toUpperCase() + attr.slice(1)}: ${base}
    </div>
    `;
    attrIndex++;
  });

  html += `</div><div class="unit-stats">`;

  // Stats section
  html += `
  <div class="stat-row stat-header stat-hp">Health (HP)</div>
  <div class="stat-subrow"><span>Current:</span><span>${unit.stats.hp.value}</span></div>
  <div class="stat-subrow"><span>Max:</span><span>${unit.stats.maxHp.value}</span></div>
  <div class="stat-subrow"><span>Regen:</span><span>${unit.stats.hpRegen.value}</span></div>

  <div class="stat-row stat-header stat-sp">Stamina (SP)</div>
  <div class="stat-subrow"><span>Current:</span><span>${unit.stats.sp.value}</span></div>
  <div class="stat-subrow"><span>Max:</span><span>${unit.stats.maxSp.value}</span></div>
  <div class="stat-subrow"><span>Regen:</span><span>${unit.stats.spRegen.value}</span></div>
  <div class="stat-subrow"><span>Efficiency:</span><span>${unit.stats.spEfficiency.value}</span></div>

  <div class="stat-row stat-header stat-mp">Mana (MP)</div>
  <div class="stat-subrow"><span>Current:</span><span>${unit.stats.mp.value}</span></div>
  <div class="stat-subrow"><span>Max:</span><span>${unit.stats.maxMp.value}</span></div>
  <div class="stat-subrow"><span>Regen:</span><span>${unit.stats.mpRegen.value}</span></div>
  <div class="stat-subrow"><span>Efficiency:</span><span>${unit.stats.mpEfficiency.value}</span></div>

  <div class="stat-row stat-header stat-combat">Combat</div>
  <div class="stat-subrow"><span>Attack Power:</span><span>${unit.stats.attackPower.value}</span></div>
  <div class="stat-subrow"><span>Spell Power:</span><span>${unit.stats.spellPower.value}</span></div>

  <div class="stat-row stat-header stat-crit">Critical</div>
  <div class="stat-subrow"><span>Crit Chance:</span><span>${unit.stats.critChance.value}</span></div>
  <div class="stat-subrow"><span>Crit Multiplier:</span><span>${unit.stats.critMulti.value}</span></div>

  <div class="stat-row stat-header stat-lifesteal">Lifesteal</div>
  <div class="stat-subrow"><span>Lifesteal %:</span><span>${unit.stats.lifestealMulti.value}</span></div>
  <div class="stat-subrow"><span>Lifesteal Chance:</span><span>${unit.stats.lifestealChance.value}</span></div>

  <div class="stat-row stat-header">Other</div>
  <div class="stat-subrow"><span>Cooldown Reduction:</span><span>${unit.stats.cooldownReduction.value}</span></div>
  <div class="stat-subrow"><span>Armor Penetration:</span><span>${unit.stats.armorPenetration.value}</span></div>
  <div class="stat-subrow"><span>Magic Penetration:</span><span>${unit.stats.magicPenetration.value}</span></div>
  <div class="stat-row stat-header">Skills</div>

  `;
  html += `</div>`;

  // Display the popup
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
  const container = document.createElement("div");
  unit.skills.equipped.forEach(skill => {
    const skillRow = document.createElement("div");
    skillRow.className = "stat-subrow";

    const button = document.createElement("button");
    button.textContent = skillsData[skill.id].name;

    button.addEventListener("click", () => {
      setTimeout(() => showSkillPopup(skill.id, player.inCombat, unit), 1);
    });

    skillRow.appendChild(button);
    container.appendChild(skillRow);
  });

  document.body.appendChild(overlay)
  document.querySelector(".popup").appendChild(container);
}

function checkIfCombatFinished() {
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
  document.querySelectorAll(".popup").forEach(e => e.remove())
  let menuContent = document.getElementById("menu-content")
  menuContent.innerHTML = ""
  combatUnits.forEach(u => {
    u.skills.combatData.target = [];
  })
  player.inCombat = false;
  skillIntervals.forEach(ski => clearInterval(ski));
  regenIntervals.forEach(regi => clearInterval(regi))
  let defeated = combatUnits.filter(unit => !unit.isAlive && !unit.isAlly);
  combatUnits = [];
  let finDiv = document.createElement("div");
  finDiv.style.display = "flex";
  finDiv.style.display = "flex"
  finDiv.style.flexDirection = "column"
  finDiv.style.textAlign = "center"
  let levelUpDiv = document.createElement("div")
  xpBar = `
  <div class="bar xp-bar" style="height: 1em; display: flex; margin-bottom: 2em; align-items: center; position: relative; margin-left: 20%; width: 60%">
  <div
  class="xp-bar fill"
  id="bar-fill-${player.id}-xp"
  style="width: ${(player.xp / player.maxXp) * 100}%; position: absolute; height: 25px; top: 0; left: 0; z-index: 0;">
  </div>
  <div
  class="bar-text"
  style="font-size: 8px; position: relative; z-index: 1; width: 100%; text-align: center;"
  id="bar-text-${player.id}-xp">
  XP (<span id="xp-display">${player.xp}</span>/${player.maxXp})
  </div>
  </div>
  `
  finDiv.style.flexDirection = "column"
  let mainArea = document.getElementById("main-area")
  mainArea.innerHTML = "";


  if (win) {
    finDiv.innerHTML += "<h1>You are Victorious!</h1><br>"
    finDiv.innerHTML += xpBar;
    let oldXp = player.xp;
    if (!player.zoneProgress[player.zone.name].discoveredEnemies) {
      player.zoneProgress[player.zone.name].discoveredEnemies = [];
    }
    defeated.forEach(unit => {

      finDiv.innerHTML += `
      <div><span>${unit.name} defeated: </span><span style="color: #d8a">${unit.xp*unit.tier} xp!<br></span></div>
      `
      if (!player.zoneProgress[player.zone.name].discoveredEnemies.includes(unit.name)) {
        finDiv.innerHTML += `
        <div><span color="#aa5">${unit.name} discovered! </span><br></div>
        `
        player.zoneProgress[player.zone.name].discoveredEnemies.push(unit.name)
      }
      player.xp += unit.xp * unit.tier;
      if (player.xp >= player.maxXp) {
        levelUp();
        levelUpDiv.innerHTML += `<h3>Level Up!</h3>`
      }
    })
    player.zoneProgress[player.zone.name].count = Math.min(Math.max(player.zone.count+1, player.zoneProgress[player.zone.name].count),
      loreDataCache.zones[player.zone.name].maxTier);
    mainArea.appendChild(finDiv);
    mainArea.appendChild(levelUpDiv);
    let newXp = player.xp;
    let newXpPercentage = player.xp/player.maxXp
    animateXpGain( {
      elementId: "xp-display",
      barId: "bar-fill-0-xp",
      startXp: oldXp,
      endXp: newXp,
      maxXp: player.maxXp,
      duration: 2500
    });
  } else {
    finDiv.innerHTML += "<h1>You Have Died!</h1><br>"
    finDiv.innerHTML += xpBar;
    mainArea.appendChild(finDiv);
    mainArea.appendChild(levelUpDiv);
  }




  initializeCombatUnits(player.zone.name);
  if (win) {
    menuContent.innerHTML += `
    <button style="width: 50%; margin: 2em 25%; border-radius: 2em;" id="continue-btn" ${forceContinue?`class="countdown-button"`: ""}>
    <span class="label">Continue?</span>
    <div class="progress-fill"></div>
    </button>`
  }
  menuContent.innerHTML += `
  <button style="width: 50%; margin: 0% 25%; border-radius: 2em;" id="repeat-btn" ${!forceContinue || !win?`class="countdown-button"`: ""}>
  <span class="label">Repeat?</span>
  <div class="progress-fill"></div>
  </button>
  `
  const button = document.querySelector('.countdown-button');
  if (forceContinue && win) {
    countdownAutoClick(button, "Continue?", 5000, () => {
      forceContinue = true;
      nextEncounter();
      startCombat();
    });
    document.getElementById("repeat-btn").onclick = () => {
      forceContinue = false;
      startCombat();
    }
  } else {
    countdownAutoClick(button, "Repeat?", 5000, () => {
      forceContinue = false;
      startCombat();
    });
  }
  if (win) {
    document.getElementById("continue-btn").onclick = () => {
      forceContinue = true;
      nextEncounter();
      startCombat();
    }
  }
}
function levelUp() {
  player.xp -= player.maxXp;
  player.maxXp += 20;
  player.level += 1;
  let keys = Object.keys(player.attributes);
  for (let i = 0; i < 6; i++) {
    player.attributes[keys[i]] += loreDataCache.classes[player.class].attributes[i];
  }
  player.attributePoints += 3;

  player.skillPoints += 1;

  updateMenuButton(document.getElementById("character-btn"), "linear-gradient(rgba(50,230,50,0.5),rgba(30,180,30,0.5))")
  if (getAvailableSkills().length > 0) {
    updateMenuButton(document.getElementById("skills-btn"), "linear-gradient(rgba(50,230,50,0.5),rgba(30,180,30,0.5))")
  }
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

    textElement.textContent = currentXp.toLocaleString();
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

function calculateEffectiveValue(block, caster, target, skillLevel) {
  if (!block) {
    console.error("No block defined", new Error().stack);
    return null;
  }

  if (block.base === undefined) {
    if (block.value === undefined) {
      console.error("Block doesn't have a .base or .value", block, new Error().stack);
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
    const entity = scaleEntry.target === "caster" ? caster : target;
    const stat = scaleEntry.stat;
    const scale = scaleEntry.scale;
    let statValue = 0;

    if (entity.attributes?.[stat] !== undefined) {
      statValue = entity.attributes[stat];
    } else if (entity.stats?.[stat]?.value !== undefined) {
      statValue = entity.stats[stat].value;
    } else if (stat === "skillLevel" && typeof skillLevel === "number") {
      statValue = skillLevel;
    } else {
      console.warn(`Stat "${stat}" not found in ${scaleEntry.target}`, scaleEntry);
    }

    if (typeof value !== "number") {
      console.error("Value is not a number", value);
    }

    value += statValue * scale;
  }

  return value;
}
function formatSkillLevelScalingsWithLabels(skillId, paths) {
  const results = [];
  if(!paths){
    console.log("no paths")
  }
  console.log(paths)
  for (const path of paths) {
    let current = skillsData;
    const skillData = skillsData[skillId];
    const skillName = skillData?.name || skillId

    // Follow the path to get to the scaling object
    let value = skillsData[skillId];
    for (let i = 0; i < path.length; i++) {
      value = value[path[i]];
    }
    console.log(value)
    const scalingArray = value.scaling || [];
    const skillLevelScales = scalingArray
      .filter(s => s.stat === "skillLevel")
      .map(s => `${s.scale >= 0 ? "+" : ""}${s.scale} per level`).join("<br>");

    // Determine the label based on the path
    let label = path.join('.');
    if (path.includes("effects")) {
      const effectIndex = path[path.indexOf("effects") + 1];
      const effect = skillData.effects?.[effectIndex];
      if (effect && effect.type) {
        const type = effect.type;
        // Count how many effects of this type come before this one
        const count = skillData.effects.slice(0, effectIndex + 1)
          .filter(e => e.type === type).length;
        label = `${type.charAt(0).toUpperCase() + type.slice(1)} Effect (${count})`;
      }
    }

    results.push(`Scales ${label.capitalize()}  ${skillLevelScales}<br>`);
  }

  return results.join(" ");
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
      const pct = (remaining / effect.duration) * 100;

      const bar = document.createElement("div");
      bar.className = "bar";
      bar.style.background = "#333";
      bar.style.position = 'relative';

      const fill = document.createElement("div");
      fill.className = "bar-fill";
      fill.style.width = pct + "%";
      fill.style.background = color;
      let name = effect.name?effect.name: effect.type == "debuff" || effect.type == "buff"?`${effect.type.capitalize()} ${effect.stat.capitalize()
      } ${effect.effect == "add"?"+": "x"}${effect.value.toFixed(2)}: ${(remaining/1000).toFixed(2)}s`: "undefined"
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
  statusPopupInterval = setInterval(renderStatusBars, 100);
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

  // Optional: allow adding listeners from instance
  on(callback) {
    eventListeners[this.name].push(callback);
  }
}

// Example usage:

// Create an event type
const onDamageEvent = new EventType("onDamage");
const statusStartEvent = new EventType("statusStart");
const statusEndEvent = new EventType("statusEnd");
const applyEffectEvent = new EventType("applyEffect");
const castSkillEvent = new EventType("castSkill");
const startCombatEvent = new EventType("startCombat");
const finishCombatEvent = new EventType("finishCombat");
const recalculateStatEvent = new EventType("recalculateStat");
const levelUpEvent = new EventType("levelUp");

recalculateStatEvent.on((u, s, o, n) => {
  if(u.isAlly){
    console.log(u,s,o,n);
  }
})
