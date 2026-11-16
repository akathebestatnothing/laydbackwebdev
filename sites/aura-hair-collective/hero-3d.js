(() => {
  const hero = document.querySelector('.hero--aura');
  if (!hero || matchMedia('(prefers-reduced-motion: reduce)').matches || innerWidth < 680) return;

  const canvas = hero.querySelector('.hero__canvas');
  const image = hero.querySelector('.hero__img');
  if (!canvas || !image) return;

  const load = (src) => new Promise((resolve, reject) => {
    const s = document.createElement('script'); s.src = new URL(src, document.baseURI).href;
    s.onload = resolve; s.onerror = reject; document.head.appendChild(s);
  });

  const reveal = load('./vendor/gsap.min.js').then(() => load('./vendor/SplitText.min.js')).then(() => {
    const title = hero.querySelector('.hero__title');
    if (!title || !window.gsap || !window.SplitText) return;
    window.gsap.registerPlugin(window.SplitText);
    const split = new window.SplitText(title.querySelectorAll('.hero__line'), { type: 'lines', linesClass: 'hero-line-mask' });
    window.gsap.fromTo(split.lines, { yPercent: 100 }, { yPercent: 0, duration: 1.1, stagger: .12, ease: 'cubic-bezier(.22,1,.36,1)', onComplete: () => { split.revert(); title.classList.add('is-complete'); } });
  }).catch(() => {});

  import('./vendor/three.module.js').then((THREE) => {
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const texture = new THREE.TextureLoader().load(image.currentSrc || image.src);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = texture.magFilter = THREE.LinearFilter;
    const uniforms = {
      uTexture: { value: texture }, uResolution: { value: new THREE.Vector2() },
      uPointer: { value: new THREE.Vector2(.5, .5) }, uPointerSpring: { value: new THREE.Vector2(.5, .5) },
      uScroll: { value: 0 }, uTime: { value: 0 }, uImageScale: { value: 1.08 }
    };
    const material = new THREE.ShaderMaterial({ uniforms, vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`, fragmentShader: `
      uniform sampler2D uTexture; uniform vec2 uResolution,uPointer,uPointerSpring; uniform float uScroll,uTime,uImageScale; varying vec2 vUv;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x),u.y);}
      void main(){vec2 uv=(vUv-.5)/uImageScale+.5;float n=noise(uv*3.2+uTime*.018)+noise(uv*7.-uTime*.012)*.35;vec2 p=uPointerSpring-.5;float wave=sin((uv.x+uv.y)*12.+n*5.-uTime*.35)*.012;uv+=p*.018+normalize(p+vec2(.0001))*wave*(.4+length(p));vec3 photo=texture2D(uTexture,uv).rgb;float silk=noise(uv*5.+vec2(uTime*.025,-uTime*.018));float caustic=smoothstep(.45,.82,sin(uv.x*9.+n*4.+uTime*.18)*.5+.5)*.18;vec3 pearl=vec3(.937,.902,.847),champ=vec3(.969,.953,.933),honey=vec3(.875,.769,.608);vec3 liquid=mix(pearl,champ,silk);liquid=mix(liquid,honey,smoothstep(.58,.95,n));liquid+=caustic*vec3(1.,.72,.35);float veil=.16+silk*.12;gl_FragColor=vec4(mix(photo,liquid,veil),1.);}` });
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));
    let visible = true, raf = 0, last = 0, targetScroll = 0;
    const spring = { x: .5, y: .5 };
    const resize = () => { const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight; renderer.setSize(w, h, false); uniforms.uResolution.value.set(w, h); };
    const pointer = (e) => { const r = hero.getBoundingClientRect(); uniforms.uPointer.value.set((e.clientX-r.left)/r.width, 1-(e.clientY-r.top)/r.height); };
    const scroll = () => { const r = hero.getBoundingClientRect(); targetScroll = THREE.MathUtils.clamp(-r.top/Math.max(1,r.height),0,1); };
    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }); io.observe(hero);
    new ResizeObserver(resize).observe(canvas); resize(); scroll();
    hero.addEventListener('pointermove', pointer, { passive: true }); addEventListener('scroll', scroll, { passive: true });
    const frame = (now) => { raf = requestAnimationFrame(frame); if (!visible || document.hidden || now-last < 1000/45) return; last=now; spring.x += (uniforms.uPointer.value.x-spring.x)*.075; spring.y += (uniforms.uPointer.value.y-spring.y)*.075; uniforms.uPointerSpring.value.set(spring.x,spring.y); uniforms.uScroll.value += (targetScroll-uniforms.uScroll.value)*.06; uniforms.uTime.value=now*.001; renderer.render(scene,camera); };
    renderer.render(scene,camera); canvas.classList.add('is-live'); raf=requestAnimationFrame(frame);
    addEventListener('pagehide', () => { cancelAnimationFrame(raf); io.disconnect(); material.dispose(); texture.dispose(); renderer.dispose(); }, { once: true });
  }).catch(() => canvas.classList.remove('is-live'));

  const button = hero.querySelector('a[href*="booking"], a[href*="Book"], .btn--gold');
  if (button && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    button.addEventListener('pointermove', (e) => { const r=button.getBoundingClientRect(); button.style.transform=`translate(${(e.clientX-r.left-r.width/2)*.12}px,${(e.clientY-r.top-r.height/2)*.12}px)`; });
    button.addEventListener('pointerleave', () => { button.style.transform=''; });
    button.addEventListener('pointerdown', () => { button.style.transform='scale(.97)'; });
  }
})();