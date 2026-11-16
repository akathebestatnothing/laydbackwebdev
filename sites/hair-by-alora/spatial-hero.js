import * as THREE from './vendor/three.module.js';

const hero = document.querySelector('.hero--cinema') || await new Promise((resolve) => {
  const observer = new MutationObserver(() => {
    const node = document.querySelector('.hero--cinema');
    if (node) { observer.disconnect(); resolve(node); }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
});
const media = hero.querySelector('.hero__media');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = matchMedia('(max-width: 679px)').matches;

if (media && !reduced && !mobile) {
  const canvas = document.createElement('canvas');
  canvas.className = 'hero__spatial-canvas hero__balayage-lock';
  canvas.setAttribute('aria-hidden', 'true');
  media.append(canvas);

  try {
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.4));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
    camera.position.set(0, 0, 9);
    const lock = new THREE.Group();
    lock.position.set(1.35, -0.05, 0);
    lock.scale.setScalar(1.28);
    lock.rotation.z = -0.13;
    scene.add(lock);
    scene.add(new THREE.HemisphereLight(0xfff3df, 0x1a0c07, 2.2));
    const key = new THREE.DirectionalLight(0xffd6a1, 5); key.position.set(-3, 5, 6); scene.add(key);
    const rim = new THREE.PointLight(0xfff0cf, 35, 14); rim.position.set(3, -1, 4); scene.add(rim);

    const uniforms = { uMelt: { value: 0.54 }, uTime: { value: 0 } };

    const positions = [];
    const along = [];
    const tone = [];
    const fibreCount = 1400;
    const segmentCount = 20;
    for (let i = 0; i < fibreCount; i++) {
      const lane = (i / (fibreCount - 1) - 0.5) * 2;
      const seed = Math.sin(i * 91.73) * 43758.5453 % 1;
      const phase = i * 2.39996;
      for (let p = 0; p < segmentCount; p++) {
        for (const step of [p, p + 1]) {
          const t = step / segmentCount;
          const taper = Math.sin(Math.PI * t);
          const spread = 0.22 + t * 1.05;
          const naturalWave = Math.sin(t * 7.2 + phase) * (0.035 + 0.06 * t);
          const flyaway = i % 37 === 0 ? Math.sin(t * Math.PI) * (0.3 + Math.abs(seed) * 0.35) : 0;
          positions.push(
            lane * spread + naturalWave + Math.sign(lane || 1) * flyaway,
            2.75 - t * 5.5,
            Math.cos(t * 6.1 + phase) * (0.08 + taper * 0.26) + seed * 0.12
          );
          along.push(t);
          tone.push(seed);
        }
      }
    }
    const fibreGeometry = new THREE.BufferGeometry();
    fibreGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    fibreGeometry.setAttribute('aAlong', new THREE.Float32BufferAttribute(along, 1));
    fibreGeometry.setAttribute('aTone', new THREE.Float32BufferAttribute(tone, 1));
    const fibreMaterial = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      vertexShader: `attribute float aAlong;attribute float aTone;varying float vAlong;varying float vTone;void main(){vAlong=aAlong;vTone=aTone;vec3 p=position;p.x+=sin(uTime*.35+aTone*9.)*.018*sin(3.14159*aAlong);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
      fragmentShader: `uniform float uMelt;varying float vAlong;varying float vTone;void main(){float edge=smoothstep(uMelt-.16,uMelt+.18,vAlong+vTone*.035);vec3 root=vec3(.045,.018,.01),mid=vec3(.28,.105,.035),honey=vec3(.78,.47,.19),pearl=vec3(.98,.79,.5);vec3 c=mix(root,mid,smoothstep(.02,.36,vAlong));c=mix(c,honey,edge);c=mix(c,pearl,smoothstep(.72,1.,vAlong));c*=.8+vTone*.28;gl_FragColor=vec4(c,.42+.34*edge);}`
    });
    const coreRoot = new THREE.MeshStandardMaterial({ color: 0x2a1007, roughness: 0.3, metalness: 0.05, emissive: 0x140500, emissiveIntensity: 0.25 });
    const coreHoney = new THREE.MeshStandardMaterial({ color: 0xd99a4d, roughness: 0.22, metalness: 0.04, emissive: 0x3b1704, emissiveIntensity: 0.32 });
    for (let i = 0; i < 11; i++) {
      const lane = (i - 5) / 5;
      const points = [];
      for (let p = 0; p < 13; p++) {
        const t = p / 12;
        points.push(new THREE.Vector3(lane * (.18 + t * .95) + Math.sin(t * 7 + i) * .045, 2.72 - t * 5.45, Math.cos(t * 6 + i) * .12));
      }
      const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 32, .034 + (i % 3) * .006, 7), i < 6 ? coreRoot : coreHoney);
      lock.add(tube);
    }


    const toolGroup = new THREE.Group();
    toolGroup.position.set(-1.5, 0.2, 0.2);
    toolGroup.rotation.z = -0.12;
    lock.add(toolGroup);
    const bronze = new THREE.MeshStandardMaterial({ color: 0x8d6332, roughness: .22, metalness: .55 });
    const ivory = new THREE.MeshStandardMaterial({ color: 0xf0e4d6, roughness: .3, metalness: .08 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x211a15, roughness: .25, metalness: .25 });
    const tool = (geometry, material, position, rotation = [0, 0, 0]) => { const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...position); mesh.rotation.set(...rotation); toolGroup.add(mesh); return mesh; };
    // A deliberate trade silhouette: shears, dryer and comb — the tools clients recognise.
    tool(new THREE.TorusGeometry(.22, .055, 12, 32), bronze, [-.55, .25, .15], [Math.PI/2, 0, .35]);
    tool(new THREE.TorusGeometry(.22, .055, 12, 32), bronze, [-.55, -.25, .15], [Math.PI/2, 0, -.35]);
    tool(new THREE.BoxGeometry(.06, 1.55, .045), ivory, [-.02, .08, .15], [0, 0, .35]);
    tool(new THREE.BoxGeometry(.06, 1.55, .045), ivory, [-.02, -.08, .15], [0, 0, -.35]);
    tool(new THREE.SphereGeometry(.27, 20, 12), bronze, [.62, .18, .28]);
    tool(new THREE.CylinderGeometry(.2, .25, .75, 24), dark, [1.02, .18, .28], [0, Math.PI/2, 0]);
    tool(new THREE.BoxGeometry(.08, 1.45, .04), bronze, [-1.12, -.05, .12], [0, 0, Math.PI/2]);
    for (let i = 0; i < 8; i++) tool(new THREE.BoxGeometry(.025, .28, .035), ivory, [-1.75 + i*.17, -.05, -.04]);

    const pointer = new THREE.Vector2();
    hero.addEventListener('pointermove', (event) => {
      const box = hero.getBoundingClientRect();
      pointer.set((event.clientX - box.left) / box.width - 0.5, (event.clientY - box.top) / box.height - 0.5);
      uniforms.uMelt.value = THREE.MathUtils.clamp(0.5 + pointer.y * 0.28, 0.28, 0.72);
    }, { passive: true });
    const resize = () => { const width = canvas.clientWidth || innerWidth; const height = canvas.clientHeight || innerHeight; renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); };
    new ResizeObserver(resize).observe(canvas); resize();
    let raf;
    const render = (now) => {
      uniforms.uTime.value = now * 0.001;
      lock.rotation.y += (pointer.x * 0.32 - lock.rotation.y) * 0.035;
      lock.rotation.x += (-pointer.y * 0.12 - lock.rotation.x) * 0.035;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(render);
    };
    canvas.classList.add('is-live');
    raf = requestAnimationFrame(render);
    addEventListener('pagehide', () => cancelAnimationFrame(raf), { once: true });
  } catch (error) {
    window.__spatialError = String(error);
    canvas.remove();
  }
}
