// Global game state
let score = 0;
let wordsSubmitted = 0; // Track words submitted for the progress bar
let highScore = 0;  // Track the high score
let letterPool = [];
let currentWord = "";
let minLetters = 10;
let currentLetters = 20;
let letterCooldowns = {};  // Object to track cooldowns for each letter index
let dictionary = {};  // To store the word dictionary

const vowels = {
  'A': 10, // Common
  'E': 12, // Very common
  'I': 9,  // Common
  'O': 8,  // Slightly less common
  'U': 6   // Less common
};

const consonants = {
  'B': 2,   // Less common
  'C': 4,   // Moderately common
  'D': 5,   // Common
  'F': 3,   // Less common
  'G': 4,   // Moderately common
  'H': 6,   // Common
  'J': 1,   // Rare
  'K': 1,   // Rare
  'L': 7,   // Common
  'M': 5,   // Common
  'N': 9,   // Very common
  'P': 3,   // Moderately common
  'Q': 1,   // Very rare
  'R': 8,   // Common
  'S': 10,  // Very common
  'T': 12,  // Very common
  'V': 2,   // Less common
  'W': 3,   // Moderately common
  'X': 1,   // Very rare
  'Y': 2,   // Less common
  'Z': 1    // Very rare
};

const wordInput = document.getElementById("word-input");
const scoreDisplay = document.getElementById("current-score");
const highScoreDisplay = document.getElementById("highscore");  // Display for the high score
const submitWordButton = document.getElementById("submit-word");
const backspaceButton = document.getElementById("backspace-btn");

// Track the indices of the letters used in the current word
let usedLetterIndices = [];

// Initialize the game
function initGame() {
    loadHighScore();  // Load high score from localStorage
    loadDictionary();  // Load the dictionary
}

// Load the dictionary from the JSON file
function loadDictionary() {
    fetch('words_dictionary.json')
        .then(response => response.json())
        .then(data => {
            dictionary = data;  // Store the dictionary
            generateLetters();
            updateUI();
        })
        .catch(error => {
            console.error('Error loading dictionary:', error);
        });
}

// Load high score from localStorage
function loadHighScore() {
    const savedHighScore = localStorage.getItem('wordforge_highscore');
    if (savedHighScore !== null) {
        highScore = parseInt(savedHighScore, 10);  // Convert the saved score to a number
        highScoreDisplay.textContent = `High Score: ${highScore}`;  // Display the loaded high score
    }
}

// Save high score to localStorage
function saveHighScore() {
    localStorage.setItem('wordforge_highscore', highScore);  // Save the new high score
}

// Generate random letters for the pool with cooldowns initialized to their max values
function generateLetters() {
    const vowelCount = Math.random() < 0.5 ? 3 : 4;  // Randomly choose between 3 or 4 vowels
    const consonantCount = currentLetters - vowelCount;  // Remaining letters will be consonants
    letterPool = [];
    letterCooldowns = {};  // Reset cooldowns for every new letter pool

    // Pick random vowels and initialize their cooldown to 1
    for (let i = 0; i < vowelCount; i++) {
        const randomVowel = weightedRandom(vowels);
        letterPool.push(randomVowel);
        letterCooldowns[i] = 0;  // Vowels start with no cooldown
    }

    // Pick random consonants and initialize their cooldown to 0
    for (let i = 0; i < consonantCount; i++) {
        const randomConsonant = weightedRandom(consonants);
        letterPool.push(randomConsonant);
        letterCooldowns[vowelCount + i] = 0;  // Consonants start with no cooldown
    }

    // Shuffle the letter pool to mix vowels and consonants
    letterPool = letterPool.sort(() => Math.random() - 0.5);

    // Ensure the letters are displayed
    displayLetters();
}

// Function to update the UI
function updateUI() {
    // Update the display of the current word
    wordInput.textContent = currentWord || '_';

    // Update the score display
    scoreDisplay.textContent = `Score: ${score}`;

    // If there's a new high score, update the high score display and save it
    if (score > highScore) {
        highScore = score;
        highScoreDisplay.textContent = `High Score: ${highScore}`;
        saveHighScore();
    }
}

// Display the letter pool and manage cooldowns in a keyboard-like grid
function displayLetters() {
    const keyboardContainer = document.getElementById("keyboard-container");
    keyboardContainer.innerHTML = '';  // Clear previous letters

    // Define the row lengths to mimic a keyboard layout (6, 7, 7)
    const rowLengths = [6, 7, 7];
    let letterIndex = 0;

    // Create rows for the keyboard layout
    rowLengths.forEach(rowLength => {
        const rowDiv = document.createElement('div');
        rowDiv.classList.add('keyboard-row');  // Apply the row styling

        // Add letters to the current row
        for (let i = 0; i < rowLength; i++) {
            if (letterIndex >= letterPool.length) break;  // Safety check to avoid overflow

            const letter = letterPool[letterIndex];
            const keyDiv = document.createElement('div');
            keyDiv.classList.add('key');
            keyDiv.textContent = letter;
            keyDiv.setAttribute('data-index', letterIndex);

            // Ensure the correct index is passed by using a closure
            keyDiv.addEventListener('click', (function(currentIndex) {
                return function() {
                    addLetterToWord(currentIndex);
                };
            })(letterIndex));

            rowDiv.appendChild(keyDiv);
            letterIndex++;
        }

        keyboardContainer.appendChild(rowDiv);  // Add the row to the container
    });

    // After rendering, update the cooldown colors for all letters
    letterPool.forEach((_, index) => {
        updateCooldownColor(index);
    });
}

// Add letter to word by index
function addLetterToWord(index) {
    console.log(`Letter ${index} pressed, cooldown: ${letterCooldowns[index]}`);
    if (letterCooldowns[index] === 0) {  // Only allow if no cooldown
        currentWord += letterPool[index];  // Add the letter to the word
        usedLetterIndices.push(index);  // Track which specific letter was used
        disableLetter(index);  // Disable the button after it's used
        updateCooldownColor(index);
        updateUI();  // Update the UI to reflect the changes
        updateSubmitButton();  // Update submit button state
    }
}

// Manage letter cooldowns after submitting a word (tick down cooldowns)
function manageCooldowns() {
    Object.keys(letterCooldowns).forEach(index => {
        if (letterCooldowns[index] > 0) {
            letterCooldowns[index]--;
        }
        if (letterCooldowns[index] === 0) {
            enableLetter(index);
        }
        updateCooldownColor(index);
    });

    usedLetterIndices.forEach(index => {
        if (letterCooldowns[index] === 0) {
            if ((letterPool[index]).toUpperCase() in vowels) {
                letterCooldowns[index] = 1;
                disableLetter(index);
            } else {
                letterCooldowns[index] = 2;
                disableLetter(index);
            }
        }
        updateCooldownColor(index);
    });

    // Clear the used letter indices after applying cooldowns
    usedLetterIndices = [];
}

// Update button color based on the cooldown state
function updateCooldownColor(index) {
    const letterButton = document.querySelector(`[data-index='${index}']`);
    if (letterButton) {
        let cd = letterCooldowns[index];
        let color = "#d3d3d3";  // Default color
        if (cd == 1) {
            color = "#bb9977";  // Color for cooldown 1
        } else if (cd == 2) {
            color = "#ff0000";  // Color for cooldown 2
        }
        else if(cd === 0 && usedLetterIndices.includes(index)){
          color = "#444444"
        }
        console.log(`Setting color of button ${index} to ${color}`);
        letterButton.style.backgroundColor = color;
    }
}

// Disable a letter button (after it's used)
function disableLetter(index) {
    const letterButton = document.querySelector(`[data-index='${index}']`);
    if (letterButton) {
        letterButton.style.pointerEvents = 'none';  // Disable button
        console.log(`Disabling button at index ${index}`);
    }
}

// Enable a letter button (after cooldown is over)
function enableLetter(index) {
    const letterButton = document.querySelector(`[data-index='${index}']`);
    if (letterButton) {
        letterButton.style.pointerEvents = 'auto';  // Enable button
        console.log(`Enabling button at index ${index}`);
    }
}

// Submit the current word and validate it against the dictionary
submitWordButton.addEventListener("click", () => {
    if (currentWord.length > 2) {
        if (validateWord(currentWord)) {
            score += currentWord.length;  // Score based on word length
            wordsSubmitted++;  // Increment words submitted
            manageCooldowns();  // Apply cooldowns after submitting the word
            currentWord = "";  // Reset the word
            updateUI();
            updateProgressBar();  // Update progress bar and handle letter removal
        } else {
            alert('Invalid word! Please try again.');
            usedLetterIndices = [];
            currentWord = "";  // Reset the word for another try
            updateUI();
        }
    }
});

// Update the progress bar based on words submitted
function updateProgressBar() {
    const progressbarDiv = document.getElementById("progress-bar");
    const progress = wordsSubmitted % 10; // Progress towards the next 10 words
    
    if (progressbarDiv) {
        progressbarDiv.setAttribute('value', progress);

        // Check if the progress bar has completed a cycle (i.e., 10 words)
        if (progress === 0 && wordsSubmitted > 0) {
            if (letterPool.length > minLetters) {
                // Remove letters for every 10 words submitted
                while (letterPool.length > minLetters && letterPool.length > (20 - wordsSubmitted / 10)) {
                    removeRandomLetter();
                }
                generateLetters();
            }else{
              generateLetters();
            }
        } 
    }
}

// Function to remove a random letter from the pool
function removeRandomLetter() {
    const randomIndex = Math.floor(Math.random() * letterPool.length);
    letterPool.splice(randomIndex, 1);  // Remove the letter from the pool
    currentLetters--;
    displayLetters();  // Re-render the letters
}

// Validate the word against the dictionary
function validateWord(word) {
    return dictionary[word.toLowerCase()] === 1;  // Check if the word exists in the dictionary
}

// Handle backspace button click
backspaceButton.addEventListener('click', () => {
    if (currentWord.length > 0) {
        const lastLetterIndex = usedLetterIndices.pop();  // Get the last used letter index
        updateCooldownColor(lastLetterIndex);
        currentWord = currentWord.slice(0, -1);  // Remove the last letter from the word
        enableLetter(lastLetterIndex);  // Enable the button for that letter
        
        updateUI();
        updateSubmitButton();  // Update submit button state
    }
});

// Update the submit button state
function updateSubmitButton() {
    submitWordButton.disabled = currentWord.length <= 2 || !validateWord(currentWord);
}

// Function to select a random letter based on weighted probabilities
function weightedRandom(letters) {
    const totalWeight = Object.values(letters).reduce((acc, weight) => acc + weight, 0);
    let randomNum = Math.random() * totalWeight;
    
    for (const [letter, weight] of Object.entries(letters)) {
        if (randomNum < weight) {
            return letter;
        }
        randomNum -= weight;
    }
}

// Initialize the game on page load
window.onload = function() {
    initGame();
};