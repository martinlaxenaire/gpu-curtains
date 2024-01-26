import {
  BindGroup,
  BufferBinding,
  ComputePass,
  GPUCurtains,
  Mesh,
  SphereGeometry,
  Vec2,
} from '../../dist/gpu-curtains.mjs'

// Port of https://webgpu.github.io/webgpu-samples/samples/computeBoids

window.addEventListener('load', async () => {
  // lerp
  const lerp = (start = 0, end = 1, amount = 0.1) => {
    return (1 - amount) * start + amount * end
  }

  // set up our WebGL context and append the canvas to our wrapper
  const gpuCurtains = new GPUCurtains({
    container: '#canvas',
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
  })

  gpuCurtains.onError(() => {
    document.body.classList.add('no-curtains')
  })

  await gpuCurtains.setDevice()

  // number of particles instances
  const numParticles = 2500
  // how much we're going to shrink the original geometry
  const particleShrinkScale = 30

  // camera screen ratio depends on screen size, fov and camera position
  const cameraRatio = gpuCurtains.camera.screenRatio.height * particleShrinkScale * 0.5

  const screenRatio = gpuCurtains.boundingRect.width / gpuCurtains.boundingRect.height
  const systemSize = new Vec2(cameraRatio * screenRatio, cameraRatio)

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
      
      var vPos = particlesA[index].position;
      var vVel = particlesA[index].velocity;
      
      var mouseVel = vec2(0.0);
      var cMass = vec2(0.0);
      var cVel = vec2(0.0);
      var colVel = vec2(0.0);
      var cMassCount = 0u;
      var cVelCount = 0u;
      var pos : vec2<f32>;
      var vel : vec2<f32>;
      var minSystemSize: f32 = min(params.systemSize.x, params.systemSize.y);
      
      var particlesArrayLength = arrayLength(&particlesA);
      
      if(distance(vPos, params.mousePosition) < minSystemSize * params.mouseRadius) {
        mouseVel += (vPos - params.mousePosition) * params.mouseVelocity * minSystemSize;
      } 
    
      for (var i = 0u; i < particlesArrayLength; i++) {
        if (i == index) {
          continue;
        }
        
        pos = particlesA[i].position.xy;
        vel = particlesA[i].velocity.xy;
        
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
      
      vVel += mouseVel;
      
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
      particlesB[index].position = vPos;
      particlesB[index].velocity = vVel;
    }
  `

  // we're going to use ping pong 2 storage buffers (one with read-only access, the other with read/write access)
  // and 2 bind groups with those buffers swapped

  // first our uniform buffer
  const uniformsBufferBinding = new BufferBinding({
    bindingType: 'uniform',
    visibility: 'compute',
    name: 'params',
    label: 'SimParams',
    struct: {
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
        value: 0.1,
      },
      rule2Distance: {
        type: 'f32',
        value: 0.025,
      },
      rule3Distance: {
        type: 'f32',
        value: 0.025,
      },
      rule1Scale: {
        type: 'f32',
        value: 0.02,
      },
      rule2Scale: {
        type: 'f32',
        value: 0.05,
      },
      rule3Scale: {
        type: 'f32',
        value: 0.005,
      },
      mousePosition: {
        type: 'vec2f',
        value: new Vec2(),
      },
      mouseVelocity: {
        type: 'f32',
        value: 0,
      },
      mouseRadius: {
        type: 'f32',
        value: 0.25,
      },
    },
  })

  // the read-only storage buffer
  const particlesBufferBindingA = new BufferBinding({
    label: 'ParticleA',
    name: 'particlesA',
    bindingType: 'storage',
    access: 'read', // we want a read only buffer
    visibility: 'compute',
    struct: {
      position: {
        type: 'array<vec2f>',
        value: initialParticlePosition,
      },
      velocity: {
        type: 'array<vec2f>',
        value: initialParticleVelocity,
      },
    },
  })

  // the read/write storage buffer
  const particlesBufferBindingB = new BufferBinding({
    label: 'ParticleB',
    name: 'particlesB',
    bindingType: 'storage',
    access: 'read_write', // we want a readable AND writable buffer!
    visibility: 'compute',
    struct: {
      position: {
        type: 'array<vec2f>',
        value: initialParticlePosition,
      },
      velocity: {
        type: 'array<vec2f>',
        value: initialParticleVelocity,
      },
    },
  })

  // create a first bind group with all of that
  const particleBindGroupA = new BindGroup(gpuCurtains, {
    label: 'Particle A bind group',
    bindings: [uniformsBufferBinding, particlesBufferBindingA, particlesBufferBindingB],
  })

  // create bind group & its layout
  particleBindGroupA.createBindGroup()

  // now create a second one, with the same bind group layout but with the storage buffers swapped
  const particleBindGroupB = particleBindGroupA.clone({
    bindings: [uniformsBufferBinding, particlesBufferBindingB, particlesBufferBindingA],
    keepLayout: true,
  })

  // the compute pass
  const computeBoidsPass = new ComputePass(gpuCurtains, {
    label: 'Compute test',
    shaders: {
      compute: {
        code: computeBoids,
      },
    },
    bindGroups: [particleBindGroupA],
  })

  let pingPong = 0

  // use a custom render function
  // here the pipeline has already been set
  // we just have to set the bind groups and dispatch the work groups as we want
  computeBoidsPass
    .useCustomRender((pass) => {
      // bind group ping pong
      pass.setBindGroup(
        particleBindGroupA.index,
        pingPong % 2 === 0 ? particleBindGroupA.bindGroup : particleBindGroupB.bindGroup
      )

      pass.dispatchWorkgroups(Math.ceil(numParticles / 64))

      pingPong++
    })
    .onReady(() => {
      // useful to get the WGSL struct and variables code generated based on input struct
      console.log(computeBoidsPass.material.getAddedShaderCode('compute'))
    })
    .onRender(() => {
      computeBoidsPass.uniforms.params.mouseVelocity.value = lerp(
        computeBoidsPass.uniforms.params.mouseVelocity.value,
        0,
        0.5
      )
    })
    .onAfterResize(() => {
      const cameraRatio = gpuCurtains.camera.screenRatio.height * particleShrinkScale * 0.5
      const screenRatio = gpuCurtains.boundingRect.width / gpuCurtains.boundingRect.height
      computeBoidsPass.uniforms.params.systemSize.value.set(cameraRatio * screenRatio, cameraRatio)
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
              
      vsOutput.position = getOutputPosition(transformed);
      vsOutput.uv = attributes.uv;
      vsOutput.normal = attributes.normal;
      
      return vsOutput;
    }
  `

  const sphereGeometry = new SphereGeometry({
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

  const sphereMesh = new Mesh(gpuCurtains, {
    label: 'Sphere mesh',
    geometry: sphereGeometry,
    shaders: {
      // no fragment shader provided, will fall back to display normal colors
      vertex: {
        code: meshVs,
        entryPoint: 'main',
      },
    },
  })

  sphereMesh.scale.x = 1 / particleShrinkScale
  sphereMesh.scale.y = 1 / particleShrinkScale
  sphereMesh.scale.z = 1 / particleShrinkScale

  sphereMesh.onRender(() => {
    const instanceVertexBuffer = sphereMesh.geometry.getVertexBufferByName('instanceAttributes')

    // ping pong our buffers here
    // always send to the instance positions buffer the one onto which we've just written
    const particleBuffer = pingPong % 2 === 0 ? particlesBufferBindingB : particlesBufferBindingA

    instanceVertexBuffer.buffer = particleBuffer?.buffer
  })

  // mouse interaction
  const mousePosition = new Vec2(Infinity)
  const lastMousePosition = mousePosition.clone()

  const onPointerMove = (e) => {
    const { clientX, clientY } = e.targetTouches && e.targetTouches.length ? e.targetTouches[0] : e

    mousePosition.set(clientX / gpuCurtains.boundingRect.width, 1 - clientY / gpuCurtains.boundingRect.height)

    computeBoidsPass.uniforms.params.mousePosition.value
      .copy(mousePosition)
      .multiplyScalar(2)
      .addScalar(-1)
      .multiply(systemSize)

    computeBoidsPass.uniforms.params.mouseVelocity.value = mousePosition.clone().sub(lastMousePosition).length()

    lastMousePosition.copy(mousePosition)
  }

  window.addEventListener('mousemove', onPointerMove)
  window.addEventListener('touchmove', onPointerMove)
})
