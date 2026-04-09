const PRESETS = {
  blur: {
    kind: "fragment",
    source: `precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform float uTime;
uniform vec2 uResolution;
// Jimenez 13-tap blur (COD: Advanced Warfare) — 2D footprint, no boxy artifacts.
// Increase 'radius' for stronger blur.
void main() {
  float radius = 4.0;
  vec2 t = radius / uResolution;
  vec4 A = texture2D(uTex, vUv + t * vec2(-1.0, -1.0));
  vec4 B = texture2D(uTex, vUv + t * vec2( 0.0, -1.0));
  vec4 C = texture2D(uTex, vUv + t * vec2( 1.0, -1.0));
  vec4 D = texture2D(uTex, vUv + t * vec2(-0.5, -0.5));
  vec4 E = texture2D(uTex, vUv + t * vec2( 0.5, -0.5));
  vec4 F = texture2D(uTex, vUv + t * vec2(-1.0,  0.0));
  vec4 G = texture2D(uTex, vUv);
  vec4 H = texture2D(uTex, vUv + t * vec2( 1.0,  0.0));
  vec4 I = texture2D(uTex, vUv + t * vec2(-0.5,  0.5));
  vec4 J = texture2D(uTex, vUv + t * vec2( 0.5,  0.5));
  vec4 K = texture2D(uTex, vUv + t * vec2(-1.0,  1.0));
  vec4 L = texture2D(uTex, vUv + t * vec2( 0.0,  1.0));
  vec4 M = texture2D(uTex, vUv + t * vec2( 1.0,  1.0));
  vec2 div = (1.0 / 4.0) * vec2(0.5, 0.125);
  vec4 o  = (D + E + I + J) * div.x;
       o += (A + B + F + G) * div.y;
       o += (B + C + G + H) * div.y;
       o += (F + G + K + L) * div.y;
       o += (G + H + L + M) * div.y;
  gl_FragColor = o;
}`,
  },
  swirl: {
    kind: "fragment",
    source: `precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform float uTime;
uniform vec2 uResolution;
void main() {
  vec2 uv = vUv - 0.5;
  uv.x *= uResolution.x / uResolution.y;
  float r = length(uv);
  float a = atan(uv.y, uv.x);
  float strength = 2.5;
  a += strength * exp(-r * 3.0) + uTime * 0.3;
  vec2 sUv = vec2(cos(a), sin(a)) * r;
  sUv.x *= uResolution.y / uResolution.x;
  sUv += 0.5;
  gl_FragColor = texture2D(uTex, sUv);
}`,
  },
  invert: {
    kind: "fragment",
    source: `precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform float uTime;
uniform vec2 uResolution;
void main() {
  vec4 c = texture2D(uTex, vUv);
  gl_FragColor = vec4(1.0 - c.rgb, c.a);
}`,
  },
  chromatic: {
    kind: "fragment",
    source: `precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform float uTime;
uniform vec2 uResolution;
void main() {
  float a = 0.005 * (1.0 + sin(uTime));
  float r = texture2D(uTex, vUv + vec2(a, 0.0)).r;
  float g = texture2D(uTex, vUv).g;
  float b = texture2D(uTex, vUv - vec2(a, 0.0)).b;
  gl_FragColor = vec4(r, g, b, 1.0);
}`,
  },
  wave: {
    kind: "fragment",
    source: `precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform float uTime;
uniform vec2 uResolution;
void main() {
  vec2 uv = vUv;
  uv.x += sin(uv.y * 30.0 + uTime * 2.0) * 0.005;
  gl_FragColor = texture2D(uTex, uv);
}`,
  },
  ascii: {
    kind: "fragment",
    source: `precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform float uTime;
uniform vec2 uResolution;
void main() {
  float px = 8.0;
  vec2 uv = floor(vUv * uResolution / px) * px / uResolution;
  gl_FragColor = texture2D(uTex, uv);
}`,
  },
  roll: {
    kind: "roll",
    source: `// Built-in 3D roll preset.
// This preset swaps the fullscreen fragment pass for a subdivided mesh.
// Use the slider below, then click Apply. If the effect is already active,
// the slider updates live while the popup stays open.
//
// Engine uniforms:
//   uProgress  0.0 = tightly rolled, 1.0 = flat page
//   uTex       live drawElement() page snapshot
//   uAspect    viewport aspect ratio
//   uRadius    outer curl radius
//   uThickness spiral thickness per turn`,
  },
};

const DEFAULT_PRESET = "blur";
const ROLL_DEFAULT_PROGRESS = 0.1;

const $ = (id) => document.getElementById(id);
const statusEl = $("status");
const shaderEl = $("shader");
const presetEl = $("preset");
const presetHintEl = $("preset_hint");
const rollControlsEl = $("roll_controls");
const rollProgressEl = $("roll_progress");
const rollProgressValueEl = $("roll_progress_value");
const editorEl = document.querySelector(".editor");
const hlEl = document.querySelector("#shader-hl code");

const appState = {
  appliedEngine: null,
};

const GLSL_KEYWORDS = new Set([
  "if",
  "else",
  "for",
  "while",
  "do",
  "return",
  "break",
  "continue",
  "discard",
  "in",
  "out",
  "inout",
  "const",
  "uniform",
  "varying",
  "attribute",
  "precision",
  "highp",
  "mediump",
  "lowp",
  "struct",
  "true",
  "false",
]);
const GLSL_TYPES = new Set([
  "void",
  "bool",
  "int",
  "uint",
  "float",
  "vec2",
  "vec3",
  "vec4",
  "ivec2",
  "ivec3",
  "ivec4",
  "uvec2",
  "uvec3",
  "uvec4",
  "bvec2",
  "bvec3",
  "bvec4",
  "mat2",
  "mat3",
  "mat4",
  "mat2x2",
  "mat2x3",
  "mat2x4",
  "mat3x2",
  "mat3x3",
  "mat3x4",
  "mat4x2",
  "mat4x3",
  "mat4x4",
  "sampler2D",
  "samplerCube",
  "sampler3D",
  "sampler2DArray",
]);
const GLSL_BUILTINS = new Set([
  "gl_FragColor",
  "gl_Position",
  "gl_FragCoord",
  "gl_PointCoord",
  "texture",
  "texture2D",
  "textureCube",
  "textureLod",
  "sin",
  "cos",
  "tan",
  "asin",
  "acos",
  "atan",
  "pow",
  "exp",
  "log",
  "exp2",
  "log2",
  "sqrt",
  "inversesqrt",
  "abs",
  "sign",
  "floor",
  "ceil",
  "fract",
  "mod",
  "min",
  "max",
  "clamp",
  "mix",
  "step",
  "smoothstep",
  "length",
  "distance",
  "dot",
  "cross",
  "normalize",
  "reflect",
  "refract",
  "any",
  "all",
  "not",
  "dFdx",
  "dFdy",
  "fwidth",
]);

function escHtml(s) {
  return s.replace(
    /[&<>]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]),
  );
}

function highlight(src) {
  const re =
    /(\/\/[^\n]*)|(\/\*[\s\S]*?\*\/)|(^[ \t]*#[^\n]*)|("(?:\\.|[^"\\])*")|(\b\d+\.?\d*(?:e[+-]?\d+)?\b)|([A-Za-z_][A-Za-z_0-9]*)|([\s\S])/gm;
  let out = "";
  src.replace(re, (m, com1, com2, pp, str, num, ident) => {
    if (com1 || com2) out += `<span class="tok-com">${escHtml(m)}</span>`;
    else if (pp) out += `<span class="tok-pp">${escHtml(m)}</span>`;
    else if (str) out += `<span class="tok-str">${escHtml(m)}</span>`;
    else if (num) out += `<span class="tok-num">${m}</span>`;
    else if (ident) {
      if (GLSL_KEYWORDS.has(ident))
        out += `<span class="tok-key">${ident}</span>`;
      else if (GLSL_TYPES.has(ident))
        out += `<span class="tok-type">${ident}</span>`;
      else if (GLSL_BUILTINS.has(ident))
        out += `<span class="tok-bi">${ident}</span>`;
      else out += ident;
    } else out += escHtml(m);
    return "";
  });
  return out + "\n";
}

function syncHighlight() {
  hlEl.innerHTML = highlight(shaderEl.value);
  hlEl.parentElement.scrollTop = shaderEl.scrollTop;
  hlEl.parentElement.scrollLeft = shaderEl.scrollLeft;
}

function getPreset() {
  return PRESETS[presetEl.value] || PRESETS[DEFAULT_PRESET];
}

function getRollProgress() {
  return clamp01(Number(rollProgressEl.value));
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function setStatus(message) {
  statusEl.textContent = message || "";
}

function setRollProgressLabel() {
  rollProgressValueEl.textContent = getRollProgress().toFixed(2);
}

function syncPresetUi() {
  const preset = getPreset();
  shaderEl.value = preset.source;
  shaderEl.readOnly = preset.kind !== "fragment";
  editorEl.classList.toggle("is-readonly", preset.kind !== "fragment");
  rollControlsEl.hidden = preset.kind !== "roll";
  presetHintEl.innerHTML =
    preset.kind === "roll"
      ? "Requires <code>chrome://flags/#canvas-draw-element</code>. This preset uses a built-in WebGL mesh pass with live <code>uProgress</code> control."
      : "Requires <code>chrome://flags/#canvas-draw-element</code>. Fragment presets expose <code>uTex</code>, <code>uTime</code>, <code>uResolution</code>, <code>vUv</code>.";
  syncHighlight();
}

function buildApplyConfig() {
  const preset = getPreset();
  return {
    engine: preset.kind,
    fragSrc: shaderEl.value,
    rollProgress: getRollProgress(),
  };
}

shaderEl.addEventListener("input", syncHighlight);
shaderEl.addEventListener("scroll", () => {
  hlEl.parentElement.scrollTop = shaderEl.scrollTop;
  hlEl.parentElement.scrollLeft = shaderEl.scrollLeft;
});
shaderEl.addEventListener("keydown", (e) => {
  if (shaderEl.readOnly) return;
  if (e.key === "Tab") {
    e.preventDefault();
    const start = shaderEl.selectionStart;
    const end = shaderEl.selectionEnd;
    shaderEl.value = `${shaderEl.value.slice(0, start)}  ${shaderEl.value.slice(
      end,
    )}`;
    shaderEl.selectionStart = shaderEl.selectionEnd = start + 2;
    syncHighlight();
  }
});

presetEl.value = DEFAULT_PRESET;
rollProgressEl.value = String(ROLL_DEFAULT_PROGRESS);
setRollProgressLabel();
syncPresetUi();

presetEl.addEventListener("change", () => {
  setStatus("");
  syncPresetUi();
});

rollProgressEl.addEventListener("input", async () => {
  setRollProgressLabel();
  if (getPreset().kind !== "roll" || appState.appliedEngine !== "roll") return;
  try {
    await inject(updateShaderConfigInPage, [
      { rollProgress: getRollProgress() },
    ]);
    setStatus("");
  } catch (e) {
    setStatus(String(e));
  }
});

async function inject(func, args = []) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func,
    args,
    world: "MAIN",
  });
}

$("apply").addEventListener("click", async () => {
  setStatus("");
  try {
    const config = buildApplyConfig();
    const res = await inject(applyShaderInPage, [config]);
    const err = res?.[0]?.result;
    if (err) {
      appState.appliedEngine = null;
      setStatus(err);
      return;
    }
    appState.appliedEngine = config.engine;
  } catch (e) {
    appState.appliedEngine = null;
    setStatus(String(e));
  }
});

$("remove").addEventListener("click", async () => {
  appState.appliedEngine = null;
  try {
    await inject(removeShaderInPage);
    setStatus("");
  } catch (e) {
    setStatus(String(e));
  }
});

function applyShaderInPage(rawConfig) {
  const ctx2dProto = CanvasRenderingContext2D.prototype;
  const hasDrawImage = "drawElementImage" in ctx2dProto;
  const hasDraw = "drawElement" in ctx2dProto;
  const hasPlace = "placeElement" in ctx2dProto;
  if (!hasDrawImage && !hasDraw && !hasPlace) {
    return "No drawElementImage/drawElement on CanvasRenderingContext2D. Enable chrome://flags/#canvas-draw-element and restart Chrome.";
  }

  function clampUnit(value) {
    if (!Number.isFinite(value)) return 0;
    return Math.min(1, Math.max(0, value));
  }

  function compileShader(gl, type, src) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader) || "Unknown compile error";
      gl.deleteShader(shader);
      throw new Error(message);
    }
    return shader;
  }

  function createProgram(gl, vsSrc, fsSrc) {
    const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const message = gl.getProgramInfoLog(program) || "Unknown link error";
      gl.deleteProgram(program);
      throw new Error(message);
    }
    return program;
  }

  function createSnapshotTexture(gl) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
  }

  function createPlaneGrid(xSegments, ySegments) {
    const positions = [];
    const uvs = [];
    const indices = [];

    for (let y = 0; y <= ySegments; y += 1) {
      const v = y / ySegments;
      const posY = 1 - v * 2;
      for (let x = 0; x <= xSegments; x += 1) {
        const u = x / xSegments;
        const posX = u * 2 - 1;
        positions.push(posX, posY);
        uvs.push(u, v);
      }
    }

    const stride = xSegments + 1;
    for (let y = 0; y < ySegments; y += 1) {
      for (let x = 0; x < xSegments; x += 1) {
        const a = y * stride + x;
        const b = a + 1;
        const c = a + stride;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }

    return {
      positions: new Float32Array(positions),
      uvs: new Float32Array(uvs),
      indices: new Uint16Array(indices),
    };
  }

  function createFragmentRenderer(gl, sourceCanvas, config) {
    const vsSrc = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  vUv.y = 1.0 - vUv.y;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

    const fsHeader = `#version 300 es
precision highp float;
out vec4 outColor;
#define gl_FragColor outColor
#define texture2D(s,uv) texture(s,uv)
#define varying in
#define attribute in
`;
    const fsSrc =
      fsHeader +
      config.fragSrc
        .replace(/^\s*precision[^;]*;/m, "")
        .replace(/^\s*varying[^\n]*\n/m, "in vec2 vUv;\n");

    const program = createProgram(gl, vsSrc, fsSrc);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );

    const aPos = gl.getAttribLocation(program, "aPos");
    const texture = createSnapshotTexture(gl);
    const uniforms = {
      uTex: gl.getUniformLocation(program, "uTex"),
      uTime: gl.getUniformLocation(program, "uTime"),
      uResolution: gl.getUniformLocation(program, "uResolution"),
    };

    return {
      resize() {},
      update() {},
      render(time, width, height) {
        gl.viewport(0, 0, width, height);
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(program);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          sourceCanvas,
        );

        gl.uniform1i(uniforms.uTex, 0);
        gl.uniform1f(uniforms.uTime, time);
        gl.uniform2f(uniforms.uResolution, width, height);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
      destroy() {
        gl.deleteTexture(texture);
        gl.deleteBuffer(buffer);
        gl.deleteProgram(program);
      },
    };
  }

  function createRollRenderer(gl, sourceCanvas, config) {
    const vsSrc = `#version 300 es
precision highp float;
in vec2 aPosition;
in vec2 aUv;
uniform float uProgress;
uniform float uTopAnchor;
uniform float uRadius;
uniform float uThickness;
uniform float uAspect;
uniform float uCameraDist;
uniform float uFovScale;
uniform float uNear;
uniform float uFar;
out vec2 vUv;
void main() {
  vUv = aUv;

  vec3 pos = vec3(aPosition, 0.0);
  float unrollAmount = clamp(uProgress, 0.0, 1.0) * 2.0;
  float d = uTopAnchor - pos.y;
  float rolledAmount = max(d - unrollAmount, 0.0);
  float angle = rolledAmount / uRadius;
  float r = max(uRadius - angle * uThickness, 0.01);
  float rollCenterY = uTopAnchor - unrollAmount;
  float rolledY = rollCenterY - sin(angle) * r;
  float rolledZ = cos(angle) * r - uRadius - 0.001;

  if (d > unrollAmount) {
    pos.y = rolledY;
    pos.z = -rolledZ;
  }

  pos.x *= uAspect;
  float viewZ = pos.z - uCameraDist;
  float clipX = pos.x * uFovScale / uAspect;
  float clipY = pos.y * uFovScale;
  float clipZ = ((uFar + uNear) / (uNear - uFar)) * viewZ + ((2.0 * uFar * uNear) / (uNear - uFar));

  gl_Position = vec4(clipX, clipY, clipZ, -viewZ);
}`;

    const fsSrc = `#version 300 es
precision highp float;
uniform sampler2D uTex;
in vec2 vUv;
out vec4 outColor;
void main() {
  vec4 texel = texture(uTex, vUv);
  float edgeFade = smoothstep(0.0, 0.12, vUv.x) * smoothstep(0.0, 0.12, 1.0 - vUv.x);
  float bottomFade = smoothstep(0.0, 0.3, vUv.y);
  float rolledPresence = 1.0 - smoothstep(0.22, 0.92, vUv.y);
  float coreShadow = edgeFade * bottomFade * rolledPresence;
  float spreadShadow = edgeFade * smoothstep(0.0, 0.55, vUv.y) * (1.0 - smoothstep(0.45, 1.0, vUv.y));
  float shadow = min(coreShadow * 0.28 + spreadShadow * 0.12, 0.34);
  vec3 shadowColor = vec3(0.0);
  outColor = vec4(mix(texel.rgb, shadowColor, shadow), texel.a);
}`;

    const program = createProgram(gl, vsSrc, fsSrc);
    const geometry = createPlaneGrid(1, 384);
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, geometry.positions, gl.STATIC_DRAW);

    const uvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, geometry.uvs, gl.STATIC_DRAW);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geometry.indices, gl.STATIC_DRAW);

    const texture = createSnapshotTexture(gl);
    const locations = {
      aPosition: gl.getAttribLocation(program, "aPosition"),
      aUv: gl.getAttribLocation(program, "aUv"),
      uTex: gl.getUniformLocation(program, "uTex"),
      uProgress: gl.getUniformLocation(program, "uProgress"),
      uTopAnchor: gl.getUniformLocation(program, "uTopAnchor"),
      uRadius: gl.getUniformLocation(program, "uRadius"),
      uThickness: gl.getUniformLocation(program, "uThickness"),
      uAspect: gl.getUniformLocation(program, "uAspect"),
      uCameraDist: gl.getUniformLocation(program, "uCameraDist"),
      uFovScale: gl.getUniformLocation(program, "uFovScale"),
      uNear: gl.getUniformLocation(program, "uNear"),
      uFar: gl.getUniformLocation(program, "uFar"),
    };

    const state = {
      width: 1,
      height: 1,
      progress: clampUnit(Number(config.rollProgress ?? 1)),
    };
    const near = 0.1;
    const far = 10;
    const fov = Math.PI / 4;
    const fovScale = 1 / Math.tan(fov / 2);
    const cameraDist = fovScale;

    return {
      resize(width, height) {
        state.width = width;
        state.height = height;
      },
      update(nextConfig) {
        if ("rollProgress" in nextConfig) {
          state.progress = clampUnit(Number(nextConfig.rollProgress));
        }
      },
      render(_time, width, height) {
        gl.viewport(0, 0, width, height);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.disable(gl.CULL_FACE);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(program);

        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.enableVertexAttribArray(locations.aPosition);
        gl.vertexAttribPointer(locations.aPosition, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
        gl.enableVertexAttribArray(locations.aUv);
        gl.vertexAttribPointer(locations.aUv, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          sourceCanvas,
        );

        gl.uniform1i(locations.uTex, 0);
        gl.uniform1f(locations.uProgress, state.progress);
        gl.uniform1f(locations.uTopAnchor, 1.0);
        gl.uniform1f(locations.uRadius, 0.08);
        gl.uniform1f(locations.uThickness, 0.003);
        gl.uniform1f(
          locations.uAspect,
          state.width / Math.max(state.height, 1),
        );
        gl.uniform1f(locations.uCameraDist, cameraDist);
        gl.uniform1f(locations.uFovScale, fovScale);
        gl.uniform1f(locations.uNear, near);
        gl.uniform1f(locations.uFar, far);
        gl.drawElements(
          gl.TRIANGLES,
          geometry.indices.length,
          gl.UNSIGNED_SHORT,
          0,
        );
      },
      destroy() {
        gl.deleteTexture(texture);
        gl.deleteBuffer(positionBuffer);
        gl.deleteBuffer(uvBuffer);
        gl.deleteBuffer(indexBuffer);
        gl.deleteProgram(program);
      },
    };
  }

  if (window.__htmlShaderStop) window.__htmlShaderStop();

  const config =
    typeof rawConfig === "string"
      ? { engine: "fragment", fragSrc: rawConfig, rollProgress: 1 }
      : {
          engine: rawConfig?.engine === "roll" ? "roll" : "fragment",
          fragSrc: String(rawConfig?.fragSrc || ""),
          rollProgress: clampUnit(Number(rawConfig?.rollProgress ?? 1)),
        };

  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.id = "__html_shader_source__";
  sourceCanvas.setAttribute("layoutsubtree", "");
  Object.assign(sourceCanvas.style, {
    position: "fixed",
    inset: "0",
    width: "100vw",
    height: "100vh",
    zIndex: "0",
    opacity: "1",
    pointerEvents: "auto",
    layoutSubtree: "layout",
  });
  sourceCanvas.style.setProperty("layout-subtree", "layout");

  const wrapper = document.createElement("div");
  wrapper.id = "__html_shader_wrapper__";
  Object.assign(wrapper.style, {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    overflow: "auto",
    pointerEvents: "auto",
    background: getComputedStyle(document.body).backgroundColor || "#fff",
  });

  const originalChildren = Array.from(document.body.childNodes);
  for (const node of originalChildren) wrapper.appendChild(node);
  sourceCanvas.appendChild(wrapper);
  document.body.appendChild(sourceCanvas);

  const occluder = document.createElement("div");
  occluder.id = "__html_shader_occluder__";
  Object.assign(occluder.style, {
    position: "fixed",
    inset: "0",
    zIndex: "2147483646",
    pointerEvents: "none",
    backgroundColor: "#fdf6e3",
    backgroundImage:
      "linear-gradient(rgba(120, 106, 80, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(120, 106, 80, 0.06) 1px, transparent 1px)",
    backgroundSize: "32px 32px",
    backgroundPosition: "-1px -1px",
  });
  document.body.appendChild(occluder);

  const canvas = document.createElement("canvas");
  canvas.id = "__html_shader_root__";
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width: "100vw",
    height: "100vh",
    pointerEvents: "none",
    zIndex: "2147483647",
  });
  document.body.appendChild(canvas);

  const scrollState = { left: wrapper.scrollLeft, top: wrapper.scrollTop };
  let restored = false;

  const restoreDom = () => {
    if (restored) return;
    restored = true;
    scrollState.left = wrapper.scrollLeft;
    scrollState.top = wrapper.scrollTop;
    for (const node of Array.from(wrapper.childNodes))
      document.body.appendChild(node);
    canvas.remove();
    occluder.remove();
    sourceCanvas.remove();
    window.scrollTo(scrollState.left, scrollState.top);
  };

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const sctx = sourceCanvas.getContext("2d");
  if (!sctx) {
    restoreDom();
    return "2D canvas unavailable";
  }

  const gl = canvas.getContext("webgl2", {
    premultipliedAlpha: true,
    alpha: true,
  });
  if (!gl) {
    restoreDom();
    return "WebGL2 unavailable";
  }

  let renderer;
  try {
    renderer =
      config.engine === "roll"
        ? createRollRenderer(gl, sourceCanvas, config)
        : createFragmentRenderer(gl, sourceCanvas, config);
  } catch (e) {
    restoreDom();
    return `Shader error: ${e.message}`;
  }

  const getRollScrollMetrics = () => {
    const maxScrollTop = Math.max(
      wrapper.scrollHeight - wrapper.clientHeight,
      1,
    );
    return { maxScrollTop };
  };

  const getRollProgressFromScroll = () => {
    const { maxScrollTop } = getRollScrollMetrics();
    const ratio = Math.min(Math.max(wrapper.scrollTop / maxScrollTop, 0), 1);
    return 0.1 + ratio * 0.9;
  };

  const syncRollFromScroll = () => {
    if (config.engine !== "roll") return;
    renderer.update({ rollProgress: getRollProgressFromScroll() });
  };

  const setScrollFromRollProgress = (progress) => {
    if (config.engine !== "roll") {
      renderer.update({ rollProgress: progress });
      return;
    }
    const clamped = Math.min(Math.max(Number(progress) || 0, 0), 1);
    const { maxScrollTop } = getRollScrollMetrics();
    const ratio = clamped <= 0.1 ? 0 : (clamped - 0.1) / 0.9;
    wrapper.scrollTop = ratio * maxScrollTop;
    renderer.update({ rollProgress: getRollProgressFromScroll() });
  };

  const resize = () => {
    const width = Math.floor(innerWidth * dpr);
    const height = Math.floor(innerHeight * dpr);
    canvas.width = width;
    canvas.height = height;
    sourceCanvas.width = width;
    sourceCanvas.height = height;
    renderer.resize(width, height);
    if (config.engine === "roll") {
      renderer.update({ rollProgress: getRollProgressFromScroll() });
    }
  };
  resize();
  addEventListener("resize", resize);

  setScrollFromRollProgress(config.rollProgress);

  const onWheel = (e) => {
    wrapper.scrollTop += e.deltaY;
    wrapper.scrollLeft += e.deltaX;
    syncRollFromScroll();
    e.preventDefault();
  };
  const onKey = (e) => {
    const step = 40;
    if (e.key === "ArrowDown") wrapper.scrollTop += step;
    else if (e.key === "ArrowUp") wrapper.scrollTop -= step;
    else if (e.key === "PageDown") wrapper.scrollTop += innerHeight * 0.9;
    else if (e.key === "PageUp") wrapper.scrollTop -= innerHeight * 0.9;
    else if (e.key === "Home") wrapper.scrollTop = 0;
    else if (e.key === "End") wrapper.scrollTop = wrapper.scrollHeight;
    else return;
    syncRollFromScroll();
    e.preventDefault();
  };
  addEventListener("wheel", onWheel, { passive: false });
  addEventListener("keydown", onKey);
  wrapper.addEventListener("scroll", syncRollFromScroll, { passive: true });

  const start = performance.now();
  let raf = 0;
  let stopped = false;
  let warmupFrames = 2;
  let snapshotMisses = 0;

  const isPaintRecordMiss = (error) =>
    error instanceof DOMException &&
    error.name === "InvalidStateError" &&
    typeof error.message === "string" &&
    error.message.includes("No cached paint record");

  const captureSnapshot = () => {
    sctx.clearRect(0, 0, sourceCanvas.width, sourceCanvas.height);

    if (sctx.drawElementImage) {
      try {
        sctx.drawElementImage(wrapper, 0, 0);
        snapshotMisses = 0;
        return true;
      } catch (error) {
        if (!isPaintRecordMiss(error) || !sctx.drawElement) throw error;
      }
    }

    if (sctx.drawElement) {
      try {
        sctx.drawElement(wrapper, 0, 0);
        snapshotMisses = 0;
        return true;
      } catch (error) {
        if (!isPaintRecordMiss(error)) throw error;
        snapshotMisses += 1;
        if (snapshotMisses <= 5) {
          console.warn(
            "[html-shader] paint record not ready yet, retrying",
            snapshotMisses,
          );
        }
        return false;
      }
    }

    return false;
  };

const stop = () => {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(raf);
    removeEventListener("resize", resize);
    removeEventListener("wheel", onWheel);
    removeEventListener("keydown", onKey);
    wrapper.removeEventListener("scroll", syncRollFromScroll);
    renderer.destroy();
    restoreDom();
    delete window.__htmlShaderStop;
    delete window.__htmlShaderUpdate;
  };

  const frame = () => {
    if (stopped) return;
    if (warmupFrames > 0) {
      warmupFrames -= 1;
      raf = requestAnimationFrame(frame);
      return;
    }

    try {
      if (!captureSnapshot()) {
        raf = requestAnimationFrame(frame);
        return;
      }
    } catch (e) {
      console.error("[html-shader] snapshot failed", e);
      stop();
      return;
    }

    renderer.render((performance.now() - start) / 1000, canvas.width, canvas.height);
    raf = requestAnimationFrame(frame);
  };

  window.__htmlShaderStop = stop;
  window.__htmlShaderUpdate = (nextConfig) => {
    if (!nextConfig) return;
    if ("rollProgress" in nextConfig) {
      setScrollFromRollProgress(nextConfig.rollProgress);
      return;
    }
    renderer.update(nextConfig);
  };
  raf = requestAnimationFrame(frame);
  return null;
}

function updateShaderConfigInPage(nextConfig) {
  if (window.__htmlShaderUpdate) window.__htmlShaderUpdate(nextConfig);
}

function removeShaderInPage() {
  if (window.__htmlShaderStop) window.__htmlShaderStop();
  const prev = document.getElementById("__html_shader_root__");
  if (prev) prev.remove();
}
