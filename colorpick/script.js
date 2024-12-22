const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Screen dimensions
canvas.width = 1080;
canvas.height = 1920;

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

// Colors
const COLORS = {
    Red: "rgb(255, 0, 0)",
    Orange: "rgb(255, 165, 0)",
    Yellow: "rgb(255, 255, 0)",
    Green: "rgb(0, 255, 0)",
    Blue: "rgb(0, 0, 255)",
    Purple: "rgb(75, 0, 130)",
    Pink: "rgb(238, 130, 238)",
    White: "rgb(255, 255, 255)",
    Black: "rgb(0, 0, 0)",
};

let PRESET_COLOR = "Black";
let USE_PRESET_COLOR = true;

// Circle and layout settings
const CIRCLE_RADIUS = 150;
const HORIZONTAL_SPACING = 320;
const VERTICAL_SPACING = 320;

// Game state
let score = 0;
let gridColors = [];
let targetColor = "";
let positions = [];

// Initialize positions
function calculatePositions() {
    positions = [];
    const xStart = WIDTH / 2 - (HORIZONTAL_SPACING / 2);
    const yStart = 200;
    for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 3; col++) {
            const x = xStart + col * HORIZONTAL_SPACING;
            const y = yStart + row * VERTICAL_SPACING;
            positions.push({ x, y });
        }
    }
}
calculatePositions();

// Draw circles
function drawCircles() {
    positions.forEach((pos, index) => {
        const color = COLORS[gridColors[index]];
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, CIRCLE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "white";
        ctx.stroke();
    });
}

// Draw target and score
function drawHUD() {
    ctx.fillStyle = COLORS[targetColor];
    ctx.fillRect(0, HEIGHT - 100, WIDTH, 100);
    ctx.fillStyle = "white";
    ctx.font = "30px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`Tap: ${targetColor}`, WIDTH / 2, HEIGHT - 60);
    ctx.fillText(`Score: ${score}`, WIDTH / 2, 50);
}

// Randomize grid colors
function randomizeGrid() {
    gridColors = positions.map(() =>
        Object.keys(COLORS)[Math.floor(Math.random() * Object.keys(COLORS).length)]
    );
    targetColor = USE_PRESET_COLOR ? PRESET_COLOR : gridColors[Math.floor(Math.random() * gridColors.length)];

    if (USE_PRESET_COLOR && !gridColors.includes(PRESET_COLOR)) {
        const randomIndex = Math.floor(Math.random() * gridColors.length);
        gridColors[randomIndex] = PRESET_COLOR;
    }
}

// Game logic
function handleTap(x, y) {
    positions.forEach((pos, index) => {
        const dist = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2);
        if (dist <= CIRCLE_RADIUS && gridColors[index] === targetColor) {
            score++;
            randomizeGrid();
        }
    });
}

// Game loop
function gameLoop() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    drawCircles();
    drawHUD();
    requestAnimationFrame(gameLoop);
}

// Event listeners
canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    handleTap(x, y);
});

// Start game
function startGame() {
    randomizeGrid();
    gameLoop();
}

startGame();