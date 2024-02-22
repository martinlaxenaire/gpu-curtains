import { FullscreenPlane, GPUCurtains } from '../../dist/esm/index.mjs'

window.addEventListener('load', async () => {
  // set our main GPUCurtains instance it will handle everything we need
  // a WebGPU device and a renderer with its scene, requestAnimationFrame, resize and scroll events...
  const gpuCurtains = new GPUCurtains({
    container: '#canvas',
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
    renderPass: {
      sampleCount: 1, // no need for MSAA here!
    },
  })

  gpuCurtains.onError(() => {
    document.body.classList.add('no-curtains')
  })

  await gpuCurtains.setDevice()

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
    
    fn mod289(x: vec2f) -> vec2f {
      return x - floor(x * (1. / 289.)) * 289.;
    }
    
    fn mod289_3(x: vec3f) -> vec3f {
      return x - floor(x * (1. / 289.)) * 289.;
    }
    
    fn permute3(x: vec3f) -> vec3f {
      return mod289_3(((x * 34.) + 1.) * x);
    }
    
    //  MIT License. © Ian McEwan, Stefan Gustavson, Munrocket
    fn simplexNoise2(v: vec2f) -> f32 {
      let C = vec4(
          0.211324865405187, // (3.0-sqrt(3.0))/6.0
          0.366025403784439, // 0.5*(sqrt(3.0)-1.0)
          -0.577350269189626, // -1.0 + 2.0 * C.x
          0.024390243902439 // 1.0 / 41.0
      );
  
      // First corner
      var i = floor(v + dot(v, C.yy));
      let x0 = v - i + dot(i, C.xx);
  
      // Other corners
      var i1 = select(vec2(0., 1.), vec2(1., 0.), x0.x > x0.y);
  
      // x0 = x0 - 0.0 + 0.0 * C.xx ;
      // x1 = x0 - i1 + 1.0 * C.xx ;
      // x2 = x0 - 1.0 + 2.0 * C.xx ;
      var x12 = x0.xyxy + C.xxzz;
      x12.x = x12.x - i1.x;
      x12.y = x12.y - i1.y;
  
      // Permutations
      i = mod289(i); // Avoid truncation effects in permutation
  
      var p = permute3(permute3(i.y + vec3(0., i1.y, 1.)) + i.x + vec3(0., i1.x, 1.));
      var m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), vec3(0.));
      m *= m;
      m *= m;
  
      // Gradients: 41 points uniformly over a line, mapped onto a diamond.
      // The ring size 17*17 = 289 is close to a multiple of 41 (41*7 = 287)
      let x = 2. * fract(p * C.www) - 1.;
      let h = abs(x) - 0.5;
      let ox = floor(x + 0.5);
      let a0 = x - ox;
  
      // Normalize gradients implicitly by scaling m
      // Approximation of: m *= inversesqrt( a0*a0 + h*h );
      m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  
      // Compute final noise value at P
      let g = vec3(a0.x * x0.x + h.x * x0.y, a0.yz * x12.xz + h.yz * x12.yw);
      return 130. * dot(m, g);
    }
    
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };
  
    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      // probably not performant at all, do not use that in production!
      // it's just a dumb example
      let noise: f32 = perlinNoise2(
        vec2(
          simplexNoise2(
            cos(fsInput.uv + frames.elapsed * 0.005) * 0.25 - sin(frames.elapsed * 0.01) * 0.125
            + sin(fsInput.uv - frames.elapsed * 0.00125) * 0.75 + cos(frames.elapsed * 0.025) * 0.0625
          )
        ) * (cos(frames.elapsed * 0.02) * 0.5 + 1.0) * 0.75
      );
      
      var color: vec3f = mix(vec3(1, 0, 1), vec3(0, 1, 1), noise);
      
      //return vec4(vec3(noise), 1.0);
      return vec4(color, 0.5);
    }
  `

  const fullscreenPlane = new FullscreenPlane(gpuCurtains, {
    shaders: {
      fragment: {
        code: shader,
      },
    },
    transparent: true,
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
