const PRESETS = {
  blur: `precision highp float;
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
  swirl: `precision highp float;
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
  invert: `precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform float uTime;
uniform vec2 uResolution;
void main() {
  vec4 c = texture2D(uTex, vUv);
  gl_FragColor = vec4(1.0 - c.rgb, c.a);
}`,
  chromatic: `precision highp float;
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
  wave: `precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform float uTime;
uniform vec2 uResolution;
void main() {
  vec2 uv = vUv;
  uv.x += sin(uv.y * 30.0 + uTime * 2.0) * 0.005;
  gl_FragColor = texture2D(uTex, uv);
}`,
  ascii: `precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform float uTime;
uniform vec2 uResolution;
void main() {
  float px = 8.0;
  vec2 uv = floor(vUv * uResolution / px) * px / uResolution;
  gl_FragColor = texture2D(uTex, uv);
}`
};

const $ = id => document.getElementById(id);
const statusEl = $('status');
const shaderEl = $('shader');
const presetEl = $('preset');

const hlEl = document.querySelector('#shader-hl code');

const GLSL_KEYWORDS = new Set(['if','else','for','while','do','return','break','continue','discard','in','out','inout','const','uniform','varying','attribute','precision','highp','mediump','lowp','struct','true','false']);
const GLSL_TYPES = new Set(['void','bool','int','uint','float','vec2','vec3','vec4','ivec2','ivec3','ivec4','uvec2','uvec3','uvec4','bvec2','bvec3','bvec4','mat2','mat3','mat4','mat2x2','mat2x3','mat2x4','mat3x2','mat3x3','mat3x4','mat4x2','mat4x3','mat4x4','sampler2D','samplerCube','sampler3D','sampler2DArray']);
const GLSL_BUILTINS = new Set(['gl_FragColor','gl_Position','gl_FragCoord','gl_PointCoord','texture','texture2D','textureCube','textureLod','sin','cos','tan','asin','acos','atan','pow','exp','log','exp2','log2','sqrt','inversesqrt','abs','sign','floor','ceil','fract','mod','min','max','clamp','mix','step','smoothstep','length','distance','dot','cross','normalize','reflect','refract','any','all','not','dFdx','dFdy','fwidth']);

function escHtml(s) { return s.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }

function highlight(src) {
  const re = /(\/\/[^\n]*)|(\/\*[\s\S]*?\*\/)|(^[ \t]*#[^\n]*)|("(?:\\.|[^"\\])*")|(\b\d+\.?\d*(?:e[+-]?\d+)?\b)|([A-Za-z_][A-Za-z_0-9]*)|([\s\S])/gm;
  let out = '';
  src.replace(re, (m, com1, com2, pp, str, num, ident) => {
    if (com1 || com2) out += `<span class="tok-com">${escHtml(m)}</span>`;
    else if (pp) out += `<span class="tok-pp">${escHtml(m)}</span>`;
    else if (str) out += `<span class="tok-str">${escHtml(m)}</span>`;
    else if (num) out += `<span class="tok-num">${m}</span>`;
    else if (ident) {
      if (GLSL_KEYWORDS.has(ident)) out += `<span class="tok-key">${ident}</span>`;
      else if (GLSL_TYPES.has(ident)) out += `<span class="tok-type">${ident}</span>`;
      else if (GLSL_BUILTINS.has(ident)) out += `<span class="tok-bi">${ident}</span>`;
      else out += ident;
    } else out += escHtml(m);
    return '';
  });
  // Trailing newline so the <pre> grows with the textarea's last empty line
  return out + '\n';
}

function syncHighlight() {
  hlEl.innerHTML = highlight(shaderEl.value);
  hlEl.parentElement.scrollTop = shaderEl.scrollTop;
  hlEl.parentElement.scrollLeft = shaderEl.scrollLeft;
}

shaderEl.addEventListener('input', syncHighlight);
shaderEl.addEventListener('scroll', () => {
  hlEl.parentElement.scrollTop = shaderEl.scrollTop;
  hlEl.parentElement.scrollLeft = shaderEl.scrollLeft;
});
shaderEl.addEventListener('keydown', e => {
  if (e.key === 'Tab') {
    e.preventDefault();
    const s = shaderEl.selectionStart, end = shaderEl.selectionEnd;
    shaderEl.value = shaderEl.value.slice(0, s) + '  ' + shaderEl.value.slice(end);
    shaderEl.selectionStart = shaderEl.selectionEnd = s + 2;
    syncHighlight();
  }
});

shaderEl.value = PRESETS.blur;
syncHighlight();
presetEl.addEventListener('change', () => { shaderEl.value = PRESETS[presetEl.value]; syncHighlight(); });

async function inject(func, args = []) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return chrome.scripting.executeScript({ target: { tabId: tab.id }, func, args, world: 'MAIN' });
}

$('apply').addEventListener('click', async () => {
  statusEl.textContent = '';
  try {
    const res = await inject(applyShaderInPage, [shaderEl.value]);
    const err = res?.[0]?.result;
    if (err) statusEl.textContent = err;
  } catch (e) {
    statusEl.textContent = String(e);
  }
});

$('remove').addEventListener('click', () => inject(removeShaderInPage));

// ---- Page-world functions ----

function applyShaderInPage(fragSrc) {
  const ctx2dProto = CanvasRenderingContext2D.prototype;
  const hasDraw = 'drawElement' in ctx2dProto;
  const hasPlace = 'placeElement' in ctx2dProto;
  console.log('[html-shader] drawElement?', hasDraw, 'placeElement?', hasPlace);
  if (!hasDraw && !hasPlace) {
    return 'No drawElement/placeElement on CanvasRenderingContext2D. Enable chrome://flags#enable-experimental-web-platform-features and restart Chrome.';
  }

  // Clean up existing
  const prev = document.getElementById('__html_shader_root__');
  if (prev) prev.remove();
  if (window.__htmlShaderStop) window.__htmlShaderStop();

  // The experimental API requires the rasterized element to be an IMMEDIATE
  // child of the canvas its drawElement is called on. So we use two canvases:
  //   sourceCanvas (2D) hosts the page content as a fallback child & rasterizes it
  //   glCanvas    (WebGL2) sits on top and runs the shader pass
  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.id = '__html_shader_source__';
  sourceCanvas.setAttribute('layoutsubtree', '');
  Object.assign(sourceCanvas.style, {
    position: 'fixed', inset: '0', width: '100vw', height: '100vh', zIndex: '0',
    // experimental CSS opt-in for html-in-canvas layout
    layoutSubtree: 'layout'
  });
  sourceCanvas.style.setProperty('layout-subtree', 'layout');

  const wrapper = document.createElement('div');
  wrapper.id = '__html_shader_wrapper__';
  Object.assign(wrapper.style, {
    position: 'absolute', inset: '0', width: '100%', height: '100%',
    overflow: 'auto', background: getComputedStyle(document.body).backgroundColor || '#fff'
  });

  // Move existing body children into the wrapper
  const originalChildren = Array.from(document.body.childNodes);
  for (const n of originalChildren) wrapper.appendChild(n);
  sourceCanvas.appendChild(wrapper);
  document.body.appendChild(sourceCanvas);

  const canvas = document.createElement('canvas');
  canvas.id = '__html_shader_root__';
  Object.assign(canvas.style, {
    position: 'fixed', inset: '0', width: '100vw', height: '100vh',
    pointerEvents: 'none', zIndex: '2147483647'
  });
  document.body.appendChild(canvas);

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const resize = () => {
    const w = Math.floor(innerWidth * dpr);
    const h = Math.floor(innerHeight * dpr);
    canvas.width = w; canvas.height = h;
    sourceCanvas.width = w; sourceCanvas.height = h;
  };
  resize();
  addEventListener('resize', resize);

  // Forward window scroll input into the wrapper, since the real <body> is
  // now empty and the wrapper is what actually has scrollable overflow.
  const onWheel = e => {
    wrapper.scrollTop += e.deltaY;
    wrapper.scrollLeft += e.deltaX;
    e.preventDefault();
  };
  const onKey = e => {
    const k = e.key;
    const step = 40;
    if (k === 'ArrowDown') wrapper.scrollTop += step;
    else if (k === 'ArrowUp') wrapper.scrollTop -= step;
    else if (k === 'PageDown') wrapper.scrollTop += innerHeight * 0.9;
    else if (k === 'PageUp') wrapper.scrollTop -= innerHeight * 0.9;
    else if (k === 'Home') wrapper.scrollTop = 0;
    else if (k === 'End') wrapper.scrollTop = wrapper.scrollHeight;
    else return;
    e.preventDefault();
  };
  addEventListener('wheel', onWheel, { passive: false });
  addEventListener('keydown', onKey);

  const sctx = sourceCanvas.getContext('2d');

  const gl = canvas.getContext('webgl2', { premultipliedAlpha: true, alpha: true });
  if (!gl) { canvas.remove(); return 'WebGL2 unavailable'; }

  const vsSrc = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  vUv.y = 1.0 - vUv.y;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

  // Wrap user GLSL ES 1.00 fragment src into ES 3.00 with compat shims
  const fsHeader = `#version 300 es
precision highp float;
out vec4 outColor;
#define gl_FragColor outColor
#define texture2D(s,uv) texture(s,uv)
#define varying in
#define attribute in
`;
  const fsSrc = fsHeader + fragSrc.replace(/^\s*precision[^;]*;/m, '').replace(/^\s*varying[^\n]*\n/m, 'in vec2 vUv;\n');

  function compile(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(sh);
      gl.deleteShader(sh);
      throw new Error(log);
    }
    return sh;
  }

  let prog;
  try {
    const vs = compile(gl.VERTEX_SHADER, vsSrc);
    const fs = compile(gl.FRAGMENT_SHADER, fsSrc);
    prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (e) {
    canvas.remove();
    return 'Shader error: ' + e.message;
  }

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const uTex = gl.getUniformLocation(prog, 'uTex');
  const uTime = gl.getUniformLocation(prog, 'uTime');
  const uRes = gl.getUniformLocation(prog, 'uResolution');

  const start = performance.now();
  let raf = 0;
  let stopped = false;

  function frame() {
    if (stopped) return;
    // Hide our canvas while snapping so it doesn't recurse
    try {
      sctx.clearRect(0, 0, sourceCanvas.width, sourceCanvas.height);
      // @ts-ignore — experimental. drawElement already rasterizes at the
      // canvas backing-store resolution, so do NOT apply a dpr transform.
      sctx.drawElement(wrapper, 0, 0);
    } catch (e) {
      stopped = true;
      console.error('[html-shader] snapshot failed', e);
      return;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(prog);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceCanvas);
    gl.uniform1i(uTex, 0);
    gl.uniform1f(uTime, (performance.now() - start) / 1000);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  window.__htmlShaderStop = () => {
    stopped = true;
    cancelAnimationFrame(raf);
    removeEventListener('resize', resize);
    removeEventListener('wheel', onWheel);
    removeEventListener('keydown', onKey);
    // Restore original DOM
    for (const n of Array.from(wrapper.childNodes)) document.body.appendChild(n);
    canvas.remove();
    sourceCanvas.remove();
    delete window.__htmlShaderStop;
  };
  return null;
}

function removeShaderInPage() {
  if (window.__htmlShaderStop) window.__htmlShaderStop();
  const prev = document.getElementById('__html_shader_root__');
  if (prev) prev.remove();
}
