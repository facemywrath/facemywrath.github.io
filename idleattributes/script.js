//load?
const doLoad = true;
const maxOfflineTime = 600;
const offlineXPMulti = 1;
//save?
const doSave = true;
const saveFrequency = 5000;

let saveInterval;

function saveLoop() {
  saveInterval = setInterval(()=> {
    saveGameState();
    console.log(`${Date.now()}: Game Saved.`);
  }, saveFrequency);
}
function saveGameState() {
  if (!doSave) {
    return;
  }
  // Create a shallow copy of the player object to avoid mutating the original
  const playerData = JSON.parse(JSON.stringify(player));

  // Remove any properties or objects that should not be saved (e.g., enemy object)
  const saveData = {
    player: playerData,
    autoProgress: autoProgress,
    currentEnemyLevel: currentEnemyLevel,
    maxUnlockedLevel: maxUnlockedLevel,
    totalReincarnations: totalReincarnations,
    unlockedClasses: unlockedClasses,
    lastSaveTime: Date.now(),
    totalTractionResets: totalTractionResets
  };

  // Save the game state to localStorage as a JSON string
  localStorage.setItem('gameState', JSON.stringify(saveData));


}

function loadGameState() {
  if (!doLoad) {
    return;
  }
  // Retrieve the saved game state from localStorage
  const savedGameState = localStorage.getItem('gameState');

  // Check if there's a saved game state
  if (savedGameState) {
    const gameState = JSON.parse(savedGameState);

    // Load the saved data into the appropriate variables
    player = gameState.player;
    autoProgress = gameState.autoProgress;
    currentEnemyLevel = gameState.currentEnemyLevel;
    maxUnlockedLevel = gameState.maxUnlockedLevel;
    if (currentEnemyLevel == maxUnlockedLevel) {
      currentEnemyLevel = Math.max(1, currentEnemyLevel-1);
    }
    totalReincarnations = gameState.totalReincarnations;
    totalTractionResets = gameState.totalTractionResets;
    unlockedClasses = gameState.unlockedClasses;

    // Calculate time passed since the last save
    const lastSaveTime = gameState.lastSaveTime || Date.now();
    const currentTime = Date.now();
    const timePassed = currentTime - lastSaveTime; // Time passed in milliseconds
    const timePassedInSeconds = Math.max(1, Math.min(maxOfflineTime, timePassed / 1000));
    // Convert time passed to minutes and seconds
    const minutesPassed = Math.floor(timePassedInSeconds / 60);
    const secondsPassed = Math.floor(timePassedInSeconds % 60);
    let xpPercentageGained = 0;
    let levelsGained = 0;
    if (player.currentClass !== "none") {
      // Calculate the number of attacks the player could have made in that time
      const attackInterval = player.attackSpeed; // Attack speed in seconds
      const attacksInTimePassed = Math.floor(timePassed / attackInterval);
      changeEnemyLevel(currentEnemyLevel);
      // Calculate the XP gain based on the enemy's XP value
      updateDamage();
      killsInTimePassed = attacksInTimePassed/(enemy.baseHealth/player.damage);
      const xpGain = killsInTimePassed * enemy.xp * player.xpMulti*offlineXPMulti;

      // Calculate how many levels were gained
      let levelsGained = 0;
      let prevXP = player.xp;
      let prevLevel = player.level;
      player.xp += xpGain;
      levelUp(); // Handle leveling up and distributing points
      levelsGained = player.level - prevLevel;
      // Calculate XP percentage gained in the current level
      let xpPercentageGained = (player.xp/player.maxXP*100).toFixed(2);
      if (levelsGained == 0) {
        xpPercentageGained = ((player.xp-prevXP)/player.maxXP*100).toFixed(2);
      }

      // Create the popup content
      const popupContent = `
      <div id="popup" style="position: fixed; top: 20%; left: 50%; transform: translate(-50%, -20%); background: #444; padding: 20px; border-radius: 10px; color: white; text-align: center;">
      <h2>Time Passed: ${minutesPassed}m ${secondsPassed}s</h2>
      <p>Levels Gained: ${levelsGained}</p>
      <p>XP Gained: ${xpPercentageGained}%</p>
      <button id="closePopup" style="padding: 10px 20px; background-color: #555; border: none; color: white; cursor: pointer;">Continue</button>
      </div>
      `;

      // Insert the popup into the body
      document.body.insertAdjacentHTML('beforeend', popupContent);

      // Add event listener to close the popup and start the game
      document.getElementById('closePopup').addEventListener('click', function() {
        // Remove the popup from the DOM
        document.getElementById('popup').remove();

        // If player class is not "none", close the class selection menu

        document.getElementById('characterSelection').style.display = 'none';
        document.getElementById('topBar').style.display = 'flex';
        document.getElementById('battleArea').style.display = 'block';
        document.getElementById('levelDisplayRow').style.display = 'flex';
        document.getElementById('xpBarContainer').style.display = 'flex';
        document.getElementById('bottomMenu').style.display = 'block';

        // Update any necessary UI elements after loading
        updateAttributes();
        updateAttributesMenu();
        updateHealthBars();
        updateXPBar();
        tryUnlockSkills();
        tryUnlockResolutionSkills();
        setMainStatDisplay(player.primaryAttribute);
        unlockResolutionSkillsMenu();
        // Start the necessary game functions after closing the popup
        startSwordFills();
        startCombat();
        addMissingKeys(player, heroInitialConfig);
        console.log(player);
        autoProgressBtn.checked = autoProgress
      });
    }
    console.log(`Game state loaded! Time passed: ${minutesPassed}m ${secondsPassed}s. XP gained: ${xpPercentageGained}%. Levels gained: ${levelsGained}`);

  } else {
    console.log('No saved game state found.');
  }
  if (totalReincarnations == 0 && player.currentClass == "none") {
    return;
  }
  unlockTractionMenu();
  saveLoop();
}

function addMissingKeys(obj, config) {
  for (const key in config) {
    if (!obj.hasOwnProperty(key)) {
      obj[key] = config[key];
    } else if (typeof config[key] === 'object' && config[key] !== null && !Array.isArray(config[key])) {
      // If it's a sub-object, recurse into it
      addMissingKeys(obj[key], config[key]);
    }
  }
}
function forceAttributes(val) {
  player.strength = val;
  player.intellect = val;
  player.agility = val;
  player.toughness = val;
  player.mysticism = val;
  updateAttributes();
}
// Screen elements
const attributesScreenBtn = document.getElementById("attributesScreenBtn");
const resolutionScreenBtn = document.getElementById("resolutionScreenBtn")
const bottomMenu = document.getElementById("bottomMenu");

// Health elements
const playerHealthText = document.getElementById("playerHealthText");
const enemyHealthText = document.getElementById("enemyHealthText");
const playerHealthBar = document.getElementById("playerHealthBar");
const enemyHealthBar = document.getElementById("enemyHealthBar");

// Enemy level control elements
const enemyLevelText = document.getElementById("enemyLevelText");
const prevEnemyBtn = document.getElementById("prevEnemyBtn");
const nextEnemyBtn = document.getElementById("nextEnemyBtn");

const autoProgressBtn = document.getElementById("autoProgressCheckbox");

const archerDescription = document.getElementById("archer-desc");
const archerSelectBtn = document.getElementById("archer-select-btn");
const archerCard = document.getElementById("archer-card");
const wizardDescription = document.getElementById("wizard-desc");
const wizardSelectBtn = document.getElementById("wizard-select-btn");
const wizardCard = document.getElementById("wizard-card");
const druidDescription = document.getElementById("druid-desc");
const druidSelectBtn = document.getElementById("druid-select-btn");
const druidCard = document.getElementById("druid-card");
const hpBarSize = playerHealthBar.width;

const strengthColor = "#a44";
const intellectColor = "#649";
const agilityColor = "#4a4";
const toughnessColor = "#027";
const mysticismColor = "#a4a";

let autoProgress = false;
let currentEnemyLevel = 1;
let maxUnlockedLevel = 1;
let totalReincarnations = 0;
let totalTractionResets = 0;
let unlockedClasses = ["warrior"];
let cleaveThroughDamage = []
let magicMissileAttackCounter = 0;
let purchaseMulti = 1;
let purchaseMultiOptions = [1, 10, 25, 100];

let player = {
  currentClass: "none",
  primaryAttribute: "none",
  health: 50,
  maxHealth: 50,
  damage: 10,
  level: 1,
  xp: 0,
  maxXP: 30,
  xpMulti: 1,
  attackSpeed: 2000,
  defense: 1,
  evasion: 0,
  critChance: 0,
  critMulti: 2,
  regen: 0,
  regenSpeed: 1800,
  // XP needed for next level
  attributePoints: 0,
  // Points to spend after leveling up
  skillPoints: 0,
  resolutionPoints: 0,
  traction: {
    warrior: {
      points: 0,
      skills: {
        attribution: {
          level: 0,
          locked: false,
          unlockText: 'Locked',
          cost: 1,
          max: 5
        },
        skillful: {
          level: 0,
          locked: true,
          unlockText: 'Max Attribution',
          cost: 50,
          max: 1
        }
      }
    },
    archer: {
      points: 0,
      skills: {
        attribution: {
          level: 0,
          locked: false,
          unlockText: 'Locked',
          cost: 1,
          max: 5
        },
        skillful: {
          level: 0,
          locked: true,
          unlockText: 'Max Attribution',
          cost: 50,
          max: 1
        },
        bullseye: {
          level: 0,
          locked: true,
          unlockText: 'Max Skillful',
          cost: 30,
          max: 20
        }
      }
    },
    wizard: {
      points: 0,
      skills: {
        attribution: {
          level: 0,
          locked: false,
          unlockText: 'Locked',
          cost: 1,
          max: 5
        },
        skillful: {
          level: 0,
          locked: true,
          unlockText: 'Max Attribution',
          cost: 50,
          max: 1
        }
      }
    },
    druid: {
      points: 0,
      skills: {
        attribution: {
          level: 0,
          locked: false,
          unlockText: 'Locked',
          cost: 1,
          max: 5
        },
        skillful: {
          level: 0,
          locked: true,
          unlockText: 'Max Attribution',
          cost: 50,
          max: 1
        }
      }
    },
    vanguard: {
      points: 0,
      skills: {
        attribution: {
          level: 0,
          locked: false,
          unlockText: 'Locked',
          cost: 1,
          max: 5
        },
        skillful: {
          level: 0,
          locked: true,
          unlockText: 'Max Attribution',
          cost: 50,
          max: 1
        }
      }
    }
  },
  strength: 0,
  intellect: 0,
  agility: 0,
  toughness: 0,
  mysticism: 0,
  attacksThisFight: 0,
  timeMulti: 1,
  skills: {
    overpower: {
      level: 0,
      locked: true,
      unlockAt: 10,
      unlockClass: "warrior"
    },
    charge: {
      level: 0,
      locked: true,
      unlockAt: 20,
      unlockClass: "warrior"
    },
    cleave: {
      level: 0,
      locked: true,
      unlockAt: 40,
      unlockClass: "warrior"
    },
    shieldWall: {
      level: 0,
      locked: true,
      unlockAt: 60,
      unlockClass: "warrior"
    },
    sharpness: {
      level: 0,
      locked: true,
      unlockAt: 10,
      unlockClass: "archer"
    },
    quickdraw: {
      level: 0,
      locked: true,
      unlockAt: 20,
      unlockClass: "archer"
    },
    evasion: {
      level: 0,
      locked: true,
      unlockAt: 40,
      unlockClass: "archer"
    },
    explosiveShot: {
      level: 0,
      locked: true,
      unlockAt: 60,
      unlockClass: "archer"
    },
    magicMissile: {
      level: 0,
      locked: true,
      unlockAt: 0,
      unlockClass: "wizard"
    },
    collegiate: {
      level: 0,
      locked: true,
      unlockAt: 20,
      unlockClass: "wizard"
    },
    empower: {
      level: 0,
      locked: true,
      unlockAt: 40,
      unlockClass: "wizard"
    },
    mirrorImage: {
      level: 0,
      locked: true,
      unlockAt: 60,
      unlockClass: "wizard"
    }
  },
  resolutionSkills: {
    weightLifting: {
      level: 0,
      locked: true,
      unlockAt: 30,
      unlockClass: "warrior"
    },
    bash: {
      level: 0,
      locked: true,
      unlockAt: 50,
      unlockClass: "warrior"
    },
    tactician: {
      level: 0,
      locked: true,
      unlockAt: 70,
      unlockClass: "warrior"
    },
    eagleEye: {
      level: 0,
      locked: true,
      unlockAt: 30,
      unlockClass: "archer"
    },
    featheredShot: {
      level: 0,
      locked: true,
      unlockAt: 50,
      unlockClass: "archer"
    },
    volley: {
      level: 0,
      locked: true,
      unlockAt: 70,
      unlockClass: "archer"
    },
    memorize: {
      level: 0,
      locked: true,
      unlockAt: 30,
      unlockClass: "wizard"
    },
    fireball: {
      level: 0,
      locked: true,
      unlockAt: 50,
      unlockClass: "wizard"
    },
    timeWarp: {
      level: 0,
      locked: true,
      unlockAt: 70,
      unlockClass: "wizard"
    }
  }
};

let enemy = {
  health: 40,
  baseHealth: 40,
  regen: 0,
  regenSpeed: 0,
  attack: 11.5,
  attackSpeed: 2005,
  // in milliseconds
  xp: 10
};
let currentMenu = "attributes";
let attributesFontSize = "18px";
let strengthDisplay = "Strength";
let intellectDisplay = "Intellect";
let agilityDisplay = "Agility";
let toughnessDisplay = "Toughness";
let mysticismDisplay = "Mysticism";

// Configuration object for initial hero values
const heroInitialConfig = {
  currentClass: "none",
  primaryAttribute: "none",
  health: 50,
  maxHealth: 50,
  damage: 10,
  level: 1,
  xp: 0,
  maxXP: 30,
  xpMulti: 1,
  attackSpeed: 2000,
  defense: 1,
  evasion: 0,
  regen: 0,
  regenSpeed: 1800,
  attributePoints: 0,
  skillPoints: 0,
  resolutionPoints: 0,
  traction: {
    warrior: {
      points: 0,
      skills: {
        attribution: {
          level: 0,
          locked: false,
          unlockText: 'Locked',
          cost: 1,
          max: 5
        },
        skillful: {
          level: 0,
          locked: true,
          unlockText: 'Max Attribution',
          cost: 50,
          max: 1
        }
      }
    },
    archer: {
      points: 0,
      skills: {
        attribution: {
          level: 0,
          locked: false,
          unlockText: 'Locked',
          cost: 1,
          max: 5
        },
        skillful: {
          level: 0,
          locked: true,
          unlockText: 'Max Attribution',
          cost: 50,
          max: 1
        },
        bullseye: {
          level: 0,
          locked: true,
          unlockText: 'Max Skillful',
          cost: 30,
          max: 20
        }
      }
    },
    wizard: {
      points: 0,
      skills: {
        attribution: {
          level: 0,
          locked: false,
          unlockText: 'Locked',
          cost: 1,
          max: 5
        },
        skillful: {
          level: 0,
          locked: true,
          unlockText: 'Max Attribution',
          cost: 50,
          max: 1
        }
      }
    },
    druid: {
      points: 0,
      skills: {
        attribution: {
          level: 0,
          locked: false,
          unlockText: 'Locked',
          cost: 1,
          max: 5
        },
        skillful: {
          level: 0,
          locked: true,
          unlockText: 'Max Attribution',
          cost: 50,
          max: 1
        }
      }
    },
    vanguard: {
      points: 0,
      skills: {
        attribution: {
          level: 0,
          locked: false,
          unlockText: 'Locked',
          cost: 1,
          max: 5
        },
        skillful: {
          level: 0,
          locked: true,
          unlockText: 'Max Attribution',
          cost: 50,
          max: 1
        }
      }
    }
  },
  strength: 0,
  intellect: 0,
  agility: 0,
  toughness: 0,
  mysticism: 0,
  attacksThisFight: 0,
  timeMulti: 1,
  skills: {
    overpower: {
      level: 0,
      locked: true,
      unlockAt: 10,
      unlockClass: "warrior"
    },
    charge: {
      level: 0,
      locked: true,
      unlockAt: 20,
      unlockClass: "warrior"
    },
    cleave: {
      level: 0,
      locked: true,
      unlockAt: 40,
      unlockClass: "warrior"
    },
    shieldWall: {
      level: 0,
      locked: true,
      unlockAt: 60,
      unlockClass: "warrior"
    },
    sharpness: {
      level: 0,
      locked: true,
      unlockAt: 10,
      unlockClass: "archer"
    },
    quickdraw: {
      level: 0,
      locked: true,
      unlockAt: 20,
      unlockClass: "archer"
    },
    evasion: {
      level: 0,
      locked: true,
      unlockAt: 40,
      unlockClass: "archer"
    },
    explosiveShot: {
      level: 0,
      locked: true,
      unlockAt: 60,
      unlockClass: "archer"
    },
    magicMissile: {
      level: 0,
      locked: true,
      unlockAt: 10,
      unlockClass: "wizard"
    },
    collegiate: {
      level: 0,
      locked: true,
      unlockAt: 20,
      unlockClass: "wizard"
    },
    empower: {
      level: 0,
      locked: true,
      unlockAt: 40,
      unlockClass: "wizard"
    },
    mirrorImage: {
      level: 0,
      locked: true,
      unlockAt: 60,
      unlockClass: "wizard"
    }
  },
  resolutionSkills: {
    weightLifting: {
      level: 0,
      locked: true,
      unlockAt: 30,
      unlockClass: "warrior"
    },
    bash: {
      level: 0,
      locked: true,
      unlockAt: 50,
      unlockClass: "warrior"
    },
    tactician: {
      level: 0,
      locked: true,
      unlockAt: 70,
      unlockClass: "warrior"
    },
    eagleEye: {
      level: 0,
      locked: true,
      unlockAt: 30,
      unlockClass: "archer"
    },
    featheredShot: {
      level: 0,
      locked: true,
      unlockAt: 50,
      unlockClass: "archer"
    },
    volley: {
      level: 0,
      locked: true,
      unlockAt: 70,
      unlockClass: "archer"
    },
    memorize: {
      level: 0,
      locked: true,
      unlockAt: 30,
      unlockClass: "wizard"
    },
    fireball: {
      level: 0,
      locked: true,
      unlockAt: 50,
      unlockClass: "wizard"
    },
    timeWarp: {
      level: 0,
      locked: true,
      unlockAt: 70,
      unlockClass: "wizard"
    }
  }
};


// Method to reset the player back to initial values
function buildHero(resetTier) {
  // Reset player properties based on the initial configuration
  if (resetTier == 1) {
    totalReincarnations++;
  } else if (resetTier == 2) {
    totalTractionResets++;
    totalReincarnations = 0;
    player.traction[player.currentClass].points += Math.max(0, maxUnlockedLevel-100);
  }
  oldResolutionSkills = player.resolutionSkills;

  let oldTractionSkills = player.traction;
  Object.assign(player, JSON.parse(JSON.stringify(heroInitialConfig)));
  if (resetTier <= 1) {
    player.resolutionSkills = oldResolutionSkills;
  }
  if (resetTier <= 2) {
    player.traction = oldTractionSkills;
  }
  for (let skill in player.resolutionSkills) {
    player.resolutionSkills[skill].locked = true;
  }
  // Update display elements to reflect the reset values
  player.strength += player.resolutionSkills.tactician.level;
  player.intellect += player.resolutionSkills.tactician.level;
  player.agility += player.resolutionSkills.tactician.level;
  player.toughness += player.resolutionSkills.tactician.level;
  player.mysticism += player.resolutionSkills.tactician.level;
  updateAttributesMenu();
  updateHealthBars();
  updateXPBar();
  updateDefense();
  updateCritChance();
  updateCritMulti();
  changeEnemyLevel(1);
  tryUnlockClasses();
  maxUnlockedLevel = 1;
  currentEnemyLevel = 1;
  tryUnlockSkills();
  tryUnlockResolutionSkills();
  cleaveThroughDamage = [];

  // Return to the character selection screen
  document.getElementById('characterSelection').style.display = 'block';
  document.getElementById('topBar').style.display = 'none';
  document.getElementById('battleArea').style.display = 'none';
  document.getElementById('levelDisplayRow').style.display = 'none';
  document.getElementById('xpBarContainer').style.display = 'none';
  document.getElementById('bottomMenu').style.display = 'none';
}
function tryUnlockClasses() {

  if (totalReincarnations < 2) {
    archerSelectBtn.textContent = `Give Up ${2-totalReincarnations} more times!`;
    archerSelectBtn.disabled = true;
    archerDescription.textContent = "Locked";
    wizardSelectBtn.textContent = `Give Up ${9-totalReincarnations} more times!`;
    wizardSelectBtn.disabled = true;
    wizardDescription.textContent = "Locked";
    return;
  }
  document.getElementById("archer-card").style.backgroundColor = agilityColor;
  archerSelectBtn.textContent = "Select";
  archerSelectBtn.disabled = false;
  archerDescription.textContent = "Archer";
  if (totalReincarnations < 9) {

    return;
  }
  document.getElementById("wizard-card").style.backgroundColor = intellectColor;
  wizardSelectBtn.textContent = "Select";
  wizardSelectBtn.disabled = false;
  wizardDescription.textContent = "Wizard";
  if (totalReincarnations < 15) {
    druidSelectBtn.textContent = `Give Up ${15-totalReincarnations} more times!`;
    druidSelectBtn.disabled = true;
    druidDescription.textContent = "Locked";
    return;
  }
  if (totalTractionResets > 0) {
    //    document.getElementById("druid-card").style.backgroundColor = mysticismColor;
    druidSelectBtn.textContent = "Cannot Select";
    druidSelectBtn.disabled = true;
    druidDescription.textContent = "Druid(WIP)";
  }
}
// Attributes and Settings menus
const attributesContent = `
<div>
<p style="display: flex; justify-content: space-between;">
<span id="attributePoints" style="font-size: 20px; margin-bottom: 20px;">Attribute Points: 0</span>
<span id="playerLevel" style="font-size: 20px; text-align: right; padding-right: 3vw">Level: ${player.level}</span>
</p>
<div style="width: 100%; height: 7vh; background-color: ${strengthColor}; display: flex; align-items: center; justify-content: space-between;">
<button id="strengthDisplay" style="background-color: rgba(128, 128, 128, 0.8); font-size: ${attributesFontSize}; border-radius: 2vh; border: 0.3vh solid black; height: 100%; width: 25vw;">${strengthDisplay}</button>
<button id="playerStrength" style="background-color: rgba(128, 128, 128, 0.8); font-size: ${attributesFontSize}; border-radius: 2vh; border: 0.3vh solid black; height: 100%; width: 15vw;">${player.strength}</button>
<button style="line-length: 0; font-size: ${attributesFontSize}; background-color: rgba(128, 128, 128, 0.8); padding: 2px 5px; border-radius: 2vh; border: 0.3vh solid black; height: 100%; width: 35vw;" onclick="increaseAttribute('strength')">+</button>
</div>
<div style="width: 100%; height: 7vh; background-color: ${intellectColor}; display: flex; align-items: center; justify-content: space-between;">
<button id="intellectDisplay" style="background-color: rgba(128, 128, 128, 0.8); font-size: ${attributesFontSize}; border-radius: 2vh; border: 0.3vh solid black; height: 100%; width: 25vw;">${intellectDisplay}</button>
<button id="playerIntellect" style="background-color: rgba(128, 128, 128, 0.8); font-size: ${attributesFontSize}; border-radius: 2vh; border: 0.3vh solid black; height: 100%; width: 15vw;">${player.intellect}</button>
<button style="line-length: 0; font-size: ${attributesFontSize}; background-color: rgba(128, 128, 128, 0.8); padding: 2px 5px; border-radius: 2vh; border: 0.3vh solid black; height: 100%; width: 35vw;" onclick="increaseAttribute('intellect')">+</button>
</div>
<div style="width: 100%; height: 7vh; background-color: ${agilityColor}; display: flex; align-items: center; justify-content: space-between;">
<button id="agilityDisplay" style="background-color: rgba(128, 128, 128, 0.8); font-size: ${attributesFontSize}; border-radius: 2vh; border: 0.3vh solid black; height: 100%; width: 25vw;">${agilityDisplay}</button>
<button id="playerAgility" style="background-color: rgba(128, 128, 128, 0.8); font-size: ${attributesFontSize}; border-radius: 2vh; border: 0.3vh solid black; height: 100%; width: 15vw;">${player.agility}</button>
<button style="line-length: 0; font-size: ${attributesFontSize}; background-color: rgba(128, 128, 128, 0.8); padding: 2px 5px; border-radius: 2vh; border: 0.3vh solid black; height: 100%; width: 35vw;" onclick="increaseAttribute('agility')">+</button>
</div>
<div style="width: 100%; height: 7vh; background-color: ${toughnessColor}; display: flex; align-items: center; justify-content: space-between;">
<button id="toughnessDisplay" style="background-color: rgba(128, 128, 128, 0.8); font-size: ${attributesFontSize}; border-radius: 2vh; border: 0.3vh solid black; height: 100%; width: 25vw;">${toughnessDisplay}</button>
<button id="playerToughness" style="background-color: rgba(128, 128, 128, 0.8); font-size: ${attributesFontSize}; border-radius: 2vh; border: 0.3vh solid black; height: 100%; width: 15vw;">${player.toughness}</button>
<button style="line-length: 0; font-size: ${attributesFontSize}; background-color: rgba(128, 128, 128, 0.8); padding: 2px 5px; border-radius: 2vh; border: 0.3vh solid black; height: 100%; width: 35vw;" onclick="increaseAttribute('toughness')">+</button>
</div>
<div style="width: 100%; height: 7vh; background-color: ${mysticismColor}; display: flex; align-items: center; justify-content: space-between;">
<button id="mysticismDisplay" style="background-color: rgba(128, 128, 128, 0.8); font-size: ${attributesFontSize}; border-radius: 2vh; border: 0.3vh solid black; height: 100%; width: 25vw;">${mysticismDisplay}</button>
<button id="playerMysticism" style="background-color: rgba(128, 128, 128, 0.8); font-size: ${attributesFontSize}; border-radius: 2vh; border: 0.3vh solid black; height: 100%; width: 15vw;">${player.mysticism}</button>
<button style="line-length: 0; font-size: ${attributesFontSize}; background-color: rgba(128, 128, 128, 0.8); padding: 2px 5px; border-radius: 2vh; border: 0.3vh solid black; height: 100%; width: 35vw;" onclick="increaseAttribute('mysticism')">+</button>
</div>
</div>
`;

const statsContent = `
<div class="stats-container">
<h2>Stats</h2>
<p>Attack Speed: ${(player.attackSpeed / 1000).toFixed(2)} seconds</p>
<p>Damage: ${player.damage}</p>
<p>Health: ${player.maxHealth}</p>
<p>Regen: ${player.regen}</p>
<p>Regen Speed: ${(player.regenSpeed / 1000).toFixed(2)} seconds</p>
<p>XP Multiplier: ${player.xpMulti.toFixed(2)}</p>
<p>Level: ${player.level}</p>
</div>
`;
const resolutionScreenContent = `
<!-- Resolute Skills Screen -->
<div id="resolutionScreen" class="screen">
<h2>Resolute Skills</h2>
<div>
<p>Weight Lifting: <span id="weightLiftingLevel">0</span></p>
<p>Bash: <span id="bashLevel">0</span></p>
<p>Tactician: <span id="tacticianLevel">0</span></p>
<p>Eagle Eye: <span id="eagleEyeLevel">0</span></p>
<p>Feathered Shot: <span id="featheredShotLevel">0</span></p>
<p>Volley: <span id="volleyLevel">0</span></p>
</div>
<button id="giveUpButton" style="margin-top: 20px;">Give Up!</button>
</div>
`

function unlockTractionMenu() {
  const tractionSkillsBtn = document.getElementById("tractionSkillsBtn");
  if (maxUnlockedLevel <= 100 && totalTractionResets == 0) {
    tractionSkillsBtn.disabled = true;
    tractionSkillsBtn.textContent = "Beat Depths 30";
    return;
  }

  tractionSkillsBtn.textContent = "Traction";
  tractionSkillsBtn.disabled = false;
}
function tractionReset() {
  buildHero(2);
}

function updatePurchaseMulti() {
  let val = purchaseMultiOptions.indexOf(purchaseMulti);
  val++;
  if (val > purchaseMultiOptions.length-1) {
    val = 0;
  }
  purchaseMulti = purchaseMultiOptions[val];
  document.getElementById("purchaseMultiBtn").textContent = `${purchaseMulti}x`;
}
function displayResoluteSkillsMenu() {
  let resolutionSkillsContent = `<h2>Resolution Points: ${player.resolutionPoints}</h2><div>`;

  for (let skill in player.resolutionSkills) {
    if (player.resolutionSkills[skill].unlockClass == player.currentClass) {
      let displayButtonText = ` disabled>Beat Floor ${player.resolutionSkills[skill].unlockAt}`;
      let levelButtonText = " disabled>Locked";
      if (!player.resolutionSkills[skill].locked) {
        displayButtonText = `>${capitalize(skill)}\nLevel ${player.resolutionSkills[skill].level}`;
        levelButtonText = `>Level Up`;

      }
      let skillLevel = player.resolutionSkills[skill].level;
      resolutionSkillsContent += `
      <div style="display: flex; justify-content: center;">
      <button id="${skill}Display" style="width: 60vw; height: 10vh; white-space: pre-wrap" ${displayButtonText}</button>
      <button id="${skill}LevelUp" style="width: 20vw; height: 10vh; white-space: pre-wrap" onclick="levelUpResoluteSkill('${skill}')" ${levelButtonText}</button>
      </div>
      `;
    }
  }

  resolutionSkillsContent += `
  <div style="display: flex; justify-content: center; margin-top: 20px;">
  <button id="giveUpButton" style="width: 80vw; height: 10vh;" onclick="buildHero(1)" >Give Up!</button>
  </div>
  `;

  resolutionSkillsContent += "</div>";

  switchMenu(resolutionSkillsContent, "resolution");
}
function tryUnlockResolutionSkills() {
  for (let skill in player.resolutionSkills) {
    if (player.resolutionSkills[skill].locked) {
      tryUnlockResolutionSkill(skill);
    }
  }
}
function tryUnlockResolutionSkill(skillName) {
  if (player.resolutionSkills[skillName].unlockAt >= currentEnemyLevel+1) {
    return;
  }
  player.resolutionSkills[skillName].locked = false;
  if (currentMenu == "resolution") {
    displayResoluteSkillsMenu();
  }
}

function unlockResolutionSkillsMenu() {
  if (maxUnlockedLevel >= 31) {
    resolutionScreenBtn.disabled = false;
    resolutionScreenBtn.textContent = "Resolution";
  } else {
    resolutionScreenBtn.disabled = true;
    resolutionScreenBtn.textContent = "Beat Floor 30";
  }
}
function levelUpTractionSkill(skillName, className) {
  console.log(`attempting level up ${skillName} for ${className}`);

  // Check if player has enough points
  if (player.traction[className].points < player.traction[className].skills[skillName].cost) {
    console.log("level out of points");
    return;
  }

  // Check if player's level is high enough
  console.log("too low hero lvl?");


  // Check if skill is already maxed out
  console.log(`skill is maxed? ${player.traction[className].skills[skillName].max} ${player.traction[className].skills[skillName].level}`);
  if (player.traction[className].skills[skillName].max <= player.traction[className].skills[skillName].level) {
    return;
  }

  // Deduct points and level up the skill
  console.log("completed");
  player.traction[className].points -= player.traction[className].skills[skillName].cost;
  player.traction[className].skills[skillName].level++;

  // Update the skill display
  let displayButtonText = `${capitalize(skillName)}\n${player.traction[className].skills[skillName].level}`;
  let level = player.traction[className].skills[skillName].level;
  let max = player.traction[className].skills[skillName].max;

  // Check if the skill is maxed and unlock the next skill
  if (level === max) {
    let skillKeys = Object.keys(player.traction[className].skills);
    let currentSkillIndex = skillKeys.findIndex(key => key === skillName);

    if (currentSkillIndex !== -1 && currentSkillIndex < skillKeys.length - 1) {
      // Unlock the next skill
      let nextSkillName = skillKeys[currentSkillIndex + 1];
      player.traction[className].skills[nextSkillName].locked = false;
      console.log(`${nextSkillName} has been unlocked!`);
      displayClassTalents(className);
    }
  }

  document.getElementById(`${skillName}Display`).textContent = displayButtonText;
  displayClassTalents(className);

  // Update cost and effect for specific skills
  switch (skillName) {
    case 'attribution':
      player.traction[className].skills[skillName].cost = level * 10;
      break;
    case 'skillful':
      break;
    case 'tactician':
      updateTacticianEffect();
      break;
    case 'eagleEye':
      updateEagleEyeEffect();
      break;
    case 'featheredShot':
      updateFeatheredShotEffect();
      break;
    case 'volley':
      updateVolleyEffect();
      break;
    case "memorize":
      updateMemorizeEffect();
      break;
    default:
      console.error("Unknown skill: " + skillName);
      break;
  }

  displayClassTalents(className);
}
function levelUpResoluteSkill(skillName) {
  if (player.resolutionPoints == 0) {
    console.log("level out of points");
    return;
  }
  if (player.level <= player.resolutionSkills[skillName].level) {
    return;
  }
  let purchaseAmount = Math.min(purchaseMulti, player.resolutionPoints);
  purchaseAmount = Math.min(player.level-player.resolutionSkills[skillName].level, purchaseAmount);
  player.resolutionPoints -= purchaseAmount;
  player.resolutionSkills[skillName].level += purchaseAmount;
  if (currentMenu == "resolution") {
    displayResoluteSkillsMenu();
  }

  switch (skillName) {
    case 'weightLifting':
      updateWeightLiftingEffect();
      break;
    case 'bash':
      updateBashEffect();
      break;
    case 'tactician':
      updateTacticianEffect(purchaseAmount);
      break;
    case 'eagleEye':
      updateEagleEyeEffect();
      break;
    case 'featheredShot':
      updateFeatheredShotEffect();
      break;
    case 'volley':
      updateVolleyEffect();
      break;
    case 'timeWarp':
      updateTimeWarpEffect();
      break;
    case "memorize":
      updateMemorizeEffect();
      break;
    case "fireball":
      break;
    default:
      console.error("Unknown skill: " + skillName);
      break;
  }
}

function updateMemorizeEffect() {
  updateXPMulti();
}
function updateTimeWarpEffect() {
  updateTimeMulti();
}
function updateVolleyEffect() {
  updateAttackSpeed();
}
function updateFeatheredShotEffect() {
  updateCritMulti();
}
function updateEagleEyeEffect() {
  updateCritChance();
}
function updateTacticianEffect(level) {
  player.strength += level;
  player.intellect += level;
  player.agility += level;
  player.toughness += level;
  player.mysticism += level;
  if (currentMenu == "attributes") {
    updateAttributesMenu();
  }
}

function updateBashEffect() {
  updateEnemyAttackSpeed();
}
function updateWeightLiftingEffect() {
  updateDamage();
}

function levelUpSkill(skillName) {
  if (player.skillPoints == 0) {
    console.log("level out of points");
    return;
  }
  let purchaseAmount = Math.min(purchaseMulti, player.skillPoints);
  player.skillPoints -= purchaseAmount;
  updateSkillPointsDisplay();
  player.skills[skillName].level += purchaseAmount;
  if (currentMenu == "skills") {
    displaySkillsMenu();
  }
  switch (skillName) {
    case 'overpower':
      updateOverpowerEffect();
      break;
    case 'charge':
      updateChargeEffect();
      break;
    case 'shieldWall':
      updateShieldwallEffect();
      break;
    case 'cleave':
      break;
    case 'sharpness':
      updateSharpnessEffect();
      break;
    case "quickdraw":
      updateQuickdrawEffect();
      break;
    case "evasion":
      updateEvasionEffect();
      break;
    case 'explosiveShot':
      break;
    case 'collegiate':
      updateCollegiateEffect();
      break;
    case 'empower':
      updateEmpowerEffect();
      break;
    default:
      console.error("Unknown skill: " + skillName);
      break;
  }
}
// Reference to the skills button
const skillsScreenBtn = document.getElementById("skillsScreenBtn");

// Add event listener for the skills button
skillsScreenBtn.addEventListener("click", () => {
  displaySkillsMenu();
});

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
// Function to display the skills menu based on the class
function displaySkillsMenu() {
  let skillsContent = `<h2 id="skillPointsDisplay">Skill Points: ${player.skillPoints}</h2><div>`;
  for (let skill in player.skills) {
    if (player.skills[skill].unlockClass == player.currentClass) {
      let displayButtonText = ` disabled>Beat Floor ${player.skills[skill].unlockAt}`;
      let levelButtonText = " disabled>Locked";
      if (!player.skills[skill].locked) {
        displayButtonText = `>${capitalize(skill)}\nLevel ${player.skills[skill].level}`;
        levelButtonText = `>Level Up`;

      }
      skillsContent += `
      <div style = "display: flex; justify-content: center;">
      <button id="${skill}Display" style="width: 60vw; height: 10vh; white-space: pre-wrap" ${displayButtonText}</button>
      <button id="${skill}LevelUp" style="width: 20vw; height: 10vh; white-space: pre-wrap" onclick=levelUpSkill("${skill}")${levelButtonText}</button>
      </div>
      `;
    }
  }
  // Additional classes can be added here in the future

  skillsContent += "</div>";

  switchMenu(skillsContent, "skills");
}

function updateMirrorImageEffect() {
  updateEvasion();
  updateDamage();
}

function updateEmpowerEffect() {
  updateDamage();
}
function updateCollegiateEffect() {
  updateXPMulti();
}

function updateSharpnessEffect() {
  updateDamage();
}
function updateQuickdrawEffect() {
  updateAttackSpeed();
}
function updateEvasionEffect() {
  updateEvasion();
}

function updateOverpowerEffect() {
  // Implement the passive effect for Overpower based on the skill level
  updateDamage();
  // Fill in the details for the passive effect
}

function updateChargeEffect() {
  // Implement the passive effect for Cleave based on the skill level
  // Fill in the details for the passive effect
}

function updateShieldwallEffect() {
  // Implement the passive effect for Shieldwall based on the skill level
  updateDefense();
  // Fill in the details for the passive effect
}

function tryUnlockSkills() {
  if (player.level < 10) {
    skillsScreenBtn.textContent = "Reach Level 10";
    skillsScreenBtn.disabled = true;
  } else {
    skillsScreenBtn.textContent = "Skills";
    skillsScreenBtn.disabled = false;
  }
  for (let skill in player.skills) {
    if (player.skills[skill].unlockClass == player.currentClass && player.skills[skill].locked) {
      tryUnlockSkill(skill);
    }
  }
}

function tryUnlockSkill(skillName) {
  if (player.skills[skillName].unlockAt >= maxUnlockedLevel) {
    return;
  }
  player.skills[skillName].locked = false;
  if (currentMenu == "skills") {
    displaySkillsMenu();
  }
}

function updateStats() {
  cleaveMulti = (1-Math.exp(player.skills.cleave.level/-28));
  explosiveShotMulti = (1-Math.exp(player.skills.explosiveShot.level/-36));
  fireballMulti = 1+(1-Math.exp(player.resolutionSkills.fireball.level/-32));
  cleaveDamage = fireballMulti*(1+cleaveMulti + explosiveShotMulti);
  let cleaveThrough = (Math.floor(player.resolutionSkills.fireball.level/40)+1)*(1+(player.skills.cleave.level/6+player.skills.explosiveShot.level/7));
  const statsContent = `
  <div class="stats-container" style="line-height: 0.2;">
  ${settingsContent}
  <h2>Stats</h2>
  <p>Attack Speed: ${(player.attackSpeed / 1000).toFixed(2)} seconds</p>
  <p>Damage: ${player.damage}</p>
  <p>Health: ${player.maxHealth}</p>
  <p>Regen: ${player.regen}</p>
  <p>Regen Speed: ${(player.regenSpeed / 1000).toFixed(2)} seconds</p>
  <p>XP Multiplier: ${player.xpMulti.toFixed(2)}</p>
  <p>Level: ${player.level}</p>
  <p>Defense: ${player.defense}</p>
  <p>Cleave Damage: ${cleaveDamage*100}%</p>
  <p>Cleave Distance: ${Math.floor(cleaveThrough)} enemies</p>
  <p>Crit Chance: ${player.critChance}%</p>
  <p>Crit Multi: ${player.critMulti}x</p>
  <p>Evasion Chance: ${player.evasion}%</p>
  </div>
  `;


  // Update the bottom menu with the new stats content if the stats menu is active
  if (bottomMenu.innerHTML.includes("Stats")) {
    switchMenu(statsContent, "stats");
  }
}
const statsScreenBtn = document.getElementById("statsScreenBtn");

statsScreenBtn.addEventListener("click", () => {
  switchMenu(statsContent, "stats");
  updateStats();
});

resolutionScreenBtn.addEventListener("click", () => {
  switchMenu(resolutionScreenContent, "resolution");
  displayResoluteSkillsMenu();
});

function setMainStatDisplay(attribute) {
  // Reset all attribute displays first
  strengthDisplay = "Strength";
  intellectDisplay = "Intellect";
  agilityDisplay = "Agility";
  toughnessDisplay = "Toughness";
  mysticismDisplay = "Mysticism";

  // Set the selected attribute as primary and update the display
  switch (attribute) {
    case 'strength':
      strengthDisplay = "Strength (PRI)";
      player.primaryAttribute = "strength";
      break;
    case 'intellect':
      intellectDisplay = "Intellect (PRI)";
      player.primaryAttribute = "intellect";
      break;
    case 'agility':
      agilityDisplay = "Agility (PRI)";
      player.primaryAttribute = "agility";
      break;
    case 'toughness':
      toughnessDisplay = "Toughness (PRI)";
      player.primaryAttribute = "toughness";
      break;
    case 'mysticism':
      mysticismDisplay = "Mysticism (PRI)";
      player.primaryAttribute = "mysticism";
      break;
    default:
      console.error('Unknown attribute: ' + attribute);
      return;
    }
    updateAttributesMenu(); // Update the attributes display
  }

  function getPrimaryAttributeValue() {
    if (!player.primaryAttribute) {
      console.warn("Primary attribute is not set.");
      return 0; // Return 0 if no primary attribute is set
    }
    return player[player.primaryAttribute];
  }
  function selectCharacter(character) {

    switch (character) {
    case 'warrior':
      player.strength += 5; // Example stat boost
      player.currentClass = "warrior";
      setMainStatDisplay("strength");
      break;
    case 'archer':
      player.agility += 5; // Example stat boost
      player.currentClass = "archer";
      setMainStatDisplay("agility");
      break;
    case 'wizard':
      player.intellect += 5; // Example stat boost
      setMainStatDisplay("intellect");
      player.currentClass = "wizard";
      break;
    case 'druid':
      player.mysticism += 5; // Example stat boost
      setMainStatDisplay("mysticism");
      player.currentClass = "druid";
      break;
    default:
      console.error('Unknown character: ' + character);

    }

    // Hide the character selection and show the game
    document.getElementById('characterSelection').style.display = 'none';
    document.getElementById('topBar').style.display = 'flex';
    document.getElementById('battleArea').style.display = 'block';
    document.getElementById('levelDisplayRow').style.display = 'flex';
    document.getElementById('xpBarContainer').style.display = 'flex';
    document.getElementById('bottomMenu').style.display = 'block';
    updateStrength();
    updateIntellect();
    updateAgility();
    updateToughness();
    updateMysticism();
    switchMenu(attributesContent, "attributes");
    updateAttributesMenu();
    // Start the game
    startCombat();
    startSwordFills();
    updateHealthBars();
    changeEnemyLevel(currentEnemyLevel);
    tryUnlockSkills();
    tryUnlockResolutionSkills();
    unlockTractionMenu();
    if (!saveInterval) {
      saveLoop();
    }
  }
  function increaseAttribute(attribute) {
    if (player.attributePoints > 0) {
      player[attribute]++;
      player.attributePoints--;
      updateAttributesMenu(); // Refresh the attributes display
    }
  }
  function increaseAttribute(attribute) {
    if (player.attributePoints > 0) {
      let multi = Math.min(purchaseMulti, player.attributePoints);

      player.attributePoints -= multi; // Deduct 1 attribute point
      switch (attribute) {
      case 'strength':
        player.strength += multi;
        updateStrength();
        break;
      case 'intellect':
        player.intellect += multi;
        updateIntellect();
        break;
      case 'agility':
        player.agility += multi;
        updateAgility();
        break;
      case 'toughness':
        player.toughness += multi;
        updateToughness();
        break;
      case 'mysticism':
        player.mysticism += multi;
        updateMysticism();
        break;
      default:
        console.error('Unknown attribute: ' + attribute);
      }
      updateAttributesMenu(); // Update the attribute points display
    }
  }
  function updateAttributes() {
    updateStrength();
    updateIntellect();
    updateAgility();
    updateToughness();
    updateMysticism();
  }
  function updateDamage() {
    let val = getPrimaryAttributeValue();
    if (player.primaryAttribute == "agility") {
      val *= .5;

    } else if (player.primaryAttribute == "intellect") {
      val *= .45;
    } else if (player.primaryAttribute == "strength") {
      val *= 1.2;
    }
    let base = 3*(val+1);
    let ASMulti = 1;
    if (player.attackSpeed < 10) {
      ASMulti = Math.sqrt(5/(player.attackSpeed/player.timeMulti))
    }

    let opMulti = 1+(0.25 * player.skills.overpower.level);
    let weightMulti = 1+(0.15* player.resolutionSkills.weightLifting.level);
    let sharpnessMulti = 1 + (0.15*player.skills.sharpness.level);
    let empowerMulti = 1+(1.2*player.skills.empower.level);
    let cleaveMulti = 1+(0.1*player.skills.cleave.level)
    player.damage = Math.floor(base*ASMulti*opMulti*weightMulti*sharpnessMulti*empowerMulti);
  }
  function updateEvasion() {
    let evasionVal = 100*(1-Math.exp(player.skills.evasion.level/-18));
    let mirrorImageVal = 100*(1-(1/(1+(player.skills.mirrorImage.level/3)/10)));
    player.evasion = evasionVal+mirrorImageVal;
  }
  function updateTimeMulti() {
    timeMulti = 1+3*(1-Math.exp(player.resolutionSkills.timeWarp.level/-40))
  }
  function updateMaxHealth() {
    let base = 50;
    if (player.currentClass == "archer") {
      base = 40;
    } else if (player.currentClass == "wizard") {
      base = 30;
    }
    player.maxHealth = Math.floor(base * (player.toughness/4+1)*Math.pow(1.007, player.strength)*(1+(0.5*player.skills.shieldWall.level)));
    updateHealthBars();
  }
  function updateAttackSpeed() {
    let base = Math.exp(-0.02*player.agility);
    let quickdrawMulti = Math.exp(-0.02*player.skills.quickdraw.level);
    let volleyMulti = Math.exp(-0.01* player.resolutionSkills.volley.level);
    let mirrorMulti = Math.exp(-0.04*player.skills.mirrorImage.level);
    player.attackSpeed = 2000 * base*quickdrawMulti*volleyMulti*mirrorMulti;
  }
  function updateCritChance() {
    let val = player.traction.archer.skills.bullseye.level + 80*(1-Math.exp(player.resolutionSkills.eagleEye.level/-30))
    player.critChance = val;
  }
  function updateCritMulti() {
    let val = 2+(player.resolutionSkills.featheredShot.level/4);
    val *= (1+player.traction.archer.skills.bullseye.level/2);
    player.critMulti = val;
  }
  function updateXPMulti() {
    let base = 1+(0.2*player.intellect);
    let collMulti = 1+(0.2*player.skills.collegiate.level);
    let memorizeMulti = 1+(0.2*player.resolutionSkills.memorize.level);
    player.xpMulti = base*collMulti*memorizeMulti;
  }
  function updateRegen() {
    player.regen = player.mysticism;
  }
  function updateRegenSpeed() {
    player.regenSpeed = 1800 * (0.2+0.8*Math.exp(-0.02*player.intellect));
    stopRegen();
    startPlayerRegen();
  }
  let shieldWallMulti = (0.1+0.9*Math.exp(-0.1*player.skills.shieldWall.level));
  function updateDefense() {
    player.defense = shieldWallMulti;
  }
  function updateStrength() {
    updateMaxHealth();
    updateDamage();
  }
  function updateAgility() {
    updateAttackSpeed();
    updateDamage();
  }
  function updateIntellect() {
    updateXPMulti();
    updateRegenSpeed();
    updateDamage();
  }
  function updateToughness() {
    updateMaxHealth();
    updateDamage();
  }
  function updateMysticism() {
    updateRegen();
    updateDamage();
  }
  function updateAttributesMenu() {
    if (currentMenu != "attributes") {
      return;
    }
    document.getElementById("playerLevel").textContent = `Level: ${player.level}`
    document.getElementById("playerStrength").textContent = player.strength;
    document.getElementById("strengthDisplay").textContent = strengthDisplay;
    document.getElementById("playerIntellect").textContent = player.intellect;
    document.getElementById("intellectDisplay").textContent = intellectDisplay;
    document.getElementById("playerAgility").textContent = player.agility;
    document.getElementById("agilityDisplay").textContent = agilityDisplay;
    document.getElementById("playerToughness").textContent = player.toughness;
    document.getElementById("toughnessDisplay").textContent = toughnessDisplay;
    document.getElementById("playerMysticism").textContent = player.mysticism;
    document.getElementById("mysticismDisplay").textContent = mysticismDisplay;
    document.getElementById("attributePoints").textContent = `Attribute Points: ${player.attributePoints}`;
    document.getElementById("purchaseMultiBtn").textContent = `${purchaseMulti}x`
  }


  function stopRegen() {
    clearInterval(playerRegenInterval);
    clearInterval(enemyRegenInterval);
  }
  const settingsContent = `
  <h2>Settings</h2>
  <div id="resetButtonDiv">
  <button style="width: 35vw;" id="resetHeroBtn" onClick="softResetGame()">Reset Hero</button>
  <button style="width: 35vw;" id="hardResetBtn" onClick="hardResetGame()">Hard Reset</button>
  </div>
  `;
  function hardResetGame() {
    const popupContent = `
    <div id="popup" style="position: fixed; top: 20%; left: 50%; transform: translate(-50%, -20%); background: #444; border: 0.5vw solid black; padding: 20px; border-radius: 10px; color: white; text-align: center;">
    <h1>Are you sure?</h1>
    <div>
    <button style="border: 0.5vh solid black; border-radius: 3vw; background-color: #8d8; color: black" id="hardResetConfirm">Yes</button>
    <button style="border: 0.5vh solid black; border-radius: 3vw; background-color: #d88; color: black" id="hardResetCancel">No</button>
    </div>
    </div>
    `
    document.body.insertAdjacentHTML('beforeend', popupContent);
    document.getElementById("hardResetCancel").addEventListener('click', function() {
      document.getElementById("popup").remove();
    });
    document.getElementById("hardResetConfirm").addEventListener('click', function() {

      // Clear all saved data from localStorage
      localStorage.removeItem('gameState');

      // Reload the web page
      location.reload();

      console.log('All save data cleared. Page reloaded.');
    });
  }
  function softResetGame() {
    const popupContent = `
    <div id="popup" style="position: fixed; top: 20%; left: 50%; transform: translate(-50%, -20%); background: #444; border: 0.5vw solid black; padding: 20px; border-radius: 10px; color: white; text-align: center;">
    <h1>Are you sure?</h1>
    <div>
    <button style="border: 0.5vh solid black; border-radius: 3vw; background-color: #8d8; color: black" id="softResetConfirm">Yes</button>
    <button style="border: 0.5vh solid black; border-radius: 3vw; background-color: #d88; color: black" id="softResetCancel">No</button>
    </div>
    </div>
    `
    document.body.insertAdjacentHTML('beforeend', popupContent);
    document.getElementById("softResetCancel").addEventListener('click', function() {
      document.getElementById("popup").remove();
    });
    document.getElementById("softResetConfirm").addEventListener('click', function() {
      document.getElementById("popup").remove();
      // Clear all saved data from localStorage
      buildHero(0);

    });
  }
  function updateXPBar() {
    const xpPercentage = (player.xp / player.maxXP) * 100;
    const roundedXP = Math.floor(xpPercentage);
    document.getElementById("playerXPBar").style.width = xpPercentage + '%';
    document.getElementById("playerXPText").textContent = `${roundedXP}%`;
  }
  function levelUp() {
    if (player.xp < player.maxXP || player.currentClass == "none") {
      return;
    }
    player.xp = player.xp - player.maxXP; // Carry over excess XP
    player.level++; // Increase player level
    player.maxXP = Math.floor(player.maxXP * 1.4); // Increase XP needed for next level
    player.attributePoints += 3+player.traction[player.currentClass].skills.attribution.level; // Give 3 attribute points to spend
    if (player.level >= 10) {
      let skillfulPoints = 0;
      if (player.traction[player.currentClass].skills.hasOwnProperty("skillful")) {
        skillfulPoints = player.traction[player.currentClass].skills.skillful.level;
      }
      player.skillPoints += (1+skillfulPoints);
      updateSkillPointsDisplay();
    }
    updateAttributesMenu();
    if (player.xp >= player.maxXP) {
      levelUp();
    }
    tryUnlockSkills();

    if (maxUnlockedLevel > 30) {
      player.resolutionPoints++;
      if (currentMenu == "resolution") {
        displayResoluteSkillsMenu();
      }
    }
    // Optionally, notify the player of their new level and points
    saveGameState();
  }

  function updateSkillPointsDisplay() {
    if (currentMenu == "skills") {
      document.getElementById("skillPointsDisplay").textContent = `Skill Points: ${player.skillPoints}`
    }
  }
  function updateEnemySwordFill(progress) {
    const swordFill = document.getElementById('enemySwordFill');
    swordFill.style.height = progress + '%'; // Progress ranges from 0 to 100
  }
  let playerRegenInterval;
  let enemyRegenInterval;

  // Function to start healing the player
  function startPlayerRegen() {
    // Clear any existing regen interval to avoid multiple intervals
    clearInterval(playerRegenInterval);
    if (player.regenSpeed == 0) {
      return;
    }
    // Start a new regen interval
    playerRegenInterval = setInterval(() => {
      if (player.health < player.maxHealth) {
        player.health = Math.floor(Math.min(player.maxHealth, player.health + player.regen));
        updateHealthBars(); // Update the UI
      }
    },
      player.regenSpeed/player.timeMulti);
  }

  // Function to start healing the enemy
  function startEnemyRegen() {
    // Clear any existing regen interval to avoid multiple intervals
    clearInterval(enemyRegenInterval);
    if (enemy.regenSpeed == 0) {
      return;
    }
    // Start a new regen interval
    enemyRegenInterval = setInterval(() => {
      if (enemy.health < enemy.maxHealth) {
        enemy.health = Math.floor(Math.min(enemy.maxHealth, enemy.health + enemy.regen));
        updateHealthBars(); // Update the UI
      }
    },
      enemy.regenSpeed/player.timeMulti);
  }
  function updatePlayerSwordFill(progress) {
    const swordFill = document.getElementById('playerSwordFill');
    swordFill.style.height = progress + '%'; // Progress ranges from 0 to 100
  }

  // Variables to track time
  let playerAttackProgress = 0;
  let enemyAttackProgress = 0;

  // Function to update the sword fills based on time until next attack
  function updateSwordFills() {
    // Calculate progress as percentage of time passed relative to attack speed
    playerAttackProgress += 10*player.timeMulti; // Progress per millisecond
    enemyAttackProgress += 10*player.timeMulti;
    // Cap the progress at 100%
    if (playerAttackProgress >= player.attackSpeed) {
      playerAttackProgress = 0; // Reset after attack
      playerAttack(); // Trigger player attack
    }
    if (enemyAttackProgress >= enemy.attackSpeed) {
      enemyAttackProgress = 0; // Reset after attack
      enemyAttack(); // Trigger enemy attack
    }

    // Update the sword fills
    updatePlayerSwordFill(playerAttackProgress/player.attackSpeed*100);
    updateEnemySwordFill(enemyAttackProgress/enemy.attackSpeed*100);
  }

  let swordFillInterval;
  // Function to start the filling intervals
  function startSwordFills() {
    // Update the sword fills every 100ms for smooth animation
    if (swordFillInterval) {
      clearInterval(swordFillInterval);
    }
    swordFillInterval = setInterval(updateSwordFills, 10);
  }

  // Call the function to start filling the swords




  // Functions for switching menus
  function switchMenu(content, name) {
    bottomMenu.innerHTML = content;
    currentMenu = name;
  }

  // Event listeners for menu buttons
  attributesScreenBtn.addEventListener("click", () => {
    switchMenu(attributesContent, "attributes");
    updateAttributesMenu();
  });

  autoProgressBtn.addEventListener("click", () => {
    autoProgress = !autoProgress;
    autoProgressCheckbox.checked = autoProgress;
  });
  // Default state: Show attributes content when game starts
  switchMenu(attributesContent, "attributes");

  // Function to update health bars and text
  function updateHealthBars() {
    let val = (100 * (player.health/player.maxHealth))
    if (val > 100) {
      val = 100;
    }
    playerHealthBar.style.width = val + '%';
    playerHealthText.textContent = `Your Health: ${val.toFixed(1)}%`;
    let enemyVal = (enemy.health / enemy.baseHealth) * 100;
    enemyHealthBar.style.width = enemyVal + '%';
    enemyHealthText.textContent = `Enemy Health: ${enemyVal.toFixed(1)}%`;
  }

  // Function to handle player attacking the enemy
  function playerAttack() {
    let chargeMulti = 1;
    if (player.currentClass == "warrior") {
      if (player.skills.charge.level > 0 && player.attacksThisFight%7 == 0) {
        chargeMulti = (1+ player.skills.charge.level)*(1+(Math.floor(player.attacksThisFight/7)));
      }
    }
    let critMulti = 1;
    if (Math.random()*100 < player.critChance) {
      critMulti = player.critMulti;
    }
    magicMissileDamageMulti = 1;
    magicMissileAttackCounter += (1+(player.skills.magicMissile.level/20));
    if (magicMissileAttackCounter >= 10) {
      magicMissileAttackCounter = 0;
      magicMissileDamageMulti = 1+(player.skills.magicMissile.level*1.5);
    }

    player.attacksThisFight++;
    let damage = Math.floor(critMulti*player.damage*chargeMulti*magicMissileDamageMulti);
    cleaveMulti = (1-Math.exp(player.skills.cleave.level/-8));
    explosiveShotMulti = (1-Math.exp(player.skills.explosiveShot.level/-26));
    fireballMulti = 1+(1-Math.exp(player.resolutionSkills.fireball.level/-20));
    cleaveDamage = fireballMulti*(1+cleaveMulti + explosiveShotMulti)*damage;

    let cleaveThrough = (Math.ceil(player.resolutionSkills.fireball.level/40)+1)*(player.skills.cleave.level/4+player.skills.explosiveShot.level/7);
    if (player.skills.cleave.level == 0 && player.skills.explosiveShot.level == 0) {
      cleaveThrough = Math.ceil(player.resolutionSkills.fireball.level/40)
    }
    
    if (cleaveThrough >= 1) {
      for (let i = 0; i < cleaveThrough; i++) {
        if (cleaveThroughDamage.length > i) {
          cleaveThroughDamage[i] += cleaveDamage
        } else {
          cleaveThroughDamage[i] = cleaveDamage;
        }
      }
    }
    if (enemy.health > 0) {
      enemy.health -= damage; // Player attacks based on strength
      if (enemy.health <= 0) {
        enemyDefeated();
        // Schedule next player attack
      }
    }
    updateHealthBars();
  }

  // Function to handle enemy attacking the player
  function enemyAttack() {
    if (player.health > 0) {
      let evasionVal = Math.random()*100;
      if (Math.random()*100 < player.evasion) {
        return;
      }
      player.health -= enemy.attack*player.defense; // Enemy attacks based on attack stat
      player.health = Math.floor(player.health);
      if (player.health <= 0) {
        playerDefeated(); // Optional: handle what happens when the player loses
      }
    }
    updateHealthBars();
  }

  // Function to start combat loop
  function startCombat() {
    resetPlayerHealth();
    resetEnemyHealth();
    updateHealthBars();
    playerAttackProgress = 0;
    enemyAttackProgress = 0;
    stopRegen();
    updateAttributes();
    updateCritChance();
    updateCritMulti();
    updateEvasion();
    startPlayerRegen();
    startEnemyRegen();
    if (cleaveThroughDamage.length > 0 && enemy.health > 0) {
      nextDamage = cleaveThroughDamage.shift();

      enemy.health -= Math.floor(nextDamage);
      if (enemy.health <= 0) {
        enemyDefeated();
      }
    }
    player.attacksThisFight = 0;
    // Start enemy's attack
  }

  // Function to reset player health
  function resetPlayerHealth() {
    player.health = player.maxHealth;
  }
  function resetEnemyHealth() {
    enemy.health = enemy.baseHealth;
  }

  // Function to handle when the enemy is defeated
  function enemyDefeated() {
    player.xp += enemy.xp*player.xpMulti; // Add enemy XP to player XP
    if (player.xp >= player.maxXP) {
      levelUp(); // Level up if XP threshold is reached
    }
    if (currentEnemyLevel == maxUnlockedLevel) {
      if (currentEnemyLevel >= 29) {
        tryUnlockResolutionSkills();
      }
    }

    maxUnlockedLevel = Math.max(maxUnlockedLevel, currentEnemyLevel+1);
    tryUnlockSkills();
    // Unlock higher levels
    updateXPBar(); // Update the XP bar display
    if (autoProgress) {
      currentEnemyLevel++;
      changeEnemyLevel(currentEnemyLevel); // Reset enemy's health and update display// Increase enemy level
    }
    unlockResolutionSkillsMenu();
    unlockTractionMenu();
    resetPlayerHealth();
    saveGameState();
    startCombat(); // Restart combat
  }

  // Function to handle what happens when the player loses
  function playerDefeated() {
    resetPlayerHealth();
    resetEnemyHealth();
    currentEnemyLevel--;
    changeEnemyLevel(currentEnemyLevel);
    if (autoProgress) {
      autoProgress = false;
      autoProgressCheckbox.checked = false;
    }
    player.attacksThisFight = 0;
  }


  function createTalentTree() {
    // Clear the bottomMenu first
    let giveUpText = ">Really! Give Up!";
    if (maxUnlockedLevel <= 100) {
      giveUpText = "disabled>Beat Depths 30";

    }
    currentMenu = "traction";
    const bottomMenu = document.getElementById('bottomMenu');
    bottomMenu.innerHTML = '';

    // HTML structure for the talent tree
    const talentTreeHTML = `
    <div id="talentTreeContainer" style="
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    overflow: scroll;">

    <!-- Base Talent Button -->
    <button id="baseTalent" style="
    width: 60vw;
    height: 30vw;
    background-color: #555;
    color: white;
    border-radius: 10px;
    cursor: pointer;
    font-size: 2vh;
    margin: 20px;">
    Traction Points
    </button>

    <!-- Branch Container -->
    <div id="branchContainer" style="
    position: relative;
    width: 150%;
    height: 150%;
    display: flex;
    justify-content: space-around;
    flex-wrap: wrap;
    overflow-x: scroll;
    overflow-y: scroll;">

    <!-- Branch Buttons -->
    <button id="warrior-talent-menu-btn" class="talent-button" style="
    width: 30vw;
    height: 15vw;
    background-color: ${strengthColor};
    color: white;
    border-radius: 3vh;
    border: 0.5vw solid black;
    cursor: pointer;
    position: absolute;
    left: 15%; top: 10%;">
    Warrior<br>${player.traction.warrior.points}
    </button>

    <button id="archer-talent-menu-btn" class="talent-button" style="
    width: 30vw;
    height: 15vw;
    background-color: ${agilityColor};
    color: white;
    border-radius: 3vh;
    border: 0.5vw solid black;
    cursor: pointer;
    position: absolute;
    left: 37%; top: 10%;">
    Archer<br>${player.traction.archer.points}
    </button>

    <button id="wizard-talent-menu-btn" class="talent-button" style="
    width: 30vw;
    height: 15vw;
    background-color: ${intellectColor};
    color: white;
    border-radius: 3vh;
    border: 0.5vw solid black;
    cursor: pointer;
    position: absolute;
    left: 59%; top: 10%;">
    Wizard<br>${player.traction.wizard.points}
    </button>

    <button id="druid-talent-menu-btn" class="talent-button" style="
    width: 30vw;
    height: 15vw;
    background-color: ${mysticismColor};
    color: white;
    border-radius: 3vh;
    border: 0.5vw solid black;
    cursor: pointer;
    position: absolute;
    left: 81%; top: 10%;">
    Druid<br>${player.traction.druid.points}
    </button>

    <button id="vanguard-talent-menu-btn" class="talent-button" style="
    width: 30vw;
    height: 15vw;
    background-color: ${toughnessColor};
    color: white;
    border-radius: 3vh;
    border: 0.5vw solid black;
    cursor: pointer;
    position: absolute;
    left: 103%; top: 10%;">
    Beat Hell 30
    </button>
    </div>
    <button id="tractionResetBtn" style="
    width: 60vw;
    height: 30vw;
    background-color: #555;
    color: white;
    border-radius: 10px;
    cursor: pointer;
    font-size: 4vh;
    margin: 20px;"
    onclick="tractionReset()"
    ${giveUpText}
    </button>
    </div>
    `;

    // Inject the talent tree HTML into the bottomMenu
    bottomMenu.innerHTML = talentTreeHTML;

    // Make the bottomMenu visible
    bottomMenu.style.display = 'flex';

    // Add click event listeners for each class to open their talent trees
    document.getElementById('warrior-talent-menu-btn').addEventListener('click', () => displayClassTalents('warrior'));
    document.getElementById('archer-talent-menu-btn').addEventListener('click', () => displayClassTalents('archer'));
    document.getElementById('wizard-talent-menu-btn').addEventListener('click', () => displayClassTalents('wizard'));
    document.getElementById('druid-talent-menu-btn').addEventListener('click', () => displayClassTalents('druid'));
    document.getElementById('vanguard-talent-menu-btn').addEventListener('click', () => displayClassTalents('vanguard'));
  }

  // Function to display class-specific talents
  function displayClassTalents(className) {


    let classTalentsContent = `<div style="display: flex;"><h2 id="classTalentPointsDisplay">${capitalize(className)} <br>Points: ${player.traction[className].points}</h2></div><div>`;
    let classTalents = getClassTalents(className); // Function to fetch talents based on the class
    for (let talent of Object.keys(classTalents)) {
      let displayButtonText = ` disabled> ${player.traction[className].skills[talent].unlockText}`;
      let levelButtonText = " disabled>Locked";
      if (!player.traction[className].skills[talent].locked) {
        displayButtonText = `>${capitalize(talent)}\n${player.traction[className].skills[talent].level}/${player.traction[className].skills[talent].max}`;
        levelButtonText = `>Level Up<br>Cost: ${player.traction[className].skills[talent].cost}`;
      }
      classTalentsContent += `
      <div style="display: flex; justify-content: center;">
      <button id="${talent}Display" style="width: 60vw; height: 10vh; white-space: pre-wrap" ${displayButtonText}</button>
      <button id="${talent}LevelUp" style="width: 20vw; height: 10vh; white-space: pre-wrap" onclick="levelUpTractionSkill('${talent}', '${className}')" ${levelButtonText}</button>
      </div>
      `;
    }

    classTalentsContent += `
    <div style="display: flex; justify-content: center; margin-top: 20px;">
    <button id="backButton" style="width: 80vw; height: 10vh;" onclick="createTalentTree()">Back</button>
    </div>
    `;

    // Update the bottomMenu with the class talent menu
    const bottomMenu = document.getElementById('bottomMenu');
    bottomMenu.innerHTML = classTalentsContent;
    bottomMenu.style.display = 'flex';
  }

  // Dummy function to get talents for each class (You should populate this based on your game logic)
  function getClassTalents(className) {
    // Example talents for the Warrior class
    return player.traction[className].skills;
  }

  // Function to level up a talent
  function levelUpTalent(talentName, className) {
    alert(`Leveling up ${talentName} for ${className}`);
    // Your logic for leveling up the talent
  }

  // Utility function to capitalize string
  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // Initialize the main talent tree when the traction skills button is clicked
  document.getElementById('tractionSkillsBtn').addEventListener('click', createTalentTree);

  // Function to switch to the talent tree when the traction screen is clicked

  // Optional: Reset the combat if the player changes the enemy level
  prevEnemyBtn.addEventListener("click", () => {
    if (currentEnemyLevel > 1) {
      currentEnemyLevel--;
      changeEnemyLevel(currentEnemyLevel);
      startCombat(); // Restart combat with new level
    }
  });

  nextEnemyBtn.addEventListener("click",
    () => {
      if (currentEnemyLevel < maxUnlockedLevel) {
        currentEnemyLevel++;
        changeEnemyLevel(currentEnemyLevel);
        startCombat(); // Restart combat with new level
      }
    });

  function getFloorDisplay(floor) {
    if (floor <= 70) {
      return `Floor ${floor}`;
    }
    if (floor <= 240) {
      return `Depths ${floor-70}`;
    }
    return `Hell ${floor-240}`;
  }
  function updateEnemyAttackSpeed() {
    enemy.attackSpeed = 2005 *(Math.exp(player.resolutionSkills.bash.level/90))
  }
  // Function to change enemy level and reset health
  function changeEnemyLevel(level) {
    if (level < 0) {
      level = 1;
      currentEnemyLevel = 1;
    }
    enemy.baseHealth = Math.floor(30 + level*10 * Math.pow(1.32, level/2)); // Example health scaling
    enemy.health = enemy.baseHealth;
    enemy.attack = Math.floor(10 + Math.pow(level, 1.2)); // Optionally scale enemy attack
    enemy.xp = 10 * Math.pow(1.35,
      level-1);
    if (currentEnemyLevel > 70) {
      enemy.attack = Math.pow(enemy.attack, 2.2);
      enemy.xp *= 3;
      enemy.baseHealth = Math.pow(enemy.baseHealth, 1.25);
      enemy.health = enemy.baseHealth;
      enemyLevelText.style.color = '#ffbbbb';
    }
    if (currentEnemyLevel > 240) {
      enemy.xp *= 3;
      enemy.attack = Math.pow(enemy.attack, 2.2);
      enemy.baseHealth = Math.pow(enemy.baseHealth, 1.3);
      enemy.health = enemy.baseHealth;
      enemyLevelText.style.color = '#ff0000';
    } else {
      enemyLevelText.style.color = "#ffffff";
    }
    enemyLevelText.textContent = getFloorDisplay(level);
    updateEnemyAttackSpeed();

    updateHealthBars();
  }
  loadGameState();

  // Initialize combat when the page loads