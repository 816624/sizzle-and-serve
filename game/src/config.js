// Every tuning number, colour and station in one place. The kitchen is a fixed
// 1280x720 logical area; the renderer scales it to the window, so no rule below
// depends on the screen size.
export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** One shift lasts three minutes; the rush builds across it. */
export const SHIFT_SECONDS = 180;

export const CHEF = {
  radius: 22,
  speed: 250,
  runSpeed: 350,
  interactRange: 78,
};

/** Stations, in kitchen order. x/y/w/h are the counter bodies the chef walks around;
 * cx/cy is where the chef stands to use the station; ax/ay is the open-floor approach
 * point the chef steers to first, so no straight leg ever runs through a counter. */
export const STATIONS = {
  fridge: { id: 'fridge', name: 'Fridge', x: 36, y: 132, w: 150, h: 108, cx: 111, cy: 268, ax: 300, ay: 268, kind: 'fridge' },
  board: { id: 'board', name: 'Chopping Board', x: 36, y: 300, w: 150, h: 84, cx: 111, cy: 412, ax: 300, ay: 412, kind: 'board' },
  trash: { id: 'trash', name: 'Trash', x: 36, y: 560, w: 120, h: 92, cx: 96, cy: 540, ax: 300, ay: 540, kind: 'trash' },
  grill: { id: 'grill', name: 'Grill', x: 1094, y: 132, w: 150, h: 108, cx: 1169, cy: 268, ax: 980, ay: 268, kind: 'grill' },
  pot: { id: 'pot', name: 'Pot', x: 1094, y: 300, w: 150, h: 84, cx: 1169, cy: 412, ax: 980, ay: 412, kind: 'pot' },
  assembly: { id: 'assembly', name: 'Assembly Counter', x: 480, y: 576, w: 320, h: 84, cx: 640, cy: 556, ax: 640, ay: 500, kind: 'assembly' },
  window: { id: 'window', name: 'Serving Window', x: 900, y: 576, w: 344, h: 84, cx: 1072, cy: 556, ax: 1072, ay: 500, kind: 'window' },
};

/** Decorative top counters between the fridge and the grill, dressed with ingredients. */
export const TOP_COUNTERS = [
  { x: 236, y: 132, w: 220, h: 84 },
  { x: 506, y: 132, w: 268, h: 84 },
  { x: 824, y: 132, w: 220, h: 84 },
];

/** The walkable floor, inside the walls and clear of the counters. */
export const FLOOR = { x: 24, y: 116, w: 1232, h: 584 };

export const ORDER = {
  maxOpen: 3,
  firstAt: 2,
  /** Seconds between new orders: starts calm, ends in a rush. */
  intervalStart: 26,
  intervalEnd: 13,
  patienceStart: 85,
  patienceEnd: 62,
};

export const PROCESS = {
  chopSeconds: 3,
  grillSeconds: 5,
  grillBurnSeconds: 5,
  boilSeconds: 6,
};

export const PRICES = { salad: 14, burger: 18, pasta: 16, soup: 15 };
export const TIP_MAX = 8;

export const STARS = { one: 120, two: 260, three: 420 };

export const PALETTE = {
  backdrop: '#241a12',
  wall: '#f6e3c2',
  wallTrim: '#e8c99a',
  floor: '#c98d5f',
  floorTile: '#bd7f52',
  floorGrout: '#a96f45',
  counterWood: '#a9713f',
  counterWoodDark: '#8a5a30',
  counterTop: '#e9d8b8',
  steel: '#b9c2cc',
  steelDark: '#8d97a3',
  steelLight: '#dfe6ec',
  fridge: '#e8eef2',
  fridgeDark: '#c3cfd8',
  boardWood: '#d9b380',
  text: '#2e2118',
  textLight: '#fff8ec',
  muted: '#7a6a58',
  cream: '#fff6e3',
  paper: '#fffdf4',
  ticketRed: '#c0392b',
  gold: '#f2b705',
  coin: '#ffcf3d',
  green: '#4e9b47',
  greenLight: '#7cc46f',
  red: '#d64541',
  orange: '#e67e22',
  blue: '#3d7ea6',
  panel: 'rgba(46, 33, 24, 0.88)',
  panelSolid: '#3a2b1d',
  shadow: 'rgba(60, 35, 15, 0.25)',
};

export const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';
export const FONT_DISPLAY = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';

/** Where the best shift total is kept between visits (this browser only). */
export const BEST_KEY = 'sizzle-and-serve.best';
