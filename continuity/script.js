let dictionary = {};
let currentWord = '';
let usedWordIndices = []; // This will store the indices of used words
let score = 0;
let highscore = 0; // Store highscore
let wordList = [];
let currentGuess = '';  // Current guess for the word
let timeLimit = 30; // Initial time limit per guess
let timerInterval;  // Reference to the timer interval
const minTimeLimit = 10; // Minimum time limit

// Fetch the JSON dictionary when the page loads
fetch('words_dictionary.json')
    .then(response => response.json())
    .then(data => {
        dictionary = data;
        wordList = Object.keys(dictionary); // Create a list of words from the keys
        
        // Check if the wordList is loaded properly
        if (wordList.length > 0) {
            loadHighscore();  // Load highscore from localStorage
            startGame();  // Start the game once the word list is ready
            setupKeyboard();  // Initialize the keyboard
        } else {
            console.error("Word list is empty or failed to load.");
        }
    })
    .catch(error => console.error('Error loading dictionary:', error));

// Initialize the game
function startGame() {
    
        // Otherwise, start with a random word
        currentWord = wordList[Math.floor(Math.random() * wordList.length)];
    
    updateCurrentWordDisplay();
    resetTimer();  // Start the timer
}

// Update the display to show the current word with the first letter capitalized
function updateCurrentWordDisplay() {
    if (currentWord) {
        const capitalizedWord = currentWord.charAt(0).toUpperCase() + currentWord.slice(1);
        document.getElementById('current-word').textContent = capitalizedWord;
    } else {
        document.getElementById('current-word').textContent = 'Loading...';
    }
}

// Timer logic
function resetTimer() {
    clearInterval(timerInterval);  // Clear any previous timers
    let timeRemaining = timeLimit;
    const timerElement = document.getElementById('timer');
    
    timerElement.textContent = `Time: ${timeRemaining.toFixed(1)}s`;
    
    timerInterval = setInterval(() => {
        timeRemaining -= 0.1;
        timerElement.textContent = `Time: ${timeRemaining.toFixed(1)}s`;

        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            endGame();  // End the game if the timer runs out
        }
    }, 100);  // Update every 100ms (0.1 seconds)
}

// End the game when the timer runs out
function endGame() {
    alert(`Time's up! Your final score is ${score}.`);
    checkHighscore();  // Check if the highscore needs to be updated
    score = 0;  // Reset score
    usedWordIndices = [];  // Reset used words
    timeLimit = 20;  // Reset the time limit for a new game
    saveProgress();  // Save the final highscore
    updateScoreDisplay();  // Update score display to show reset score
    currentWord = wordList[Math.floor(Math.random() * wordList.length)];
    updateCurrentWordDisplay();
    resetTimer();
}

// Set up the custom keyboard
function setupKeyboard() {
    const keyboardContainer = document.getElementById('keyboard-container');
    keyboardContainer.innerHTML = ''; // Clear the previous keyboard if any

    const keyboardLayout = [
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
        ['Z', 'X', 'C', 'V', 'B', 'N', 'M', 'Back']
    ];

    keyboardLayout.forEach(row => {
        const rowDiv = document.createElement('div');
        rowDiv.classList.add('keyboard-row');

        row.forEach(key => {
            const keyDiv = document.createElement('div');
            keyDiv.classList.add('key');
            keyDiv.textContent = key;
            keyDiv.setAttribute('data-letter', key);  // Data attribute for the key

            // Handle backspace key differently
            if (key === 'Back') {
                keyDiv.style.width = '90px';  // Make Back key larger
                keyDiv.setAttribute('data-letter', 'Back');
            }

            keyDiv.addEventListener('click', () => {
                if (key === 'Back') {
                    handleBackspaceClick();
                } else {
                    handleLetterClick(key);
                }
            });

            rowDiv.appendChild(keyDiv);
        });

        keyboardContainer.appendChild(rowDiv);
    });
}

// Handle letter clicks
function handleLetterClick(letter) {
    currentGuess += letter.toLowerCase();
    displayCurrentGuess();
    updateSubmitButton();  // Update the submit button based on validity
}

// Handle backspace click
function handleBackspaceClick() {
    currentGuess = currentGuess.slice(0, -1);  // Remove the last letter
    displayCurrentGuess();
    updateSubmitButton();  // Revalidate after deleting a letter
}

// Display the current guess
function displayCurrentGuess() {
    document.getElementById('guess').textContent = currentGuess.toUpperCase();
}

// Check if the current guess is a valid word and hasn't been used yet
function updateSubmitButton() {
    const guessIndex = wordList.indexOf(currentGuess.toLowerCase());
    const submitButton = document.getElementById('submit-btn');
    const lastLetter = currentWord[currentWord.length-1]
    const firstLetter = currentGuess[0]
    if (guessIndex !== -1 && !usedWordIndices.includes(guessIndex) && firstLetter == lastLetter && currentGuess.length > 1) {
        // If the word is valid and hasn't been used, enable the button
        submitButton.disabled = false;
        submitButton.style.backgroundColor = '#4CAF50';  // Reset to original green color
    } else if (guessIndex !== -1 && usedWordIndices.includes(guessIndex)) {
        // If the word has already been used, show red button
        submitButton.disabled = true;
        submitButton.style.backgroundColor = 'red';  // Change to red for used word
    } else {
        // If the word is invalid, disable the button and reset to original color
        submitButton.disabled = true;
        submitButton.style.backgroundColor = '#d3d3d3';  // Reset to original disabled color
    }
}

// Handle submit button
function handleSubmit() {
    const guessIndex = wordList.indexOf(currentGuess.toLowerCase());
    const lastLetter = currentWord[currentWord.length-1]
    const firstLetter = currentGuess[0]
    if (guessIndex !== -1 && !usedWordIndices.includes(guessIndex) && lastLetter == firstLetter && currentGuess.length > 1) {
        // Store the word's index to mark it as used
        usedWordIndices.push(guessIndex);
        
        // Set the current guess as the next word
        currentWord = currentGuess;
        
        score += currentGuess.length;  // Increment score
        updateScoreDisplay();  // Update score display
        checkHighscore();  // Check if the highscore needs to be updated
        saveProgress();  // Save progress to local storage
        
        updateCurrentWordDisplay();  // Display the new current word
        currentGuess = currentWord[currentWord.length-1];  // Reset the guess
        displayCurrentGuess();  // Update the display
        updateSubmitButton();  // Disable submit until valid
        
        // Decrease the time limit, ensuring it doesn't go below the minimum
        timeLimit = Math.max(minTimeLimit, timeLimit - 0.25);
        resetTimer();  // Reset the timer for the next round
    }
}

// Update the score display
function updateScoreDisplay() {
    document.getElementById('current-score').textContent = `Score: ${score}`;
}

// Check and update the highscore
function checkHighscore() {
    if (score > highscore) {
        highscore = score;  // Update highscore if current score exceeds it
        document.getElementById('highscore').textContent = `Highscore: ${highscore}`;
        saveHighscore();  // Save the new highscore to localStorage
    }
}

// Save progress to local storage
function saveProgress() {
    localStorage.setItem('continuity_usedWordIndices', JSON.stringify(usedWordIndices));
    localStorage.setItem('continuity_score', score);
    localStorage.setItem('continuity_currentWord', currentWord);  // Save the current word to prevent resetting
}

// Load highscore from localStorage
function loadHighscore() {
    const savedHighscore = localStorage.getItem('continuity_highscore');
    if (savedHighscore !== null) {
        highscore = parseInt(savedHighscore, 10);  // Load and convert to number
        document.getElementById('highscore').textContent = `Highscore: ${highscore}`;
    }
}

// Save highscore to localStorage
function saveHighscore() {
    localStorage.setItem('continuity_highscore', highscore);
}

// Event listeners
document.getElementById('submit-btn').addEventListener('click', handleSubmit);

// Initialize the game when the page loads
window.onload = function() {
    if (localStorage.getItem('continuity_usedWordIndices')) {
        usedWordIndices = JSON.parse(localStorage.getItem('continuity_usedWordIndices'));
        score = parseInt(localStorage.getItem('continuity_score'));
        updateScoreDisplay();  // Update score display on load
    }

    startGame();  // Start the game after loading any saved data
};