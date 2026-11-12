# Sweet Pop

Offline candy match-3 puzzle for Ubuntu Touch — 120 levels, 12 board shapes, 24 backgrounds, special candies, bonus for leftover moves, Easy/Normal/Hard, Arabic + English.
Tested on Fairphone 4, Ubuntu Touch 24.04-1.x (arm64).

## Build & install
```
pipx install clickable-ut
clickable build
clickable install
```
Try on desktop: `clickable desktop`

## Develop
- `www/` — the game (plain HTML/JS/canvas, no dependencies); `qml/` — Ubuntu Touch web view wrapper
- `node tests/core.test.js` — engine tests; `node tools/calibrate.js` — level difficulty calibration

## License
GPL-3.0-or-later — see [LICENSE](LICENSE).
