// The game's rules and state, with no drawing and no browser in it: the chef, the
// stations, the orders on the board, the plates, the coins and the shift clock.
// step() advances one fixed step and returns what happened as bit flags, so the
// caller can react (sounds, announcements) without the world knowing about screens.
import {
  CHEF, FIELD, FLOOR, ORDER, PROCESS, SHIFT_SECONDS, STATIONS,
} from './config.js';
import {
  DISHES, FINISHED, INGREDIENTS, plateMatchesDish, unlockedDishes,
} from './recipes.js';

export const EVENT_PICKUP = 1;
export const EVENT_CHOP_DONE = 2;
export const EVENT_COOK_DONE = 4;
export const EVENT_SERVE = 8;
export const EVENT_EXPIRE = 16;
export const EVENT_OVER = 32;
export const EVENT_BURN = 64;
export const EVENT_TRASH = 128;
export const EVENT_BAD_SERVE = 256;

const STATION_LIST = Object.values(STATIONS);

function rectsOverlap(ax, ay, ar, bx, by, bw, bh) {
  return ax + ar > bx && ax - ar < bx + bw && ay + ar > by && ay - ar < by + bh;
}

export function createWorld(random) {
  const chef = { x: 640, y: 430, facing: 1, moving: false, running: false, carried: null };
  const board = { busy: false, progress: 0, item: null, result: null };
  const grill = { busy: false, progress: 0, item: null, result: null, readyTime: 0 };
  const pot = { busy: false, progress: 0, item: null, result: null };
  const assembly = { plate: null };
  const state = {
    chef, board, grill, pot, assembly,
    orders: [], nextOrderId: 1, orderTimer: ORDER.firstAt,
    coins: 0, served: 0, expired: 0, combo: 0, bestCombo: 0,
    elapsed: 0, over: false,
    popups: [], steam: [],
  };

  function restockPlate() {
    if (!assembly.plate) assembly.plate = { items: [] };
  }

  function reset() {
    chef.x = 640;
    chef.y = 430;
    chef.facing = 1;
    chef.carried = null;
    board.busy = false; board.progress = 0; board.item = null; board.result = null;
    grill.busy = false; grill.progress = 0; grill.item = null; grill.result = null; grill.readyTime = 0;
    pot.busy = false; pot.progress = 0; pot.item = null; pot.result = null;
    assembly.plate = null;
    restockPlate();
    state.orders = [];
    state.nextOrderId = 1;
    state.orderTimer = ORDER.firstAt;
    state.coins = 0;
    state.served = 0;
    state.expired = 0;
    state.combo = 0;
    state.bestCombo = 0;
    state.elapsed = 0;
    state.over = false;
    state.popups = [];
    state.steam = [];
  }

  function addPopup(x, y, text, colour) {
    state.popups.push({ x, y, text, colour, life: 1.4 });
    if (state.popups.length > 12) state.popups.shift();
  }

  function addSteam(x, y) {
    state.steam.push({ x, y, life: 1, size: 6 + random() * 8 });
    if (state.steam.length > 40) state.steam.shift();
  }

  /** The station the chef stands close enough to use, or null. */
  function nearestStation() {
    let best = null;
    let bestDistance = CHEF.interactRange;
    for (const station of STATION_LIST) {
      const dx = chef.x - station.cx;
      const dy = chef.y - station.cy;
      const distance = Math.hypot(dx, dy);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = station;
      }
    }
    return best;
  }

  /** What the interact key would do right now, for the prompt line and the highlight. */
  function interactLabel() {
    const station = nearestStation();
    if (!station) return null;
    const carried = chef.carried;
    if (station.kind === 'fridge') return carried ? 'Hands full!' : 'Pick an ingredient (1-8 or click)';
    if (station.kind === 'board') {
      if (board.result) return carried ? 'Hands full!' : `Take ${board.result.name}`;
      if (board.busy) return 'Chopping…';
      if (carried && carried.kind === 'item' && INGREDIENTS[carried.id]?.choppable) return `Chop ${carried.id}`;
      return 'Bring something to chop';
    }
    if (station.kind === 'grill') {
      if (grill.result) return carried ? 'Hands full!' : `Take ${grill.result.name}`;
      if (grill.busy) return 'Grilling…';
      if (carried && carried.kind === 'item' && carried.id === 'patty') return 'Grill the patty';
      return 'Bring a patty to grill';
    }
    if (station.kind === 'pot') {
      if (pot.result) return carried ? 'Hands full!' : `Take ${pot.result.name}`;
      if (pot.busy) return 'Boiling…';
      if (carried && carried.kind === 'item' && carried.id === 'pasta') return 'Boil the pasta';
      return 'Bring pasta to boil';
    }
    if (station.kind === 'assembly') {
      if (carried && carried.kind === 'item') return `Add ${carried.id} to the plate`;
      if (carried && carried.kind === 'plate') return 'Put the plate back';
      if (assembly.plate && assembly.plate.items.length > 0) return 'Pick up the plate';
      return 'Build the dish here';
    }
    if (station.kind === 'window') {
      if (carried && carried.kind === 'plate') return 'Serve the plate!';
      return 'Serve a finished plate here';
    }
    if (station.kind === 'trash') return carried ? 'Throw it away' : 'Nothing to throw away';
    return null;
  }

  /** Take a raw ingredient from the fridge into the chef's hands. */
  function takeFromFridge(id) {
    const station = nearestStation();
    if (!station || station.kind !== 'fridge') return false;
    if (chef.carried || !INGREDIENTS[id]) return false;
    chef.carried = { kind: 'item', id };
    return true;
  }

  /** The context action: pick up, put down, start chopping or cooking, serve, trash. */
  function interact() {
    const station = nearestStation();
    if (!station) return 0;
    let events = 0;
    const carried = chef.carried;

    if (station.kind === 'fridge') return 0; // the fridge needs a choice: takeFromFridge(id)

    if (station.kind === 'board') {
      if (board.result && !carried) {
        chef.carried = { kind: 'item', id: board.result };
        board.result = null;
        return EVENT_PICKUP;
      }
      if (!board.busy && carried && carried.kind === 'item' && INGREDIENTS[carried.id]?.choppable) {
        board.busy = true;
        board.progress = 0;
        board.item = carried.id;
        chef.carried = null;
        return EVENT_PICKUP;
      }
      return 0;
    }

    if (station.kind === 'grill') {
      if (grill.result && !carried) {
        chef.carried = { kind: 'item', id: grill.result };
        grill.result = null;
        grill.readyTime = 0;
        return EVENT_PICKUP;
      }
      if (!grill.busy && carried && carried.kind === 'item' && carried.id === 'patty') {
        grill.busy = true;
        grill.progress = 0;
        grill.item = 'patty';
        chef.carried = null;
        return EVENT_PICKUP;
      }
      return 0;
    }

    if (station.kind === 'pot') {
      if (pot.result && !carried) {
        chef.carried = { kind: 'item', id: pot.result };
        pot.result = null;
        return EVENT_PICKUP;
      }
      if (!pot.busy && carried && carried.kind === 'item' && carried.id === 'pasta') {
        pot.busy = true;
        pot.progress = 0;
        pot.item = 'pasta';
        chef.carried = null;
        return EVENT_PICKUP;
      }
      return 0;
    }

    if (station.kind === 'assembly') {
      if (carried && carried.kind === 'item') {
        restockPlate();
        assembly.plate.items.push(carried.id);
        chef.carried = null;
        return EVENT_PICKUP;
      }
      if (carried && carried.kind === 'plate') {
        assembly.plate = carried;
        chef.carried = null;
        return EVENT_PICKUP;
      }
      if (!carried && assembly.plate && assembly.plate.items.length > 0) {
        chef.carried = { kind: 'plate', items: assembly.plate.items };
        assembly.plate = null;
        restockPlate();
        return EVENT_PICKUP;
      }
      return 0;
    }

    if (station.kind === 'window') {
      if (carried && carried.kind === 'plate') {
        const dishId = Object.keys(DISHES).find((id) => {
          const order = state.orders.find((o) => o.dishId === id);
          return order && plateMatchesDish(carried.items, DISHES[id]);
        });
        if (dishId) {
          const order = state.orders.find((o) => o.dishId === dishId);
          const dish = DISHES[dishId];
          const tip = Math.round((order.patience / order.patienceMax) * 8);
          const earned = dish.price + tip;
          state.coins += earned;
          state.served += 1;
          state.combo += 1;
          state.bestCombo = Math.max(state.bestCombo, state.combo);
          state.orders = state.orders.filter((o) => o !== order);
          chef.carried = null;
          addPopup(station.cx, station.cy - 70, `+$${earned}`, '#f2b705');
          if (state.combo >= 2) addPopup(station.cx, station.cy - 100, `Combo x${state.combo}!`, '#ff8a5c');
          events |= EVENT_SERVE;
        } else {
          events |= EVENT_BAD_SERVE;
        }
        return events;
      }
      return 0;
    }

    if (station.kind === 'trash') {
      if (carried) {
        chef.carried = null;
        return EVENT_TRASH;
      }
      return 0;
    }
    return 0;
  }

  function spawnOrder() {
    const unlocked = unlockedDishes(state.elapsed);
    const dishId = unlocked[Math.floor(random() * unlocked.length)];
    const dish = DISHES[dishId];
    const progress = Math.min(1, state.elapsed / SHIFT_SECONDS);
    const patienceMax = ORDER.patienceStart + (ORDER.patienceEnd - ORDER.patienceStart) * progress;
    state.orders.push({
      id: state.nextOrderId,
      dishId,
      dish,
      patience: patienceMax,
      patienceMax,
    });
    state.nextOrderId += 1;
  }

  /** Put one order on the board with a set patience (used by the screenshot scenes). */
  function stageOrder(dishId, patience) {
    const dish = DISHES[dishId];
    if (!dish) return;
    state.orders.push({
      id: state.nextOrderId,
      dishId,
      dish,
      patience,
      patienceMax: patience,
    });
    state.nextOrderId += 1;
  }

  function orderInterval() {
    const progress = Math.min(1, state.elapsed / SHIFT_SECONDS);
    return ORDER.intervalStart + (ORDER.intervalEnd - ORDER.intervalStart) * progress;
  }

  /**
   * One fixed step. `mx`/`my` is the movement direction (-1..1 each), `run` is the
   * Shift key. With `attract` set (the title screen's backdrop) orders arrive and
   * food cooks, but nothing expires and the shift clock does not run.
   */
  function step(dt, mx, my, run, attract) {
    let events = 0;
    if (!attract) state.elapsed += dt;

    // Move the chef, sliding around counters and staying on the floor.
    const speed = run ? CHEF.runSpeed : CHEF.speed;
    const length = Math.hypot(mx, my);
    const nx = length > 0 ? mx / length : 0;
    const ny = length > 0 ? my / length : 0;
    chef.moving = length > 0;
    chef.running = run && length > 0;
    if (nx !== 0) chef.facing = nx;
    const nextX = chef.x + nx * speed * dt;
    const nextY = chef.y + ny * speed * dt;
    chef.x = Math.min(FLOOR.x + FLOOR.w - CHEF.radius, Math.max(FLOOR.x + CHEF.radius, nextX));
    chef.y = Math.min(FLOOR.y + FLOOR.h - CHEF.radius, Math.max(FLOOR.y + CHEF.radius, nextY));
    for (const station of STATION_LIST) {
      if (rectsOverlap(chef.x, chef.y, CHEF.radius, station.x, station.y, station.w, station.h)) {
        // Push the chef out along the smallest overlap.
        const overlapLeft = chef.x + CHEF.radius - station.x;
        const overlapRight = station.x + station.w - (chef.x - CHEF.radius);
        const overlapTop = chef.y + CHEF.radius - station.y;
        const overlapBottom = station.y + station.h - (chef.y - CHEF.radius);
        const smallest = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
        if (smallest === overlapLeft) chef.x = station.x - CHEF.radius;
        else if (smallest === overlapRight) chef.x = station.x + station.w + CHEF.radius;
        else if (smallest === overlapTop) chef.y = station.y - CHEF.radius;
        else chef.y = station.y + station.h + CHEF.radius;
      }
    }

    // Chopping.
    if (board.busy) {
      board.progress += dt;
      if (board.progress >= PROCESS.chopSeconds) {
        board.busy = false;
        board.result = INGREDIENTS[board.item].chopped;
        board.item = null;
        events |= EVENT_CHOP_DONE;
      }
    }
    // Grilling: cooks, then waits to be picked up, then burns.
    if (grill.busy) {
      grill.progress += dt;
      if (random() < dt * 6) addSteam(grill.cx, grill.y + 30);
      if (grill.progress >= PROCESS.grillSeconds) {
        grill.busy = false;
        grill.result = FINISHED.pattyGrilled.id;
        grill.readyTime = 0;
        events |= EVENT_COOK_DONE;
      }
    } else if (grill.result === FINISHED.pattyGrilled.id) {
      grill.readyTime += dt;
      if (random() < dt * 4) addSteam(grill.cx, grill.y + 30);
      if (grill.readyTime >= PROCESS.grillBurnSeconds) {
        grill.result = FINISHED.burnt.id;
        events |= EVENT_BURN;
      }
    }
    // Boiling.
    if (pot.busy) {
      pot.progress += dt;
      if (random() < dt * 8) addSteam(pot.cx, pot.y + 30);
      if (pot.progress >= PROCESS.boilSeconds) {
        pot.busy = false;
        pot.result = FINISHED.pastaBoiled.id;
        events |= EVENT_COOK_DONE;
      }
    }

    // New orders, on a timer that quickens as the shift goes on.
    if (state.orders.length < ORDER.maxOpen) {
      state.orderTimer -= dt;
      if (state.orderTimer <= 0) {
        spawnOrder();
        state.orderTimer = orderInterval();
      }
    }

    // Order patience: an expired order costs the combo and a little pride.
    if (!attract) {
      for (let index = state.orders.length - 1; index >= 0; index -= 1) {
        const order = state.orders[index];
        order.patience -= dt;
        if (order.patience <= 0) {
          state.orders.splice(index, 1);
          state.expired += 1;
          state.combo = 0;
          addPopup(640, 200, 'Order lost!', '#d64541');
          events |= EVENT_EXPIRE;
        }
      }
    }

    // Steam drifts up and fades; popups float up and fade.
    for (let index = state.steam.length - 1; index >= 0; index -= 1) {
      const puff = state.steam[index];
      puff.y -= 26 * dt;
      puff.life -= dt * 0.9;
      if (puff.life <= 0) state.steam.splice(index, 1);
    }
    for (let index = state.popups.length - 1; index >= 0; index -= 1) {
      const popup = state.popups[index];
      popup.y -= 34 * dt;
      popup.life -= dt;
      if (popup.life <= 0) state.popups.splice(index, 1);
    }

    // The shift ends at three minutes.
    if (!attract && state.elapsed >= SHIFT_SECONDS && !state.over) {
      state.over = true;
      events |= EVENT_OVER;
    }
    return events;
  }

  reset();
  return {
    state, reset, step, interact, takeFromFridge, nearestStation, interactLabel, stageOrder,
  };
}
