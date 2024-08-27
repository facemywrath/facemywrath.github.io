document.addEventListener('DOMContentLoaded', function () {
  let upgradePoints = 0; // Initialize UpgradePoint variable
  let goldUnlocked = false;
  let gold = 0;
  let lastResetClick = 0;
  let resetClickCount = 0;
  let saveInterval = setInterval(() => saveGameState(), 2000);
  let saveInterrupt = false;

  const floors = [{
    id: 1, progress: 0, maxProgress: 10, elementId: 'floor1', cost: 10, unlocked: true, autoTick: 0, autoTickLevel: 0, autoTickEnabled: true, autoElementID: 'upgradeAutoTickFloor1', costElementID: null
  }
    
  ];


  function resetGameState() {
    clearInterval(saveInterval);
    saveInterrupt = true;
    localStorage.removeItem('idleGameSave');
    //   location.reload(); // Reload the page to reset everything
  }
  function hardReset() {
    if (Date.now() - lastResetClick > 2000) {
      lastResetClick = Date.now();
      resetClickCount = 1;
      return;
    }
    lastResetClick = Date.now();
    resetClickCount += 1;

    if (resetClickCount > 2) {
      resetGameState();
      location.reload();
    }
  }
  function saveGameState() {
    const gameState = {
      upgradePoints: upgradePoints,
      gold: gold,
      floors: floors.map(floor => ({
        id: floor.id,
        progress: floor.progress,
        unlocked: floor.unlocked,
        autoTick: floor.autoTick,
        autoTickEnabled: floor.autoTickEnabled,
        autoTickLevel: floor.autoTickLevel,
        cost: floor.cost,
        upgradeLevel: floor.upgradeLevel
      }))
    };
    if (!saveInterrupt) {
      localStorage.setItem('idleGameSave', JSON.stringify(gameState));
    }
  }

  function loadGameState() {
    const savedGameState = localStorage.getItem('idleGameSave');
    if (savedGameState) {
      const gameState = JSON.parse(savedGameState);
      upgradePoints = gameState.upgradePoints;
      gold = gameState.gold;
      goldUnlocked = gameState.goldUnlocked;
      if(goldUnlocked || gold > 0){
        const goldLabel = document.getElementById('gold');
        if (goldLabel) {
          goldLabel.textContent = 'Gold: ' + String(gold);
          goldLabel.style.display = 'block';
        }
      }
      gameState.floors.forEach(savedFloor => {
        if (savedFloor.id > 1) {
          addFloor();
        }
        const floor = floors.find(f => f.id === savedFloor.id);
        if (floor) {
          floor.progress = savedFloor.progress;
          floor.unlocked = savedFloor.unlocked;
          floor.autoTick = savedFloor.autoTick;
          floor.autoTickEnabled = savedFloor.autoTickEnabled;
          floor.autoTickLevel = savedFloor.autoTickLevel;
          floor.cost = savedFloor.cost;
          floor.upgradeLevel = savedFloor.upgradeLevel;

          updateProgressBar(floor);
          if (floor.unlocked) {
            revealFloor(floor);
            revealUpgradeOptions(floor.id);
          }
        }
      });

      updateUpgradePointsDisplay();
      updateUpgradeButtons();
      updateAutoTickButtons();
    }
  }

  function addFloor() {
    const lastFloor = floors[floors.length - 1];
    const newFloorId = lastFloor.id + 1;

    const newFloor = {
        id: newFloorId,
        progress: 0,
        maxProgress: 10,
        elementId: `floor${newFloorId}`,
        cost: 10,
        unlocked: false,
        upgradeLevel: 0,
        upgradeCost: newFloorId,
        autoTick: 0,
        autoTickLevel: 0,
        autoTickEnabled: true,
        autoElementID: `upgradeAutoTickFloor${newFloorId}`,
        costElementID: `upgradeFloor${newFloorId}`
    };

    floors.push(newFloor);

    const floorContainer = document.createElement('div');
    floorContainer.className = 'floor-container';
    floorContainer.id = `${newFloor.elementId}Container`;

    const autoTickToggle = document.createElement('input');
    autoTickToggle.type = 'checkbox';
    autoTickToggle.id = `autoTickFloor${newFloorId}Toggle`;
    autoTickToggle.className = 'auto-tick-toggle';
    autoTickToggle.checked = true;
    autoTickToggle.style.display = 'none';

    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    progressBar.id = `floor${newFloorId}Progress`;

    const floorDiv = document.createElement('div');
    floorDiv.className = 'floor';
    floorDiv.id = newFloor.elementId;

    const progressText = document.createElement('span');
    progressText.className = 'progress-text';
    progressText.textContent = `Beat Floor ${newFloorId}`;

    const progressCount = document.createElement('span');
    progressCount.className = 'progress-count';
    progressCount.id = `floor${newFloorId}Label`;
    progressCount.textContent = `0/10`;

    const progressFill = document.createElement('div');
    progressFill.className = 'progress-fill';
    progressFill.id = `floor${newFloorId}Fill`;

    const progressMarker = document.createElement('div');
    progressMarker.className = 'progress-marker';
    progressMarker.id = `floor${newFloorId}Marker`;

    progressBar.appendChild(progressMarker);  // Append marker first (z-index will handle the layer order)
    progressBar.appendChild(progressFill);    // Append the fill on top
    progressBar.appendChild(progressText);
    progressBar.appendChild(progressCount);

    floorDiv.appendChild(progressBar);
    floorContainer.appendChild(autoTickToggle);
    floorContainer.appendChild(floorDiv);

    const gameContainer = document.querySelector('.game-container');
    gameContainer.appendChild(floorContainer);

    const upgradeRow = document.createElement('div');
    upgradeRow.className = 'upgrade-row';
    upgradeRow.id = `upgradeRowFloor${newFloorId}`;

    const upgradeCostButton = document.createElement('button');
    upgradeCostButton.id = `upgradeFloor${newFloorId}`;
    upgradeCostButton.textContent = `Reduce Floor ${newFloorId} Cost (Level 0): ${newFloor.upgradeCost} Points`;
    upgradeCostButton.disabled = false;
    upgradeCostButton.addEventListener('click', () => upgradeFloorCost(newFloorId));

    const upgradeAutoTickButton = document.createElement('button');
    upgradeAutoTickButton.id = `upgradeAutoTickFloor${newFloorId}`;
    const upgradeCost = newFloorId + newFloor.autoTickLevel;
    upgradeAutoTickButton.textContent = `Increase Floor ${newFloorId} AutoTick (Level 0): ${upgradeCost} Points`;
    upgradeAutoTickButton.disabled = false;
    upgradeAutoTickButton.addEventListener('click', () => upgradeAutoTick(newFloorId));

    upgradeRow.appendChild(upgradeCostButton);
    upgradeRow.appendChild(upgradeAutoTickButton);

    const upgradesContainer = document.querySelector('.upgrades-container');
    upgradesContainer.appendChild(upgradeRow);

    // Set up event listeners for the new floor
    floorDiv.addEventListener('click', () => updateProgress(newFloor));
    autoTickToggle.addEventListener('change', () => {
        newFloor.autoTickEnabled = autoTickToggle.checked;
    });

    // Initialize the progress bar and marker for the new floor
    updateProgressBar(newFloor);
}

  function calculateIncrement(floor) {
    const nextFloor = floors[floor.id];
    return nextFloor ? Math.pow(1.2,
      nextFloor.progress): 1;
  }

  function updateProgress(floor) {
    if (floor.progress >= floor.maxProgress) return;

    const previousFloor = floor.id > 1 ? floors[floor.id - 2] : null;
    const maxIncrement = calculateIncrement(floor);
    let actualIncrement = maxIncrement;

    // Adjust actualIncrement if it exceeds maxProgress
    if (floor.progress + maxIncrement > floor.maxProgress) {
        actualIncrement = floor.maxProgress - floor.progress;
    }

    // Calculate the cost ratio based on the actual increment
    let decrement = floor.cost;
    if (actualIncrement < maxIncrement) {
        decrement *= actualIncrement / maxIncrement;
    }

    // Check if previousFloor has enough progress to cover the adjusted cost
    if (previousFloor && previousFloor.progress >= decrement) {
        previousFloor.progress -= decrement;
        updateProgressBar(previousFloor);
    } else if (previousFloor) {
        // If not enough progress, exit early
        return;
    }

    // Apply progress increment to the current floor
    floor.progress += actualIncrement;
    updateProgressBar(floor);

    // Handle upgrade points and revealing new floors or options if necessary
    if (isHighestFloor(floor)) {
        upgradePoints += (floor.id+gold) * (actualIncrement / maxIncrement);
        updateUpgradePointsDisplay();
    }

    if (floor.progress >= floor.maxProgress) {
        if (floor.id === 10) revealBeatDungeonButton();
        if (floor.id === floors.length) {
            addFloor();
            const nextFloor = floors[floor.id];
            revealFloor(nextFloor);
            revealUpgradeOptions(nextFloor.id);
        }
    }

    saveGameState(); // Save after each progress update
}

  function isHighestFloor(floor) {
    return floor.unlocked && floors.every(f => !f.unlocked || f.id <= floor.id);
  }

  function updateProgressBar(floor) {
    const fillElement = document.getElementById(`${floor.elementId}Fill`);
    const markerElement = document.getElementById(`${floor.elementId}Marker`);
    const labelElement = document.getElementById(`${floor.elementId}Label`);

    const cappedProgress = Math.min(floor.progress, floor.maxProgress);
    const nextFloorCost = floors[floor.id] ? floors[floor.id].cost : 10; // Use next floor cost or 10

    const progressPercentage = (cappedProgress / floor.maxProgress) * 100;
    fillElement.style.width = `${progressPercentage}%`;

    // Calculate the color based on the progress relative to the next floor's cost
    let color;
    if (cappedProgress >= nextFloorCost) {
        color = 'green';  // Fully funded
    } else if (cappedProgress >= nextFloorCost / 2) {
        color = 'yellow'; // Halfway to next floor
    } else {
        color = 'red';    // Less than halfway
    }
    fillElement.style.backgroundColor = color;

    // Calculate the marker position based on the cost of the next floor or 10
    const markerPercentage = (nextFloorCost / floor.maxProgress) * 100;
    if(markerElement){
    markerElement.style.width = `${markerPercentage}%`;
    }
    labelElement.textContent = `${cappedProgress.toFixed(2)}/${floor.maxProgress}`;
}

  function updateUpgradePointsDisplay() {
    const upgradePointsElement = document.getElementById('upgradePoints');
    const upgradePointsDisplayElement = document.getElementById('upgradePointsDisplay');

    upgradePointsElement.textContent = `Upgrade Points: ${upgradePoints.toFixed(2)}`;
    upgradePointsDisplayElement.textContent = `Upgrade Points: ${upgradePoints.toFixed(2)}`;
  }

  function revealFloor(floor) {
    const floorElement = document.getElementById(floor.elementId);
    floorElement.style.display = 'block';
    floor.unlocked = true;
  }

  function showUpgrades() {
    document.getElementById('gameView').style.display = 'none';
    document.getElementById('upgradesView').style.display = 'block';
  }

  function hideUpgrades() {
    document.getElementById('upgradesView').style.display = 'none';
    document.getElementById('gameView').style.display = 'block';
  }

  function upgradeFloorCost(floorId) {
    const floor = floors.find(f => f.id === floorId);
    if (upgradePoints >= floor.upgradeCost && floor.upgradeLevel < 9) {
      // Upgrade level capped at 9
      upgradePoints -= floor.upgradeCost;
      floor.cost = Math.max(1, floor.cost - 1); // Reduce cost by 1, minimum of 1
      floor.upgradeLevel += 1;
      floor.upgradeCost += 1; // Increase the upgrade cost by 1
      updateUpgradePointsDisplay();
      updateUpgradeButtons();
      saveGameState(); // Save after each upgrade
    }
  }

  function upgradeAutoTick(floorId) {
    const floor = floors.find(f => f.id === floorId);
    const upgradeCost = floor.id + floor.autoTickLevel;
    if (upgradePoints >= upgradeCost && floor.autoTickLevel < 10) {
      // AutoTick level capped at 10
      upgradePoints -= upgradeCost;
      floor.autoTick += 0.01;
      floor.autoTickLevel += 1;
      updateUpgradePointsDisplay();
      updateAutoTickButtons();
      saveGameState(); // Save after each autoTick upgrade
    }
  }

  function updateUpgradeButtons() {
    floors.forEach(floor => {
      if (floor.id > 1) {
        const upgradeButton = document.getElementById(`upgradeFloor${floor.id}`);
        upgradeButton.textContent = `Reduce Floor ${floor.id} Cost (Level ${floor.upgradeLevel}): ${floor.upgradeCost} Points`;
        upgradeButton.disabled = floor.upgradeLevel >= 9; // Disable button if at max upgrade level
      }
    });
  }

  function updateAutoTickButtons() {
    floors.forEach(floor => {
      checkCheckboxVisibility(floor);
      const autoTickButton = document.getElementById(`upgradeAutoTickFloor${floor.id}`);
      const upgradeCost = floor.id + floor.autoTickLevel;
      autoTickButton.textContent = `Increase Floor ${floor.id} AutoTick (Level ${floor.autoTickLevel}): ${upgradeCost} Points`;
      autoTickButton.disabled = floor.autoTickLevel >= 10; // Disable button if at max autoTick level
    });
  }

  function revealUpgradeOptions(floorId) {
    const floor = floors[floorId - 1]; // floorId - 1 because arrays are zero-indexed
    let upgradeRow = document.getElementById(`upgradeRowFloor${floorId}`);
    if (upgradeRow) {
      upgradeRow.style.display = 'flex';
    }
    let upgradeAuto = document.getElementById(floor.autoElementID);
    if (upgradeAuto) {
      upgradeAuto.style.display = 'flex';
    }
    let currentUpgradeCost = document.getElementById(floor.costElementID);
    if (currentUpgradeCost) {
      currentUpgradeCost.style.display = 'none';
    }

    if (floor.id > 1) {
      const previousFloor = floors[floor.id - 2];
      let upgradeCost = document.getElementById(previousFloor.costElementID);
      if (upgradeCost) {
        upgradeCost.style.display = 'flex';
      }
    }
  }

  function autoTickProgress() {
    floors.forEach(floor => {
        if (floor.unlocked && floor.autoTickEnabled && floor.progress < floor.maxProgress) {
            const increment = calculateIncrement(floor);
            const autoIncrement = floor.autoTick * increment;
            const cost = floor.autoTick * floor.cost;

            if (floor.id > 1) {
                const previousFloor = floors[floor.id - 2];
                if (previousFloor.progress >= cost) {
                    previousFloor.progress -= cost;
                    let incvalue = floor.progress + autoIncrement;
                    let upgradeInc = floor.autoTick * (gold + floor.id);

                    if (incvalue > floor.maxProgress) {
                        upgradeInc = upgradeInc * (floor.maxProgress - floor.progress) / autoIncrement;
                    }
                    if (isHighestFloor(floor)) {
                        upgradePoints += upgradeInc;
                    }
                    floor.progress = Math.min(incvalue, floor.maxProgress);
                }
            } else {
                let incvalue = floor.progress + autoIncrement;
                let upgradeInc = floor.autoTick * (floor.id+gold);

                if (incvalue > floor.maxProgress) {
                    upgradeInc = upgradeInc * (floor.maxProgress - floor.progress) / autoIncrement;
                }
                if (isHighestFloor(floor)) {
                    upgradePoints += upgradeInc;
                }
                floor.progress = Math.min(incvalue, floor.maxProgress);
            }
        }

        updateUpgradePointsDisplay();
        updateProgressBar(floor);

        if (floor.progress >= floor.maxProgress && floor.id == floors.length) {
            addFloor();
            const nextFloor = floors[floor.id];
            revealFloor(nextFloor);
            revealUpgradeOptions(nextFloor.id); // Reveal the upgrades for the next floor
        }
    });

    // saveGameState(); // Save after each auto-tick cycle
}


  function checkCheckboxVisibility(floor) {
    const autoTickToggle = document.getElementById(`autoTickFloor${floor.id}Toggle`);
    if (floor.unlocked && floor.autoTick > 0) {
      autoTickToggle.style.display = 'flex';
    } else {
      autoTickToggle.style.display = 'none';
    }
  }

  function initializeUpgradeVisibility() {
    floors.forEach(floor => {
      checkCheckboxVisibility(floor);
      if (isHighestFloor(floor)) {
        revealUpgradeOptions(floor.id);
      } else {
        const floorElement = document.getElementById(floor.elementId);
        floorElement.style.display = 'none'; // Ensure locked floors are hidden initially
      }
    });
  }


  setInterval(autoTickProgress, 100); // Auto-tick every 100 milliseconds
  document.getElementById('resetButton').addEventListener('click', () => hardReset());
  
  document.getElementById('openUpgradesButton').addEventListener('click', showUpgrades);
  document.getElementById('closeUpgradesButton').addEventListener('click', hideUpgrades);

  floors.forEach(floor => {
    document.getElementById(`upgradeAutoTickFloor${floor.id}`).addEventListener('click', () => upgradeAutoTick(floor.id));
    if (floor.id > 1) {
      document.getElementById(`upgradeFloor${floor.id}`).addEventListener('click', () => upgradeFloorCost(floor.id));
    }
  });

  floors.forEach(floor => {
    const floorElement = document.getElementById(floor.elementId);
    floorElement.addEventListener('click', () => updateProgress(floor));
    const autoTickToggle = document.getElementById(`autoTickFloor${floor.id}Toggle`);
    if (autoTickToggle) {
      autoTickToggle.addEventListener('change', () => {
        floor.autoTickEnabled = autoTickToggle.checked;
      });
    }
  });

  function revealBeatDungeonButton() {
    const beatDungeonButton = document.getElementById('beatDungeonButton');
    beatDungeonButton.style.display = 'block'; // Show the button

    // Scroll to the top to focus on the new button
    beatDungeonButton.scrollIntoView({
      behavior: 'smooth'
    });
  }

  // Function to reset the game and award gold when "Beat Dungeon" is clicked
  function beatDungeon() {
    // Award the player with 1 gold (implement your gold system here)
    gold = max(gold, floors.length);
    goldUnlocked = true;
    const goldLabel = document.getElementById('gold');
    if (goldLabel) {
      goldLabel.textContent = 'Gold: ' + String(gold);
      goldLabel.style.display = 'block';
    }
    upgradePoints = gold

    // Remove all HTML elements for floors and upgrades except for Floor 1
    floors.forEach(floor => {
      if (floor.id > 1) {
        // Skip Floor 1
        const floorContainer = document.getElementById(`${floor.elementId}Container`);
        const upgradeRow = document.getElementById(`upgradeRowFloor${floor.id}`);
        if (floorContainer) {
          floorContainer.remove(); // Remove the floor container
        }
        if (upgradeRow) {
          upgradeRow.remove(); // Remove the upgrade row
        }
      }
    });

    // Reset the floors array to only include Floor 1
    floors.splice(1); // Remove all elements after the first one

    // Reset Floor 1 values
    const floor1 = floors[0];
    floor1.progress = 0;
    floor1.unlocked = true;
    floor1.autoTick = 0;
    floor1.autoTickEnabled = true;
    floor1.autoTickLevel = 0;
    floor1.cost = 10; // Reset the cost to the initial value
    floor1.upgradeLevel = 0;

    // Reset Floor 1 progress bar and upgrades
    updateProgressBar(floor1);
    updateUpgradePointsDisplay();
    updateUpgradeButtons();
    updateAutoTickButtons();

    // Hide the "Beat Dungeon" button again
    document.getElementById('beatDungeonButton').style.display = 'none';

    // Add a new floor to start again


    // Save the reset game state
    saveGameState();
  }


  // Event listener for the "Beat Dungeon" button
  document.getElementById('beatDungeonButton').addEventListener('click', beatDungeon);
  initializeUpgradeVisibility();
  loadGameState(); // Load the saved game state if it exists

  updateUpgradePointsDisplay();
  updateUpgradeButtons();
  updateAutoTickButtons();
});