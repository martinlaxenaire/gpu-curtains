// Goal of this test is to ensure the various buffer copy methods work
window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const { ComputePass, GPUDeviceManager, GPURenderer, Vec2 } = await import(/* @vite-ignore */ path)

  const start = performance.now()

  const deviceManager = new GPUDeviceManager({
    label: 'Custom device manager',
  })

  await deviceManager.init()

  const gpuRenderer = new GPURenderer({
    deviceManager,
    container: '#canvas',
  })

  const compute2DNoiseShader = /* wgsl */ `
    // https://gist.github.com/munrocket/236ed5ba7e409b8bdf1ff6eca5dcdc39#perlin-noise
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
    
    @compute @workgroup_size(64) fn main(
      @builtin(global_invocation_id) blockIdx: vec3<u32>,
    ) {
      let index = blockIdx.x;
      
      let perlinNoise = perlinNoise2(
        vec2f(
          params.randomOffset.x + (f32(index) % params.size.x) * params.strength / params.size.x,
          params.randomOffset.y + floor(f32(index) / params.size.x) * params.strength / params.size.y
        )
      );
      
      noise.result[index] = perlinNoise;
    }
  `

  const noiseSize = new Vec2(500, 500)
  const noiseStrength = 5

  const compute2DNoise = new ComputePass(gpuRenderer, {
    shaders: {
      compute: {
        code: compute2DNoiseShader,
      },
    },
    autoRender: false, // we're going to render only on demand
    dispatchSize: Math.ceil((noiseSize.x * noiseSize.y) / 64),
    uniforms: {
      params: {
        struct: {
          size: {
            type: 'vec2f',
            value: noiseSize,
          },
          randomOffset: {
            type: 'vec2f',
            value: new Vec2(Math.random() * noiseStrength, Math.random() * noiseStrength),
          },
          strength: {
            type: 'f32',
            value: noiseStrength,
          },
        },
      },
    },
    storages: {
      noise: {
        access: 'read_write',
        shouldCopyResult: true, // tell the renderer to copy to the resultBuffer after each compute!
        struct: {
          result: {
            type: 'array<f32>',
            value: new Float32Array(noiseSize.x * noiseSize.y),
          },
        },
      },
    },
  })

  // we should wait for pipeline compilation!
  await compute2DNoise.material.compileMaterial()

  // now run the compute pass just once
  gpuRenderer.renderOnce([compute2DNoise])

  console.log(compute2DNoise)

  // const noiseBinding = compute2DNoise.material.getBindingByName('noise')
  // const dstBuffer = gpuRenderer.copyBufferToBuffer({
  //   srcBuffer: noiseBinding.buffer,
  // })

  // display result on a canvas
  const canvas = document.createElement('canvas')
  canvas.width = noiseSize.x
  canvas.height = noiseSize.y

  const page = document.querySelector('#page')
  page.appendChild(canvas)

  const drawResult = (result) => {
    // write to the canvas
    const ctx = canvas.getContext('2d')
    for (let i = 0; i < noiseSize.x * noiseSize.y; i++) {
      const noise = result[i] * 255
      ctx.fillStyle = `rgba(${noise}, ${noise}, ${noise}, 1)`
      ctx.fillRect(i % noiseSize.x, Math.floor(i / noiseSize.x), 1, 1)
    }
  }

  // and get the result of our compute pass
  const result = await compute2DNoise.material.getComputeResult({ bindingName: 'noise' })

  console.log(`noise generated in ${(performance.now() - start).toFixed(4)}ms`)

  drawResult(result)

  //const dstResult = await compute2DNoise.material.getBufferResult(dstBuffer)
  const dstResult = await compute2DNoise.material.getBufferBindingResultByBindingName('noise')
  console.log(result, dstResult)

  // render
  // const animate = () => {
  //   deviceManager.render()
  //   requestAnimationFrame(animate)
  // }
  //
  // animate()
  //
  // compute2DNoise.onReady(async () => {
  //   compute2DNoise.renderer.onBeforeRenderScene.add(
  //     async () => {
  //       // and get the result of our compute pass
  //       const result = await compute2DNoise.material.getComputeResult({ bindingName: 'noise' })
  //
  //       console.log(`noise generated in ${(performance.now() - start).toFixed(4)}ms`)
  //
  //       //const dstResult = await compute2DNoise.material.getBufferResult(dstBuffer)
  //       // const dstResult = await compute2DNoise.material.getBufferBindingResultByBindingName('noise')
  //       // console.log(result, dstResult)
  //
  //       drawResult(result)
  //     },
  //     { once: true }
  //   )
  // })
})
