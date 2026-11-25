// The food: every ingredient, what it becomes at each station, and the four dishes
// on the menu. A dish is a list of finished items; a plate matches an order when it
// holds exactly those items, in any order.
export const INGREDIENTS = {
  tomato: { id: 'tomato', name: 'Tomato', choppable: true, chopped: 'tomatoChopped', colour: '#e23b2e', light: '#ff6b57' },
  lettuce: { id: 'lettuce', name: 'Lettuce', choppable: true, chopped: 'lettuceChopped', colour: '#5da244', light: '#8cc96e' },
  cucumber: { id: 'cucumber', name: 'Cucumber', choppable: true, chopped: 'cucumberChopped', colour: '#3f8f5f', light: '#6fbf8a' },
  onion: { id: 'onion', name: 'Onion', choppable: true, chopped: 'onionChopped', colour: '#b678c2', light: '#d3a2dd' },
  patty: { id: 'patty', name: 'Patty', grillable: true, grilled: 'pattyGrilled', colour: '#b0563a', light: '#cf7a58' },
  pasta: { id: 'pasta', name: 'Pasta', boilable: true, boiled: 'pastaBoiled', colour: '#f2c94c', light: '#f7dc7d' },
  bun: { id: 'bun', name: 'Bun', colour: '#e8a94f', light: '#f6c87e' },
  cheese: { id: 'cheese', name: 'Cheese', colour: '#f7b731', light: '#ffd25e' },
};

/** Finished items: what a chopped, grilled or boiled ingredient is called. */
export const FINISHED = {
  tomatoChopped: { id: 'tomatoChopped', name: 'Chopped Tomato', from: 'tomato', colour: '#e23b2e', light: '#ff6b57' },
  lettuceChopped: { id: 'lettuceChopped', name: 'Chopped Lettuce', from: 'lettuce', colour: '#5da244', light: '#8cc96e' },
  cucumberChopped: { id: 'cucumberChopped', name: 'Cucumber Slices', from: 'cucumber', colour: '#3f8f5f', light: '#6fbf8a' },
  onionChopped: { id: 'onionChopped', name: 'Chopped Onion', from: 'onion', colour: '#b678c2', light: '#d3a2dd' },
  pattyGrilled: { id: 'pattyGrilled', name: 'Grilled Patty', from: 'patty', colour: '#7a3b22', light: '#a35a34' },
  pastaBoiled: { id: 'pastaBoiled', name: 'Boiled Pasta', from: 'pasta', colour: '#f2c94c', light: '#f7dc7d' },
  burnt: { id: 'burnt', name: 'Burnt!', from: null, colour: '#2b2118', light: '#4a3826' },
};

/** Everything the chef can hold, raw or finished, by id. */
export function itemDef(id) {
  return INGREDIENTS[id] ?? FINISHED[id] ?? null;
}

export function itemName(id) {
  const def = itemDef(id);
  return def ? def.name : id;
}

/** The menu: four dishes, unlocked across the shift so the first orders are gentle. */
export const DISHES = {
  salad: {
    id: 'salad', name: 'Garden Salad', price: 14, unlockAt: 0,
    needs: ['lettuceChopped', 'tomatoChopped', 'cucumberChopped'],
    blurb: 'Crisp, fresh, no cooking at all',
  },
  burger: {
    id: 'burger', name: 'Classic Burger', price: 18, unlockAt: 20,
    needs: ['bun', 'pattyGrilled', 'lettuceChopped', 'tomatoChopped'],
    blurb: 'Grill the patty, stack it high',
  },
  pasta: {
    id: 'pasta', name: 'Pasta Pomodoro', price: 16, unlockAt: 55,
    needs: ['pastaBoiled', 'tomatoChopped', 'cheese'],
    blurb: 'Boil the pasta, toss it with tomato',
  },
  soup: {
    id: 'soup', name: 'Tomato Soup', price: 15, unlockAt: 95,
    needs: ['tomatoChopped', 'onionChopped', 'pastaBoiled'],
    blurb: 'Chop it, boil it, ladle it up',
  },
};

export const DISH_ORDER = ['salad', 'burger', 'pasta', 'soup'];

/** Dishes whose unlock time has passed at `elapsed` seconds into the shift. */
export function unlockedDishes(elapsed) {
  return DISH_ORDER.filter((id) => DISHES[id].unlockAt <= elapsed);
}

/** Does this plate hold exactly what `dish` asks for, no more and no less? */
export function plateMatchesDish(plateItems, dish) {
  if (plateItems.length !== dish.needs.length) return false;
  const wanted = [...dish.needs].sort();
  const held = [...plateItems].sort();
  return wanted.every((item, index) => item === held[index]);
}

/** How many of a dish's needs this plate already holds (for the ticket checklist). */
export function plateProgress(plateItems, dish) {
  const remaining = [...dish.needs];
  let done = 0;
  for (const item of plateItems) {
    const at = remaining.indexOf(item);
    if (at !== -1) {
      remaining.splice(at, 1);
      done += 1;
    }
  }
  return done;
}
