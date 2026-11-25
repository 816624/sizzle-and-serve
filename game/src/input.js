// Keyboard and pointer input. Held keys give a movement direction; one-shot presses
// (interact, pause, fridge numbers, clicks) are queued and taken once by the loop, so
// a press between two frames is never lost and never counted twice.
export const ACTION_INTERACT = 1;
export const ACTION_PAUSE = 2;
export const ACTION_CLICK = 4;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const INTERACT = new Set(['KeyE', 'Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const FRIDGE_KEYS = {
  Digit1: 'tomato', Digit2: 'lettuce', Digit3: 'cucumber', Digit4: 'onion',
  Digit5: 'patty', Digit6: 'pasta', Digit7: 'bun', Digit8: 'cheese',
};

export function createInput(target) {
  let up = false;
  let down = false;
  let left = false;
  let right = false;
  let run = false;
  let actions = 0;
  let fridgePick = null;
  let click = null;

  window.addEventListener('keydown', (event) => {
    if (UP.has(event.code)) up = true;
    else if (DOWN.has(event.code)) down = true;
    else if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') run = true;
    else if (INTERACT.has(event.code)) {
      if (!event.repeat) actions |= ACTION_INTERACT;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (FRIDGE_KEYS[event.code]) {
      if (!event.repeat) fridgePick = FRIDGE_KEYS[event.code];
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (UP.has(event.code)) up = false;
    else if (DOWN.has(event.code)) down = false;
    else if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
    else if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') run = false;
  });
  // A key released while the tab is hidden never sends keyup: let go of everything.
  window.addEventListener('blur', () => {
    up = false; down = false; left = false; right = false; run = false;
  });
  target.addEventListener('pointerdown', (event) => {
    actions |= ACTION_CLICK;
    click = { clientX: event.clientX, clientY: event.clientY };
  });

  return {
    /** The held movement direction, each component -1, 0 or 1. */
    move() {
      return { x: (right ? 1 : 0) - (left ? 1 : 0), y: (down ? 1 : 0) - (up ? 1 : 0), run };
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The fridge ingredient keyed since the last call, or null. */
    takeFridgePick() {
      const picked = fridgePick;
      fridgePick = null;
      return picked;
    },
    /** The click position since the last call, or null. */
    takeClick() {
      const taken = click;
      click = null;
      return taken;
    },
  };
}
