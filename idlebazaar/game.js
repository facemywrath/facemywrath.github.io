const currencies = {
  coins: {
    name: "Coins",
    amount: 0,
    highest: 0 , 
    lifetime: 0,
    multi: 1,
    calculateGain: function(){
      let CPS = 0;
      stalls.forEach(stall => {
      CPS += calculateStallIncome(stall)
      });
      return CPS
    }
  },
  fame: { 
    name: "Fame",
    amount: 0,
    highest: 0, 
    lifetime: 0, 
    multi: [1],
    getMulti: function(){
      return currencies.fame.multi.reduce((total, num) => total * num, 1)
    },
    calculateGain: function(){
      return Math.floor(Math.pow(currencies.coins.amount / 1000000, 0.8))*currencies.fame.getMulti();
    }
  }
};
let tickSpeed = 1000;
let resetTimer = {
  lastClick: 0,
  clickCount: 0,
  timeout: 1000
}
const loadGameOnStart=true;

const stalls = [
  {
    id: "fruit_stand",
    index: 0,
    name: "Fruit Stand",
    count: 1,
    level: 1,
    baseIncome: 1,
    interval: 1000,
    upgradeCost: 10,
    addStallCost: 500,
    unlocked: true
  },
  {
    id: "rug_merchant",
    index: 1,
    name: "Rug Merchant",
    count: 0,
    level: 0,
    baseIncome: 4,
    interval: 1000,
    upgradeCost: 50,
    addStallCost: 1500,
    unlocked: false
  },
  {
    id: "spice_stall",
    index: 2,
    name: "Spice Stall",
    count: 0,
    level: 0,
    baseIncome: 15,
    interval: 1000,
    upgradeCost: 300,
    addStallCost: 5000,
    unlocked: false
  },
  {
    id: "snake_oil_salesman",
    index: 3,
    name: "Snake Oil Salesman",
    count: 0,
    level: 0,
    baseIncome: 40,
    interval: 1000,
    upgradeCost: 1000,
    addStallCost: 15000,
    unlocked: false
  },
  {
    id: "potion_brewer",
    index: 4,
    name: "Potion Brewer",
    count: 0,
    level: 0,
    baseIncome: 100,
    interval: 1000,
    upgradeCost: 2500,
    addStallCost: 30000,
    unlocked: false
  },
  {
    id: "blacksmith",
    index: 5,
    name: "Blacksmith",
    count: 0,
    level: 0,
    baseIncome: 10000,
    interval: 1000,
    upgradeCost: 100000000,
    addStallCost: 3000000000,
    unlocked: false
  },
  {
    id: "enchanter",
    index: 6,
    name: "Enchanter",
    count: 0,
    level: 0,
    baseIncome: 100000,
    interval: 1000,
    upgradeCost: 15000000000,
    addStallCost: 450000000000,
    unlocked: false
  }
];

function calculateStallIncome(stall){
  let inc = (stall.baseIncome * stall.level * stall.count)/(stall.interval/1000)*currencies.coins.multi*(1+(0.2*currencies.fame.amount));
  return inc
}
const fameUpgrades = [
  {
    id: "double_income",
    name: "Double Income",
    description: "Doubles all income.",
    cost: 5,
    level: 0,
    maxLevel: 1,
    apply: () => {
      currencies.coins.multi = 2
    }
  },
  {
    id: "fame_boost_1",
    name: "Fame Boost I",
    description: "Gain +5% more fame.",
    cost: 5,
    level: 0,
    maxLevel: 50000,
    apply: () => {
      currencies.fame.multi.push(1.05)
      fameUpgrades.find(u => u.id == "fame_boost_1").cost +=1
      console.log(currencies.fame.getMulti())
    }
  },
      {
    id: "starting_coins_boost",
    name: "Starting Coins Boost",
    description: "Increase starting coins by 10^level.",
    cost: 10,
    level: 0,
    maxLevel: 10,
    apply: () => {
      let upg = fameUpgrades.find(u => u.id == "starting_coins_boost");
      upg.cost *= 2;
      if(upg.eventListener && upg.eventType){
        new EventType(upg.eventType).removeListener(upg.eventListener)
      }
      upg.eventType = "sellout";
      upg.eventListener = () =>{
        let newLevel = fameUpgrades.find(u => u.id == "starting_coins_boost").level
        if(newLevel > 0){
        currencies.coins.amount += Math.pow(10,newLevel)
        }
      };
      selloutEvent.on(upg.eventListener)
    }
  },
  {
    id: "stall_boost",
    name: "Stall Boost",
    description: "Increase the starting level of the first 5 stalls.",
    cost: 100,
    level: 0,
    maxLevel: 10,
    apply: () => {
      let upgLevel = fameUpgrades.find(u => u.id == "stall_boost").level
      stalls.filter(stall => stall.index < 5).forEach(stall => {
        if (stall.level < upgLevel) {
          stall.level = upgLevel;
          stall.unlocked = true;
        }
        if(stall.count < 1){
          stall.count = 1
        }
      });
      selloutEvent.on(() =>{
        let newLevel = fameUpgrades.find(u => u.id == "stall_boost").level
      stalls.forEach(stall => {
        if (stall.level < newLevel){ 
          stall.level = newLevel;
          stall.unlocked = true;
        }
                if(stall.count < 1){
          stall.count = 1
        }
      });
    });
    }
  }
];
const originalStalls = JSON.parse(JSON.stringify(stalls));
function saveGame() {
  const saveData = {
  currencies,
  stalls,
  fameUpgrades: fameUpgrades.map(u => ({ id: u.id, level: u.level }))
};
  localStorage.setItem("idleBazaarSave", JSON.stringify(saveData));
}

function loadGame() {
  const saved = localStorage.getItem("idleBazaarSave");
  if (saved) {
    const saveData = JSON.parse(saved);
    if (saveData.fameUpgrades) {
  saveData.fameUpgrades.forEach(savedUpgrade => {
    const upgrade = fameUpgrades.find(u => u.id === savedUpgrade.id);
    if (upgrade) {
      upgrade.level = savedUpgrade.level;
      if(upgrade.level){
      for(let i = 0; i < upgrade.level; i++){ upgrade.apply();
      }
      }
    }
  });
}
    // Restore currencies
    for (let key in currencies) {
      if (saveData.currencies[key]) {
        Object.assign(currencies[key], saveData.currencies[key]);
      }
    }

    // Restore stalls
    saveData.stalls.forEach((savedStall, index) => {
      Object.assign(stalls[index], savedStall);
    });
  }
}
function formatCurrency(value) {
  const suffixes = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];
  if (!isFinite(value)) return "∞";
  if (value < 1e3) return value.toFixed(1);
  const tier = Math.floor(Math.log10(value) / 3);
  const suffix = suffixes[tier] || "e" + tier * 3;
  const scale = Math.pow(10, tier * 3);
  const scaled = value / scale;
  return scaled.toFixed(2) + suffix;
}

function getNextSellOutRequirement() {
  const fame = currencies.fame.calculateGain() + 1;
  return Math.ceil(Math.pow(fame, 1/ 0.8) * 1000000);
}



function unlockStalls() {
  for (let stall of stalls) {
    if (!stall.unlocked && currencies.coins.amount >= stall.upgradeCost / 2) {
      stall.unlocked = true;
    }
  }
}

function renderResources() {
  const container = document.getElementById("resource-list");
  container.innerHTML = "";

  let hasVisible = false;
  for (let key in currencies) {
    if (currencies[key].highest > 0) {
      hasVisible = true;
      const div = document.createElement("div");
      div.textContent = `${currencies[key].name}: ${formatCurrency(currencies[key].amount)}`;
      container.appendChild(div);
    }
  }

}


function showWindow(id, condition) {
  const el = document.getElementById(id);
  el.classList.toggle("hidden", !condition);
}

function renderStalls() {
  const container = document.getElementById("stalls");
  container.innerHTML = "";
  let coinsPerSec = currencies.coins.calculateGain();
  stalls.forEach((stall, index) => {
    const unlockRequirement = stall.upgradeCost;

    // If player has never had enough coins, don't show it at all
    if (!stall.unlocked && currencies.coins.highest < unlockRequirement/2) return;

    const div = document.createElement("div");
    div.className = "stall";
    let inc = calculateStallIncome(stall)
    if (stall.unlocked) {
      
      div.innerHTML = `
  <h2 style="font-size: 0.9em;">${stall.name} <br>Lv: ${stall.level} | Count: ${stall.count} <br>CPS: ${formatCurrency(inc)} (${(inc/coinsPerSec*100).toFixed(1)}%)</h2>
  <div class="stall-buttons">
    <button id="upgrade-${index}">Upgrade for <span id="cost-${index}">${formatCurrency(stall.upgradeCost)}</span> coins</button>
    <button id="add-${index}">Buy another for <span id="add-cost-${index}">${formatCurrency(stall.addStallCost)}</span> coins</button>
  </div>
`;
      container.appendChild(div);

      document.getElementById(`upgrade-${index}`).addEventListener("click", () => {
        if (currencies.coins.amount >= stall.upgradeCost) {
          currencies.coins.amount -= stall.upgradeCost;
          stall.level++;
          stall.upgradeCost = Math.floor(stall.upgradeCost * 1.25);
          updateDisplay();
        }
      });

      document.getElementById(`add-${index}`).addEventListener("click", () => {
        if (currencies.coins.amount >= stall.addStallCost) {
          currencies.coins.amount -= stall.addStallCost;
          stall.count++;
          stall.addStallCost = Math.floor(stall.addStallCost * 1.5);
          updateDisplay();
        }
      });

    } else {
      div.innerHTML = `
        <h2>${stall.name}</h2>
        <p>This stall is currently locked.</p>
        <button id="unlock-${index}">Unlock for ${formatCurrency(unlockRequirement)} coins</button>
      `;
      container.appendChild(div);
      
      document.getElementById(`unlock-${index}`).addEventListener("click", () => {
        if (currencies.coins.amount >= unlockRequirement) {
          currencies.coins.amount -= unlockRequirement;
          stall.unlocked = true;
          stall.level = 1;
          stall.count = 1;
          stall.upgradeCost = Math.floor(stall.upgradeCost * 1.5);
          updateDisplay();
        }
      });
    }
  });
  document.getElementById("stall-production-display").textContent = "Market Stalls - Total CPS: " + formatCurrency(coinsPerSec)
}
function renderFameUpgrades() {
  const container = document.getElementById("sellout-upgrades");
  container.innerHTML = "";

  fameUpgrades.forEach(upg => {
    const div = document.createElement("div");
    div.className = "upgrade";
    div.innerHTML = `
      <strong>${upg.description}</strong> (${upg.level}/${upg.maxLevel})<br>
      <button ${upg.level == upg.maxLevel ? "disabled" : ""} id="fame-upgrade-${upg.id}">
        ${upg.level < upg.maxLevel ? `Buy for ${upg.cost} Fame`:"Maxed"}
      </button>
    `;
    container.appendChild(div);

    
      document.getElementById(`fame-upgrade-${upg.id}`).addEventListener("click", () => {
        if (currencies.fame.amount >= upg.cost) {
          currencies.fame.amount -= upg.cost;
          upg.level = upg.level+1 || 1;
          upg.apply();
          updateDisplay();
        }
      });
    
  });
}
function updateDisplay() {
  // Track highest values
  for (let key in currencies) {
    if (currencies[key].amount > currencies[key].highest) {
      currencies[key].highest = currencies[key].amount;
    }
  }

  renderResources();
  renderStalls();
  renderFameUpgrades();

  const gain = currencies.fame.calculateGain();
  const next = getNextSellOutRequirement();

  showWindow("sellout-window", currencies.coins.highest >= 250000);
  showWindow("stalls-window", stalls.some(s => s.unlocked));

  const btn = document.getElementById("prestige-btn");
  btn.textContent = `Sell Out (+${formatCurrency(gain)} Fame)  - Next at ${formatCurrency(next)} Coins`;
  btn.disabled = gain <= 0;
}

document.getElementById("prestige-btn").addEventListener("click", () => {
  const gain = currencies.fame.calculateGain();
  if (gain > 0) {
    currencies.fame.amount += gain;
    currencies.fame.lifetime += gain
    currencies.coins.amount = 0;
    

    // Reset stalls using original copy
    stalls.forEach((stall, index) => {
      const original = originalStalls[index];
      Object.assign(stall, JSON.parse(JSON.stringify(original)));
    });
    selloutEvent.emit()
    updateDisplay();
  }
});

stalls.forEach((stall) => {
  setInterval(() => {
    if (stall.unlocked) {
      inc = calculateStallIncome(stall)
      currencies.coins.amount += inc;
      currencies.coins.lifetime += inc;
      updateDisplay();
    }
  }, stall.interval);
});
if(loadGameOnStart){
loadGame();
}
renderStalls();
setInterval(saveGame, 10000); // Save every 10 seconds
function setTickspeed(value){
  if(updateInterval){
    clearInterval(updateInterval);
  }
  tickSpeed = value;
  updateInterval = setInterval(updateDisplay, value)
}
function resetGame() {
    if(resetTimer.lastClick+resetTimer.timeout  >= Date.now()){
       if(resetTimer.clickCount >= 3){
  localStorage.removeItem("idleBazaarSave");
  location.reload();
  }
      resetTimer.lastClick = Date.now()
      resetTimer.clickCount++;
      document.getElementById("reset-btn").textContent=`Click ${4-resetTimer.clickCount} more times quickly!`
    }else{
      resetTimer.clickCount = 1
      document.getElementById("reset-btn").textContent=`Click ${3-resetTimer.clickCount} more times quickly!`
      resetTimer.lastClick = Date.now()
  }
}
let updateInterval = setInterval(updateDisplay, tickSpeed);

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
  
const selloutEvent = new EventType("sellout")