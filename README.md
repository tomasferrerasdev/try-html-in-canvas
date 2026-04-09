# try-html-in-canvas

A Chrome extension that snapshots the current web page using the **experimental [`drawElement()` Canvas API](https://github.com/WICG/html-in-canvas)** and renders it through a user-supplied **WebGL fragment shader** or a built-in **3D roll preset**.

You get a popup with a GLSL editor (syntax highlighted, with presets for blur, swirl, invert, chromatic aberration, wave, pixelate, plus a native roll effect) and a live overlay on the active tab.

## Requirements

- **Google Chrome** with experimental web platform features enabled:
  1. Open `chrome://flags#enable-experimental-web-platform-features` `chrome://flags/#canvas-draw-element`
  2. Set it to **Enabled**
  3. Restart Chrome
- The `drawElement()` API is unshipped — without the flag the extension shows an error in the popup status bar.

## Run it locally (unpacked)

1. Clone the repo:
   ```sh
   git clone https://github.com/tomasferrerasdev/try-html-in-canvas.git
   cd try-html-in-canvas
   ```
2. Open `chrome://extensions` in Chrome.
3. Toggle **Developer mode** on (top-right).
4. Click **Load unpacked** and select the `extension/` folder from the cloned repo.
5. Pin the extension from the puzzle icon, then click its toolbar button on any page.
6. In the popup: pick a preset or edit the GLSL, hit **Apply**. The roll preset also exposes a progress slider. Hit **Remove** to tear it down.

## How it works

- `chrome.scripting.executeScript` injects an in-page function (in the `MAIN` world) that:
  1. Moves the page's `<body>` children into a wrapper that lives **inside a `<canvas layoutsubtree>`** — current Chrome only allows `drawElement()` on immediate children of the canvas.
  2. Each animation frame, calls `ctx.drawElement(wrapper)` to rasterize the live DOM into the source canvas.
  3. Uploads that canvas as a WebGL2 texture and renders either:
     - a fullscreen triangle using your fragment shader, or
     - a subdivided page mesh with a perspective vertex deformation for the built-in roll preset.
  4. Forwards wheel/keyboard scrolling into the wrapper, since the real document body is now empty.
- Your shader runs in WebGL2 with a GLSL ES 1.00 compatibility shim. Available uniforms:
  - `sampler2D uTex` — the page snapshot
  - `vec2 vUv` — UV coordinate (0–1)
  - `float uTime` — seconds since Apply
  - `vec2 uResolution` — canvas size in device pixels
- The roll preset is not driven by the fragment editor. It uses a built-in vertex + fragment pipeline so the page can curl in 3D with correct depth and backface rendering.

## Caveats

- The experimental API is in flux; expect breakage between Chrome versions.
- Pages that depend on a real scrollable `<body>`, fixed positioning at the document root, or scripts walking `document.body.children` may misbehave while the shader is active.
- Cross-origin iframes inside the page can cause `drawElement()` to throw.

## License

MIT.
