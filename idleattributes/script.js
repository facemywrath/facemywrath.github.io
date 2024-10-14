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
const hpBarSize = playerHealthBar.width
let autoProgress = false;
let currentEnemyLevel = 1;
let maxUnlockedLevel = 1;
let totalReincarnations = 0;
let unlockedClasses = ["warrior"];

let player = {
  currentClass: "warrior",
  primaryAttribute: "strength",
  health: 50,
  maxHealth: 50,
  damage: 10,
  level: 1,
  xp: 0,
  maxXP: 30,
  xpMulti: 1,
  attackSpeed: 500,
  defense: 1,
  evasion: 0,
  critChance: 0,
  critMulti: 2,
  regen: 0,
  regenSpeed: 2000,
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
    shieldWall: {
      level: 0,
      locked: true,
      unlockAt: 40,
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
      unlockAt: 10,
      unlockClass: "archer"
    },
    evasion: {
      level: 0,
      locked: true,
      unlockAt: 40,
      unlockClass: "archer"
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
    }
  }
};

let enemy = {
  health: 40,
  baseHealth: 40,
  regen: 0,
  regenSpeed: 0,
  attack: 11.5,
  attackSpeed: 505,
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
  currentClass: "warrior",
  primaryAttribute: "strength",
  health: 50,
  maxHealth: 50,
  damage: 10,
  level: 1,
  xp: 0,
  maxXP: 30,
  xpMulti: 1,
  attackSpeed: 500,
  defense: 1,
  evasion: 0,
  regen: 0,
  regenSpeed: 2000,
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
    shieldWall: {
      level: 0,
      locked: true,
      unlockAt: 40,
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
    }
  },
  resolutionSkills: {
    weightLifting: {
      level: 0,
      locked: true
    },
    bash: {
      level: 0,
      locked: true
    },
    tactician: {
      level: 0,
      locked: true
    },
    eagleEye: {
      level: 0,
      locked: true
    },
    featheredShot: {
      level: 0,
      locked: true
    },
    volley: {
      level: 0,
      locked: true
    }
  }
};

// Method to reset the player back to initial values
function buildHero() {
  // Reset player properties based on the initial configuration
  oldResolutionSkills = player.resolutionSkills;
  Object.assign(player, JSON.parse(JSON.stringify(heroInitialConfig)));
  player.resolutionSkills = oldResolutionSkills;
  for(let skill in player.resolutionSkills){
    player.resolutionSkills[skill].locked= true;
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
  console.log(player);
}
function tryUnlockClasses() {
  if (totalReincarnations < 2) {
    archerSelectBtn.textContent = "Reach Prestige 2";
    archerSelectBtn.disabled = true;
    archerDescription.textContent = "Locked";
    return;
  }
  archerSelectBtn.textContent = "Select";
  archerSelectBtn.disabled = false;
  archerDescription.textContent = "Archer";
}
// Attributes and Settings menus
const attributesContent = `
<div>
<p style="display: flex; justify-content: space-between;">
<span id="attributePoints" style="font-size:20px; margin-bottom: 20px;">Attribute Points: 0</span>
<span id="playerLevel" style="font-size:20px; text-align: right; padding-right: 3vw">Level: ${player.level}</span>
</p>
<p><span id="strengthDisplay">${strengthDisplay}</span>: <span id="playerStrength">${player.strength}</span> <button style="line-length: 0; font-size: ${attributesFontSize}; padding: 2px 5px;" onclick="increaseAttribute('strength')">+</button></p>
<p><span id="intellectDisplay">${intellectDisplay}</span>: <span id="playerIntellect">${player.intellect}</span> <button style="line-length: 0; font-size: ${attributesFontSize}; padding: 2px 5px;" onclick="increaseAttribute('intellect')">+</button></p>
<p><span id="agilityDisplay">${agilityDisplay}</span>: <span id="playerAgility">${player.agility}</span> <button style="font-size: ${attributesFontSize}; padding: 2px 5px;" onclick="increaseAttribute('agility')">+</button></p>
<p><span id="toughnessDisplay">${toughnessDisplay}</span>: <span id="playerToughness">${player.toughness}</span> <button style="font-size: ${attributesFontSize}; padding: 2px 5px;" onclick="increaseAttribute('toughness')">+</button></p>
<p><span id="mysticismDisplay">${mysticismDisplay}</span>: <span id="playerMysticism">${player.mysticism}</span> <button style="font-size: ${attributesFontSize}; padding: 2px 5px;" onclick="increaseAttribute('mysticism')">+</button></p>
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
    console.log(`${skillName} locked`);
    return;
  }
  console.log(`${skillName} unlocked`);
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
  console.log("level 1");
  if (player.resolutionPoints == 0) {
    console.log("level out of points");
    return;
  }
  console.log(skillName);
  player.resolutionPoints--;
  player.resolutionSkills[skillName].level++;
  if (currentMenu == "resolution") {
    displayResoluteSkillsMenu();
  }

  switch (skillName) {
    case 'weightLifting':
      updateWeightLiftingEffect();
      break;
    case 'charge':
      updateChargeEffect();
      break;
    case 'shieldWall':
      updateShieldwallEffect();
      break;
    default:
      console.error("Unknown skill: " + skillName);
      break;
  }
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
  console.log("level 1");
  if (player.skillPoints == 0) {
    console.log("level out of points");
    return;
  }
  console.log(skillName);
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

function updateSharpnessEffect(){
  updateDamage();
}
function updateQuickdrawEffect(){
  updateAttackSpeed();
}
function updateEvasionEffect(){
  updateEvasion();
}

function updateOverpowerEffect() {
  // Implement the passive effect for Overpower based on the skill level
  console.log("Overpower level: " + player.skills.overpower.level);
  updateDamage();
  // Fill in the details for the passive effect
}

function updateChargeEffect() {
  // Implement the passive effect for Cleave based on the skill level
  console.log("Charge level: " + player.skills.charge.level);
  // Fill in the details for the passive effect
}

function updateShieldwallEffect() {
  // Implement the passive effect for Shieldwall based on the skill level
  console.log("Shieldwall level: " + player.skills.shieldWall.level);
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
  if (player.skills[skillName].unlockAt > maxUnlockedLevel) {
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
    console.log(`val = ${player.primaryAttribute}`);
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

  function updateDamage() {
    let val = getPrimaryAttributeValue();
    let base = 2*val;
    let opMulti = 1+(0.2 * player.skills.overpower.level);
    let weightMulti = 1+(0.1* player.resolutionSkills.weightLifting.level);
    let sharpnessMulti = 1 + (0.2*player.skills.sharpness.level);
    player.damage = Math.floor(base*opMulti*weightMulti*sharpnessMulti);
  }
  function updateEvasion(){
    let val = 100*(1-Math.exp(player.skills.evasion/-10))
    player.evasion = val;
  }
  function updateMaxHealth() {
    player.maxHealth = Math.floor(50 * (player.toughness/4+1)*Math.pow(1.01, player.strength));
    updateHealthBars();
  }
  function updateAttackSpeed() {
    let base = Math.pow(0.96, player.agility);
    let quickdrawMulti = Math.pow(0.95, player.skills.quickdraw.level);
    player.attackSpeed = 500 * base*quickdrawMulti;
  }
  function updateXPMulti() {
    player.xpMulti = Math.pow(1.2, player.intellect);
  }
  function updateRegen() {
    player.regen = player.mysticism;
  }
  function updateRegenSpeed() {
    player.regenSpeed = 2000 * Math.pow(0.98, player.intellect);
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
  <button id="hardResetBtn">Hard Reset</button>
  `;

  function updateXPBar() {
    const xpPercentage = (player.xp / player.maxXP) * 100;
    const roundedXP = Math.floor(xpPercentage);
    document.getElementById("playerXPBar").style.width = xpPercentage + '%';
    document.getElementById("playerXPText").textContent = `${roundedXP}%`;
  }
  function levelUp() {
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
    
    if(maxUnlockedLevel > 30){
      player.resolutionPoints++;
        if (currentMenu == "resolution") {
          displayResoluteSkillsMenu();
        }
    }
    // Optionally, notify the player of their new level and points
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
    playerAttackProgress += (100 / player.attackSpeed); // Progress per millisecond
    enemyAttackProgress += (100 / enemy.attackSpeed);

    // Cap the progress at 100%
    if (playerAttackProgress >= 100) {
      playerAttackProgress = 0; // Reset after attack
      playerAttack(); // Trigger player attack
    }
    if (enemyAttackProgress >= 100) {
      enemyAttackProgress = 0; // Reset after attack
      enemyAttack(); // Trigger enemy attack
    }

    // Update the sword fills
    updatePlayerSwordFill(playerAttackProgress);
    updateEnemySwordFill(enemyAttackProgress);
  }

  // Function to start the filling intervals
  function startSwordFills() {
    // Update the sword fills every 100ms for smooth animation
    setInterval(updateSwordFills, 0.1);
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
        chargeMulti = player.skills.charge.level*0.7+1;
      }
    }
    let critMulti = 1;
    if(Math.random()*100<player.critChance){
      critMulti=player.critMulti;
    }
    player.firstAttack = false;
    if (enemy.health > 0) {
      enemy.health -= Math.floor(critMulti*player.damage*chargeMulti); // Player attacks based on strength
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
      if(Math.random()*100 < player.evasion){
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
    startPlayerRegen();
    startEnemyRegen();
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
    maxUnlockedLevel = Math.max(maxUnlockedLevel, currentEnemyLevel+1); // Unlock higher levels
    updateXPBar(); // Update the XP bar display
    if (autoProgress) {
      currentEnemyLevel++;
      changeEnemyLevel(currentEnemyLevel); // Reset enemy's health and update display// Increase enemy level
    }
    unlockResolutionSkillsMenu();

    resetPlayerHealth();
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

  nextEnemyBtn.addEventListener("click", () => {
    if (currentEnemyLevel < maxUnlockedLevel) {
      currentEnemyLevel++;
      changeEnemyLevel(currentEnemyLevel);
      startCombat(); // Restart combat with new level
    }
  });

  function updateEnemyAttackSpeed(){
    enemy.attackSpeed = 505 * Math.pow(0.95,
      player.resolutionSkills.bash.level);
  }
  // Function to change enemy level and reset health
  function changeEnemyLevel(level) {
    enemy.baseHealth = Math.floor(30 + level*10 * Math.pow(1.35, level/2)); // Example health scaling
    enemy.health = enemy.baseHealth;
    enemy.attack = Math.floor(10 + 1.2*Math.pow(level, 1.2)); // Optionally scale enemy attack
    updateEnemyAttackSpeed();
    enemy.xp = 10 * Math.pow(1.36,
      level-1);
    enemyLevelText.textContent = `Floor ${level}`;
    updateHealthBars();
  }



  // Initialize combat when the page loads