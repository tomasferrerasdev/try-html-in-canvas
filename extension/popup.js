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
  textured: {
    kind: "fragment",
    source: `precision highp float;
varying vec2 vUv;
void main() {
  vec4 base = texture2D(iChannel0, vUv);
  vec4 detail = texture2D(iChannel1, vUv * 2.0);
  float hasDetail = step(2.5, iChannelResolution[1].x + iChannelResolution[1].y);
  vec3 lit = mix(base.rgb, base.rgb * mix(vec3(1.0), detail.rgb, 0.65), hasDetail);
  gl_FragColor = vec4(lit, base.a);
}`,
  },
  relief: {
    kind: "surface",
    source: `// Relief Surface
// iChannel0 = HTML snapshot
// iChannel1 = displacement / height
// iChannel2 = normal
// iChannel3 = AO
//
// vertex stage
//   materialUv = uv * uTileScale
//   height = texture(iChannel1, materialUv).r
//   position.z += (height - 0.5) * uDisplacementStrength
//
// fragment stage
//   baseColor = texture(iChannel0, uv)
//   detailNormal = texture(iChannel2, materialUv).xyz * 2.0 - 1.0
//   ao = texture(iChannel3, materialUv).r
//   shade HTML with normal + AO while preserving base color`,
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
const RELIEF_DEFAULT_MATERIAL = "brick-01";
const RELIEF_DEFAULT_TILE_SCALE = 4;
const RELIEF_DEFAULT_DISPLACEMENT = 0.2;
const RELIEF_DEFAULT_NORMAL = 1;
const CHANNEL_COUNT = 4;

const $ = (id) => document.getElementById(id);
const statusEl = $("status");
const shaderEl = $("shader");
const presetEl = $("preset");
const presetHintEl = $("preset_hint");
const channelListEl = $("channel_list");
const reliefControlsEl = $("relief_controls");
const reliefMaterialEl = $("relief_material");
const reliefTileScaleEl = $("relief_tile_scale");
const reliefTileScaleValueEl = $("relief_tile_scale_value");
const reliefDisplacementEl = $("relief_displacement");
const reliefDisplacementValueEl = $("relief_displacement_value");
const reliefNormalEl = $("relief_normal");
const reliefNormalValueEl = $("relief_normal_value");
const rollControlsEl = $("roll_controls");
const rollProgressEl = $("roll_progress");
const rollProgressValueEl = $("roll_progress_value");
const editorEl = document.querySelector(".editor");
const hlEl = document.querySelector("#shader-hl code");
const channelControls = [];

const appState = {
  appliedEngine: null,
};
const presetAssetCache = new Map();

const RELIEF_MATERIALS = {
  "brick-01": {
    label: "Brick 01",
    height: "assets/materials/brick-01/displacement.jpg",
    normal: "assets/materials/brick-01/normal-gl.jpg",
    ao: "assets/materials/brick-01/ao.jpg",
  },
  "brick-02": {
    label: "Brick 02",
    height: "assets/materials/brick-02/displacement.jpg",
    normal: "assets/materials/brick-02/normal-gl.jpg",
    ao: "assets/materials/brick-02/ao.jpg",
  },
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

function getReliefTileScale() {
  return Math.max(0.25, Number(reliefTileScaleEl.value) || RELIEF_DEFAULT_TILE_SCALE);
}

function getReliefDisplacement() {
  return Math.max(0, Number(reliefDisplacementEl.value) || 0);
}

function getReliefNormal() {
  return Math.max(0, Number(reliefNormalEl.value) || 0);
}

function setReliefLabels() {
  reliefTileScaleValueEl.textContent = getReliefTileScale().toFixed(2);
  reliefDisplacementValueEl.textContent = getReliefDisplacement().toFixed(2);
  reliefNormalValueEl.textContent = getReliefNormal().toFixed(2);
}

function syncPresetUi() {
  const preset = getPreset();
  shaderEl.value = preset.source;
  shaderEl.readOnly = preset.kind !== "fragment";
  editorEl.classList.toggle("is-readonly", preset.kind !== "fragment");
  reliefControlsEl.hidden = presetEl.value !== "relief";
  rollControlsEl.hidden = preset.kind !== "roll";
  presetHintEl.innerHTML =
    preset.kind === "roll"
      ? "Requires <code>chrome://flags/#canvas-draw-element</code>. This preset uses a built-in WebGL mesh pass with live <code>uProgress</code> control."
      : presetEl.value === "relief"
        ? "Requires <code>chrome://flags/#canvas-draw-element</code>. Relief Surface deforms a subdivided page mesh with <code>iChannel1</code> displacement, then shades it with <code>iChannel2</code> normal and <code>iChannel3</code> AO. Controls below are scoped to this surface experiment."
      : "Requires <code>chrome://flags/#canvas-draw-element</code>. Fragment presets expose <code>iChannel0..3</code>, <code>iChannelResolution</code>, <code>iTime</code>, <code>iResolution</code>, <code>vUv</code>. Legacy <code>uTex</code>, <code>uTime</code>, <code>uResolution</code> still work.";
  syncHighlight();
  refreshAllChannelCards();
}

function renderChannelControls() {
  channelListEl.innerHTML = Array.from({ length: CHANNEL_COUNT }, (_, index) => {
    return `<div class="channel-card">
      <div class="channel-head">
        <h2>Channel ${index}</h2>
        <button type="button" class="channel-clear" data-channel-clear="${index}" hidden>X</button>
      </div>
      <button type="button" class="channel-preview is-empty" data-channel-preview="${index}">
        <span class="channel-preview-badge" data-channel-badge="${index}">Upload</span>
        <span class="channel-preview-label" data-channel-preview-label="${index}">Upload</span>
      </button>
      <div class="channel-meta">
        <div class="channel-name" data-channel-name="${index}">No source</div>
        <div class="channel-detail" data-channel-detail="${index}">Pick a type and load a source</div>
      </div>
      <input data-channel-file="${index}" class="channel-file" type="file" hidden />
    </div>`;
  }).join("");

  channelControls.length = 0;
  for (let index = 0; index < CHANNEL_COUNT; index += 1) {
    const fileInput = channelListEl.querySelector(`[data-channel-file="${index}"]`);
    const previewButton = channelListEl.querySelector(`[data-channel-preview="${index}"]`);
    const previewBadge = channelListEl.querySelector(`[data-channel-badge="${index}"]`);
    const previewLabel = channelListEl.querySelector(`[data-channel-preview-label="${index}"]`);
    const nameEl = channelListEl.querySelector(`[data-channel-name="${index}"]`);
    const detailEl = channelListEl.querySelector(`[data-channel-detail="${index}"]`);
    const clearButton = channelListEl.querySelector(`[data-channel-clear="${index}"]`);
    const control = {
      fileInput,
      previewButton,
      previewBadge,
      previewLabel,
      nameEl,
      detailEl,
      clearButton,
      suppressDefault: false,
      objectUrl: null,
    };
    fileInput.addEventListener("change", () => {
      control.suppressDefault = false;
      updateChannelCard(control, index);
    });
    previewButton.addEventListener("click", () => {
      if (index > 0) {
        fileInput.click();
      }
    });
    clearButton.addEventListener("click", () => {
      if (control.objectUrl) {
        URL.revokeObjectURL(control.objectUrl);
        control.objectUrl = null;
      }
      fileInput.value = "";
      control.suppressDefault = true;
      updateChannelCard(control, index);
    });
    fileInput.accept = "image/*";
    channelControls.push(control);
  }
  refreshAllChannelCards();
}

function applyReliefChannelDefaults() {
  if (presetEl.value !== "relief") return;
  for (let index = 0; index < channelControls.length; index += 1) {
    channelControls[index].suppressDefault = false;
    updateChannelCard(channelControls[index], index);
  }
}

function getAssetFileName(path) {
  return String(path || "").split("/").pop() || "asset";
}

function getReliefDefaultAsset(index) {
  if (presetEl.value !== "relief" || index === 0) return null;
  const materialKey = reliefMaterialEl.value || RELIEF_DEFAULT_MATERIAL;
  const material = RELIEF_MATERIALS[materialKey] || RELIEF_MATERIALS[RELIEF_DEFAULT_MATERIAL];
  const path =
    index === 1 ? material.height : index === 2 ? material.normal : index === 3 ? material.ao : null;
  if (!path) return null;
  return {
    materialKey,
    path,
    url: chrome.runtime.getURL(path),
    fileName: getAssetFileName(path),
  };
}

function resolveChannelCardState(control, index) {
  const file = control.fileInput.files?.[0] || null;
  const defaultAsset =
    index > 0 && !control.suppressDefault ? getReliefDefaultAsset(index) : null;

  if (index === 0) {
    return {
      mode: "html",
      badge: "HTML",
      previewLabel: "Live page",
      name: "HTML snapshot",
      detail: "Uses the current page as iChannel0",
      previewUrl: null,
      clearable: false,
    };
  }

  if (file) {
    return {
      mode: "image",
      badge: "Image",
      previewLabel: file.name,
      name: file.name,
      detail: "Uploaded image",
      previewUrl: control.objectUrl || URL.createObjectURL(file),
      clearable: true,
    };
  }
  if (defaultAsset) {
    return {
      mode: "image",
      badge: "Default",
      previewLabel: defaultAsset.fileName,
      name: defaultAsset.fileName,
      detail: `${defaultAsset.materialKey} default`,
      previewUrl: defaultAsset.url,
      clearable: true,
    };
  }
  return {
    mode: "empty",
    badge: "Upload",
    previewLabel: "Upload",
    name: "No image",
    detail: "Click to load an image",
    previewUrl: null,
    clearable: false,
  };
}

function updateChannelCard(control, index) {
  const state = resolveChannelCardState(control, index);
  const nextObjectUrl =
    state.mode === "image" && control.fileInput.files?.[0] ? state.previewUrl : null;
  if (control.objectUrl && control.objectUrl !== nextObjectUrl) {
    URL.revokeObjectURL(control.objectUrl);
  }
  control.objectUrl = nextObjectUrl;

  control.previewButton.classList.toggle("is-empty", state.mode === "empty");
  control.previewButton.classList.toggle("is-html", state.mode === "html");
  control.previewButton.classList.toggle("is-video", state.mode === "video");
  control.previewButton.style.backgroundImage = state.previewUrl
    ? `linear-gradient(rgba(0,0,0,0.08), rgba(0,0,0,0.2)), url("${state.previewUrl}")`
    : "none";
  control.previewBadge.textContent = state.badge;
  control.previewLabel.textContent = state.previewLabel;
  control.nameEl.textContent = state.name;
  control.detailEl.textContent = state.detail;
  control.clearButton.hidden = !state.clearable;
}

function refreshAllChannelCards() {
  for (let index = 0; index < channelControls.length; index += 1) {
    updateChannelCard(channelControls[index], index);
  }
}

async function getAssetAsDataUrl(relativePath) {
  const assetUrl = chrome.runtime.getURL(relativePath);
  if (presetAssetCache.has(assetUrl)) return presetAssetCache.get(assetUrl);
  const promise = fetch(assetUrl)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load preset asset: ${relativePath}`);
      }
      return response.blob();
    })
    .then(
      (blob) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = () => reject(reader.error || new Error("Failed to read preset asset"));
          reader.readAsDataURL(blob);
        }),
    );
  presetAssetCache.set(assetUrl, promise);
  return promise;
}

async function getReliefDefaultChannels() {
  const material =
    RELIEF_MATERIALS[reliefMaterialEl.value] ||
    RELIEF_MATERIALS[RELIEF_DEFAULT_MATERIAL];

  const [heightSrc, normalSrc, aoSrc] = await Promise.all([
    getAssetAsDataUrl(material.height),
    getAssetAsDataUrl(material.normal),
    getAssetAsDataUrl(material.ao),
  ]);

  return [
    { id: 1, type: "image", name: `${reliefMaterialEl.value}-height`, src: heightSrc, wrap: "repeat" },
    { id: 2, type: "image", name: `${reliefMaterialEl.value}-normal`, src: normalSrc, wrap: "repeat" },
    { id: 3, type: "image", name: `${reliefMaterialEl.value}-ao`, src: aoSrc, wrap: "repeat" },
  ];
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

async function buildChannelConfig(control, index) {
  if (index === 0) return { id: index, type: "html" };

  const file = control.fileInput.files?.[0];
  if (!file) {
    if (
      presetEl.value === "relief" &&
      index > 0 &&
      !control.suppressDefault
    ) {
      return { id: index, type: "image", wrap: "repeat" };
    }
    return { id: index, type: "empty" };
  }

  return {
    id: index,
    type: "image",
    name: file.name,
    mimeType: file.type,
    wrap: presetEl.value === "relief" && index > 0 ? "repeat" : "clamp",
    src: await readFileAsDataUrl(file),
  };
}

async function buildApplyConfig() {
  const preset = getPreset();
  const channels = await Promise.all(
    channelControls.map((control, index) => buildChannelConfig(control, index)),
  );

  if (presetEl.value === "relief") {
    const defaults = await getReliefDefaultChannels();
    for (const channel of defaults) {
      const existing = channels[channel.id];
      const hasCustomFile = channelControls[channel.id].fileInput.files?.length;
      if (!hasCustomFile && existing?.type === "image") {
        channels[channel.id] = channel;
      }
    }
  }

  return {
    engine: preset.kind,
    fragSrc: shaderEl.value,
    rollProgress: getRollProgress(),
    reliefTileScale: getReliefTileScale(),
    reliefDisplacementStrength: getReliefDisplacement(),
    reliefNormalStrength: getReliefNormal(),
    channels,
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
reliefMaterialEl.value = RELIEF_DEFAULT_MATERIAL;
reliefTileScaleEl.value = String(RELIEF_DEFAULT_TILE_SCALE);
reliefDisplacementEl.value = String(RELIEF_DEFAULT_DISPLACEMENT);
reliefNormalEl.value = String(RELIEF_DEFAULT_NORMAL);
renderChannelControls();
setRollProgressLabel();
setReliefLabels();
syncPresetUi();

presetEl.addEventListener("change", () => {
  setStatus("");
  applyReliefChannelDefaults();
  syncPresetUi();
});

reliefMaterialEl.addEventListener("change", () => {
  if (presetEl.value !== "relief") return;
  for (let index = 1; index < channelControls.length; index += 1) {
    if (!channelControls[index].fileInput.files?.length) {
      channelControls[index].suppressDefault = false;
    }
  }
  refreshAllChannelCards();
  setStatus(appState.appliedEngine === "surface" ? "Click Apply to load the selected default material." : "");
});

reliefTileScaleEl.addEventListener("input", async () => {
  setReliefLabels();
  if (presetEl.value !== "relief" || appState.appliedEngine !== "surface") return;
  try {
    await inject(updateShaderConfigInPage, [{ reliefTileScale: getReliefTileScale() }]);
    setStatus("");
  } catch (e) {
    setStatus(String(e));
  }
});

reliefDisplacementEl.addEventListener("input", async () => {
  setReliefLabels();
  if (presetEl.value !== "relief" || appState.appliedEngine !== "surface") return;
  try {
    await inject(updateShaderConfigInPage, [
      { reliefDisplacementStrength: getReliefDisplacement() },
    ]);
    setStatus("");
  } catch (e) {
    setStatus(String(e));
  }
});

reliefNormalEl.addEventListener("input", async () => {
  setReliefLabels();
  if (presetEl.value !== "relief" || appState.appliedEngine !== "surface") return;
  try {
    await inject(updateShaderConfigInPage, [{ reliefNormalStrength: getReliefNormal() }]);
    setStatus("");
  } catch (e) {
    setStatus(String(e));
  }
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
    const config = await buildApplyConfig();
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

async function applyShaderInPage(rawConfig) {
  const ctx2dProto = CanvasRenderingContext2D.prototype;
  const hasDrawImage = "drawElementImage" in ctx2dProto;
  const hasDraw = "drawElement" in ctx2dProto;
  const hasPlace = "placeElement" in ctx2dProto;
  const CHANNEL_COUNT = 4;
  const DEFAULT_RELIEF_TILE_SCALE = 4;
  const DEFAULT_RELIEF_DISPLACEMENT = 0.2;
  const DEFAULT_RELIEF_NORMAL = 1;
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

  function createTexture(gl, options = {}) {
    const wrapMode = options.wrapMode === "repeat" ? gl.REPEAT : gl.CLAMP_TO_EDGE;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapMode);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapMode);
    return texture;
  }

  async function createChannelSource(channelConfig, sourceCanvas) {
    const config = channelConfig || { type: "empty" };

    if (config.type === "html") {
      return {
        dynamic: true,
        wrapMode: "clamp",
        upload(gl, texture) {
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            sourceCanvas,
          );
        },
        getResolution() {
          return [sourceCanvas.width, sourceCanvas.height, 1];
        },
        destroy() {},
      };
    }

    if (config.type === "image") {
      const image = new Image();
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error(`Failed to load image: ${config.name || "asset"}`));
        image.src = config.src;
      });

      let uploaded = false;
      return {
        dynamic: false,
        wrapMode: config.wrap === "repeat" ? "repeat" : "clamp",
        upload(gl, texture) {
          if (uploaded) return;
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            image,
          );
          uploaded = true;
        },
        getResolution() {
          return [image.naturalWidth || image.width || 1, image.naturalHeight || image.height || 1, 1];
        },
        destroy() {
          image.src = "";
        },
      };
    }

    if (config.type === "video") {
      const video = document.createElement("video");
      video.muted = true;
      video.loop = true;
      video.autoplay = true;
      video.playsInline = true;
      video.src = config.src;

      await new Promise((resolve, reject) => {
        const onLoaded = () => {
          cleanup();
          resolve();
        };
        const onError = () => {
          cleanup();
          reject(new Error(`Failed to load video: ${config.name || "asset"}`));
        };
        const cleanup = () => {
          video.removeEventListener("loadeddata", onLoaded);
          video.removeEventListener("error", onError);
        };
        video.addEventListener("loadeddata", onLoaded);
        video.addEventListener("error", onError);
      });

      try {
        await video.play();
      } catch (_error) {
        // Some Canary builds may still block autoplay; loaded frames remain usable.
      }

      return {
        dynamic: true,
        wrapMode: config.wrap === "repeat" ? "repeat" : "clamp",
        upload(gl, texture) {
          if (video.readyState < 2) return;
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            video,
          );
        },
        getResolution() {
          return [video.videoWidth || 1, video.videoHeight || 1, 1];
        },
        destroy() {
          video.pause();
          video.removeAttribute("src");
          video.load();
        },
      };
    }

    const emptyPixel = new Uint8Array([0, 0, 0, 0]);
    let uploaded = false;
    return {
      dynamic: false,
      wrapMode: "clamp",
      upload(gl, texture) {
        if (uploaded) return;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          1,
          1,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          emptyPixel,
        );
        uploaded = true;
      },
      getResolution() {
        return [1, 1, 1];
      },
      destroy() {},
    };
  }

  async function createChannelSources(channelConfigs, sourceCanvas) {
    const configs = Array.isArray(channelConfigs) ? channelConfigs : [];
    const sources = [];
    for (let index = 0; index < CHANNEL_COUNT; index += 1) {
      const source = await createChannelSource(configs[index], sourceCanvas);
      sources.push(source);
    }
    return sources;
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

  function createFragmentRenderer(gl, channelSources, config) {
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
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;
uniform sampler2D iChannel2;
uniform sampler2D iChannel3;
uniform vec3 iChannelResolution[4];
uniform float iTime;
uniform vec3 iResolution;
out vec4 outColor;
#define gl_FragColor outColor
#define texture2D(s,uv) texture(s,uv)
#define varying in
#define attribute in
#define uTex iChannel0
#define uTime iTime
#define uResolution iResolution.xy
`;
    const fsBody = config.fragSrc
      .replace(/^\s*precision[^;]*;/gm, "")
      .replace(/^\s*varying[^\n]*\n/gm, "")
      .replace(/^\s*in\s+vec2\s+vUv\s*;\s*$/gm, "")
      .replace(/^\s*uniform\s+sampler2D\s+uTex\s*;\s*$/gm, "")
      .replace(/^\s*uniform\s+float\s+uTime\s*;\s*$/gm, "")
      .replace(/^\s*uniform\s+vec2\s+uResolution\s*;\s*$/gm, "")
      .replace(/^\s*uniform\s+sampler2D\s+iChannel[0-3]\s*;\s*$/gm, "")
      .replace(/^\s*uniform\s+float\s+iTime\s*;\s*$/gm, "")
      .replace(/^\s*uniform\s+vec3\s+iResolution\s*;\s*$/gm, "")
      .replace(/^\s*uniform\s+vec3\s+iChannelResolution\s*\[\s*4\s*\]\s*;\s*$/gm, "");
    const fsSrc = fsHeader + "in vec2 vUv;\n" + fsBody;

    const program = createProgram(gl, vsSrc, fsSrc);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );

    const aPos = gl.getAttribLocation(program, "aPos");
    const uniforms = {
      iTime: gl.getUniformLocation(program, "iTime"),
      iResolution: gl.getUniformLocation(program, "iResolution"),
      iChannelResolution: gl.getUniformLocation(program, "iChannelResolution"),
      iChannels: Array.from({ length: 4 }, (_, index) =>
        gl.getUniformLocation(program, `iChannel${index}`),
      ),
    };
    const textures = channelSources.map((source) =>
      createTexture(gl, { wrapMode: source.wrapMode }),
    );

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

        const channelResolutions = [];
        for (let index = 0; index < textures.length; index += 1) {
          const source = channelSources[index];
          gl.activeTexture(gl.TEXTURE0 + index);
          source.upload(gl, textures[index]);
          gl.uniform1i(uniforms.iChannels[index], index);
          channelResolutions.push(...source.getResolution());
        }

        gl.uniform1f(uniforms.iTime, time);
        gl.uniform3f(uniforms.iResolution, width, height, 1);
        gl.uniform3fv(uniforms.iChannelResolution, new Float32Array(channelResolutions));
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
      destroy() {
        for (const texture of textures) gl.deleteTexture(texture);
        for (const source of channelSources) source.destroy();
        gl.deleteBuffer(buffer);
        gl.deleteProgram(program);
      },
    };
  }

  function createSurfaceReliefRenderer(gl, channelSources, config) {
    const vsSrc = `#version 300 es
precision highp float;
in vec2 aPosition;
in vec2 aUv;
uniform sampler2D iChannel1;
uniform float uTileScale;
uniform float uDisplacementStrength;
uniform vec2 uMaterialScroll;
uniform float uAspect;
uniform float uCameraDist;
uniform float uFovScale;
uniform float uNear;
uniform float uFar;
out vec2 vUv;
out vec2 vMaterialUv;
out float vHeight;
void main() {
  vUv = aUv;
  vMaterialUv = (aUv + uMaterialScroll) * uTileScale;
  float height = texture(iChannel1, vMaterialUv).r;
  vHeight = height;

  vec3 pos = vec3(aPosition, 0.0);
  pos.z = (height - 0.5) * uDisplacementStrength;
  pos.x *= uAspect;

  float viewZ = pos.z - uCameraDist;
  float clipX = pos.x * uFovScale / uAspect;
  float clipY = pos.y * uFovScale;
  float clipZ = ((uFar + uNear) / (uNear - uFar)) * viewZ + ((2.0 * uFar * uNear) / (uNear - uFar));
  gl_Position = vec4(clipX, clipY, clipZ, -viewZ);
}`;

    const fsSrc = `#version 300 es
precision highp float;
uniform sampler2D iChannel0;
uniform sampler2D iChannel2;
uniform sampler2D iChannel3;
uniform float uNormalStrength;
in vec2 vUv;
in vec2 vMaterialUv;
in float vHeight;
out vec4 outColor;
void main() {
  vec4 base = texture(iChannel0, vUv);
  vec3 tangentNormal = texture(iChannel2, vMaterialUv).xyz * 2.0 - 1.0;
  tangentNormal.xy *= uNormalStrength;
  vec3 detailNormal = normalize(tangentNormal);
  float ao = texture(iChannel3, vMaterialUv).r;
  vec3 lightDir = normalize(vec3(-0.42, -0.35, 1.0));
  float diffuse = max(dot(detailNormal, lightDir), 0.0);
  float ambient = 0.72;
  float cavity = 1.0 - smoothstep(0.18, 0.8, vHeight);
  vec3 color = base.rgb * (ambient + diffuse * 0.48);
  color *= mix(1.0, ao, 0.32);
  color *= 1.0 - cavity * 0.1;
  outColor = vec4(color, base.a);
}`;

    const program = createProgram(gl, vsSrc, fsSrc);
    const geometry = createPlaneGrid(192, 108);
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, geometry.positions, gl.STATIC_DRAW);

    const uvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, geometry.uvs, gl.STATIC_DRAW);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geometry.indices, gl.STATIC_DRAW);

    const textures = channelSources.map((source) =>
      createTexture(gl, { wrapMode: source.wrapMode }),
    );
    const locations = {
      aPosition: gl.getAttribLocation(program, "aPosition"),
      aUv: gl.getAttribLocation(program, "aUv"),
      iChannels: Array.from({ length: 4 }, (_, index) =>
        gl.getUniformLocation(program, `iChannel${index}`),
      ),
      uTileScale: gl.getUniformLocation(program, "uTileScale"),
      uDisplacementStrength: gl.getUniformLocation(program, "uDisplacementStrength"),
      uMaterialScroll: gl.getUniformLocation(program, "uMaterialScroll"),
      uNormalStrength: gl.getUniformLocation(program, "uNormalStrength"),
      uAspect: gl.getUniformLocation(program, "uAspect"),
      uCameraDist: gl.getUniformLocation(program, "uCameraDist"),
      uFovScale: gl.getUniformLocation(program, "uFovScale"),
      uNear: gl.getUniformLocation(program, "uNear"),
      uFar: gl.getUniformLocation(program, "uFar"),
    };

    const state = {
      width: 1,
      height: 1,
      tileScale: Math.max(0.25, Number(config.reliefTileScale) || 4),
      displacementStrength: Math.max(0, Number(config.reliefDisplacementStrength) || 0),
      normalStrength: Math.max(0, Number(config.reliefNormalStrength) || 0),
      materialScrollX: Number(config.reliefMaterialScrollX) || 0,
      materialScrollY: Number(config.reliefMaterialScrollY) || 0,
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
        if (!nextConfig) return;
        if ("reliefTileScale" in nextConfig) {
          state.tileScale = Math.max(0.25, Number(nextConfig.reliefTileScale) || 0.25);
        }
        if ("reliefDisplacementStrength" in nextConfig) {
          state.displacementStrength = Math.max(
            0,
            Number(nextConfig.reliefDisplacementStrength) || 0,
          );
        }
        if ("reliefNormalStrength" in nextConfig) {
          state.normalStrength = Math.max(
            0,
            Number(nextConfig.reliefNormalStrength) || 0,
          );
        }
        if ("reliefMaterialScrollX" in nextConfig) {
          state.materialScrollX = Number(nextConfig.reliefMaterialScrollX) || 0;
        }
        if ("reliefMaterialScrollY" in nextConfig) {
          state.materialScrollY = Number(nextConfig.reliefMaterialScrollY) || 0;
        }
      },
      render() {
        gl.viewport(0, 0, state.width, state.height);
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

        for (let index = 0; index < textures.length; index += 1) {
          gl.activeTexture(gl.TEXTURE0 + index);
          channelSources[index].upload(gl, textures[index]);
          gl.uniform1i(locations.iChannels[index], index);
        }

        gl.uniform1f(locations.uTileScale, state.tileScale);
        gl.uniform1f(locations.uDisplacementStrength, state.displacementStrength);
        gl.uniform2f(
          locations.uMaterialScroll,
          state.materialScrollX,
          state.materialScrollY,
        );
        gl.uniform1f(locations.uNormalStrength, state.normalStrength);
        gl.uniform1f(locations.uAspect, state.width / Math.max(state.height, 1));
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
        for (const texture of textures) gl.deleteTexture(texture);
        for (const source of channelSources) source.destroy();
        gl.deleteBuffer(positionBuffer);
        gl.deleteBuffer(uvBuffer);
        gl.deleteBuffer(indexBuffer);
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

    const texture = createTexture(gl);
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
      progress: 1,
      targetProgress: clampUnit(Number(config.rollProgress ?? 1)),
      introFrom: 1,
      introTo: clampUnit(Number(config.rollProgress ?? 1)),
      introStartTime: 0,
      introDuration: 0.7,
      introActive: true,
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
          const nextProgress = clampUnit(Number(nextConfig.rollProgress));
          state.targetProgress = nextProgress;
          if (nextConfig.animateFrom !== undefined) {
            state.introFrom = clampUnit(Number(nextConfig.animateFrom));
            state.introTo = nextProgress;
            state.introStartTime = Number(nextConfig.time ?? 0);
            state.introActive = true;
            state.progress = state.introFrom;
          } else if (state.introActive) {
            state.introTo = nextProgress;
          } else {
            state.progress = nextProgress;
          }
        }
      },
      render(time, width, height) {
        if (state.introActive) {
          const t = Math.min(
            Math.max((time - state.introStartTime) / state.introDuration, 0),
            1,
          );
          const eased = 1 - Math.pow(1 - t, 3);
          state.progress =
            state.introFrom + (state.introTo - state.introFrom) * eased;
          if (t >= 1) {
            state.introActive = false;
            state.progress = state.targetProgress;
          }
        }

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
      ? {
          engine: "fragment",
          fragSrc: rawConfig,
          rollProgress: 1,
          reliefTileScale: DEFAULT_RELIEF_TILE_SCALE,
          reliefDisplacementStrength: DEFAULT_RELIEF_DISPLACEMENT,
          reliefNormalStrength: DEFAULT_RELIEF_NORMAL,
          channels: [{ id: 0, type: "html" }],
        }
      : {
          engine:
            rawConfig?.engine === "roll"
              ? "roll"
              : rawConfig?.engine === "surface"
                ? "surface"
                : "fragment",
          fragSrc: String(rawConfig?.fragSrc || ""),
          rollProgress: clampUnit(Number(rawConfig?.rollProgress ?? 1)),
          reliefTileScale: Math.max(
            0.25,
            Number(rawConfig?.reliefTileScale) || DEFAULT_RELIEF_TILE_SCALE,
          ),
          reliefDisplacementStrength: Math.max(
            0,
            Number(rawConfig?.reliefDisplacementStrength) || DEFAULT_RELIEF_DISPLACEMENT,
          ),
          reliefNormalStrength: Math.max(
            0,
            Number(rawConfig?.reliefNormalStrength) || DEFAULT_RELIEF_NORMAL,
          ),
          channels: Array.isArray(rawConfig?.channels)
            ? rawConfig.channels.slice(0, CHANNEL_COUNT)
            : [{ id: 0, type: "html" }],
        };

  while (config.channels.length < CHANNEL_COUNT) {
    config.channels.push({ id: config.channels.length, type: "empty" });
  }

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
    const channelSources = await createChannelSources(config.channels, sourceCanvas);
    renderer =
      config.engine === "roll"
        ? createRollRenderer(gl, sourceCanvas, config)
        : config.engine === "surface"
          ? createSurfaceReliefRenderer(gl, channelSources, config)
          : createFragmentRenderer(
            gl,
            channelSources,
            config,
          );
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

  const getReliefMaterialScroll = () => ({
    reliefMaterialScrollX: wrapper.scrollLeft / Math.max(wrapper.clientWidth, 1),
    reliefMaterialScrollY: wrapper.scrollTop / Math.max(wrapper.clientHeight, 1),
  });

  const syncRollFromScroll = () => {
    if (config.engine !== "roll") return;
    renderer.update({ rollProgress: getRollProgressFromScroll() });
  };

  const syncReliefFromScroll = () => {
    if (config.engine !== "surface") return;
    renderer.update(getReliefMaterialScroll());
  };

  const syncRendererFromScroll = () => {
    syncRollFromScroll();
    syncReliefFromScroll();
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
    if (config.engine === "surface") {
      renderer.update(getReliefMaterialScroll());
    }
  };
  resize();
  addEventListener("resize", resize);

  if (config.engine === "roll") {
    renderer.update({
      rollProgress: config.rollProgress,
      animateFrom: 1,
      time: 0,
    });
  }
  setScrollFromRollProgress(config.rollProgress);

  const onWheel = (e) => {
    wrapper.scrollTop += e.deltaY;
    wrapper.scrollLeft += e.deltaX;
    syncRendererFromScroll();
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
    syncRendererFromScroll();
    e.preventDefault();
  };
  addEventListener("wheel", onWheel, { passive: false });
  addEventListener("keydown", onKey);
  wrapper.addEventListener("scroll", syncRendererFromScroll, { passive: true });

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
    wrapper.removeEventListener("scroll", syncRendererFromScroll);
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

    renderer.render(
      (performance.now() - start) / 1000,
      canvas.width,
      canvas.height,
    );
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
