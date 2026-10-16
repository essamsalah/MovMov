# MovMov

Canonical project folder: `/Users/essam/Playground/MovMov`.

## Files

- `index.html` — original Star Motion kids game prototype, copied unchanged from `star_motion_kids.html` in the referenced ChatGPT conversation. Styles, game logic, and drawings are embedded in this file; no separate local assets are required.
- `AGENTS.md` — project instructions for future updates.

## Play

Open `index.html` in a modern browser. The Arabic interface includes a keyboard demo: use the left/right arrows to move and Space to jump. Touch controls are also included.

For camera use, serve this folder locally if direct file access does not work:

```sh
cd /Users/essam/Playground/MovMov
python3 -m http.server 8000 --bind 127.0.0.1
```

Then open http://localhost:8000 and select the camera start button. Camera mode requires camera permission and internet access to load the external MediaPipe library and pose model. Camera tracking needs verification on the actual device.

Keep all future MovMov changes in this folder. Preserve the original self-contained layout until a feature change warrants separating styles, scripts, or assets.
