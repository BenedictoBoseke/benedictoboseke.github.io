import { features, motionEnabled } from './features.js';

// Original, asset-free geometry. The reference inspired the interaction, not the artwork.
const TAU = Math.PI * 2;
const studies = {
  orbit: {
    title: '01 / Orbit',
    description: 'Three intersecting paths, one shared center. An abstract study in balance and movement — drag to turn it around.',
  },
  ribbon: {
    title: '02 / Ribbon',
    description: 'A continuous blue ribbon folds through space. An abstract study in surfaces, light, and the space between.',
  },
  constellation: {
    title: '03 / Constellation',
    description: 'Small points become a connected structure. An abstract study in networks, perspective, and unexpected connections.',
  },
};

const vertexSource = `
  attribute vec3 aPosition;
  attribute vec3 aNormal;
  uniform mat4 uModel;
  uniform mat4 uProjection;
  varying vec3 vPosition;
  varying vec3 vNormal;
  void main() {
    vec4 world = uModel * vec4(aPosition, 1.0);
    vPosition = world.xyz;
    vNormal = normalize(mat3(uModel) * aNormal);
    gl_Position = uProjection * (world - vec4(0.0, 0.0, 6.0, 0.0));
  }
`;

const fragmentSource = `
  precision mediump float;
  varying vec3 vPosition;
  varying vec3 vNormal;
  uniform float uDark;
  void main() {
    vec3 n = normalize(vNormal);
    vec3 view = normalize(vec3(0.0, 0.0, 6.0) - vPosition);
    vec3 reflected = reflect(-view, n);
    float sky = smoothstep(-0.65, 0.85, reflected.y);
    vec3 environment = mix(vec3(0.035, 0.11, 0.17), vec3(0.66, 0.87, 0.98), sky);
    // Broad studio softboxes give the blue metal shape readable highlights.
    float band = pow(max(0.0, 1.0 - abs(reflected.y - 0.35) * 2.4), 9.0);
    float side = pow(max(dot(reflected, normalize(vec3(-0.8, 0.6, 1.0))), 0.0), 18.0);
    float rim = pow(1.0 - max(dot(n, view), 0.0), 3.0);
    float light = max(dot(n, normalize(vec3(-0.4, 0.85, 1.0))), 0.0);
    vec3 base = mix(vec3(0.04, 0.29, 0.43), vec3(0.27, 0.61, 0.78), light);
    vec3 color = mix(base, environment, 0.64) + band * vec3(0.38, 0.46, 0.5)
      + side * vec3(0.75, 0.85, 0.9) + rim * vec3(0.11, 0.27, 0.34);
    color += uDark * vec3(0.02, 0.045, 0.06);
    gl_FragColor = vec4(pow(color, vec3(0.88)), 1.0);
  }
`;

function normalize(v) {
  const length = Math.hypot(...v) || 1;
  return v.map(value => value / length);
}
function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function multiply(a, b) {
  const result = new Float32Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      for (let k = 0; k < 4; k++) result[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
    }
  }
  return result;
}
function rotation(x, y, z = 0) {
  const cx = Math.cos(x), sx = Math.sin(x), cy = Math.cos(y), sy = Math.sin(y), cz = Math.cos(z), sz = Math.sin(z);
  return multiply(
    multiply([cy, 0, -sy, 0, 0, 1, 0, 0, sy, 0, cy, 0, 0, 0, 0, 1], [1, 0, 0, 0, 0, cx, sx, 0, 0, -sx, cx, 0, 0, 0, 0, 1]),
    [cz, sz, 0, 0, -sz, cz, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  );
}
function perspective(aspect) {
  // Fit the whole sculpture on narrow cards instead of cropping it on mobile.
  const f = 1 / Math.tan(0.32) * Math.min(1, aspect / 1.05);
  return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, -1.005, -1, 0, 0, -0.2005, 0]);
}
function surface(sample, segments = 160, sides = 14) {
  const positions = [], normals = [], indices = [];
  const epsilon = 0.0001;
  for (let i = 0; i <= segments; i++) {
    const u = i / segments * TAU;
    for (let j = 0; j <= sides; j++) {
      const v = j / sides * TAU;
      const point = sample(u, v);
      const nextU = sample(u + epsilon, v), nextV = sample(u, v + epsilon);
      const du = nextU.map((value, axis) => value - point[axis]);
      const dv = nextV.map((value, axis) => value - point[axis]);
      positions.push(...point);
      normals.push(...normalize(cross(dv, du)));
      if (i < segments && j < sides) {
        const a = i * (sides + 1) + j, b = a + sides + 1;
        indices.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
  }
  return { positions, normals, indices };
}
function tube(curve, radius, { segments = 200, sides = 16, flat = 1, twist = 0 } = {}) {
  return surface((u, v) => {
    const point = curve(u), next = curve(u + 0.001);
    const tangent = normalize(next.map((value, axis) => value - point[axis]));
    const normal = normalize(cross(tangent, [0, 0, 1]));
    const binormal = normalize(cross(tangent, normal));
    const a = Math.cos(v) * radius, b = Math.sin(v) * radius * flat;
    const angle = u * twist;
    const n = a * Math.cos(angle) - b * Math.sin(angle), bn = a * Math.sin(angle) + b * Math.cos(angle);
    return point.map((value, axis) => value + normal[axis] * n + binormal[axis] * bn);
  }, segments, sides);
}
function sphere(radius, center = [0, 0, 0]) {
  const mesh = surface((u, v) => {
    const latitude = u / 2;
    return [center[0] + radius * Math.sin(latitude) * Math.cos(v), center[1] + radius * Math.sin(latitude) * Math.sin(v), center[2] + radius * Math.cos(latitude)];
  }, 16, 20);
  mesh.normals = mesh.normals.map(value => -value);
  return mesh;
}
function transform(mesh, angles, center = [0, 0, 0]) {
  const matrix = rotation(...angles);
  const apply = (values, translate) => {
    const output = [];
    for (let i = 0; i < values.length; i += 3) {
      for (let axis = 0; axis < 3; axis++) output.push(matrix[axis] * values[i] + matrix[axis + 4] * values[i + 1] + matrix[axis + 8] * values[i + 2] + (translate ? center[axis] : 0));
    }
    return output;
  };
  return { positions: apply(mesh.positions, true), normals: apply(mesh.normals, false), indices: mesh.indices };
}
function combine(meshes) {
  const combined = { positions: [], normals: [], indices: [] };
  for (const mesh of meshes) {
    const offset = combined.positions.length / 3;
    combined.positions.push(...mesh.positions);
    combined.normals.push(...mesh.normals);
    combined.indices.push(...mesh.indices.map(index => index + offset));
  }
  return combined;
}
function rod(a, b, radius = 0.024) {
  const direction = b.map((value, axis) => value - a[axis]);
  const axis = normalize(direction);
  const normal = normalize(cross(axis, Math.abs(axis[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]));
  const binormal = cross(axis, normal);
  return surface((u, v) => a.map((value, i) => value + direction[i] * u / TAU + radius * (normal[i] * Math.cos(v) + binormal[i] * Math.sin(v))), 1, 8);
}
function createGeometry(name) {
  if (name === 'hero') {
    return tube(u => {
      const radius = 1.04 + 0.37 * Math.cos(3 * u);
      return [radius * Math.cos(2 * u), radius * Math.sin(2 * u), 0.5 * Math.sin(3 * u)];
    }, 0.235, { segments: 240, sides: 20 });
  }
  if (name === 'ribbon') {
    return tube(u => [1.15 * Math.cos(u), 0.45 * Math.sin(2 * u), 1.15 * Math.sin(u)], 0.38, { flat: 0.13, twist: 1, segments: 240, sides: 22 });
  }
  if (name === 'constellation') {
    const points = Array.from({ length: 14 }, (_, i) => {
      const y = 1 - 2 * i / 13, radius = Math.sqrt(1 - y * y);
      return [1.35 * radius * Math.cos(i * 2.39996), 1.35 * y, 1.35 * radius * Math.sin(i * 2.39996)];
    });
    const parts = points.map(point => sphere(0.105, point));
    for (let i = 0; i < points.length; i++) {
      const neighbors = points.map((point, j) => ({ j, distance: Math.hypot(...point.map((v, axis) => v - points[i][axis])) })).filter(p => p.j !== i).sort((a, b) => a.distance - b.distance).slice(0, 3);
      for (const { j } of neighbors) if (j > i) parts.push(rod(points[i], points[j]));
    }
    return combine(parts);
  }
  const ring = tube(u => [1.32 * Math.cos(u), 1.32 * Math.sin(u), 0], 0.085, { segments: 120, sides: 12 });
  return combine([
    transform(ring, [0.9, 0.1, 0]), transform(ring, [-0.7, 0.8, 0.5]), transform(ring, [0.15, -0.8, -0.55]),
    sphere(0.38), sphere(0.13, [1.1, 0.55, 0.6]), sphere(0.11, [-0.85, -0.8, 0.55]),
  ]);
}

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Shader allocation failed');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    throw new Error('Shader compilation failed');
  }
  return shader;
}
function renderer(canvas, dark) {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true, depth: true, powerPreference: 'low-power' });
  if (!gl) throw new Error('WebGL unavailable');
  const vertex = compile(gl, gl.VERTEX_SHADER, vertexSource), fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    throw new Error('Shader link failed');
  }
  const position = gl.getAttribLocation(program, 'aPosition'), normal = gl.getAttribLocation(program, 'aNormal');
  const model = gl.getUniformLocation(program, 'uModel'), projection = gl.getUniformLocation(program, 'uProjection'), darkUniform = gl.getUniformLocation(program, 'uDark');
  let buffers = [], count = 0;
  const deleteBuffers = () => { for (const buffer of buffers) gl.deleteBuffer(buffer); buffers = []; };
  return {
    setGeometry(name) {
      const mesh = createGeometry(name);
      deleteBuffers();
      for (const [target, data] of [[gl.ARRAY_BUFFER, new Float32Array(mesh.positions)], [gl.ARRAY_BUFFER, new Float32Array(mesh.normals)], [gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(mesh.indices)]]) {
        const buffer = gl.createBuffer();
        if (!buffer) throw new Error('Buffer allocation failed');
        buffers.push(buffer);
        gl.bindBuffer(target, buffer);
        gl.bufferData(target, data, gl.STATIC_DRAW);
      }
      count = mesh.indices.length;
    },
    draw(matrix) {
      if (gl.isContextLost() || !count) return false;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      // The thin ribbon is visible from either side.
      gl.disable(gl.CULL_FACE);
      gl.useProgram(program);
      for (const [index, attribute] of [[0, position], [1, normal]]) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers[index]);
        gl.enableVertexAttribArray(attribute);
        gl.vertexAttribPointer(attribute, 3, gl.FLOAT, false, 0, 0);
      }
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers[2]);
      gl.uniformMatrix4fv(model, false, matrix);
      gl.uniformMatrix4fv(projection, false, perspective(canvas.width / canvas.height));
      gl.uniform1f(darkUniform, dark ? 1 : 0);
      gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, 0);
      return true;
    },
    destroy() { deleteBuffers(); gl.deleteProgram(program); },
  };
}

function scene({ stage, canvas, reset, name, dark, touch }) {
  if (!stage || !canvas) return () => {};
  let graphics = null, lost = false, disposed = false, inViewport = false, frame = 0, lastTime = 0;
  let width = 0, height = 0, active = name;
  let angleX = 0.42, angleY = -0.28, turn = 0;
  let pointerX = 0, pointerY = 0, hoverX = 0, hoverY = 0;
  let drag = null;
  const initialLabel = stage.getAttribute('aria-label');
  const existingStatus = document.getElementById(`${name === 'hero' ? 'hero' : 'object'}-scene-status`);
  const status = existingStatus || document.createElement('span');
  if (!existingStatus) { status.className = 'scene-status'; status.id = `${name === 'hero' ? 'hero' : 'object'}-scene-status`; stage.append(status); }
  status.setAttribute('aria-live', 'polite');
  const setStatus = message => { if (status.textContent !== message) status.textContent = message; };
  const setSceneLabel = ready => stage.setAttribute('aria-label', ready
    ? `Interactive blue ${active === 'hero' ? 'knot' : active} sculpture. Drag ${touch ? 'horizontally ' : ''}or use arrow keys to rotate.`
    : `Static BB monogram. ${active === 'hero' ? 'Interactive sculpture' : studies[active].title.slice(5) + ' study'} selected; 3D is unavailable.`);
  const stop = () => { if (frame) cancelAnimationFrame(frame); frame = 0; lastTime = 0; };
  const canMove = () => motionEnabled() && inViewport && !document.hidden && !lost && !disposed;
  const paint = () => {
    if (!graphics || lost || disposed || !width || !height) return;
    if (graphics.draw(rotation(angleX + hoverY, angleY + turn + hoverX, -0.2))) stage.dataset.ready = 'true';
  };
  const animate = time => {
    frame = 0;
    if (!canMove()) return;
    const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0;
    lastTime = time;
    if (!drag) turn += dt * 0.12;
    const ease = 1 - Math.exp(-dt * 5);
    hoverX += (pointerX - hoverX) * ease;
    hoverY += (pointerY - hoverY) * ease;
    paint();
    frame = requestAnimationFrame(animate);
  };
  const reconcile = () => {
    stop();
    if (!motionEnabled()) { pointerX = pointerY = hoverX = hoverY = 0; paint(); }
    if (canMove() && graphics) frame = requestAnimationFrame(animate);
  };
  const resize = () => {
    const bounds = stage.getBoundingClientRect();
    width = bounds.width; height = bounds.height;
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    const nextWidth = Math.max(1, Math.round(width * ratio)), nextHeight = Math.max(1, Math.round(height * ratio));
    if (canvas.width !== nextWidth || canvas.height !== nextHeight) { canvas.width = nextWidth; canvas.height = nextHeight; }
    paint();
  };
  const initialize = () => {
    try {
      graphics = renderer(canvas, dark);
      graphics.setGeometry(active);
      setSceneLabel(true);
      setStatus('Drag to rotate · Arrow keys to turn');
      resize();
      reconcile();
    } catch {
      graphics?.destroy(); graphics = null;
      stage.dataset.ready = 'false';
      setSceneLabel(false);
      setStatus('Static artwork · 3D is unavailable on this device');
    }
  };
  const release = () => {
    if (drag && stage.hasPointerCapture?.(drag.id)) stage.releasePointerCapture(drag.id);
    drag = null;
    stage.classList.remove('is-dragging');
  };
  const onDown = event => {
    if (!graphics || event.button !== 0 || (!touch && event.pointerType !== 'mouse')) return;
    if (event.target.closest('button, a')) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, type: event.pointerType, started: event.pointerType === 'mouse' };
    if (drag.started) { stage.setPointerCapture(event.pointerId); stage.classList.add('is-dragging'); }
  };
  const onMove = event => {
    if (!graphics || lost) return;
    if (drag && drag.id === event.pointerId) {
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
      if (!drag.started) {
        if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) { release(); return; }
        if (Math.abs(dx) < 8) return;
        drag.started = true;
        stage.setPointerCapture(event.pointerId);
        stage.classList.add('is-dragging');
      }
      angleY += dx * 0.009;
      angleX = Math.max(-1.3, Math.min(1.3, angleX + dy * 0.007));
      drag.x = event.clientX; drag.y = event.clientY;
      pointerX = pointerY = hoverX = hoverY = 0;
      paint();
    } else if (event.pointerType === 'mouse' && motionEnabled()) {
      const bounds = stage.getBoundingClientRect();
      pointerX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 0.2;
      pointerY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 0.15;
    }
  };
  const onUp = event => { if (drag?.id === event.pointerId) release(); };
  const onLeave = () => { pointerX = pointerY = 0; };
  const onReset = () => { release(); angleX = 0.42; angleY = -0.28; turn = 0; pointerX = pointerY = hoverX = hoverY = 0; paint(); };
  const onKey = event => {
    if (event.target !== stage || !graphics || lost) return;
    const keys = { ArrowLeft: [0, -0.15], ArrowRight: [0, 0.15], ArrowUp: [-0.15, 0], ArrowDown: [0.15, 0] };
    if (event.key === 'Home') { event.preventDefault(); onReset(); return; }
    if (!keys[event.key]) return;
    event.preventDefault();
    angleX = Math.max(-1.3, Math.min(1.3, angleX + keys[event.key][0]));
    angleY += keys[event.key][1];
    paint();
  };
  const onLost = event => { event.preventDefault(); lost = true; stop(); release(); stage.dataset.ready = 'false'; setSceneLabel(false); setStatus('Static artwork · Restoring the 3D view…'); };
  const onRestored = () => { if (disposed) return; lost = false; graphics = null; initialize(); };
  const onVisibility = () => { if (document.hidden) release(); reconcile(); };
  const onSelect = event => {
    const next = event.currentTarget.dataset.object;
    if (!studies[next]) return;
    active = next;
    for (const button of document.querySelectorAll('button[data-object]')) button.setAttribute('aria-pressed', String(button.dataset.object === active));
    const title = document.getElementById('object-title'), description = document.getElementById('object-description');
    if (title) title.textContent = studies[next].title;
    if (description) description.textContent = studies[next].description;
    stage.dataset.object = active;
    setSceneLabel(Boolean(graphics) && !lost);
    if (graphics && !lost) {
      try { graphics.setGeometry(active); onReset(); }
      catch { graphics.destroy(); graphics = null; stop(); stage.dataset.ready = 'false'; setSceneLabel(false); setStatus('Static artwork · 3D is unavailable on this device'); }
    }
  };
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => { inViewport = entries[0].isIntersecting; reconcile(); }, { rootMargin: '40px' }) : null;
  const resizer = 'ResizeObserver' in window ? new ResizeObserver(resize) : null;
  stage.addEventListener('pointerdown', onDown);
  stage.addEventListener('pointermove', onMove);
  stage.addEventListener('pointerup', onUp);
  stage.addEventListener('pointercancel', onUp);
  stage.addEventListener('lostpointercapture', onUp);
  stage.addEventListener('pointerleave', onLeave);
  stage.addEventListener('keydown', onKey);
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);
  reset?.addEventListener('click', onReset);
  window.addEventListener('portfolio:motionchange', reconcile);
  document.addEventListener('visibilitychange', onVisibility);
  const selectors = name === 'hero' ? [] : [...document.querySelectorAll('button[data-object]')];
  selectors.forEach(button => button.addEventListener('click', onSelect));
  if (observer) observer.observe(stage); else inViewport = true;
  if (resizer) resizer.observe(stage); else window.addEventListener('resize', resize);
  initialize();
  return () => {
    disposed = true; stop(); release(); observer?.disconnect(); resizer?.disconnect(); graphics?.destroy();
    stage.removeEventListener('pointerdown', onDown);
    stage.removeEventListener('pointermove', onMove);
    stage.removeEventListener('pointerup', onUp);
    stage.removeEventListener('pointercancel', onUp);
    stage.removeEventListener('lostpointercapture', onUp);
    stage.removeEventListener('pointerleave', onLeave);
    stage.removeEventListener('keydown', onKey);
    canvas.removeEventListener('webglcontextlost', onLost);
    canvas.removeEventListener('webglcontextrestored', onRestored);
    reset?.removeEventListener('click', onReset);
    window.removeEventListener('portfolio:motionchange', reconcile);
    window.removeEventListener('resize', resize);
    document.removeEventListener('visibilitychange', onVisibility);
    selectors.forEach(button => button.removeEventListener('click', onSelect));
    stage.dataset.ready = 'false';
    if (initialLabel === null) stage.removeAttribute('aria-label'); else stage.setAttribute('aria-label', initialLabel);
    if (!existingStatus) status.remove();
  };
}

export function initScenes() {
  const cleanups = [];
  if (features.heroScene) cleanups.push(scene({ stage: document.getElementById('hero-stage'), canvas: document.getElementById('hero-canvas'), reset: document.getElementById('hero-reset'), name: 'hero', dark: false, touch: false }));
  if (features.objectShowcase) cleanups.push(scene({ stage: document.getElementById('object-stage'), canvas: document.getElementById('object-canvas'), reset: document.getElementById('object-reset'), name: 'orbit', dark: true, touch: true }));
  return () => cleanups.forEach(cleanup => cleanup());
}
