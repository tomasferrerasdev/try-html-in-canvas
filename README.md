# try-html-in-canvas

A Chrome extension that snapshots the current web page using the **experimental [`drawElement()` Canvas API](https://github.com/WICG/html-in-canvas)** and renders it through a user-supplied **WebGL fragment shader** or a built-in **3D roll preset**.

You get a popup with a GLSL editor (syntax highlighted, with presets for blur, swirl, invert, chromatic aberration, wave, pixelate, textured HTML, displacement surface, plus a native roll effect), simple ShaderToy-style channels, and a live overlay on the active tab.

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
  - `sampler2D iChannel0..iChannel3` — ShaderToy-style inputs (HTML, image, video, or empty)
  - `vec3 iChannelResolution[4]` — per-channel dimensions
  - `vec2 vUv` — UV coordinate (0–1)
  - `float iTime` — seconds since Apply
  - `vec3 iResolution` — viewport size in device pixels
  - Legacy aliases still work: `uTex` -> `iChannel0`, `uTime` -> `iTime`, `uResolution` -> `iResolution.xy`
- The `Displacement Surface` preset expects:
  - `iChannel0` = HTML snapshot
  - `iChannel1` = heightmap / displacement image
  - `iChannel2` = normal map image
  - `iChannel3` = AO image
  - popup controls drive the material selector plus `uTileScale`, `uDisplacementStrength`, and `uNormalStrength`
  - bundled defaults live in `extension/assets/materials/brick-01` and `extension/assets/materials/brick-02`
- It deforms a subdivided page mesh in the vertex shader so the page reads as a displaced surface instead of a fullscreen post-process.
- The roll preset is not driven by the fragment editor. It uses a built-in vertex + fragment pipeline so the page can curl in 3D with correct depth and backface rendering.

## Caveats

- The experimental API is in flux; expect breakage between Chrome versions.
- Pages that depend on a real scrollable `<body>`, fixed positioning at the document root, or scripts walking `document.body.children` may misbehave while the shader is active.
- Cross-origin iframes inside the page can cause `drawElement()` to throw.

## License

MIT.
