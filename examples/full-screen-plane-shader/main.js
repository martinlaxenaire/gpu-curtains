import { GPUDeviceManager, GPURenderer, FullscreenPlane } from '../../dist/esm/index.mjs'

window.addEventListener('load', async () => {
  // first, we need a WebGPU device, that's what GPUDeviceManager is for
  const gpuDeviceManager = new GPUDeviceManager({
    label: 'Custom device manager',
    onError: () => {
      // handle error at the device level
      document.body.classList.add('no-curtains')
    },
  })

  // we need to wait for the device to be created
  await gpuDeviceManager.init()

  // then we can create a basic renderer
  // no need for camera or DOM syncing here
  const gpuRenderer = new GPURenderer({
    label: 'Basic GPU Renderer',
    deviceManager: gpuDeviceManager, // the renderer is going to use our WebGPU device to create its context
    container: document.querySelector('#canvas'),
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
    renderPass: {
      sampleCount: 1, // no need for MSAA here!
    },
  })

  const shader = /* wgsl */ `
    // https://gist.github.com/munrocket/236ed5ba7e409b8bdf1ff6eca5dcdc39
    // MIT License. © Stefan Gustavson, Munrocket
    //
    // On generating random numbers, with help of y= [(a+x)sin(bx)] mod 1", W.J.J. Rey, 22nd European Meeting of Statisticians 1998
    fn rand11(n: f32) -> f32 { return fract(sin(n) * 43758.5453123); }
    
    fn permute4(x: vec4f) -> vec4f { return ((x * 34. + 1.) * x) % vec4f(289.); }
    fn fade2(t: vec2f) -> vec2f { return t * t * t * (t * (t * 6. - 15.) + 10.); }
    
    fn perlinNoise2(P: vec2f) -> f32 {
      var Pi: vec4f = floor(P.xyxy) + vec4f(0., 0., 1., 1.);
      let Pf = fract(P.xyxy) - vec4f(0., 0., 1., 1.);
      Pi = Pi % vec4f(289.); // To avoid truncation effects in permutation
      let ix = Pi.xzxz;
      let iy = Pi.yyww;
      let fx = Pf.xzxz;
      let fy = Pf.yyww;
      let i = permute4(permute4(ix) + iy);
      var gx: vec4f = 2. * fract(i * 0.0243902439) - 1.; // 1/41 = 0.024...
      let gy = abs(gx) - 0.5;
      let tx = floor(gx + 0.5);
      gx = gx - tx;
      var g00: vec2f = vec2f(gx.x, gy.x);
      var g10: vec2f = vec2f(gx.y, gy.y);
      var g01: vec2f = vec2f(gx.z, gy.z);
      var g11: vec2f = vec2f(gx.w, gy.w);
      let norm = 1.79284291400159 - 0.85373472095314 *
          vec4f(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11));
      g00 = g00 * norm.x;
      g01 = g01 * norm.y;
      g10 = g10 * norm.z;
      g11 = g11 * norm.w;
      let n00 = dot(g00, vec2f(fx.x, fy.x));
      let n10 = dot(g10, vec2f(fx.y, fy.y));
      let n01 = dot(g01, vec2f(fx.z, fy.z));
      let n11 = dot(g11, vec2f(fx.w, fy.w));
      let fade_xy = fade2(Pf.xy);
      let n_x = mix(vec2f(n00, n01), vec2f(n10, n11), vec2f(fade_xy.x));
      let n_xy = mix(n_x.x, n_x.y, fade_xy.y);
      return 2.3 * n_xy;
    }    
    
    //  MIT License. © Inigo Quilez, Munrocket
    //  noise2() is any noise here: Value, Perlin, Simplex, Worley
    //
    const m2: mat2x2f = mat2x2f(vec2f(0.8, 0.6), vec2f(-0.6, 0.8));
    fn fbm(p: vec2f) -> f32 {
        var f: f32 = 0.;
        var pos: vec2f = p;
        f = f + 0.5000 * perlinNoise2(pos); pos = m2 * pos * 2.02;
        f = f + 0.2500 * perlinNoise2(pos); pos = m2 * pos * 2.03;
        f = f + 0.1250 * perlinNoise2(pos); pos = m2 * pos * 2.01;
        f = f + 0.0625 * perlinNoise2(pos);
        return f / 0.9375;
    }
    
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };
  
    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      // probably not performant at all, do not use that in production!
      // it's just a dumb example      
      let uv = fsInput.uv * 2.0 - 1.0;
      
      let firstFbm = fbm( uv * 3.0 );
      
      let noise: f32 = firstFbm + fbm(
        vec2(
          uv.y * cos(frames.elapsed * 0.02) * 2.0 + (firstFbm + sin(frames.elapsed * 0.003)) * 4.0,
          uv.x * sin(frames.elapsed * 0.006) * 0.25 + (firstFbm + cos(frames.elapsed * 0.01)),
        )
      ) * 1.5;
      
      var color: vec3f = mix(vec3(1, 0.5, 1), vec3(0.5, 1, 1), noise);
            
      return vec4(color, 0.5);
    }
  `

  const fullscreenPlane = new FullscreenPlane(gpuRenderer, {
    label: 'Full screen plane',
    shaders: {
      fragment: {
        code: shader,
      },
    },
    uniforms: {
      frames: {
        struct: {
          elapsed: {
            type: 'f32',
            value: 0,
          },
        },
      },
    },
  })

  fullscreenPlane.onRender(() => {
    fullscreenPlane.uniforms.frames.elapsed.value++
  })
})
