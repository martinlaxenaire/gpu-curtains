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

  console.log(initialParticlePosition, initialParticleVelocity)

  const computeBoids = /* wgsl */ `
    @compute @workgroup_size(64) fn main(
      @builtin(global_invocation_id) GlobalInvocationID: vec3<u32>
    ) {
      var index = GlobalInvocationID.x;
      
      var vPos = particles[index].position;
      var vVel = particles[index].velocity;
      
      var cMass = vec2(0.0);
      var cVel = vec2(0.0);
      var colVel = vec2(0.0);
      var cMassCount = 0u;
      var cVelCount = 0u;
      var pos : vec2<f32>;
      var vel : vec2<f32>;
      var minSystemSize: f32 = min(params.systemSize.x, params.systemSize.y);
      
      var particlesArrayLength = arrayLength(&particles);
    
      for (var i = 0u; i < particlesArrayLength; i++) {
        if (i == index) {
          continue;
        }
        
        pos = particles[i].position.xy;
        vel = particles[i].velocity.xy;
        
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
      particles[index].position = vPos;
      particles[index].velocity = vVel;
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
    dispatchSize: Math.ceil(numParticles / 64), // Note that we divide the vertex count by the workgroup_size!
    inputs: {
      uniforms: {
        params: {
          //name: 'params',
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
      },
      storages: {
        particles: {
          label: 'Particle',
          access: 'read_write', // we want a readable AND writable buffer!
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
      },
    },
  })

  console.log(computePass, computePass.material, computePass.material.getBindingByName('particles'))

  computePass
    .onReady(() => {
      // useful to get the WGSL struct and variables code generated based on input bindings
      console.log(computePass.material.getAddedShaderCode('compute'))
    })
    .onAfterResize(() => {
      const cameraRatio = gpuCurtains.renderer.camera.screenRatio.height * particleShrinkScale
      const screenRatio = gpuCurtains.boundingRect.width / gpuCurtains.boundingRect.height
      computePass.uniforms.params.systemSize.value.set(cameraRatio * screenRatio, cameraRatio)
    })

  const meshVs = /* wgsl */ `  
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
      @location(1) normal: vec3f,
    };

    @vertex fn main(
      attributes: Attributes,
    ) -> VSOutput {    
      var vsOutput : VSOutput;
      
      var transformed: vec3f = attributes.position + vec3(attributes.instancePosition.xy, 0);
              
      vsOutput.position = getOutputPosition(camera, matrices, transformed);
      vsOutput.uv = attributes.uv;
      vsOutput.normal = attributes.normal;
      
      return vsOutput;
    }
  `

  const meshFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
      @location(1) normal: vec3f,
    };
  
    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      // normals
      return vec4(fsInput.normal * 0.5 + 0.5, 1.0);
    }
  `

  const sphereGeometry = new GPUCurtains.SphereGeometry({
    instancesCount: numParticles,
    vertexBuffers: [
      {
        stepMode: 'instance',
        name: 'instanceAttributes',
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
    label: 'Sphere mesh',
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

  sphereMesh
    .onReady(() => {
      //console.log(cubeMesh.material.getAddedShaderCode('vertex'))
    })
    .onRender(() => {
      const instanceVertexBuffer = sphereMesh.geometry.getVertexBufferByName('instanceAttributes')
      const particleBuffer = computePass.material.getBindingByName('particles')

      instanceVertexBuffer.buffer = particleBuffer?.buffer
    })
})
