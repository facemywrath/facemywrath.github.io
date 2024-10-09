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

let autoProgress = false;
let currentEnemyLevel = 1;
let maxUnlockedLevel = 1;

let player = {
  health: 100,
  maxHealth: 100,
  xp: 0,
  xpMulti: 1,
  attackSpeed: 500,
  regen: 0,
  regenSpeed: 2000,
  maxXP: 30, // XP needed for next level
  level: 1,
  attributePoints: 0, // Points to spend after leveling up
  damage: 10,
  strength: 0,
  intellect: 0,
  agility: 0,
  toughness: 0, // New attribute
  mysticism: 0  // New attribute
};

let enemy = {
  health: 30,
  baseHealth: 30,
  regen: 0,
  regenSpeed: 0,
  attack: 5,
  attackSpeed: 505, // in milliseconds
  xp: 10
};

attributesFontSize = "18px";
// Attributes and Settings menus
const attributesContent = `
<div>
  <p> <span id="attributePoints" style="font-size:20px; display: flex; margin-bottom: 20px;">Attribute Points: 0</span></p>
  <p>Strength: <span id="playerStrength";>${player.strength}</span> <button style="line-length: 0; font-size: ${attributesFontSize}; padding: 2px 5px;" onclick="increaseAttribute('strength')">+</button></p>
  <p>Intellect: <span id="playerIntellect">${player.intellect}</span> <button style="line-length: 0; font-size: ${attributesFontSize}; padding: 2px 5px;" onclick="increaseAttribute('intellect')">+</button></p>
  <p>Agility: <span id="playerAgility">${player.agility}</span> <button style="font-size: ${attributesFontSize}; padding: 2px 5px;" onclick="increaseAttribute('agility')">+</button></p>
  <p>Toughness: <span id="playerToughness">${player.toughness}</span> <button style="font-size: ${attributesFontSize}; padding: 2px 5px;" onclick="increaseAttribute('toughness')">+</button></p>
  <p>Mysticism: <span id="playerMysticism">${player.mysticism}</span> <button style="font-size: ${attributesFontSize}; padding: 2px 5px;" onclick="increaseAttribute('mysticism')">+</button></p>
</div>
`;

function increaseAttribute(attribute) {
  if (player.attributePoints > 0) {
    player[attribute]++;
    player.attributePoints--;
    updateAttributesMenu();  // Refresh the attributes display
  }
}
function increaseAttribute(attribute) {
  if (player.attributePoints > 0) {
    player.attributePoints--;  // Deduct 1 attribute point
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
    updateAttributesMenu();  // Update the attribute points display
  }
}
function updateStrength(){
  player.damage = 10+(player.strength)*4
}
function updateAgility(){
  player.attackSpeed = 500 * Math.pow(0.93, player.agility)
}
function updateIntellect(){
  player.xpMulti = 1+(player.intellect);
}
function updateToughness(){
  player.maxHealth = 100 * (1+(player.toughness/4));
  updateHealthBars();
}
function updateMysticism(){
  player.regen = Math.pow(player.mysticism, 1.14);
}
function updateAttributesMenu() {
  document.getElementById("playerStrength").textContent = player.strength;
  document.getElementById("playerIntellect").textContent = player.intellect;
  document.getElementById("playerAgility").textContent = player.agility;
  document.getElementById("playerToughness").textContent = player.toughness;
  document.getElementById("playerMysticism").textContent = player.mysticism;
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
  player.xp = player.xp - player.maxXP;  // Carry over excess XP
  player.level++;  // Increase player level
  player.maxXP = Math.floor(player.maxXP * 1.65);  // Increase XP needed for next level
  player.attributePoints += 3;  // Give 3 attribute points to spend
  updateAttributesMenu();
  // Optionally, notify the player of their new level and points
}

function updateEnemySwordFill(progress) {
    const swordFill = document.getElementById('enemySwordFill');
    swordFill.style.height = progress + '%';  // Progress ranges from 0 to 100
}
let playerRegenInterval;
let enemyRegenInterval;

// Function to start healing the player
function startPlayerRegen() {
  // Clear any existing regen interval to avoid multiple intervals
  clearInterval(playerRegenInterval);
  if(player.regenSpeed == 0){
    return;
  }
  // Start a new regen interval
  playerRegenInterval = setInterval(() => {
    if (player.health < player.maxHealth) {
      player.health = Math.floor(Math.min(player.maxHealth, player.health + player.regen));
      updateHealthBars();  // Update the UI
    }
  }, player.regenSpeed);
}

// Function to start healing the enemy
function startEnemyRegen() {
  // Clear any existing regen interval to avoid multiple intervals
  clearInterval(enemyRegenInterval);
  if(enemy.regenSpeed == 0){
    return;
  }
  // Start a new regen interval
  enemyRegenInterval = setInterval(() => {
    if (enemy.health < enemy.maxHealth) {
      enemy.health = Math.floor(Math.min(enemy.maxHealth, enemy.health + enemy.regen));
      updateHealthBars();  // Update the UI
    }
  }, enemy.regenSpeed);
}
function updatePlayerSwordFill(progress) {
    const swordFill = document.getElementById('playerSwordFill');
    swordFill.style.height = progress + '%';  // Progress ranges from 0 to 100
}

// Variables to track time
let playerAttackProgress = 0;
let enemyAttackProgress = 0;

// Function to update the sword fills based on time until next attack
function updateSwordFills() {
  print("test");
    // Calculate progress as percentage of time passed relative to attack speed
    playerAttackProgress += (100 / player.attackSpeed);  // Progress per millisecond
    enemyAttackProgress += (100 / enemy.attackSpeed);

    // Cap the progress at 100%
    if (playerAttackProgress >= 100) {
        playerAttackProgress = 0; // Reset after attack
        playerAttack();  // Trigger player attack
    }
    if (enemyAttackProgress >= 100) {
        enemyAttackProgress = 0; // Reset after attack
        enemyAttack();  // Trigger enemy attack
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
function switchMenu(content) {
  bottomMenu.innerHTML = content;
}

// Event listeners for menu buttons
attributesScreenBtn.addEventListener("click", () => {
  switchMenu(attributesContent);
});

settingsScreenBtn.addEventListener("click", () => {
  switchMenu(settingsContent);
});

autoProgressBtn.addEventListener("click", () => {
  autoProgress = !autoProgress;
});
// Default state: Show attributes content when game starts
switchMenu(attributesContent);

// Function to update health bars and text
function updateHealthBars() {
  playerHealthBar.style.width = (100*player.health/player.maxHealth) + '%';
  playerHealthText.textContent = `Your Health: ${player.health}`;
  enemyHealthBar.style.width = (enemy.health / enemy.baseHealth) * 100 + '%';
  enemyHealthText.textContent = `Enemy Health: ${enemy.health}`;
}

// Function to handle player attacking the enemy
function playerAttack() {
  if (enemy.health > 0) {
    enemy.health -= player.damage;  // Player attacks based on strength
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
    player.health -= enemy.attack;  // Enemy attacks based on attack stat
    if (player.health <= 0) {
      playerDefeated();  // Optional: handle what happens when the player loses
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
  enemyAttackProgress=0;
  stopRegen();
  startPlayerRegen();
  startEnemyRegen();
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
  player.xp += enemy.xp*player.xpMulti;  // Add enemy XP to player XP
  if (player.xp >= player.maxXP) {
    levelUp();  // Level up if XP threshold is reached
  }
  updateXPBar();  // Update the XP bar display
  if(autoProgress){
    currentEnemyLevel++; 
    changeEnemyLevel(currentEnemyLevel);  // Reset enemy's health and update display// Increase enemy level
  }
  maxUnlockedLevel = Math.max(maxUnlockedLevel, currentEnemyLevel);  // Unlock higher levels
  
  resetPlayerHealth();
  startCombat();  // Restart combat
}

// Function to handle what happens when the player loses
function playerDefeated() {
   resetPlayerHealth();
   resetEnemyHealth();
   currentEnemyLevel--;
   changeEnemyLevel(currentEnemyLevel);
   if(autoProgress){
     autoProgress = false;
     autoProgressCheckbox.checked = false;
   }
}

// Optional: Reset the combat if the player changes the enemy level
prevEnemyBtn.addEventListener("click", () => {
  if (currentEnemyLevel > 1) {
    currentEnemyLevel--;
    changeEnemyLevel(currentEnemyLevel);
    startCombat();  // Restart combat with new level
  }
});

nextEnemyBtn.addEventListener("click", () => {
  if (currentEnemyLevel < maxUnlockedLevel) {
    currentEnemyLevel++;
    changeEnemyLevel(currentEnemyLevel);
    startCombat();  // Restart combat with new level
  }
});

// Function to change enemy level and reset health
function changeEnemyLevel(level) {
  enemy.baseHealth = Math.floor(30 + 5 * Math.pow(level, 1.3)); // Example health scaling
  enemy.health = enemy.baseHealth;
  enemy.attack = Math.floor(5 + 1.5*Math.pow(level, 1.15));  // Optionally scale enemy attack
  
  enemy.xp = 10 * Math.pow(1.35,level-1);
  enemyLevelText.textContent = level;
  updateHealthBars();
}



// Initialize combat when the page loads
startCombat();
startSwordFills();