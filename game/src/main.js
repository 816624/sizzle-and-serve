// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is
// there. The game moves between four screens: title, play, paused and shift over.
//
// ?seed=N fixes the order pattern. ?shot=start|play|serve|rush (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets window.__shotReady
// for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_BAD_SERVE, EVENT_BURN, EVENT_CHOP_DONE, EVENT_COOK_DONE, EVENT_EXPIRE, EVENT_OVER, EVENT_SERVE, EVENT_TRASH } from './world.js';
import { ACTION_CLICK, ACTION_INTERACT, ACTION_PAUSE, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world, scene.screen, scene.best, 1.2);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Take orders from the board and serve them before time runs out.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.coins > best) {
      best = world.state.coins;
      saveBest(best);
    }
    announce(`Shift over. You earned $${world.state.coins} and served ${world.state.served} dishes. Best $${best}.`);
    audio.play('over');
  }

  function playEventSound(events) {
    if (events & EVENT_SERVE) audio.play('serve');
    else if (events & EVENT_BAD_SERVE) audio.play('bad');
    else if (events & EVENT_BURN) audio.play('burn');
    else if (events & EVENT_EXPIRE) audio.play('expire');
    else if (events & EVENT_CHOP_DONE) audio.play('done');
    else if (events & EVENT_COOK_DONE) audio.play('done');
    else if (events & EVENT_TRASH) audio.play('chop');
  }

  /** A click during play: a fridge button first, else use the nearest station. */
  function handleClick(click) {
    if (!click) return;
    const field = renderer.toField(click.clientX, click.clientY);
    const near = world.nearestStation();
    if (near && near.kind === 'fridge' && !world.state.chef.carried) {
      for (const button of renderer.fridgeButtons) {
        if (field.x >= button.x && field.x <= button.x + button.w && field.y >= button.y && field.y <= button.y + button.h) {
          if (world.takeFromFridge(button.id)) audio.play('pickup');
          return;
        }
      }
    }
    if (near) {
      const events = world.interact();
      if (events) audio.play('pickup');
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    const fridgePick = input.takeFridgePick();
    if (fridgePick && screen === SCREEN_PLAY) {
      if (world.takeFromFridge(fridgePick)) audio.play('pickup');
    }
    if (actions & ACTION_CLICK) {
      audio.unlock();
      if (screen === SCREEN_TITLE || screen === SCREEN_OVER) startGame();
      else if (screen === SCREEN_PLAY) handleClick(input.takeClick());
      else input.takeClick();
      return;
    }
    input.takeClick();
    if (actions & ACTION_INTERACT && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) {
      audio.unlock();
      startGame();
    } else if (actions & ACTION_INTERACT && screen === SCREEN_PLAY) {
      audio.unlock();
      const events = world.interact();
      if (events) audio.play('pickup');
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_INTERACT) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, 0, 0, false, true);
      return;
    }
    const move = input.move();
    const events = world.step(STEP, move.x, move.y, move.run, false);
    playEventSound(events);
    if (events & EVENT_OVER) endGame();
    else if (events & EVENT_EXPIRE) announce(`An order ran out of time. ${world.state.orders.length} orders on the board.`);
    else if (events & EVENT_SERVE) announce(`Served! $${world.state.coins} so far.`);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world, screen, best, now / 1000);
  }

  // Leaving the tab pauses a running game rather than letting orders expire unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Sizzle and Serve. Press Space or click to start your shift.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
