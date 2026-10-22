# MovMov project instructions

- The canonical project folder is `/Users/essam/Playground/MovMov`.
- Make all future MovMov updates in this folder; do not create replacement project copies in generated chat folders.
- `index.html`, `app.js`, and `styles.css` are the V2 Bounceverse home and Star Chase game. `classic.html` is the original Arabic game selection home page. `star-motion.html` contains the original Star Motion prototype.
- Space Explorer lives in `space-explorer.html`, `js/space-explorer.js`, and `js/space-pose.js`; home and Space Explorer share `shared.css`.
- Preserve the Arabic interface, camera controls, and keyboard/touch alternatives unless the user requests changes.
- All six games must start when index.html is opened directly from Finder, and over localhost/HTTPS. Camera access may require localhost/HTTPS depending on the browser.
- Do not claim camera tracking has been verified without testing it on the device.

- Jungle Adventure, Bubble Pop, Superhero Training, and Animal Moves use separate HTML entry pages and share `js/mini-games.js`, `js/mini-rules.js`, and `js/motion-camera.js`. Keep their mechanics distinct and preserve camera/keyboard/touch alternatives.

- Pages load classic `.browser.js` bundles, not source ES modules. After editing `js/` source modules, run `python3 tools/build_browser.py` and verify with `python3 tools/build_browser.py --check` and `node tests/browser-startup.mjs`. Do not hand-edit generated browser scripts.

- Keep the classic home page as a compact whole-card grid (three columns on laptops, two on narrow screens). Shared fullscreen/stage layout is in `ux.css` and `js/experience.js`. Keep actual canvas dimensions proportional so touch/pointer coordinates stay accurate.

- V2 character selection is saved once and reused across rounds. Run `node tests/bounceverse.mjs` after V2 changes. Preserve the link to the six Arabic classic games. The static build must include root JavaScript and all assets, including character SVGs.
