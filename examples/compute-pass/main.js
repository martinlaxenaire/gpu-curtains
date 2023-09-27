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

  const verticesArray = planeGeometry.getAttribute('position').array

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
            works.vertices[i] = works.vertices[i] + cos(uniforms.time * 0.01) * 0.001;
          }
          `,
      },
    },
    uniforms: [
      {
        name: 'uniforms',
        label: 'Uniforms',
        bindings: {
          time: {
            type: 'f32',
            value: 0,
          },
        },
      },
    ],
    works: [
      {
        name: 'works',
        label: 'Works',
        dispatchSize: verticesArray.length / 64, // Note that we divide the vertex count by the workgroup_size!
        bindings: {
          vertices: {
            type: 'array<f32>',
            value: verticesArray.slice(),
          },
        },
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
    uniforms: [
      {
        name: 'uniforms', // could be something else, like "frames"...
        label: 'Uniforms',
        bindings: {
          time: {
            type: 'f32', // this means our uniform is a float
            value: 0,
          },
        },
      },
    ],
    storages: [
      {
        name: 'vertices', // could be something else, like "frames"...
        label: 'Vertices',
        visibility: 'vertex',
        bindings: {
          displacement: {
            type: 'array<vec3f>',
            value: verticesArray.slice(),
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

    if (result) {
      plane.storages.displacement.value.set(result.slice(0, plane.storages.displacement.value.length))
      plane.storages.displacement.shouldUpdate = true
    }
  })

  // TEST
  console.log(plane.material, gpuCurtains)
})
