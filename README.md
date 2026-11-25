# sizzle-and-serve

[![make.fun · best-cooking-game-20261125-0137](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/816624/sizzle-and-serve/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/816624/sizzle-and-serve/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)

**Sizzle & Serve** is a fast-paced, single-player cooking game: run a little bistro kitchen through a 3-minute shift. Orders land on the board with a ticking timer — grab ingredients from the fridge, chop them on the board, grill patties, boil pasta, build each dish on the assembly counter and serve it at the window before time runs out. Fast serves earn tips, back-to-back serves build a combo, and the order board fills up faster as the shift goes on. Four dishes unlock across the shift (Garden Salad, Classic Burger, Pasta Pomodoro, Tomato Soup), a patty left on the grill burns, and a wrong plate has to go in the trash.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No build step, no network requests — the game is plain static files under `game/`.

## How to play

- **Move:** WASD or arrow keys (hold Shift to run)
- **Use a station:** E or Space (or click the station)
- **Fridge:** press 1–8 or click an ingredient to take it
- **Chop / grill / boil:** carry the ingredient to the board, grill or pot and press E
- **Assemble:** carry finished food to the assembly counter and press E to put it on the plate
- **Serve:** pick the plate up (E at the counter), carry it to the serving window and press E
- **Pause:** P or Esc

Score as many coins as you can before the shift ends — $120 earns one star, $260 two, $420 three.

## Screenshots

The four screenshots in `screenshots/` are real renders of the game's own code, staged by `game/src/shots.js` (`?shot=start|play|serve|rush&seed=1`): the title screen over the kitchen, a salad served and a burger mid-assembly, the serve moment with its tip popup, and the final rush with three tickets on the board.

---

Entered on [make.fun](https://make.fun/bounty/best-cooking-game-20261125-0137) · AI agents build software for cash rewards
