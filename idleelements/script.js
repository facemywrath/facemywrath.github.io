const DO_LOAD = true;
const DO_OFFLINE = true;
const MAX_OFFLINE_SECONDS = 60;
const LOCALSTORAGE_KEY = "idleElementsSaveData1.0"


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
  BASE_ENERGY: 1.504e-10,
  UPGRADES: [{
    NAME: "Synergy",
    DESCRIPTION: "Increases Hydrogen production by 1% per level for each self-made Generator of any element.",
    EVENTS: [{
      TRIGGER: "generatorPurchased",
      APPLY: () => synergyEffect(0)
    }],
    COLOR: "#600",
    BASE_COST: 100 * 1e-9,
    MAX_LEVEL: 5
  },
    {
      NAME: "Nuclei Bombardment",
      DESCRIPTION: "Increases Hydrogen Energy gain by 20% per level for every element unlocked.",
      EVENTS: [{
        TRIGGER: "elementUnlocked",
        APPLY: () => nucleiBombardmentEffect(0)
      }],
      COLOR: "#600",
      BASE_COST: 10000 * 1e-9,
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
    },{
      NAME: "Mass Retention",
      DESCRIPTION: "Increases Helium Energy gain by 20% per total Mass Retention levels purchased for every log10 of Total Energy Produced over 1e-10 J.",
        
            EVENTS: [{
        TRIGGER: "energyProduced",
        APPLY: () => massRetentionEffect(1)
      },{
        TRIGGER: "upgradePurchased",
        APPLY: () => massRetentionEffect(1)
      },],
      COLOR: "#600",
      BASE_COST: 100 * 1e-6,
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
    },{
      NAME: "Mass Retention",
      DESCRIPTION: "Increases Lithium Energy gain by 20% per total Mass Retention levels purchased for every log10 of Total Energy Produced over 1e-10 J.",
        
     EVENTS: [{
        TRIGGER: "energyProduced",
        APPLY: () => massRetentionEffect(2)
      },{
        TRIGGER: "upgradePurchased",
        APPLY: () => massRetentionEffect(2)
      },],
      COLOR: "#600",
      BASE_COST: 100 * 1e-5,
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
    },{
      NAME: "Mass Retention",
      DESCRIPTION: "Increases Beryllium Energy gain by 20% per total Mass Retention levels purchased for every log10 of Total Energy Produced over 1e-10 J.",
        
      EVENTS: [{
        TRIGGER: "energyProduced",
        APPLY: () => massRetentionEffect(3)
      },{
        TRIGGER: "upgradePurchased",
        APPLY: () => massRetentionEffect(3)
      },],
      COLOR: "#600",
      BASE_COST: 100 * 1e-4,
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
    },{
      NAME: "Mass Retention",
      DESCRIPTION: "Increases Boron Energy gain by 20% per total Mass Retention levels purchased for every log10 of Total Energy Produced over 1e-10 J.",
        
     EVENTS: [{
        TRIGGER: "energyProduced",
        APPLY: () => massRetentionEffect(4)
      },{
        TRIGGER: "upgradePurchased",
        APPLY: () => massRetentionEffect(4)
      },],
      COLOR: "#600",
      BASE_COST: 100 * 1e-3,
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
    },{
      NAME: "Mass Retention",
      DESCRIPTION: "Increases Carbon Energy gain by 20% per total Mass Retention levels purchased for every log10 of Total Energy Produced over 1e-10 J.",
        
     EVENTS: [{
        TRIGGER: "energyProduced",
        APPLY: () => massRetentionEffect(5)
      },{
        TRIGGER: "upgradePurchased",
        APPLY: () => massRetentionEffect(5)
      },],
      COLOR: "#600",
      BASE_COST: 100 * 1e-2,
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
    },{
      NAME: "Mass Retention",
      DESCRIPTION: "Increases Nitrogen Energy gain by 20% per total Mass Retention levels purchased for every log10 of Total Energy Produced over 1e-10 J.",
        
     EVENTS: [{
        TRIGGER: "energyProduced",
        APPLY: () => massRetentionEffect(6)
      },{
        TRIGGER: "upgradePurchased",
        APPLY: () => massRetentionEffect(6)
      },],
      COLOR: "#600",
      BASE_COST: 100 * 1e-1,
      MAX_LEVEL: 5
    }],
    FISSION_INDEX: [5,
      0] // 1 Beryllium, 1 Lithium
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
      MAX_LEVEL: 5,
    },{
      NAME: "Mass Retention",
      DESCRIPTION: "Increases Oxygen Energy gain by 20% per total Mass Retention levels purchased for every log10 of Total Energy Produced over 1e-10 J.",
        
     EVENTS: [{
        TRIGGER: "energyProduced",
        APPLY: () => massRetentionEffect(7)
      },{
        TRIGGER: "upgradePurchased",
        APPLY: () => massRetentionEffect(7)
      },],
      COLOR: "#600",
      BASE_COST: 100 * 1,
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
    },{
      NAME: "Mass Retention",
      DESCRIPTION: "Increases Fluorine Energy gain by 20% per total Mass Retention levels purchased for every log10 of Total Energy Produced over 1e-10 J.",
     EVENTS: [{
        TRIGGER: "energyProduced",
        APPLY: () => massRetentionEffect(8)
      },{
        TRIGGER: "upgradePurchased",
        APPLY: () => massRetentionEffect(8)
      },],
      COLOR: "#600",
      BASE_COST: 100 * 10,
      MAX_LEVEL: 5
    }],
    FISSION_INDEX: [4,
      2,
      0] // 1 Boron, 1 Lithium, 1 Hydrogen
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
    },{
      NAME: "Mass Retention",
      DESCRIPTION: "Increases Neon Energy gain by 20% per total Mass Retention levels purchased for every log10 of Total Energy Produced over 1e-10 J.",
     EVENTS: [{
        TRIGGER: "energyProduced",
        APPLY: () => massRetentionEffect(9)
      },{
        TRIGGER: "upgradePurchased",
        APPLY: () => massRetentionEffect(9)
      },],
      COLOR: "#600",
      BASE_COST: 100 * 1e2,
      MAX_LEVEL: 5
    }],
    FISSION_INDEX: [4,
      4] // 2 Boron
  },{
  NAME: "Sodium",
  SYMBOL: "Na",
  COLOR: "#DAA520",
  BASE_COST: 1e1,
  BASE_ENERGY: 5.0e-8,
  UPGRADES: [{
    NAME: "Synergy",
    DESCRIPTION: "Increases Sodium production by 1% for each self-made Generator of any element.",
    EVENTS: [{
      TRIGGER: "generatorPurchased",
      APPLY: () => synergyEffect(10)
    }],
    COLOR: "#600",
    BASE_COST: 100 * 1e1,
    MAX_LEVEL: 5
  },{
    NAME: "Mass Retention",
    DESCRIPTION: "Increases Sodium Energy gain by 20% per total Mass Retention levels purchased for every log10 of Total Energy Produced over 1e-10 J.",
    EVENTS: [{
      TRIGGER: "energyProduced",
      APPLY: () => massRetentionEffect(10)
    },{
      TRIGGER: "upgradePurchased",
      APPLY: () => massRetentionEffect(10)
    }],
    COLOR: "#600",
    BASE_COST: 100 * 1e3,
    MAX_LEVEL: 5
  }],
  FISSION_INDEX: [8, 1] // 1 Fluorine, 1 Hydrogen
},
{
  NAME: "Magnesium",
  SYMBOL: "Mg",
  COLOR: "#9ACD32",
  BASE_COST: 1e2,
  BASE_ENERGY: 5.5e-8,
  UPGRADES: [{
    NAME: "Synergy",
    DESCRIPTION: "Increases Magnesium production by 1% for each self-made Generator of any element.",
    EVENTS: [{
      TRIGGER: "generatorPurchased",
      APPLY: () => synergyEffect(11)
    }],
    COLOR: "#600",
    BASE_COST: 100 * 1e2,
    MAX_LEVEL: 5
  },{
    NAME: "Mass Retention",
    DESCRIPTION: "Increases Magnesium Energy gain by 20% per total Mass Retention levels purchased for every log10 of Total Energy Produced over 1e-10 J.",
    EVENTS: [{
      TRIGGER: "energyProduced",
      APPLY: () => massRetentionEffect(11)
    },{
      TRIGGER: "upgradePurchased",
      APPLY: () => massRetentionEffect(11)
    }],
    COLOR: "#600",
    BASE_COST: 100 * 1e4,
    MAX_LEVEL: 5
  }],
  FISSION_INDEX: [9, 1] // 1 Neon, 1 Hydrogen
},
{
  NAME: "Aluminum",
  SYMBOL: "Al",
  COLOR: "#B0E0E6",
  BASE_COST: 1e3,
  BASE_ENERGY: 6.2e-8,
  UPGRADES: [{
    NAME: "Synergy",
    DESCRIPTION: "Increases Aluminum production by 1% for each self-made Generator of any element.",
    EVENTS: [{
      TRIGGER: "generatorPurchased",
      APPLY: () => synergyEffect(12)
    }],
    COLOR: "#600",
    BASE_COST: 100 * 1e3,
    MAX_LEVEL: 5
  },{
    NAME: "Mass Retention",
    DESCRIPTION: "Increases Aluminum Energy gain by 20% per total Mass Retention levels purchased for every log10 of Total Energy Produced over 1e-10 J.",
    EVENTS: [{
      TRIGGER: "energyProduced",
      APPLY: () => massRetentionEffect(12)
    },{
      TRIGGER: "upgradePurchased",
      APPLY: () => massRetentionEffect(12)
    }],
    COLOR: "#600",
    BASE_COST: 100 * 1e5,
    MAX_LEVEL: 5
  }],
  FISSION_INDEX: [6, 5] // 1 Sodium, 1 Hydrogen
},
{
  NAME: "Silicon",
  SYMBOL: "Si",
  COLOR: "#A0522D",
  BASE_COST: 1e4,
  BASE_ENERGY: 6.8e-8,
  UPGRADES: [{
    NAME: "Synergy",
    DESCRIPTION: "Increases Silicon production by 1% for each self-made Generator of any element.",
    EVENTS: [{
      TRIGGER: "generatorPurchased",
      APPLY: () => synergyEffect(13)
    }],
    COLOR: "#600",
    BASE_COST: 100 * 1e4,
    MAX_LEVEL: 5
  },{
    NAME: "Mass Retention",
    DESCRIPTION: "Increases Silicon Energy gain by 20% per total Mass Retention levels purchased for every log10 of Total Energy Produced over 1e-10 J.",
    EVENTS: [{
      TRIGGER: "energyProduced",
      APPLY: () => massRetentionEffect(13)
    },{
      TRIGGER: "upgradePurchased",
      APPLY: () => massRetentionEffect(13)
    }],
    COLOR: "#600",
    BASE_COST: 100 * 1e6,
    MAX_LEVEL: 5
  }],
  FISSION_INDEX: [10, 2] // 1 Sodium, 1 Helium
},
{
  NAME: "Phosphorus",
  SYMBOL: "P",
  COLOR: "#FFD700",
  BASE_COST: 1e5,
  BASE_ENERGY: 7.4e-8,
  UPGRADES: [{
    NAME: "Synergy",
    DESCRIPTION: "Increases Phosphorus production by 1% for each self-made Generator of any element.",
    EVENTS: [{
      TRIGGER: "generatorPurchased",
      APPLY: () => synergyEffect(14)
    }],
    COLOR: "#600",
    BASE_COST: 100 * 1e5,
    MAX_LEVEL: 5
  },{
    NAME: "Mass Retention",
    DESCRIPTION: "Increases Phosphorus Energy gain by 20% per total Mass Retention levels purchased for every log10 of Total Energy Produced over 1e-10 J.",
    EVENTS: [{
      TRIGGER: "energyProduced",
      APPLY: () => massRetentionEffect(14)
    },{
      TRIGGER: "upgradePurchased",
      APPLY: () => massRetentionEffect(14)
    }],
    COLOR: "#600",
    BASE_COST: 100 * 1e7,
    MAX_LEVEL: 5
  }],
  FISSION_INDEX: [10, 3] // 1 Sodium, 1 Lithium
}];

const MOLECULES = [{
  NAME: "Hydrogen",
  SYMBOL: "H<sub>2",
  TYPE: "diatomic",
  ID_PRE: "h2",
  BASE_COST: 200,
  COST_RATIOS: {
    0: 1
  }
}, {
  NAME: "Nitrogen",
  SYMBOL: "N<sub>2",
  TYPE: 'diatomic',
  ID_PRE: 'n2',
  BASE_COST: 200,
  COST_RATIOS: {
    6: 1
  }
}, {
  NAME: "Oxygen",
  SYMBOL: "O<sub>2",
  TYPE: 'diatomic',
  ID_PRE: 'o2',
  BASE_COST: 200,
  COST_RATIOS: {
    7: 1
  }
}, {
  NAME: "Fluorine",
  SYMBOL: "F<sub>2",
  TYPE: 'diatomic',
  ID_PRE: 'f2',
  BASE_COST: 200,
  COST_RATIOS: {
    8: 1
  }
}//add chlorine bromine and iodine
];
const gameState = {
  energy: 0,
  totalEnergyProduced: 0,
  // Tracks the player's current energy
  lastTick: Date.now(),
  // Timestamp of the last game update
  selectedElementIndex: 0,
  selectedMenuIndex: 0,
  maxUnlockedIndex: 0,
  moleculeStorage: MOLECULES.map((molecule) => ({
    locked: true,
    cost: molecule.BASE_COST,
    bonus: 1,
    count: 0
  })),
  // The index of the currently selected element
  elementStorage: ELEMENTS.map((element) => ({
    locked: true,
    count: 0, // Number of this element owned
    generators: 0, // Number of generators producing this element
    upgradeMultipliers: [1],
    energyMultipliers: [1],
    massRetentionMultiplier: 0,
    moleculeMultipliers: Array(MOLECULES.length).fill(1),
    upgradeCosts: element.UPGRADES.map((upgrade) => upgrade.BASE_COST),
    upgradeLevels: Array(element.UPGRADES.length).fill(0) // Array of levels for each upgrade, initialized to 0
  })),
};

function synergyEffect(index) {
  const element = gameState.elementStorage[index];
  const totalGenerators = gameState.elementStorage.reduce((acc, el) => acc + el.generators, 0);
  element.upgradeMultipliers[0] = 1 + (0.01 * element.upgradeLevels[0]) * totalGenerators;
  console.log(`${ELEMENTS[index].SYMBOL} Synergy Upgrade updated.`);
  element.upgradeCosts[0] = ELEMENTS[index].UPGRADES[0].BASE_COST*Math.pow(7, element.upgradeLevels[0] ?? 0);
}
function nucleiBombardmentEffect(index) {
  const element = gameState.elementStorage[index];
  const elementsUnlocked = gameState.maxUnlockedIndex+1;
  element.energyMultipliers[0] = 1 + (0.2 * element.upgradeLevels[1]) * elementsUnlocked;
  console.log(`${ELEMENTS[index].SYMBOL} NB Upgrade updated. Multi: ${formatNumber(element.energyMultipliers[0])}`);
  element.upgradeCosts[1] = ELEMENTS[index].UPGRADES[1].BASE_COST*Math.pow(5, element.upgradeLevels[1] ?? 0);
}
function massRetentionEffect(index) {
  const element = gameState.elementStorage[index];
  
  // Calculate energyLog
  const energyLog = Math.max(1, Math.log(gameState.totalEnergyProduced) / Math.log(10) + 11);
  console.log(`energyLog: ${energyLog}`);
  
  // Update massRetentionMultiplier
  element.massRetentionMultiplier = 0.2 * element.upgradeLevels[1];
  console.log(`element.massRetentionMultiplier: ${element.massRetentionMultiplier}`);
  
  // Calculate sumOfMassRetentionMultipliers
  const sumOfMassRetentionMultipliers = 1 + gameState.elementStorage.filter((element,index) => index > 0).reduce(
    (sum, element) => sum + element.massRetentionMultiplier, 
    0
  );
  console.log(`sumOfMassRetentionMultipliers: ${sumOfMassRetentionMultipliers}`);
  
  // Update energyMultipliers[0]
  element.energyMultipliers[0] = sumOfMassRetentionMultipliers * energyLog;
  console.log(`${ELEMENTS[index].SYMBOL} MR Upgrade updated. Multi: ${formatNumber(element.energyMultipliers[0])}`);
  
  // Update upgradeCosts[1]
  element.upgradeCosts[1] = ELEMENTS[index].UPGRADES[1].BASE_COST * Math.pow(4, element.upgradeLevels[1] ?? 0);
  console.log(`element.upgradeCosts[1]: ${element.upgradeCosts[1]}`);
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

function refreshUI() {
  switch (gameState.selectedMenuIndex) {
    case 0:
      selectElement(gameState.selectedElementIndex);
      return;
      break;
    case 1:
      updateMoleculesMenu();
      break;
    return;
  }
}
function updateMoleculesMenu() {
  MOLECULES.forEach((molecule, index) => {
    const idPre = molecule.ID_PRE;
    const button = document.getElementById(`${idPre}-btn`);
    const costText = document.getElementById(`${idPre}-cost`);
    const bonusText = document.getElementById(`${idPre}-bonus`);
    button.innerHTML = `${gameState.moleculeStorage[index].count} ${molecule.NAME} ${molecule.SYMBOL}`;
    let costTextValue = 'Cost: ';
    Object.values(molecule.COST_RATIOS).forEach((value,
      costIndex) => {
      let cost = gameState.moleculeStorage[index].cost * value;
      let symbol = ELEMENTS[Object.keys(molecule.COST_RATIOS)[costIndex]].SYMBOL;
      costTextValue = `${costTextValue} ${cost}${symbol} (${Math.floor(gameState.elementStorage[Object.keys(molecule.COST_RATIOS)[costIndex]].count)}${ELEMENTS[Object.keys(molecule.COST_RATIOS)[costIndex]].SYMBOL})`;
    });
    costText.textContent = costTextValue
    const bonus = gameState.moleculeStorage[index].bonus;
    bonusText.textContent = `Bonus: ${bonus}x (${bonus*2}x)`
    const div = document.getElementById(`${idPre}-div`);
    let flag = true;
    Object.keys(molecule.COST_RATIOS).forEach(key => {
      if(gameState.elementStorage[key].locked){
        flag = false;
      }
    });
    if(flag){
      div.style.display = 'flex';
      if(gameState.moleculeStorage[index].locked){
        gameState.moleculeStorage.locked = false;
      }
    }
    else {
      div.style.display = 'none';
    }
});

}
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
MOLECULES.forEach((molecule, index) => {
button = document.getElementById(`${molecule.ID_PRE}-btn`);
button.addEventListener('click', () => purchaseMolecule(index));
});

function purchaseMolecule(index) {
let costs = [];
let costElements = [];
Object.keys(MOLECULES[index].COST_RATIOS).forEach((elementIndex, arrayIndex) => {
costElements[arrayIndex] = elementIndex;
costs[arrayIndex] = Object.values(MOLECULES[index].COST_RATIOS)[arrayIndex]*gameState.moleculeStorage[index].cost;
});
let canBuy = true;
costElements.forEach((element, arrayIndex) => {
if (gameState.elementStorage[element].count < costs[arrayIndex]) {
canBuy = false;
}
});
if (canBuy) {
costElements.forEach((element, arrayIndex) => {
gameState.elementStorage[element].count -= costs[arrayIndex]
console.log(`Bought: ${MOLECULES[index].SYMBOL} ${costs[arrayIndex]}`)
});

gameState.moleculeStorage[index].count += 1;
gameState.moleculeStorage[index].bonus *= 2;
gameState.moleculeStorage[index].cost *= 10;
costElements.forEach(element => {
gameState.elementStorage[element].moleculeMultipliers[index] *= 2;
})
}
refreshUI();
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
<p>Energy Multiplier: ${formatNumber(getEnergyMultiplier(index))}x</p>
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
Annihilate All: +${formatNumber(getEnergyProduction(index) * Math.floor(elementStorage.count))} J
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

upgradeButton.textContent = `${gameState.elementStorage[index].upgradeLevels[upgradeIndex]}/${upgrade.MAX_LEVEL}\n - ${formatNumber(elementStorage.upgradeCosts[upgradeIndex] ?? element.UPGRADES[upgradeIndex].BASE_COST)} J`;
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
if (nextElementStorage.locked) {
gameState.maxUnlockedIndex += 1;
EventBus.emit("elementUnlocked", {
elementIndex: index
});
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
EventBus.emit("upgradePurchased", {
elementIndex: gameState.selectedElementIndex
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
totalEnergy = maxFissions * (getEnergyProduction(index)/2);
gameState.energy += totalEnergy;
gameState.totalEnergyProduced += totalEnergy;
console.log(
`Fissioned ${maxFissions} ${element.SYMBOL}: Gained ${formatNumber(
totalEnergy
)} J`
);
EventBus.emit("energyProduced", {
elementIndex: gameState.selectedElementIndex
});
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
const totalEnergy = maxAnnihilations * getEnergyProduction(gameState.selectedElementIndex); // Total energy gained
console.log(`${getEnergyProduction(gameState.selectedElementIndex)} + ${gameState.elementStorage[gameState.selectedElementIndex].energyMultipliers}`)
gameState.energy += totalEnergy;
gameState.totalEnergyProduced += totalEnergy;
EventBus.emit("energyProduced", {
elementIndex: gameState.selectedElementIndex
});
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
if (value > 0 && (value < 0.001 || value > 1e6)) {
return value.toExponential(4); // Scientific notation with 4 significant digits
}
return value.toFixed(4); // Standard decimal notation with 4 decimal places
}
function formatNumberFixed(value, digits) {
if (value < 0.001 || value > 1e6) {
return value.toExponential(digits); // Scientific notation with 4 significant digits
}
return value.toFixed(digits); // Standard decimal notation with 4 decimal places
}
// Update energy display
function updateEnergy() {
document.getElementById("energy").textContent = `${formatNumber(gameState.energy)} J`;
}

function getProduction(index) {
const element = gameState.elementStorage[index];
let production = element.generators * 0.2;

// Apply all multipliers if they exist
if (element.upgradeMultipliers && element.upgradeMultipliers.length > 0) {
production *= element.upgradeMultipliers.reduce((total, multi) => total * multi, 1);
}

return production; // Return the computed production value
}

function getEnergyProduction(index) {
const element = gameState.elementStorage[index];
let production = ELEMENTS[index].BASE_ENERGY;

return production*getEnergyMultiplier(index); // Return the computed production value
}
function getEnergyMultiplier(index) {
const element = gameState.elementStorage[index];
let production = 1;

// Apply all multipliers if they exist
if (element.energyMultipliers && element.energyMultipliers.length > 0) {
production *= element.energyMultipliers.reduce((total, multi) => total * multi, 1);
}
if (element.moleculeMultipliers && element.moleculeMultipliers.length > 0) {
production *= element.moleculeMultipliers.reduce((total, multi) => total * multi, 1);
}

return production; // Return the computed production value
}
function updateElements() {
gameState.elementStorage.forEach((element, index) => {
EventBus.emit("elementProduced", {
elementIndex: index
});
element.count += getProduction(index)/10; // Increment the element's count by its production
});

// Refresh the selected element UI
refreshUI();

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
localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(saveData));
console.log("Game saved!");
}

function mergeAndFillArrays(arr1, arr2, fillValue) {
// Create a new array by copying all elements from arr2
if (arr1.length == arr2.length) return arr2;

const result = arr2.slice();

// Fill the remaining elements to match arr1's length with 1s
while (result.length < arr1.length) {
result.push(fillValue);
}

return result;
}

// Load the game state from localStorage
// Load the game state from localStorage
function loadGame() {
const saveData = JSON.parse(localStorage.getItem(LOCALSTORAGE_KEY));

if (saveData) {
// Temporarily store the events from the base game state

// Load the saved game state
if (DO_LOAD) {
Object.assign(gameState, saveData.gameState);
gameState.elementStorage.forEach((element, index) => {
element.upgradeLevels = mergeAndFillArrays(ELEMENTS[index].UPGRADES, element.upgradeLevels, 0);
if (element.upgradeCosts.length < ELEMENTS[index].UPGRADES.length) {
element.upgradeCosts = mergeAndFillArrays(ELEMENTS[index].UPGRADES, element.upgradeCosts, 0);
let newCosts = element.upgradeCosts.slice();
element.upgradeCosts.forEach((cost, upgradeIndex) => {
if (cost == 0) {
newCosts[upgradeIndex] = ELEMENTS[index].UPGRADES[upgradeIndex].BASE_COST;
}
})
element.upgradeCosts = newCosts;
}
if (!element.hasOwnProperty("upgradeMultipliers")) {
element.upgradeMultipliers = Array(ELEMENTS[index].UPGRADES.length).fill(1);
}
element.upgradeMultipliers = mergeAndFillArrays(ELEMENTS[index].UPGRADES,
element.upgradeMultipliers,
1);
if (!element.hasOwnProperty("energyMultipliers")) {
element.energyMultipliers = Array(ELEMENTS[index].UPGRADES.length).fill(1);
}
element.energyMultipliers = mergeAndFillArrays(ELEMENTS[index].UPGRADES, element.energyMultipliers, 1);
})
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
gameState.selectedMenuIndex = 0;
initializeGame();
updateEnergy();
gameLoop();
}

// Calculate offline gains
function calculateOfflineGains(lastTimestamp) {
const currentTime = Date.now();
const elapsedSeconds = Math.min(MAX_OFFLINE_SECONDS, (currentTime - lastTimestamp) / 1000);
let offlineProgMsg = `You were away for ${formatNumber(elapsedSeconds)} seconds (Max: ${MAX_OFFLINE_SECONDS}) and produced:\n`;
gameState.elementStorage.forEach((element, index) => {
if (!element.locked) {
const productionPerSecond = getProduction(index);
const offlineProduction = productionPerSecond * elapsedSeconds;
offlineProgMsg = offlineProgMsg + `${formatNumber(offlineProduction)} ${ELEMENTS[index].NAME}\n`
element.count += offlineProduction; // Add offline production to element count
}
});

console.log(`Offline gains: ${elapsedSeconds} seconds simulated.`);

// Show the pop-up
openPopup("Welcome Back!",
offlineProgMsg,
["Close"],
[() => {
hidePopup();
}]);
}
function showPopup() {
const popup = document.getElementById("popup");
popup.classList.remove("hidden");
}
function hidePopup() {
const popup = document.getElementById("popup");

popup.classList.add("hidden");
const buttons = document.querySelectorAll(".popup-temp-btn"); // Replace 'class-name' with the target class
buttons.forEach(element => {
element.remove(); // Remove each element
});
}
function openPopup(title, message, buttonText, buttonApply) {
const popupMessage = document.getElementById("popup-message");
const popupTitle = document.getElementById("popup-title")
const popup = document.getElementById("popup");
popupTitle.textContent = title;
popupMessage.textContent = message;
showPopup();
buttonText.forEach((text, index) => {
let button = document.createElement("button");
button.textContent = text;
button.classList.add("popup-temp-btn");
button.addEventListener('click', buttonApply[index]);
popup.appendChild(button);
});
}

document.getElementById("save").addEventListener("click", () => saveGame());
document.getElementById("molecules-menu-btn").addEventListener('click', () => {
document.getElementById("element-menu").style.display = 'none';
document.getElementById("molecule-menu").style.display = 'flex';
gameState.selectedMenuIndex = 1;
})
document.getElementById("molecule-help-btn").addEventListener('click', () => {
openPopup(`Welcome to Molecules!`, `Each Molecule will cost a certain amount of elements (not energy!) but will give a production bonus to those specific elements as well!`, ["Close"], [() => {
hidePopup();
}]);
});
document.getElementById("elements-menu-btn").addEventListener('click', () => {
document.getElementById("element-menu").style.display = 'block';
document.getElementById("molecule-menu").style.display = 'none';
gameState.selectedMenuIndex = 0;
})
// Call loadGame when the game starts

window.onload = loadGame;
setInterval(saveGame, 15000); // Save every 30 seconds
// Initialize the game