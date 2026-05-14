// ═══════════════════════════════════════════════════════════
//  MATCH WEAVER  —  Fantasy Mana Puzzle
//  · Seeded RNG · Per-tile mana colors · Match-3 cardinal
//  · Chapters · Level select · Feature system · Spells
//  · Bombs · Skull tiles · Star ratings · Save/Load
// ═══════════════════════════════════════════════════════════
'use strict';

// ── SEEDED PRNG (mulberry32) ─────────────────────────────────
const MASTER_SEED = 0xDEADBEEF;
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng    = mulberry32(MASTER_SEED);
const rngInt = (lo, hi) => Math.floor(rng() * (hi - lo + 1)) + lo;
const rngF   = () => rng();  // 0..1 float

// ── CELL MODEL ───────────────────────────────────────────────
// { color, type, hp, color2 }
// type: normal | stone | gradient | skull | bomb | superbomb
// hp: 1 (normal), 2 (stone intact), 1 (stone cracked)

function makeCell(color, type = 'normal', color2 = null) {
  return { color, type, hp: type === 'stone' ? 2 : 1, color2 };
}

// ── PALETTE ──────────────────────────────────────────────────
const COLORS = ['red', 'blue', 'yellow', 'green', 'purple', 'void'];
const C = {
  red:    { mid: '#e8183a', lit: '#ffaaaa', drk: '#6e0016' },
  blue:   { mid: '#1877e8', lit: '#99ccff', drk: '#002b8b' },
  yellow: { mid: '#e8c018', lit: '#fff599', drk: '#6e5500' },
  green:  { mid: '#18c84a', lit: '#a0ffb8', drk: '#005e1f' },
  purple: { mid: '#9018e8', lit: '#d8aaff', drk: '#3a006e' },
  void:   { mid: '#888', lit: '#fff', drk: '#000' },  // special rendering, see drawVoidGem
};

// Mana type labels and icons for each color
const MANA = {
  red:    { name: 'Attack',   icon: '⚔️'  },
  blue:   { name: 'Mind',     icon: '🧠'  },
  yellow: { name: 'Defense',  icon: '🛡️'  },
  green:  { name: 'Life',     icon: '🌿'  },
  purple: { name: 'Arcane',   icon: '🔮'  },
  void:   { name: 'Void',     icon: '🕳️'  },
};

// ── SPRITESHEET ───────────────────────────────────────────────
// 768×640, 6 sprites per row, 128×128 each, 5 rows
// Row 0 (y=0):   black mana silhouettes — drawn on tiles
// Row 1 (y=128): colored mana sprites — drawn in UI/sidebar
// Row 2 (y=256): feature icons  [4thColor, 4tiles, gradient, skull, boardSize, 5thColor]
// Row 3 (y=384): feature/spell  [stone, void-sphere, 5tiles, cut, gravity, bomb]
// Row 4 (y=512): spell icons    [swap, shield, pillar-of-fire, suspension, transmute, mend]
// Row 5 (y=640): spell icons    [mass-transmute, -, -, -, -, -]
const SPRITE_SIZE = 128;
const SPRITE_COLS = 6;
const SPRITE_ORDER = ['red', 'yellow', 'blue', 'green', 'purple', 'void'];

const SPRITE_IDX = {
  // Row 2 — features
  '4thColor':       12,
  '4tiles':         13,
  'gradient':       14,
  'skull':          15,
  'boardSize':      16,
  '5thColor':       17,
  // Row 3 — features + spells
  'stone':          18,
  'void-sphere':    19,
  '5tiles':         20,
  'cut':            21,
  'gravity':        22,
  'bomb':           23,
  // Row 4 — spells
  'swap':           24,
  'shield-spell':   25,
  'pillar-of-fire': 26,
  'suspension':     27,
  'transmute':      28,
  'mend':           29,
  // Row 5 — spells
  'mass-transmute': 30,
};

const SPELL_SPRITE_IDX = {
  'cut':            SPRITE_IDX['cut'],
  'gravity':        SPRITE_IDX['gravity'],
  'swap':           SPRITE_IDX['swap'],
  'bomb-tile':      SPRITE_IDX['bomb'],
  'suspension':     SPRITE_IDX['suspension'],
  'transmute':      SPRITE_IDX['transmute'],
  'mend':           SPRITE_IDX['mend'],
  'pillar-of-fire': SPRITE_IDX['pillar-of-fire'],
  'shield':         SPRITE_IDX['shield-spell'],
  'mass-transmute': SPRITE_IDX['mass-transmute'],
};

// Feature id → flat sprite index
const FEATURE_SPRITE_IDX = {
  '4thColor':  SPRITE_IDX['4thColor'],
  '4tiles':    SPRITE_IDX['4tiles'],
  'gradient':  SPRITE_IDX['gradient'],
  'skull':     SPRITE_IDX['skull'],
  'boardSize': SPRITE_IDX['boardSize'],
  '5thColor':  SPRITE_IDX['5thColor'],
  'stone':     SPRITE_IDX['stone'],
  '5tiles':    SPRITE_IDX['5tiles'],
};

const spriteSheet  = new Image();
spriteSheet.src    = 'spritesheet.png';
let spritesReady   = false;
spriteSheet.onload = () => { spritesReady = true; };

// Core draw: flat index into spritesheet
function drawSpriteIdx(ctx, idx, x, y, size, alpha = 1) {
  if (!spritesReady) return;
  const col = idx % SPRITE_COLS;
  const row = Math.floor(idx / SPRITE_COLS);
  const pad  = size * 0.08;
  const draw = size - pad * 2;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(spriteSheet,
    col * SPRITE_SIZE, row * SPRITE_SIZE, SPRITE_SIZE, SPRITE_SIZE,
    x + pad, y + pad, draw, draw);
  ctx.restore();
}

// Draw a mana color sprite — row 0=black (tiles), row 1=colored (UI)
function drawSprite(ctx, color, x, y, size, row, alpha = 1) {
  const idx = SPRITE_ORDER.indexOf(color);
  if (idx < 0) return;
  drawSpriteIdx(ctx, row * SPRITE_COLS + idx, x, y, size, alpha);
}

// Draw a feature icon sprite by feature id
function drawFeatureSprite(ctx, featureId, x, y, size, alpha = 1) {
  const idx = FEATURE_SPRITE_IDX[featureId];
  if (idx == null) return;
  drawSpriteIdx(ctx, idx, x, y, size, alpha);
}

// Draw a spell icon sprite by spell id
function drawSpellSprite(ctx, spellId, x, y, size, alpha = 1) {
  const idx = SPELL_SPRITE_IDX[spellId];
  if (idx == null) return;
  drawSpriteIdx(ctx, idx, x, y, size, alpha);
}



// ── GRID ─────────────────────────────────────────────────────
const BASE_COLS = 8, BASE_ROWS = 16;
// Actual dimensions stored in G.cols / G.rows, set per level by getLevelConfig

// ── SHAPES ───────────────────────────────────────────────────
const SHAPES_3 = [
  [[0,0],[0,1],[0,2]],
  [[0,0],[1,0],[2,0]],
  [[0,0],[1,0],[1,1]],
  [[0,1],[1,0],[1,1]],
  [[0,0],[0,1],[1,1]],
  [[0,0],[0,1],[1,0]],
  [[0,0],[1,0],[0,1]],
];
const SHAPES_4 = [
  [[0,0],[0,1],[0,2],[0,3]],
  [[0,0],[1,0],[2,0],[3,0]],
  [[0,0],[1,0],[1,1],[1,2]],
  [[0,2],[1,0],[1,1],[1,2]],
  [[0,1],[0,2],[1,0],[1,1]],
  [[0,0],[0,1],[1,1],[1,2]],
  [[0,1],[1,0],[1,1],[1,2]],
  [[0,0],[0,1],[1,0],[1,1]],
];

// All 12 free pentominoes — all orientations included
// F, I, L, N, P, T, U, V, W, X, Y, Z
const SHAPES_5 = [
  // I
  [[0,0],[0,1],[0,2],[0,3],[0,4]],
  [[0,0],[1,0],[2,0],[3,0],[4,0]],
  // L
  [[0,0],[1,0],[2,0],[3,0],[3,1]],
  [[0,0],[0,1],[0,2],[0,3],[1,0]],
  [[0,0],[0,1],[1,1],[2,1],[3,1]],
  [[0,3],[1,0],[1,1],[1,2],[1,3]],
  // J (L mirror)
  [[0,0],[0,1],[1,0],[2,0],[3,0]],
  [[0,0],[1,0],[1,1],[1,2],[1,3]],
  [[0,1],[1,1],[2,1],[3,0],[3,1]],
  [[0,0],[0,1],[0,2],[0,3],[1,3]],
  // N
  [[0,1],[1,0],[1,1],[2,0],[3,0]],
  [[0,0],[0,1],[1,1],[1,2],[1,3]],
  [[0,0],[1,0],[1,1],[2,1],[3,1]],
  [[0,0],[0,1],[0,2],[1,2],[1,3]],  // S-mirror removed dup
  // Y
  [[0,1],[1,0],[1,1],[2,1],[3,1]],
  [[0,0],[0,1],[0,2],[0,3],[1,1]],
  [[0,0],[1,0],[1,1],[2,0],[3,0]],
  [[0,1],[1,0],[1,1],[1,2],[1,3]],
  // P
  [[0,0],[0,1],[1,0],[1,1],[2,0]],
  [[0,0],[0,1],[0,2],[1,1],[1,2]],
  [[0,1],[1,0],[1,1],[2,0],[2,1]],
  [[0,0],[0,1],[1,0],[1,1],[1,2]],
  // T
  [[0,0],[0,1],[0,2],[1,1],[2,1]],
  [[0,0],[1,0],[1,1],[2,0],[2,1]], // skip pure dup
  [[0,2],[1,0],[1,1],[1,2],[2,2]],
  [[0,1],[1,1],[2,0],[2,1],[2,2]],
  // U
  [[0,0],[0,2],[1,0],[1,1],[1,2]],
  [[0,0],[0,1],[1,0],[2,0],[2,1]],
  [[0,0],[0,1],[0,2],[1,0],[1,2]],
  [[0,0],[0,1],[1,1],[2,0],[2,1]],
  // V
  [[0,0],[1,0],[2,0],[2,1],[2,2]],
  [[0,0],[0,1],[0,2],[1,0],[2,0]],
  [[0,2],[1,2],[2,0],[2,1],[2,2]],
  [[0,0],[0,1],[0,2],[1,2],[2,2]],
  // W
  [[0,0],[1,0],[1,1],[2,1],[2,2]],
  [[0,1],[0,2],[1,0],[1,1],[2,0]],
  [[0,0],[0,1],[1,1],[1,2],[2,2]],
  [[0,2],[1,1],[1,2],[2,0],[2,1]],
  // X
  [[0,1],[1,0],[1,1],[1,2],[2,1]],
  // F
  [[0,1],[0,2],[1,0],[1,1],[2,1]],
  [[0,0],[1,0],[1,1],[1,2],[2,2]],
  [[0,1],[1,1],[1,2],[2,0],[2,1]],
  [[0,0],[1,0],[1,1],[1,2],[2,0]],  // F mirror rotations
  [[0,1],[0,2],[1,1],[1,2],[2,2]],
  [[0,2],[1,0],[1,1],[1,2],[2,1]],
  [[0,1],[1,0],[1,1],[2,1],[2,2]],
  [[0,0],[1,0],[1,1],[2,0],[2,1]],
  // Z
  [[0,0],[0,1],[1,1],[1,2],[2,2]],
  [[0,2],[1,0],[1,1],[1,2],[2,0]],
  [[0,1],[0,2],[1,0],[1,1],[2,0]],
  [[0,0],[1,0],[1,1],[1,2],[2,2]],
];

function getShapePool(lvl) {
  const cfg    = G.cfg;
  const active = cfg ? cfg.featureIds : getActiveFeatures(lvl);
  const has4   = active.includes('4tiles');
  const has5   = active.includes('5tiles');
  if (has5) return [...SHAPES_3, ...SHAPES_4, ...SHAPES_5];
  if (has4) return [...SHAPES_3, ...SHAPES_4];
  return SHAPES_3;
}

function normalizeShape(cells) {
  const minR = Math.min(...cells.map(c => c[0]));
  const minC = Math.min(...cells.map(c => c[1]));
  return cells.map(([r, c]) => [r - minR, c - minC]);
}
function rotateCW(cells) {
  const maxR = Math.max(...cells.map(c => c[0]));
  return normalizeShape(cells.map(([r, c]) => [c, maxR - r]));
}
function rotateCCW(cells) {
  const maxC = Math.max(...cells.map(c => c[1]));
  return normalizeShape(cells.map(([r, c]) => [maxC - c, r]));
}

// ── FEATURE REGISTRY ─────────────────────────────────────────
// Every special mechanic is a "Feature". Base game (3-tile, 3-color match-3)
// is NOT a feature — it's always on. Features are additives layered on top.
//
// unlockLvl: first level this feature can appear in the pool
// Each feature also affects getLevelConfig() when active.

const FEATURES = [
  {
    id:       '4thColor',
    icon:     '🟢',
    name:     '4th Color',
    desc:     'A fourth mana aspect joins the crystal stream.',
    unlockLvl: 11,
    tutorial: 'A fourth mana aspect has joined the weave! Four aspects now fall — track your Goal and absorb each type to advance.',
  },
  {
    id:       '4tiles',
    icon:     '🟦',
    name:     '4-Tile Shapes',
    desc:     'Tetromino-sized pieces join the drop pool alongside trominoes.',
    unlockLvl: 21,
    tutorial: 'Four-tile shapes are now falling! They work just like trominoes — rotate, aim, and drop — but cover more ground. Use them to set up bigger matches.',
  },
  {
    id:       'gradient',
    icon:     '💎',
    name:     'Gradient Crystals',
    desc:     'Dual-color gems that match as either of their two colors.',
    unlockLvl: 41,
    tutorial: 'Gradient Crystals have appeared! These split gems show two colors and count as either one when matching. A crystal can bridge two separate color runs at once.',
  },
  {
    id:       '5thColor',
    icon:     '🟣',
    name:     '5th Color',
    desc:     'A fifth mana aspect enters the weave.',
    unlockLvl: 161,
    tutorial: 'Five aspects now pour from the Spire. The Nexus grows crowded — use Prismatic Shards and large matches to keep pace.',
  },
  {
    id:       'boardSize',
    icon:     '📐',
    name:     'Expanded Board',
    desc:     'The board grows — extra rows, columns, or both.',
    unlockLvl: 121,
    tutorial: 'The Arcane Nexus has expanded! Extra channels glow at the edges. More space to weave — and more mana to channel.',
  },
  {
    id:       'stone',
    icon:     '🪨',
    name:     'Stone Tiles',
    desc:     'Petrified candies must be matched twice to shatter.',
    unlockLvl: 201,
    tutorial: 'Stone Tiles have appeared! These rocky candies need to be matched twice — once to crack, once to clear. You can still see their color under the stone. Plan ahead.',
  },
  {
    id:       'skull',
    icon:     '💀',
    name:     'Skull Tiles',
    desc:     'Cursed tiles lurk on the board. Matching them deals 1 damage. Lose all 3 hearts and the level is failed.',
    unlockLvl: 100,
    tutorial: 'Skull Tiles! Dangerous cursed gems hide among the mana. Matching a skull tile deals 1 damage — lose all 3 hearts and the level fails. Use your Shield spell to block damage!',
  },
  {
    id:       '6thColor',
    icon:     '🟠',
    name:     '6th Color',
    desc:     'All six mana aspects now flow. The weave is at maximum complexity.',
    unlockLvl: 321,
    tutorial: 'All six aspects pour from the broken Seal. The Shadow Lich has unleashed everything. Only a true Weaver survives this maelstrom.',
  },
  {
    id:       '5tiles',
    icon:     '🔷',
    name:     '5-Tile Shapes',
    desc:     'Pentomino-sized pieces enter the weave — all 12 forms and their rotations.',
    unlockLvl: 501,
    tutorial: 'Five-tile shapes now fall from the Spire! All 12 pentomino forms are in the pool — plan further ahead, the lattice has never been more complex.',
  },
];

// Maximum feature slots available at this level
function maxFeatureSlots(lvl) {
  if (lvl >= 500) return 6;
  if (lvl >= 400) return 5;
  if (lvl >= 150) return 4;
  if (lvl >= 50)  return 3;
  if (lvl >= 25)  return 2;
  return 1;
}

// Actual slot count for this level: weighted random 1..max, deterministic per level.
// Each slot value has 1.5x the weight of the one below it, so higher counts are progressively more likely.
// e.g. max=4: weights 2, 3, 4.5, 6.75 → ~12.7%, 19%, 28.5%, 42.8% chance respectively.
// Uses a seed offset (+1) so it doesn't share state with the shuffle RNG.
function featureSlots(lvl) {
  const max = maxFeatureSlots(lvl);
  if (max === 1) return 1;
  const r = mulberry32(((MASTER_SEED ^ (lvl * 0x9e3779b9)) + 1) >>> 0);

  // Build cumulative weight table
  const weights = [];
  let w = 1;
  for (let i = 0; i < max; i++) {
    weights.push(w);
    w *= 1.5;
  }
  const total  = weights.reduce((a, b) => a + b, 0);
  let cursor   = r() * total;
  for (let i = 0; i < max; i++) {
    cursor -= weights[i];
    if (cursor <= 0) return i + 1;
  }
  return max;
}

// Color features stack — can't have 5th without 4th, etc.
// Returns all color feature ids that are prerequisites of the given one.
function colorPrereqs(id) {
  if (id === '6thColor') return ['4thColor', '5thColor', '6thColor'];
  if (id === '5thColor') return ['4thColor', '5thColor'];
  if (id === '4thColor') return ['4thColor'];
  return [];
}

// Deterministic per-level RNG seeded from level number (never touches piece queue rng)
function levelRng(lvl) {
  return mulberry32((MASTER_SEED ^ (lvl * 0x9e3779b9)) >>> 0);
}

// Get the active feature set for a given level.
// Rules:
//   1. Any feature whose unlockLvl === lvl is PINNED — it must appear this level.
//   2. For chapters 2+, any feature whose unlockLvl falls within this chapter is also
//      PINNED to slot 1 for every level in that chapter.
//   3. All other unlocked features (unlockLvl < lvl) enter the random pool.
//   4. Color features are cumulative: selecting '5thColor' also forces '4thColor' in.
//   5. Pool shuffled with level-seeded RNG; pinned first, pool fills remaining slots.
function getActiveFeatures(lvl) {
  const slots = featureSlots(lvl);

  // ── Chapter-pin: find the most recently unlocked feature within the last 20 levels
  // (i.e. unlocked in the same chapter), skip chapter 1 (unlockLvl > 20).
  // This feature always occupies slot 1.
  const chapterPinned = FEATURES.find(f =>
    f.unlockLvl > 20 &&           // not chapter 1
    f.unlockLvl > lvl - 20 &&     // unlocked within the last 20 levels (same chapter window)
    f.unlockLvl <= lvl            // already unlocked
  ) || null;

  // All features unlocked by this level, excluding the chapter-pinned one
  const rest     = FEATURES.filter(f => f.unlockLvl <= lvl && f !== chapterPinned);
  const eligible = FEATURES.filter(f => f.unlockLvl < lvl  && f !== chapterPinned);

  // Shuffle eligible with level RNG
  const r    = levelRng(lvl);
  const pool = [...eligible];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  // Fill slots: chapter-pinned first, then shuffled pool
  const selected = [];
  const add = (f) => { if (f && !selected.find(s => s.id === f.id)) selected.push(f); };
  add(chapterPinned);
  for (const f of pool) { if (selected.length >= slots) break; add(f); }

  // Return selected IDs in pinned-first order.
  // Prereqs (e.g. 4thColor implied by 5thColor) are resolved inside getLevelConfig only —
  // keeping them out of the display array preserves the pinned-first slot order.
  return selected.map(f => f.id);
}

// ── BOARD SIZE DERIVATION ─────────────────────────────────────
// Max expansion points = ceil(lvl / 50), capped at 8 for each axis.
// ceil means lvl 51 → 2 pts, lvl 1 → 1 pt (but feature only unlocks at 35).
// Uses a third RNG seed offset (+2) to stay independent.
function getBoardSize(lvl, featureIds) {
  if (!featureIds.includes('boardSize')) return { cols: BASE_COLS, rows: BASE_ROWS };
  const maxPts = Math.min(8, Math.ceil(lvl / 50));   // 1@35-50, 2@51-100 … cap 8
  if (maxPts === 0) return { cols: BASE_COLS, rows: BASE_ROWS };
  const r       = mulberry32(((MASTER_SEED ^ (lvl * 0x9e3779b9)) + 2) >>> 0);
  const addRows = Math.max(1, Math.floor(r() * (maxPts + 1)));
  const addCols = Math.max(1, Math.floor(r() * (maxPts + 1)));
  return {
    cols: Math.min(BASE_COLS + 8, BASE_COLS + addCols),
    rows: Math.min(BASE_ROWS + 8, BASE_ROWS + addRows),
  };
}
function getLevelConfig(lvl) {
  const rawIds     = getActiveFeatures(lvl);
  // Expand color prereqs for gameplay (5thColor implies 4thColor, etc.)
  const featureSet = new Set(rawIds);
  for (const id of rawIds) colorPrereqs(id).forEach(pid => featureSet.add(pid));
  const featureIds = [...featureSet];

  let colorCount = 3;
  if (featureIds.includes('6thColor')) colorCount = 6;
  else if (featureIds.includes('5thColor')) colorCount = 5;
  else if (featureIds.includes('4thColor')) colorCount = 4;

  const colors = COLORS.slice(0, colorCount);
  // Asymptotic quota: starts ~15, approaches 80 over 400 levels
  const base   = Math.round(15 + 65 * (1 - Math.exp(-lvl / 80)));
  const quota  = {};

  // Chapter theme: override all quota to a single color
  const theme = CHAPTER_THEMES[chapterOf(lvl)];
  if (theme && colors.includes(theme.color)) {
    colors.forEach(c => { quota[c] = c === theme.color ? (base + rngInt(0, 3)) : 0; });
    // Remove zero-quota colors from active color list for piece generation
    const themeColors = [theme.color];
    return {
      colors: themeColors, quota, featureIds,
      cols, rows,
      has4Tiles:   featureIds.includes('4tiles'),
      has5Tiles:   featureIds.includes('5tiles'),
      hasGradient: featureIds.includes('gradient'),
      hasStone:    featureIds.includes('stone'),
      hasSkull:    featureIds.includes('skull'),
    };
  }

  colors.forEach(c => { quota[c] = base + rngInt(0, 3); });

  const { cols, rows } = getBoardSize(lvl, featureIds);

  return {
    colors, quota, featureIds,
    cols, rows,
    has4Tiles:   featureIds.includes('4tiles'),
    has5Tiles:   featureIds.includes('5tiles'),
    hasGradient: featureIds.includes('gradient'),
    hasStone:    featureIds.includes('stone'),
    hasSkull:    featureIds.includes('skull'),
  };
}

// ── STAR THRESHOLDS ──────────────────────────────────────────
function getStarThresholds(lvl) {
  const cfg       = getLevelConfig(lvl);
  const totalGems = Object.values(cfg.quota).reduce((a, b) => a + b, 0);
  const cleanish  = Math.ceil(totalGems / 3);
  return { three: Math.round(cleanish * 1.6), two: Math.round(cleanish * 2.5) };
}
function calcStars(lvl, moves) {
  const t = getStarThresholds(lvl);
  return moves <= t.three ? 3 : moves <= t.two ? 2 : 1;
}

// ── SPELLS ────────────────────────────────────────────────────
const SPELLS = [
  {
    id: 'cut', name: 'Blade Cut', icon: '🗡️', unlockLvl: 5,
    cost: { red: 20 }, costLabel: '20 ⚔️', bgClass: 'spell-red', targets: 1,
    desc: 'Spend 20 Attack Mana to destroy a single tile instantly.',
    tutorial: 'Spells! You\'ve unlocked Blade Cut. Tap it, tap any tile to target it, then Cast. Costs 20 ⚔️ Attack Mana.',
  },
  {
    id: 'gravity', name: 'Gravity Surge', icon: '⬇️', unlockLvl: 21,
    cost: { yellow: 20 }, costLabel: '20 🛡️', bgClass: 'spell-yellow', targets: 0,
    desc: 'Spend 20 Defense Mana to collapse all floating tiles downward. May create new matches.',
    tutorial: 'New Spell: Gravity Surge! Instantly drops all tiles down. Costs 20 🛡️ Defense Mana.',
  },
  {
    id: 'swap', name: 'Arcane Swap', icon: '🔀', unlockLvl: 41,
    cost: { blue: 20 }, costLabel: '20 🧠', bgClass: 'spell-blue', targets: 2,
    desc: 'Spend 40 Mind Mana to swap any two adjacent tiles. Triggers a match check.',
    tutorial: 'New Spell: Arcane Swap! Tap two adjacent tiles to swap them. Costs 40 🧠 Mind Mana.',
  },
  {
    id: 'bomb-tile', name: 'Conjure Bomb', icon: '💣', unlockLvl: 61,
    cost: { red: 20 }, costLabel: '20 ⚔️', bgClass: 'spell-red', targets: 1,
    desc: 'Spend 20 Attack Mana to enchant any tile, turning it into a Bomb.',
    tutorial: 'New Spell: Conjure Bomb! Plant a bomb on any tile. Costs 20 ⚔️ Attack Mana.',
  },
  {
    id: 'suspension', name: 'Suspension', icon: '⏸', unlockLvl: 81,
    cost: { yellow: 30 }, costLabel: '30 🛡️', bgClass: 'spell-yellow', targets: 0,
    desc: 'Spend 30 Defense Mana to suspend gravity for your next piece placement. Tiles will not fall after it locks.',
    tutorial: 'New Spell: Suspension! Your next piece placement skips gravity — tiles stay put. Costs 30 🛡️ Defense Mana.',
  },
  {
    id: 'transmute', name: 'Transmute', icon: '🔄', unlockLvl: 101,
    cost: { blue: 30 }, costLabel: '30 🧠', bgClass: 'spell-blue', targets: 2,
    desc: 'Spend 30 Mind Mana to change one tile into the color of an adjacent tile. Select the tile to change, then the adjacent tile to copy.',
    tutorial: 'New Spell: Transmute! Tap a tile, then tap an adjacent tile — the first becomes the color of the second. Costs 30 🧠 Mind Mana.',
  },
  {
    id: 'mend', name: 'Mend', icon: '💚', unlockLvl: 121,
    cost: { green: 20 }, costLabel: '20 🌿', bgClass: 'spell-green', targets: 0,
    desc: 'Spend 20 Life Mana to restore 1 lost heart. Only usable when hearts are missing.',
    tutorial: 'New Spell: Mend! Restore 1 lost heart. Costs 20 🌿 Life Mana — earned by clearing green tiles.',
  },
  {
    id: 'pillar-of-fire', name: 'Pillar of Fire', icon: '🔥', unlockLvl: 141,
    cost: { red: 40 }, costLabel: '40 ⚔️', bgClass: 'spell-red', targets: 1,
    desc: 'Spend 40 Attack Mana to incinerate an entire column. Tap any tile in the column.',
    tutorial: 'New Spell: Pillar of Fire! Tap any tile to erase its entire column. Costs 40 ⚔️ Attack Mana.',
  },
  {
    id: 'shield', name: 'Mana Shield', icon: '🛡️', unlockLvl: 161,
    cost: { yellow: 40 }, costLabel: '40 🛡️', bgClass: 'spell-yellow', targets: 0,
    desc: 'Spend 40 Defense Mana to block the next instance of Skull Tile damage.',
    tutorial: 'New Spell: Mana Shield! Absorbs the next Skull hit. Costs 40 🛡️ Defense Mana.',
  },
  {
    id: 'mass-transmute', name: 'Mass Transmute', icon: '🌊', unlockLvl: 181,
    cost: { blue: 100 }, costLabel: '100 🧠', bgClass: 'spell-blue', targets: 2,
    desc: 'Spend 100 Mind Mana to change ALL tiles of one color into another. Tap a tile of the color to change, then tap a tile of the target color.',
    tutorial: 'New Spell: Mass Transmute! Tap a tile of the color to replace, then a tile of the color to become. ALL matching tiles transform. Costs 100 🧠 Mind Mana.',
  },
];

function spellsUnlocked(lvl) { return lvl >= 5; }

function canCastSpell(spell) {
  return Object.entries(spell.cost).every(([color, amount]) => (G.mana[color] || 0) >= amount);
}

function spendMana(spell) {
  Object.entries(spell.cost).forEach(([color, amount]) => {
    G.mana[color] = Math.max(0, (G.mana[color] || 0) - amount);
  });
}


// ── CHAPTER THEMES ───────────────────────────────────────────
// Themed chapters override quota color and show a colored circle in the chapter header.
// quotaColor: all quota tiles forced to this single mana color.
const CHAPTER_THEMES = {
   6: { color: 'red',    circle: '#e8183a', name: 'The Firelands',
        lore: 'You descend into the Firelands — a molten realm where only Attack Mana burns bright. The crystals here run red with rage. Forge your path through the flame.' },
  13: { color: 'yellow', circle: '#e8c018', name: 'The Earth Kingdom',
        lore: 'The Earth Kingdom rises from ancient bedrock. Only the steady power of Defense Mana can shape these golden stones. Stand firm and build your way through.' },
  21: { color: 'blue',   circle: '#1877e8', name: 'The Ice Age',
        lore: 'The Ice Age has gripped the Nexus. Frozen Mind Mana crystals are the only currency here. Think clearly — the cold rewards precision above all else.' },
  30: { color: 'green',  circle: '#18c84a', name: 'The New Blossom',
        lore: 'After the long frost, life surges back. The New Blossom pulses with Life Mana. Let growth guide you — every match a new branch reaching toward the light.' },
  50: { color: 'purple', circle: '#9018e8', name: 'The Age of Magic',
        lore: 'The Age of Magic dawns upon the Nexus. Pure Arcane Mana floods every crystal. The Shadow Lich trembles — this is the power that first forged the Crown.' },
  75: { color: 'void',   circle: '#444460', name: 'The Beginning of the End',
        lore: 'The veil between worlds tears. Void Mana alone remains — a darkness so complete it consumes everything. This is the beginning of the end. Weave wisely.' },
};

// ── LORE ─────────────────────────────────────────────────────
const LORE = [
  { level: 1,   icon: '🔮', title: 'The Weaving Begins',
    text: 'Mana crystals fall from the Arcane Spire above. Match three in a row to absorb their power. Fill your mana quota each level to ascend.' },
  { level: 3,   icon: '📜', title: 'The Ancient Codex',
    text: 'Deep in the Spire\'s library, forgotten tomes stir. The Codex speaks of six mana types — each bound to a school of magic. You have mastered only three so far.' },
  { level: 11,  icon: '👑', title: 'The Arcane Crown',
    text: 'A fourth mana type flows into the weave. The Arcane Crown, shattered by the Shadow Lich, can only be restored by one who masters all six. You have begun.' },
  { level: 21,  icon: '✨', title: 'Expanded Runes',
    text: 'The rune lattice shifts — larger crystal formations now tumble from the Spire. Four-part runes offer richer patterns and more powerful matches.' },
  { level: 41,  icon: '💎', title: 'Prismatic Shards',
    text: 'Prismatic Shards have appeared — dual-aspected crystals born at the confluence of two ley lines. They resonate with either mana type. Use them to bridge gaps in your weave.' },
  { level: 100, icon: '💀', title: 'The Shadow Lich\'s Curse',
    text: 'The Shadow Lich has cursed the crystal stream. Skull-marked shards deal damage when matched. Three wounds and the ritual fails. Guard yourself with the Mana Shield.' },
  { level: 101, icon: '🔥', title: 'The Firelands',
    text: 'You descend into the Firelands — a molten realm where only Attack Mana burns bright. The crystals here run red with rage. Forge your path through the flame.' },
  { level: 121, icon: '📐', title: 'The Expanding Nexus',
    text: 'The Arcane Nexus expands. Additional channels open — more space to weave, more mana to manage. The outer channels glow faintly; they are newly awakened.' },
  { level: 161, icon: '🌀', title: 'The Fifth Aspect',
    text: 'A fifth mana aspect bleeds into the weave. The Shadow Lich draws more power. Five colors demand mastery of the full lattice.' },
  { level: 201, icon: '🪨', title: 'Petrified Mana',
    text: 'The Lich\'s magic has petrified sections of the crystal stream. Stone-bound shards must be matched twice to shatter. Their mana still glows beneath the rock.' },
  { level: 241, icon: '🟡', title: 'The Earth Kingdom',
    text: 'The Earth Kingdom rises from ancient bedrock. Only the steady power of Defense Mana can shape these golden stones. Stand firm and build your way through.' },
  { level: 321, icon: '☠️', title: 'The Sixth Seal Breaks',
    text: 'All six mana aspects now pour through the Nexus. The Shadow Lich tears at the Arcane Crown\'s final seal. Only a true Weaver prevails.' },
  { level: 401, icon: '💧', title: 'The Ice Age',
    text: 'The Ice Age has gripped the Nexus. Frozen Mind Mana crystals are the only currency here. Think clearly — the cold rewards precision above all else.' },
  { level: 501, icon: '🔷', title: 'The Pentomino Surge',
    text: 'The Arcane Spire fractures further — five-tile crystal formations now cascade through the weave. All twelve pentomino forms enter the storm. The Shadow Lich\'s power reaches new heights. Only a true master can navigate this.' },
  { level: 581, icon: '🌿', title: 'The New Blossom',
    text: 'After the long frost, life surges back. The New Blossom pulses with Life Mana. Let growth guide you — every match a new branch reaching toward the light.' },
  { level: 981, icon: '✨', title: 'The Age of Magic',
    text: 'The Age of Magic dawns upon the Nexus. Pure Arcane Mana floods every crystal. The Shadow Lich trembles — this is the power that first forged the Crown.' },
  { level: 1481, icon: '🕳️', title: 'The Beginning of the End',
    text: 'The veil between worlds tears. Void Mana alone remains — a darkness so complete it consumes everything. This is the beginning of the end. Weave wisely.' },
];

// ── PRE-GENERATE PIECE QUEUE ─────────────────────────────────
// Each entry: poolIdx, up to 4 tileColor indices, stone/gradient flags
// stone: one random tile index (0-3) may be stone; resolved at runtime
// gradient: one random tile index may be gradient; resolved at runtime
// We also pre-roll the "which tile is special" and the "is this piece special" chance
const QUEUE_SIZE = 5000;
const PIECE_QUEUE = Array.from({ length: QUEUE_SIZE }, () => ({
  poolIdx:         rngInt(0, 99),
  tileColors:      [rngInt(0,5), rngInt(0,5), rngInt(0,5), rngInt(0,5)],
  tileColors2:     [rngInt(0,5), rngInt(0,5), rngInt(0,5), rngInt(0,5)],
  stoneRoll:       rngF(),
  stoneTileIdx:    rngInt(0, 3),
  gradientRoll:    rngF(),
  gradientTileIdx: rngInt(0, 3),
  skullRoll:       rngF(),
  skullTileIdx:    rngInt(0, 3),
}));

// ── SAVE / LOAD ───────────────────────────────────────────────
const SAVE_KEY = 'sugarDrop_v7';
let SAVE = {
  unlockedLevels: new Set([1]),
  levelStars:     {},
  totalScore:     0,
  tutorialsSeen:  {},
  equippedSpells: ['cut'],
  redeemedKeys:   [],
  settings:       { showTileIcons: true },
};
let qHead = 0;

// ── SECRET KEYS ───────────────────────────────────────────────
const SECRET_KEYS = [
  {
    code:   'arcane',
    label:  '🔮 Test Mode',
    desc:   'Unlocks Test Mode — play any level without saving your win.',
    effect: () => { SAVE.settings.testModeUnlocked = true; },
  },
  {
    code:   'weaver',
    label:  '✨ Bonus Mana',
    desc:   'Start each level with 10 of every mana type.',
    effect: () => { SAVE.settings.bonusMana = true; },
  },
];

function redeemKey(code) {
  const trimmed = code.trim().toLowerCase();
  const key = SECRET_KEYS.find(k => k.code === trimmed);
  if (!key) return { ok: false, msg: 'Unknown key.' };
  if ((SAVE.redeemedKeys || []).includes(trimmed)) return { ok: false, msg: 'Already redeemed.' };
  SAVE.redeemedKeys = [...(SAVE.redeemedKeys || []), trimmed];
  key.effect();
  saveGame();
  return { ok: true, msg: key.label + ' — ' + key.desc };
}

function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      unlockedLevels:  [...SAVE.unlockedLevels],
      levelStars:      SAVE.levelStars,
      totalScore:      SAVE.totalScore,
      tutorialsSeen:   SAVE.tutorialsSeen,
      equippedSpells:  SAVE.equippedSpells,
      redeemedKeys:    SAVE.redeemedKeys,
      settings:        SAVE.settings,
      qHead,
    }));
  } catch (e) {}
}

function loadSave() {
  try { const r = localStorage.getItem(SAVE_KEY); return r ? JSON.parse(r) : null; }
  catch (e) { return null; }
}

function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
  SAVE = {
    unlockedLevels: new Set([1]),
    levelStars:     {},
    totalScore:     0,
    tutorialsSeen:  {},
    equippedSpells: ['cut'],
    redeemedKeys:   [],
    settings:       { showTileIcons: true },
  };
  qHead = 0;
}

function initSave() {
  const d = loadSave();
  if (d) {
    SAVE.unlockedLevels = new Set(d.unlockedLevels || [1]);
    SAVE.levelStars     = d.levelStars    || {};
    SAVE.totalScore     = d.totalScore    || 0;
    SAVE.tutorialsSeen  = d.tutorialsSeen || {};
    SAVE.equippedSpells = d.equippedSpells || ['cut'];
    SAVE.redeemedKeys   = d.redeemedKeys  || [];
    SAVE.settings       = Object.assign({ showTileIcons: true }, d.settings || {});
    qHead               = d.qHead         || 0;
  }
}

// ── SETTINGS ─────────────────────────────────────────────────
window.openSettings = () => openSettingsWithReturn(null);

function openSettingsWithReturn(doneCb) {
  const s = SAVE.settings;
  const redeemedList = (SAVE.redeemedKeys || []).map(code => {
    const k = SECRET_KEYS.find(x => x.code === code);
    return k ? `<div class="setting-redeemed">${k.label}</div>` : '';
  }).join('');

  window._settingsDoneCb = doneCb;

  showCard(`
    <div class="lore-title" style="margin-bottom:12px">⚙️ Settings</div>

    <div class="setting-row">
      <div class="setting-label">
        <span>Tile Icons</span>
        <span class="setting-sub">Show mana symbols on crystals</span>
      </div>
      <button class="toggle-btn ${s.showTileIcons ? 'on' : 'off'}"
        onclick="toggleSetting('showTileIcons')">
        ${s.showTileIcons ? 'ON' : 'OFF'}
      </button>
    </div>

    ${s.testModeUnlocked ? `
    <div class="setting-row">
      <div class="setting-label">
        <span>Test Mode</span>
        <span class="setting-sub">Play any level — wins don't save</span>
      </div>
      <button class="toggle-btn ${s.testMode ? 'on' : 'off'}"
        onclick="toggleSetting('testMode')">
        ${s.testMode ? 'ON' : 'OFF'}
      </button>
    </div>` : ''}

    <div class="setting-divider"></div>

    <div class="setting-label" style="margin-bottom:8px">
      <span>Secret Key</span>
      <span class="setting-sub">Enter a code to unlock rewards</span>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:6px">
      <input id="secret-key-input" type="text" placeholder="Enter key…"
        style="flex:1;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);
               background:var(--bg2);color:var(--text);font-size:13px;box-sizing:border-box"/>
      <button class="pill-btn small-btn" onclick="submitSecretKey()">Redeem</button>
    </div>
    <div id="key-result" style="font-size:12px;min-height:16px;margin-bottom:10px"></div>

    ${redeemedList ? `<div class="setting-sub" style="margin-bottom:6px">Redeemed:</div>${redeemedList}<div style="height:6px"></div>` : ''}

    <div class="setting-divider"></div>
    ${loadSave() ? `<button class="pill-btn danger small-btn" style="margin-bottom:10px" onclick="settingsClearSave()">🗑 Clear Save Data</button>` : ''}
    <button class="pill-btn small-btn" onclick="closeSettings()">Done</button>
  `);
}

window.settingsClearSave = () => {
  const returnCb = window._settingsDoneCb;
  showCard(`
    <div class="lore-title">Clear Save Data?</div>
    <div class="lore-text" style="margin-bottom:16px">This will permanently erase all progress, stars, and unlocks. This cannot be undone.</div>
    <div style="display:flex;gap:10px;justify-content:center">
      <button class="pill-btn secondary small-btn" onclick="hideCard();openSettingsWithReturn(window._settingsDoneCb)">Cancel</button>
      <button class="pill-btn danger small-btn" onclick="settingsConfirmClear()">Erase Everything</button>
    </div>
  `);
  window._settingsDoneCb = returnCb; // preserve through the confirmation card
};

window.settingsConfirmClear = () => {
  const cb = window._settingsDoneCb;
  clearSave();
  initGame();
  hideCard();
  if (cb) cb();
  else showMainMenu();
};

window.confirmClearSave = () => {
  document.getElementById('level-select-modal').classList.add('hidden');
  hideCard();
  document.getElementById('confirm-modal').classList.remove('hidden');
};
window.closeConfirm = () => document.getElementById('confirm-modal').classList.add('hidden');
window.executeClearSave = () => {
  clearSave();
  document.getElementById('confirm-modal').classList.add('hidden');
  initGame();
  redraw();
  goToLevel(1, LORE[0]);
};


window.closeSettings = () => {
  const cb = window._settingsDoneCb;
  window._settingsDoneCb = null;
  hideCard();
  if (cb) cb();
};

window.toggleSetting = (key) => {
  SAVE.settings[key] = !SAVE.settings[key];
  saveGame();
  openSettingsWithReturn(window._settingsDoneCb);
  redraw();
};

window.submitSecretKey = () => {
  const input = document.getElementById('secret-key-input');
  const result = redeemKey(input.value);
  const el = document.getElementById('key-result');
  el.style.color = result.ok ? 'var(--gold)' : '#c0281a';
  el.textContent = result.msg;
  if (result.ok) { input.value = ''; openSettings(); }
};

function isLevelUnlocked(lvl) {
  return SAVE.unlockedLevels.has(lvl);
}

// Unlock the next level after completing lvl, and any chapter-first levels earned by stars
function unlockAfter(lvl) {
  // Always unlock the immediately next level (sequential progression within chapter)
  if (lvl + 1 <= MAX_LEVELS) SAVE.unlockedLevels.add(lvl + 1);
  // Also check chapter unlocks (first level of each chapter)
  checkChapterUnlocks();
}

function recordLevelComplete(lvl, moves) {
  const stars = calcStars(lvl, moves);
  if (SAVE.settings && SAVE.settings.testMode) return stars; // test mode: show stars, don't save
  const prev  = SAVE.levelStars[lvl] || 0;
  if (stars > prev) SAVE.levelStars[lvl] = stars;
  unlockAfter(lvl);
  SAVE.totalScore += G.score;
  saveGame();
  return stars;
}

// ── GAME STATE ────────────────────────────────────────────────
let G = {};

function initGame() {
  G = {
    level: 1, score: 0,
    cols: BASE_COLS, rows: BASE_ROWS,
    boardOffX: LABEL_W, boardOffY: LABEL_H,
    board: emptyBoard(BASE_COLS, BASE_ROWS),
    piece: null,
    phase: 'playing',
    cfg: null,
    quota: {}, cleared: {},
    clearCells: [],
    clearFrame: 0,
    moves: 0,
    explosionParticles: [],
    blastCells: [],
    mana: {},
    spellMode:    null,
    spellTargets: [],
    hearts:       3,
    shielded:     false,
    suspendGravity: false,
  };
}

function emptyBoard(cols = G.cols, rows = G.rows) {
  return Array.from({ length: rows }, () => Array(cols).fill(null));
}

function beginLevel(lvl) {
  G.level   = lvl;
  G.score   = 0;
  G.cfg     = getLevelConfig(lvl);
  G.cols    = G.cfg.cols;
  G.rows    = G.cfg.rows;
  G.quota   = { ...G.cfg.quota };
  G.cleared = {};
  Object.keys(G.quota).forEach(c => G.cleared[c] = 0);
  G.board   = emptyBoard();
  G.phase   = 'playing';
  G.moves   = 0;
  G.mana    = {};
  G.spellMode = null; G.spellTargets = [];
  G.hearts  = 3;
  G.shielded = false;
  G.suspendGravity = false;
  COLORS.forEach(c => { G.mana[c] = SAVE.settings.bonusMana ? 10 : 0; });
  renderQuota();
  updateTileLegend();
  updateSpellBar();
  resizeCanvas();
  spawnPiece();
}

// Show a spell unlock popup with Continue or Open Spells options
function showSpellUnlock(spell, cb) {
  showCard(`
    <canvas id="spell-unlock-cv" width="60" height="60" style="display:block;margin:0 auto 8px;image-rendering:pixelated"></canvas>
    <div class="lore-title">New Spell Unlocked!</div>
    <div class="feat-row" style="margin:10px 0 14px;text-align:left">
      <canvas class="spell-unlock-icon-sm" width="28" height="28" style="display:block;image-rendering:pixelated;flex-shrink:0"></canvas>
      <div class="feat-info">
        <span class="feat-name">${spell.name}</span>
        <span class="feat-desc">${spell.desc}</span>
        <span class="spell-cost-small">Cost: ${spell.costLabel}</span>
      </div>
    </div>
    <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
      <button class="pill-btn secondary small-btn" onclick="openSpellLoadoutFromUnlock()">⚡ Open Spells</button>
      <button class="pill-btn small-btn" onclick="continueFromSpellUnlock()">Continue ›</button>
    </div>
  `);
  requestAnimationFrame(() => {
    const big = document.getElementById('spell-unlock-cv');
    if (big) drawSpellSprite(big.getContext('2d'), spell.id, 0, 0, 60);
    const sm = document.querySelector('.spell-unlock-icon-sm');
    if (sm) drawSpellSprite(sm.getContext('2d'), spell.id, 0, 0, 28);
  });
  window._spellUnlockCb = cb;
}

window.continueFromSpellUnlock = () => {
  const cb = window._spellUnlockCb;
  window._spellUnlockCb = null;
  hideCard();
  if (cb) cb();
};

window.openSpellLoadoutFromUnlock = () => {
  const cb = window._spellUnlockCb;
  window._spellUnlockCb = null;
  openSpellLoadout(() => {
    hideCard();
    if (cb) cb();
  });
};

// Route through level preview before actually starting.
// Checks for: lore reveal, feature tutorial, spell unlock, then preview.
function goToLevel(lvl, pendingLore) {
  // Show spell unlock popups for spells that unlocked at or below the highest completed level
  const completed  = highestCompletedLevel();
  const newSpells  = SPELLS.filter(s =>
    s.unlockLvl <= completed &&
    s.unlockLvl <= lvl &&
    !featureTutorialSeen('spell_' + s.id)
  );
  const featUnlock = FEATURES.find(f => f.unlockLvl === lvl && !featureTutorialSeen(f.id));

  // Build a chain: lore → feature tut → spell unlocks (in order) → preview
  const showPreview = () => showLevelPreview(lvl);

  // Chain spell unlock popups — last one leads to preview
  let spellChain = showPreview;
  for (let i = newSpells.length - 1; i >= 0; i--) {
    const spell = newSpells[i];
    const next  = spellChain;
    spellChain  = () => {
      markTutorialSeen('spell_' + spell.id);
      // Auto-equip if there's a free slot
      if ((SAVE.equippedSpells || []).length < 6 && !SAVE.equippedSpells.includes(spell.id)) {
        SAVE.equippedSpells.push(spell.id);
        saveGame();
      }
      showSpellUnlock(spell, next);
    };
  }

  // Chain feature tutorial before spells
  let featChain = spellChain;
  if (featUnlock) {
    featChain = () => {
      markTutorialSeen(featUnlock.id);
      showTutorial({ icon: featUnlock.icon, title: featUnlock.name, text: featUnlock.tutorial }, spellChain);
    };
  }

  // Start with lore if present
  if (pendingLore) {
    showLore(pendingLore, featChain);
  } else {
    featChain();
  }
}

// ── LEVEL PREVIEW CARD ────────────────────────────────────────
function showLevelPreview(lvl) {
  const slots     = featureSlots(lvl);
  const activeIds = getActiveFeatures(lvl);
  const displayed = activeIds
    .map(id => FEATURES.find(f => f.id === id))
    .filter(Boolean)
    .slice(0, slots);

  const t = getStarThresholds(lvl);
  const ch = chapterOf(lvl);
  const { cols: pvCols, rows: pvRows } = getBoardSize(lvl, activeIds);
  const boardTag = (pvCols !== BASE_COLS || pvRows !== BASE_ROWS)
    ? `<span class="preview-tag">📐 ${pvCols}×${pvRows}</span>` : '';

  const featHtml = displayed.length
    ? displayed.map(f => `
        <div class="feat-row">
          <span class="feat-icon">${f.icon}</span>
          <div class="feat-info">
            <span class="feat-name">${f.name}</span>
            <span class="feat-desc">${f.desc}</span>
          </div>
        </div>`).join('')
    : `<div class="feat-row feat-base">
         <span class="feat-icon">🔮</span>
         <div class="feat-info">
           <span class="feat-name">Base Weave</span>
           <span class="feat-desc">3-shard runes · 3 mana aspects · match-3</span>
         </div>
       </div>`;

  showCard(`
    <div class="preview-header">
      <div class="preview-ch">Chapter ${ch}</div>
      <div class="preview-lvl-num">${lvl}</div>
    </div>
    <div class="preview-tags">
      ${boardTag}
      <span class="preview-tag">3★ ≤${t.three} moves</span>
      <span class="preview-tag">2★ ≤${t.two} moves</span>
    </div>
    <div class="feat-list">${featHtml}</div>
    <div class="preview-actions">
      <button class="pill-btn secondary small-btn" onclick="openLevelSelect()">◂ Select</button>
      <button class="pill-btn secondary small-btn" onclick="openSpellLoadout(() => showLevelPreview(${lvl}))">⚡ Spells</button>
      <button class="pill-btn small-btn" onclick="startLevelNow(${lvl})">▶ Play</button>
    </div>
  `);
}

window.startLevelNow = (lvl) => {
  hideCard();
  beginLevel(lvl);
};

// ── TILE LEGEND SIDEBAR ───────────────────────────────────────
function updateTileLegend() {
  const leg = document.getElementById('tile-legend');
  if (!G.cfg) { leg.classList.add('hidden'); return; }
  const items = [];
  if (G.cfg.hasGradient) items.push(`<div class="legend-item"><div class="legend-swatch gradient"></div><span>Dual-color</span></div>`);
  if (G.cfg.hasStone)    items.push(`<div class="legend-item"><div class="legend-swatch stone"></div><span>Stone×2</span></div>`);
  if (items.length) { leg.innerHTML = items.join(''); leg.classList.remove('hidden'); }
  else leg.classList.add('hidden');
}

// ── WEIGHTED COLOR PICKER ─────────────────────────────────────
// Colors whose quota is already filled get 0.7× weight (appear 30% less).
// rawFloat is a pre-rolled 0..1 value from the piece queue.
function pickWeightedColor(avail, rawFloat) {
  // Build weight table
  const weights = avail.map(c => {
    const need = G.quota[c]    || 0;
    const done = G.cleared[c] || 0;
    return done >= need ? 0.7 : 1.0;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let cursor  = rawFloat * total;
  for (let i = 0; i < avail.length; i++) {
    cursor -= weights[i];
    if (cursor <= 0) return avail[i];
  }
  return avail[avail.length - 1]; // fallback
}

// ── PIECE SPAWNING ────────────────────────────────────────────
function resolvePiece(entry, lvl) {
  const pool   = getShapePool(lvl);
  const shape  = pool[entry.poolIdx % pool.length].map(c => [...c]);
  const avail  = G.cfg.colors;
  const n      = shape.length;
  const cfg    = G.cfg;

  const isStone    = cfg.hasStone    && entry.stoneRoll    < 0.20;
  const isGradient = cfg.hasGradient && entry.gradientRoll < 0.20;
  const isSkull    = cfg.hasSkull    && entry.skullRoll    < 0.15;
  const stoneIdx   = isStone    ? entry.stoneTileIdx % n : -1;
  const gradIdx    = isGradient ? (entry.gradientTileIdx % n === stoneIdx && stoneIdx >= 0
                                    ? (entry.gradientTileIdx + 1) % n
                                    : entry.gradientTileIdx % n) : -1;
  let skullIdx = -1;
  if (isSkull) {
    let si = entry.skullTileIdx % n;
    if (si === stoneIdx || si === gradIdx) si = (si + 1) % n;
    if (si !== stoneIdx && si !== gradIdx) skullIdx = si;
  }

  const tiles = shape.map((_, i) => {
    const rawF  = entry.tileColors[i]  / 6;
    const rawF2 = entry.tileColors2[i] / 6;
    const color  = pickWeightedColor(avail, rawF);
    let   color2 = pickWeightedColor(avail, rawF2);
    if (color2 === color) color2 = avail[(avail.indexOf(color) + 1) % avail.length];
    if (i === stoneIdx) return makeCell(color, 'stone');
    if (i === gradIdx)  return makeCell(color, 'gradient', color2);
    if (i === skullIdx) return makeCell(color, 'skull');
    return makeCell(color, 'normal');
  });

  return { shape, tiles, col: Math.floor((G.cols || BASE_COLS) / 2) - 1 };
}

function spawnPiece() {
  if (G.phase === 'gameover' || G.phase === 'levelcomplete') return;
  G.piece = resolvePiece(PIECE_QUEUE[qHead % QUEUE_SIZE], G.level);
  qHead++;
  clampCol();
  if (collides(G.piece.shape, 0, G.piece.col)) { doGameOver(); return; }
  redraw();
}

function clampCol() {
  const cols = G.cols || BASE_COLS;
  const sh = G.piece.shape;
  const minC = Math.min(...sh.map(c => c[1]));
  const maxC = Math.max(...sh.map(c => c[1]));
  if (G.piece.col + minC < 0)      G.piece.col = -minC;
  if (G.piece.col + maxC >= cols)  G.piece.col = cols - 1 - maxC;
}

function collides(shape, row, col) {
  const cols = G.cols || BASE_COLS, rows = G.rows || BASE_ROWS;
  for (const [r, c] of shape) {
    const nr = row + r, nc = col + c;
    if (nr >= rows || nc < 0 || nc >= cols) return true;
    if (nr >= 0 && G.board[nr][nc]) return true;
  }
  return false;
}

// ── PIECE ACTIONS ─────────────────────────────────────────────
function moveLeft()  { tryMove(-1); }
function moveRight() { tryMove(1); }
function tryMove(d) {
  if (G.phase !== 'playing') return;
  const nc = G.piece.col + d;
  if (!collides(G.piece.shape, 0, nc)) { G.piece.col = nc; redraw(); }
}

function rotatePieceCW()  { doRotate(rotateCW); }
function rotatePieceCCW() { doRotate(rotateCCW); }
function doRotate(fn) {
  if (G.phase !== 'playing') return;
  const ns = fn(G.piece.shape), os = G.piece.shape, oc = G.piece.col;
  G.piece.shape = ns;
  clampCol();
  if (collides(ns, 0, G.piece.col)) { G.piece.shape = os; G.piece.col = oc; }
  redraw();
}

function setColumn(c) {
  if (G.phase !== 'playing' || !G.piece) return;
  const cols = G.cols || BASE_COLS;
  const sh   = G.piece.shape;
  const minC = Math.min(...sh.map(x => x[1]));
  const maxC = Math.max(...sh.map(x => x[1]));
  let nc = c - Math.round((maxC - minC) / 2);
  nc = Math.max(-minC, Math.min(nc, cols - 1 - maxC));
  if (!collides(sh, 0, nc)) { G.piece.col = nc; redraw(); }
}

function dropPiece() {
  if (G.phase !== 'playing') return;
  const { shape, tiles, col } = G.piece;
  let row = 0;
  while (!collides(shape, row + 1, col)) row++;
  shape.forEach(([r, c], i) => {
    const nr = row + r, nc = col + c;
    if (nr >= 0) G.board[nr][nc] = { ...tiles[i] };
  });
  G.piece = null;   // clear so afterClear knows to spawn a new piece
  G.moves++;
  G.phase = 'clearing';
  processMatches();
}

// ── MATCH-3 ENGINE ────────────────────────────────────────────
// A gradient tile matches as EITHER of its two colors.
// A stone tile (hp=2) when matched: hp→1 (cracked), stays on board.
// A stone tile (hp=1) when matched: cleared normally.

function cellMatchColor(cell, color) {
  if (!cell) return false;
  if (cell.color === color) return true;
  if (cell.type === 'gradient' && cell.color2 === color) return true;
  return false;
}

function findMatches() {
  const cols = G.cols || BASE_COLS, rows = G.rows || BASE_ROWS;
  const hitSet = new Set();

  // Horizontal runs
  for (let r = 0; r < rows; r++) {
    let runStart = 0;
    for (let c = 1; c <= cols; c++) {
      const prev = G.board[r][c - 1];
      const curr = c < cols ? G.board[r][c] : null;
      const continues = curr && prev && (
        cellMatchColor(curr, prev.color) ||
        (prev.type === 'gradient' && cellMatchColor(curr, prev.color2))
      );
      if (!continues) {
        if (c - runStart >= 3) {
          for (let k = runStart; k < c; k++) hitSet.add(`${r},${k}`);
        }
        runStart = c;
      }
    }
  }

  // Vertical runs
  for (let c = 0; c < cols; c++) {
    let runStart = 0;
    for (let r = 1; r <= rows; r++) {
      const prev = G.board[r - 1][c];
      const curr = r < rows ? G.board[r][c] : null;
      const continues = curr && prev && (
        cellMatchColor(curr, prev.color) ||
        (prev.type === 'gradient' && cellMatchColor(curr, prev.color2))
      );
      if (!continues) {
        if (r - runStart >= 3) {
          for (let k = runStart; k < r; k++) hitSet.add(`${k},${c}`);
        }
        runStart = r;
      }
    }
  }

  return [...hitSet].map(s => s.split(',').map(Number));
}

function processMatches() {
  const hits = findMatches();
  if (!hits.length) { afterClear(); return; }

  // ── Step 1: detect new bombs from 5+ connected groups ──
  const hitCoords = new Set(hits.map(([r,c]) => `${r},${c}`));
  const processed = new Set();
  const newBombCells = new Map(); // "r,c" → 'bomb' | 'superbomb'

  hits.forEach(([sr, sc]) => {
    const key = `${sr},${sc}`;
    if (processed.has(key)) return;
    const cell = G.board[sr][sc];
    if (!cell || cell.type === 'stone' || cell.type === 'bomb' || cell.type === 'superbomb') return;
    const color = cell.color;
    const group = [];
    const stack = [[sr, sc]];
    while (stack.length) {
      const [r, c] = stack.pop();
      const k = `${r},${c}`;
      if (processed.has(k) || !hitCoords.has(k)) continue;
      const cc = G.board[r][c];
      if (!cc || cc.color !== color || cc.type === 'stone' || cc.type === 'bomb' || cc.type === 'superbomb') continue;
      processed.add(k);
      group.push([r, c]);
      stack.push([r+1,c],[r-1,c],[r,c+1],[r,c-1]);
    }
    if (group.length >= 5) {
      const rng  = mulberry32(((MASTER_SEED ^ (sr * 31 + sc * 17 + G.moves * 7)) >>> 0));
      const idx  = Math.floor(rng() * group.length);
      const type = group.length >= 7 ? 'superbomb' : 'bomb';
      const [br, bc] = group[idx];
      newBombCells.set(`${br},${bc}`, type);
      if (!featureTutorialSeen('bomb')) {
        markTutorialSeen('bomb');
        queueTutorial(TUTORIALS.bomb, null);
      }
    }
  });

  // ── Step 2: collect matched existing bombs, expand blast recursively ──
  // No gravity until ALL blasts are resolved.
  const cols = G.cols || BASE_COLS, rows = G.rows || BASE_ROWS;
  const allBlastCells = new Set(); // "r,c" of every cell caught in any explosion
  const bombQueue = [];

  hits.forEach(([r, c]) => {
    const cell = G.board[r][c];
    if (cell && (cell.type === 'bomb' || cell.type === 'superbomb')) {
      bombQueue.push([r, c]);
    }
  });

  // Expand blast queue — bombs hit by blasts chain into more blasts
  const queuedBombs = new Set(bombQueue.map(([r,c]) => `${r},${c}`));
  let bi = 0;
  while (bi < bombQueue.length) {
    const [br, bc] = bombQueue[bi++];
    const cell = G.board[br][bc];
    if (!cell) continue;
    const radius = cell.type === 'superbomb' ? 3 : 1;
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        const nr = br + dr, nc = bc + dc;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        allBlastCells.add(`${nr},${nc}`);
        // If this blast hits another bomb, chain it
        const nc2 = G.board[nr][nc];
        const nk  = `${nr},${nc}`;
        if (nc2 && (nc2.type === 'bomb' || nc2.type === 'superbomb') && !queuedBombs.has(nk)) {
          queuedBombs.add(nk);
          bombQueue.push([nr, nc]);
        }
      }
    }
  }

  const blastArray = [...allBlastCells].map(k => k.split(',').map(Number));

  // ── Step 3: build removal/crack lists for match hits ──
  const toRemove = [], toCrack = [];
  hits.forEach(([r, c]) => {
    const cell = G.board[r][c];
    if (!cell) return;
    if (newBombCells.has(`${r},${c}`)) return;
    if (cell.type === 'bomb' || cell.type === 'superbomb') return;
    if (cell.type === 'stone' && cell.hp > 1) toCrack.push([r, c]);
    else toRemove.push([r, c]);
  });

  // ── Step 4: spawn fx for all blasts up front ──
  if (blastArray.length) {
    const hasSuper = bombQueue.some(([r,c]) => G.board[r][c] && G.board[r][c].type === 'superbomb');
    spawnBlastGlow(blastArray, hasSuper);
    spawnExplosionParticles(blastArray, hasSuper);
  }

  // ── Step 5: animate match clear (non-bomb cells) ──
  G.clearCells = [...hits.filter(([r,c]) => !newBombCells.has(`${r},${c}`) && !allBlastCells.has(`${r},${c}`)),
                  ...blastArray.filter(([r,c]) => G.board[r][c])];
  G.clearFrame = 0;

  animateClear(() => {
    // Apply cracks
    toCrack.forEach(([r, c]) => { if (G.board[r][c]) G.board[r][c].hp = 1; });

    // Remove match cells
    let gain = 0;
    toRemove.forEach(([r, c]) => {
      const cell = G.board[r][c];
      if (cell) {
        G.board[r][c] = null;
        G.cleared[cell.color] = (G.cleared[cell.color] || 0) + 1;
        G.mana[cell.color]    = (G.mana[cell.color]    || 0) + 1;
        if (cell.type === 'skull') takeDamage();
        gain += cell.type === 'stone' ? 15 : cell.type === 'gradient' ? 12 : 10;
      }
    });

    // Remove all blast cells
    blastArray.forEach(([r, c]) => {
      const cell = G.board[r][c];
      if (cell) {
        G.board[r][c] = null;
        G.cleared[cell.color] = (G.cleared[cell.color] || 0) + 1;
        G.mana[cell.color]    = (G.mana[cell.color]    || 0) + 2;  // bombs give 2x mana
        gain += 20;
      }
    });

    // Promote new bomb tiles (after removals so they don't get wiped)
    newBombCells.forEach((type, key) => {
      const [r, c] = key.split(',').map(Number);
      if (G.board[r][c]) G.board[r][c].type = type;
    });

    toCrack.forEach(() => { gain += 5; });
    if (toRemove.length > 3) gain += Math.floor(toRemove.length / 3) * 5;
    G.score += gain;
    if (gain > 0) floatScore(gain);

    // ONE gravity pass after ALL blasts resolved (skip if Suspension active)
    if (G.suspendGravity) {
      G.suspendGravity = false; // consume it
    } else {
      applyGravity();
    }
    renderQuota();
    G.clearCells = [];
    redraw();
    tickParticles();

    setTimeout(processMatches, 90);
  });
}

function applyGravity() {
  const cols = G.cols || BASE_COLS, rows = G.rows || BASE_ROWS;
  for (let c = 0; c < cols; c++) {
    let wr = rows - 1;
    for (let r = rows - 1; r >= 0; r--) {
      if (G.board[r][c]) {
        G.board[wr][c] = G.board[r][c];
        if (wr !== r) G.board[r][c] = null;
        wr--;
      }
    }
    while (wr >= 0) { G.board[wr][c] = null; wr--; }
  }
}

function takeDamage() {
  if (G.shielded) { G.shielded = false; renderHearts(); updateSpellBar(); return; }
  G.hearts = Math.max(0, G.hearts - 1);
  renderHearts();
  if (G.hearts <= 0) {
    G.phase = 'gameover';  // set immediately so no piece spawns before the popup
    setTimeout(() => showCard(`
      <div class="ov-title" style="font-size:32px">💀 Defeated!</div>
      <div class="ov-sub">You were overwhelmed by Skull Tiles on Level ${G.level}.<br>Score: <b>${G.score.toLocaleString()}</b></div>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
        <button class="pill-btn secondary small-btn" onclick="openLevelSelect()">Level Select</button>
        <button class="pill-btn small-btn" onclick="onRestart()">Retry</button>
      </div>
    `), 400);
  }
}

function renderHearts() {
  const el = document.getElementById('hearts-display');
  if (!el) return;
  if (!G.cfg || !G.cfg.hasSkull) { el.style.display = 'none'; return; }
  el.style.display = 'flex';
  el.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const span = document.createElement('span');
    span.className = 'heart-icon';
    if (G.shielded && i === 0) span.textContent = '🛡️';
    else span.textContent = i < G.hearts ? '❤️' : '🖤';
    el.appendChild(span);
  }
}

function afterClear() {
  // If a tutorial is mid-display, defer until it's dismissed
  if (G.phase === 'tutorial' || _tutorialQueue.length) {
    G._deferredAfterClear = afterClear;
    return;
  }
  // Don't proceed if game is already over (e.g. skull damage triggered gameover)
  if (G.phase === 'gameover' || G.phase === 'levelcomplete') return;
  const done = G.cfg.colors.every(c => (G.cleared[c] || 0) >= (G.quota[c] || 0));
  if (done) { G.phase = 'levelcomplete'; setTimeout(showLevelComplete, 400); }
  else {
    G.phase = 'playing';
    if (!G.piece) spawnPiece();
    else redraw();
  }
}

// ── LEVEL COMPLETE / GAME OVER / PAUSE ───────────────────────
function showLevelComplete() {
  const stars = recordLevelComplete(G.level, G.moves);
  const lvl   = G.level;
  const lore  = LORE.find(l => l.level === lvl + 1) || null;
  const t     = getStarThresholds(lvl);
  const testBanner = (SAVE.settings && SAVE.settings.testMode)
    ? `<div class="test-mode-banner">🔮 Test Mode — win not saved</div>` : '';

  showCard(`
    <div class="complete-header">
      <div class="complete-title">Level ${lvl}</div>
      <div class="complete-sub">Complete!</div>
    </div>
    ${testBanner}
    <div class="stars-row">
      <span class="star dim" id="s1">★</span>
      <span class="star dim" id="s2">★</span>
      <span class="star dim" id="s3">★</span>
    </div>
    <div class="complete-stats">
      <div class="stat-pill"><span class="stat-label">Moves</span><span class="stat-val">${G.moves}</span></div>
      <div class="stat-pill"><span class="stat-label">Score</span><span class="stat-val">${G.score.toLocaleString()}</span></div>
    </div>
    <div class="move-info" style="margin-bottom:14px">3★ ≤${t.three} · 2★ ≤${t.two} moves</div>
    <div class="complete-actions">
      <button class="pill-btn secondary small-btn" onclick="openLevelSelect()">◂ Levels</button>
      <button class="pill-btn secondary small-btn" onclick="openSpellLoadout(() => showLevelComplete())">⚡ Spells</button>
      <button class="pill-btn small-btn" onclick="onNext(${lvl},${JSON.stringify(!!lore)})">Next ▸</button>
    </div>
  `);

  for (let i = 1; i <= 3; i++) {
    const el = document.getElementById('s' + i);
    if (i <= stars) setTimeout(() => { el.classList.remove('dim'); el.classList.add('lit','pop'); }, i * 280);
  }
  window._pendingLore = lore;
}

function highestUnlockedLevel() {
  return SAVE.unlockedLevels.size ? Math.max(...SAVE.unlockedLevels) : 1;
}

// Returns the best level to continue on — highest unlocked level
// whose chapter is actually playable (unlocked). Falls back to level 1.
function nextPlayableLevel() {
  // Get all unlocked levels, sorted descending
  const candidates = [...SAVE.unlockedLevels].sort((a, b) => b - a);
  for (const lvl of candidates) {
    const ch = chapterOf(lvl);
    if (isChapterUnlocked(ch)) return lvl;
  }
  return 1;
}

// Highest level the player has actually beaten (has ≥1 star)
function highestCompletedLevel() {
  const starred = Object.keys(SAVE.levelStars).map(Number).filter(lvl => SAVE.levelStars[lvl] > 0);
  return starred.length ? Math.max(...starred) : 0;
}

// True if every level in chapter ch has been completed (≥1 star)
function hasBeatenAllLevels(ch) {
  for (let lvl = chapterStart(ch); lvl <= chapterEnd(ch); lvl++) {
    if (!SAVE.levelStars[lvl] || SAVE.levelStars[lvl] < 1) return false;
  }
  return true;
}

window.openSpellLoadout = (returnCb) => {
  window._spellLoadoutReturn = returnCb || null;
  _renderSpellLoadout();
};

function _renderSpellLoadout() {
  const equipped   = SAVE.equippedSpells || [];
  const highestLvl = highestCompletedLevel();

  // Build grid HTML — all spells including locked ones
  const gridHtml = SPELLS.map(spell => {
    const isEquipped = equipped.includes(spell.id);
    const isUnlocked = spell.unlockLvl <= highestLvl;

    if (!isUnlocked) {
      return `<div class="sl-cell sl-locked">
        <span class="sl-lock">🔒</span>
        <span class="sl-unlock-lvl">Lv ${spell.unlockLvl}</span>
      </div>`;
    }

    return `<div class="sl-cell ${isEquipped ? 'sl-equipped' : 'sl-available'}" onclick="toggleEquipSpell('${spell.id}')">
      <canvas class="spell-loadout-cv" width="40" height="40" data-spell="${spell.id}" style="image-rendering:pixelated"></canvas>
      <span class="sl-name">${spell.name}</span>
      <span class="sl-cost">${spell.costLabel}</span>
      ${isEquipped ? `<span class="sl-remove">✕</span>` : ''}
    </div>`;
  }).join('');

  // Build equipped slots bar — 6 slots, filled or empty
  const slotsHtml = Array.from({ length: 6 }, (_, i) => {
    const spellId = equipped[i];
    const spell   = spellId ? SPELLS.find(s => s.id === spellId) : null;
    if (spell) {
      return `<div class="sl-slot sl-slot-filled" onclick="toggleEquipSpell('${spell.id}')">
        <canvas class="sl-slot-cv" width="32" height="32" data-spell="${spell.id}" style="image-rendering:pixelated"></canvas>
        <span class="sl-slot-x">✕</span>
      </div>`;
    }
    return `<div class="sl-slot sl-slot-empty"><span class="sl-slot-empty-icon">+</span></div>`;
  }).join('');

  showCard(`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <div class="lore-title" style="margin:0">⚡ Spells</div>
      <div class="sl-count">${equipped.length}<span style="color:var(--muted)">/6</span></div>
    </div>
    <div class="sl-grid">${gridHtml}</div>
    <div class="sl-bar-label">Equipped</div>
    <div class="sl-slots-row">${slotsHtml}</div>
    <div style="margin-top:14px;text-align:center">
      <button class="pill-btn small-btn" onclick="closeSpellLoadout()">Done</button>
    </div>
  `);

  requestAnimationFrame(() => {
    document.querySelectorAll('.spell-loadout-cv').forEach(cv => {
      drawSpellSprite(cv.getContext('2d'), cv.dataset.spell, 0, 0, 40);
    });
    document.querySelectorAll('.sl-slot-cv').forEach(cv => {
      drawSpellSprite(cv.getContext('2d'), cv.dataset.spell, 0, 0, 32);
    });
  });
}

window.closeSpellLoadout = () => {
  const cb = window._spellLoadoutReturn;
  window._spellLoadoutReturn = null;
  if (cb) cb();
  else hideCard();
};

window.toggleEquipSpell = (id) => {
  const equipped = SAVE.equippedSpells || [];
  const idx = equipped.indexOf(id);
  if (idx >= 0) equipped.splice(idx, 1);
  else if (equipped.length < 6) equipped.push(id);
  SAVE.equippedSpells = equipped;
  saveGame();
  _renderSpellLoadout();
};

window.onNext = (fromLvl, hasLore) => {
  hideCard();
  const lore    = window._pendingLore; window._pendingLore = null;
  const nextLvl = fromLvl + 1;
  goToLevel(nextLvl, hasLore && lore ? lore : null);
};

function doGameOver() {
  G.phase = 'gameover'; redraw();
  setTimeout(() => showCard(`
    <div class="ov-title">Game<br>Over</div>
    <div class="ov-sub">Level ${G.level} · Score <b>${G.score.toLocaleString()}</b></div>
    <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
      <button class="pill-btn secondary small-btn" onclick="openLevelSelect()">Level Select</button>
      <button class="pill-btn small-btn" onclick="onRestart()">Retry</button>
    </div>
  `), 350);
}

window.onRestart = () => { hideCard(); showLevelPreview(G.level); };

window.onPause = () => showCard(`
  <div class="pause-header">
    <div class="complete-title">Paused</div>
    <div class="complete-sub">Level ${G.level}</div>
  </div>
  <div class="complete-stats">
    <div class="stat-pill"><span class="stat-label">Moves</span><span class="stat-val">${G.moves}</span></div>
    <div class="stat-pill"><span class="stat-label">Score</span><span class="stat-val">${G.score.toLocaleString()}</span></div>
  </div>
  <div class="pause-actions">
    <button class="pill-btn" onclick="hideCard()">▶ Resume</button>
    <button class="pill-btn secondary small-btn" onclick="openLevelSelect()">◂ Level Select</button>
    <button class="pill-btn secondary small-btn" onclick="openSettings()">⚙ Settings</button>
    <button class="pill-btn secondary small-btn" onclick="confirmReturnToMenu()">⌂ Main Menu</button>
  </div>
`);

window.confirmReturnToMenu = () => showCard(`
  <div class="lore-title" style="margin-bottom:8px">Return to Menu?</div>
  <div class="lore-text" style="margin-bottom:16px">Your current level progress will be lost.</div>
  <div style="display:flex;gap:10px;justify-content:center">
    <button class="pill-btn secondary small-btn" onclick="onPause()">Cancel</button>
    <button class="pill-btn danger small-btn" onclick="doReturnToMenu()">Leave</button>
  </div>
`);

window.doReturnToMenu = () => {
  hideCard();
  showMainMenu();
};

// ── LEVEL SELECT / CHAPTERS ───────────────────────────────────
const MAX_LEVELS    = 2000;
const CHAPTER_SIZE  = 20;
const CHAPTER_COUNT = Math.ceil(MAX_LEVELS / CHAPTER_SIZE);
const STARS_PER_CHAPTER = CHAPTER_SIZE * 3;                       // 60 max per chapter
const CHAPTER_THRESHOLD = Math.ceil(STARS_PER_CHAPTER * (2 / 3)); // 40 per chapter needed

function chapterOf(lvl)   { return Math.floor((lvl - 1) / CHAPTER_SIZE) + 1; }
function chapterStart(ch) { return (ch - 1) * CHAPTER_SIZE + 1; }
function chapterEnd(ch)   { return Math.min(MAX_LEVELS, ch * CHAPTER_SIZE); }

// Stars earned within a single chapter
function chapterStars(ch) {
  let total = 0;
  for (let lvl = chapterStart(ch); lvl <= chapterEnd(ch); lvl++) {
    total += SAVE.levelStars[lvl] || 0;
  }
  return total;
}

// Total stars earned across ALL chapters up to and including ch
function totalStarsThrough(ch) {
  let total = 0;
  for (let c = 1; c <= ch; c++) total += chapterStars(c);
  return total;
}

// Stars required to unlock chapter ch (cumulative across all prior chapters)
// ch 2 needs 40, ch 3 needs 80, ch 4 needs 120, etc.
function starsRequiredFor(ch) {
  return (ch - 1) * CHAPTER_THRESHOLD;
}

function isChapterUnlocked(ch) {
  if (ch === 1) return true;
  return hasBeatenAllLevels(ch - 1);
}

// Check and auto-unlock first level of each chapter based on cumulative stars
function checkChapterUnlocks() {
  for (let ch = 2; ch <= CHAPTER_COUNT; ch++) {
    if (isChapterUnlocked(ch)) {
      SAVE.unlockedLevels.add(chapterStart(ch));
    }
  }
}

window.openLevelSelect = () => {
  hideCard();
  chapterPage = Math.max(0, Math.floor((chapterOf(G.level) - 1) / 10)); // jump to current chapter's page
  buildLevelGrid();
  document.getElementById('level-select-modal').classList.remove('hidden');
};
window.closeLevelSelect = () => {
  document.getElementById('level-select-modal').classList.add('hidden');
  if (G.phase === 'levelcomplete') {
    showLevelComplete();
  } else if (G.phase === 'playing' || G.phase === 'clearing' || G.phase === 'gameover') {
    // Mid-level — show pause card
    hideCard();
    onPause();
  } else {
    // Not in a level at all — return to main menu
    showMainMenu();
  }
};
window.openSpellLoadoutFromLevelSelect = () => {
  document.getElementById('level-select-modal').classList.add('hidden');
  openSpellLoadout(() => {
    document.getElementById('level-select-modal').classList.remove('hidden');
  });
};

const expandedChapters = new Set([1]);
let chapterPage = 0;   // 0-indexed, 10 chapters per page

window.toggleChapter = (ch) => {
  if (expandedChapters.has(ch)) {
    expandedChapters.clear();
  } else {
    expandedChapters.clear();
    expandedChapters.add(ch);
  }
  buildLevelGrid();
};

window.setChapterPage = (p) => {
  chapterPage = p;
  expandedChapters.clear();
  buildLevelGrid();
};


// True if player has completed ≥1 level in this chapter
function hasBeatenAnyLevel(ch) {
  for (let lvl = chapterStart(ch); lvl <= chapterEnd(ch); lvl++) {
    if (SAVE.levelStars[lvl] && SAVE.levelStars[lvl] > 0) return true;
  }
  return false;
}

// Render feature icon canvases for a chapter into a container element
function renderChapterFeatureIcons(el, ch) {
  el.innerHTML = '';

  // Themed chapter: show colored circle instead of feature icons
  const theme = CHAPTER_THEMES[ch];
  if (theme) {
    const dot = document.createElement('span');
    dot.title = theme.name;
    dot.style.cssText = `display:inline-block;width:11px;height:11px;border-radius:50%;
      background:${theme.circle};box-shadow:0 0 5px ${theme.circle}99;
      flex-shrink:0;vertical-align:middle`;
    el.appendChild(dot);
    return;
  }

  const chS = chapterStart(ch), chE = chapterEnd(ch);
  const feats = FEATURES.filter(f => f.unlockLvl >= chS && f.unlockLvl <= chE);
  feats.forEach(feat => {
    if (FEATURE_SPRITE_IDX[feat.id] != null) {
      const cv = document.createElement('canvas');
      cv.width = 14; cv.height = 14;
      cv.title = feat.name;
      cv.style.cssText = 'display:inline-block;image-rendering:pixelated;vertical-align:middle;margin-right:1px';
      el.appendChild(cv);
      requestAnimationFrame(() => drawFeatureSprite(cv.getContext('2d'), feat.id, 0, 0, 14));
    } else {
      const span = document.createElement('span');
      span.textContent = feat.icon;
      span.style.fontSize = '13px';
      el.appendChild(span);
    }
  });
}

// (Keep for spell icons)
function chapterFeatureIcons(ch) {
  return ''; // now handled by renderChapterFeatureIcons
}

// Get spells that unlock within this chapter's level range
function chapterSpells(ch) {
  const chS = chapterStart(ch), chE = chapterEnd(ch);
  return SPELLS.filter(s => s.unlockLvl >= chS && s.unlockLvl <= chE);
}

// Render colored spell sprite canvases into a container element
function renderChapterSpellIcons(el, ch) {
  const spells = chapterSpells(ch);
  el.innerHTML = '';
  spells.forEach(spell => {
    const costColor = Object.keys(spell.cost)[0]; // e.g. 'red', 'blue', 'yellow'
    const cv = document.createElement('canvas');
    cv.width = 14; cv.height = 14;
    cv.title = spell.name;
    cv.style.cssText = 'display:inline-block;image-rendering:pixelated;vertical-align:middle;margin-left:1px';
    el.appendChild(cv);
    requestAnimationFrame(() => {
      const ctx2 = cv.getContext('2d');
      drawSprite(ctx2, costColor, 0, 0, 14, 1, 1);
    });
  });
}

function buildLevelGrid() {
  checkChapterUnlocks();
  const grid = document.getElementById('lvlsel-grid');
  grid.innerHTML = '';
  grid.style.display = 'block';

  const testMode = !!(SAVE.settings && SAVE.settings.testMode);
  const PAGE_SIZE = 10;

  // Visible: ch1 always; chN visible only if player beat ≥1 level in ch(N-1)
  // Playable: visible AND cumulative star gate met
  const visibleChs = [], playableChs = [];
  for (let ch = 1; ch <= CHAPTER_COUNT; ch++) {
    const visible  = ch === 1 || hasBeatenAnyLevel(ch - 1);
    const starsMet = isChapterUnlocked(ch);
    if (visible) visibleChs.push(ch);
    if (visible && starsMet) playableChs.push(ch);
    if (!visible) break;
  }
  const lastVisibleCh = visibleChs[visibleChs.length - 1] || 1;

  // In test mode, append up to 20 extra chapters to the visible list
  if (testMode) {
    const extraEnd = Math.min(CHAPTER_COUNT, lastVisibleCh + 20);
    for (let ch = lastVisibleCh + 1; ch <= extraEnd; ch++) visibleChs.push(ch);
  }

  // Pagination
  const totalPages = Math.ceil(visibleChs.length / PAGE_SIZE);
  const page       = Math.max(0, Math.min(chapterPage, totalPages - 1));
  const pageStart  = page * PAGE_SIZE;
  const pageChs    = visibleChs.slice(pageStart, pageStart + PAGE_SIZE);

  // Paginator controls
  if (totalPages > 1) {
    const pager = document.createElement('div');
    pager.className = 'ch-pager';
    pager.innerHTML = `
      <button class="ch-page-btn" ${page === 0 ? 'disabled' : ''} onclick="setChapterPage(${page - 1})">‹</button>
      <span class="ch-page-label">Ch ${visibleChs[pageStart]}–${visibleChs[Math.min(pageStart + PAGE_SIZE - 1, visibleChs.length - 1)]}</span>
      <button class="ch-page-btn" ${page >= totalPages - 1 ? 'disabled' : ''} onclick="setChapterPage(${page + 1})">›</button>`;
    grid.appendChild(pager);
  }

  // Render this page's chapters
  for (const ch of pageChs) {
    const chFirst    = chapterStart(ch);
    const chLast     = chapterEnd(ch);
    const chStars    = chapterStars(ch);
    const expanded   = expandedChapters.has(ch);
    const hasCurrent = G.level >= chFirst && G.level <= chLast;
    const playable   = playableChs.includes(ch);
    const isTest     = ch > lastVisibleCh;

    const featIconHtml  = `<span class="ch-feat-icons"></span>`;
    const spellIconHtml = `<span class="ch-spell-icons"></span>`;

    const header = document.createElement('div');
    if (isTest) {
      header.className = 'ch-header unlocked ch-test' + (hasCurrent ? ' current' : '');
      header.innerHTML = `
        ${featIconHtml}
        ${spellIconHtml}
        <span class="ch-title">Chapter ${ch} <span class="ch-lvl-range">${chFirst}–${chLast}</span></span>
        <span class="ch-stars-pct" style="color:var(--muted);font-size:10px">🔮 Test</span>
        <span class="ch-arrow">${expanded ? '▾' : '▸'}</span>`;
      header.addEventListener('click', () => window.toggleChapter(ch));
    } else if (playable) {
      header.className = 'ch-header unlocked' + (hasCurrent ? ' current' : '');
      header.innerHTML = `
        ${featIconHtml}
        ${spellIconHtml}
        <span class="ch-title">Chapter ${ch} <span class="ch-lvl-range">${chFirst}–${chLast}</span></span>
        <span class="ch-stars-pct">${chStars}/${STARS_PER_CHAPTER}★</span>
        <span class="ch-arrow">${expanded ? '▾' : '▸'}</span>`;
      header.addEventListener('click', () => window.toggleChapter(ch));
    } else {
      const beaten    = Array.from({length: CHAPTER_SIZE}, (_, i) => {
        const l = chapterStart(ch - 1) + i;
        return (SAVE.levelStars[l] || 0) > 0;
      }).filter(Boolean).length;
      const total = chapterEnd(ch - 1) - chapterStart(ch - 1) + 1;
      const still = total - beaten;
      header.className = 'ch-header locked';
      header.innerHTML = `
        ${featIconHtml}
        ${spellIconHtml}
        <span class="ch-title">Chapter ${ch} <span class="ch-lvl-range">${chFirst}–${chLast}</span></span>
        <span class="ch-stars-pct ch-lock-req">🔒 ${still} level${still !== 1 ? 's' : ''} remaining</span>
        <span class="ch-arrow" style="opacity:.3">▸</span>`;
    }
    grid.appendChild(header);
    renderChapterFeatureIcons(header.querySelector('.ch-feat-icons'), ch);
    renderChapterSpellIcons(header.querySelector('.ch-spell-icons'), ch);

    if (!expanded || (!playable && !isTest)) continue;

    const lvlGrid = document.createElement('div');
    lvlGrid.className = 'lvlsel-grid';
    for (let lvl = chFirst; lvl <= chLast; lvl++) {
      const unlocked  = isLevelUnlocked(lvl) || testMode;
      const stars     = SAVE.levelStars[lvl] || 0;
      const current   = lvl === G.level;
      const featIcons = getActiveFeatures(lvl)
        .map(id => FEATURES.find(f => f.id === id)).filter(Boolean)
        .slice(0, featureSlots(lvl)).map(f => f.icon).join('');
      const spellUnlock = SPELLS.find(s => s.unlockLvl === lvl);
      const btn = document.createElement('button');
      btn.className = 'lvl-btn' + (unlocked ? ' unlocked' : ' locked') + (current ? ' current' : '') + (isTest ? ' ch-test-btn' : '');

      const starsEl = document.createElement('span');
      starsEl.className = 'lvl-stars';
      starsEl.innerHTML = starsHtml(stars);

      const numWrap = document.createElement('span');
      numWrap.className = 'lvl-num-wrap';
      const numEl = document.createElement('span');
      numEl.className = 'lvl-num';
      numEl.textContent = lvl;
      numWrap.appendChild(numEl);
      if (spellUnlock) {
        const cv = document.createElement('canvas');
        cv.width = 12; cv.height = 12;
        cv.className = 'lvl-spell-cv';
        cv.title = spellUnlock.name;
        numWrap.appendChild(cv);
        requestAnimationFrame(() => {
          const ctx2 = cv.getContext('2d');
          const costColor = Object.keys(spellUnlock.cost)[0];
          drawSprite(ctx2, costColor, 0, 0, 12, 1, 1);
        });
      }

      const featEl = document.createElement('span');
      featEl.className = 'lvl-feat-icons';
      // Render feature sprites (or emoji fallback)
      const featIds = getActiveFeatures(lvl).slice(0, featureSlots(lvl));
      featIds.forEach(id => {
        const feat = FEATURES.find(f => f.id === id);
        if (!feat) return;
        if (FEATURE_SPRITE_IDX[id] != null) {
          const cv = document.createElement('canvas');
          cv.width = 10; cv.height = 10;
          cv.style.cssText = 'display:inline-block;image-rendering:pixelated;vertical-align:middle;margin:0 0.5px';
          featEl.appendChild(cv);
          requestAnimationFrame(() => drawFeatureSprite(cv.getContext('2d'), id, 0, 0, 10));
        } else {
          const span = document.createElement('span');
          span.textContent = feat.icon;
          featEl.appendChild(span);
        }
      });

      btn.appendChild(starsEl);
      btn.appendChild(numWrap);
      btn.appendChild(featEl);
      if (unlocked) btn.addEventListener('click', () => { closeLevelSelect(); hideCard(); goToLevel(lvl, null); });
      lvlGrid.appendChild(btn);
    }
    grid.appendChild(lvlGrid);
  }

  // Bottom paginator too if multiple pages
  if (totalPages > 1) {
    const pager2 = document.createElement('div');
    pager2.className = 'ch-pager';
    pager2.innerHTML = `
      <button class="ch-page-btn" ${page === 0 ? 'disabled' : ''} onclick="setChapterPage(${page - 1})">‹ Prev</button>
      <span class="ch-page-label">Page ${page + 1} / ${totalPages}</span>
      <button class="ch-page-btn" ${page >= totalPages - 1 ? 'disabled' : ''} onclick="setChapterPage(${page + 1})">Next ›</button>`;
    grid.appendChild(pager2);
  }
}


function starsHtml(count) {
  let h = '';
  for (let i = 1; i <= 3; i++) {
    h += `<span style="color:rgb(255,255,0);font-size:16px;opacity:${i<=count?1:.2}">★</span>`;
  }
  return h;
}

// ── TUTORIAL SYSTEM ──────────────────────────────────────────
// Feature tutorials shown once on the level a feature first unlocks.
// Bomb tutorial shown on first bomb creation.
const TUTORIALS = {
  bomb: {
    icon: '💣',
    title: 'Bombs!',
    text: 'You made a 5+ tile match! One tile became a Bomb. Tap it to blast all adjacent tiles — clearing them toward your quota. Bigger matches (7+) make a Super Bomb with a 3-tile radius. 💥',
  },
};

function featureTutorialSeen(id) {
  return (SAVE.tutorialsSeen || {})[id];
}
function markTutorialSeen(id) {
  if (!SAVE.tutorialsSeen) SAVE.tutorialsSeen = {};
  SAVE.tutorialsSeen[id] = true;
  saveGame();
}

// Show a tutorial popup (non-blocking — has a dismiss button that resumes)
function showTutorial(tut, cb) {
  showCard(`
    <div style="font-size:40px;margin-bottom:8px">${tut.icon}</div>
    <div class="lore-title">${tut.title}</div>
    <div class="lore-text" style="margin-bottom:16px">${tut.text}</div>
    <button class="pill-btn small-btn" onclick="dismissTutorial()">Got it! ›</button>
  `);
  window._tutorialCb = cb;
}
window.dismissTutorial = () => {
  hideCard();
  const cb = window._tutorialCb;
  window._tutorialCb = null;
  if (cb) cb();
  // Safety net: if phase is still 'tutorial' after all callbacks, restore it
  if (G.phase === 'tutorial') {
    G.phase = 'playing';
    if (!G.piece) spawnPiece();
  }
};

// Queue-based tutorial: tutorials that fire mid-game (e.g. bomb) use this.
// Sets G.phase = 'tutorial' so afterClear/levelcomplete defer until dismissed.
let _tutorialQueue = [];
function queueTutorial(tut, cb) {
  _tutorialQueue.push({ tut, cb });
  if (_tutorialQueue.length === 1) drainTutorialQueue();
}
function drainTutorialQueue() {
  if (!_tutorialQueue.length) {
    // Resume any deferred afterClear, or just restore playing phase
    if (G._deferredAfterClear) {
      const fn = G._deferredAfterClear;
      G._deferredAfterClear = null;
      fn();
    } else if (G.phase === 'tutorial') {
      G.phase = 'playing';
      if (!G.piece) spawnPiece();  // ensure a piece is ready after tutorial
    }
    return;
  }
  G.phase = 'tutorial';
  const { tut, cb } = _tutorialQueue[0];
  showTutorial(tut, () => {
    _tutorialQueue.shift();
    if (cb) cb();
    drainTutorialQueue();
  });
}

// ── LORE CARD ───────────────────────────────────────────────
function showLore(lore, cb) {
  document.getElementById('lore-icon').textContent  = lore.icon;
  document.getElementById('lore-title').textContent = lore.title;
  document.getElementById('lore-text').textContent  = lore.text;
  document.getElementById('lore-modal').classList.remove('hidden');
  document.getElementById('lore-close').onclick = () => {
    document.getElementById('lore-modal').classList.add('hidden');
    cb && cb();
  };
}


// ── BOMB SYSTEM ───────────────────────────────────────────────
// Bombs are board cells with type 'bomb' or 'superbomb'.
// They are created after a match of 5+ same-color connected tiles.
// Tapping a bomb cell detonates it.

// Flood-fill same color (cardinal) from a seed cell — returns all connected same-color cells
function floodFillColor(startR, startC, colorTest) {
  const cols = G.cols || BASE_COLS, rows = G.rows || BASE_ROWS;
  const visited = new Set();
  const stack   = [[startR, startC]];
  while (stack.length) {
    const [r, c] = stack.pop();
    const key = `${r},${c}`;
    if (visited.has(key)) continue;
    if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
    const cell = G.board[r][c];
    if (!cell || !colorTest(cell)) continue;
    visited.add(key);
    stack.push([r+1,c],[r-1,c],[r,c+1],[r,c-1]);
  }
  return [...visited].map(k => k.split(',').map(Number));
}

// After a clear, check remaining board for large same-color connected groups
// and convert a random cell in each group to a bomb if size >= 5
function checkAndPlaceBombs() {
  const cols = G.cols || BASE_COLS, rows = G.rows || BASE_ROWS;
  const processed = new Set();
  let madeAny = false;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = G.board[r][c];
      if (!cell || cell.type === 'bomb' || cell.type === 'superbomb') continue;
      const key = `${r},${c}`;
      if (processed.has(key)) continue;
      const color = cell.color;
      const group = floodFillColor(r, c, (cc) => cc.color === color && cc.type !== 'bomb' && cc.type !== 'superbomb');
      group.forEach(([gr, gc]) => processed.add(`${gr},${gc}`));
      if (group.length < 5) continue;

      // Pick a random cell from the group to become a bomb
      const rng    = mulberry32(((MASTER_SEED ^ (r * 31 + c * 17 + G.moves * 7)) >>> 0));
      const idx    = Math.floor(rng() * group.length);
      const [br, bc] = group[idx];
      const type   = group.length >= 7 ? 'superbomb' : 'bomb';
      G.board[br][bc] = { ...G.board[br][bc], type };
      madeAny = true;

      // Show bomb tutorial on first ever bomb
      if (!featureTutorialSeen('bomb')) {
        markTutorialSeen('bomb');
        queueTutorial(TUTORIALS.bomb, null);
      }
    }
  }
  return madeAny;
}

// Detonate a bomb at (r, c) — called by player tap, preserves current piece
function detonateBomb(r, c) {
  if (G.phase !== 'playing') return;
  const cell = G.board[r][c];
  if (!cell || (cell.type !== 'bomb' && cell.type !== 'superbomb')) return;
  const savedPiece = G.piece;
  detonateBombCore(r, c, cell.type === 'superbomb', () => {
    G.piece = savedPiece;
    G.phase = 'clearing';
    setTimeout(processMatches, 90);
  });
}

// Called during match-chain — no phase guard, cb handles flow
function detonateBombChained(r, c, cb) {
  const cell = G.board[r][c];
  if (!cell || (cell.type !== 'bomb' && cell.type !== 'superbomb')) { cb(); return; }
  detonateBombCore(r, c, cell.type === 'superbomb', cb);
}

// Shared detonation core: expands chain blasts, spawns fx, animates, applies gravity once, calls cb
function detonateBombCore(r, c, isSuper, cb) {
  const cols = G.cols || BASE_COLS, rows = G.rows || BASE_ROWS;

  // Expand all chained bomb blasts before anything is removed
  const allBlastCells = new Set();
  const bombQueue     = [[r, c]];
  const queuedSet     = new Set([`${r},${c}`]);
  let bi = 0;
  while (bi < bombQueue.length) {
    const [br, bc] = bombQueue[bi++];
    const cell     = G.board[br][bc];
    if (!cell) continue;
    const radius = cell.type === 'superbomb' ? 3 : 1;
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        const nr = br + dr, nc = bc + dc;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        allBlastCells.add(`${nr},${nc}`);
        const nc2 = G.board[nr][nc];
        const nk  = `${nr},${nc}`;
        if (nc2 && (nc2.type === 'bomb' || nc2.type === 'superbomb') && !queuedSet.has(nk)) {
          queuedSet.add(nk);
          bombQueue.push([nr, nc]);
        }
      }
    }
  }

  const blastArray = [...allBlastCells].map(k => k.split(',').map(Number));
  const hasSuper   = bombQueue.some(([br,bc]) => G.board[br][bc] && G.board[br][bc].type === 'superbomb') || isSuper;

  spawnBlastGlow(blastArray, hasSuper);
  spawnExplosionParticles(blastArray, hasSuper);

  G.clearCells = blastArray.filter(([br, bc]) => G.board[br][bc]);
  G.clearFrame = 0;
  G.phase      = 'clearing';

  animateClear(() => {
    let gain = 0;
    blastArray.forEach(([br, bc]) => {
      const bc2 = G.board[br][bc];
      if (bc2) {
        G.board[br][bc] = null;
        G.cleared[bc2.color] = (G.cleared[bc2.color] || 0) + 1;
        gain += 20;
      }
    });
    G.score += gain;
    if (gain > 0) floatScore(gain);
    applyGravity();
    renderQuota();
    G.clearCells = [];
    redraw();
    tickParticles();
    cb();
  });
}

// Handle tap on board — check for bomb tap, otherwise column select
// ── MANA DISPLAY ─────────────────────────────────────────────
function renderMana() {
  const el = document.getElementById('mana-display');
  if (!el || !G.cfg) return;
  el.innerHTML = '';
  G.cfg.colors.forEach(color => {
    const amount = G.mana[color] || 0;
    const div    = document.createElement('div');
    div.className = 'mana-item';

    // Small sprite canvas (colored row)
    const cv  = document.createElement('canvas');
    cv.width  = 20; cv.height = 20;
    cv.className = 'mana-sprite-cv';
    div.appendChild(cv);

    const val = document.createElement('span');
    val.className = 'mana-val';
    val.textContent = amount;
    div.appendChild(val);
    el.appendChild(div);

    // Draw after appended so spritesheet has time to be ready
    requestAnimationFrame(() => {
      const ctx2 = cv.getContext('2d');
      ctx2.clearRect(0, 0, 20, 20);
      drawSprite(ctx2, color, 0, 0, 20, 1, 1); // row 1 = colored
    });
  });
  // Update affordability only — no DOM rebuild, no flicker
  refreshSpellBarAffordability();
}

// ── SPELL BAR ────────────────────────────────────────────────
// Full rebuild — call only on level start, spell mode change, or unlock
function updateSpellBar() {
  const bar = document.getElementById('spell-bar');
  if (!bar) return;
  if (!spellsUnlocked(G.level)) { bar.classList.add('hidden'); return; }
  bar.classList.remove('hidden');
  bar.innerHTML = '';
  const equippedIds = SAVE.equippedSpells || [];
  SPELLS.filter(s => equippedIds.includes(s.id) ).forEach(spell => {
    const affordable = canCastSpell(spell);
    const active     = G.spellMode === spell.id;
    const btn = document.createElement('div');
    btn.className = 'spell-slot ' + spell.bgClass + (affordable ? ' can-cast' : ' no-mana') + (active ? ' active' : '');
    btn.dataset.spellId = spell.id;
    const costHtml = Object.entries(spell.cost).map(([color, amt]) =>
      `${amt}<canvas class="cost-sprite-cv" width="14" height="14" data-color="${color}"></canvas>`
    ).join(' ');
    btn.innerHTML = `
      <canvas class="spell-icon-cv" width="28" height="28"></canvas>
      <span class="spell-cost">${costHtml}</span>`;
    requestAnimationFrame(() => {
      const cv = btn.querySelector('.spell-icon-cv');
      if (cv) drawSpellSprite(cv.getContext('2d'), spell.id, 0, 0, 28);
    });
    requestAnimationFrame(() => {
      btn.querySelectorAll('.cost-sprite-cv').forEach(cv => {
        drawSprite(cv.getContext('2d'), cv.dataset.color, 0, 0, 14, 1, 1);
      });
    });
    let holdTimer = null;
    const onDown = () => {
      holdTimer = setTimeout(() => { holdTimer = null; showSpellInfo(spell); }, 600);
    };
    const onUp = () => {
      if (holdTimer) {
        clearTimeout(holdTimer); holdTimer = null;
        if (canCastSpell(spell)) enterSpellMode(spell.id);
      }
    };
    const onCancel = () => { if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; } };
    btn.addEventListener('pointerdown',  onDown);
    btn.addEventListener('pointerup',    onUp);
    btn.addEventListener('pointerleave', onCancel);
    btn.addEventListener('pointercancel',onCancel);
    btn.style.touchAction = 'none';
    bar.appendChild(btn);
  });

  // Cast bar overlay
  if (G.spellMode) {
    const spell   = SPELLS.find(s => s.id === G.spellMode);
    const targets = G.spellTargets || [];
    const needed  = spell ? spell.targets : 1;
    const ready   = targets.length >= needed;
    let label = 'Tap a tile to target';
    if (spell && spell.id === 'swap') {
      label = targets.length === 0 ? 'Tap first tile' : 'Tap adjacent tile';
    } else if (spell && spell.id === 'transmute') {
      label = targets.length === 0 ? 'Tap tile to change' : 'Tap adjacent tile to copy';
    } else if (spell && spell.id === 'mass-transmute') {
      label = targets.length === 0 ? 'Tap color to replace' : 'Tap color to become';
    } else if (spell && spell.id === 'pillar-of-fire') {
      label = 'Tap any tile in the column';
    }
    const castBar = document.createElement('div');
    castBar.className = 'cast-bar';
    castBar.innerHTML = `
      <span class="cast-label">${label}</span>
      ${ready ? `<button class="pill-btn small-btn" onclick="castSpell()">Cast</button>` : ''}
      <button class="pill-btn danger small-btn" onclick="cancelSpell()">Cancel</button>`;
    bar.appendChild(castBar);
  }
}

// Lightweight affordability update — just flips classes, no DOM rebuild, no canvas flicker
function refreshSpellBarAffordability() {
  const bar = document.getElementById('spell-bar');
  if (!bar) return;
  bar.querySelectorAll('.spell-slot[data-spell-id]').forEach(btn => {
    const spell = SPELLS.find(s => s.id === btn.dataset.spellId);
    if (!spell) return;
    const affordable = canCastSpell(spell);
    btn.classList.toggle('can-cast', affordable);
    btn.classList.toggle('no-mana', !affordable);
  });
}

function showSpellInfo(spell) {
  showCard(`
    <div style="font-size:36px;margin-bottom:8px">${spell.icon}</div>
    <div class="lore-title">${spell.name}</div>
    <div class="lore-text" style="margin-bottom:12px">${spell.desc}</div>
    <div class="move-info">Cost: <b>${spell.costLabel}</b></div>
    <button class="pill-btn small-btn" style="margin-top:14px" onclick="hideCard()">Close</button>
  `);
}

function enterSpellMode(spellId) {
  if (G.phase !== 'playing') return;
  const spell = SPELLS.find(s => s.id === spellId);
  if (!spell) return;

  // Instant spells (targets=0): cast immediately
  if (spell.targets === 0) {
    if (!canCastSpell(spell)) return;
    spendMana(spell);
    executeSpell(spell, []);
    return;
  }

  G.spellMode    = spellId;
  G.spellTargets = [];   // array of {r,c} for multi-target spells
  updateSpellBar();
  redraw();
}

window.cancelSpell = () => {
  G.spellMode = null; G.spellTargets = [];
  updateSpellBar(); redraw();
};

window.castSpell = () => {
  const spell = SPELLS.find(s => s.id === G.spellMode);
  if (!spell || !canCastSpell(spell)) return;
  if ((G.spellTargets || []).length < spell.targets) return;
  spendMana(spell);
  const targets = G.spellTargets || [];
  G.spellMode = null; G.spellTargets = [];
  renderMana(); updateSpellBar();
  executeSpell(spell, targets);
};

function executeSpell(spell, targets) {
  const savedPiece = G.piece;

  const restoreAndContinue = () => {
    G.piece = savedPiece;
    G.phase = 'clearing';
    setTimeout(processMatches, 90);
  };

  if (spell.id === 'cut') {
    const { r, c } = targets[0];
    const cell = G.board[r][c];
    if (cell) {
      G.cleared[cell.color] = (G.cleared[cell.color] || 0) + 1;
      G.mana[cell.color]    = (G.mana[cell.color]    || 0) + 1;
      G.board[r][c] = null;
    }
    applyGravity(); renderQuota(); redraw();
    restoreAndContinue();

  } else if (spell.id === 'gravity') {
    applyGravity(); redraw();
    restoreAndContinue();

  } else if (spell.id === 'swap') {
    const [a, b] = targets;
    const tmp = G.board[a.r][a.c];
    G.board[a.r][a.c] = G.board[b.r][b.c];
    G.board[b.r][b.c] = tmp;
    redraw();
    restoreAndContinue();

  } else if (spell.id === 'bomb-tile') {
    const { r, c } = targets[0];
    if (G.board[r][c]) { G.board[r][c].type = 'bomb'; G.board[r][c].hp = 1; }
    G.piece = savedPiece;
    redraw();

  } else if (spell.id === 'suspension') {
    G.suspendGravity = true;
    G.piece = savedPiece;
    redraw();

  } else if (spell.id === 'transmute') {
    // targets[0] = tile to change, targets[1] = adjacent tile to copy color from
    const [a, b] = targets;
    const src = G.board[b.r][b.c];
    const dst = G.board[a.r][a.c];
    if (src && dst) {
      dst.color  = src.color;
      dst.color2 = src.color2 || null; // copy gradient if applicable
    }
    G.piece = savedPiece;
    redraw();
    restoreAndContinue();

  } else if (spell.id === 'mend') {
    if (G.hearts < 3) {
      G.hearts = Math.min(3, G.hearts + 1);
      renderHearts();
    }
    G.piece = savedPiece;
    redraw();

  } else if (spell.id === 'pillar-of-fire') {
    const col  = targets[0].c;
    const rows = G.rows || BASE_ROWS;
    for (let row = 0; row < rows; row++) {
      const cell = G.board[row][col];
      if (cell) {
        G.cleared[cell.color] = (G.cleared[cell.color] || 0) + 1;
        G.mana[cell.color]    = (G.mana[cell.color]    || 0) + 1;
        G.board[row][col] = null;
      }
    }
    // Spawn blast FX on the whole column
    const blastCells = Array.from({ length: rows }, (_, row) => [row, col]);
    spawnBlastGlow(blastCells, false);
    spawnExplosionParticles(blastCells, false);
    applyGravity(); renderQuota(); redraw();
    tickParticles();
    restoreAndContinue();

  } else if (spell.id === 'shield') {
    G.shielded = true;
    G.piece = savedPiece;
    renderHearts(); updateSpellBar(); redraw();

  } else if (spell.id === 'mass-transmute') {
    // targets[0] = tile of color to change FROM, targets[1] = tile of color to change TO
    const fromColor = G.board[targets[0].r][targets[0].c]?.color;
    const toColor   = G.board[targets[1].r][targets[1].c]?.color;
    if (fromColor && toColor && fromColor !== toColor) {
      const rows = G.rows || BASE_ROWS, cols = G.cols || BASE_COLS;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const cell = G.board[row][col];
          if (cell && cell.color === fromColor) cell.color = toColor;
          if (cell && cell.color2 === fromColor) cell.color2 = toColor;
        }
      }
    }
    G.piece = savedPiece;
    redraw();
    restoreAndContinue();
  }
}

// Handle spell targeting tap on board
function handleSpellTap(row, col) {
  if (!G.spellMode) return false;
  const spell = SPELLS.find(s => s.id === G.spellMode);
  if (!spell) return false;
  const rows = G.rows || BASE_ROWS, cols = G.cols || BASE_COLS;
  if (row < 0 || row >= rows || col < 0 || col >= cols) return false;

  if (spell.id === 'gravity' || spell.id === 'suspension' ||
      spell.id === 'shield'  || spell.id === 'mend') return false; // instant spells

  // Swap and Transmute: need two tiles (transmute requires adjacency like swap)
  if (spell.id === 'swap' || spell.id === 'transmute') {
    if (!G.board[row][col]) return false;
    const targets = G.spellTargets || [];
    if (targets.length === 1 && targets[0].r === row && targets[0].c === col) {
      G.spellTargets = [];
      updateSpellBar(); redraw(); return true;
    }
    if (targets.length === 1) {
      const a = targets[0];
      const adjacent = (Math.abs(a.r - row) + Math.abs(a.c - col)) === 1;
      if (!adjacent) {
        G.spellTargets = [{ r: row, c: col }];
        updateSpellBar(); redraw(); return true;
      }
      G.spellTargets.push({ r: row, c: col });
      updateSpellBar(); redraw(); return true;
    }
    G.spellTargets = [{ r: row, c: col }];
    updateSpellBar(); redraw(); return true;
  }

  // Mass Transmute: any two tiles (no adjacency — just need 2 different colors)
  if (spell.id === 'mass-transmute') {
    if (!G.board[row][col]) return false;
    const targets = G.spellTargets || [];
    if (targets.length === 1 && targets[0].r === row && targets[0].c === col) {
      G.spellTargets = [];
      updateSpellBar(); redraw(); return true;
    }
    if (targets.length === 1) {
      G.spellTargets.push({ r: row, c: col });
      updateSpellBar(); redraw(); return true;
    }
    G.spellTargets = [{ r: row, c: col }];
    updateSpellBar(); redraw(); return true;
  }

  // Single-target spells (cut, bomb-tile, pillar-of-fire)
  if (!G.board[row][col] && spell.id !== 'pillar-of-fire') return false;
  G.spellTargets = [{ r: row, c: col }];
  updateSpellBar(); redraw();
  return true;
}
function showCard(html) {
  document.getElementById('screen-content').innerHTML = html;
  document.getElementById('screen-overlay').style.display = 'flex';
}
function hideCard() { document.getElementById('screen-overlay').style.display = 'none'; }

// ── CANVAS ────────────────────────────────────────────────────
const canvas = document.getElementById('game-canvas');
const ctx    = canvas.getContext('2d');
const pvCv   = document.getElementById('preview-canvas');
const pvCtx  = pvCv.getContext('2d');
let CS = 36;

function resizeCanvas() {
  const wrap  = document.getElementById('board-wrap');
  const PAD   = 6;   // gap between canvas right edge and sidebar
  const availW = wrap.clientWidth  - PAD;
  const availH = wrap.clientHeight - PAD;
  const cols   = G.cols || BASE_COLS;
  const rows   = G.rows || BASE_ROWS;
  CS = Math.floor(Math.min((availW - LABEL_W) / cols, (availH - LABEL_H) / rows));
  if (CS < 1) CS = 1;
  G.boardOffX = LABEL_W;
  G.boardOffY = LABEL_H;
  const W = LABEL_W + CS * cols;
  const H = LABEL_H + CS * rows;
  canvas.width  = W; canvas.height = H;
  canvas.style.width  = W + 'px'; canvas.style.height = H + 'px';
  buildColZones(W, H);
  redraw();
}

function buildColZones(W, H) {
  const cols = G.cols || BASE_COLS;
  const cz   = document.getElementById('col-zones');
  cz.innerHTML = '';
  cz.style.cssText = `position:absolute;top:0;left:${LABEL_W}px;width:${CS * cols}px;height:${H}px;display:flex;`;
  for (let c = 0; c < cols; c++) {
    const d = document.createElement('div');
    d.className = 'cz'; d.style.width = CS + 'px';
    const zoneCol = c;
    d.addEventListener('pointerdown', e => {
      e.preventDefault();
      const ox   = G.boardOffX || 0;
      const oy   = G.boardOffY || 0;
      const rect = canvas.getBoundingClientRect();
      // Use exact pixel position to find true col (handles fat-finger near column edges)
      const bx   = e.clientX - rect.left - ox;
      const by   = e.clientY - rect.top  - oy;
      const exactCol = Math.floor(bx / CS);
      const row      = Math.floor(by / CS);
      const rows     = G.rows || BASE_ROWS;
      const col      = (exactCol >= 0 && exactCol < cols) ? exactCol : zoneCol;

      // Spell targeting mode
      if (G.spellMode) { handleSpellTap(row, col); return; }

      // Bomb tap check
      if (row >= 0 && row < rows && col >= 0 && col < cols) {
        const cell = G.board[row][col];
        if (cell && (cell.type === 'bomb' || cell.type === 'superbomb')) {
          detonateBomb(row, col);
          return;
        }
      }
      setColumn(col);
    });
    cz.appendChild(d);
  }
}

// ── GEM DRAWERS ───────────────────────────────────────────────

// Draw a standard round gem with mana icon
function drawGem(ctx, x, y, size, colorName, alpha = 1, scale = 1, skipSprite = false) {
  if (colorName === 'void') { drawVoidGem(ctx, x, y, size, alpha, scale); return; }
  const pal = C[colorName]; if (!pal) return;
  const cx = x + size / 2, cy = y + size / 2, r = size / 2 - 1;
  ctx.save();
  ctx.globalAlpha = alpha;
  if (scale !== 1) { ctx.translate(cx, cy); ctx.scale(scale, scale); ctx.translate(-cx, -cy); }

  // halo
  const glo = ctx.createRadialGradient(cx, cy, r * .6, cx, cy, r * 1.5);
  glo.addColorStop(0, pal.mid + '33'); glo.addColorStop(1, 'transparent');
  ctx.fillStyle = glo;
  ctx.beginPath(); ctx.arc(cx, cy, r * 1.5, 0, Math.PI * 2); ctx.fill();

  // body
  const body = ctx.createRadialGradient(cx - r * .3, cy - r * .3, r * .05, cx, cy, r);
  body.addColorStop(0, pal.lit); body.addColorStop(.55, pal.mid); body.addColorStop(1, pal.drk);
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

  // shine
  const shi = ctx.createRadialGradient(cx - r * .32, cy - r * .38, 0, cx - r * .18, cy - r * .18, r * .52);
  shi.addColorStop(0, 'rgba(255,255,255,.75)'); shi.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = shi;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

  // rim
  ctx.strokeStyle = pal.drk + 'aa'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();

  // black sprite icon on tile (row 0) — skipped for bombs, and if setting is off
  if (!skipSprite && size >= 14 && SAVE.settings.showTileIcons) {
    drawSprite(ctx, colorName, x, y, size, 0, alpha * 0.5);
  }
  ctx.restore();
}

// Void gem: white-to-black sphere with black hole
function drawVoidGem(ctx, x, y, size, alpha = 1, scale = 1) {
  const cx = x + size / 2, cy = y + size / 2, r = size / 2 - 1;
  ctx.save();
  ctx.globalAlpha = alpha;
  if (scale !== 1) { ctx.translate(cx, cy); ctx.scale(scale, scale); ctx.translate(-cx, -cy); }

  // outer glow
  const glo = ctx.createRadialGradient(cx, cy, r * .5, cx, cy, r * 1.5);
  glo.addColorStop(0, 'rgba(180,180,220,0.2)'); glo.addColorStop(1, 'transparent');
  ctx.fillStyle = glo;
  ctx.beginPath(); ctx.arc(cx, cy, r * 1.5, 0, Math.PI * 2); ctx.fill();

  // body: white outer → black centre
  const body = ctx.createRadialGradient(cx - r * .3, cy - r * .3, r * .05, cx + r * .15, cy + r * .15, r);
  body.addColorStop(0, '#ffffff');
  body.addColorStop(.3, '#bbbbdd');
  body.addColorStop(.65, '#222233');
  body.addColorStop(1, '#00000a');
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

  // event horizon
  const hole = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.4);
  hole.addColorStop(0, '#000000'); hole.addColorStop(.75, '#000000'); hole.addColorStop(1, 'transparent');
  ctx.fillStyle = hole;
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.4, 0, Math.PI * 2); ctx.fill();

  // horizon ring
  ctx.strokeStyle = 'rgba(0,0,0,0.9)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.42, 0, Math.PI * 2); ctx.stroke();

  // accretion disc
  ctx.strokeStyle = 'rgba(200,200,255,0.45)'; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.55, r * 0.17, Math.PI * 0.3, 0, Math.PI * 1.55); ctx.stroke();

  // shine
  const shi = ctx.createRadialGradient(cx - r * .32, cy - r * .38, 0, cx - r * .18, cy - r * .18, r * .45);
  shi.addColorStop(0, 'rgba(255,255,255,.45)'); shi.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = shi;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

  // rim
  ctx.strokeStyle = 'rgba(0,0,20,0.8)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();

  ctx.restore();
}

// Draw a gradient (dual-color) gem — diagonal split with both colors visible
function drawGradientGem(ctx, x, y, size, colorA, colorB, alpha = 1, scale = 1) {
  const palA = C[colorA], palB = C[colorB];
  if (!palA || !palB) return drawGem(ctx, x, y, size, colorA, alpha, scale);
  const cx = x + size / 2, cy = y + size / 2, r = size / 2 - 1;
  ctx.save();
  ctx.globalAlpha = alpha;
  if (scale !== 1) { ctx.translate(cx, cy); ctx.scale(scale, scale); ctx.translate(-cx, -cy); }

  // clip to circle
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();

  // left-top half: color A
  const bodyA = ctx.createRadialGradient(cx - r * .3, cy - r * .3, r * .05, cx, cy, r);
  bodyA.addColorStop(0, palA.lit); bodyA.addColorStop(.55, palA.mid); bodyA.addColorStop(1, palA.drk);
  ctx.fillStyle = bodyA;
  ctx.beginPath();
  ctx.moveTo(cx - r, cy - r); ctx.lineTo(cx + r, cy - r); ctx.lineTo(cx - r, cy + r);
  ctx.closePath(); ctx.fill();

  // right-bottom half: color B
  const bodyB = ctx.createRadialGradient(cx + r * .3, cy + r * .3, r * .05, cx, cy, r);
  bodyB.addColorStop(0, palB.lit); bodyB.addColorStop(.55, palB.mid); bodyB.addColorStop(1, palB.drk);
  ctx.fillStyle = bodyB;
  ctx.beginPath();
  ctx.moveTo(cx + r, cy - r); ctx.lineTo(cx + r, cy + r); ctx.lineTo(cx - r, cy + r);
  ctx.closePath(); ctx.fill();

  // diagonal separator line
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(cx + r, cy - r); ctx.lineTo(cx - r, cy + r); ctx.stroke();

  // shared shine
  const shi = ctx.createRadialGradient(cx - r * .32, cy - r * .38, 0, cx - r * .18, cy - r * .18, r * .52);
  shi.addColorStop(0, 'rgba(255,255,255,.6)'); shi.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = shi;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

  // outer rim (no clip needed, already clipped)
  ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();

  ctx.restore();

  // sparkle indicator — tiny diamond in centre
  ctx.save();
  ctx.globalAlpha = alpha * 0.9;
  ctx.fillStyle   = '#ffffff';
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 4); ctx.lineTo(cx + 3, cy); ctx.lineTo(cx, cy + 4); ctx.lineTo(cx - 3, cy);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}

// Draw a stone overlay on top of an already-drawn gem
function drawStoneOverlay(ctx, x, y, size, hp, alpha = 1) {
  const cx = x + size / 2, cy = y + size / 2, r = size / 2 - 1;
  ctx.save();
  ctx.globalAlpha = alpha;

  // Rocky vignette ring — semi-transparent grey around the edge
  const stoneRing = ctx.createRadialGradient(cx, cy, r * .25, cx, cy, r);
  stoneRing.addColorStop(0, 'transparent');
  stoneRing.addColorStop(.7, 'rgba(120,135,140,0.8)');
  stoneRing.addColorStop(1,  'rgba(120,135,130,0.95)');
  ctx.fillStyle = stoneRing;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

  // Crack lines — more cracks if hp==1 (cracked stone)
  ctx.strokeStyle = 'rgba(30,25,20,0.7)';
  ctx.lineCap = 'round';

  if (hp === 2) {
    // Intact stone: subtle single crack
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - r * .15, cy - r * .5);
    ctx.lineTo(cx + r * .05, cy);
    ctx.lineTo(cx - r * .1,  cy + r * .4);
    ctx.stroke();
  } else {
    // Cracked: multiple cracks radiating outward
    ctx.lineWidth = 2.3;
    // Main crack
    ctx.beginPath();
    ctx.moveTo(cx - r * .2, cy - r * .6);
    ctx.lineTo(cx + r * .1, cy - r * .1);
    ctx.lineTo(cx - r * .15, cy + r * .5);
    ctx.stroke();
    // Side crack 1
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(cx + r * .1, cy - r * .1);
    ctx.lineTo(cx + r * .5, cy + r * .2);
    ctx.stroke();
    // Side crack 2
    ctx.beginPath();
    ctx.moveTo(cx - r * .1, cy + r * .15);
    ctx.lineTo(cx - r * .55, cy + r * .1);
    ctx.stroke();
    // Top chip
    ctx.beginPath();
    ctx.moveTo(cx - r * .35, cy - r * .5);
    ctx.lineTo(cx - r * .55, cy - r * .65);
    ctx.stroke();
  }

  // Stone rim
  ctx.strokeStyle = 'rgba(20,18,15,0.6)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();

  ctx.restore();
}

// Unified cell draw: picks the right combination of drawers
function drawCell(ctx, x, y, size, cell, alpha = 1, scale = 1) {
  if (!cell) return;
  const isBomb = cell.type === 'bomb' || cell.type === 'superbomb';
  if (cell.type === 'gradient') {
    drawGradientGem(ctx, x, y, size, cell.color, cell.color2, alpha, scale);
  } else {
    drawGem(ctx, x, y, size, cell.color, alpha, scale, isBomb);
  }
  if (cell.type === 'stone')     drawStoneOverlay(ctx, x, y, size, cell.hp, alpha);
  if (isBomb)                    drawBombOverlay(ctx, x, y, size, cell.type === 'superbomb', alpha);
  if (cell.type === 'skull')     drawSkullOverlay(ctx, x, y, size, alpha);
}

function drawSkullOverlay(ctx, x, y, size, alpha = 1) {
  const cx = x + size / 2, cy = y + size / 2, r = size / 2 - 1;
  ctx.save();
  ctx.globalAlpha = alpha;

  // Dark vignette
  const ring = ctx.createRadialGradient(cx, cy, r * .3, cx, cy, r);
  ring.addColorStop(0, 'transparent');
  ring.addColorStop(.65, 'rgba(20,0,0,0.55)');
  ring.addColorStop(1,   'rgba(10,0,0,0.80)');
  ctx.fillStyle = ring;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

  // Skull emoji
  ctx.font = `${Math.max(8, size * 0.42)}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fillText('💀', cx, cy);

  // Red pulsing rim
  ctx.strokeStyle = 'rgba(200,0,0,0.7)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();

  ctx.restore();
}

function drawBombOverlay(ctx, x, y, size, isSuper, alpha = 1) {
  const cx = x + size / 2, cy = y + size / 2, r = size / 2 - 1;
  ctx.save();
  ctx.globalAlpha = alpha;

  // Dark pulsing ring
  ctx.strokeStyle = isSuper ? 'rgba(255,80,0,0.9)' : 'rgba(40,40,40,0.85)';
  ctx.lineWidth   = 2;
  ctx.setLineDash([3, 2]);
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);

  // Fuse dot at top
  ctx.fillStyle = isSuper ? '#ff5500' : '#222';
  ctx.beginPath(); ctx.arc(cx, cy - r + 2, 2.5, 0, Math.PI * 2); ctx.fill();

  // Emoji icon
  ctx.font = `${Math.max(8, size * 0.38)}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText(isSuper ? '💥' : '💣', cx, cy);

  ctx.restore();
}

// ── GRID & REDRAW ─────────────────────────────────────────────
// LABEL_W / LABEL_H: pixel gutter reserved for row numbers (left) and col letters (top)
const LABEL_W = 16;   // left strip for row numbers
const LABEL_H = 14;   // top strip for column letters

function colLabel(c) {
  // A-Z then AA, AB, … for up to 26+16=42 columns (well within our max of 16)
  return c < 26 ? String.fromCharCode(65 + c) : String.fromCharCode(65 + Math.floor(c/26) - 1) + String.fromCharCode(65 + c % 26);
}

function drawGrid() {
  const cols      = G.cols || BASE_COLS;
  const rows      = G.rows || BASE_ROWS;
  const ox        = G.boardOffX || 0;   // left gutter
  const oy        = G.boardOffY || 0;   // top gutter
  const extraCols = cols - BASE_COLS;
  const extraRows = rows - BASE_ROWS;

  const fontSize  = Math.max(6, Math.min(10, CS * 0.32));
  ctx.font        = `${fontSize}px sans-serif`;
  ctx.textAlign   = 'center';
  ctx.textBaseline = 'middle';

  // ── Column letters across the top ──
  for (let c = 0; c < cols; c++) {
    const x       = ox + c * CS + CS / 2;
    const y       = oy / 2;
    const isExtra = c >= BASE_COLS;
    ctx.fillStyle = isExtra ? 'rgba(160,200,255,0.55)' : 'rgba(255,255,255,0.22)';
    ctx.fillText(colLabel(c), x, y);
    // Highlight extra column header background
    if (isExtra) {
      ctx.fillStyle = 'rgba(120,160,255,0.07)';
      ctx.fillRect(ox + c * CS, 0, CS, oy);
    }
  }

  // ── Row numbers down the left ──
  ctx.textAlign = 'center';
  for (let r = 0; r < rows; r++) {
    const x       = ox / 2;
    const y       = oy + r * CS + CS / 2;
    const isExtra = r >= BASE_ROWS;
    ctx.fillStyle = isExtra ? 'rgba(160,200,255,0.55)' : 'rgba(255,255,255,0.22)';
    ctx.fillText(r + 1, x, y);
    // Highlight extra row number background
    if (isExtra) {
      ctx.fillStyle = 'rgba(120,160,255,0.07)';
      ctx.fillRect(0, oy + r * CS, ox, CS);
    }
  }

  // ── Grid lines (offset into board area) ──
  ctx.strokeStyle = '#ffffff07'; ctx.lineWidth = .5;
  for (let r = 0; r <= rows; r++) {
    ctx.beginPath(); ctx.moveTo(ox, oy + r * CS); ctx.lineTo(ox + cols * CS, oy + r * CS); ctx.stroke();
  }
  for (let c = 0; c <= cols; c++) {
    ctx.beginPath(); ctx.moveTo(ox + c * CS, oy); ctx.lineTo(ox + c * CS, oy + rows * CS); ctx.stroke();
  }
}

function redraw() {
  const cols = G.cols || BASE_COLS, rows = G.rows || BASE_ROWS;
  const ox   = G.boardOffX || 0, oy = G.boardOffY || 0;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  const clearSet = new Set((G.clearCells || []).map(([r, c]) => `${r},${c}`));

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = G.board[r][c];
      if (cell && !clearSet.has(`${r},${c}`)) {
        drawCell(ctx, ox + c * CS + 1, oy + r * CS + 1, CS - 2, cell);
      }
    }
  }

  if (G.clearCells && G.clearCells.length) drawClearAnim();
  drawBlastGlow();
  drawExplosionParticles();
  drawGhost();
  drawPiece();
  drawPreview();

  document.getElementById('score-display').textContent = G.score.toLocaleString();
  document.getElementById('level-display').textContent = G.level;
  document.getElementById('move-count').textContent    = G.moves;
  updateLiveStars();
  renderMana();
  drawSpellTarget();
  renderHearts();
}

function updateLiveStars() {
  const el = document.getElementById('live-stars');
  if (!el || !G.cfg) return;

  const t     = getStarThresholds(G.level);
  const moves = G.moves;

  // Fill fraction for each star (1.0 = full, 0.0 = empty)
  // Star 3: full at 0 moves, empty when moves reaches t.three
  // Star 2: full at 0 moves, starts draining at t.three, empty at t.two
  // Star 1: always full — you always get at least 1 star
  const fills = [
    1,
    Math.max(0, Math.min(1, 1 - Math.max(0, moves - t.three) / Math.max(1, t.two - t.three))),
    Math.max(0, Math.min(1, 1 - moves / Math.max(1, t.three))),
  ];
  // fills[2]=star3, fills[1]=star2, fills[0]=star1

  el.innerHTML = '';
  const row = document.createElement('div');
  row.className = 'live-star-row';

  for (let i = 2; i >= 0; i--) {  // render star3, star2, star1 left to right
    const wrap = document.createElement('div');
    wrap.className = 'live-star-wrap';

    const base = document.createElement('div');
    base.className = 'live-star-base';
    base.textContent = '★';

    const lit = document.createElement('div');
    lit.className = 'live-star-lit';
    lit.textContent = '★';
    // Clip from the RIGHT as fill decreases (drain left-to-right)
    const drainPct = Math.round((1 - fills[i]) * 100);
    lit.style.clipPath = `inset(0 ${drainPct}% 0 0)`;

    wrap.appendChild(base);
    wrap.appendChild(lit);
    row.appendChild(wrap);
  }

  el.appendChild(row);
}

function drawGhost() {
  if (!G.piece || G.phase !== 'playing') return;
  const { shape, col } = G.piece;
  const ox = G.boardOffX || 0, oy = G.boardOffY || 0;
  let row = 0;
  while (!collides(shape, row + 1, col)) row++;
  ctx.save(); ctx.globalAlpha = 0.13;
  shape.forEach(([r, c]) => {
    const nr = row + r, nc = col + c;
    if (nr >= 0) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(ox + nc * CS + CS / 2, oy + nr * CS + CS / 2, CS / 2 - 2, 0, Math.PI * 2); ctx.fill();
    }
  });
  ctx.restore();
}

function drawPiece() {
  if (!G.piece || G.phase !== 'playing') return;
  const { shape, tiles, col } = G.piece;
  const cols = G.cols || BASE_COLS;
  const ox = G.boardOffX || 0, oy = G.boardOffY || 0;
  shape.forEach(([r, c], i) => {
    const nc = col + c;
    if (r >= 0 && nc >= 0 && nc < cols) {
      drawCell(ctx, ox + nc * CS + 1, oy + r * CS + 1, CS - 2, tiles[i]);
    }
  });
}

function drawClearAnim() {
  const t  = G.clearFrame / 13;
  const ox = G.boardOffX || 0, oy = G.boardOffY || 0;
  (G.clearCells || []).forEach(([r, c]) => {
    const cell = G.board[r][c];
    if (cell) drawCell(ctx, ox + c * CS + 1, oy + r * CS + 1, CS - 2, cell, 1 - t, 1 + t * .6);
  });
}

function drawSpellTarget() {
  const targets = G.spellTargets || [];
  if (!targets.length) return;
  const ox = G.boardOffX || 0, oy = G.boardOffY || 0;
  targets.forEach(({ r, c }, idx) => {
    const x = ox + c * CS, y = oy + r * CS;
    ctx.save();
    ctx.strokeStyle = idx === 0 ? 'rgba(255,220,0,0.9)' : 'rgba(100,180,255,0.9)';
    ctx.lineWidth   = 2.5;
    ctx.setLineDash([4, 3]);
    ctx.shadowColor = idx === 0 ? '#ffd700' : '#60b0ff'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(x + CS/2, y + CS/2, CS/2 - 2, 0, Math.PI*2); ctx.stroke();
    ctx.setLineDash([]); ctx.shadowBlur = 0;
    ctx.restore();
  });
}
// Per-cell radial glow flash on bomb explosion — covers empty cells too
function spawnBlastGlow(blasted, isSuper) {
  const maxLife = isSuper ? 22 : 16;
  blasted.forEach(([r, c]) => {
    G.blastCells.push({ r, c, life: 0, maxLife, isSuper });
  });
}

function drawBlastGlow() {
  if (!G.blastCells || !G.blastCells.length) return;
  const ox = G.boardOffX || 0, oy = G.boardOffY || 0;
  const alive = [];
  for (const b of G.blastCells) {
    b.life++;
    const t = b.life / b.maxLife;
    if (t >= 1) continue;
    alive.push(b);

    const cx   = ox + b.c * CS + CS / 2;
    const cy   = oy + b.r * CS + CS / 2;
    // Ease: quick rise then slow fade
    const ease = t < 0.3 ? t / 0.3 : 1 - (t - 0.3) / 0.7;
    const rad  = CS * (b.isSuper ? 0.72 : 0.62) * (0.5 + ease * 0.5);
    const col1 = b.isSuper ? 'rgba(255,120,0,' : 'rgba(255,220,0,';
    const col2 = b.isSuper ? 'rgba(255,40,0,0)' : 'rgba(255,100,0,0)';

    ctx.save();
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
    grd.addColorStop(0, col1 + (ease * 0.85) + ')');
    grd.addColorStop(0.5, col1 + (ease * 0.4) + ')');
    grd.addColorStop(1, col2);
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  G.blastCells = alive;
}

// ── EXPLOSION PARTICLES ───────────────────────────────────────
// Each particle: { x, y, vx, vy, life, maxLife, radius, color, alpha }
function spawnExplosionParticles(blasted, isSuper) {
  const ox  = G.boardOffX || 0, oy = G.boardOffY || 0;
  const count = isSuper ? 10 : 6;   // particles per cell
  blasted.forEach(([r, c]) => {
    const cell = G.board[r][c];
    const cx   = ox + c * CS + CS / 2;
    const cy   = oy + r * CS + CS / 2;
    const pal  = cell ? C[cell.color] : null;
    const col  = pal ? pal.lit : '#ffffff';
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i / count) + (Math.random() * 0.5);
      const speed = (isSuper ? 3.5 : 2.2) + Math.random() * 2;
      G.explosionParticles.push({
        x:       cx,
        y:       cy,
        vx:      Math.cos(angle) * speed,
        vy:      Math.sin(angle) * speed - 1.5,  // slight upward bias
        life:    0,
        maxLife: isSuper ? 28 : 20,
        radius:  isSuper ? 3.5 : 2.5,
        color:   col,
      });
    }
    // Central flash
    G.explosionParticles.push({
      x: cx, y: cy, vx: 0, vy: 0,
      life: 0, maxLife: isSuper ? 12 : 8,
      radius: isSuper ? CS * 0.55 : CS * 0.4,
      color: isSuper ? '#ff8800' : '#ffee00',
      flash: true,
    });
  });
}

function drawExplosionParticles() {
  if (!G.explosionParticles || !G.explosionParticles.length) return;
  const alive = [];
  for (const p of G.explosionParticles) {
    p.life++;
    const t = p.life / p.maxLife;
    if (t >= 1) continue;
    alive.push(p);
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.18; // gravity
    const alpha = p.flash ? (1 - t) * 0.7 : (1 - t);
    ctx.save();
    ctx.globalAlpha = alpha;
    if (p.flash) {
      // Soft radial glow
      const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
      grd.addColorStop(0, p.color);
      grd.addColorStop(1, 'transparent');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.radius * (1 - t * 0.5), 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  G.explosionParticles = alive;
}

function animateClear(done) {
  G.clearFrame = 0;
  const step = () => {
    G.clearFrame++;
    redraw();
    if (G.clearFrame < 14) requestAnimationFrame(step);
    else done();
  };
  requestAnimationFrame(step);
}

// Particle-only RAF loop — keeps running while particles or blast glows are alive
function tickParticles() {
  if ((!G.explosionParticles || !G.explosionParticles.length) &&
      (!G.blastCells || !G.blastCells.length)) return;
  redraw();
  requestAnimationFrame(tickParticles);
}

// ── PREVIEW ───────────────────────────────────────────────────
function drawPreview() {
  pvCtx.clearRect(0, 0, pvCv.width, pvCv.height);
  if (!G.piece || !G.cfg) return;
  const nextEntry = PIECE_QUEUE[qHead % QUEUE_SIZE];
  // Resolve the next piece's tiles for display
  const pool   = getShapePool(G.level);
  const shape  = pool[nextEntry.poolIdx % pool.length];
  const avail  = G.cfg.colors;
  const n      = shape.length;
  const cfg    = G.cfg;

  const isStone    = cfg.hasStone    && nextEntry.stoneRoll    < 0.20;
  const isGradient = cfg.hasGradient && nextEntry.gradientRoll < 0.20;
  const stoneIdx   = isStone    ? nextEntry.stoneTileIdx    % n : -1;
  const gradIdx    = isGradient ? (nextEntry.gradientTileIdx % n === stoneIdx && stoneIdx >= 0
                                    ? (nextEntry.gradientTileIdx + 1) % n
                                    : nextEntry.gradientTileIdx % n) : -1;

  const tiles = shape.map((_, i) => {
    const rawF  = nextEntry.tileColors[i]  / 6;
    const rawF2 = nextEntry.tileColors2[i] / 6;
    const color  = pickWeightedColor(avail, rawF);
    let   color2 = pickWeightedColor(avail, rawF2);
    if (color2 === color) color2 = avail[(avail.indexOf(color) + 1) % avail.length];
    if (i === stoneIdx)  return makeCell(color, 'stone');
    if (i === gradIdx)   return makeCell(color, 'gradient', color2);
    return makeCell(color, 'normal');
  });

  const maxR = Math.max(...shape.map(c => c[0]));
  const maxC = Math.max(...shape.map(c => c[1]));
  const cs   = Math.min((pvCv.width - 8) / (maxC + 1), (pvCv.height - 8) / (maxR + 1));
  const ox   = (pvCv.width  - cs * (maxC + 1)) / 2;
  const oy   = (pvCv.height - cs * (maxR + 1)) / 2;
  pvCtx.save(); pvCtx.translate(ox, oy);
  shape.forEach(([r, c], i) => drawCell(pvCtx, c * cs, r * cs, cs - 2, tiles[i]));
  pvCtx.restore();
}

// ── QUOTA UI ─────────────────────────────────────────────────
function renderQuota() {
  const panel = document.getElementById('quota-panel');
  panel.innerHTML = '';
  if (!G.cfg) return;
  G.cfg.colors.forEach(color => {
    const need = G.quota[color] || 0, done = G.cleared[color] || 0;
    const left = Math.max(0, need - done);
    const div  = document.createElement('div');
    div.className = 'q-item' + (left === 0 ? ' q-done' : '');

    const cv = document.createElement('canvas');
    cv.width = 14; cv.height = 14;
    cv.className = 'q-gem-cv';
    div.appendChild(cv);

    const span = document.createElement('span');
    span.textContent = left === 0 ? '✓' : left;
    div.appendChild(span);
    panel.appendChild(div);

    requestAnimationFrame(() => {
      const ctx2 = cv.getContext('2d');
      ctx2.clearRect(0, 0, 14, 14);
      drawSprite(ctx2, color, 0, 0, 14, 1, 1); // row 1 = colored
    });
  });
}

function floatScore(n) {
  const wrap  = document.getElementById('board-wrap');
  const d     = document.createElement('div');
  d.className = 'score-float'; d.textContent = `+${n}`;
  const bRect = canvas.getBoundingClientRect(), wRect = wrap.getBoundingClientRect();
  d.style.left = (bRect.left - wRect.left + bRect.width / 2 - 24) + 'px';
  d.style.top  = '30px';
  wrap.appendChild(d);
  setTimeout(() => d.remove(), 900);
}

function handleBoardTap(clientX, clientY) {
  const ox    = G.boardOffX || 0, oy = G.boardOffY || 0;
  const rect  = canvas.getBoundingClientRect();
  const bx    = clientX - rect.left - ox;
  const by    = clientY - rect.top  - oy;
  const col   = Math.floor(bx / CS);
  const row   = Math.floor(by / CS);
  const cols  = G.cols || BASE_COLS, rows = G.rows || BASE_ROWS;
  if (row >= 0 && row < rows && col >= 0 && col < cols) {
    const cell = G.board[row][col];
    if (cell && (cell.type === 'bomb' || cell.type === 'superbomb')) {
      detonateBomb(row, col);
      return;
    }
  }
  // Otherwise treat as column select (based on x position only)
  if (col >= 0 && col < cols) setColumn(col);
}


// ── INPUT ─────────────────────────────────────────────────────
document.getElementById('btn-left').addEventListener('pointerdown',      e => { e.preventDefault(); moveLeft(); });
document.getElementById('btn-right').addEventListener('pointerdown',     e => { e.preventDefault(); moveRight(); });
document.getElementById('btn-rotate').addEventListener('pointerdown',    e => { e.preventDefault(); rotatePieceCW(); });
document.getElementById('btn-rotateccw').addEventListener('pointerdown', e => { e.preventDefault(); rotatePieceCCW(); });
document.getElementById('btn-drop').addEventListener('pointerdown',      e => { e.preventDefault(); dropPiece(); });
document.getElementById('btn-menu').addEventListener('pointerdown', e => { e.preventDefault(); onPause(); });

document.addEventListener('keydown', e => {
  if (G.phase !== 'playing') return;
  const m = {
    ArrowLeft: moveLeft, ArrowRight: moveRight,
    ArrowUp: rotatePieceCW, r: rotatePieceCW, R: rotatePieceCW,
    ArrowDown: dropPiece, ' ': dropPiece,
  };
  if (m[e.key]) { e.preventDefault(); m[e.key](); }
});

let _tx = null, _ty = null, _tdownX = null, _tdownY = null;
canvas.addEventListener('pointerdown', e => {
  _tx = e.clientX; _ty = e.clientY;
  _tdownX = e.clientX; _tdownY = e.clientY;
});
canvas.addEventListener('pointerup', e => {
  if (_tx === null) return;
  const dx = e.clientX - _tx, dy = e.clientY - _ty;
  if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 18) {
    dx > 0 ? moveRight() : moveLeft();
  } else if (dy > 22)  dropPiece();
  else if (dy < -22) rotatePieceCW();
  else {
    // Small movement = tap — check for bomb or column select
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      handleBoardTap(e.clientX, e.clientY);
    }
  }
  _tx = _ty = null;
});

window.addEventListener('resize', resizeCanvas);

// ── MAIN MENU ─────────────────────────────────────────────────
function showMainMenu() {
  const hasSave = !!loadSave();
  const menuEl  = document.getElementById('main-menu');
  menuEl.innerHTML = `
    <div class="mm-bg"></div>
    <div class="mm-content">
      <div class="mm-logo-wrap">
        <div class="mm-logo-top">MATCH</div>
        <div class="mm-logo-bot">WEAVER</div>
        <div class="mm-logo-sub">A Fantasy Mana Puzzle</div>
      </div>

      <div class="mm-buttons">
        ${hasSave
          ? `<button class="mm-btn mm-btn-primary" onclick="mmContinue()">▶ Continue</button>`
          : `<button class="mm-btn mm-btn-primary" onclick="mmNewGame()">▶ Begin Weaving</button>`}
        <button class="mm-btn mm-btn-secondary" onclick="mmSettings()">⚙ Settings</button>
        <a class="mm-btn mm-btn-discord" href="https://discord.gg/mzWrMsf7B9" target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style="flex-shrink:0">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.03.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
          </svg>
          Join Discord
        </a>
      </div>

      <div class="mm-version">v1.0</div>
    </div>
  `;
  menuEl.classList.remove('hidden');
}

function hideMainMenu() {
  document.getElementById('main-menu').classList.add('hidden');
}

window.mmContinue = () => {
  hideMainMenu();
  const lvl  = nextPlayableLevel();
  const lore = LORE.find(l => l.level === lvl && !SAVE.levelStars[lvl]) || null;
  goToLevel(lvl, lore);
};

window.mmNewGame = () => {
  if (loadSave()) {
    // Confirm overwrite if save exists
    showCard(`
      <div class="lore-title">Start Over?</div>
      <div class="lore-text" style="margin-bottom:16px">This will clear your current save and begin a new weave from level 1.</div>
      <div style="display:flex;gap:10px;justify-content:center">
        <button class="pill-btn secondary small-btn" onclick="hideCard();showMainMenu()">Cancel</button>
        <button class="pill-btn danger small-btn" onclick="mmConfirmNewGame()">Start Over</button>
      </div>
    `);
  } else {
    hideMainMenu();
    goToLevel(1, LORE[0]);
  }
};

window.mmConfirmNewGame = () => {
  hideCard();
  clearSave();
  hideMainMenu();
  initGame();
  goToLevel(1, LORE[0]);
};

window.mmSettings = () => {
  hideMainMenu();
  openSettingsWithReturn(() => showMainMenu());
};

window.onStartGame = () => { hideMainMenu(); goToLevel(1, LORE[0]); };
window.onContinue  = () => {
  hideMainMenu();
  const lvl  = nextPlayableLevel();
  const lore = LORE.find(l => l.level === lvl && !SAVE.levelStars[lvl]) || null;
  goToLevel(lvl, lore);
};
window.openLevelSelectFromStart = () => {
  hideMainMenu();
  buildLevelGrid();
  document.getElementById('level-select-modal').classList.remove('hidden');
};

// ── BOOT ─────────────────────────────────────────────────────
initSave();
initGame();
requestAnimationFrame(() => { resizeCanvas(); showMainMenu(); });
