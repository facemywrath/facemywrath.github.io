document.addEventListener('DOMContentLoaded', () => {
    // Global variables
    let wordLength = 5;
    let maxGuesses = 6;
    let currentGuess = '';
    let guesses = [];
    let gameOver = false;
    let word = '';
    let score = 0;
    let highscore = 0;
    
    // Keyboard letter status
    let keyboardStatus = {}; // Tracks the status of each key

    // Word list
    let wordList = [];

    // DOM elements
    const guessesDiv = document.getElementById('guesses');
    const currentGuessDiv = document.getElementById('current-guess');
    const submitButton = document.getElementById('submit-button');
    const messageDiv = document.getElementById('message');
    const currentScoreDiv = document.getElementById('current-score'); // For displaying current score
    const highscoreDiv = document.getElementById('highscore'); // For displaying highscore
    const keyboardContainer = document.getElementById('keyboard-container');

    // Colors for guess feedback
    const COLORS = {
        correct: 'green',      // Correct letter and position
        present: 'yellow',     // Correct letter, wrong position
        absent: '#888888'      // Light grey for letters not in word
    };

    // Load word list from text file
    function loadWordList() {
        fetch('valid-wordle-words.txt')
            .then(response => response.text())
            .then(data => {
                wordList = data.split('\n').map(word => word.trim().toLowerCase());
                initGame(); // Initialize game after the word list is loaded
            })
            .catch(error => {
                console.error('Error loading word list:', error);
            });
    }

    // Generate a random word
    function getRandomWord() {
        const validWords = wordList.filter(w => w.length === wordLength);
        return validWords[Math.floor(Math.random() * validWords.length)];
    }

    // Display guesses with color-coded feedback, horizontally aligned
    function displayGuesses() {
        guessesDiv.innerHTML = ''; // Clear previous guesses

        guesses.forEach(({ guess, colors }) => {
            const guessRowDiv = document.createElement('div');
            guessRowDiv.classList.add('guess-row'); // Create a row for each guess

            guess.split('').forEach((letter, index) => {
                const letterDiv = document.createElement('div');
                letterDiv.classList.add('guess-letter');
                letterDiv.textContent = letter.toUpperCase();
                letterDiv.style.backgroundColor = colors[index]; // Apply color based on feedback
                guessRowDiv.appendChild(letterDiv); // Add each letter to the row
            });

            guessesDiv.appendChild(guessRowDiv); // Add the row of letters to the main container
        });
    }

    // Display current guess
    function displayCurrentGuess() {
        currentGuessDiv.textContent = currentGuess.padEnd(wordLength, '_').toUpperCase();
    }

    // Compare words and generate feedback colors
    function compareWords(word, guess) {
        const resultColors = new Array(wordLength).fill(COLORS.absent);  // Default all to grey
        const wordArr = word.split('');
        const guessArr = guess.split('');

        // First pass: Mark correct letters (green)
        guessArr.forEach((letter, index) => {
            if (letter === wordArr[index]) {
                resultColors[index] = COLORS.correct; // Mark as green (correct position)
                wordArr[index] = null; // Remove this letter from further checks
                updateKeyboardColor(letter, 'correct');
            }
        });

        // Second pass: Mark present but wrong position letters (yellow)
        guessArr.forEach((letter, index) => {
            if (resultColors[index] !== COLORS.correct && wordArr.includes(letter)) {
                resultColors[index] = COLORS.present; // Mark as yellow (correct letter, wrong position)
                wordArr[wordArr.indexOf(letter)] = null; // Remove from further checks
                updateKeyboardColor(letter, 'present');
            } else if (resultColors[index] === COLORS.absent) {
                updateKeyboardColor(letter, 'absent');
            }
        });

        return resultColors;
    }

    // Update the keyboard color
    function updateKeyboardColor(letter, status) {
        const key = document.querySelector(`.key[data-letter="${letter.toUpperCase()}"]`);
        if (!key) return;

        // Prioritize 'correct' over 'present' and 'present' over 'absent'
        if (keyboardStatus[letter] === 'correct') return; // Already correct, no need to downgrade
        if (keyboardStatus[letter] === 'present' && status === 'absent') return; // Don't overwrite present with absent

        keyboardStatus[letter] = status; // Update keyboard status

        // Apply the color based on the status
        if (status === 'correct') {
            key.style.backgroundColor = COLORS.correct;
        } else if (status === 'present') {
            key.style.backgroundColor = COLORS.present;
        } else if (status === 'absent') {
            key.style.backgroundColor = COLORS.absent;
        }
    }

    // Reset keyboard colors to default
    function resetKeyboardColors() {
        const keys = document.querySelectorAll('.key');
        keys.forEach(key => {
            key.style.backgroundColor = '#d3d3d3'; // Reset to the default keyboard color
        });
    }

    // Handle letter clicks
    function handleLetterClick(letter) {
        if (currentGuess.length < wordLength && !gameOver) {
            currentGuess += letter.toLowerCase();
            displayCurrentGuess();
            updateSubmitButton();
        }
    }

    // Handle backspace click
    function handleBackspaceClick() {
        currentGuess = currentGuess.slice(0, -1);
        displayCurrentGuess();
        updateSubmitButton();
    }

    // Handle submit button
    function handleSubmit() {
        if (currentGuess.length === wordLength && !gameOver) {
            const colors = compareWords(word, currentGuess);
            guesses.push({ guess: currentGuess, colors }); // Store guess and color feedback
            displayGuesses();

            if (currentGuess === word) {
                // Player wins, increment score based on remaining guesses
                score += maxGuesses - guesses.length + 1; // More points for fewer guesses
                
                if (score > highscore) {
                    highscore = score; // Update highscore if applicable
                    saveHighscore(); // Save highscore in localStorage
                }
                updateScore();
                messageDiv.textContent = `You guessed it! +${maxGuesses - guesses.length + 1} points!`;

                gameOver = true;
                resetGame(); // Reset after a win
            } else if (guesses.length === maxGuesses) {
                // Player loses, reset score
                score = 0; // Reset score on loss
                updateScore();
                messageDiv.textContent = `Game over! The word was ${word.toUpperCase()}.`;

                gameOver = true;
                resetGame(); // Reset after a loss
            }

            currentGuess = '';
            displayCurrentGuess();
            updateSubmitButton();
        }
    }

    // Update score and highscore in the UI
    function updateScore() {
        currentScoreDiv.textContent = `Score: ${score}`;
        highscoreDiv.textContent = `Highscore: ${highscore}`;
    }

    // Save highscore to localStorage
    function saveHighscore() {
        localStorage.setItem('wordle_highscore', highscore);
    }

    // Load highscore from localStorage
    function loadHighscore() {
        const savedHighscore = localStorage.getItem('wordle_highscore');
        if (savedHighscore !== null) {
            highscore = parseInt(savedHighscore, 10); // Load and convert to number
        }
        updateScore(); // Update the UI
    }

    // Update submit button state
    function updateSubmitButton() {
        const isValidWord = wordList.includes(currentGuess.toLowerCase());
        submitButton.disabled = currentGuess.length !== wordLength || !isValidWord;
    }

    // Reset game after win/loss
    function resetGame() {
        setTimeout(() => {
            initGame();
        }, 3500); // Delay for 2 seconds before resetting
    }

    // Set up keyboard
    const keyboardLayout = [
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
        ['Z', 'X', 'C', 'V', 'B', 'N', 'M', 'Back']
    ];

    // Create keyboard rows
    keyboardLayout.forEach(row => {
        const rowDiv = document.createElement('div');
        rowDiv.classList.add('keyboard-row');

        row.forEach(key => {
            const keyDiv = document.createElement('div');
            keyDiv.classList.add('key');
            keyDiv.textContent = key;
            keyDiv.setAttribute('data-letter', key); // Add data attribute for identifying the key

            // Handle backspace key differently
            if (key === 'Back') {
                keyDiv.style.width = '90px'; // Make Back key larger
                keyDiv.setAttribute('data-letter','Back');
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

    // Initialize game
    function initGame() {
        word = getRandomWord();
        displayCurrentGuess();
        messageDiv.textContent = '';
        guesses = [];
        keyboardStatus = {}; // Reset keyboard status
        resetKeyboardColors(); // Reset keyboard colors
        displayGuesses();
        gameOver = false;
    }

    // Load the highscore on page load
    loadHighscore();

    // Load the word list and start the game
    loadWordList();

    // Event listeners
    submitButton.addEventListener('click', handleSubmit);
});