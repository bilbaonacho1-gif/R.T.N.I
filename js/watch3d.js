// R.T.N.I. — reloj 3D paramétrico (Three.js)
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Medidas en unidades de escena (la caja mide 4,2 de alto)
const CW = 3.5, CH = 4.2, CR = 0.98, CD = 1.0;        // caja
const SY = 0.13;                                        // la pantalla sube un poco: deja lugar al grabado
const GW = 3.06, GH = 3.62, GR = 0.72;                 // vidrio
const DW = 3.0, DH = 3.56, DR = 0.68;                  // pantalla

const FINISH = {
  acero:    { c: 0xd2d5da, r: .30, b: 0xf2f4f7, br: .08, l: 0xc4c7cc, lr: .34, s: [1, 1, 1],       e: 0x3b3e43 },
  grafito:  { c: 0x2c2d31, r: .40, b: 0x4a4c52, br: .12, l: 0x27282c, lr: .44, s: [1, 1, 1],       e: 0xa3a5aa },
  compacto: { c: 0x1b1c1f, r: .55, b: 0x303136, br: .22, l: 0x18191c, lr: .52, s: [.86, .87, .92], e: 0x85878c },
};
const LIGHTS = {
  neutral:    { key: 1.5, keyC: 0xffffff, coral: .7,  ice: .8,  env: 1.0,  exp: 1.05 },
  coral:      { key: 1.3, keyC: 0xfff4ee, coral: 2.4, ice: .35, env: .95,  exp: 1.02 },
  ice:        { key: 1.4, keyC: 0xf2f7ff, coral: .3,  ice: 2.2, env: 1.0,  exp: 1.05 },
  control:    { key: .55, keyC: 0xdfe4f2, coral: 3.4, ice: .1,  env: .62,  exp: .9 },
  conciencia: { key: 2.0, keyC: 0xfff7ec, coral: .15, ice: 2.6, env: 1.2,  exp: 1.12 },
};
// Movimientos cortos de cámara para cada punto de interés
const FOCUS = {
  pantalla: { yaw: 0, pitch: 0, zoom: 1.32, dx: 0, dy: -.05 },
  corona:   { yaw: -1.05, pitch: .12, zoom: 1.4, dx: -.28, dy: -.1 },
  bio:      { yaw: Math.PI - .55, pitch: -.18, zoom: 1.12, dx: 0, dy: 0 },
};

function rrShape(w, h, r, oy = 0) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2 + oy;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return new THREE.CanvasTexture(c); }

export function init(store) {
  const canvas = document.getElementById('gl');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), .04).texture;
  const camera = new THREE.PerspectiveCamera(30, 1, .1, 100);
  camera.position.set(0, 0, 20);
  const VIEW_H = 2 * 20 * Math.tan(THREE.MathUtils.degToRad(15)); // alto visible en z = 0

  // luces: una principal y dos de contorno (coral = deseo, hielo = necesidad)
  const key = new THREE.DirectionalLight(0xffffff, 1.5); key.position.set(-5, 7, 9); scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, .35); fill.position.set(6, -3, 6); scene.add(fill);
  const rimCoral = new THREE.PointLight(0xF1765C, 1, 0, 0); rimCoral.position.set(7, 3, -5); scene.add(rimCoral);
  const rimIce = new THREE.PointLight(0xAACBE6, 1, 0, 0); rimIce.position.set(-7, -2, -4); scene.add(rimIce);

  // ---------- materiales ----------
  const brushed = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#8c8c8c'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      const y = Math.random() * h, v = 95 + (Math.random() * 100 | 0), x = Math.random() * w;
      g.strokeStyle = `rgba(${v},${v},${v},${.2 + Math.random() * .35})`; g.lineWidth = .4 + Math.random();
      g.beginPath(); g.moveTo(x - 220, y); g.lineTo(x + 220, y + (Math.random() - .5)); g.stroke();
    }
  });
  brushed.wrapS = brushed.wrapT = THREE.RepeatWrapping; brushed.repeat.set(.55, .55); brushed.anisotropy = maxAniso;
  const F0 = FINISH[store.finish];
  const caseMat = new THREE.MeshPhysicalMaterial({ color: F0.c, metalness: 1, roughness: F0.r / .55, roughnessMap: brushed, clearcoat: .25, clearcoatRoughness: .3 });
  const bezelMat = new THREE.MeshPhysicalMaterial({ color: F0.b, metalness: 1, roughness: F0.br, clearcoat: .6, clearcoatRoughness: .1 });
  const linkMat = new THREE.MeshPhysicalMaterial({ color: F0.l, metalness: 1, roughness: F0.lr / .55, roughnessMap: brushed });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x050506, roughness: .6 });
  const screenTex = new THREE.CanvasTexture(store.screenCanvas);
  screenTex.colorSpace = THREE.SRGBColorSpace; screenTex.anisotropy = maxAniso;
  const screenMat = new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false });
  // vidrio: solo suma reflejos sobre la pantalla (no la oscurece)
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x000000, metalness: 0, roughness: .05, clearcoat: 1, clearcoatRoughness: .04, envMapIntensity: .2, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });

  // ---------- geometría ----------
  const rootG = new THREE.Group(), pivot = new THREE.Group(), watch = new THREE.Group();
  rootG.add(pivot); pivot.add(watch); scene.add(rootG);

  const caseGeo = new THREE.ExtrudeGeometry(rrShape(CW, CH, CR), { depth: CD - .28, bevelEnabled: true, bevelThickness: .14, bevelSize: .14, bevelSegments: 10, curveSegments: 40 });
  caseGeo.translate(0, 0, -(CD - .28) / 2);
  const caseMesh = new THREE.Mesh(caseGeo, caseMat); watch.add(caseMesh);
  const FRONT = CD / 2;

  // bisel pulido alrededor del vidrio
  const bezelShape = rrShape(GW + .24, GH + .24, GR + .12, SY); bezelShape.holes.push(rrShape(GW - .02, GH - .02, GR - .01, SY));
  const bezelGeo = new THREE.ExtrudeGeometry(bezelShape, { depth: .02, bevelEnabled: true, bevelThickness: .03, bevelSize: .02, bevelSegments: 4, curveSegments: 40 });
  const bezel = new THREE.Mesh(bezelGeo, bezelMat); bezel.position.z = FRONT - .01; watch.add(bezel);
  // fondo negro del display
  const panel = new THREE.Mesh(new THREE.ShapeGeometry(rrShape(GW, GH, GR, SY), 40), darkMat); panel.position.z = FRONT + .004; watch.add(panel);
  // pantalla con contenido real (canvas)
  const scrGeo = new THREE.ShapeGeometry(rrShape(DW, DH, DR, SY), 40);
  { const p = scrGeo.attributes.position, uv = scrGeo.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + DW / 2) / DW, (p.getY(i) - SY + DH / 2) / DH); }
  const screenMesh = new THREE.Mesh(scrGeo, screenMat); screenMesh.position.z = FRONT + .012; watch.add(screenMesh);
  // vidrio con canto pulido
  const glassGeo = new THREE.ExtrudeGeometry(rrShape(GW - .06, GH - .06, GR - .03, SY), { depth: .01, bevelEnabled: true, bevelThickness: .03, bevelSize: .03, bevelSegments: 6, curveSegments: 40 });
  const glass = new THREE.Mesh(glassGeo, glassMat); glass.position.z = FRONT + .02; glass.renderOrder = 2; watch.add(glass);
  // grabado debajo de la pantalla
  const engr = canvasTex(512, 64, (g, w, h) => { g.fillStyle = '#fff'; g.font = '600 40px "Inter Tight", Inter, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; if ('letterSpacing' in g) g.letterSpacing = '14px'; g.fillText('R.T.N.I.', w / 2, h / 2 + 2); });
  engr.colorSpace = THREE.SRGBColorSpace; engr.anisotropy = maxAniso;
  const engrMat = new THREE.MeshBasicMaterial({ map: engr, color: F0.e, transparent: true, opacity: .75, depthWrite: false });
  const engrMesh = new THREE.Mesh(new THREE.PlaneGeometry(.74, .093), engrMat); engrMesh.position.set(0, -CH / 2 + .17, FRONT + .002); watch.add(engrMesh);

  // corona estriada con anillo coral, y botón lateral
  const ridges = canvasTex(256, 8, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = '#000'; for (let x = 0; x < w; x += 8) g.fillRect(x, 0, 3, h); });
  ridges.wrapS = THREE.RepeatWrapping; ridges.repeat.set(5, 1);
  const crownMat = new THREE.MeshPhysicalMaterial({ color: F0.b, metalness: 1, roughness: .28, bumpMap: ridges, bumpScale: 2.2 });
  const crown = new THREE.Group(); crown.position.set(CW / 2 + .14, .82, 0); watch.add(crown);
  const crownBody = new THREE.Mesh(new THREE.CylinderGeometry(.34, .34, .34, 72, 1), crownMat); crownBody.rotation.z = Math.PI / 2; crownBody.position.x = .2; crown.add(crownBody);
  const crownCap = new THREE.Mesh(new THREE.CylinderGeometry(.3, .32, .04, 72), bezelMat); crownCap.rotation.z = Math.PI / 2; crownCap.position.x = .39; crown.add(crownCap);
  const crownNeck = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, .08, 48), caseMat); crownNeck.rotation.z = Math.PI / 2; crownNeck.position.x = .02; crown.add(crownNeck);
  const ringMat = new THREE.MeshStandardMaterial({ color: 0xF1765C, emissive: 0xF1765C, emissiveIntensity: .45, metalness: .4, roughness: .35 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.33, .018, 12, 96), ringMat); ring.rotation.y = Math.PI / 2; ring.position.x = .37; crown.add(ring);
  const sideBtn = new THREE.Mesh(new RoundedBoxGeometry(.16, .92, .42, 4, .07), bezelMat); sideBtn.position.set(CW / 2 + .17, -.42, 0); watch.add(sideBtn);

  // sensor trasero del biovínculo
  const sensorMat = new THREE.MeshPhysicalMaterial({ color: 0x0b0c0f, metalness: .3, roughness: .12, clearcoat: 1 });
  const sensor = new THREE.Mesh(new THREE.CylinderGeometry(1.08, 1.12, .12, 96), sensorMat); sensor.rotation.x = Math.PI / 2; sensor.position.z = -FRONT - .04; watch.add(sensor);
  const ledMat = new THREE.MeshBasicMaterial({ color: 0xF1765C, toneMapped: false });
  const led = new THREE.Mesh(new THREE.TorusGeometry(.6, .03, 8, 96), ledMat); led.position.z = -FRONT - .105; watch.add(led);
  const dotMat = new THREE.MeshBasicMaterial({ color: 0xAACBE6, toneMapped: false });
  for (let i = 0; i < 4; i++) { const d = new THREE.Mesh(new THREE.CircleGeometry(.07, 24), dotMat); const a = i * Math.PI / 2 + Math.PI / 4; d.position.set(Math.cos(a) * .3, Math.sin(a) * .3, -FRONT - .106); d.rotation.y = Math.PI; watch.add(d); }
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(.9, .012, 6, 96), new THREE.MeshBasicMaterial({ color: 0x3a3c42 })); ring2.position.z = -FRONT - .1; watch.add(ring2);

  // ---------- pulsera articulada ----------
  const lugGeo = new RoundedBoxGeometry(2.7, .34, .5, 4, .12);
  for (const sgn of [1, -1]) { const lug = new THREE.Mesh(lugGeo, caseMat); lug.position.set(0, sgn * (CH / 2 + .2), -.06); watch.add(lug); }
  const half = [[2.55, -.06], [3.05, -.18], [3.48, -.55], [3.78, -1.12], [3.92, -1.8], [3.9, -2.5]];
  const curves = [1, -1].map(sgn => new THREE.CatmullRomCurve3(half.map(([y, z]) => new THREE.Vector3(0, sgn * y, z))));
  const LINK_H = .54, GAP = .055, STEP = LINK_H + GAP;
  const nPer = Math.floor(curves[0].getLength() / STEP);
  const midGeo = new RoundedBoxGeometry(1.24, LINK_H, .36, 3, .09);
  const sideGeo = new RoundedBoxGeometry(.62, LINK_H, .32, 3, .09);
  const mids = new THREE.InstancedMesh(midGeo, linkMat, nPer * 2);
  const sides = new THREE.InstancedMesh(sideGeo, linkMat, nPer * 4);
  const m4 = new THREE.Matrix4(), xA = new THREE.Vector3(1, 0, 0), zA = new THREE.Vector3(), tmp = new THREE.Vector3(), col = new THREE.Color();
  let mi = 0, si = 0;
  curves.forEach(curve => {
    const L = curve.getLength();
    for (let k = 0; k < nPer; k++) {
      const u = (k * STEP + LINK_H / 2) / L, p = curve.getPointAt(u), t = curve.getTangentAt(u);
      zA.crossVectors(xA, t).normalize();
      m4.makeBasis(xA, t, zA).setPosition(p);
      const shade = 1 - Math.pow(k / Math.max(1, nPer - 1), 1.3) * .72; col.setScalar(shade);
      mids.setMatrixAt(mi, m4); mids.setColorAt(mi++, col);
      for (const sx of [-.96, .96]) { tmp.copy(xA).multiplyScalar(sx); const m = m4.clone(); m.setPosition(p.clone().add(tmp)); sides.setMatrixAt(si, m); sides.setColorAt(si++, col); }
    }
  });
  watch.add(mids, sides);

  // anclas de los puntos de interés (espacio local del reloj) y su normal
  const ANCH = {
    pantalla: { p: new THREE.Vector3(1.0, -1.2, FRONT + .05), n: new THREE.Vector3(0, 0, 1) },
    corona: { p: new THREE.Vector3(CW / 2 + .6, .82, 0), n: new THREE.Vector3(1, 0, 0) },
    bio: { p: new THREE.Vector3(-CW / 2 - .2, -.9, -.3), n: new THREE.Vector3(-.6, 0, -.8) },
  };
  const hsWrap = document.getElementById('hotspots');
  const hsEls = [...hsWrap.querySelectorAll('.hs')];

  // ---------- slots: el reloj viaja entre los lugares reservados en la página ----------
  const slots = [...document.querySelectorAll('.slot[data-slot]')];
  const info = el => { const r = el.getBoundingClientRect(), p = ((innerWidth < 861 && el.dataset.poseM) || el.dataset.pose).split(',').map(Number); return { name: el.dataset.slot, cx: r.left + r.width / 2, cy: r.top + r.height / 2, h: r.height, yaw: p[0], pitch: p[1], fit: p[2], vis: r.bottom > 0 && r.top < innerHeight }; };
  const clamp01 = v => Math.max(0, Math.min(1, v));
  const smooth = t => t * t * (3 - 2 * t);
  const lerp = (a, b, t) => a + (b - a) * t;

  function target() {
    const I = slots.map(info), vc = innerHeight / 2;
    let i = -1; for (let k = 0; k < I.length; k++) if (I[k].cy <= vc) i = k;
    let a, b, e = 0;
    if (i < 0) { a = b = I[0]; } else if (i >= I.length - 1) { a = b = I[I.length - 1]; } else {
      a = I[i]; b = I[i + 1];
      const t = (vc - a.cy) / (b.cy - a.cy), hold = a.name === 'hero' ? 0 : .24;
      e = smooth(clamp01((t - hold) / (1 - 2 * hold)));
    }
    const T = {
      cx: lerp(a.cx, b.cx, e), cy: lerp(a.cy, b.cy, e),
      px: lerp(a.h * a.fit, b.h * b.fit, e) * (a.name === 'hero' ? 1 : 1 - .14 * Math.sin(Math.PI * e)),
      yaw: lerp(a.yaw, b.yaw, e), pitch: lerp(a.pitch, b.pitch, e),
      reloj: (a.name === 'reloj' ? 1 - e : 0) + (b.name === 'reloj' && a !== b ? e : 0),
    };
    if (store.focus && T.reloj > 0) {
      const f = FOCUS[store.focus], w = T.reloj;
      T.yaw = lerp(T.yaw, f.yaw, w); T.pitch = lerp(T.pitch, f.pitch, w);
      T.px *= lerp(1, f.zoom, w); T.cx += f.dx * T.px * w; T.cy += f.dy * T.px * w;
    }
    return T;
  }

  // ---------- bucle ----------
  const cur = { x: 0, y: 0, s: 1, yaw: -1.1, pitch: .3, uy: 0, up: 0 };
  const F = { c: new THREE.Color(F0.c), b: new THREE.Color(F0.b), l: new THREE.Color(F0.l), e: new THREE.Color(F0.e), sc: new THREE.Vector3(1, 1, 1) };
  const L = { ...LIGHTS.coral, keyC: new THREE.Color(LIGHTS.coral.keyC) };
  let lw = 0, lh = 0, last = performance.now(), first = true, sv = -1, t = 0, readyFired = false, hsOn = false;
  const tmpC = new THREE.Color();
  const v3 = new THREE.Vector3(), nrm = new THREE.Vector3(), q = new THREE.Quaternion();

  function resize() {
    lw = innerWidth; lh = innerHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, lw < 700 ? 2 : 1.75));
    renderer.setSize(lw, lh, false);
    camera.aspect = lw / lh; camera.updateProjectionMatrix();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden) return;
    const dt = Math.min(.05, (now - last) / 1000); last = now; t += dt;
    if (innerWidth !== lw || innerHeight !== lh) resize();
    const T = target();
    const upp = VIEW_H / lh;
    const tx = (T.cx - lw / 2) * upp, ty = -(T.cy - lh / 2) * upp, ts = T.px * upp / CH;
    const red = store.reduce;
    const kp = red || first ? 1 : 1 - Math.exp(-dt * 16);
    const kr = red ? 1 : 1 - Math.exp(-dt * (first ? 2.6 : 5.5));
    const ku = red ? 1 : 1 - Math.exp(-dt * 9);
    cur.x = lerp(cur.x, tx, kp); cur.y = lerp(cur.y, ty, kp);
    cur.s = first ? ts * .9 : lerp(cur.s, ts, kr);
    cur.yaw = lerp(cur.yaw, T.yaw, kr); cur.pitch = lerp(cur.pitch, T.pitch, kr);
    cur.uy = lerp(cur.uy, store.user.yaw, ku); cur.up = lerp(cur.up, store.user.pitch, ku);
    first = false;
    const idle = red ? 0 : Math.sin(t * .45) * .05 * (1 - T.reloj * (store.focus ? 1 : 0));
    const bob = red ? 0 : Math.sin(t * .7) * .035 * cur.s;
    rootG.position.set(cur.x, cur.y + bob, 0);
    rootG.scale.setScalar(cur.s);
    pivot.rotation.set(cur.pitch + cur.up, cur.yaw + cur.uy + idle, 0, 'YXZ');

    // acabado: color, rugosidad y proporciones (la cámara no se mueve)
    const FT = FINISH[store.finish], kf = red ? 1 : 1 - Math.exp(-dt * 5);
    caseMat.color.lerp(tmpC.set(FT.c), kf); caseMat.roughness = lerp(caseMat.roughness, FT.r / .55, kf);
    bezelMat.color.lerp(tmpC.set(FT.b), kf); bezelMat.roughness = lerp(bezelMat.roughness, FT.br, kf);
    crownMat.color.copy(bezelMat.color);
    linkMat.color.lerp(tmpC.set(FT.l), kf); linkMat.roughness = lerp(linkMat.roughness, FT.lr / .55, kf);
    engrMat.color.lerp(tmpC.set(FT.e), kf);
    watch.scale.lerp(v3.set(...FT.s), kf);

    // iluminación según la sección y la perspectiva
    const LT = LIGHTS[store.light] || LIGHTS.neutral, kl = red ? 1 : 1 - Math.exp(-dt * 3.2);
    L.key = lerp(L.key, LT.key, kl); L.coral = lerp(L.coral, LT.coral, kl); L.ice = lerp(L.ice, LT.ice, kl);
    L.env = lerp(L.env, LT.env, kl); L.exp = lerp(L.exp, LT.exp, kl); L.keyC.lerp(tmpC.set(LT.keyC), kl);
    key.intensity = L.key; key.color.copy(L.keyC); rimCoral.intensity = L.coral * 1.6; rimIce.intensity = L.ice * 1.6;
    renderer.toneMappingExposure = L.exp;
    caseMat.envMapIntensity = linkMat.envMapIntensity = bezelMat.envMapIntensity = L.env;

    // biovínculo: el led late al ritmo del pulso simulado
    const beat = Math.pow(Math.max(0, Math.sin(t * Math.PI * store.bpm / 60)), 8);
    ledMat.color.setRGB(.55 + .45 * beat, .26 + .2 * beat, .2 + .16 * beat);

    if (store.screenVersion !== sv) { sv = store.screenVersion; screenTex.needsUpdate = true; }

    // puntos de interés sobre el reloj
    const showHs = T.reloj > .82;
    if (showHs !== hsOn) { hsOn = showHs; hsWrap.classList.toggle('on', hsOn); }
    if (hsOn) {
      watch.updateWorldMatrix(true, false); watch.getWorldQuaternion(q);
      hsEls.forEach(el => {
        const A = ANCH[el.dataset.hs];
        v3.copy(A.p); watch.localToWorld(v3); v3.project(camera);
        const sx = (v3.x * .5 + .5) * lw;
        el.style.transform = `translate(${sx}px,${(-v3.y * .5 + .5) * lh}px)`;
        el.classList.toggle('lft', el.dataset.hs === 'bio' || sx > lw - 150);
        nrm.copy(A.n).applyQuaternion(q);
        el.classList.toggle('away', nrm.z < -.15);
      });
    }

    renderer.render(scene, camera);
    if (!readyFired) { readyFired = true; store.onReady(); }
  }
  // tocar la pantalla del reloj: devuelve la coordenada UV
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  store.pick = (x, y) => {
    ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObject(screenMesh, false)[0];
    return hit ? hit.uv : null;
  };

  resize();
  requestAnimationFrame(frame);
}
