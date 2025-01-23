const DO_LOAD = true;
const DO_OFFLINE = false;
const MAX_OFFLINE_SECONDS = 300;



// Event Bus for handling events
const EventBus = {
  events: {},

  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  },

  emit(event, data) {
    if (this.events[event]) {
      this.events[event].forEach((listener) => listener(data));
    }
  },
};

const ELEMENTS = [{
  NAME: "Hydrogen",
  SYMBOL: "H",
  COLOR: "#66D",
  BASE_COST: 1e-9,
  BASE_ENERGY: 1.5e-10,
  UPGRADES: [{
    NAME: "Synergy",
    DESCRIPTION: "Increases Hydrogen production by 1% for each self-made Generator of any element.",
    EVENTS: [{
      TRIGGER: "generatorPurchased",
      APPLY: () => synergyEffect(0)
    }],
    COLOR: "#600",
    BASE_COST: 100 * 1e-9,
    MAX_LEVEL: 5
  }],
  FISSION_INDEX: []
},
  {
    NAME: "Helium",
    SYMBOL: "He",
    COLOR: "#77C",
    BASE_COST: 1e-8,
    BASE_ENERGY: 6e-10,
    UPGRADES: [{
      NAME: "Synergy",
      DESCRIPTION: "Increases Helium production by 1% for each self-made Generator of any element.",
      EVENTS: [{
        TRIGGER: "generatorPurchased",
        APPLY: () => synergyEffect(1)
      }],
      COLOR: "#600",
      BASE_COST: 100 * 1e-8,
      MAX_LEVEL: 5
    }],
    FISSION_INDEX: [0,
      0] // 2 Hydrogen
  },
  {
    NAME: "Lithium",
    SYMBOL: "Li",
    COLOR: "#545",
    BASE_COST: 1e-7,
    BASE_ENERGY: 2.5e-9,
    UPGRADES: [{
      NAME: "Synergy",
      DESCRIPTION: "Increases Lithium production by 1% for each self-made Generator of any element.",
      EVENTS: [{
        TRIGGER: "generatorPurchased",
        APPLY: () => synergyEffect(2)
      }],
      COLOR: "#600",
      BASE_COST: 100 * 1e-7,
      MAX_LEVEL: 5
    }],
    FISSION_INDEX: [1,
      0] // 1 Helium, 1 Hydrogen
  },
  {
    NAME: "Beryllium",
    SYMBOL: "Be",
    COLOR: "#474",
    BASE_COST: 1e-6,
    BASE_ENERGY: 7.2e-9,
    UPGRADES: [{
      NAME: "Synergy",
      DESCRIPTION: "Increases Beryllium production by 1% for each self-made Generator of any element.",
      EVENTS: [{
        TRIGGER: "generatorPurchased",
        APPLY: () => synergyEffect(3)
      }],
      COLOR: "#600",
      BASE_COST: 100 * 1e-6,
      MAX_LEVEL: 5
    }],
    FISSION_INDEX: [1,
      1] // 2 Helium
  },
  {
    NAME: "Boron",
    SYMBOL: "B",
    COLOR: "#343",
    BASE_COST: 1e-5,
    BASE_ENERGY: 1.1e-8,
    UPGRADES: [{
      NAME: "Synergy",
      DESCRIPTION: "Increases Boron production by 1% for each self-made Generator of any element.",
      EVENTS: [{
        TRIGGER: "generatorPurchased",
        APPLY: () => synergyEffect(4)
      }],
      COLOR: "#600",
      BASE_COST: 100 * 1e-5,
      MAX_LEVEL: 5
    }],
    FISSION_INDEX: [2,
      1] // 1 Lithium 1 Helium
  },
  {
    NAME: "Carbon",
    SYMBOL: "C",
    COLOR: "#333",
    BASE_COST: 1e-4,
    BASE_ENERGY: 1.8e-8,
    UPGRADES: [{
      NAME: "Synergy",
      DESCRIPTION: "Increases Carbon production by 1% for each self-made Generator of any element.",
      EVENTS: [{
        TRIGGER: "generatorPurchased",
        APPLY: () => synergyEffect(5)
      }],
      COLOR: "#600",
      BASE_COST: 100 * 1e-4,
      MAX_LEVEL: 5
    }],
    FISSION_INDEX: [3,
      1] // 1 Beryllium, 1 Helium
  },
  {
    NAME: "Nitrogen",
    SYMBOL: "N",
    COLOR: "#9a9",
    BASE_COST: 1e-3,
    BASE_ENERGY: 2.2e-8,
    UPGRADES: [{
      NAME: "Synergy",
      DESCRIPTION: "Increases Nitrogen production by 1% for each self-made Generator of any element.",
      EVENTS: [{
        TRIGGER: "generatorPurchased",
        APPLY: () => synergyEffect(6)
      }],
      COLOR: "#600",
      BASE_COST: 100 * 1e-3,
      MAX_LEVEL: 5
    }],
    FISSION_INDEX: [3,
      2] // 1 Beryllium, 1 Lithium
  },
  {
    NAME: "Oxygen",
    SYMBOL: "O",
    COLOR: "#A9A",
    BASE_COST: 1e-2,
    BASE_ENERGY: 2.4e-8,
    UPGRADES: [{
      NAME: "Synergy",
      DESCRIPTION: "Increases Oxygen production by 1% for each self-made Generator of any element.",
      EVENTS: [{
        TRIGGER: "generatorPurchased",
        APPLY: () => synergyEffect(7)
      }],
      COLOR: "#600",
      BASE_COST: 100 * 1e-2,
      MAX_LEVEL: 5
    }],
    FISSION_INDEX: [3,
      3] // 2 Beryllium
  },
  {
    NAME: "Fluorine",
    SYMBOL: "F",
    COLOR: "#868",
    BASE_COST: 1e-1,
    BASE_ENERGY: 3.8e-8,
    UPGRADES: [{
      NAME: "Synergy",
      DESCRIPTION: "Increases Fluorine production by 1% for each self-made Generator of any element.",
      EVENTS: [{
        TRIGGER: "generatorPurchased",
        APPLY: () => synergyEffect(8)
      }],
      COLOR: "#600",
      BASE_COST: 100 * 1e-1,
      MAX_LEVEL: 5
    }],
    FISSION_INDEX: [4,
      2,0] // 1 Boron, 1 Lithium, 1 Hydrogen
  },
  {
    NAME: "Neon",
    SYMBOL: "Ne",
    COLOR: "#d99",
    BASE_COST: 1,
    BASE_ENERGY: 4.5e-8,
    UPGRADES: [{
      NAME: "Synergy",
      DESCRIPTION: "Increases Neon production by 1% for each self-made Generator of any element.",
      EVENTS: [{
        TRIGGER: "generatorPurchased",
        APPLY: () => synergyEffect(9)
      }],
      COLOR: "#600",
      BASE_COST: 100,
      MAX_LEVEL: 5
    }],
    FISSION_INDEX: [4,
      4] // 2 Boron
  }];

const gameState = {
  energy: 0,
  // Tracks the player's current energy
  lastTick: Date.now(),
  // Timestamp of the last game update
  selectedElementIndex: 0,
  maxUnlockedIndex: 0,
  // The index of the currently selected element
  elementStorage: ELEMENTS.map((element) => ({
    locked: true,
    count: 0, // Number of this element owned
    generators: 0, // Number of generators producing this element
    multipliers: [],
    upgradeCosts: element.UPGRADES.map((upgrade) => upgrade.BASE_COST),
    upgradeLevels: Array(element.UPGRADES.length).fill(0) // Array of levels for each upgrade, initialized to 0
  }))
};

function synergyEffect(index) {
  const element = gameState.elementStorage[index];
  const totalGenerators = gameState.elementStorage.reduce((acc, el) => acc + el.generators, 0);
  element.multipliers[0] = 1 + (0.01 * element.upgradeLevels[0]) * totalGenerators;
  console.log(`${ELEMENTS[index].SYMBOL} Synergy Upgrade updated.`);
  element.upgradeCosts[0] = ELEMENTS[index].UPGRADES[0].BASE_COST*Math.pow(7, element.upgradeLevels[0] ?? 0);
}
console.log(gameState);


ELEMENTS.forEach((element) => {
  element.UPGRADES.forEach((upgrade) => {
    if (upgrade.EVENTS && upgrade.EVENTS.length > 0) {
      upgrade.EVENTS.forEach((event) => {
        console.log(`Initializing event for ${element.NAME} - ${upgrade.NAME}`);
        console.log(`Trigger: ${event.TRIGGER}`);
        console.log(`Apply Function:`, event.APPLY);
        if (typeof event.APPLY !== "function") {
          console.error(`Apply function is undefined for ${element.NAME} - ${upgrade.NAME}`);
          upgrade.EVENTS.forEach((event, eventIndex) => {
            console.log(`Event #${eventIndex} Keys:`, Object.keys(event));
          });
        }
      });
    }
  });
});


// Initialize the periodic table
function initializeGame() {
  const elementGrid = document.querySelector(".element-grid");

  // Create element buttons
  ELEMENTS.forEach((element, index) => {
    const elementButton = document.createElement("div");
    elementButton.id = `element-button-${element.NAME}`;
    elementButton.style.backgroundColor = element.COLOR;
    elementButton.style.outline = ".2rem solid #999";
    elementButton.classList.add("element");
    elementButton.innerHTML = `
    <span>${element.SYMBOL}</span>
    `;
    elementGrid.appendChild(elementButton);
    // Initialize upgrades into the EventBus

    element.UPGRADES.forEach((upgrade,
      upgradeIndex) => {
      if (upgrade.EVENTS && upgrade.EVENTS.length > 0) {
        upgrade.EVENTS.forEach((event) => {
          EventBus.on(event.TRIGGER, (data) => {
            let upgradeLevel = gameState.elementStorage[index].upgradeLevels[upgradeIndex] ?? 0;
            if (typeof event.APPLY === "function" && upgradeLevel > 0) {
              console.log(`${element.NAME} ${upgrade.NAME} ${upgradeLevel}`)

              event.APPLY(data.index);
            } else {
              console.log(`f${event.APPLY} ${element.NAME} ${upgrade.NAME} ${upgradeLevel}`)
              //   }
            }
          });
        });
      }
    });
    updateEnergy();
    // Click event to select an element
    elementButton.addEventListener("click", () => {
      selectElement(index);
    });
  });

  // Initialize the first selected element
  selectElement(0);
}

// Select an element and update the UI
// Select an element and update the UI
function selectElement(index) {
  gameState.selectedElementIndex = index;
  const elementStorage = gameState.elementStorage[index];
  const element = ELEMENTS[index];
  const selectedElementDiv = document.getElementById("selected-element");

  // Calculate the generator cost dynamically
  const generatorCost = getGeneratorCost(index);

  // Determine button visibility
  const showFission = index > 0; // Fission is only available for elements other than Hydrogen
  const showAnnihilation = index === 0; // Annihilation is only available for Hydrogen
  let fissionProductString = "";

  if (showFission) {
    if (!element.FISSION_INDEX.length) {
      console.log(`${element.SYMBOL} cannot undergo fission.`);
    }

    const elementCount = Math.floor(elementStorage.count); // Use the floor of the count
    const fissionProducts = element.FISSION_INDEX
    .map((productIndex) => ELEMENTS[productIndex].SYMBOL)
    .reduce((acc, symbol) => {
      acc[symbol] = (acc[symbol] || 0) + elementCount; // Multiply count of each product
      return acc;
    }, {});

    // Convert the object into a formatted string for display
    fissionProductString = Object.entries(fissionProducts)
    .map(([symbol, count]) => `+${count}${symbol}`)
    .join(' ');
  }
  let canAffordGenerator = generatorCost <= gameState.energy;


  selectedElementDiv.style.backgroundColor = element.COLOR
  // Display element information and options
  selectedElementDiv.innerHTML = `
  <h3>${element.NAME} (${element.SYMBOL})</h3>
  <p>Count: ${formatNumber(elementStorage.count)}</p>
  <p>Generators: ${elementStorage.generators}</p>
  <p>Production Rate: ${formatNumber(getProduction(index))} per second</p>
  <button id="buy-generator" ${canAffordGenerator ? "": "disabled"} style="width: 100%; height: 4rem;">
  Buy Generator (${formatNumber(generatorCost)} J)
  </button>
  ${showFission ? `
  <button id="fission-element" ${elementStorage.count >= 1 ? "": "disabled"} style="width: 100%; height: 4rem;">
  Fission All: +${formatNumber((element.BASE_ENERGY / 2) * Math.floor(elementStorage.count))} J
  (${fissionProductString})
  </button>
  `: ""}
  ${showAnnihilation ? `
  <button id="annihilate-element" ${elementStorage.count >= 1 ? "": "disabled"} style="width: 100%; height: 4rem;">
  Annihilate All: +${formatNumber(element.BASE_ENERGY * Math.floor(elementStorage.count))} J
  (-${Math.floor(elementStorage.count)} ${element.SYMBOL})
  </button>
  `: ""}
  <h4>Upgrades</h4>
  <div id="upgrades-list"></div>
  `;

  // Display upgrades
  const upgradesList = document.getElementById("upgrades-list");
  element.UPGRADES.forEach((upgrade, upgradeIndex) => {
    const upgradeDiv = document.createElement("div");
    upgradeDiv.textContent = `${upgrade.NAME}: \n${upgrade.DESCRIPTION}`;
    upgradeDiv.style.display = "flex";
    upgradeDiv.style.flexDirection = "column";
    upgradeDiv.style.backgroundColor = upgrade.COLOR;
    const upgradeButton = document.createElement("button");
    upgradeButton.textContent = `${gameState.elementStorage[index].upgradeLevels[upgradeIndex]}/${upgrade.MAX_LEVEL}\n - ${formatNumber(elementStorage.upgradeCosts[upgradeIndex]??element.UPGRADES[upgradeIndex].BASE_COST)} J`;
    upgradeButton.disabled = gameState.elementStorage[index].upgradeLevels[upgradeIndex] == upgrade.MAX_LEVEL || gameState.energy < elementStorage.upgradeCosts[upgradeIndex];
    upgradeButton.addEventListener("click", () => purchaseUpgrade(index, upgradeIndex));
    upgradeDiv.appendChild(upgradeButton);
    upgradesList.appendChild(upgradeDiv);
  });
  selectedElementDiv.appendChild(upgradesList);

  // Attach button listeners
  document.getElementById("buy-generator").addEventListener("click", () => buyGenerator(index));
  if (showFission) {
    document.getElementById("fission-element").addEventListener("click", () => fissionElement(index));
  }
  if (showAnnihilation) {
    document.getElementById("annihilate-element").addEventListener("click", () => annihilateElement());
  }
  updateElementButtons();
}

function checkUnlockNextElement() {
  const index = gameState.maxUnlockedIndex+1;
  const nextElementStorage = gameState.elementStorage[index]
  const generatorCost = getGeneratorCost(index);
  const generatorCount = gameState.elementStorage[index].generators;
  const canAffordGenerator = generatorCost <= gameState.energy;
  const isUnlocked = (canAffordGenerator || generatorCount > 0);
  const button = document.getElementById(`element-button-${ELEMENTS[index].NAME}`);
  
  if (isUnlocked) {
    if(nextElementStorage.locked){
      gameState.maxUnlockedIndex+=1;
      nextElementStorage.locked = false;
    }
    button.style.display = "flex";
  }
}
function updateElementButtons() {
  checkUnlockNextElement();
  ELEMENTS.forEach((element, index) => {
    const generatorCost = getGeneratorCost(index);
    const canAffordGenerator = generatorCost <= gameState.energy;
    const button = document.getElementById(`element-button-${element.NAME}`);
    if (gameState.elementStorage[index].locked) {
      button.style.display = "none";
    } else {
      button.style.display = "flex";
    }
    if (canAffordGenerator) {
      button.style.outline = ".2rem solid #4d4";
    } else {
      button.style.outline = ".2rem solid #999";
    }
  });
}
function getGeneratorCost(index) {
  const element = ELEMENTS[index];
  const cost = element.BASE_COST* Math.pow(1.05,
    gameState.elementStorage[index].generators); // Example cost scaling
  return cost;
}
// Buy generator
// Buy generator
function buyGenerator(index) {
  const element = gameState.elementStorage[index];
  const cost = getGeneratorCost(index);

  if (gameState.energy >= cost) {
    gameState.energy -= cost;
    element.generators += 1;

    // Emit generator purchased event
    EventBus.emit("generatorPurchased", {
      elementIndex: index
    });

    updateEnergy();
    selectElement(index); // Refresh UI for selected element
  } else {
    console.log(`Not enough energy! Needed: ${cost} J, Available: ${gameState.energy} J`);
  }
}

// Purchase an upgrade
function purchaseUpgrade(elementIndex, upgradeIndex) {
  const element = ELEMENTS[elementIndex];
  const upgrade = element.UPGRADES[upgradeIndex];
  const upgradeLevel = gameState.elementStorage[elementIndex].upgradeLevels[upgradeIndex];

  if (upgradeLevel < upgrade.MAX_LEVEL && gameState.energy >= upgrade.BASE_COST) {
    gameState.energy -= upgrade.BASE_COST;
    gameState.elementStorage[elementIndex].upgradeLevels[upgradeIndex] += 1;

    // Trigger any "apply" events upon purchase
    upgrade.EVENTS.forEach((event) => {
      if (typeof event.APPLY === "function") {
        event.APPLY(elementIndex);
      }
    });

    updateEnergy();
    selectElement(elementIndex); // Refresh UI for selected element
  } else {
    console.log(
      upgrade.MAX_LEVEL == upgradeLevel
      ? "Upgrade already purchased!": `Not enough energy! Needed: ${upgrade.BASE_COST} J, Available: ${gameState.energy} J`
    );
  }
}

// Fission element
function fissionElement(index) {
  const elementStorage = gameState.elementStorage[index];
  const element = ELEMENTS[index];

  if (elementStorage.count >= 1) {
    const maxFissions = Math.floor(elementStorage.count); // Max fissions based on integer count
    elementStorage.count -= maxFissions; // Reduce count of the current element
    let totalEnergy = 0;

    // Process fission products
    element.FISSION_INDEX.forEach((productIndex) => {
      const productElementStorage = gameState.elementStorage[productIndex];
      const productElement = ELEMENTS[productIndex];
      const producedCount = maxFissions; // Number of each product is equal to maxFissions

      productElementStorage.count += producedCount; // Add fission products
      console.log(`Gained ${producedCount} ${productElement.SYMBOL}`);
    });

    // Calculate total energy gained from fission
    totalEnergy = maxFissions * (element.BASE_ENERGY / 2);
    gameState.energy += totalEnergy;

    console.log(
      `Fissioned ${maxFissions} ${element.SYMBOL}: Gained ${formatNumber(
        totalEnergy
      )} J`
    );

    selectElement(index); // Refresh UI
    updateEnergy();
  } else {
    console.log(`Not enough ${element.NAME} to fission!`);
  }
}

// Annihilate Hydrogen for energy
function annihilateElement() {
  const elementStorage = gameState.elementStorage[gameState.selectedElementIndex];
  const element = ELEMENTS[gameState.selectedElementIndex];
  if (gameState.selectedElementIndex > 0) {
    console.log("Cant annihilate that element!")
    return;
  }
  if (elementStorage.count >= 1) {
    const maxAnnihilations = Math.floor(elementStorage.count); // Max annihilations based on integer count
    elementStorage.count -= maxAnnihilations;
    const totalEnergy = maxAnnihilations * element.BASE_ENERGY; // Total energy gained
    gameState.energy += totalEnergy;

    console.log(
      `Annihilated ${maxAnnihilations} ${element.SYMBOL}: Gained ${formatNumber(totalEnergy)} J`
    );

    selectElement(gameState.selectedElementIndex); // Refresh UI
    updateEnergy();
  } else {
    console.log(`Not enough ${element.NAME} to annihilate!`);
  }
}
// Helper function to format numbers
function formatNumber(value) {
  if (value < 0.0001 || value > 1e6) {
    return value.toExponential(4); // Scientific notation with 4 significant digits
  }
  return value.toFixed(4); // Standard decimal notation with 4 decimal places
}
// Update energy display
// Update energy display
function updateEnergy() {
  document.getElementById("energy").textContent = `${formatNumber(gameState.energy)} J`;
}

function getProduction(index) {
  const element = gameState.elementStorage[index];
  let production = element.generators * 0.2;

  // Apply all multipliers if they exist
  if (element.multipliers && element.multipliers.length > 0) {
    production *= element.multipliers.reduce((total, multi) => total * multi, 1);
  }

  return production; // Return the computed production value
}

function updateElements() {
  gameState.elementStorage.forEach((element, index) => {
    element.count += getProduction(index)/10; // Increment the element's count by its production
  });

  // Refresh the selected element UI
  selectElement(gameState.selectedElementIndex);
}

// Game loop to update resources
function gameLoop() {
  updateElements(); // Elements are produced based on generators
  updateEnergy();
  setTimeout(gameLoop, 100); // Call every second
}
// Save the game state to localStorage
function saveGame() {
  const saveData = {
    gameState,
    timestamp: Date.now(),
    // Record the save time for offline gains
  };
  localStorage.setItem("idleElementsSaveData", JSON.stringify(saveData));
  console.log("Game saved!");
}
// Load the game state from localStorage
// Load the game state from localStorage
function loadGame() {
  const saveData = JSON.parse(localStorage.getItem("idleElementsSaveData"));

  if (saveData) {
    // Temporarily store the events from the base game state

    // Load the saved game state
    if (DO_LOAD) {
      Object.assign(gameState, saveData.gameState);
    } else {
      gameState.elementStorage[0].generators = 1;
      gameState.elementStorage[0].locked = false;
    }

    // Restore the events from the temp copy

    console.log("Game loaded!");
    if (DO_OFFLINE && DO_LOAD) {
      calculateOfflineGains(saveData.timestamp); // Handle offline gains
    }
  } else {
    gameState.elementStorage[0].generators = 1;
    gameState.elementStorage[0].locked = false;
    console.log("No save data found.");
  }

  // Reinitialize the game with events and state
  ELEMENTS.forEach((element) => {
    element.UPGRADES.forEach((upgrade) => {
      if (upgrade.EVENTS && upgrade.EVENTS.length > 0) {
        upgrade.EVENTS.forEach((event) => {
          console.log(`Initializing event for ${element.NAME} - ${upgrade.NAME}`);
          console.log(`Trigger: ${event.TRIGGER}`);
          console.log(`Apply Function:`, event.APPLY);
          if (typeof event.APPLY !== "function") {
            console.error(`Apply function is undefined for ${element.NAME} - ${upgrade.NAME}`);
          }
        });
      }
    });
  });

  initializeGame();
  updateEnergy();
  gameLoop();
}

// Calculate offline gains
function calculateOfflineGains(lastTimestamp) {
  const currentTime = Date.now();
  const elapsedSeconds = Math.max(MAX_OFFLINE_SECONDS, (currentTime - lastTimestamp) / 1000);
  gameState.elementStorage.forEach((element, index) => {
    const productionPerSecond = getProduction(index);
    const offlineProduction = productionPerSecond * elapsedSeconds;

    element.count += offlineProduction; // Add offline production to element count
  });

  console.log(`Offline gains: ${elapsedSeconds} seconds simulated.`);
}
// Call loadGame when the game starts

window.onload = loadGame;
setInterval(saveGame, 10000); // Save every 30 seconds
// Initialize the game