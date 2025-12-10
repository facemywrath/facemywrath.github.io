// main.js

// CHANGE THIS TO YOUR REAL SERVER DOMAIN / IP
// Example: "https://faceurogames.net" or "http://192.168.0.10:3000"
const API_BASE_URL = "https://home.faceurogames.net";

const statusSection = document.getElementById('status-section');
const statusMessage = document.getElementById('status-message');
const retryButton = document.getElementById('retry-button');

const gameListSection = document.getElementById('game-list-section');
const gameListEl = document.getElementById('game-list');

const gameFrameSection = document.getElementById('game-frame-section');
const gameFrame = document.getElementById('game-frame');
const backToMenuButton = document.getElementById('back-to-menu');
const currentGameTitle = document.getElementById('current-game-title');

let gamesCache = [];

// Initial load
document.addEventListener('DOMContentLoaded', () => {
  loadGames();
  retryButton.addEventListener('click', loadGames);
  backToMenuButton.addEventListener('click', () => {
    gameFrame.src = '';
    gameFrameSection.classList.add('hidden');
    gameListSection.classList.remove('hidden');
    statusSection.classList.add('hidden');
  });
});

async function loadGames() {
  setStatus('Connecting to server...', false);
  gameListSection.classList.add('hidden');
  gameFrameSection.classList.add('hidden');

  try {
    const res = await fetch(`${API_BASE_URL}/api/games`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const games = await res.json();

    gamesCache = games;
    renderGameList(games);

    statusSection.classList.add('hidden');
    gameListSection.classList.remove('hidden');
  } catch (err) {
    console.error('Failed to load games:', err);
    setStatus('Failed to connect to server. Check your connection.', true);
  }
}

function setStatus(message, showRetry) {
  statusMessage.textContent = message;
  statusSection.classList.remove('hidden');
  retryButton.classList.toggle('hidden', !showRetry);
}

function renderGameList(games) {
  gameListEl.innerHTML = '';

  if (!games || games.length === 0) {
    gameListEl.innerHTML = '<p>No games available yet.</p>';
    return;
  }

  games.forEach(game => {
    const card = document.createElement('div');
    card.className = 'game-card';

    const thumb = document.createElement('img');
    thumb.className = 'game-thumb';
    thumb.src = game.thumbnail || '';
    thumb.alt = game.name;
    // If no thumbnail, just hide broken image icon visually
    if (!game.thumbnail) {
      thumb.style.display = 'none';
    }

    const info = document.createElement('div');
    info.className = 'game-info';

    const title = document.createElement('div');
    title.className = 'game-title';
    title.textContent = game.name;

    const desc = document.createElement('div');
    desc.className = 'game-description';
    desc.textContent = game.description || '';

    info.appendChild(title);
    info.appendChild(desc);

    const playBtn = document.createElement('button');
    playBtn.className = 'game-play-button';
    playBtn.textContent = 'Play';
    playBtn.addEventListener('click', () => openGame(game));

    card.appendChild(thumb);
    card.appendChild(info);
    card.appendChild(playBtn);

    gameListEl.appendChild(card);
  });
}

function openGame(game) {
  if (!game.launchUrl) {
    console.warn('Game has no launchUrl:', game);
    return;
  }

  currentGameTitle.textContent = game.name;
  gameFrame.src = game.launchUrl;

  // Switch views
  gameListSection.classList.add('hidden');
  statusSection.classList.add('hidden');
  gameFrameSection.classList.remove('hidden');
}