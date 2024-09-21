let dictionary = {};
let currentWord = '';
let usedWordIndices = []; // This will store the indices of used words
let score = 0;
let wordList = [];

// Fetch the JSON dictionary when the page loads
fetch('words_dictionary.json')
    .then(response => response.json())
    .then(data => {
        dictionary = data;
        wordList = Object.keys(dictionary); // Create a list of words from the keys
        startGame();
    })
    .catch(error => console.error('Error loading dictionary:', error));

// Initialize the game
function startGame() {
    if (usedWordIndices.length > 0) {
        // If we have previously used words, continue from the last one
        currentWord = wordList[usedWordIndices[usedWordIndices.length - 1]];
    } else {
        // Otherwise, start with a random word
        currentWord = wordList[Math.floor(Math.random() * wordList.length)];
    }
    document.getElementById('current-word').textContent = currentWord;
}

// Add event listener to the submit button
document.getElementById('submit-btn').addEventListener('click', () => {
    const userWord = document.getElementById('word-input').value.toLowerCase();
    const feedback = document.getElementById('feedback');

    if (userWord === '') {
        feedback.textContent = 'Please enter a word!';
        return;
    }

    // Check if the word starts with the last letter of the current word
    if (userWord[0] === currentWord[currentWord.length - 1]) {
        // Check if the word is in the dictionary (the keys) and hasn't been used
        const wordIndex = wordList.indexOf(userWord);
        if (wordIndex !== -1 && !usedWordIndices.includes(wordIndex)) {
            currentWord = userWord;
            usedWordIndices.push(wordIndex);
            score += 1;
            document.getElementById('current-word').textContent = currentWord;
            document.getElementById('score').textContent = score;
            feedback.textContent = 'Good job!';
            saveProgress();  // Autosave after each valid submission
        } else {
            feedback.textContent = 'Word has been used or is invalid!';
        }
    } else {
        feedback.textContent = 'Word does not start with the correct letter!';
    }

    // Clear input field
    document.getElementById('word-input').value = '';
});

// Save progress (word indices and score) to local storage
function saveProgress() {
    localStorage.setItem('usedWordIndices', JSON.stringify(usedWordIndices));
    localStorage.setItem('score', score);
}

// Load progress from local storage
window.onload = function() {
    if (localStorage.getItem('usedWordIndices')) {
        usedWordIndices = JSON.parse(localStorage.getItem('usedWordIndices'));
        score = parseInt(localStorage.getItem('score'));
        document.getElementById('score').textContent = score;
    }
};