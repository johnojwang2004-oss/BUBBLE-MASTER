(function () {
'use strict';

/* =========================================================
   CONSTANTS
   ========================================================= */
var W = 480, H = 800;
var R = 20;
var ROW_H = R * Math.sqrt(3);
var COLS_LONG = 12, COLS_SHORT = 11;
var MAX_ROWS = 20;
var TOP = 122;
var DEATH_Y = 690;
var SX = W / 2, SY = 730;
var SHOT_SPEED = 1250;
var GRAVITY = 1650;
var TOTAL_LEVELS = 24;
var COLORS = ['#ff4d6d','#4dabf7','#51cf66','#ffd43b','#b197fc','#ff922b'];

/* =========================================================
   CANVAS
   ========================================================= */
var cv = document.getElementById('cv');
var ctx = cv.getContext('2d');

function resize() {
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var s = Math.min((window.innerWidth - 24) / W, (window.innerHeight - 24) / H);
  cv.style.width = Math.round(W * s) + 'px';
  cv.style.height = Math.round(H * s) + 'px';
  cv.width = Math.round(W * dpr);
  cv.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', function () { setTimeout(resize, 120); });
resize();

function hideLoadingScreen() {
  var el = document.getElementById('loading-screen');
  if (el && !el.classList.contains('hidden')) {
    setTimeout(function () { el.classList.add('hidden'); }, 1100);
  }
}

/* =========================================================
   HELPERS
   ========================================================= */
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function rand(a, b) { return a + Math.random() * (b - a); }
function randInt(n) { return Math.floor(Math.random() * n); }
function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

function shade(hex, amt) {
  var n = parseInt(hex.slice(1), 16);
  var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (amt >= 0) { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
  else { r *= (1 + amt); g *= (1 + amt); b *= (1 + amt); }
  return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
}

function hexToRgba(hex, a) {
  var n = parseInt(hex.slice(1), 16);
  return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
}

function roundRectPath(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

/* =========================================================
   BUBBLE SPRITE CACHE
   ========================================================= */
var spriteCache = Object.create(null);

function getBubbleSprite(color, r) {
  var key = color + '@' + r;
  if (spriteCache[key]) return spriteCache[key];

  var SS = 2;
  var pad = 12;
  var size = Math.ceil((r * 2 + pad) * SS);
  var cnv = document.createElement('canvas');
  cnv.width = cnv.height = size;
  var g = cnv.getContext('2d');
  var cx = size / 2, cy = size / 2, rr = r * SS;

  var glow = g.createRadialGradient(cx, cy, rr * 0.6, cx, cy, rr * 1.35);
  glow.addColorStop(0, hexToRgba(color, 0.55));
  glow.addColorStop(0.6, hexToRgba(color, 0.12));
  glow.addColorStop(1, hexToRgba(color, 0));
  g.fillStyle = glow;
  g.beginPath(); g.arc(cx, cy, rr * 1.35, 0, Math.PI * 2); g.fill();

  var body = g.createRadialGradient(cx - rr * 0.42, cy - rr * 0.48, rr * 0.05, cx, cy, rr);
  body.addColorStop(0, shade(color, 0.95));
  body.addColorStop(0.28, shade(color, 0.45));
  body.addColorStop(0.62, color);
  body.addColorStop(0.92, shade(color, -0.28));
  body.addColorStop(1, shade(color, -0.55));
  g.fillStyle = body;
  g.beginPath(); g.arc(cx, cy, rr, 0, Math.PI * 2); g.fill();

  var rim = g.createRadialGradient(cx - rr * 0.4, cy - rr * 0.45, rr * 0.4, cx, cy, rr);
  rim.addColorStop(0, 'rgba(255,255,255,0.35)');
  rim.addColorStop(0.5, 'rgba(255,255,255,0)');
  rim.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = rim;
  g.beginPath(); g.arc(cx, cy, rr, 0, Math.PI * 2); g.fill();

  g.strokeStyle = 'rgba(0,0,0,0.32)';
  g.lineWidth = Math.max(1.2, rr * 0.06);
  g.beginPath(); g.arc(cx, cy, rr * 0.975, 0, Math.PI * 2); g.stroke();

  g.fillStyle = 'rgba(255,255,255,0.85)';
  g.beginPath();
  g.ellipse(cx - rr * 0.36, cy - rr * 0.42, rr * 0.32, rr * 0.18, -0.65, 0, Math.PI * 2);
  g.fill();

  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.beginPath();
  g.ellipse(cx + rr * 0.38, cy + rr * 0.34, rr * 0.14, rr * 0.09, 0.6, 0, Math.PI * 2);
  g.fill();

  var sprite = { cnv: cnv, size: size / SS };
  spriteCache[key] = sprite;
  return sprite;
}

function drawBubble(x, y, r, color) {
  var sp = getBubbleSprite(color, r);
  ctx.drawImage(sp.cnv, x - sp.size / 2, y - sp.size / 2, sp.size, sp.size);
}

/* =========================================================
   SOUND
   ========================================================= */
var Sound = {
  ctx: null,
  enabled: true,
  init: function () {
    if (this.ctx) return;
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { }
  },
  resume: function () { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  tone: function (freq, dur, type, vol, slideTo, delay) {
    if (!this.enabled || !this.ctx) return;
    type = type || 'sine';
    vol = vol == null ? 0.09 : vol;
    delay = delay || 0;
    var t0 = this.ctx.currentTime + delay;
    var o = this.ctx.createOscillator();
    var g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(t0); o.stop(t0 + dur + 0.03);
  },
  shoot: function () { this.tone(620, 0.08, 'square', 0.045, 280); },
  pop: function (n) {
    var base = 380 + Math.min(n, 12) * 36;
    this.tone(base, 0.10, 'sine', 0.085, base * 1.9);
    this.tone(base * 1.5, 0.07, 'triangle', 0.04, base * 2.6, 0.03);
  },
  drop: function () { this.tone(240, 0.26, 'sawtooth', 0.04, 70); },
  boom: function () {
    this.tone(130, 0.40, 'sawtooth', 0.13, 38);
    this.tone(80, 0.48, 'square', 0.07, 30, 0.02);
  },
  wall: function () { this.tone(330, 0.045, 'square', 0.03, 250); },
  win: function () {
    var arr = [523, 659, 784, 1046, 1318];
    for (var i = 0; i < arr.length; i++) this.tone(arr[i], 0.22, 'triangle', 0.09, null, i * 0.09);
  },
  lose: function () {
    var arr = [440, 349, 262, 175];
    for (var i = 0; i < arr.length; i++) this.tone(arr[i], 0.38, 'sawtooth', 0.085, null, i * 0.17);
  },
  click: function () { this.tone(720, 0.045, 'square', 0.05); },
  swap: function () { this.tone(400, 0.07, 'triangle', 0.06, 700); },
  star: function (i) { this.tone(880 + i * 220, 0.20, 'triangle', 0.10); }
};

/* =========================================================
   LEVELS
   ========================================================= */
function makeLevel(n) {
  var target = Math.round((500 + (n - 1) * 320) / 50) * 50;
  return {
    id: n,
    target: target,
    moves: Math.max(18, 32 - Math.floor((n - 1) * 0.65)),
    rows: Math.min(4 + Math.floor((n - 1) / 4), 8),
    colors: Math.min(3 + Math.floor((n - 1) / 4), 6),
    dropEvery: Math.max(8, 14 - Math.floor((n - 1) / 3))
  };
}
var LEVELS = [];
for (var li = 1; li <= TOTAL_LEVELS; li++) LEVELS.push(makeLevel(li));

/* =========================================================
   PROGRESS
   ========================================================= */
var Progress = {
  unlocked: 1,
  stars: {},
  best: 0,
  load: function () {
    try {
      var raw = localStorage.getItem('bpm_progress_v3');
      if (raw) {
        var d = JSON.parse(raw);
        this.unlocked = d.unlocked || 1;
        this.stars = d.stars || {};
        this.best = d.best || 0;
      }
    } catch (e) { }
  },
  save: function () {
    try {
      localStorage.setItem('bpm_progress_v3', JSON.stringify({
        unlocked: this.unlocked,
        stars: this.stars,
        best: this.best
      }));
    } catch (e) { }
  },
  setStars: function (level, stars) {
    if ((this.stars[level] || 0) < stars) this.stars[level] = stars;
    if (stars > 0 && level >= this.unlocked) {
      this.unlocked = Math.min(level + 1, TOTAL_LEVELS);
    }
    this.save();
  },
  totalStars: function () {
    var t = 0;
    for (var k in this.stars) t += this.stars[k];
    return t;
  }
};
Progress.load();

/* =========================================================
   GAME STATE
   ========================================================= */
var state = 'menu';
var score = 0;
var level = 1;
var levelDef = LEVELS[0];
var movesLeft = 30;
var combo = 0;
var best = Progress.best || 0;

var grid = [];
var parity = 0;
var dropOffset = 0;

var currentBubble = null;
var nextBubble = null;
var projectile = null;

var aimAngle = -Math.PI / 2;
var isAiming = false;
var recoil = 0;

var shotsSinceDrop = 0;
var particles = [];
var sparks = [];
var falling = [];
var popRings = [];
var floaters = [];
var shockwaves = [];
var bgStars = [];
var bgOrbs = [];

var shakeMag = 0, shakeX = 0, shakeY = 0;
var flashAlpha = 0;
var flashColor = '#ffffff';
var time = 0;

var screenT = 0;
var winState = null;
var loseState = null;
var levelScrollY = 0;
var levelScrollV = 0;
var isDragging = false;
var dragStartY = 0;
var dragStartScroll = 0;
var toast = null;

/* =========================================================
   HEX GRID MATH
   ========================================================= */
function rowIsLong(r) { return ((r + parity) & 1) === 0; }
function colsInRow(r) { return rowIsLong(r) ? COLS_LONG : COLS_SHORT; }
function cellX(r, c) { return rowIsLong(r) ? R + 2 * R * c : 2 * R + 2 * R * c; }
function cellY(r) { return TOP + R + r * ROW_H + dropOffset; }

function neighbors(r, c) {
  var out = [];
  var push = function (rr, cc) {
    if (rr < 0 || rr >= MAX_ROWS) return;
    if (cc < 0 || cc >= colsInRow(rr)) return;
    out.push([rr, cc]);
  };
  push(r, c - 1); push(r, c + 1);
  if (rowIsLong(r)) {
    push(r - 1, c - 1); push(r - 1, c);
    push(r + 1, c - 1); push(r + 1, c);
  } else {
    push(r - 1, c); push(r - 1, c + 1);
    push(r + 1, c); push(r + 1, c + 1);
  }
  return out;
}

function makeGrid() {
  var g = [];
  for (var r = 0; r < MAX_ROWS; r++) g.push(new Array(colsInRow(r)).fill(null));
  return g;
}

/* =========================================================
   BOARD
   ========================================================= */
function makeBubble(color) { return { color: color, type: 'normal', twinkle: Math.random() * 6.28 }; }

function buildBoard() {
  parity = 0;
  dropOffset = 0;
  grid = makeGrid();
  particles = []; sparks = []; falling = []; popRings = []; floaters = []; shockwaves = [];
  projectile = null; combo = 0; shotsSinceDrop = 0;

  var nColors = levelDef.colors;
  for (var r = 0; r < levelDef.rows; r++) {
    var n = colsInRow(r);
    for (var c = 0; c < n; c++) {
      if (Math.random() < 0.94) grid[r][c] = makeBubble(COLORS[randInt(nColors)]);
    }
  }
  for (var c2 = 0; c2 < colsInRow(0); c2++) {
    if (!grid[0][c2]) grid[0][c2] = makeBubble(COLORS[randInt(nColors)]);
  }
}

function colorsOnBoard() {
  var set = new Set();
  for (var r = 0; r < MAX_ROWS; r++) {
    var n = colsInRow(r);
    for (var c = 0; c < n; c++) {
      var b = grid[r][c];
      if (b && b.type === 'normal') set.add(b.color);
    }
  }
  return Array.from(set);
}

function pickShotColor() {
  var arr = colorsOnBoard();
  if (arr.length === 0) return COLORS[randInt(levelDef.colors)];
  return arr[randInt(arr.length)];
}

function makeShotBubble() {
  var r = Math.random();
  if (r < 0.045) return { color: '#ffffff', type: 'bomb' };
  if (r < 0.090) return { color: '#ffffff', type: 'rainbow' };
  return { color: pickShotColor(), type: 'normal' };
}

function refillQueue() {
  currentBubble = makeShotBubble();
  nextBubble = makeShotBubble();
}

/* =========================================================
   EFFECTS
   ========================================================= */
function burst(x, y, color, n, power) {
  power = power || 1;
  for (var i = 0; i < n; i++) {
    var a = Math.random() * Math.PI * 2;
    var sp = rand(60, 340) * power;
    particles.push({
      x: x, y: y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 60,
      r: rand(2, 6.5),
      color: color,
      life: rand(0.35, 0.85),
      maxLife: 0.85
    });
  }
  for (var j = 0; j < Math.ceil(n / 2); j++) {
    var a2 = Math.random() * Math.PI * 2;
    var sp2 = rand(100, 400) * power;
    sparks.push({
      x: x, y: y,
      vx: Math.cos(a2) * sp2,
      vy: Math.sin(a2) * sp2 - 80,
      len: rand(6, 14),
      color: '#ffffff',
      life: rand(0.25, 0.55),
      maxLife: 0.55
    });
  }
}

function popRing(x, y, color) { popRings.push({ x: x, y: y, color: color, t: 0, life: 0.38 }); }
function shockwave(x, y, color, maxR) {
  shockwaves.push({ x: x, y: y, color: color, t: 0, life: 0.55, maxR: maxR || 120 });
}
function floatText(x, y, text, color, size) {
  floaters.push({ x: x, y: y, text: text, color: color, size: size || 20, t: 0, life: 1.15, vy: -55 });
}
function addShake(m) { shakeMag = Math.min(22, shakeMag + m); }
function showToast(text, color) { toast = { text: text, color: color || '#4dabf7', t: 0, life: 1.8 }; }

/* =========================================================
   GRID MUTATION
   ========================================================= */
function addRow() {
  parity = 1 - parity;
  for (var r = MAX_ROWS - 1; r > 0; r--) grid[r] = grid[r - 1];
  var n = colsInRow(0);
  var nColors = levelDef.colors;
  var row = new Array(n);
  for (var c = 0; c < n; c++) row[c] = makeBubble(COLORS[randInt(nColors)]);
  grid[0] = row;
  dropOffset = -ROW_H;
  addShake(9);
  Sound.drop();
}

function findCluster(r0, c0, color) {
  var seen = new Set([r0 + ',' + c0]);
  var stack = [[r0, c0]];
  var out = [];
  while (stack.length) {
    var cell = stack.pop();
    var r = cell[0], c = cell[1];
    var b = grid[r][c];
    if (!b || b.type !== 'normal' || b.color !== color) continue;
    out.push([r, c]);
    var nb = neighbors(r, c);
    for (var i = 0; i < nb.length; i++) {
      var k = nb[i][0] + ',' + nb[i][1];
      if (!seen.has(k)) { seen.add(k); stack.push(nb[i]); }
    }
  }
  return out;
}

function popCells(cells) {
  if (!cells.length) return 0;
  var gained = 0, cx = 0, cy = 0;
  for (var i = 0; i < cells.length; i++) {
    var r = cells[i][0], c = cells[i][1];
    var b = grid[r][c];
    if (!b) continue;
    var x = cellX(r, c), y = cellY(r);
    cx += x; cy += y;
    grid[r][c] = null;
    gained += 10;
    popRing(x, y, b.color);
    burst(x, y, b.color, 7);
  }
  cx /= cells.length; cy /= cells.length;

  gained += Math.max(0, cells.length - 3) * 15;
  combo++;
  var mult = 1 + (combo - 1) * 0.5;
  gained = Math.round(gained * mult);
  score += gained;

  floatText(cx, cy, '+' + gained, '#ffffff', 22);
  if (combo > 1) floatText(cx, cy - 28, 'COMBO x' + combo, '#ffd43b', 17);
  Sound.pop(cells.length);
  addShake(Math.min(10, cells.length * 0.9));
  return gained;
}

function removeFloating() {
  var seen = new Set();
  var stack = [];
  var n0 = colsInRow(0);
  for (var c = 0; c < n0; c++) {
    if (grid[0][c]) { seen.add('0,' + c); stack.push([0, c]); }
  }
  while (stack.length) {
    var cell = stack.pop();
    var nb = neighbors(cell[0], cell[1]);
    for (var i = 0; i < nb.length; i++) {
      var rr = nb[i][0], cc = nb[i][1];
      var k = rr + ',' + cc;
      if (grid[rr][cc] && !seen.has(k)) { seen.add(k); stack.push(nb[i]); }
    }
  }
  var count = 0;
  for (var r = 0; r < MAX_ROWS; r++) {
    var n = colsInRow(r);
    for (var c2 = 0; c2 < n; c2++) {
      var b = grid[r][c2];
      if (b && !seen.has(r + ',' + c2)) {
        falling.push({
          x: cellX(r, c2), y: cellY(r),
          vx: rand(-80, 80), vy: rand(-180, -40),
          color: b.color, type: b.type,
          rot: 0, rotSpeed: rand(-4, 4), r: R
        });
        grid[r][c2] = null;
        count++;
      }
    }
  }
  if (count > 0) {
    var bonus = count * 25;
    score += bonus;
    Sound.drop();
    addShake(Math.min(7, count * 0.5));
    floatText(W / 2, DEATH_Y - 130, count + ' DROPPED  +' + bonus, '#51cf66', 20);
  }
  return count;
}

function explodeAt(r0, c0, rad) {
  var seen = new Set([r0 + ',' + c0]);
  var queue = [[r0, c0, 0]];
  var cells = [];
  while (queue.length) {
    var cur = queue.shift();
    var r = cur[0], c = cur[1], d = cur[2];
    if (grid[r][c]) cells.push([r, c]);
    if (d >= rad) continue;
    var nb = neighbors(r, c);
    for (var i = 0; i < nb.length; i++) {
      var k = nb[i][0] + ',' + nb[i][1];
      if (!seen.has(k)) { seen.add(k); queue.push([nb[i][0], nb[i][1], d + 1]); }
    }
  }
  var cx = cellX(r0, c0), cy = cellY(r0);
  burst(cx, cy, '#ff922b', 30, 1.8);
  burst(cx, cy, '#ffd43b', 22, 1.5);
  shockwave(cx, cy, '#ff922b', 150);
  shockwave(cx, cy, '#ffffff', 90);
  Sound.boom();
  addShake(18);

  var gained = 0;
  for (var j = 0; j < cells.length; j++) {
    var rr = cells[j][0], cc = cells[j][1];
    var b = grid[rr][cc];
    if (!b) continue;
    grid[rr][cc] = null;
    popRing(cellX(rr, cc), cellY(rr), b.color);
    burst(cellX(rr, cc), cellY(rr), b.color, 5);
    gained += 15;
  }
  score += gained;
  if (gained > 0) floatText(cx, cy, 'BOOM +' + gained, '#ff922b', 24);
}

/* =========================================================
   COLLISION / SNAP
   ========================================================= */
function collidesAt(x, y) {
  var r0 = Math.floor((y - TOP - R - dropOffset) / ROW_H);
  var lo = Math.max(0, r0 - 1);
  var hi = Math.min(MAX_ROWS - 1, r0 + 1);
  var lim = (2 * R - 4) * (2 * R - 4);
  for (var r = lo; r <= hi; r++) {
    var n = colsInRow(r);
    var yy = cellY(r);
    for (var c = 0; c < n; c++) {
      if (!grid[r][c]) continue;
      var dx = x - cellX(r, c);
      var dy = y - yy;
      if (dx * dx + dy * dy < lim) return true;
    }
  }
  return false;
}

function findSnapCell(x, y) {
  var best = null, bestD = Infinity;
  for (var r = 0; r < MAX_ROWS; r++) {
    var n = colsInRow(r);
    var yy = cellY(r);
    for (var c = 0; c < n; c++) {
      if (grid[r][c]) continue;
      var attached = (r === 0);
      if (!attached) {
        var nb = neighbors(r, c);
        for (var i = 0; i < nb.length; i++) {
          if (grid[nb[i][0]][nb[i][1]]) { attached = true; break; }
        }
      }
      if (!attached) continue;
      var dx = cellX(r, c) - x;
      var dy = yy - y;
      var d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = { r: r, c: c }; }
    }
  }
  return best;
}

/* =========================================================
   SHOOTING
   ========================================================= */
function shoot() {
  if (state !== 'playing') return;
  if (projectile) return;
  if (!currentBubble) return;
  if (movesLeft <= 0) return;

  projectile = {
    x: SX, y: SY - 4,
    angle: aimAngle,
    color: currentBubble.color,
    type: currentBubble.type,
    trail: []
  };
  recoil = 1;
  Sound.shoot();

  currentBubble = nextBubble;
  nextBubble = makeShotBubble();
}

function landProjectile() {
  var p = projectile;
  projectile = null;
  if (!p) return;

  movesLeft--;
  var cell = findSnapCell(p.x, p.y);
  if (!cell) { afterTurn(); return; }

  var r = cell.r, c = cell.c;

  if (p.type === 'rainbow') {
    var counts = {};
    var nb = neighbors(r, c);
    for (var i = 0; i < nb.length; i++) {
      var b = grid[nb[i][0]][nb[i][1]];
      if (b && b.type === 'normal') counts[b.color] = (counts[b.color] || 0) + 1;
    }
    var bestColor = null, bestN = 0;
    for (var k in counts) if (counts[k] > bestN) { bestN = counts[k]; bestColor = k; }
    grid[r][c] = { color: bestColor || pickShotColor(), type: 'normal', twinkle: 0 };
    burst(cellX(r, c), cellY(r), '#ffffff', 16, 1.3);
    shockwave(cellX(r, c), cellY(r), '#ffffff', 60);
  } else {
    grid[r][c] = { color: p.color, type: p.type, twinkle: 0 };
  }

  if (p.type === 'bomb') {
    explodeAt(r, c, 2);
    removeFloating();
    combo = 0;
  } else {
    var color = grid[r][c].color;
    var cluster = findCluster(r, c, color);
    if (cluster.length >= 3) {
      popCells(cluster);
      removeFloating();
    } else {
      combo = 0;
      addShake(2);
    }
  }
  afterTurn();
}

function afterTurn() {
  shotsSinceDrop++;
  if (shotsSinceDrop >= levelDef.dropEvery) {
    shotsSinceDrop = 0;
    addRow();
  }
  if (checkWin()) return;
  if (checkLose()) return;
}

function anyBubbleOnBoard() {
  for (var r = 0; r < MAX_ROWS; r++) {
    var n = colsInRow(r);
    for (var c = 0; c < n; c++) if (grid[r][c]) return true;
  }
  return false;
}

function checkWin() {
  if (anyBubbleOnBoard()) return false;
  doWin();
  return true;
}

function doWin() {
  if (state !== 'playing') return;
  state = 'win';
  screenT = 0;
  var pctLeft = movesLeft / levelDef.moves;
  var stars = 1;
  if (pctLeft >= 0.55) stars = 3;
  else if (pctLeft >= 0.30) stars = 2;
  var bonus = Math.round(score * 0.15) + movesLeft * 100;
  score += bonus;
  Progress.setStars(levelDef.id, stars);
  if (score > best) { best = score; Progress.best = best; Progress.save(); }
  winState = { stars: stars, bonus: bonus, anim: 0, snd: [0,0,0] };
  Sound.win();
  flashColor = '#ffe066';
  flashAlpha = 0.55;
  for (var i = 0; i < 90; i++) {
    burst(rand(40, W - 40), rand(180, 600), COLORS[i % COLORS.length], 1, 1.8);
  }
  for (var j = 0; j < 6; j++) {
    shockwave(rand(100, W - 100), rand(200, 500), '#ffd43b', rand(60, 140));
  }
}

function checkLose() {
  var lowest = -1;
  for (var r = MAX_ROWS - 1; r >= 0; r--) {
    var n = colsInRow(r);
    var found = false;
    for (var c = 0; c < n; c++) { if (grid[r][c]) { found = true; break; } }
    if (found) { lowest = r; break; }
  }
  if (lowest >= 0 && cellY(lowest) + R > DEATH_Y) {
    doLose('Bubbles reached the bottom');
    return true;
  }
  if (movesLeft <= 0 && !projectile) {
    doLose('Out of moves');
    return true;
  }
  return false;
}

function doLose(reason) {
  if (state === 'lose' || state === 'win') return;
  state = 'lose';
  screenT = 0;
  if (score > best) { best = score; Progress.best = best; Progress.save(); }
  loseState = { reason: reason, anim: 0 };
  Sound.lose();
  addShake(22);
  for (var r = 0; r < MAX_ROWS; r++) {
    var n = colsInRow(r);
    for (var c = 0; c < n; c++) {
      var b = grid[r][c];
      if (b) burst(cellX(r, c), cellY(r), b.color, 3);
    }
  }
  shockwave(W / 2, DEATH_Y, '#ff4d6d', 240);
}

/* =========================================================
   AIM PATH
   ========================================================= */
function computeAimPath(angle) {
  var x = SX, y = SY - 4;
  var dx = Math.cos(angle), dy = Math.sin(angle);
  var pts = [{ x: x, y: y }];
  var step = 6;
  var ceil = TOP + R + dropOffset;
  var bounces = 0;

  for (var i = 0; i < 420; i++) {
    x += dx * step;
    y += dy * step;
    if (x < R) { x = R; dx = -dx; pts.push({ x: x, y: y }); bounces++; }
    else if (x > W - R) { x = W - R; dx = -dx; pts.push({ x: x, y: y }); bounces++; }
    if (y <= ceil) break;
    if (collidesAt(x, y)) break;
    if (bounces > 3) break;
  }
  pts.push({ x: x, y: y });
  return { pts: pts, ex: x, ey: y };
}

/* =========================================================
   UPDATE
   ========================================================= */
function update(dt) {
  time += dt;
  screenT = Math.min(1, screenT + dt * 3.5);

  shakeMag *= Math.pow(0.0022, dt);
  if (shakeMag < 0.2) shakeMag = 0;
  shakeX = (Math.random() - 0.5) * shakeMag * 2;
  shakeY = (Math.random() - 0.5) * shakeMag * 2;

  if (dropOffset < 0) {
    dropOffset += (0 - dropOffset) * Math.min(1, dt * 13);
    if (Math.abs(dropOffset) < 0.4) dropOffset = 0;
  }

  flashAlpha *= Math.pow(0.02, dt);
  recoil *= Math.pow(0.0008, dt);

  for (var i = 0; i < bgStars.length; i++) {
    var st = bgStars[i];
    st.twinkle += dt * st.twSpeed;
    st.y += dt * st.speed;
    if (st.y > H + 4) { st.y = -4; st.x = Math.random() * W; }
  }
  for (var j = 0; j < bgOrbs.length; j++) {
    var o = bgOrbs[j];
    o.y -= o.s * dt;
    if (o.y < -o.r) { o.y = H + o.r; o.x = Math.random() * W; }
    o.phase = (o.phase || 0) + dt * 0.5;
  }

  if (projectile) updateProjectile(dt);

  for (var i2 = particles.length - 1; i2 >= 0; i2--) {
    var p = particles[i2];
    p.life -= dt;
    if (p.life <= 0) { particles.splice(i2, 1); continue; }
    p.vy += GRAVITY * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  for (var i3 = sparks.length - 1; i3 >= 0; i3--) {
    var s = sparks[i3];
    s.life -= dt;
    if (s.life <= 0) { sparks.splice(i3, 1); continue; }
    s.vy += GRAVITY * dt * 0.6;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
  }
  for (var i4 = popRings.length - 1; i4 >= 0; i4--) {
    popRings[i4].t += dt;
    if (popRings[i4].t >= popRings[i4].life) popRings.splice(i4, 1);
  }
  for (var i5 = shockwaves.length - 1; i5 >= 0; i5--) {
    shockwaves[i5].t += dt;
    if (shockwaves[i5].t >= shockwaves[i5].life) shockwaves.splice(i5, 1);
  }
  for (var i6 = floaters.length - 1; i6 >= 0; i6--) {
    var f = floaters[i6];
    f.t += dt;
    f.y += f.vy * dt;
    f.vy *= Math.pow(0.15, dt);
    if (f.t >= f.life) floaters.splice(i6, 1);
  }
  for (var i7 = falling.length - 1; i7 >= 0; i7--) {
    var b = falling[i7];
    b.vy += GRAVITY * dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.rot += b.rotSpeed * dt;
    if (b.x < R) { b.x = R; b.vx *= -0.6; }
    if (b.x > W - R) { b.x = W - R; b.vx *= -0.6; }
    if (b.y > H + 70) falling.splice(i7, 1);
  }
  if (toast) { toast.t += dt; if (toast.t >= toast.life) toast = null; }
  if (state === 'win' && winState) winState.anim += dt;
  if (state === 'lose' && loseState) loseState.anim += dt;
  if (state === 'levels') {
    levelScrollY += levelScrollV * dt;
    levelScrollV *= Math.pow(0.02, dt);
    var maxScroll = Math.max(0, Math.ceil(TOTAL_LEVELS / 3) * 112 + 100 - H);
    levelScrollY = clamp(levelScrollY, -maxScroll, 0);
  }
}

function updateProjectile(dt) {
  var p = projectile;
  var dist = SHOT_SPEED * dt;
  var steps = Math.max(1, Math.ceil(dist / 4));
  var stepLen = dist / steps;

  for (var i = 0; i < steps; i++) {
    p.x += Math.cos(p.angle) * stepLen;
    p.y += Math.sin(p.angle) * stepLen;

    if (p.x < R) { p.x = R; p.angle = Math.PI - p.angle; Sound.wall(); }
    else if (p.x > W - R) { p.x = W - R; p.angle = Math.PI - p.angle; Sound.wall(); }

    var ceil = TOP + R + dropOffset;
    if (p.y <= ceil) { p.y = Math.max(p.y, ceil); landProjectile(); return; }
    if (collidesAt(p.x, p.y)) { landProjectile(); return; }
    if (p.y > H + 40) { projectile = null; movesLeft--; afterTurn(); return; }
  }

  p.trail.push({ x: p.x, y: p.y });
  if (p.trail.length > 14) p.trail.shift();
}

/* =========================================================
   DRAW HELPERS
   ========================================================= */
function drawGradientText(text, x, y, size, colorA, colorB, shadow, weight) {
  var grad = ctx.createLinearGradient(x - 200, y - size / 2, x + 200, y + size / 2);
  grad.addColorStop(0, colorA);
  grad.addColorStop(1, colorB);
  ctx.font = (weight || '900') + ' ' + size + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (shadow) {
    ctx.save();
    ctx.shadowColor = shadow;
    ctx.shadowBlur = 28;
    ctx.fillStyle = grad;
    ctx.fillText(text, x, y);
    ctx.restore();
  } else {
    ctx.fillStyle = grad;
    ctx.fillText(text, x, y);
  }
}

function drawStar(cx, cy, size, filled, animT) {
  var spikes = 5;
  var outer = size;
  var inner = size * 0.45;
  ctx.save();
  ctx.translate(cx, cy);
  if (animT != null) {
    var t = Math.max(0, Math.min(1, animT));
    var pop = 1 + Math.sin(t * Math.PI) * 0.4;
    ctx.scale(pop, pop);
    ctx.globalAlpha = Math.min(1, t * 2);
  }
  ctx.beginPath();
  for (var i = 0; i < spikes * 2; i++) {
    var rad = i % 2 === 0 ? outer : inner;
    var a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
    var x = Math.cos(a) * rad;
    var y = Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  if (filled) {
    var g = ctx.createRadialGradient(0, -size * 0.3, 2, 0, 0, size);
    g.addColorStop(0, '#fff9db');
    g.addColorStop(0.5, '#ffd43b');
    g.addColorStop(1, '#f59f00');
    ctx.fillStyle = g;
    ctx.shadowColor = 'rgba(255,200,60,0.95)';
    ctx.shadowBlur = 20;
    ctx.fill();
    ctx.strokeStyle = '#ffe066';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(-size * 0.15, -size * 0.25, size * 0.12, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();
}

function drawGlassPanel(x, y, w, h, r, tint, tintAlpha, borderColor) {
  tint = tint || '120,160,255';
  tintAlpha = tintAlpha == null ? 0.10 : tintAlpha;
  borderColor = borderColor || 'rgba(255,255,255,0.14)';

  var g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, 'rgba(255,255,255,' + (tintAlpha * 1.4) + ')');
  g.addColorStop(0.5, 'rgba(255,255,255,' + (tintAlpha * 0.7) + ')');
  g.addColorStop(1, 'rgba(255,255,255,' + (tintAlpha * 0.3) + ')');
  ctx.fillStyle = g;
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fill();

  var tintG = ctx.createLinearGradient(0, y, 0, y + h);
  tintG.addColorStop(0, 'rgba(' + tint + ',0.14)');
  tintG.addColorStop(1, 'rgba(' + tint + ',0.03)');
  ctx.fillStyle = tintG;
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fill();

  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1.2;
  roundRectPath(ctx, x, y, w, h, r);
  ctx.stroke();
}

function drawBigButton(b) {
  var x = b.x - b.w / 2, y = b.y - b.h / 2;

  ctx.save();
  ctx.shadowColor = b.glow || 'rgba(77,171,247,0.7)';
  ctx.shadowBlur = 28;
  ctx.fillStyle = 'rgba(0,0,0,0)';
  roundRectPath(ctx, x, y, b.w, b.h, 16);
  ctx.fill();
  ctx.restore();

  var g = ctx.createLinearGradient(0, y, 0, y + b.h);
  g.addColorStop(0, shade(b.color, 0.35));
  g.addColorStop(0.5, shade(b.color, 0.05));
  g.addColorStop(1, shade(b.color, -0.35));
  ctx.fillStyle = g;
  roundRectPath(ctx, x, y, b.w, b.h, 16);
  ctx.fill();

  var hi = ctx.createLinearGradient(0, y, 0, y + b.h * 0.55);
  hi.addColorStop(0, 'rgba(255,255,255,0.55)');
  hi.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hi;
  roundRectPath(ctx, x + 3, y + 2, b.w - 6, b.h * 0.55, 14);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1.6;
  roundRectPath(ctx, x, y, b.w, b.h, 16);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 1;
  roundRectPath(ctx, x + 1.5, y + 1.5, b.w - 3, b.h - 3, 14.5);
  ctx.stroke();

  ctx.font = '900 19px -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 5;
  ctx.fillText(b.label, b.x, b.y + 1);
  ctx.shadowBlur = 0;
}

function drawIconButton(x, y, icon) {
  ctx.save();
  var g = ctx.createRadialGradient(x - 4, y - 5, 2, x, y, 20);
  g.addColorStop(0, 'rgba(255,255,255,0.14)');
  g.addColorStop(1, 'rgba(255,255,255,0.05)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.20)';
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.92)';

  if (icon === 'pause') {
    ctx.fillRect(x - 5.5, y - 7, 3.6, 14);
    ctx.fillRect(x + 2, y - 7, 3.6, 14);
  } else if (icon === 'sound') {
    ctx.beginPath();
    ctx.moveTo(x - 8, y - 3.5);
    ctx.lineTo(x - 4, y - 3.5);
    ctx.lineTo(x + 0.5, y - 8);
    ctx.lineTo(x + 0.5, y + 8);
    ctx.lineTo(x - 4, y + 3.5);
    ctx.lineTo(x - 8, y + 3.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.92)';
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.arc(x + 1, y, 5, -0.9, 0.9); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + 1, y, 8.5, -0.85, 0.85); ctx.stroke();
  } else if (icon === 'mute') {
    ctx.beginPath();
    ctx.moveTo(x - 8, y - 3.5);
    ctx.lineTo(x - 4, y - 3.5);
    ctx.lineTo(x + 0.5, y - 8);
    ctx.lineTo(x + 0.5, y + 8);
    ctx.lineTo(x - 4, y + 3.5);
    ctx.lineTo(x - 8, y + 3.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.92)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 3, y - 5); ctx.lineTo(x + 9, y + 5);
    ctx.moveTo(x + 9, y - 5); ctx.lineTo(x + 3, y + 5);
    ctx.stroke();
  } else if (icon === 'back') {
    ctx.strokeStyle = 'rgba(255,255,255,0.92)';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + 3, y - 6);
    ctx.lineTo(x - 5, y);
    ctx.lineTo(x + 3, y + 6);
    ctx.stroke();
  }
  ctx.restore();
}

/* =========================================================
   BACKGROUND RENDER
   ========================================================= */
function drawBackground() {
  var g = ctx.createRadialGradient(W / 2, -120, 60, W / 2, H * 0.55, H * 1.2);
  g.addColorStop(0, '#1e2856');
  g.addColorStop(0.35, '#131a3d');
  g.addColorStop(0.7, '#0a0d24');
  g.addColorStop(1, '#05070f');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  for (var i = 0; i < bgStars.length; i++) {
    var s = bgStars[i];
    var tw = 0.4 + 0.6 * Math.abs(Math.sin(s.twinkle));
    ctx.globalAlpha = s.a * tw;
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (var j = 0; j < bgOrbs.length; j++) {
    var o = bgOrbs[j];
    var pulse = 0.6 + 0.4 * Math.sin(o.phase || 0);
    ctx.globalAlpha = o.a * pulse;
    var gg = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
    gg.addColorStop(0, o.color);
    gg.addColorStop(0.5, hexToRgba(o.color, 0.4));
    gg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gg;
    ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/* =========================================================
   PLAYFIELD RENDER
   ========================================================= */
function drawPlayfield() {
  ctx.save();
  var sideGrad = ctx.createLinearGradient(0, TOP, 0, DEATH_Y);
  sideGrad.addColorStop(0, 'rgba(120,160,255,0.20)');
  sideGrad.addColorStop(1, 'rgba(120,160,255,0.04)');
  ctx.fillStyle = sideGrad;
  ctx.fillRect(0, TOP - 10, 2, DEATH_Y - TOP + 22);
  ctx.fillRect(W - 2, TOP - 10, 2, DEATH_Y - TOP + 22);
  ctx.fillStyle = 'rgba(120,160,255,0.14)';
  ctx.fillRect(0, TOP - 10, W, 1.5);
  ctx.restore();
}

function drawDeathLine() {
  var isNear = false;
  var lowest = -1;
  for (var r = MAX_ROWS - 1; r >= 0; r--) {
    var n = colsInRow(r);
    var f = false;
    for (var c = 0; c < n; c++) { if (grid[r][c]) { f = true; break; } }
    if (f) { lowest = r; break; }
  }
  if (lowest >= 0 && cellY(lowest) + R > DEATH_Y - 120) isNear = true;
  var pulse = 0.5 + 0.5 * Math.sin(time * (isNear ? 8 : 3));

  ctx.save();
  ctx.setLineDash([12, 10]);
  ctx.lineWidth = 3;
  ctx.strokeStyle = isNear
    ? 'rgba(255,80,110,' + (0.55 + pulse * 0.45) + ')'
    : 'rgba(255,80,110,0.25)';
  ctx.beginPath();
  ctx.moveTo(0, DEATH_Y);
  ctx.lineTo(W, DEATH_Y);
  ctx.stroke();
  ctx.restore();

  if (isNear) {
    var g = ctx.createLinearGradient(0, DEATH_Y - 70, 0, DEATH_Y);
    g.addColorStop(0, 'rgba(255,60,90,0)');
    g.addColorStop(1, 'rgba(255,60,90,' + (0.10 + pulse * 0.14) + ')');
    ctx.fillStyle = g;
    ctx.fillRect(0, DEATH_Y - 70, W, 70);
  }
}

function drawSpecial(x, y, r, type) {
  if (type === 'bomb') {
    var glow = ctx.createRadialGradient(x, y, r * 0.3, x, y, r * 1.4);
    glow.addColorStop(0, 'rgba(255,150,40,0.55)');
    glow.addColorStop(1, 'rgba(255,150,40,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(x, y, r * 1.4, 0, Math.PI * 2); ctx.fill();

    var g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.06, x, y, r);
    g.addColorStop(0, '#9aa5b1');
    g.addColorStop(0.5, '#3a4350');
    g.addColorStop(1, '#0d1117');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();

    var pulse = 0.5 + 0.5 * Math.sin(time * 11);
    ctx.fillStyle = 'rgba(255,160,50,' + (0.55 + pulse * 0.4) + ')';
    ctx.beginPath(); ctx.arc(x, y, r * 0.48, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff3bf';
    ctx.beginPath(); ctx.arc(x, y, r * 0.22, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1.7;
    ctx.beginPath(); ctx.arc(x, y, r * 0.97, 0, Math.PI * 2); ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.ellipse(x - r * 0.38, y - r * 0.42, r * 0.22, r * 0.13, -0.7, 0, Math.PI * 2);
    ctx.fill();
  } else {
    var segs = 6;
    var rot = time * 2.2;

    var rglow = ctx.createRadialGradient(x, y, r * 0.4, x, y, r * 1.35);
    rglow.addColorStop(0, 'rgba(255,255,255,0.35)');
    rglow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rglow;
    ctx.beginPath(); ctx.arc(x, y, r * 1.35, 0, Math.PI * 2); ctx.fill();

    for (var i = 0; i < segs; i++) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.arc(x, y, r * 0.98,
        (i / segs) * Math.PI * 2 - Math.PI / 2 + rot,
        ((i + 1) / segs) * Math.PI * 2 - Math.PI / 2 + rot);
      ctx.closePath();
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.fill();
    }

    var cg = ctx.createRadialGradient(x, y, 1, x, y, r * 0.4);
    cg.addColorStop(0, 'rgba(255,255,255,0.85)');
    cg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.arc(x, y, r * 0.5, 0, Math.PI * 2); ctx.fill();

    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(x - r * 0.32, y - r * 0.38, r * 0.28, r * 0.16, -0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x, y, r * 0.98, 0, Math.PI * 2); ctx.stroke();
  }
}

function drawBubbleAt(x, y, r, b) {
  if (b.type === 'normal') drawBubble(x, y, r, b.color);
  else drawSpecial(x, y, r, b.type);
}

function drawGrid() {
  for (var r = 0; r < MAX_ROWS; r++) {
    var y = cellY(r);
    if (y < TOP - R * 3 || y > DEATH_Y + 70) continue;
    var n = colsInRow(r);
    for (var c = 0; c < n; c++) {
      var b = grid[r][c];
      if (!b) continue;
      if (b.twinkle != null) b.twinkle += 0.02;
      drawBubbleAt(cellX(r, c), y, R, b);
    }
  }
}

function drawAimGuide() {
  if (state !== 'playing') return;
  if (projectile) return;
  if (!currentBubble) return;
  if (movesLeft <= 0) return;

  var res = computeAimPath(aimAngle);

  ctx.save();
  ctx.setLineDash([7, 11]);
  ctx.lineDashOffset = -time * 110;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(120,180,255,0.14)';
  ctx.beginPath();
  ctx.moveTo(res.pts[0].x, res.pts[0].y);
  for (var i = 1; i < res.pts.length; i++) ctx.lineTo(res.pts[i].x, res.pts[i].y);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.setLineDash([7, 11]);
  ctx.lineDashOffset = -time * 110;
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.moveTo(res.pts[0].x, res.pts[0].y);
  for (var j = 1; j < res.pts.length; j++) ctx.lineTo(res.pts[j].x, res.pts[j].y);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.35;
  drawBubbleAt(res.ex, res.ey, R * 0.92, currentBubble);
  ctx.restore();

  var cell = findSnapCell(res.ex, res.ey);
  if (cell) {
    var cx = cellX(cell.r, cell.c), cy = cellY(cell.r);
    ctx.save();
    ctx.globalAlpha = 0.4 + 0.3 * Math.sin(time * 6);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.98, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawShooter() {
  var sy = SY - recoil * 8;

  var g = ctx.createRadialGradient(SX, sy, 4, SX, sy, 70);
  g.addColorStop(0, 'rgba(90,140,255,0.45)');
  g.addColorStop(0.6, 'rgba(90,140,255,0.08)');
  g.addColorStop(1, 'rgba(90,140,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(SX, sy, 70, 0, Math.PI * 2); ctx.fill();

  ctx.save();
  ctx.translate(SX, sy);
  ctx.rotate(aimAngle);
  var barrelGrad = ctx.createLinearGradient(0, -11, 54, 11);
  barrelGrad.addColorStop(0, 'rgba(120,160,255,0.10)');
  barrelGrad.addColorStop(1, 'rgba(120,160,255,0.45)');
  ctx.fillStyle = barrelGrad;
  ctx.beginPath();
  ctx.moveTo(0, -11);
  ctx.lineTo(54, -7);
  ctx.lineTo(54, 7);
  ctx.lineTo(0, 11);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(180,200,255,0.35)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.restore();

  var bg = ctx.createRadialGradient(SX - 8, sy - 10, 4, SX, sy, 30);
  bg.addColorStop(0, '#4d5d8f');
  bg.addColorStop(0.7, '#2a3350');
  bg.addColorStop(1, '#141a2e');
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.arc(SX, sy, 28, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(140,175,255,0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(SX, sy, 28, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(SX, sy, 22, 0, Math.PI * 2); ctx.stroke();

  if (currentBubble && !projectile && movesLeft > 0) {
    drawBubbleAt(SX, sy, R, currentBubble);
  }
}

function drawNextPreview() {
  var nx = W - 54, ny = SY + 24;

  ctx.save();
  var g = ctx.createRadialGradient(nx - 4, ny - 5, 2, nx, ny, 30);
  g.addColorStop(0, 'rgba(255,255,255,0.12)');
  g.addColorStop(1, 'rgba(255,255,255,0.03)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(nx, ny, 28, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(nx, ny, 28, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();

  if (nextBubble) {
    ctx.save();
    ctx.globalAlpha = 0.92;
    drawBubbleAt(nx, ny, R * 0.72, nextBubble);
    ctx.restore();
  }

  ctx.font = '800 9px -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.42)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('NEXT', nx, ny - 40);

  ctx.font = '700 9px -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.fillText('[S] SWAP', nx, ny + 42);
}

/* =========================================================
   HUD
   ========================================================= */
function drawHUD() {
  var g = ctx.createLinearGradient(0, 0, 0, TOP);
  g.addColorStop(0, 'rgba(22,30,58,0.98)');
  g.addColorStop(0.7, 'rgba(14,20,40,0.94)');
  g.addColorStop(1, 'rgba(10,14,30,0.82)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, TOP);
  ctx.fillStyle = 'rgba(140,175,255,0.24)';
  ctx.fillRect(0, TOP - 1, W, 1);
  ctx.fillStyle = 'rgba(77,171,247,0.10)';
  ctx.fillRect(0, TOP, W, 2);

  ctx.textBaseline = 'middle';

  ctx.textAlign = 'left';
  ctx.font = '800 10px -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.42)';
  ctx.fillText('LEVEL', 16, 18);

  ctx.save();
  ctx.font = '900 26px -apple-system, Segoe UI, Roboto, sans-serif';
  var lvlGrad = ctx.createLinearGradient(16, 26, 90, 60);
  lvlGrad.addColorStop(0, '#4dabf7');
  lvlGrad.addColorStop(1, '#b197fc');
  ctx.fillStyle = lvlGrad;
  ctx.fillText(String(level).padStart(2, '0'), 16, 44);
  ctx.restore();

  ctx.textAlign = 'left';
  ctx.font = '800 10px -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.42)';
  ctx.fillText('SCORE', 128, 18);

  ctx.font = '900 24px -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(String(score), 128, 44);

  var movesColor = movesLeft <= 3 ? '#ff6b6b' : movesLeft <= 6 ? '#ffd43b' : '#51cf66';
  ctx.textAlign = 'center';
  ctx.font = '800 10px -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.42)';
  ctx.fillText('MOVES', 288, 18);

  ctx.font = '900 24px -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.fillStyle = movesColor;
  var pulse = movesLeft <= 3 ? (0.7 + 0.3 * Math.sin(time * 8)) : 1;
  ctx.globalAlpha = pulse;
  ctx.fillText(String(movesLeft), 288, 44);
  ctx.globalAlpha = 1;

  drawIconButton(400, 35, 'pause');
  drawIconButton(446, 35, Sound.enabled ? 'sound' : 'mute');

  var barX = 16, barY = TOP - 24, barW = W - 32, barH = 9;
  var target = levelDef.target;
  var pct = clamp(score / target, 0, 1);

  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  roundRectPath(ctx, barX, barY, barW, barH, barH / 2);
  ctx.fill();

  var barGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
  barGrad.addColorStop(0, '#4dabf7');
  barGrad.addColorStop(0.5, '#b197fc');
  barGrad.addColorStop(1, '#ff4d6d');
  ctx.fillStyle = barGrad;
  roundRectPath(ctx, barX, barY, Math.max(barH, barW * pct), barH, barH / 2);
  ctx.fill();

  var shimmerX = barX + ((time * 220) % (barW + 120)) - 120;
  var shim = ctx.createLinearGradient(shimmerX - 30, 0, shimmerX + 30, 0);
  shim.addColorStop(0, 'rgba(255,255,255,0)');
  shim.addColorStop(0.5, 'rgba(255,255,255,0.45)');
  shim.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = shim;
  roundRectPath(ctx, barX, barY, barW * pct, barH, barH / 2);
  ctx.fill();

  ctx.font = '800 10px -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.textAlign = 'left';
  ctx.fillText('TARGET ' + target, barX, barY - 10);

  ctx.textAlign = 'right';
  var targetHit = score >= target;
  ctx.fillStyle = targetHit ? '#51cf66' : 'rgba(255,255,255,0.55)';
  ctx.fillText(targetHit ? '✓ COMPLETE' : Math.floor(pct * 100) + '%', barX + barW, barY - 10);

  if (combo > 1 && state === 'playing') {
    ctx.save();
    var cbText = 'COMBO ×' + combo;
    ctx.font = '900 15px -apple-system, Segoe UI, Roboto, sans-serif';
    var cbW = ctx.measureText(cbText).width + 28;
    var cbX = W / 2 - cbW / 2, cbY = TOP + 12;
    var cbGrad = ctx.createLinearGradient(cbX, 0, cbX + cbW, 0);
    cbGrad.addColorStop(0, 'rgba(255,212,59,0.9)');
    cbGrad.addColorStop(1, 'rgba(255,146,43,0.9)');
    ctx.fillStyle = cbGrad;
    ctx.shadowColor = 'rgba(255,180,60,0.7)';
    ctx.shadowBlur = 18;
    roundRectPath(ctx, cbX, cbY, cbW, 24, 12);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#1a1206';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(cbText, W / 2, cbY + 13);
    ctx.restore();
  }
}

/* =========================================================
   MENU SCREEN
   ========================================================= */
function drawMenu() {
  var ease = easeOut(screenT);

  for (var i = 0; i < 11; i++) {
    var bx = 40 + ((i * 137) % (W - 80)) + Math.sin(time * 1.2 + i * 0.9) * 18;
    var by = 100 + ((i * 211) % (H - 100)) - ((time * 28 * (0.4 + i * 0.1)) % (H + 100));
    var br = 12 + (i % 4) * 6;
    ctx.save();
    ctx.globalAlpha = 0.20 + 0.10 * Math.sin(time * 1.5 + i);
    drawBubble(bx, by, br, COLORS[i % COLORS.length]);
    ctx.restore();
  }

  var bounce = Math.sin(time * 1.6) * 5;
  var titleY = 158 + bounce + (1 - ease) * 30;

  ctx.save();
  ctx.globalAlpha = ease;

  ctx.save();
  ctx.translate(W / 2, titleY - 58);
  ctx.rotate(-0.05);
  var badgeW = 224, badgeH = 30;
  var bg1 = ctx.createLinearGradient(-badgeW / 2, 0, badgeW / 2, 0);
  bg1.addColorStop(0, 'rgba(77,171,247,0.28)');
  bg1.addColorStop(1, 'rgba(177,151,252,0.28)');
  ctx.fillStyle = bg1;
  roundRectPath(ctx, -badgeW / 2, -badgeH / 2, badgeW, badgeH, 15);
  ctx.fill();
  ctx.strokeStyle = 'rgba(177,151,252,0.65)';
  ctx.lineWidth = 1.3;
  roundRectPath(ctx, -badgeW / 2, -badgeH / 2, badgeW, badgeH, 15);
  ctx.stroke();
  ctx.font = '900 11px -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.fillStyle = '#c0a8ff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✦  PREMIUM  PUZZLE  ARCADE  ✦', 0, 1);
  ctx.restore();

  drawGradientText('BUBBLEPOP', W / 2, titleY + 15, 50, '#4dabf7', '#b197fc', 'rgba(100,150,255,0.9)');
  drawGradientText('MASTER',    W / 2, titleY + 70, 50, '#b197fc', '#ff4d6d', 'rgba(255,100,150,0.75)');

  var statsY = 306 + (1 - ease) * 20;
  var totalStars = Progress.totalStars();
  var statW = 130, statH = 48, statGap = 12;
  var statTotalW = statW * 2 + statGap;
  var statStartX = (W - statTotalW) / 2;

  drawGlassPanel(statStartX, statsY - statH / 2, statW, statH, 12, '255,212,59', 0.08, 'rgba(255,212,59,0.28)');
  drawStar(statStartX + 24, statsY, 12, true);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = '900 18px -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.fillStyle = '#ffd43b';
  ctx.fillText(String(totalStars) + ' / ' + (TOTAL_LEVELS * 3), statStartX + 44, statsY + 1);

  drawGlassPanel(statStartX + statW + statGap, statsY - statH / 2, statW, statH, 12, '77,171,247', 0.08, 'rgba(77,171,247,0.28)');
  ctx.font = '800 10px -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillText('BEST', statStartX + statW + statGap + 16, statsY - 9);
  ctx.font = '900 17px -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.fillStyle = '#4dabf7';
  ctx.fillText(String(best), statStartX + statW + statGap + 16, statsY + 11);

  var btnY = 432;
  drawBigButton({ x: W / 2, y: btnY, w: 260, h: 68, label: '▶  PLAY', color: '#4dabf7', glow: 'rgba(77,171,247,0.85)' });
  drawBigButton({ x: W / 2, y: btnY + 84, w: 260, h: 58, label: '☰  LEVELS', color: '#8b5cf6', glow: 'rgba(139,92,246,0.75)' });

  if (Progress.unlocked > 1) {
    drawBigButton({ x: W / 2, y: btnY + 156, w: 260, h: 48, label: 'CONTINUE  ▶  LV ' + Math.min(Progress.unlocked, TOTAL_LEVELS), color: '#51cf66', glow: 'rgba(81,207,102,0.7)' });
  }

  ctx.font = '600 12px -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.32)';
  ctx.textAlign = 'center';
  ctx.fillText('Match 3+ bubbles  •  Clear the board to advance', W / 2, 752);

  ctx.restore();
}

/* =========================================================
   LEVEL SELECT
   ========================================================= */
function drawLevelSelect() {
  var ease = easeOut(screenT);

  ctx.save();
  ctx.globalAlpha = ease;
  var headerG = ctx.createLinearGradient(0, 0, 0, 130);
  headerG.addColorStop(0, 'rgba(22,30,58,0.99)');
  headerG.addColorStop(1, 'rgba(12,18,38,0.9)');
  ctx.fillStyle = headerG;
  ctx.fillRect(0, 0, W, 130);
  ctx.fillStyle = 'rgba(140,175,255,0.24)';
  ctx.fillRect(0, 129, W, 1);

  drawIconButton(34, 60, 'back');
  drawGradientText('SELECT LEVEL', W / 2, 58, 26, '#4dabf7', '#b197fc', null, '900');

  ctx.font = '800 11px -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(Progress.totalStars() + ' / ' + (TOTAL_LEVELS * 3) + ' STARS', W / 2, 92);

  var pbW = 220, pbX = W / 2 - pbW / 2, pbY = 108, pbH = 6;
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  roundRectPath(ctx, pbX, pbY, pbW, pbH, pbH / 2);
  ctx.fill();
  var totalS = Progress.totalStars();
  var tgrad = ctx.createLinearGradient(pbX, 0, pbX + pbW, 0);
  tgrad.addColorStop(0, '#ffd43b');
  tgrad.addColorStop(1, '#ff922b');
  ctx.fillStyle = tgrad;
  roundRectPath(ctx, pbX, pbY, Math.max(pbH, pbW * (totalS / (TOTAL_LEVELS * 3))), pbH, pbH / 2);
  ctx.fill();
  ctx.restore();

  var cols = 3;
  var cardW = 130, cardH = 100, gap = 12;
  var startX = (W - (cols * cardW + (cols - 1) * gap)) / 2;
  var startY = 158 + levelScrollY;

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 138, W, H - 138);
  ctx.clip();

  for (var i = 0; i < TOTAL_LEVELS; i++) {
    var lv = LEVELS[i];
    var cx = startX + (i % cols) * (cardW + gap);
    var cy = startY + Math.floor(i / cols) * (cardH + gap);

    if (cy < 100 || cy > H + 50) continue;

    var isUnlocked = lv.id <= Progress.unlocked;
    var isCurrent = lv.id === Progress.unlocked && Progress.unlocked <= TOTAL_LEVELS;
    var stars = Progress.stars[lv.id] || 0;

    if (isCurrent) {
      ctx.save();
      ctx.shadowColor = 'rgba(77,171,247,0.9)';
      ctx.shadowBlur = 22 + 10 * Math.sin(time * 3);
      ctx.fillStyle = 'rgba(0,0,0,0)';
      roundRectPath(ctx, cx, cy, cardW, cardH, 14);
      ctx.fill();
      ctx.restore();
    }

    if (isUnlocked) {
      var g = ctx.createLinearGradient(0, cy, 0, cy + cardH);
      g.addColorStop(0, 'rgba(44,60,110,0.95)');
      g.addColorStop(1, 'rgba(22,30,60,0.95)');
      ctx.fillStyle = g;
      roundRectPath(ctx, cx, cy, cardW, cardH, 14);
      ctx.fill();

      var hiG = ctx.createLinearGradient(0, cy, 0, cy + cardH * 0.5);
      hiG.addColorStop(0, 'rgba(255,255,255,0.10)');
      hiG.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = hiG;
      roundRectPath(ctx, cx + 2, cy + 2, cardW - 4, cardH * 0.5, 12);
      ctx.fill();

      var bg = ctx.createLinearGradient(cx, cy, cx + cardW, cy + cardH);
      if (isCurrent) {
        bg.addColorStop(0, '#4dabf7');
        bg.addColorStop(1, '#b197fc');
      } else {
        bg.addColorStop(0, 'rgba(140,175,255,0.4)');
        bg.addColorStop(1, 'rgba(80,120,220,0.28)');
      }
      ctx.strokeStyle = bg;
      ctx.lineWidth = isCurrent ? 2.4 : 1.6;
      roundRectPath(ctx, cx, cy, cardW, cardH, 14);
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '900 34px -apple-system, Segoe UI, Roboto, sans-serif';
      ctx.fillStyle = isCurrent ? '#ffffff' : 'rgba(255,255,255,0.88)';
      if (isCurrent) {
        ctx.shadowColor = 'rgba(77,171,247,0.8)';
        ctx.shadowBlur = 12;
      }
      ctx.fillText(String(lv.id), cx + cardW / 2, cy + 34);
      ctx.shadowBlur = 0;

      var starY = cy + 68;
      var starSize = 11;
      var starGap = 24;
      for (var s = 0; s < 3; s++) {
        var sx = cx + cardW / 2 + (s - 1) * starGap;
        drawStar(sx, starY, starSize, s < stars);
      }

      ctx.font = '700 9px -apple-system, Segoe UI, Roboto, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillText('TARGET ' + lv.target, cx + cardW / 2, cy + cardH - 9);
    } else {
      ctx.fillStyle = 'rgba(20,26,48,0.75)';
      roundRectPath(ctx, cx, cy, cardW, cardH, 14);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,0.09)';
      ctx.lineWidth = 1.5;
      roundRectPath(ctx, cx, cy, cardW, cardH, 14);
      ctx.stroke();

      ctx.save();
      ctx.translate(cx + cardW / 2, cy + cardH / 2 - 4);
      ctx.strokeStyle = 'rgba(255,255,255,0.32)';
      ctx.lineWidth = 2.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, -6, 8, Math.PI, 0);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      roundRectPath(ctx, -10, -2, 20, 16, 3);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath(); ctx.arc(0, 5, 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(-1, 5, 2, 4);
      ctx.restore();
    }
  }
  ctx.restore();
}

/* =========================================================
   PAUSED
   ========================================================= */
function drawPaused() {
  ctx.fillStyle = 'rgba(5,8,16,0.85)';
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  drawGradientText('PAUSED', W / 2, 240, 48, '#4dabf7', '#b197fc', 'rgba(100,150,255,0.7)');

  ctx.font = '700 14px -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillText('Level ' + level + '  •  Score ' + score, W / 2, 292);

  drawBigButton({ x: W / 2, y: 380, w: 240, h: 62, label: '▶  RESUME', color: '#51cf66', glow: 'rgba(81,207,102,0.7)' });
  drawBigButton({ x: W / 2, y: 458, w: 240, h: 56, label: '↻  RESTART', color: '#4dabf7', glow: 'rgba(77,171,247,0.6)' });
  drawBigButton({ x: W / 2, y: 530, w: 240, h: 56, label: '☰  LEVELS',  color: '#8b5cf6', glow: 'rgba(139,92,246,0.6)' });
  drawBigButton({ x: W / 2, y: 602, w: 240, h: 56, label: '⌂  MENU',   color: '#3a4560', glow: 'rgba(120,140,180,0.45)' });

  ctx.font = '600 12px -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.30)';
  ctx.fillText('S = swap   •   P = resume', W / 2, 700);
}

/* =========================================================
   WIN SCREEN
   ========================================================= */
function drawWin() {
  ctx.fillStyle = 'rgba(5,8,16,0.88)';
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.translate(W / 2, 240);
  ctx.globalAlpha = 0.14;
  for (var i = 0; i < 14; i++) {
    ctx.save();
    ctx.rotate((i / 14) * Math.PI * 2 + time * 0.4);
    var rg = ctx.createLinearGradient(0, 0, 0, -300);
    rg.addColorStop(0, 'rgba(255,212,59,0.8)');
    rg.addColorStop(1, 'rgba(255,212,59,0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.moveTo(-16, 0); ctx.lineTo(16, 0); ctx.lineTo(0, -300);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  drawGradientText('LEVEL COMPLETE!', W / 2, 176, 34, '#ffd43b', '#ff922b', 'rgba(255,200,60,0.85)');

  ctx.font = '700 14px -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('LEVEL ' + level, W / 2, 220);

  var starY = 320;
  var gap = 82;
  for (var i2 = 0; i2 < 3; i2++) {
    var sx = W / 2 + (i2 - 1) * gap;
    var filled = i2 < winState.stars;
    var delay = 0.35 + i2 * 0.28;
    var at = Math.max(0, Math.min(1, (winState.anim - delay) / 0.4));
    if (filled) {
      if (at > 0 && at < 0.25 && winState.snd[i2] === 0) {
        winState.snd[i2] = 1;
        Sound.star(i2);
      }
      drawStar(sx, starY, 34, true, at);
    } else {
      drawStar(sx, starY, 34, false, null);
    }
  }

  var cardX = W / 2 - 145, cardY = 398, cardW = 290, cardH = 158;
  drawGlassPanel(cardX, cardY, cardW, cardH, 16, '77,171,247', 0.10, 'rgba(140,175,255,0.30)');

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = '700 11px -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillText('SCORE', cardX + 24, cardY + 30);
  ctx.font = '900 28px -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(String(score), cardX + 24, cardY + 62);

  ctx.textAlign = 'right';
  ctx.font = '700 11px -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillText('BONUS', cardX + cardW - 24, cardY + 30);
  ctx.font = '900 22px -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.fillStyle = '#51cf66';
  ctx.fillText('+' + winState.bonus, cardX + cardW - 24, cardY + 60);

  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cardX + 24, cardY + 92);
  ctx.lineTo(cardX + cardW - 24, cardY + 92);
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.font = '700 11px -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillText('MOVES LEFT', cardX + 24, cardY + 116);
  ctx.font = '900 18px -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.fillStyle = '#4dabf7';
  ctx.fillText(String(movesLeft), cardX + 24, cardY + 138);

  ctx.textAlign = 'right';
  ctx.font = '700 11px -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillText('BEST', cardX + cardW - 24, cardY + 116);
  ctx.font = '900 18px -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.fillStyle = '#ffd43b';
  ctx.fillText(String(best), cardX + cardW - 24, cardY + 138);

  var hasNext = level < TOTAL_LEVELS;
  if (hasNext) {
    drawBigButton({ x: W / 2, y: 620, w: 250, h: 62, label: 'NEXT LEVEL  ▶', color: '#51cf66', glow: 'rgba(81,207,102,0.8)' });
    drawBigButton({ x: W / 2 - 60, y: 700, w: 100, h: 46, label: '↻', color: '#4dabf7', glow: 'rgba(77,171,247,0.6)' });
    drawBigButton({ x: W / 2 + 60, y: 700, w: 100, h: 46, label: '☰', color: '#8b5cf6', glow: 'rgba(139,92,246,0.6)' });
  } else {
    drawGradientText('ALL LEVELS COMPLETE!', W / 2, 596, 24, '#ffd43b', '#ff922b', 'rgba(255,200,60,0.7)');
    drawBigButton({ x: W / 2, y: 660, w: 250, h: 58, label: '☰  LEVELS', color: '#8b5cf6', glow: 'rgba(139,92,246,0.7)' });
    drawBigButton({ x: W / 2, y: 730, w: 250, h: 50, label: '⌂  MENU', color: '#3a4560', glow: 'rgba(120,140,180,0.45)' });
  }
}

/* =========================================================
   LOSE SCREEN
   ========================================================= */
function drawLose() {
  ctx.fillStyle = 'rgba(5,8,16,0.90)';
  ctx.fillRect(0, 0, W, H);

  var vg = ctx.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, H * 0.8);
  vg.addColorStop(0, 'rgba(255,60,90,0.15)');
  vg.addColorStop(1, 'rgba(255,60,90,0)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  drawGradientText('LEVEL FAILED', W / 2, 258, 42, '#ff4d6d', '#b197fc', 'rgba(255,80,110,0.85)');

  ctx.font = '700 15px -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(loseState.reason, W / 2, 312);

  var cardX = W / 2 - 145, cardY = 360, cardW = 290, cardH = 130;
  drawGlassPanel(cardX, cardY, cardW, cardH, 16, '255,77,109', 0.10, 'rgba(255,80,110,0.35)');

  ctx.textAlign = 'center';
  ctx.font = '700 11px -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillText('YOUR SCORE', W / 2, cardY + 26);

  ctx.font = '900 38px -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(255,255,255,0.4)';
  ctx.shadowBlur = 12;
  ctx.fillText(String(score), W / 2, cardY + 66);
  ctx.shadowBlur = 0;

  ctx.font = '700 11px -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.42)';
  ctx.fillText('TARGET ' + levelDef.target + '  •  MOVES ' + movesLeft + '/' + levelDef.moves, W / 2, cardY + 100);

  drawBigButton({ x: W / 2, y: 558, w: 250, h: 62, label: '↻  TRY AGAIN', color: '#4dabf7', glow: 'rgba(77,171,247,0.8)' });
  drawBigButton({ x: W / 2, y: 640, w: 250, h: 56, label: '☰  LEVELS',    color: '#8b5cf6', glow: 'rgba(139,92,246,0.6)' });
  drawBigButton({ x: W / 2, y: 712, w: 250, h: 50, label: '⌂  MAIN MENU', color: '#3a4560', glow: 'rgba(120,140,180,0.45)' });
}

/* =========================================================
   OVERLAY ROUTER
   ========================================================= */
function drawOverlay() {
  if (state === 'playing') return;

  if (state === 'menu') {
    ctx.fillStyle = 'rgba(4,7,14,0.45)';
    ctx.fillRect(0, 0, W, H);
    drawMenu();
  } else if (state === 'levels') {
    ctx.fillStyle = 'rgba(4,7,14,0.72)';
    ctx.fillRect(0, 0, W, H);
    drawLevelSelect();
  } else if (state === 'paused') {
    drawPaused();
  } else if (state === 'win') {
    drawWin();
  } else if (state === 'lose') {
    drawLose();
  }

  if (toast) {
    var a = 1 - Math.abs(toast.t / toast.life - 0.5) * 2;
    ctx.save();
    ctx.globalAlpha = clamp(a * 1.3, 0, 1);
    ctx.font = '800 14px -apple-system, Segoe UI, Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var tw = ctx.measureText(toast.text).width + 44;
    var tx = W / 2 - tw / 2;
    var ty = 170;
    var tg = ctx.createLinearGradient(tx, ty, tx, ty + 36);
    tg.addColorStop(0, 'rgba(22,30,58,0.96)');
    tg.addColorStop(1, 'rgba(12,18,38,0.92)');
    ctx.fillStyle = tg;
    roundRectPath(ctx, tx, ty, tw, 36, 18);
    ctx.fill();
    ctx.strokeStyle = toast.color;
    ctx.lineWidth = 1.5;
    roundRectPath(ctx, tx, ty, tw, 36, 18);
    ctx.stroke();
    ctx.fillStyle = toast.color;
    ctx.fillText(toast.text, W / 2, ty + 18);
    ctx.restore();
  }
}

/* =========================================================
   MAIN RENDER
   ========================================================= */
function render() {
  ctx.clearRect(0, 0, W, H);
  drawBackground();

  ctx.save();
  ctx.translate(shakeX, shakeY);

  if (state !== 'menu' && state !== 'levels') {
    drawPlayfield();
    drawDeathLine();
  }
  if (grid.length) drawGrid();

  for (var i = 0; i < falling.length; i++) {
    var b = falling[i];
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.rot);
    ctx.globalAlpha = clamp((H + 70 - b.y) / 220, 0, 1);
    if (b.type === 'normal') drawBubble(0, 0, b.r, b.color);
    else drawSpecial(0, 0, b.r, b.type);
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  for (var i2 = 0; i2 < popRings.length; i2++) {
    var f = popRings[i2];
    var p = f.t / f.life;
    ctx.globalAlpha = (1 - p) * 0.9;
    ctx.strokeStyle = f.color;
    ctx.lineWidth = 4.5 * (1 - p) + 1;
    ctx.beginPath();
    ctx.arc(f.x, f.y, R * (1 + p * 1.6), 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = (1 - p) * 0.4;
    ctx.fillStyle = f.color;
    ctx.beginPath();
    ctx.arc(f.x, f.y, R * (1 - p), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (var i3 = 0; i3 < shockwaves.length; i3++) {
    var sw = shockwaves[i3];
    var p2 = sw.t / sw.life;
    ctx.save();
    ctx.globalAlpha = (1 - p2) * 0.55;
    ctx.strokeStyle = sw.color;
    ctx.lineWidth = 6 * (1 - p2) + 1;
    ctx.beginPath();
    ctx.arc(sw.x, sw.y, sw.maxR * easeOut(p2), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  for (var i4 = 0; i4 < particles.length; i4++) {
    var pt = particles[i4];
    var a4 = clamp(pt.life / pt.maxLife, 0, 1);
    ctx.globalAlpha = a4;
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.r * a4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (var i5 = 0; i5 < sparks.length; i5++) {
    var sp = sparks[i5];
    var a5 = clamp(sp.life / sp.maxLife, 0, 1);
    ctx.globalAlpha = a5;
    ctx.strokeStyle = sp.color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    var mag = Math.sqrt(sp.vx * sp.vx + sp.vy * sp.vy) || 1;
    var ux = sp.vx / mag, uy = sp.vy / mag;
    ctx.beginPath();
    ctx.moveTo(sp.x, sp.y);
    ctx.lineTo(sp.x - ux * sp.len, sp.y - uy * sp.len);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  if (state === 'playing' || state === 'paused') {
    drawAimGuide();
  }

  if (projectile) {
    var pr = projectile;
    for (var i6 = 0; i6 < pr.trail.length; i6++) {
      var t = pr.trail[i6];
      var f2 = i6 / pr.trail.length;
      ctx.globalAlpha = f2 * 0.45;
      ctx.fillStyle = pr.type === 'normal' ? pr.color : '#ffffff';
      ctx.beginPath();
      ctx.arc(t.x, t.y, R * (0.35 + 0.5 * f2), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    drawBubbleAt(pr.x, pr.y, R, pr);
  }

  if (state !== 'menu' && state !== 'levels') {
    drawShooter();
    drawNextPreview();
  }

  for (var i7 = 0; i7 < floaters.length; i7++) {
    var fl = floaters[i7];
    var p3 = fl.t / fl.life;
    ctx.save();
    ctx.globalAlpha = clamp(1 - p3 * p3, 0, 1);
    ctx.font = '900 ' + fl.size + 'px -apple-system, Segoe UI, Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = fl.color;
    ctx.shadowColor = 'rgba(0,0,0,0.75)';
    ctx.shadowBlur = 10;
    ctx.fillText(fl.text, fl.x, fl.y);
    ctx.restore();
  }

  ctx.restore();

  if (state === 'playing' || state === 'paused') {
    drawHUD();
  }

  if (flashAlpha > 0.01) {
    ctx.fillStyle = hexToRgba(flashColor, flashAlpha);
    ctx.fillRect(0, 0, W, H);
  }

  drawOverlay();
}

/* =========================================================
   FLOW
   ========================================================= */
function startLevel(n) {
  level = n;
  levelDef = LEVELS[n - 1];
  score = 0;
  movesLeft = levelDef.moves;
  combo = 0;
  shakeMag = 0;
  particles = []; sparks = []; falling = []; popRings = []; floaters = []; shockwaves = [];
  projectile = null;
  buildBoard();
  refillQueue();
  aimAngle = -Math.PI / 2;
  state = 'playing';
  screenT = 0;
  flashAlpha = 0.25;
  flashColor = '#ffffff';
}

function goMenu() { state = 'menu'; screenT = 0; Sound.click(); }
function goLevels() { state = 'levels'; screenT = 0; levelScrollV = 0; Sound.click(); }

function togglePause() {
  if (state === 'playing') { state = 'paused'; Sound.click(); }
  else if (state === 'paused') { state = 'playing'; Sound.click(); }
}

function swapBubbles() {
  if (state !== 'playing') return;
  if (!currentBubble || !nextBubble) return;
  var t = currentBubble;
  currentBubble = nextBubble;
  nextBubble = t;
  Sound.swap();
}

/* =========================================================
   INPUT
   ========================================================= */
var BTN_PAUSE = { x: 400, y: 35, r: 24 };
var BTN_SOUND = { x: 446, y: 35, r: 24 };
var BTN_SWAP  = { x: W - 54, y: SY + 24, r: 34 };
var BTN_BACK  = { x: 34, y: 60, r: 22 };

function toLogical(e) {
  var rect = cv.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) / (rect.width / W),
    y: (e.clientY - rect.top) / (rect.height / H)
  };
}

function hitCircle(p, c) {
  var dx = p.x - c.x, dy = p.y - c.y;
  return dx * dx + dy * dy <= c.r * c.r;
}

function updateAimFrom(p) {
  var a = Math.atan2(p.y - SY, p.x - SX);
  if (a > 0) a = (p.x >= SX) ? -0.15 : -Math.PI + 0.15;
  aimAngle = clamp(a, -Math.PI + 0.15, -0.15);
}

function handleDown(p) {
  Sound.init();
  Sound.resume();

  if (state === 'playing') {
    if (hitCircle(p, BTN_PAUSE)) { togglePause(); return; }
    if (hitCircle(p, BTN_SOUND)) {
      Sound.enabled = !Sound.enabled;
      Sound.click();
      showToast(Sound.enabled ? 'Sound On' : 'Sound Off', '#4dabf7');
      return;
    }
    if (hitCircle(p, BTN_SWAP)) { swapBubbles(); return; }

    if (p.y > TOP && p.y < DEATH_Y + 40) {
      isAiming = true;
      updateAimFrom(p);
    }
    return;
  }

  if (state === 'paused') {
    var buttons = [
      { y: 380, w: 240, h: 62, id: 'resume' },
      { y: 458, w: 240, h: 56, id: 'restart' },
      { y: 530, w: 240, h: 56, id: 'levels' },
      { y: 602, w: 240, h: 56, id: 'menu' }
    ];
    for (var i = 0; i < buttons.length; i++) {
      var b = buttons[i];
      if (Math.abs(p.x - W / 2) <= b.w / 2 && Math.abs(p.y - b.y) <= b.h / 2) {
        if (b.id === 'resume') togglePause();
        else if (b.id === 'restart') startLevel(level);
        else if (b.id === 'levels') goLevels();
        else if (b.id === 'menu') goMenu();
        return;
      }
    }
    return;
  }

  if (state === 'menu') {
    if (Math.abs(p.x - W / 2) <= 130 && Math.abs(p.y - 432) <= 34) {
      Sound.click();
      startLevel(Math.min(Progress.unlocked, TOTAL_LEVELS));
      return;
    }
    if (Math.abs(p.x - W / 2) <= 130 && Math.abs(p.y - 516) <= 30) {
      goLevels();
      return;
    }
    if (Progress.unlocked > 1 && Math.abs(p.x - W / 2) <= 130 && Math.abs(p.y - 588) <= 24) {
      Sound.click();
      startLevel(Math.min(Progress.unlocked, TOTAL_LEVELS));
      return;
    }
    return;
  }

  if (state === 'levels') {
    if (hitCircle(p, BTN_BACK)) { goMenu(); return; }
    var cols = 3;
    var cardW = 130, cardH = 100, gap = 12;
    var startX = (W - (cols * cardW + (cols - 1) * gap)) / 2;
    var startY = 158 + levelScrollY;
    for (var j = 0; j < TOTAL_LEVELS; j++) {
      var cx = startX + (j % cols) * (cardW + gap);
      var cy = startY + Math.floor(j / cols) * (cardH + gap);
      if (cy < 130 || cy > H) continue;
      if (p.x >= cx && p.x <= cx + cardW && p.y >= cy && p.y <= cy + cardH) {
        var lv = LEVELS[j];
        if (lv.id <= Progress.unlocked) {
          Sound.click();
          startLevel(lv.id);
        } else {
          showToast('Locked — clear earlier levels', '#ff922b');
          Sound.tone(200, 0.15, 'square', 0.06);
        }
        return;
      }
    }
    return;
  }

  if (state === 'win') {
    if (Math.abs(p.x - W / 2) <= 125 && Math.abs(p.y - 620) <= 31) {
      if (level < TOTAL_LEVELS) { Sound.click(); startLevel(level + 1); }
      return;
    }
    if (level < TOTAL_LEVELS && Math.abs(p.x - (W / 2 - 60)) <= 50 && Math.abs(p.y - 700) <= 23) {
      Sound.click(); startLevel(level);
      return;
    }
    if (level < TOTAL_LEVELS && Math.abs(p.x - (W / 2 + 60)) <= 50 && Math.abs(p.y - 700) <= 23) {
      goLevels();
      return;
    }
    if (level >= TOTAL_LEVELS) {
      if (Math.abs(p.x - W / 2) <= 125 && Math.abs(p.y - 660) <= 29) { goLevels(); return; }
      if (Math.abs(p.x - W / 2) <= 125 && Math.abs(p.y - 730) <= 25) { goMenu(); return; }
    }
    return;
  }

  if (state === 'lose') {
    if (Math.abs(p.x - W / 2) <= 125 && Math.abs(p.y - 558) <= 31) { Sound.click(); startLevel(level); return; }
    if (Math.abs(p.x - W / 2) <= 125 && Math.abs(p.y - 640) <= 28) { goLevels(); return; }
    if (Math.abs(p.x - W / 2) <= 125 && Math.abs(p.y - 712) <= 25) { goMenu(); return; }
    return;
  }
}

function handleMove(p) {
  if (state === 'playing' && isAiming) updateAimFrom(p);
}

function handleUp() {
  if (state === 'playing' && isAiming) {
    isAiming = false;
    shoot();
  }
}

cv.addEventListener('pointerdown', function (e) {
  e.preventDefault();
  try { cv.setPointerCapture(e.pointerId); } catch (err) { }
  var p = toLogical(e);

  if (state === 'levels') {
    isDragging = true;
    dragStartY = p.y;
    dragStartScroll = levelScrollY;
    levelScrollV = 0;
    return;
  }

  handleDown(p);
}, { passive: false });

cv.addEventListener('pointermove', function (e) {
  var p = toLogical(e);
  if (state === 'levels' && isDragging) {
    var dy = p.y - dragStartY;
    levelScrollY = dragStartScroll + dy;
    var maxScroll = Math.max(0, Math.ceil(TOTAL_LEVELS / 3) * 112 + 100 - H);
    levelScrollY = clamp(levelScrollY, -maxScroll, 0);
    return;
  }
  handleMove(p);
}, { passive: false });

cv.addEventListener('pointerup', function (e) {
  var p = toLogical(e);
  if (state === 'levels' && isDragging) {
    isDragging = false;
    if (Math.abs(p.y - dragStartY) < 8) handleDown(p);
    return;
  }
  handleUp();
}, { passive: false });

cv.addEventListener('pointercancel', function () {
  isAiming = false;
  isDragging = false;
});

window.addEventListener('keydown', function (e) {
  Sound.init();
  Sound.resume();
  var k = (e.key || '').toLowerCase();

  if (k === 'p' || k === 'escape') {
    e.preventDefault();
    if (state === 'playing' || state === 'paused') togglePause();
    else if (state === 'levels') goMenu();
    return;
  }
  if (k === 's') { e.preventDefault(); swapBubbles(); return; }

  if (k === ' ' || k === 'enter') {
    e.preventDefault();
    if (state === 'menu') { startLevel(Math.min(Progress.unlocked, TOTAL_LEVELS)); return; }
    if (state === 'playing') shoot();
    if (state === 'win' && level < TOTAL_LEVELS) startLevel(level + 1);
    if (state === 'lose') startLevel(level);
    return;
  }

  if (state !== 'playing') return;

  if (k === 'arrowleft' || k === 'a') {
    e.preventDefault();
    aimAngle = clamp(aimAngle - 0.06, -Math.PI + 0.15, -0.15);
  }
  if (k === 'arrowright' || k === 'd') {
    e.preventDefault();
    aimAngle = clamp(aimAngle + 0.06, -Math.PI + 0.15, -0.15);
  }
});

/* =========================================================
   BOOT
   ========================================================= */
for (var bi = 0; bi < 90; bi++) {
  bgStars.push({
    x: Math.random() * W,
    y: Math.random() * H,
    r: rand(0.4, 1.8),
    a: rand(0.25, 0.85),
    speed: rand(2, 12),
    twSpeed: rand(1, 4),
    twinkle: Math.random() * 6.28,
    color: Math.random() < 0.7 ? '#ffffff' : '#bcd2ff'
  });
}

var BG_COLORS = ['#4dabf7', '#b197fc', '#ff4d6d', '#51cf66', '#ffd43b', '#ff922b'];
for (var oi = 0; oi < 26; oi++) {
  bgOrbs.push({
    x: Math.random() * W,
    y: Math.random() * H,
    r: rand(22, 90),
    s: rand(6, 22),
    a: rand(0.04, 0.10),
    color: BG_COLORS[randInt(BG_COLORS.length)],
    phase: Math.random() * 6.28
  });
}

grid = makeGrid();
levelDef = LEVELS[0];
buildBoard();
refillQueue();
aimAngle = -Math.PI / 2;

hideLoadingScreen();

var lastT = performance.now();
function loop(t) {
  var dt = (t - lastT) / 1000;
  lastT = t;
  if (dt > 0.05) dt = 0.05;
  if (dt < 0) dt = 0;

  update(dt);
  render();

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

})();