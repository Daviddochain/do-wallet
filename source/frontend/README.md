# Do-Wallet Frontend Source

This folder is the new canonical source layer for the website frontend.

The deployed app we inherited is a static Webpack build plus many post-load patch scripts. This source tree keeps the current live behavior intact while moving those loose scripts into build-controlled inputs:

- `src/vendor/do-wallet-v2-main.js` is the inherited Webpack app bundle.
- `src/runtime/before-main` contains runtime modules that must execute before the inherited app bundle.
- `src/runtime/after-main` contains runtime modules that execute after the inherited app bundle.
- `src/styles` contains the CSS inputs, bundled in the order defined by `src/build-config.json`.
- `src/public` contains static root files and media copied into the generated frontend.

Run:

```sh
npm run build
```

The output is written directly to `../../current/frontend`. Do not edit generated files in `current/frontend` by hand; change `source/frontend/src`, then rebuild.

GitHub reference checked on 2026-06-24: `Daviddochain/do-wallet` exists but its frontend is also a static deployed build, not the original component source.
