# MovMov

Canonical project folder: `/Users/essam/Playground/MovMov`.

## Play

From this folder, run:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open `index.html` directly to choose and play any of the six games with keyboard/touch controls. You can also use http://localhost:8000. Camera access depends on browser permissions and secure-context support; use localhost or HTTPS if the browser blocks it when opening a file directly.

## Games

- **Star Motion / نجوم الحركة** (`star-motion.html`): original 45-second game, with camera, keyboard, and touch controls. Arrow keys move; Space jumps.
- **Space Explorer / مستكشف الفضاء** (`space-explorer.html`): a 60-second flight. Collect crystals and complete movement missions. Arrows steer, W (or Up) boosts, S shields, Down shrinks the ship, and Space repairs. Hold an action until the mission bar fills. Touch buttons provide the same actions.

Space Explorer camera actions: move sideways to steer, raise both hands to boost, spread arms to shield, lower the body to shrink, and reach into a highlighted circle on the camera preview to repair. Stand upright with arms down for initial calibration; recalibrate after moving the camera or changing position. The game waits during calibration or lost body tracking. Pause with the pause button or Escape.

The camera starts only on request. Camera mode requires internet to load the pinned MediaPipe library and pose model. Camera tracking and gesture thresholds need testing on the actual device. Switching to the demo, finishing Space Explorer, or leaving it stops its camera stream.

## Files

- `index.html` — game selection home page.
- `star-motion.html` — original prototype with a link home; embedded original styles and game logic.
- `space-explorer.html` — Space Explorer game screen.
- `shared.css` — shared styling for the home and Space Explorer screens.
- `js/space-explorer.js` — flight, missions, controls, camera lifecycle, and rendering.
- `js/space-pose.js` — body gestures and repair reach detection.
- `AGENTS.md` — instructions for future updates.

Keep future MovMov changes in this canonical folder.

## Checks

Run `node tests/space-explorer.mjs` to check pose recognition, flight and mission behavior, tracking-loss pause, and navigation links. These use synthetic poses; they do not replace a live camera test.

## More mini-games

All six games are available from the home page. The four additional games share `js/mini-games.js` (screen and input), `js/mini-rules.js` (rules and extra gestures), and `js/motion-camera.js` (camera lifecycle and calibration).

- **Jungle Adventure** (`jungle-adventure.html`): collect fruit by steering, duck under branches, raise hands to cross logs, and spread arms for bridges. Arrow keys steer; W raises hands, S spreads arms, Down ducks. Missed obstacle poses cost one of three hearts.
- **Bubble Pop** (`bubble-pop.html`): move hands over bubbles to pop them. Special bubbles require raised arms, spread arms, or a squat. In demo mode, hold a bubble with mouse/touch, or move the cursor with arrows and hold Space. W/S/D activate special poses. No lost lives.
- **Superhero Training** (`superhero-training.html`): forward hand targets, blocking, leaning, and ducking. Space reaches forward, S blocks, Left/Right lean, Down ducks. No lost lives.
- **Animal Moves** (`animal-moves.html`): hold giraffe (W), bird (S), frog (Down), and flamingo (B) poses for 1.5 seconds. Camera flamingo detection requires visible knees. No lost lives.

All four pause their timer while calibrating or when tracking disappears, support pause/restart and touch buttons, and stop the camera when switching to demo, finishing, or leaving. Real camera gesture performance still needs device testing. Run `node tests/mini-games.mjs` for their automated checks.

## Browser scripts

The game pages load classic, self-contained scripts so all games start when opened directly from Finder as well as on localhost/HTTPS. Editable source modules remain in `js/`.

After editing source modules, run `python3 tools/build_browser.py` to regenerate `js/space-explorer.browser.js` and `js/mini-games.browser.js`. Run `python3 tools/build_browser.py --check` to detect stale browser scripts, and `node tests/browser-startup.mjs` to exercise the actual scripts used by all six game pages.

## Fullscreen interface

The home page uses six whole-card links: three columns on desktop, two on narrower screens. Every screen has a fullscreen button (shortcut F; Escape exits). Game stages resize to the available viewport while preserving their aspect ratio and pointer coordinates. Demo mode hides the camera rail; camera mode keeps a compact preview visible. Open “طريقة اللعب” for detailed instructions or “التحكم” to change camera/keyboard mode; either menu pauses active play. Resume with the pause button. `ux.css` and `js/experience.js` share this layout across all six games, including Star Motion.

## Illustrated pose guides

Each game has a “دليل الحركات” button opening its own illustrated sketch, with matching numbered Arabic instructions. Opening the popup pauses play; Escape or Close leaves it paused, while “رجوع للعبة” resumes it. Keyboard focus stays in the native dialog. “الكاميرا والتعليمات” opens the camera and text settings panel. Artwork is in `assets/pose-guides/`; the generation prompts and method are recorded there in `prompts.md`.

## GitHub Pages deployment

The workflow in `.github/workflows/pages.yml` checks all six games, builds `dist/`, and deploys it on pushes to `main` or a manual run. In repository Settings → Pages, select **GitHub Actions** as the source. The hosting URL is returned by the successful deployment; do not assume deployment is complete before that.

The intended custom domain is `movmov.me`; the static build includes its `CNAME` file. To attach it, first add `movmov.me` in Settings → Pages → Custom domain, then configure the DNS records GitHub specifies at the domain provider. Enable HTTPS once the certificate is ready. Keep asset links relative so the same release works under a repository path or at a custom domain. The current Sites hosting identity is retained in `.openai/hosting.json`.
