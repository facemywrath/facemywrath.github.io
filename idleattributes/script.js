// Screen elements
const attributesScreenBtn = document.getElementById("attributesScreenBtn");
const settingsScreenBtn = document.getElementById("settingsScreenBtn");

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

const hpBarSize = playerHealthBar.width
let autoProgress = false;
let currentEnemyLevel = 1;
let maxUnlockedLevel = 1;

let player = {
  currentClass: "warrior",
  primaryAttribute: "strength",
  health: 50,
  maxHealth: 50,
  damage: 16,
  level: 1,
  xp: 0,
  maxXP: 30,
  xpMulti: 1,
  attackSpeed: 500,
  regen: 0,
  regenSpeed: 2000,
  // XP needed for next level
  attributePoints: 0,
  // Points to spend after leveling up
  skillPoints: 0,
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
  resoluteSkills: {
    weightLifting: 0,
    bash: 0,
    tactician: 0,
    eagleEye: 0,
    featheredShot: 0,
    volley: 0
  }
};

let enemy = {
  health: 50,
  baseHealth: 50,
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

function buildHero() {
  player.strength = player.resoluteSkills.tactician;
  player.intellect = player.resoluteSkills.tactician;
  player.agility = player.resoluteSkills.tactician;
  player.toughness = player.resoluteSkills.tactician;
  player.mysticism = player.resoluteSkills.tactician;
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
        let displayButtonText = ` disabled>Reach Level ${player.skills[skill].unlockAt}`;
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
    if (player.skills[skillName].unlockAt > player.level) {
      console.log(`${skillName} locked`);
      return;
    }
    console.log(`${skillName} unlocked`);
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
    switch (character) {
    case 'warrior':
      player.strength += 5; // Example stat boost
      player.currentClass = "warrior";
      setMainStatDisplay("strength");
      break;
    case 'archer':
      player.agility += 5; // Example stat boost
      player.currentClass = "archer";
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
    val = getPrimaryAttributeValue();
    player.damage = Math.floor(1+3*val * (1+(0.2 * player.skills.overpower.level)));
  }
  function updateMaxHealth() {
    player.maxHealth = Math.floor(50 * (player.toughness/4+1)*Math.pow(1.03125, player.strength));
    updateHealthBars();
  }
  function updateAttackSpeed() {
    player.attackSpeed = 500 * Math.pow(0.96, player.agility)
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
  function updateStrength() {
    updateMaxHealth();
    updateDamage();
  }
  function updateAgility() {
    updateAttackSpeed();
  }
  function updateIntellect() {
    updateXPMulti();
    updateRegenSpeed();
  }
  function updateToughness() {
    updateMaxHealth();
  }
  function updateMysticism() {
    updateRegen();
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
    if (player.currentClass = "warrior") {
      if (player.firstAttack) {
        chargeMulti = player.skills.charge.level*0.33+1;
      }
    }
    player.firstAttack = false;
    if (enemy.health > 0) {
      enemy.health -= Math.floor(player.damage*chargeMulti); // Player attacks based on strength
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
      player.health -= enemy.attack; // Enemy attacks based on attack stat
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
    maxUnlockedLevel = Math.max(maxUnlockedLevel, currentEnemyLevel+1); // Unlock higher levels
    updateXPBar(); // Update the XP bar display
    if (autoProgress) {
      currentEnemyLevel++;
      changeEnemyLevel(currentEnemyLevel); // Reset enemy's health and update display// Increase enemy level
    }


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

  // Function to change enemy level and reset health
  function changeEnemyLevel(level) {
    enemy.baseHealth = Math.floor(50 + level*5 * Math.pow(level-1, 1.2)); // Example health scaling
    enemy.health = enemy.baseHealth;
    enemy.attack = Math.floor(10 + Math.pow(level, 1.2)); // Optionally scale enemy attack

    enemy.xp = 10 * Math.pow(1.44,
      level-1);
    enemyLevelText.textContent = level;
    updateHealthBars();
  }



  // Initialize combat when the page loads