// Port of https://webgpu.github.io/webgpu-samples/samples/computeBoids
window.addEventListener('DOMContentLoaded', async () => {
  // set up our WebGL context and append the canvas to our wrapper
  const gpuCurtains = new GPUCurtains.GPUCurtains({
    container: 'canvas',
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
  })

  await gpuCurtains.setRendererContext()

  // number of particles instances
  const numParticles = 2500
  // how much we're going to shrink the original geometry
  const particleShrinkScale = 100

  // camera screen ratio depends on screen size, fov and camera position
  const cameraRatio = gpuCurtains.renderer.camera.screenRatio.height * particleShrinkScale

  const screenRatio = gpuCurtains.boundingRect.width / gpuCurtains.boundingRect.height
  const systemSize = new GPUCurtains.Vec2(cameraRatio * screenRatio, cameraRatio)

  const initialParticlePosition = new Float32Array(numParticles * 2)
  const initialParticleVelocity = new Float32Array(numParticles * 2)
  for (let i = 0; i < numParticles; ++i) {
    initialParticlePosition[2 * i + 0] = 2 * systemSize.x * (Math.random() - 0.5)
    initialParticlePosition[2 * i + 1] = 2 * systemSize.y * (Math.random() - 0.5)

    initialParticleVelocity[2 * i + 0] = 2 * systemSize.x * (Math.random() - 0.5) * 0.1
    initialParticleVelocity[2 * i + 1] = 2 * systemSize.y * (Math.random() - 0.5) * 0.1
  }

  const computeBoids = /* wgsl */ `
    @compute @workgroup_size(64) fn main(
      @builtin(global_invocation_id) GlobalInvocationID: vec3<u32>
    ) {
      var index = GlobalInvocationID.x;
      
      var vPos = particlesA.childParticle[index].position;
      var vVel = particlesA.childParticle[index].velocity;
      
      var cMass = vec2(0.0);
      var cVel = vec2(0.0);
      var colVel = vec2(0.0);
      var cMassCount = 0u;
      var cVelCount = 0u;
      var pos : vec2<f32>;
      var vel : vec2<f32>;
      var minSystemSize: f32 = min(params.systemSize.x, params.systemSize.y);
      
      var particlesArrayLength = arrayLength(&particlesA.childParticle);
    
      for (var i = 0u; i < particlesArrayLength; i++) {
        if (i == index) {
          continue;
        }
        
        pos = particlesA.childParticle[i].position.xy;
        vel = particlesA.childParticle[i].velocity.xy;
        
        if (distance(pos, vPos) < params.rule1Distance * minSystemSize) {
          cMass += pos;
          cMassCount++;
        }
        if (distance(pos, vPos) < params.rule2Distance * minSystemSize) {
          colVel -= pos - vPos;
        }
        if (distance(pos, vPos) < params.rule3Distance * minSystemSize) {
          cVel += vel;
          cVelCount++;
        }
      }
      
      if (cMassCount > 0) {
        cMass = (cMass / vec2(f32(cMassCount))) - vPos;
      }
      if (cVelCount > 0) {
        cVel /= f32(cVelCount);
      }
      
      vVel += (cMass * params.rule1Scale) + (colVel * params.rule2Scale) + (cVel * params.rule3Scale);
    
      // clamp velocity for a more pleasing simulation
      vVel = normalize(vVel) * clamp(length(vVel), 0.0, minSystemSize * 0.1);
      
      // kinematic update
      vPos = vec2(vPos + (vVel * params.deltaT));
      
      // Wrap around boundary
      if (vPos.x < -params.systemSize.x) {
        vPos.x = params.systemSize.x;
      }
      if (vPos.x > params.systemSize.x) {
        vPos.x = -params.systemSize.x;
      }
      if (vPos.y < -params.systemSize.y) {
        vPos.y = params.systemSize.y;
      }
      if (vPos.y > params.systemSize.y) {
        vPos.y = -params.systemSize.y;
      }
      
      // Write back      
      particlesB.childParticle[index].position = vPos;
      particlesB.childParticle[index].velocity = vVel;
    }
  `

  // first our compute pass
  const computePass = new GPUCurtains.ComputePass(gpuCurtains, {
    label: 'Compute test',
    shaders: {
      compute: {
        code: computeBoids,
      },
    },
    uniforms: [
      {
        name: 'params',
        label: 'SimParams',
        bindings: {
          systemSize: {
            type: 'vec2f',
            value: systemSize,
          },
          deltaT: {
            type: 'f32',
            value: 0.04,
          },
          rule1Distance: {
            type: 'f32',
            value: 0.2,
          },
          rule2Distance: {
            type: 'f32',
            value: 0.05,
          },
          rule3Distance: {
            type: 'f32',
            value: 0.05,
          },
          rule1Scale: {
            type: 'f32',
            value: 0.04,
          },
          rule2Scale: {
            type: 'f32',
            value: 0.1,
          },
          rule3Scale: {
            type: 'f32',
            value: 0.01,
          },
        },
      },
    ],
    storages: [
      {
        name: 'particlesA',
        label: 'Particle',
        bindings: {
          position: {
            type: 'array<vec2f>',
            value: initialParticlePosition,
          },
          velocity: {
            type: 'array<vec2f>',
            value: initialParticleVelocity,
          },
        },
      },
    ],
    works: [
      {
        name: 'particlesB',
        label: 'Particle',
        dispatchSize: Math.ceil(numParticles / 64), // Note that we divide the vertex count by the workgroup_size!
        bindings: {
          position: {
            type: 'array<vec2f>',
            value: initialParticlePosition,
          },
          velocity: {
            type: 'array<vec2f>',
            value: initialParticleVelocity,
          },
        },
      },
    ],
    // TODO TEST
    // bindings: {
    //   simParams: {
    //     bindingType: 'uniform',
    //     struct: {
    //       deltaT: {
    //         type: 'f32',
    //         value: 0.04,
    //       },
    //       rule1Distance: {
    //         type: 'f32',
    //         value: 0.1,
    //       },
    //       rule2Distance: {
    //         type: 'f32',
    //         value: 0.025,
    //       },
    //       rule3Distance: {
    //         type: 'f32',
    //         value: 0.025,
    //       },
    //       rule1Scale: {
    //         type: 'f32',
    //         value: 0.02,
    //       },
    //       rule2Scale: {
    //         type: 'f32',
    //         value: 0.05,
    //       },
    //       rule3Scale: {
    //         type: 'f32',
    //         value: 0.005,
    //       },
    //     },
    //   },
    //   particlesA: {
    //     bindingType: 'storage',
    //     struct: {
    //       position: {
    //         type: 'array<vec2f>',
    //         value: initialParticlePosition,
    //       },
    //       velocity: {
    //         type: 'array<vec2f>',
    //         value: initialParticleVelocity,
    //       },
    //     },
    //   },
    //   particlesB: {
    //     bindingType: 'storageWrite',
    //     dispatchSize: Math.ceil(numParticles / 64), // Note that we divide the vertex count by the workgroup_size!
    //     struct: {
    //       positionWork: {
    //         type: 'array<vec2f>',
    //         value: initialParticlePosition,
    //       },
    //       velocityWork: {
    //         type: 'array<vec2f>',
    //         value: initialParticleVelocity,
    //       },
    //     },
    //   },
    // },
  })

  let originalBindGroup, swappedBindGroup
  const particleBindGroups = []
  const particleBuffers = []
  let computeInstanceBuffer

  let bufferToUse = 0

  computePass
    .onReady(() => {
      console.log(computePass.material)
      console.log(computePass.material.getAddedShaderCode('compute'))

      // clone our simulation bind group
      originalBindGroup = computePass.material.cloneBindGroupAtIndex(1)

      // now clone again but with buffer swapped
      swappedBindGroup = originalBindGroup.cloneFromBindingsBuffers({
        // swap the buffers...
        bindingsBuffers: [
          originalBindGroup.bindingsBuffers[0],
          originalBindGroup.bindingsBuffers[2],
          originalBindGroup.bindingsBuffers[1],
        ],
        // ...but preserve original bind group layout
        keepLayout: true,
      })

      particleBindGroups.push(originalBindGroup, swappedBindGroup)

      const storageBindingBuffer = computePass.material.getBindingsBuffersByBindingName('particlesA')
      const workBindingBuffer = computePass.material.getBindingsBuffersByBindingName('particlesB')

      particleBuffers.push(storageBindingBuffer[0].buffer, workBindingBuffer[0].buffer)
      console.log(particleBindGroups, particleBuffers)
    })
    .onRender(() => {
      if (particleBindGroups.length && particleBuffers.length) {
        // swap the bind groups
        computePass.material.bindGroups[1] = particleBindGroups[bufferToUse % 2]
        // then swap the instance buffer to set later in our mesh onRender callback
        computeInstanceBuffer = particleBuffers[(bufferToUse + 1) % 2]
        bufferToUse++
      }
    })
    .onAfterResize(() => {
      const cameraRatio = gpuCurtains.renderer.camera.screenRatio.height * particleShrinkScale
      const screenRatio = gpuCurtains.boundingRect.width / gpuCurtains.boundingRect.height
      computePass.uniforms.systemSize.value.set(cameraRatio * screenRatio, cameraRatio)
    })

  const meshVs = /* wgsl */ `  
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
      @location(1) normal: vec3f,
      //@location(2) velocity: vec2f,
    };

    @vertex fn main(
      attributes: Attributes,
    ) -> VSOutput {    
      var vsOutput : VSOutput;
      
      var transformed: vec3f = attributes.position + vec3(attributes.instancePosition.xy, 0);
              
      vsOutput.position = getOutputPosition(camera, matrices, transformed);
      vsOutput.uv = attributes.uv;
      vsOutput.normal = attributes.normal;
      //vsOutput.velocity = attributes.instanceVelocity;
      
      return vsOutput;
    }
  `

  const meshFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
      @location(1) normal: vec3f,
      //@location(2) velocity: vec2f,
    };
  
    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      // normals
      //return vec4(fsInput.velocity * 0.5 + 0.5, 0.0, 1.0);
      return vec4(fsInput.normal * 0.5 + 0.5, 1.0);
    }
  `

  const sphereGeometry = new GPUCurtains.SphereGeometry({
    instancesCount: numParticles,
    vertexBuffers: [
      {
        stepMode: 'instance',
        attributes: [
          {
            name: 'instancePosition',
            type: 'vec2f',
            bufferFormat: 'float32x2',
            size: 2,
            array: initialParticlePosition,
          },
          {
            name: 'instanceVelocity',
            type: 'vec2f',
            bufferFormat: 'float32x2',
            size: 2,
            array: initialParticleVelocity,
          },
        ],
      },
    ],
  })

  const sphereMesh = new GPUCurtains.Mesh(gpuCurtains, {
    label: 'Cube ',
    geometry: sphereGeometry,
    shaders: {
      vertex: {
        code: meshVs,
        entryPoint: 'main',
      },
      fragment: {
        code: meshFs,
        entryPoint: 'main',
      },
    },
  })

  // scale our cube along the Z axis based on its height (Y axis)
  sphereMesh.scale.x = 0.5 / particleShrinkScale
  sphereMesh.scale.y = 0.5 / particleShrinkScale
  sphereMesh.scale.z = 0.5 / particleShrinkScale

  // move our cube along the Z axis so the front face lies at (0, 0, 0) instead of the cube's center
  //cubeMesh.position.z = -1 * sphereGeometry.boundingBox.max.z * cubeMesh.scale.z

  sphereMesh
    .onReady(() => {
      //console.log(cubeMesh.material.getAddedShaderCode('vertex'))
    })
    .onRender(() => {
      if (computeInstanceBuffer) {
        const instanceVertexBuffer = sphereMesh.geometry.vertexBuffers[1]
        instanceVertexBuffer.buffer = computeInstanceBuffer
      }
    })

  console.log(sphereMesh, gpuCurtains)

  // PLANE

  // // get our plane element
  // const planeElements = document.getElementsByClassName('plane')
  //
  // const vertexShader = /* wgsl */ `
  //     struct VSOutput {
  //       @builtin(position) position: vec4f,
  //       @location(0) uv: vec2f,
  //     };
  //
  //     struct VertexInput {
  //       @builtin(vertex_index) vertexIndex : u32,
  //       @location(0) position: vec3f,
  //       @location(1) uv: vec2f,
  //     }
  //
  //     @vertex fn main(
  //       vertexInput: VertexInput,
  //     ) -> VSOutput {
  //       var vsOutput: VSOutput;
  //
  //       // var transformed: vec3f = vec3(
  //       //     vertices.displacement[vertexInput.vertexIndex * 3],
  //       //     vertices.displacement[vertexInput.vertexIndex * 3 + 1],
  //       //     vertices.displacement[vertexInput.vertexIndex * 3 + 2]
  //       // );
  //
  //       var transformed = vertices.displacement[vertexInput.vertexIndex];
  //
  //       vsOutput.position = getOutputPosition(camera, matrices, transformed);
  //       vsOutput.uv = getUVCover(vertexInput.uv, planeTextureMatrix);
  //
  //       return vsOutput;
  //     }
  // `
  //
  // const fragmentShader = /* wgsl */ `
  //   struct VSOutput {
  //       @builtin(position) position: vec4f,
  //       @location(0) uv: vec2f,
  //     };
  //
  //     @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
  //       var texture: vec4f = textureSample(planeTexture, planeTextureSampler, fsInput.uv);
  //
  //       return texture;
  //     }
  // `
  //
  // // set our initial parameters (basic uniforms)
  // const params = {
  //   widthSegments: 20,
  //   shaders: {
  //     vertex: {
  //       code: vertexShader,
  //       entryPoint: 'main',
  //     },
  //     fragment: {
  //       code: fragmentShader,
  //       entryPoint: 'main',
  //     },
  //   },
  //   uniforms: [
  //     {
  //       name: 'uniforms', // could be something else, like "frames"...
  //       label: 'Uniforms',
  //       bindings: {
  //         time: {
  //           type: 'f32', // this means our uniform is a float
  //           value: 0,
  //         },
  //       },
  //     },
  //   ],
  //   storages: [
  //     {
  //       name: 'vertices', // could be something else, like "frames"...
  //       label: 'Vertices',
  //       visibility: 'vertex',
  //       bindings: {
  //         displacement: {
  //           type: 'array<vec3f>',
  //           value: verticesArray.slice(),
  //         },
  //       },
  //     },
  //   ],
  // }
  //
  // const plane = new GPUCurtains.Plane(gpuCurtains, planeElements[0], params)
  //
  // plane
  //   .onReady(() => {
  //     //console.log(plane.material.getAddedShaderCode('vertex'))
  //     //console.log(plane.material.getAddedShaderCode('fragment'))
  //   })
  //   .onRender(() => {
  //     // update our time uniform value
  //     plane.uniforms.time.value++
  //
  //     const result = computePass.getWorkGroupResult({ workGroupName: 'works', bindingName: 'vertices' })
  //
  //     if (result) {
  //       plane.storages.displacement.value.set(result)
  //       plane.storages.displacement.shouldUpdate = true
  //     }
  //
  //     plane.rotation.y += 0.01
  //   })
  //
  // // TEST
  // console.log(plane.material, gpuCurtains)
})
