//load?
const doLoad = true;
const maxOfflineTime = 3000;
const offlineXPMulti = 1/6;
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
    lastSaveTime: Date.now()
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
    unlockedClasses = gameState.unlockedClasses;

    // Calculate time passed since the last save
    const lastSaveTime = gameState.lastSaveTime || Date.now();
    const currentTime = Date.now();
    const timePassed = currentTime - lastSaveTime; // Time passed in milliseconds
    const timePassedInSeconds = Math.max(1, Math.min(maxOfflineTime, timePassed / 1000));
    // Convert time passed to minutes and seconds
    const minutesPassed = Math.floor(timePassedInSeconds / 60);
    const secondsPassed = Math.floor(timePassedInSeconds % 60);

    // Calculate the number of attacks the player could have made in that time
    const attackInterval = player.attackSpeed; // Attack speed in seconds
    const attacksInTimePassed = Math.floor(timePassed / attackInterval);
    changeEnemyLevel(currentEnemyLevel);
    // Calculate the XP gain based on the enemy's XP value
    updateDamage();
    killsInTimePassed = attacksInTimePassed/(enemy.baseHealth/player.damage);
    const xpGain = attacksInTimePassed * enemy.xp * player.xpMulti*offlineXPMulti;

    // Calculate how many levels were gained
    let levelsGained = 0;
    let prevXP = player.xp;
    let prevLevel = player.level;
    player.xp += xpGain;
    levelUp(); // Handle leveling up and distributing points
    console.log(`xpGain: ${xpGain}`);
    console.log(`PrevXP: ${prevXP}`);
    console.log(`NewXP: ${player.xp}`);
    console.log(`prevLevel: ${prevLevel}`);
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
      if (player.currentClass !== "none") {
        document.getElementById('characterSelection').style.display = 'none';
        document.getElementById('topBar').style.display = 'flex';
        document.getElementById('battleArea').style.display = 'block';
        document.getElementById('levelDisplayRow').style.display = 'flex';
        document.getElementById('xpBarContainer').style.display = 'flex';
        document.getElementById('bottomMenu').style.display = 'block';
      }

      // Update any necessary UI elements after loading
      updateAttributesMenu();
      updateHealthBars();
      updateXPBar();
      tryUnlockSkills();
      tryUnlockResolutionSkills();
      unlockResolutionSkillsMenu();

      // Start the necessary game functions after closing the popup

      startSwordFills();
      startCombat();
    });

    console.log(`Game state loaded! Time passed: ${minutesPassed}m ${secondsPassed}s. XP gained: ${xpPercentageGained}%. Levels gained: ${levelsGained}`);
  } else {
    console.log('No saved game state found.');
  }
  if (totalReincarnations == 0 && player.currentClass == "none") {
    return;
  }
  saveLoop();
}

// Screen elements
const attributesScreenBtn = document.getElementById("attributesScreenBtn");
const settingsScreenBtn = document.getElementById("settingsScreenBtn");
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
let unlockedClasses = ["warrior"];
let cleaveThroughDamage = []

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
  strength: 0,
  intellect: 0,
  agility: 0,
  toughness: 0,
  mysticism: 0,
  firstAttack: false,
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
    manaShield: {
      level: 0,
      locked: true,
      unlockAt: 30,
      unlockClass: "wizard"
    },
    memorize: {
      level: 0,
      locked: true,
      unlockAt: 50,
      unlockClass: "wizard"
    },
    fireball: {
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
  strength: 0,
  intellect: 0,
  agility: 0,
  toughness: 0,
  mysticism: 0,
  firstAttack: false,
  skills: {
    overpower: {
      level: 0,
      locked: true,
      unlockAt: 0,
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
      unlockAt: 0,
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
    manaShield: {
      level: 0,
      locked: true,
      unlockAt: 30,
      unlockClass: "wizard"
    },
    memorize: {
      level: 0,
      locked: true,
      unlockAt: 50,
      unlockClass: "wizard"
    },
    fireball: {
      level: 0,
      locked: true,
      unlockAt: 70,
      unlockClass: "wizard"
    }
  }
};


// Method to reset the player back to initial values
function buildHero() {
  // Reset player properties based on the initial configuration
  oldResolutionSkills = player.resolutionSkills;
  Object.assign(player, JSON.parse(JSON.stringify(heroInitialConfig)));
  player.resolutionSkills = oldResolutionSkills;
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
  changeEnemyLevel(1);
  totalReincarnations++;
  tryUnlockClasses();
  maxUnlockedLevel = 1;
  currentEnemyLevel = 1;
  tryUnlockSkills();
  tryUnlockResolutionSkills();

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
    return;
  }
  document.getElementById("archer-card").style.backgroundColor = agilityColor;
  archerSelectBtn.textContent = "Select";
  archerSelectBtn.disabled = false;
  archerDescription.textContent = "Archer";
  if (totalReincarnations < 6) {}
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
  <button id="giveUpButton" style="width: 80vw; height: 10vh;" onclick="buildHero()" >Give Up!</button>
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
  if (player.resolutionSkills[skillName].unlockAt > currentEnemyLevel+1) {
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
function levelUpResoluteSkill(skillName) {
  if (player.resolutionPoints == 0) {
    console.log("level out of points");
    return;
  }
  player.resolutionPoints--;
  player.resolutionSkills[skillName].level++;
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
    default:
      console.error("Unknown skill: " + skillName);
      break;
  }
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
function updateTacticianEffect() {
  player.strength++;
  player.intellect++;
  player.agility++;
  player.toughness++;
  player.mysticism++;
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
  player.skillPoints--;
  updateSkillPointsDisplay();
  player.skills[skillName].level++;
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
    case 'sharpness':
      updateSharpnessEffect();
      break;
    case "quickdraw":
      updateQuickdrawEffect();
      break;
    case "evasion":
      updateEvasionEffect();
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
  <p>Defense: ${player.defense}</p>
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
    tryUnlockSkills();
    tryUnlockResolutionSkills();
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
      player.currentClass = "wizard";
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
      player.attributePoints--; // Deduct 1 attribute point
      switch (attribute) {
      case 'strength':
        player.strength++;
        updateStrength();
        break;
      case 'intellect':
        player.intellect++;
        updateIntellect();
        break;
      case 'agility':
        player.agility++;
        updateAgility();
        break;
      case 'toughness':
        player.toughness++;
        updateToughness();
        break;
      case 'mysticism':
        player.mysticism++;
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
      val *= .7;
    } else if (player.primaryAttribute == "intellect") {
      val *= .5;
    }
    let base = 3*(val+1);
    let ASMulti = 1;
    if (player.attackSpeed < 10) {
      ASMulti = 10/player.attackSpeed;
    }
    let opMulti = 1+(0.2 * player.skills.overpower.level);
    let weightMulti = 1+(0.1* player.resolutionSkills.weightLifting.level);
    let sharpnessMulti = 1 + (0.2*player.skills.sharpness.level);
    player.damage = Math.floor(base*ASMulti*opMulti*weightMulti*sharpnessMulti);
  }
  function updateEvasion() {
    let val = 100*(1-Math.exp(player.skills.evasion.level/-40))
    player.evasion = val;
  }
  function updateMaxHealth() {
    player.maxHealth = Math.floor(50 * (player.toughness/4+1)*Math.pow(1.01, player.strength));
    updateHealthBars();
  }
  function updateAttackSpeed() {
    let base = Math.exp(-0.03*player.agility);
    let quickdrawMulti = Math.exp(-0.03*player.skills.quickdraw.level);
    let volleyMulti = Math.exp(-0.03* player.resolutionSkills.volley.level);
    player.attackSpeed = 2000 * base*quickdrawMulti*volleyMulti;
  }
  function updateCritChance() {
    let val = 100*(1-Math.exp(player.resolutionSkills.eagleEye.level/-40))
    player.critChance = val;
  }
  function updateCritMulti() {
    let val = 2+(player.resolutionSkills.featheredShot.level/4);
    player.critMulti = val;
  }
  function updateXPMulti() {
    let base = 1+(0.2*player.intellect);
    player.xpMulti = base;
  }
  function updateRegen() {
    player.regen = player.mysticism*1.4;
  }
  function updateRegenSpeed() {
    player.regenSpeed = 1800 * Math.pow(0.98, player.intellect);
    stopRegen();
    startPlayerRegen();
  }
  function updateDefense() {
    player.defense = (0.1+0.9*Math.exp(-0.2*player.skills.shieldWall.level));
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
  }
  
  
  function stopRegen() {
    clearInterval(playerRegenInterval);
    clearInterval(enemyRegenInterval);
  }
  const settingsContent = `
  <h2>Settings</h2>
  <button id="resetHeroBtn">Reset Hero</button>
  <button id="hardResetBtn" onClick="hardResetGame()">Hard Reset</button>
  `;
  function hardResetGame() {
    // Clear all saved data from localStorage
    localStorage.removeItem('gameState');

    // Reload the web page
    location.reload();

    console.log('All save data cleared. Page reloaded.');
  }
  function updateXPBar() {
    const xpPercentage = (player.xp / player.maxXP) * 100;
    const roundedXP = Math.floor(xpPercentage);
    document.getElementById("playerXPBar").style.width = xpPercentage + '%';
    document.getElementById("playerXPText").textContent = `${roundedXP}%`;
  }
  function levelUp() {
    if (player.xp < player.maxXP) {
      return;
    }
    player.xp = player.xp - player.maxXP; // Carry over excess XP
    player.level++; // Increase player level
    player.maxXP = Math.floor(player.maxXP * 1.4); // Increase XP needed for next level
    player.attributePoints += 3; // Give 3 attribute points to spend
    if (player.level >= 10) {
      player.skillPoints++;
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
      player.regenSpeed);
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
      enemy.regenSpeed);
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
    playerAttackProgress += 10; // Progress per millisecond
    enemyAttackProgress += 10;
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

  settingsScreenBtn.addEventListener("click", () => {
    switchMenu(settingsContent, "settings");
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
    playerHealthText.textContent = `Your Health: ${player.health}`;
    enemyHealthBar.style.width = (enemy.health / enemy.baseHealth) * 100 + '%';
    enemyHealthText.textContent = `Enemy Health: ${enemy.health}`;
  }

  // Function to handle player attacking the enemy
  function playerAttack() {
    let chargeMulti = 1;
    if (player.currentClass == "warrior") {
      if (player.firstAttack) {
        chargeMulti = player.skills.charge.level+1;
      }
    }
    let critMulti = 1;
    if (Math.random()*100 < player.critChance) {
      critMulti = player.critMulti;
    }
    player.firstAttack = false;
    let damage = Math.floor(critMulti*player.damage*chargeMulti);
    cleaveMulti = (player.skills.cleave.level*0.015)*damage;
    explosiveShotMulti = player.skills.explosiveShot.level*0.1*damage;
    cleaveDamage = cleaveMulti + explosiveShotMulti;
    let cleaveThrough = (player.skills.cleave.level+player.skills.explosiveShot.level)/10;
    for (let i = 0; i < cleaveThrough; i++) {
      if (cleaveThroughDamage.length > i) {
        cleaveThroughDamage[i] += cleaveDamage
      } else {
        cleaveThroughDamage[i] = cleaveDamage;
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
      console.log(`val ${evasionVal} + ev ${player.evasion}`)
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
    startPlayerRegen();
    startEnemyRegen();
    if (cleaveThroughDamage.length > 0 && enemy.health > 0) {
      nextDamage = cleaveThroughDamage.shift();

      enemy.health -= Math.floor(nextDamage);
      if (enemy.health <= 0) {
        enemyDefeated();
      }
    }
    player.firstAttack = true;
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
    player.firstAttack = true;
  }

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

  function updateEnemyAttackSpeed() {
    enemy.attackSpeed = 2005 * Math.pow(0.95,
      player.resolutionSkills.bash.level);
  }
  // Function to change enemy level and reset health
  function changeEnemyLevel(level) {
    enemy.baseHealth = Math.floor(30 + level*10 * Math.pow(1.35, level/2)); // Example health scaling
    enemy.health = enemy.baseHealth;
    enemy.attack = Math.floor(10 + Math.pow(level, 1.18)); // Optionally scale enemy attack
    updateEnemyAttackSpeed();
    enemy.xp = 10 * Math.pow(1.4,
      level-1);
    enemyLevelText.textContent = `Floor ${level}`;
    updateHealthBars();
  }
  loadGameState();

  // Initialize combat when the page loads