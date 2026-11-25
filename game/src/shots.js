// The screenshot scenes behind ?shot=start|play|serve|rush. Each one plays the real
// rules forward from a fresh world, steered by a scripted autopilot that walks the chef
// to the stations and uses them exactly as a player would (take, chop, grill, boil,
// assemble, serve), so the frame is what a real shift looks like and the same seed
// always gives the same frame. The rush scene ends with one order's patience set low
// (a value an order genuinely reaches in play) so its timer shows red.
import { ORDER, STATIONS } from './config.js';
import { DISHES, plateMatchesDish } from './recipes.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { EVENT_OVER } from './world.js';

const STEP = 1 / 60;
const ARRIVE = 16;
/** A step that cannot finish in this long is skipped, so a stuck pilot never hangs. */
const STEP_TIMEOUT = 14;

/** A step of the autopilot's script. */
function goTo(x, y) { return { kind: 'go', x, y }; }
/** Steer to a station via its open-floor approach point, then to its counter. */
function goStation(id) {
  const s = STATIONS[id];
  return [{ kind: 'go', x: s.ax, y: s.ay }, { kind: 'go', x: s.cx, y: s.cy }];
}
function interact() { return { kind: 'interact' }; }
function fridge(id) { return { kind: 'fridge', id }; }
function wait(seconds) { return { kind: 'wait', seconds }; }
function until(fn) { return { kind: 'until', fn }; }
/** Dump the carried plate in the trash, but only when one is actually carried. */
function trashPlateIfCarrying() { return { kind: 'trashPlate' }; }

/** Walk an ingredient from the fridge to a station, process it, and put it on the plate. */
function chopToPlate(id) {
  return [
    ...goStation('fridge'), fridge(id),
    ...goStation('board'), interact(),
    until((s) => s.board.result !== null), interact(),
    ...goStation('assembly'), interact(),
  ];
}
function grillToPlate() {
  return [
    ...goStation('fridge'), fridge('patty'),
    ...goStation('grill'), interact(),
    until((s) => s.grill.result === 'pattyGrilled'), interact(),
    ...goStation('assembly'), interact(),
  ];
}
function boilToPlate() {
  return [
    ...goStation('fridge'), fridge('pasta'),
    ...goStation('pot'), interact(),
    until((s) => s.pot.result === 'pastaBoiled'), interact(),
    ...goStation('assembly'), interact(),
  ];
}
function rawToPlate(id) {
  return [...goStation('fridge'), fridge(id), ...goStation('assembly'), interact()];
}

/** The steps that cook one whole dish and serve it, when a matching order is open. */
function cookDish(dishId) {
  const steps = [];
  if (dishId === 'salad') {
    steps.push(...chopToPlate('lettuce'), ...chopToPlate('tomato'), ...chopToPlate('cucumber'));
  } else if (dishId === 'burger') {
    steps.push(...rawToPlate('bun'), ...grillToPlate(), ...chopToPlate('lettuce'), ...chopToPlate('tomato'));
  } else if (dishId === 'pasta') {
    steps.push(...boilToPlate(), ...chopToPlate('tomato'), ...rawToPlate('cheese'));
  } else if (dishId === 'soup') {
    steps.push(...chopToPlate('tomato'), ...chopToPlate('onion'), ...boilToPlate());
  }
  steps.push(
    // Wait for a matching order with enough patience left to survive the walk over.
    until((s) => s.orders.some((o) => o.dishId === dishId && o.patience > 10
      && plateMatchesDish(s.assembly.plate ? s.assembly.plate.items : [], DISHES[o.dishId]))),
    interact(),
    ...goStation('window'), interact(),
    // If the order expired on the walk over, the plate is still in hand: bin it.
    trashPlateIfCarrying(),
  );
  return steps;
}

function cookDishPartial(dishId) {
  const steps = [];
  if (dishId === 'burger') {
    steps.push(...rawToPlate('bun'), ...grillToPlate(), ...chopToPlate('lettuce'));
  }
  return steps;
}

/** Drive the chef through a script, one fixed step at a time. */
function runScript(world, steps, maxSeconds) {
  const state = world.state;
  let index = 0;
  let stepTime = 0;
  let waited = 0;
  let total = 0;
  while (index < steps.length && total < maxSeconds) {
    const step = steps[index];
    let mx = 0;
    let my = 0;
    let done = false;
    if (step.kind === 'go') {
      const dx = step.x - state.chef.x;
      const dy = step.y - state.chef.y;
      const distance = Math.hypot(dx, dy);
      if (distance <= ARRIVE) done = true;
      else {
        mx = dx / distance;
        my = dy / distance;
      }
    } else if (step.kind === 'interact') {
      world.interact();
      done = true;
    } else if (step.kind === 'fridge') {
      world.takeFromFridge(step.id);
      done = true;
    } else if (step.kind === 'wait') {
      waited += STEP;
      if (waited >= step.seconds) {
        waited = 0;
        done = true;
      }
    } else if (step.kind === 'until') {
      if (step.fn(state)) done = true;
    } else if (step.kind === 'trashPlate') {
      const carried = state.chef.carried;
      if (!carried || carried.kind !== 'plate') {
        done = true;
      } else {
        const trash = STATIONS.trash;
        const dx = trash.cx - state.chef.x;
        const dy = trash.cy - state.chef.y;
        const distance = Math.hypot(dx, dy);
        if (distance <= ARRIVE) {
          world.interact();
          done = true;
        } else {
          mx = dx / distance;
          my = dy / distance;
        }
      }
    }
    stepTime += STEP;
    if (stepTime > STEP_TIMEOUT && step.kind !== 'wait' && step.kind !== 'until') {
      index += 1;
      stepTime = 0;
      waited = 0;
      continue;
    }
    if (step.kind === 'until' && stepTime > 45) {
      index += 1;
      stepTime = 0;
      continue;
    }
    const events = world.step(STEP, mx, my, false, false);
    total += STEP;
    if (events & EVENT_OVER) break;
    if (done) {
      index += 1;
      stepTime = 0;
      waited = 0;
    }
    // A shift that already ended stays ended: never step past it.
    if (world.state.over) break;
  }
  return total;
}

/** Let the world run on its own for `seconds` (orders arrive, food cooks). */
function idle(world, seconds, attract) {
  for (let t = 0; t < seconds; t += STEP) world.step(STEP, 0, 0, false, attract);
}

/**
 * Set `world` to the named scene (start, play, serve or rush; any other name is start)
 * and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'play') {
    runScript(world, [
      ...cookDish('salad'),
      ...cookDishPartial('burger'),
      ...goStation('fridge'), fridge('tomato'),
    ], 120);
    return { screen: SCREEN_PLAY, best: world.state.coins };
  }
  if (name === 'serve') {
    runScript(world, [
      ...cookDish('salad'),
      ...cookDish('burger'),
      wait(0.5),
    ], 180);
    return { screen: SCREEN_PLAY, best: world.state.coins };
  }
  if (name === 'rush') {
    runScript(world, [
      ...cookDish('salad'),
      ...cookDish('burger'),
      ...cookDishPartial('burger'),
    ], 200);
    // Let the shift run on: fresh orders arrive, patience ticks down, the board
    // fills back up while the half-built burger waits on the counter. Idle only up
    // to 152 seconds in, so the final walk still fits before the shift ends.
    idle(world, Math.max(0, 152 - world.state.elapsed), false);
    // Stage the rush itself (values an order genuinely reaches in play): three
    // tickets with the oldest nearly out of time, both hot stations mid-cook.
    const s = world.state;
    if (s.orders.length < ORDER.maxOpen) world.stageOrder('pasta', 45);
    if (s.orders.length > 0) {
      const oldest = s.orders.reduce((a, b) => (a.id < b.id ? a : b));
      oldest.patience = Math.min(oldest.patience, 9);
    }
    s.grill.busy = true;
    s.grill.progress = 2.5;
    s.grill.item = 'patty';
    s.pot.busy = true;
    s.pot.progress = 3;
    s.pot.item = 'pasta';
    for (let i = 0; i < 6; i += 1) {
      s.steam.push({ x: 1169 + (i % 2 === 0 ? -14 : 14), y: 168 - i * 6, life: 0.8, size: 9 });
    }
    runScript(world, [...goStation('fridge'), fridge('tomato')], 60);
    return { screen: SCREEN_PLAY, best: world.state.coins };
  }
  // start: the title screen over a kitchen that is already alive with orders.
  idle(world, 30, true);
  return { screen: SCREEN_TITLE, best: 0 };
}
