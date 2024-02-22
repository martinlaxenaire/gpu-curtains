import { GPUCurtains, Plane, PlaneGeometry, Sampler } from '../../dist/esm/index.mjs'

window.addEventListener('load', async () => {
  // lerp
  const lerp = (start = 0, end = 1, amount = 0.1) => {
    return (1 - amount) * start + amount * end
  }

  let scrollEffect = 0
  const maxScrollEffect = 60

  // get our planes elements
  let planeElements = document.querySelectorAll('.plane')

  // set up our WebGL context and append the canvas to our wrapper
  const gpuCurtains = new GPUCurtains({
    container: '#canvas',
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance,
  })

  gpuCurtains.onError(() => {
    // display original images
    document.body.classList.add('no-curtains')
  })

  await gpuCurtains.setDevice()

  gpuCurtains
    .onRender(() => {
      // update our planes deformation
      // increase/decrease the effect
      scrollEffect = lerp(scrollEffect, 0, 0.075)
    })
    .onScroll(() => {
      // get scroll deltas to apply the effect on scroll
      const delta = gpuCurtains.scrollDelta

      // invert value for the effect
      delta.y = -delta.y

      // threshold
      if (delta.y > maxScrollEffect) {
        delta.y = maxScrollEffect
      } else if (delta.y < -maxScrollEffect) {
        delta.y = -maxScrollEffect
      }

      scrollEffect = lerp(scrollEffect, delta.y, 0.05)
    })

  const vertexShader = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
      @location(1) instanceIndex: f32,
    };
    
    fn rotationMatrix(axis: vec3f, angle: f32) -> mat4x4f {
      var nAxis: vec3f = normalize(axis);
      var s: f32 = sin(angle);
      var c: f32 = cos(angle);
      var oc: f32 = 1.0 - c;

      return mat4x4f(
        oc * nAxis.x * nAxis.x + c, oc * nAxis.x * nAxis.y - nAxis.z * s,  oc * nAxis.z * nAxis.x + nAxis.y * s,  0.0,
        oc * nAxis.x * nAxis.y + nAxis.z * s,  oc * nAxis.y * nAxis.y + c, oc * nAxis.y * nAxis.z - nAxis.x * s,  0.0,
        oc * nAxis.z * nAxis.x - nAxis.y * s,  oc * nAxis.y * nAxis.z + nAxis.x * s,  oc * nAxis.z * nAxis.z + c, 0.0,
        0.0, 0.0, 0.0, 1.0);
    }
    
    @vertex fn main(
      attributes: Attributes,
    ) -> VSOutput {
      var vsOutput: VSOutput;
      
      // get what instance is actually drawn
      var instanceIndex: f32 = f32(attributes.instanceIndex);
      
      var transformed: vec3f = attributes.position;
      
      // rotate first
      var angle: f32 = 3.141592 * scroll.strength / scroll.max;
      
      var rotatedTransformed: vec4f = vec4(transformed, 1.0) * rotationMatrix(vec3(0.0, 0.0, 1.0), angle * instanceIndex / instances.count);
      
      transformed = rotatedTransformed.xyz;
      
      //transformed.y -= instanceIndex * scroll.strength * 0.01;
      
      // avoid depth overlapping issues
      transformed.z -= 0.0001 * instanceIndex;
      transformed.z -= instanceIndex * abs(scroll.strength) * 0.1;

      vsOutput.position = getOutputPosition(transformed);
      vsOutput.uv = getUVCover(attributes.uv, planeTextureMatrix);
      vsOutput.instanceIndex = instanceIndex;
    
      return vsOutput;
    }
  `

  const fragmentShader = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
      @location(1) instanceIndex: f32,
    };
    
    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {   
      var color: vec4f = textureSample(planeTexture, mipmapNearestSampler, fsInput.uv);
      
      var scrollEffect = scroll.strength / (scroll.max * 0.75);
      
      color.a -= select(0.0, (fsInput.instanceIndex / instances.count) - scrollEffect, fsInput.instanceIndex > 0.0);
      
      return color;
    }
  `

  const instancesCount = 7

  const geometry = new PlaneGeometry({
    instancesCount,
  })

  const params = {
    geometry,
    shaders: {
      vertex: {
        code: vertexShader,
        entryPoint: 'main',
      },
      fragment: {
        code: fragmentShader,
        entryPoint: 'main',
      },
    },
    DOMFrustumMargins: {
      top: 200,
      right: 0,
      bottom: 200,
      left: 0,
    },
    transparent: true,
    uniforms: {
      scroll: {
        label: 'Scroll',
        struct: {
          strength: {
            type: 'f32',
            value: 0,
          },
          max: {
            type: 'f32',
            value: maxScrollEffect,
          },
        },
      },
      instances: {
        label: 'Instances',
        struct: {
          count: {
            type: 'f32',
            value: instancesCount,
          },
        },
      },
    },
    samplers: [
      // Use mipmap nearest filter
      new Sampler(gpuCurtains, {
        label: 'Nearest sampler',
        name: 'mipmapNearestSampler',
        mipmapFilter: 'nearest',
      }),
    ],
    texturesOptions: {
      generateMips: true,
    },
  }

  // add our planes and handle them
  planeElements.forEach((planeEl, planeIndex) => {
    params.label = 'Plane' + planeIndex
    const plane = new Plane(gpuCurtains, planeEl, params)

    // check if our plane is defined and use it
    plane.onRender(() => {
      // update the uniform
      plane.uniforms.scroll.strength.value = scrollEffect
    })
  })
})
