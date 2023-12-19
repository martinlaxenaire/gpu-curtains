import { BindGroup, BufferBinding, ComputePass, Mesh, SphereGeometry, Vec2 } from '../../dist/gpu-curtains.js'

export class TestComputePasses {
  constructor({ gpuCurtains }) {
    this.gpuCurtains = gpuCurtains

    this.init()
  }

  init() {
    // number of particles instances
    this.numParticles = 2500
    // how much we're going to shrink the original geometry
    this.particleShrinkScale = 40

    // camera screen ratio depends on screen size, fov and camera position
    this.cameraRatio = this.gpuCurtains.camera.screenRatio.height * this.particleShrinkScale * 0.5

    this.screenRatio = this.gpuCurtains.boundingRect.width / this.gpuCurtains.boundingRect.height
    this.systemSize = new Vec2(this.cameraRatio * this.screenRatio, this.cameraRatio)

    this.initialParticlePosition = new Float32Array(this.numParticles * 2)
    this.initialParticleVelocity = new Float32Array(this.numParticles * 2)
    for (let i = 0; i < this.numParticles; ++i) {
      this.initialParticlePosition[2 * i + 0] = 2 * this.systemSize.x * (Math.random() - 0.5)
      this.initialParticlePosition[2 * i + 1] = 2 * this.systemSize.y * (Math.random() - 0.5)

      this.initialParticleVelocity[2 * i + 0] = 2 * this.systemSize.x * (Math.random() - 0.5) * 0.1
      this.initialParticleVelocity[2 * i + 1] = 2 * this.systemSize.y * (Math.random() - 0.5) * 0.1
    }

    const computeBoids = /* wgsl */ `
    @compute @workgroup_size(64) fn main(
      @builtin(global_invocation_id) GlobalInvocationID: vec3<u32>
    ) {
      var index = GlobalInvocationID.x;
      
      var vPos = particlesA[index].position;
      var vVel = particlesA[index].velocity;
      
      var cMass = vec2(0.0);
      var cVel = vec2(0.0);
      var colVel = vec2(0.0);
      var cMassCount = 0u;
      var cVelCount = 0u;
      var pos : vec2<f32>;
      var vel : vec2<f32>;
      var minSystemSize: f32 = min(params.systemSize.x, params.systemSize.y);
      
      var particlesArrayLength = arrayLength(&particlesA);
    
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
          value: this.systemSize,
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
          value: this.initialParticlePosition,
        },
        velocity: {
          type: 'array<vec2f>',
          value: this.initialParticleVelocity,
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
          value: this.initialParticlePosition,
        },
        velocity: {
          type: 'array<vec2f>',
          value: this.initialParticleVelocity,
        },
      },
    })

    // create a first bind group with all of that
    this.particleBindGroupA = new BindGroup(this.gpuCurtains, {
      label: 'Particle A bind group',
      bindings: [uniformsBufferBinding, particlesBufferBindingA, particlesBufferBindingB],
    })

    // create bind group & its layout
    this.particleBindGroupA.createBindGroup()

    // now create a second one, with the same bind group layout but with the storage buffers swapped
    this.particleBindGroupB = this.particleBindGroupA.clone({
      bindings: [uniformsBufferBinding, particlesBufferBindingB, particlesBufferBindingA],
      keepLayout: true,
    })

    // the compute pass
    this.computeBoidsPass = new ComputePass(this.gpuCurtains, {
      label: 'Compute test',
      shaders: {
        compute: {
          code: computeBoids,
        },
      },
      bindGroups: [this.particleBindGroupA],
    })

    let pingPong = 0

    // use a custom render function
    // here the pipeline has already been set
    // we just have to set the bind groups and dispatch the work groups as we want
    this.computeBoidsPass
      .useCustomRender((pass) => {
        // bind group ping pong
        pass.setBindGroup(
          this.particleBindGroupA.index,
          pingPong % 2 === 0 ? this.particleBindGroupA.bindGroup : this.particleBindGroupB.bindGroup
        )

        pass.dispatchWorkgroups(Math.ceil(this.numParticles / 64))

        pingPong++
      })
      .onAfterResize(() => {
        this.cameraRatio = this.gpuCurtains.camera.screenRatio.height * this.particleShrinkScale * 0.5
        this.screenRatio = this.gpuCurtains.boundingRect.width / this.gpuCurtains.boundingRect.height
        this.computeBoidsPass.uniforms.params.systemSize.value.set(
          this.cameraRatio * this.screenRatio,
          this.cameraRatio
        )
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

    this.sphereGeometry = new SphereGeometry({
      instancesCount: this.numParticles,
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
              array: this.initialParticlePosition,
            },
            {
              name: 'instanceVelocity',
              type: 'vec2f',
              bufferFormat: 'float32x2',
              size: 2,
              array: this.initialParticleVelocity,
            },
          ],
        },
      ],
    })

    this.sphereMesh = new Mesh(this.gpuCurtains, {
      label: 'Sphere mesh',
      geometry: this.sphereGeometry,
      shaders: {
        // no fragment shader provided, will fall back to display normal colors
        vertex: {
          code: meshVs,
          entryPoint: 'main',
        },
      },
    })

    this.sphereMesh.scale.x = 1 / this.particleShrinkScale
    this.sphereMesh.scale.y = 1 / this.particleShrinkScale
    this.sphereMesh.scale.z = 1 / this.particleShrinkScale

    this.sphereMesh
      .onReady(() => {
        //console.log(cubeMesh.material.getAddedShaderCode('vertex'))
      })
      .onRender(() => {
        const instanceVertexBuffer = this.sphereMesh.geometry.getVertexBufferByName('instanceAttributes')

        // ping pong our buffers here
        // always send to the instance positions buffer the one onto which we've just written
        const particleBuffer = pingPong % 2 === 0 ? particlesBufferBindingB : particlesBufferBindingA

        instanceVertexBuffer.buffer = particleBuffer?.buffer
      })

    console.log('TEST COMPUTE init', this.gpuCurtains.renderer)
  }

  destroy() {
    this.sphereMesh.remove()
    this.computeBoidsPass.remove()
    this.particleBindGroupB.destroy()

    console.log('TEST COMPUTE destroy', this.gpuCurtains.renderer)
  }
}
