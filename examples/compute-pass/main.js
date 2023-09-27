window.addEventListener('DOMContentLoaded', async () => {
  // set up our WebGL context and append the canvas to our wrapper
  const gpuCurtains = new GPUCurtains.GPUCurtains({
    container: 'canvas',
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
  })

  await gpuCurtains.setRendererContext()

  const planeGeometry = new GPUCurtains.PlaneGeometry({
    widthSegments: 20,
  })

  console.log(planeGeometry.getAttribute('position'))

  // first our compute pass
  const computePass = new GPUCurtains.ComputePass(gpuCurtains, {
    label: 'Compute test',
    shaders: {
      compute: {
        code: `
          @compute @workgroup_size(64) fn main(
            @builtin(global_invocation_id) id: vec3<u32>
          ) {
            let i = id.x;
            works[i] = works[i] + cos(uniforms.time * 0.01) * 0.001;
          }
          `,
      },
    },
    bindings: [
      {
        name: 'uniforms',
        label: 'Uniforms',
        uniforms: {
          time: {
            type: 'f32',
            value: 0,
          },
        },
      },
    ],
    workGroups: [
      {
        name: 'works',
        label: 'Works',
        type: 'array<f32>',
        value: planeGeometry.getAttribute('position').array.slice(),
        // entries: [
        //   {
        //     bufferType: 'storage',
        //     value: [1, 2, 3],
        //   },
        // ],
      },
    ],
  })

  console.log(computePass)

  computePass.onRender(() => {
    // const result = computePass.getWorkGroupResult('works')
    // console.log(result)
    computePass.uniforms.time.value++
  })

  // setTimeout(() => {
  //   const result = computePass.getWorkGroupResult('works')
  //   console.log('WORK GROUP RESULT', result)
  // }, 500)

  // get our plane element
  const planeElements = document.getElementsByClassName('plane')

  const vertexShader = /* wgsl */ `
      struct VSOutput {
        @builtin(position) position: vec4f,
        @location(0) uv: vec2f,
      };
      
      struct VertexInput {
        @builtin(vertex_index) vertexIndex : u32,
        @location(0) uv: vec2f,
        @location(1) position: vec3f,
      }

      @vertex fn main(
        vertexInput: VertexInput,
      ) -> VSOutput {
        var vsOutput: VSOutput;
        
        // var transformed: vec3f = vec3(
        //     vertices.displacement[vertexInput.vertexIndex * 3],
        //     vertices.displacement[vertexInput.vertexIndex * 3 + 1],
        //     vertices.displacement[vertexInput.vertexIndex * 3 + 2]
        // );
        
        var transformed = vertices.displacement[vertexInput.vertexIndex];

        vsOutput.position = getOutputPosition(camera, matrices, transformed);
        vsOutput.uv = getUVCover(vertexInput.uv, planeTextureMatrix);

        return vsOutput;
      }
  `

  const fragmentShader = /* wgsl */ `
    struct VSOutput {
        @builtin(position) position: vec4f,
        @location(0) uv: vec2f,
      };

      @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
        var texture: vec4f = textureSample(planeTexture, planeTextureSampler, fsInput.uv);

        return texture;
      }
  `

  // set our initial parameters (basic uniforms)
  const params = {
    widthSegments: 20,
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
    bindings: [
      {
        name: 'uniforms', // could be something else, like "frames"...
        label: 'Uniforms',
        uniforms: {
          time: {
            type: 'f32', // this means our uniform is a float
            value: 0,
          },
        },
      },
      {
        name: 'vertices', // could be something else, like "frames"...
        label: 'Vertices',
        bindingType: 'storage',
        visibility: 'vertex',
        uniforms: {
          displacement: {
            type: 'array<vec3f>',
            value: planeGeometry.getAttribute('position').array.slice(),
          },
        },
      },
    ],
  }

  const plane = new GPUCurtains.Plane(gpuCurtains, planeElements[0], params)

  plane.onRender(() => {
    // update our time uniform value
    plane.uniforms.time.value++

    const result = computePass.getWorkGroupResult('works')
    plane.uniforms.displacement.value.set(result)
    plane.uniforms.displacement.shouldUpdate = true
  })

  // TEST
  console.log(plane, gpuCurtains)
})
