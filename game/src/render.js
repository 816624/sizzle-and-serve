// Drawing only: the world's state and the current screen in, pixels out. The 1280x720
// kitchen is scaled to fit the window and centred, the margin filled with the
// backdrop colour. Every ingredient is drawn as food that looks worth serving, so a
// screenshot reads as a complete cooking game at a glance.
import {
  FIELD, FONT, FONT_DISPLAY, ORDER, PALETTE, PROCESS, SHIFT_SECONDS, STATIONS, STARS, TOP_COUNTERS,
} from './config.js';
import {
  DISHES, FINISHED, INGREDIENTS,
} from './recipes.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const TICKET_W = 216;
const TICKET_H = 92;
const TICKET_GAP = 12;

function roundRect(context, x, y, w, h, r) {
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + w, y, x + w, y + h, r);
  context.arcTo(x + w, y + h, x, y + h, r);
  context.arcTo(x, y + h, x, y, r);
  context.arcTo(x, y, x + w, y, r);
  context.closePath();
}

function ellipse(context, x, y, rx, ry) {
  context.beginPath();
  context.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const fonts = new Map();
  /** The fridge picker's buttons in field coordinates, for click hit-testing. */
  const fridgeButtons = [];

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  function text(value, x, y, size, color, align, bold) {
    const key = `${size}${bold ? 'b' : ''}`;
    if (!fonts.has(key)) fonts.set(key, `${bold ? '700 ' : ''}${size}px ${FONT}`);
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }

  function displayText(value, x, y, size, color, align) {
    const key = `d${size}`;
    if (!fonts.has(key)) fonts.set(key, `800 ${size}px ${FONT_DISPLAY}`);
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }

  /** Window coordinates back into the 1280x720 kitchen. */
  function toField(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / rect.width * canvas.width / view.scale - view.x / view.scale,
      y: (clientY - rect.top) / rect.height * canvas.height / view.scale - view.y / view.scale,
    };
  }

  // ---------------------------------------------------------------- food

  function drawTomato(x, y, r) {
    context.fillStyle = '#e23b2e';
    context.beginPath(); context.arc(x, y, r, 0, Math.PI * 2); context.fill();
    context.fillStyle = '#ff6b57';
    context.beginPath(); context.arc(x - r * 0.3, y - r * 0.3, r * 0.55, 0, Math.PI * 2); context.fill();
    context.fillStyle = '#4e9b47';
    context.beginPath();
    for (let i = 0; i < 5; i += 1) {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
      context.moveTo(x, y - r * 0.7);
      context.lineTo(x + Math.cos(a) * r * 0.45, y - r * 0.7 + Math.sin(a) * r * 0.45);
    }
    context.fill();
    context.fillStyle = 'rgba(255,255,255,0.55)';
    context.beginPath(); context.ellipse(x - r * 0.35, y - r * 0.45, r * 0.22, r * 0.12, -0.6, 0, Math.PI * 2); context.fill();
  }

  function drawTomatoChopped(x, y, r) {
    for (let i = -1; i <= 1; i += 1) {
      context.fillStyle = i === 0 ? '#e23b2e' : '#c22a20';
      context.beginPath();
      context.moveTo(x + i * r * 0.9, y - r * 0.5);
      context.lineTo(x + i * r * 0.9 + r * 0.45, y + r * 0.4);
      context.lineTo(x + i * r * 0.9 - r * 0.45, y + r * 0.4);
      context.closePath(); context.fill();
      context.fillStyle = '#ff8a75';
      context.beginPath(); context.arc(x + i * r * 0.9, y + r * 0.05, r * 0.14, 0, Math.PI * 2); context.fill();
    }
  }

  function drawLettuce(x, y, r) {
    context.fillStyle = '#4e9b47';
    for (const [dx, dy, rr] of [[-0.45, 0.2, 0.55], [0.45, 0.2, 0.55], [0, -0.35, 0.6], [-0.2, 0.35, 0.5], [0.25, 0.35, 0.5]]) {
      context.beginPath(); context.arc(x + dx * r, y + dy * r, rr * r, 0, Math.PI * 2); context.fill();
    }
    context.fillStyle = '#8cc96e';
    context.beginPath(); context.arc(x, y - r * 0.1, r * 0.45, 0, Math.PI * 2); context.fill();
  }

  function drawLettuceChopped(x, y, r) {
    context.fillStyle = '#5da244';
    for (let i = -1; i <= 1; i += 1) {
      roundRect(context, x + i * r * 0.7 - r * 0.28, y - r * 0.45 + Math.abs(i) * r * 0.2, r * 0.56, r * 0.9, r * 0.25);
      context.fill();
    }
    context.fillStyle = '#8cc96e';
    roundRect(context, x - r * 0.28, y - r * 0.3, r * 0.56, r * 0.6, r * 0.25);
    context.fill();
  }

  function drawCucumber(x, y, r) {
    context.fillStyle = '#2f7a4e';
    context.beginPath(); context.arc(x, y, r, 0, Math.PI * 2); context.fill();
    context.fillStyle = '#cfe8b0';
    context.beginPath(); context.arc(x, y, r * 0.72, 0, Math.PI * 2); context.fill();
    context.fillStyle = '#8fbf7a';
    for (const [dx, dy] of [[-0.3, 0], [0.3, 0], [0, -0.3], [0, 0.3]]) {
      context.beginPath(); context.arc(x + dx * r, y + dy * r, r * 0.09, 0, Math.PI * 2); context.fill();
    }
  }

  function drawCucumberChopped(x, y, r) {
    for (let i = -1; i <= 1; i += 1) drawCucumber(x + i * r * 0.85, y + (i === 0 ? -r * 0.25 : r * 0.3), r * 0.55);
  }

  function drawOnion(x, y, r) {
    context.fillStyle = '#a55fb5';
    context.beginPath(); context.arc(x, y, r, 0, Math.PI * 2); context.fill();
    context.strokeStyle = '#efe2f2';
    context.lineWidth = r * 0.14;
    for (const rr of [0.68, 0.42]) {
      context.beginPath(); context.arc(x, y, r * rr, 0, Math.PI * 2); context.stroke();
    }
    context.fillStyle = '#7cc46f';
    context.beginPath(); context.moveTo(x, y - r); context.lineTo(x - r * 0.18, y - r * 1.25); context.lineTo(x + r * 0.18, y - r * 1.25); context.closePath(); context.fill();
  }

  function drawOnionChopped(x, y, r) {
    context.strokeStyle = '#b678c2';
    context.lineWidth = r * 0.28;
    context.lineCap = 'round';
    for (let i = -1; i <= 1; i += 1) {
      context.beginPath(); context.arc(x + i * r * 0.55, y, r * 0.5, Math.PI * 1.15, Math.PI * 1.85); context.stroke();
    }
    context.strokeStyle = '#efe2f2';
    context.lineWidth = r * 0.1;
    for (let i = -1; i <= 1; i += 1) {
      context.beginPath(); context.arc(x + i * r * 0.55, y, r * 0.5, Math.PI * 1.15, Math.PI * 1.85); context.stroke();
    }
  }

  function drawPatty(x, y, r) {
    context.fillStyle = '#b0563a';
    roundRect(context, x - r, y - r * 0.55, r * 2, r * 1.1, r * 0.5);
    context.fill();
    context.fillStyle = '#8a3d26';
    for (const [dx, dy] of [[-0.5, -0.2], [0.1, 0.15], [0.55, -0.15], [-0.1, -0.35]]) {
      context.beginPath(); context.arc(x + dx * r, y + dy * r, r * 0.1, 0, Math.PI * 2); context.fill();
    }
  }

  function drawPattyGrilled(x, y, r) {
    context.fillStyle = '#6e3a20';
    roundRect(context, x - r, y - r * 0.55, r * 2, r * 1.1, r * 0.5);
    context.fill();
    context.strokeStyle = '#2b1a10';
    context.lineWidth = r * 0.14;
    for (const dx of [-0.5, 0, 0.5]) {
      context.beginPath(); context.moveTo(x + dx * r, y - r * 0.5); context.lineTo(x + dx * r, y + r * 0.5); context.stroke();
    }
  }

  function drawPasta(x, y, r) {
    context.strokeStyle = '#f2c94c';
    context.lineWidth = r * 0.22;
    context.lineCap = 'round';
    for (let i = 0; i < 3; i += 1) {
      context.beginPath(); context.arc(x, y + (i - 1) * r * 0.34, r * (0.55 + i * 0.12), Math.PI * 0.15, Math.PI * 0.85); context.stroke();
    }
    context.strokeStyle = '#e8a94f';
    context.lineWidth = r * 0.12;
    context.beginPath(); context.arc(x, y, r * 0.8, Math.PI * 1.1, Math.PI * 1.9); context.stroke();
  }

  function drawPastaBoiled(x, y, r) {
    drawPasta(x, y, r);
    context.fillStyle = '#d64541';
    for (const [dx, dy] of [[-0.4, -0.3], [0.35, 0.1], [0, 0.45]]) {
      context.beginPath(); context.arc(x + dx * r, y + dy * r, r * 0.16, 0, Math.PI * 2); context.fill();
    }
  }

  function drawBun(x, y, r) {
    context.fillStyle = '#e8a94f';
    context.beginPath(); context.arc(x, y + r * 0.25, r, Math.PI, 0); context.closePath(); context.fill();
    context.fillStyle = '#d18a2e';
    roundRect(context, x - r, y + r * 0.2, r * 2, r * 0.3, r * 0.12);
    context.fill();
    context.fillStyle = '#fff3d0';
    for (const [dx, dy] of [[-0.5, -0.35], [0, -0.55], [0.5, -0.35], [-0.25, -0.15], [0.3, -0.15]]) {
      context.beginPath(); context.ellipse(x + dx * r, y + dy * r, r * 0.09, r * 0.06, 0.4, 0, Math.PI * 2); context.fill();
    }
  }

  function drawCheese(x, y, r) {
    context.fillStyle = '#f7b731';
    context.beginPath();
    context.moveTo(x - r, y + r * 0.6);
    context.lineTo(x + r, y + r * 0.6);
    context.lineTo(x + r * 0.55, y - r * 0.7);
    context.lineTo(x - r * 0.55, y - r * 0.7);
    context.closePath(); context.fill();
    context.fillStyle = '#e09b12';
    for (const [dx, dy] of [[-0.3, 0.2], [0.25, -0.1], [0, 0.35]]) {
      context.beginPath(); context.arc(x + dx * r, y + dy * r, r * 0.11, 0, Math.PI * 2); context.fill();
    }
  }

  function drawBurnt(x, y, r) {
    context.fillStyle = '#241a12';
    context.beginPath();
    context.arc(x - r * 0.3, y, r * 0.6, 0, Math.PI * 2);
    context.arc(x + r * 0.35, y + r * 0.1, r * 0.55, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#5a4632';
    context.beginPath(); context.arc(x, y - r * 0.3, r * 0.2, 0, Math.PI * 2); context.fill();
  }

  const FOOD_DRAW = {
    tomato: drawTomato,
    tomatoChopped: drawTomatoChopped,
    lettuce: drawLettuce,
    lettuceChopped: drawLettuceChopped,
    cucumber: drawCucumber,
    cucumberChopped: drawCucumberChopped,
    onion: drawOnion,
    onionChopped: drawOnionChopped,
    patty: drawPatty,
    pattyGrilled: drawPattyGrilled,
    pasta: drawPasta,
    pastaBoiled: drawPastaBoiled,
    bun: drawBun,
    cheese: drawCheese,
    burnt: drawBurnt,
  };

  function drawFood(id, x, y, r) {
    const draw = FOOD_DRAW[id];
    if (draw) draw(x, y, r);
  }

  /** A plate with the dish built on it: a burger stacks, everything else piles up. */
  function drawPlateWithDish(items, cx, cy, s) {
    context.fillStyle = 'rgba(0,0,0,0.18)';
    ellipse(context, cx, cy + 12 * s, 52 * s, 12 * s);
    context.fill();
    context.fillStyle = '#fdfdf8';
    ellipse(context, cx, cy, 52 * s, 17 * s);
    context.fill();
    context.strokeStyle = '#d8d2c2';
    context.lineWidth = 2;
    ellipse(context, cx, cy, 52 * s, 17 * s);
    context.stroke();
    context.fillStyle = '#f1ecdd';
    ellipse(context, cx, cy, 40 * s, 12 * s);
    context.fill();
    if (items.length === 0) return;
    if (items.includes('bun')) {
      const hasPatty = items.includes('pattyGrilled');
      const hasLettuce = items.includes('lettuceChopped');
      const hasTomato = items.includes('tomatoChopped');
      let layerY = cy + 2 * s;
      context.fillStyle = '#e8a94f';
      roundRect(context, cx - 34 * s, layerY - 8 * s, 68 * s, 10 * s, 5 * s);
      context.fill();
      if (hasPatty) {
        layerY -= 9 * s;
        context.fillStyle = '#6e3a20';
        roundRect(context, cx - 36 * s, layerY - 7 * s, 72 * s, 11 * s, 5 * s);
        context.fill();
      }
      if (hasLettuce) {
        layerY -= 8 * s;
        context.fillStyle = '#5da244';
        for (let i = -1; i <= 1; i += 1) {
          context.beginPath(); context.arc(cx + i * 22 * s, layerY, 13 * s, 0, Math.PI * 2); context.fill();
        }
      }
      if (hasTomato) {
        layerY -= 8 * s;
        context.fillStyle = '#e23b2e';
        roundRect(context, cx - 32 * s, layerY - 5 * s, 64 * s, 8 * s, 4 * s);
        context.fill();
      }
      layerY -= 10 * s;
      context.fillStyle = '#e8a94f';
      context.beginPath(); context.arc(cx, layerY + 6 * s, 34 * s, Math.PI, 0); context.closePath(); context.fill();
      context.fillStyle = '#fff3d0';
      for (const [dx, dy] of [[-0.45, -0.5], [0, -0.75], [0.45, -0.5]]) {
        context.beginPath(); context.ellipse(cx + dx * 34 * s, layerY + 6 * s + dy * 34 * s, 3 * s, 2 * s, 0.4, 0, Math.PI * 2); context.fill();
      }
      return;
    }
    const count = items.length;
    items.forEach((id, index) => {
      const angle = -Math.PI / 2 + (index / Math.max(1, count)) * Math.PI * 2;
      const dx = count === 1 ? 0 : Math.cos(angle) * 16 * s;
      const dy = count === 1 ? 0 : Math.sin(angle) * 7 * s;
      drawFood(id, cx + dx, cy - 4 * s + dy, 15 * s);
    });
  }

  // ---------------------------------------------------------------- kitchen

  function drawFloorAndWalls() {
    context.fillStyle = PALETTE.wall;
    context.fillRect(0, 0, FIELD.width, 116);
    context.fillStyle = PALETTE.wallTrim;
    context.fillRect(0, 108, FIELD.width, 8);
    context.fillStyle = PALETTE.floor;
    context.fillRect(0, 116, FIELD.width, FIELD.height - 116);
    context.strokeStyle = PALETTE.floorGrout;
    context.lineWidth = 2;
    for (let y = 116; y <= FIELD.height; y += 58) {
      context.beginPath(); context.moveTo(0, y); context.lineTo(FIELD.width, y); context.stroke();
    }
    for (let x = 0; x <= FIELD.width; x += 58) {
      context.beginPath(); context.moveTo(x, 116); context.lineTo(x, FIELD.height); context.stroke();
    }
    // A spice shelf on the back wall, between the order board and the clock.
    context.fillStyle = '#8a5a30';
    roundRect(context, 992, 74, 128, 8, 4);
    context.fill();
    const jars = ['#d64541', '#f2b705', '#5da244', '#b678c2'];
    jars.forEach((colour, index) => {
      const jx = 1008 + index * 30;
      context.fillStyle = '#fff6e3';
      roundRect(context, jx, 44, 20, 30, 5);
      context.fill();
      context.fillStyle = colour;
      roundRect(context, jx + 3, 56, 14, 15, 3);
      context.fill();
      context.fillStyle = '#8a5a30';
      roundRect(context, jx + 2, 40, 16, 6, 3);
      context.fill();
    });
  }

  function drawTopCounter(counter, dressing) {
    context.fillStyle = PALETTE.shadow;
    roundRect(context, counter.x + 3, counter.y + 5, counter.w, counter.h, 8);
    context.fill();
    context.fillStyle = PALETTE.counterWood;
    roundRect(context, counter.x, counter.y, counter.w, counter.h, 8);
    context.fill();
    context.fillStyle = PALETTE.counterTop;
    roundRect(context, counter.x, counter.y, counter.w, 18, 8);
    context.fill();
    dressing.forEach(([id, dx, dy, r]) => drawFood(id, counter.x + dx, counter.y + dy, r));
  }

  function drawStationBase(station, highlight) {
    const { x, y, w, h } = station;
    context.fillStyle = PALETTE.shadow;
    roundRect(context, x + 3, y + 5, w, h, 8);
    context.fill();
    if (highlight) {
      context.fillStyle = '#f2b705';
      roundRect(context, x - 5, y - 5, w + 10, h + 10, 12);
      context.fill();
    }
  }

  function drawFridge(station) {
    drawStationBase(station, false);
    const { x, y, w, h } = station;
    context.fillStyle = PALETTE.fridge;
    roundRect(context, x, y, w, h, 8);
    context.fill();
    context.strokeStyle = PALETTE.fridgeDark;
    context.lineWidth = 2;
    context.beginPath(); context.moveTo(x, y + 44); context.lineTo(x + w, y + 44); context.stroke();
    context.fillStyle = PALETTE.steelDark;
    roundRect(context, x + w - 16, y + 10, 7, 26, 3);
    context.fill();
    roundRect(context, x + w - 16, y + 54, 7, 26, 3);
    context.fill();
    drawTomato(x + 34, y + 76, 11);
    drawLettuce(x + 72, y + 76, 12);
    drawBun(x + 112, y + 74, 12);
    text('FRIDGE', x + w / 2, y + h - 8, 14, PALETTE.muted, 'center', true);
  }

  function drawBoard(station, worldState) {
    drawStationBase(station, false);
    const { x, y, w, h } = station;
    context.fillStyle = PALETTE.counterWood;
    roundRect(context, x, y, w, h, 8);
    context.fill();
    context.fillStyle = PALETTE.boardWood;
    roundRect(context, x + 14, y + 14, w - 28, h - 34, 6);
    context.fill();
    context.strokeStyle = '#b98d54';
    context.lineWidth = 2;
    roundRect(context, x + 14, y + 14, w - 28, h - 34, 6);
    context.stroke();
    const board = worldState.board;
    if (board.busy && board.item) {
      drawFood(board.item, x + w / 2, y + 42, 15);
      const progress = Math.min(1, board.progress / PROCESS.chopSeconds);
      context.fillStyle = 'rgba(46,33,24,0.35)';
      roundRect(context, x + 20, y + h - 22, w - 40, 10, 5);
      context.fill();
      context.fillStyle = PALETTE.greenLight;
      roundRect(context, x + 20, y + h - 22, (w - 40) * progress, 10, 5);
      context.fill();
    } else if (board.result) {
      drawFood(board.result, x + w / 2, y + 42, 16);
      text('READY', x + w / 2, y + h - 10, 13, PALETTE.green, 'center', true);
    } else {
      context.fillStyle = '#8a5a30';
      context.beginPath();
      context.moveTo(x + w - 44, y + 22);
      context.lineTo(x + w - 18, y + 52);
      context.lineTo(x + w - 26, y + 58);
      context.lineTo(x + w - 50, y + 30);
      context.closePath();
      context.fill();
      text('CHOP', x + w / 2, y + h - 10, 13, '#6b4423', 'center', true);
    }
  }

  function drawGrill(station, worldState) {
    drawStationBase(station, false);
    const { x, y, w, h } = station;
    context.fillStyle = PALETTE.steelDark;
    roundRect(context, x, y, w, h, 8);
    context.fill();
    context.fillStyle = '#3a3230';
    roundRect(context, x + 12, y + 12, w - 24, h - 44, 6);
    context.fill();
    context.strokeStyle = '#57504c';
    context.lineWidth = 3;
    for (let i = 1; i < 5; i += 1) {
      context.beginPath(); context.moveTo(x + 12 + ((w - 24) * i) / 5, y + 14); context.lineTo(x + 12 + ((w - 24) * i) / 5, y + h - 34); context.stroke();
    }
    const grill = worldState.grill;
    if (grill.busy) {
      drawPatty(x + w / 2, y + 40, 22);
      const progress = Math.min(1, grill.progress / PROCESS.grillSeconds);
      context.fillStyle = 'rgba(255,255,255,0.25)';
      roundRect(context, x + 20, y + h - 22, w - 40, 10, 5);
      context.fill();
      context.fillStyle = '#ff8a5c';
      roundRect(context, x + 20, y + h - 22, (w - 40) * progress, 10, 5);
      context.fill();
    } else if (grill.result) {
      drawFood(grill.result, x + w / 2, y + 40, 22);
      const burning = grill.result === FINISHED.pattyGrilled.id
        && grill.readyTime > PROCESS.grillBurnSeconds - 2;
      text(grill.result === FINISHED.burnt.id ? 'BURNT!' : burning ? 'GRAB IT!' : 'READY', x + w / 2, y + h - 10, 13, grill.result === FINISHED.burnt.id ? '#ff6b57' : '#ffd76e', 'center', true);
    } else {
      text('GRILL', x + w / 2, y + h - 10, 13, '#cfd6dd', 'center', true);
    }
  }

  function drawPot(station, worldState) {
    drawStationBase(station, false);
    const { x, y, w, h } = station;
    context.fillStyle = PALETTE.steel;
    roundRect(context, x, y, w, h, 8);
    context.fill();
    context.fillStyle = '#3a3230';
    ellipse(context, x + w / 2, y + 34, 52, 12);
    context.fill();
    context.fillStyle = '#5a514c';
    ellipse(context, x + w / 2, y + 30, 46, 10);
    context.fill();
    const pot = worldState.pot;
    if (pot.busy) {
      context.fillStyle = '#f7dc7d';
      ellipse(context, x + w / 2, y + 30, 40, 8);
      context.fill();
      context.fillStyle = '#fff3c4';
      for (const [dx, dy, r] of [[-16, -2, 4], [4, 2, 5], [18, -3, 3]]) {
        context.beginPath(); context.arc(x + w / 2 + dx, y + 30 + dy, r, 0, Math.PI * 2); context.fill();
      }
      const progress = Math.min(1, pot.progress / PROCESS.boilSeconds);
      context.fillStyle = 'rgba(46,33,24,0.35)';
      roundRect(context, x + 20, y + h - 22, w - 40, 10, 5);
      context.fill();
      context.fillStyle = '#6fb7e8';
      roundRect(context, x + 20, y + h - 22, (w - 40) * progress, 10, 5);
      context.fill();
    } else if (pot.result) {
      drawFood(pot.result, x + w / 2, y + 30, 18);
      text('READY', x + w / 2, y + h - 10, 13, PALETTE.green, 'center', true);
    } else {
      text('POT', x + w / 2, y + h - 10, 13, '#5d6a76', 'center', true);
    }
  }

  function drawAssembly(station, worldState) {
    drawStationBase(station, false);
    const { x, y, w, h } = station;
    context.fillStyle = PALETTE.counterWood;
    roundRect(context, x, y, w, h, 8);
    context.fill();
    context.fillStyle = PALETTE.counterTop;
    roundRect(context, x, y, w, 16, 8);
    context.fill();
    const plate = worldState.assembly.plate;
    if (plate) drawPlateWithDish(plate.items, x + w / 2, y + 44, 0.9);
    text('ASSEMBLY', x + w / 2, y + h - 6, 13, '#6b4423', 'center', true);
  }

  function drawWindow(station, worldState) {
    drawStationBase(station, false);
    const { x, y, w, h } = station;
    context.fillStyle = '#7a4a26';
    roundRect(context, x, y, w, h, 8);
    context.fill();
    context.fillStyle = '#fff6e3';
    roundRect(context, x + 10, y + 10, w - 20, h - 40, 6);
    context.fill();
    for (let i = 0; i < 8; i += 1) {
      context.fillStyle = i % 2 === 0 ? '#d64541' : '#fff6e3';
      context.fillRect(x + 10 + (i * (w - 20)) / 8, y + 10, (w - 20) / 8, 16);
    }
    context.fillStyle = '#f2b705';
    context.beginPath(); context.arc(x + w / 2, y + 42, 12, 0, Math.PI * 2); context.fill();
    context.fillStyle = '#8a5a30';
    context.fillRect(x + w / 2 - 14, y + 52, 28, 4);
    const served = worldState.served;
    text(served > 0 ? `SERVED ${served}` : 'SERVE HERE', x + w / 2, y + h - 6, 13, '#ffd76e', 'center', true);
  }

  function drawTrash(station) {
    drawStationBase(station, false);
    const { x, y, w, h } = station;
    context.fillStyle = '#5d6a76';
    roundRect(context, x + 18, y + 8, w - 36, h - 16, 8);
    context.fill();
    context.fillStyle = '#77838f';
    roundRect(context, x + 12, y + 2, w - 24, 12, 6);
    context.fill();
    context.strokeStyle = '#48525b';
    context.lineWidth = 3;
    for (let i = -1; i <= 1; i += 1) {
      context.beginPath(); context.moveTo(x + w / 2 + i * 22, y + 22); context.lineTo(x + w / 2 + i * 22, y + h - 22); context.stroke();
    }
    text('TRASH', x + w / 2, y + h - 6, 13, '#cfd6dd', 'center', true);
  }

  // ---------------------------------------------------------------- chef

  function drawChef(chef, t) {
    const bob = chef.moving ? Math.sin(t * 14) * 2 : Math.sin(t * 3) * 1;
    const x = chef.x;
    const y = chef.y + bob;
    context.fillStyle = 'rgba(0,0,0,0.22)';
    ellipse(context, chef.x, chef.y + 24, 24, 8);
    context.fill();
    // Body: white coat with apron.
    context.fillStyle = '#fdfdf8';
    roundRect(context, x - 20, y - 6, 40, 34, 12);
    context.fill();
    context.fillStyle = '#7fb3d5';
    roundRect(context, x - 13, y + 2, 26, 26, 8);
    context.fill();
    context.fillStyle = '#d64541';
    context.fillRect(x - 13, y + 2, 26, 4);
    // Arms.
    context.fillStyle = '#fdfdf8';
    context.beginPath(); context.arc(x - 22, y + 8, 8, 0, Math.PI * 2); context.fill();
    context.beginPath(); context.arc(x + 22, y + 8, 8, 0, Math.PI * 2); context.fill();
    // Head.
    context.fillStyle = '#f2c79b';
    context.beginPath(); context.arc(x, y - 18, 15, 0, Math.PI * 2); context.fill();
    // Chef hat.
    context.fillStyle = '#ffffff';
    context.beginPath(); context.arc(x - 10, y - 30, 9, 0, Math.PI * 2); context.fill();
    context.beginPath(); context.arc(x, y - 34, 11, 0, Math.PI * 2); context.fill();
    context.beginPath(); context.arc(x + 10, y - 30, 9, 0, Math.PI * 2); context.fill();
    roundRect(context, x - 14, y - 32, 28, 8, 3);
    context.fill();
    // Face.
    context.fillStyle = '#2e2118';
    const eyeDx = chef.facing >= 0 ? 2 : -2;
    context.beginPath(); context.arc(x - 5 + eyeDx, y - 18, 1.8, 0, Math.PI * 2); context.fill();
    context.beginPath(); context.arc(x + 5 + eyeDx, y - 18, 1.8, 0, Math.PI * 2); context.fill();
    context.strokeStyle = '#2e2118';
    context.lineWidth = 1.6;
    context.beginPath(); context.arc(x + eyeDx, y - 13, 5, 0.15 * Math.PI, 0.85 * Math.PI); context.stroke();
    // Carried food floats above the hat; a plate is held out front.
    const carried = chef.carried;
    if (carried) {
      if (carried.kind === 'plate') {
        drawPlateWithDish(carried.items, x + (chef.facing >= 0 ? 34 : -34), y + 8, 0.62);
      } else {
        context.fillStyle = 'rgba(255,255,255,0.92)';
        context.beginPath(); context.arc(x, y - 58, 20, 0, Math.PI * 2); context.fill();
        context.strokeStyle = '#d8d2c2';
        context.lineWidth = 2;
        context.beginPath(); context.arc(x, y - 58, 20, 0, Math.PI * 2); context.stroke();
        drawFood(carried.id, x, y - 58, 13);
      }
    }
  }

  // ---------------------------------------------------------------- HUD

  function drawCoinIcon(x, y, r) {
    context.fillStyle = PALETTE.coin;
    context.beginPath(); context.arc(x, y, r, 0, Math.PI * 2); context.fill();
    context.strokeStyle = '#d18a2e';
    context.lineWidth = 2;
    context.beginPath(); context.arc(x, y, r, 0, Math.PI * 2); context.stroke();
    text('$', x, y + r * 0.45, r * 1.1, '#8a5a30', 'center', true);
  }

  function drawTicket(order, x, plateItems) {
    const dish = order.dish;
    const y = 12;
    context.fillStyle = PALETTE.shadow;
    roundRect(context, x + 3, y + 3, TICKET_W, TICKET_H, 8);
    context.fill();
    context.fillStyle = PALETTE.paper;
    roundRect(context, x, y, TICKET_W, TICKET_H, 8);
    context.fill();
    const ratio = Math.max(0, order.patience / order.patienceMax);
    context.fillStyle = ratio > 0.5 ? PALETTE.green : ratio > 0.25 ? PALETTE.orange : PALETTE.red;
    roundRect(context, x, y, 8, TICKET_H, 8);
    context.fill();
    context.fillStyle = PALETTE.text;
    text(`#${order.id} ${dish.name}`, x + 18, y + 22, 17, PALETTE.text, 'left', true);
    // The dish, drawn small, and its ingredient checklist.
    drawFood(dish.needs[0], x + 34, y + 56, 13);
    let checkX = x + 62;
    dish.needs.forEach((need) => {
      // A need lights up green once the plate on the assembly counter holds it.
      const done = plateItems.includes(need);
      context.fillStyle = done ? PALETTE.green : '#e8e0d0';
      context.beginPath(); context.arc(checkX, y + 56, 9, 0, Math.PI * 2); context.fill();
      context.strokeStyle = done ? PALETTE.green : '#b9a98a';
      context.lineWidth = 1.5;
      context.beginPath(); context.arc(checkX, y + 56, 9, 0, Math.PI * 2); context.stroke();
      drawFood(need, checkX, y + 56, 7);
      if (done) text('✓', checkX, y + 60, 11, '#ffffff', 'center', true);
      checkX += 24;
    });
    text(`$${dish.price}`, x + TICKET_W - 12, y + 24, 16, '#8a5a30', 'right', true);
    const barW = TICKET_W - 24;
    context.fillStyle = '#e8e0d0';
    roundRect(context, x + 12, y + TICKET_H - 14, barW, 7, 3);
    context.fill();
    context.fillStyle = ratio > 0.5 ? PALETTE.green : ratio > 0.25 ? PALETTE.orange : PALETTE.red;
    roundRect(context, x + 12, y + TICKET_H - 14, barW * ratio, 7, 3);
    context.fill();
    if (ratio <= 0.25) {
      text(`${Math.ceil(order.patience)}s!`, x + TICKET_W - 12, y + TICKET_H - 20, 13, PALETTE.red, 'right', true);
    }
  }

  function drawHud(worldState) {
    // Brand and coins, left.
    displayText('SIZZLE & SERVE', 24, 34, 24, PALETTE.text, 'left');
    drawCoinIcon(36, 66, 13);
    text(`${worldState.coins}`, 56, 74, 26, PALETTE.text, 'left', true);
    text(`served ${worldState.served}`, 56, 96, 14, PALETTE.muted, 'left');
    // Order board, centre.
    const totalW = ORDER.maxOpen * TICKET_W + (ORDER.maxOpen - 1) * TICKET_GAP;
    const startX = (FIELD.width - totalW) / 2;
    const plateItems = worldState.assembly.plate ? worldState.assembly.plate.items : [];
    worldState.orders.forEach((order, index) => {
      drawTicket(order, startX + index * (TICKET_W + TICKET_GAP), plateItems);
    });
    if (worldState.orders.length === 0) {
      text('Orders appear here — keep the board clear!', FIELD.width / 2, 58, 17, PALETTE.muted, 'center');
    }
    // Shift clock, right.
    const remaining = Math.max(0, SHIFT_SECONDS - worldState.elapsed);
    const minutes = Math.floor(remaining / 60);
    const seconds = Math.floor(remaining % 60);
    const urgent = remaining <= 30 && remaining > 0;
    const clock = `${minutes}:${String(seconds).padStart(2, '0')}`;
    if (urgent) {
      context.fillStyle = 'rgba(214,69,65,0.16)';
      roundRect(context, FIELD.width - 148, 10, 124, 96, 10);
      context.fill();
    }
    displayText(clock, FIELD.width - 24, 46, 34, urgent ? PALETTE.red : PALETTE.text, 'right');
    text(urgent ? 'FINAL RUSH!' : 'SHIFT', FIELD.width - 24, 72, 14, urgent ? PALETTE.red : PALETTE.muted, 'right', true);
    const shiftRatio = Math.min(1, worldState.elapsed / SHIFT_SECONDS);
    context.fillStyle = '#e8e0d0';
    roundRect(context, FIELD.width - 148, 84, 124, 8, 4);
    context.fill();
    context.fillStyle = urgent ? PALETTE.red : PALETTE.green;
    roundRect(context, FIELD.width - 148, 84, 124 * shiftRatio, 8, 4);
    context.fill();
    if (worldState.combo >= 2) {
      text(`COMBO x${worldState.combo}`, FIELD.width - 24, 112, 16, '#e67e22', 'right', true);
    }
  }

  function drawFridgePicker() {
    fridgeButtons.length = 0;
    const panelW = 420;
    const panelH = 132;
    // To the right of the fridge, over open floor (never over a station).
    const panelX = 200;
    const panelY = 252;
    context.fillStyle = PALETTE.panelSolid;
    roundRect(context, panelX, panelY, panelW, panelH, 12);
    context.fill();
    context.strokeStyle = '#f2b705';
    context.lineWidth = 2;
    roundRect(context, panelX, panelY, panelW, panelH, 12);
    context.stroke();
    text('FRIDGE — pick an ingredient', panelX + 16, panelY + 24, 15, '#ffd76e', 'left', true);
    const ids = Object.keys(INGREDIENTS);
    ids.forEach((id, index) => {
      const col = index % 4;
      const row = Math.floor(index / 4);
      const bx = panelX + 14 + col * 100;
      const by = panelY + 34 + row * 48;
      context.fillStyle = '#5a4632';
      roundRect(context, bx, by, 92, 42, 8);
      context.fill();
      drawFood(id, bx + 18, by + 21, 12);
      text(INGREDIENTS[id].name, bx + 34, by + 18, 12, '#fff8ec', 'left', true);
      text(`[${index + 1}]`, bx + 34, by + 34, 11, '#cbb98f', 'left');
      fridgeButtons.push({ id, x: bx, y: by, w: 92, h: 42 });
    });
  }

  function drawSteamAndPopups(worldState) {
    for (const puff of worldState.steam) {
      context.fillStyle = `rgba(255,255,255,${Math.max(0, puff.life * 0.45)})`;
      context.beginPath(); context.arc(puff.x, puff.y, puff.size, 0, Math.PI * 2); context.fill();
    }
    for (const popup of worldState.popups) {
      context.globalAlpha = Math.min(1, popup.life);
      displayText(popup.text, popup.x, popup.y, 26, popup.colour, 'center');
      context.globalAlpha = 1;
    }
  }

  function drawPrompt(world) {
    const label = world.interactLabel();
    const station = world.nearestStation();
    if (!station) return;
    const y = FIELD.height - 18;
    context.font = `700 16px ${FONT}`;
    const labelText = `E — ${label ?? station.name}`;
    const width = context.measureText(labelText).width + 48;
    context.fillStyle = 'rgba(46,33,24,0.72)';
    roundRect(context, (FIELD.width - width) / 2, y - 22, width, 30, 15);
    context.fill();
    text(labelText, FIELD.width / 2, y, 16, '#fff8ec', 'center', true);
  }

  function drawPanel(title, lines, prompt, accent) {
    const width = 640;
    const height = 150 + lines.length * 36;
    const x = (FIELD.width - width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(30,20,12,0.45)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.panel;
    roundRect(context, x, y, width, height, 16);
    context.fill();
    context.strokeStyle = accent;
    context.lineWidth = 3;
    roundRect(context, x, y, width, height, 16);
    context.stroke();
    displayText(title, FIELD.width / 2, y + 64, 46, '#fff8ec', 'center');
    context.textBaseline = 'alphabetic';
    lines.forEach((line, index) => {
      text(line.text, FIELD.width / 2, y + 108 + index * 36, line.size ?? 20, line.color ?? '#e8dcc4', 'center', line.bold);
    });
    text(prompt, FIELD.width / 2, y + height - 26, 20, '#f2b705', 'center', true);
  }

  function starsFor(coins) {
    if (coins >= STARS.three) return 3;
    if (coins >= STARS.two) return 2;
    if (coins >= STARS.one) return 1;
    return 0;
  }

  /** Paint one frame: the kitchen, then the HUD or a panel for the screen. */
  function draw(world, screen, best, t) {
    const worldState = world.state;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);

    drawFloorAndWalls();
    // Dressed counters with ingredients on them.
    drawTopCounter(TOP_COUNTERS[0], [['tomato', 40, 48, 13], ['lettuce', 90, 48, 14], ['tomato', 140, 48, 13], ['cucumber', 190, 48, 12]]);
    drawTopCounter(TOP_COUNTERS[1], [['bun', 50, 48, 14], ['bun', 100, 48, 14], ['cheese', 150, 48, 13], ['pasta', 210, 48, 13]]);
    drawTopCounter(TOP_COUNTERS[2], [['onion', 40, 48, 12], ['tomato', 90, 48, 13], ['lettuce', 140, 48, 14], ['cheese', 190, 48, 13]]);

    const near = world.nearestStation();
    drawFridge(STATIONS.fridge);
    drawBoard(STATIONS.board, worldState);
    drawTrash(STATIONS.trash);
    drawGrill(STATIONS.grill, worldState);
    drawPot(STATIONS.pot, worldState);
    drawAssembly(STATIONS.assembly, worldState);
    drawWindow(STATIONS.window, worldState);
    if (near) {
      context.strokeStyle = '#f2b705';
      context.lineWidth = 3;
      context.setLineDash([8, 6]);
      const s = near;
      roundRect(context, s.x - 6, s.y - 6, s.w + 12, s.h + 12, 12);
      context.stroke();
      context.setLineDash([]);
    }

    drawChef(worldState.chef, t);
    drawSteamAndPopups(worldState);
    drawHud(worldState);
    if (screen === SCREEN_PLAY) {
      drawPrompt(world);
      if (near && near.kind === 'fridge' && !worldState.chef.carried) drawFridgePicker();
    }

    if (screen === SCREEN_TITLE) {
      const lines = [
        { text: 'Run the kitchen. Take orders from the board, chop, grill and boil,', size: 20 },
        { text: 'build each dish on the assembly counter and serve it before time runs out.', size: 20 },
        { text: 'Move with WASD or arrows · hold Shift to run · E to use a station · 1–8 at the fridge', size: 17, color: '#cbb98f' },
        { text: `Best shift: $${best}`, size: 18, color: '#ffd76e', bold: true },
      ];
      drawPanel('SIZZLE & SERVE', lines, 'Press Space or click to start your shift', '#f2b705');
    } else if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', [{ text: 'The orders will wait for you.', size: 20 }], 'Press P to keep cooking', '#6fb7e8');
    } else if (screen === SCREEN_OVER) {
      const coins = worldState.coins;
      const stars = starsFor(coins);
      const lines = [
        { text: '★'.repeat(stars) + '☆'.repeat(3 - stars), size: 34, color: '#f2b705' },
        { text: `You earned $${coins}  ·  served ${worldState.served} dishes  ·  lost ${worldState.expired} orders`, size: 20 },
        { text: `Best combo x${worldState.bestCombo}  ·  Best shift $${Math.max(best, coins)}`, size: 18, color: '#cbb98f' },
      ];
      drawPanel('Shift Over!', lines, 'Press Space or click to cook again', '#f2b705');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, fridgeButtons, toField };
}
