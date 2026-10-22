# MovMov V2 — Bounceverse

A free-to-host, static browser game inspired by colorful motion-controlled party games.

## What's new

- Console-style home screen and full-screen 2.5D arena.
- Three selectable original heroes: Alex, Luna, Momo.
- Choose the character once. The choice is saved on the device and is reused automatically for every round. Change it from the home menu.
- Star Chase is playable; Color Dash and Goal Keeper are marked **Coming soon** (not playable).
- Only one body movement is needed: lean or step **left/right**. No jumping or arm raises.
- Camera tracking uses MediaPipe Pose Landmarker; keyboard/touch fallback is available.
- Results, stars, lives, countdown, pause, sound toggle, best-score storage and playful animations.

## Folder structure

```text
MovMov/
  index.html
  styles.css
  app.js
  README.md
  assets/characters/alex.svg
  assets/characters/luna.svg
  assets/characters/momo.svg
```

## Run locally

From Terminal:

```bash
cd /Users/essam/Playground/MovMov
python3 -m http.server 8080
```

Then open **http://localhost:8080** in Chrome/Edge. Or deploy to Netlify via GitHub for an HTTPS URL.

## How to play

1. On first launch press **Let's Play**, choose a character, and confirm.
2. Pick **Star Chase**.
3. Click **Enable Camera**, grant permission and stand in the frame. When the game detects shoulders click **Start with Camera**.
4. Shift/lean left or right to catch yellow stars; avoid pink bumpers. Stay safely clear of furniture.
5. Or choose **Try with Keyboard** and use ←/→ (touch arrow controls on touchscreen).
6. At the end press **Play Again**. The same character is retained without a new selection.

**Privacy:** The application doesn't record or upload camera video to its own server. Pose inference runs locally in the browser using MediaPipe. The first camera run downloads MediaPipe code/wasm/model from third-party CDNs, requiring internet access. Review third-party policies before distributing more broadly.

## Netlify settings

The project is static and needs no build process. Link the GitHub repository, select the `main` branch, leave the build command empty, and publish `.` (repository root).

## Limitations

This is a 2.5D prototype, not a full 3D game engine. Pose-tracking quality depends on camera framing, lighting, browser/device performance, and movement distance. Camera-based play should be tested on your actual laptop and TV setup. The design has three characters with different visual styling, but identical gameplay mechanics. No account, multiplayer, or cloud score storage is included.

## Integration and deployment

The original six Arabic games remain available from `classic.html`, linked on the V2 home screen. Their documentation is in `CLASSIC.md`. V2 retains the supplied English interface.

The existing GitHub Pages workflow runs the V2 and classic tests, builds `dist/`, and deploys on pushes to `main`. The build includes V2 JavaScript, styles, all character SVGs, classic games and the existing `CNAME` for `movmov.me`. Netlify is optional; its settings above do not confirm that a site is connected or deployed.

Run checks:

```sh
python3 tools/build_browser.py --check
node tests/bounceverse.mjs
node tests/browser-startup.mjs
node tests/mini-games.mjs
node tests/space-explorer.mjs
python3 tools/build_static.py
```

Automated checks use simulated browser/camera inputs. Real camera tracking needs testing on the target device.
