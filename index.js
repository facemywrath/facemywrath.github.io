document.addEventListener('DOMContentLoaded', function () {
    let upgradePoints = 0; // Initialize UpgradePoint variable

    const floors = [
        { id: 1, progress: 0, maxProgress: 10, elementId: 'floor1', cost: 10, unlocked: true, autoTick: 0, autoTickLevel: 0, autoTickEnabled: true, autoElementID: 'upgradeAutoTickFloor1', costElementID: null},
        /* Additional floors can be added here if needed */
    ];
   // resetGameState();
    function resetGameState() {
        localStorage.removeItem('idleGameSave');
     //   location.reload(); // Reload the page to reset everything
    }
    function saveGameState() {
        const gameState = {
            upgradePoints: upgradePoints,
            floors: floors.map(floor => ({
                id: floor.id,
                progress: floor.progress,
                unlocked: floor.unlocked,
                autoTick: floor.autoTick,
                autoTickEnabled: floor.autoTickEnabled,
                autoTickLevel: floor.autoTickLevel,
                cost: floor.cost,
                upgradeLevel: floor.upgradeLevel,
            }))
        };
        localStorage.setItem('idleGameSave', JSON.stringify(gameState));
    }

    function loadGameState() {
        const savedGameState = localStorage.getItem('idleGameSave');
        if (savedGameState) {
            const gameState = JSON.parse(savedGameState);
            upgradePoints = gameState.upgradePoints;

            gameState.floors.forEach(savedFloor  => {
                if(savedFloor.id > 1) {
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

        progressBar.appendChild(progressFill);
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

        floorDiv.addEventListener('click', () => updateProgress(newFloor));
        autoTickToggle.addEventListener('change', () => {
            newFloor.autoTickEnabled = autoTickToggle.checked;
        });
    }

    function calculateIncrement(floor) {
        const nextFloor = floors[floor.id];
        return nextFloor ? Math.pow(1.2, nextFloor.progress) : 1;
    }

    function updateProgress(floor) {
        if (floor.progress >= floor.maxProgress) {
            return;
        }

        if (floor.id > 1) {
            const previousFloor = floors[floor.id - 2];
            if (previousFloor.progress < floor.cost) {
                return;
            }

            previousFloor.progress -= floor.cost;
            updateProgressBar(previousFloor);
        }

        let upgradeInc = floor.id;
        const increment = calculateIncrement(floor);
        floor.progress += increment;

        if(floor.progress > floor.maxProgress){
            const percentOver = (floor.progress-floor.maxProgress)/increment;
            const percentUnder = 1-percentOver;
            upgradeInc *= percentUnder;
            if(floor.id > 1) {
                const previousFloor = floors[floor.id-2];
                previousFloor.progress += floor.cost * percentOver;
            }
            floor.progress = floor.maxProgress;
        }
        
        updateProgressBar(floor);
    
        if (isHighestFloor(floor)) {
            upgradePoints += upgradeInc;
            updateUpgradePointsDisplay();
        }
    
        if (floor.progress >= floor.maxProgress ){
          if(floor.id == 10){
            revealBeatDungeonButton();
            }
            if(floor.id == floors.length){
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
        const labelElement = document.getElementById(`${floor.elementId}Label`);

        const cappedProgress = Math.min(floor.progress, floor.maxProgress);

        const progressPercentage = (cappedProgress / floor.maxProgress) * 100;
        fillElement.style.width = `${progressPercentage}%`;

        if (progressPercentage >= 100) {
            fillElement.style.backgroundColor = 'green';
        } else if (progressPercentage >= 50) {
            fillElement.style.backgroundColor = 'yellow';
        } else {
            fillElement.style.backgroundColor = 'red';
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
        if (upgradePoints >= floor.upgradeCost && floor.upgradeLevel < 9) { // Upgrade level capped at 9
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
        if (upgradePoints >= upgradeCost && floor.autoTickLevel < 10) { // AutoTick level capped at 10
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
                        let upgradeInc = floor.autoTick * floor.id;

                        if (incvalue > floor.maxProgress) {
                            upgradeInc = upgradeInc * (floor.maxProgress - floor.progress) / autoIncrement;
                        }
                        if (isHighestFloor(floor)) {
                            upgradePoints += upgradeInc;
                        }
                        floor.progress = Math.min(incvalue, floor.maxProgress);
                    }
                } else {
                    floor.progress = Math.min(floor.maxProgress, floor.progress + autoIncrement);
                }
                updateUpgradePointsDisplay();
                updateProgressBar(floor);
            }

            if (floor.progress >= floor.maxProgress && floor.id == floors.length) {
                addFloor();
                const nextFloor = floors[floor.id];
                revealFloor(nextFloor);
                revealUpgradeOptions(nextFloor.id); // Reveal the upgrades for the next floor
            }
        });

        saveGameState(); // Save after each auto-tick cycle
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
    beatDungeonButton.scrollIntoView({ behavior: 'smooth' });
}

// Function to reset the game and award gold when "Beat Dungeon" is clicked 
function beatDungeon() {
    // Award the player with 1 gold (implement your gold system here)
    let gold = parseInt(localStorage.getItem('gold') || '0', 10);
    gold += 1;
    localStorage.setItem('gold', gold.toString());
    
    upgradePoints = 0;

    // Remove all HTML elements for floors and upgrades except for Floor 1
    floors.forEach(floor => {
        if (floor.id > 1) { // Skip Floor 1
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