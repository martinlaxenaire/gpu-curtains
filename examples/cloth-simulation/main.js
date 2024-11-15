import {
  BindGroup,
  ComputePass,
  GPUCurtains,
  Plane,
  PlaneGeometry,
  Vec2,
  Vec3,
  Raycaster,
} from '../../dist/esm/index.mjs'

// Port of https://github.com/Yuu6883/WebGPUDemo

// cloth sim compute
const computeClothSim = /* wgsl */ ` 
  // Get / set the position / velocity / force vectors at the given index
  fn getPosition(index: i32) -> vec4f {
    return clothVertex[index].position;
  }
  
  fn setPosition(index: i32, value: vec4f) {
    clothVertex[index].position = value;
  }
  
  fn getNormal(index: i32) -> vec4f {
    return clothVertex[index].normal;
  }
  
  fn setNormal(index: i32, value: vec4f) {
    clothVertex[index].normal = value;
  }
  
  fn getVelocity(index: i32) -> vec4f {
    return clothVertex[index].velocity;
  }
  
  fn setVelocity(index: i32, value: vec4f) {
    clothVertex[index].velocity = value;
  }
  
  fn getForce(index: i32) -> vec4f {
    return clothVertex[index].force;
  }
  
  fn setForce(index: i32, value: vec4f) {
    clothVertex[index].force = value;
  }
  
  const TILE_SIZE = 16;
  const INNER_TILE = 14u;
  
  /** FORCES **/
  
  struct ClothPointShared {
    position: vec4<f32>,
    velocity: vec4<f32>
  }
  
  var<private> force: vec3<f32>;
  var<private> p1: vec3<f32>;
  var<private> v1: vec3<f32>;
  
  const SQRT2 = 1.4142135623730951;
  const EPSIL = 0.0001;
  
  fn spring_damper(p2: vec4<f32>, v2: vec4<f32>, rest_length: f32) {
    // Empty padded point
    if (v2.w < 0.0) {
      return;
    }

    let delta = p2.xyz - p1;
    let len = length(delta);

    if (len < EPSIL) {
      return;
    }

    let dir = normalize(delta);

    // Spring force
    var springConstant: f32 = dimension.size.x * dimension.size.y;
    force = force + springConstant * (len - rest_length) * dir;

    // Damper force
    let v_close = dot(v1 - v2.xyz, dir);
    force = force - params.dampingConstant * v_close * dir;
  }
  
  const AIR_DENSITY = 1.225;
  const DRAG_COEFFI = 1.5;
  
  fn aerodynamic(p2: ClothPointShared, p3: ClothPointShared) {
    // Empty padded points
    if (p2.velocity.w < 0.0 || p3.velocity.w < 0.0) {
      return;
    }

    let surf_v = (v1 + p2.velocity.xyz + p3.velocity.xyz) / 3.0;
        
    // add mouse interaction to wind
    let distanceStrength = (1.0 - min(1.0, distance(interaction.pointerPosition, p1.xy) / interaction.pointerSize));
    var pointerEffect = interaction.pointerStrength * pow(distanceStrength, 1.5);
    
    var interactionForce: vec3f =
      interaction.wind
      + pointerEffect * vec3(interaction.pointerVelocity, -1.0 * length(interaction.pointerVelocity));
    
    let delta_v = surf_v - interactionForce;
    
    let len = length(delta_v);

    if (len < EPSIL) {
      return;
    }

    let dir = normalize(delta_v);

    let prod = cross(p2.position.xyz - p1, p3.position.xyz - p1);

    if (length(prod) < EPSIL) {
      return;
    }

    let norm = normalize(prod);
    let area = length(prod) / 2.0 * dot(norm, dir);

    force = force + -0.5 * AIR_DENSITY * len * len * DRAG_COEFFI * area * norm / 3.9;
  }
  
  var<workgroup> tile : array<array<ClothPointShared, 16>, 16>;

  @compute @workgroup_size(TILE_SIZE, TILE_SIZE, 1) fn calc_forces(
    @builtin(workgroup_id)         blockIdx :  vec3<u32>,
    @builtin(local_invocation_id)  threadIdx : vec3<u32>
  ) {
    let tx = threadIdx.x;
    let ty = threadIdx.y;

    let row_o = i32(blockIdx.y * INNER_TILE + ty);
    let col_o = i32(blockIdx.x * INNER_TILE + tx);

    // Could be -1 so it's all casted to signed
    let row_i = i32(row_o) - 1;
    let col_i = i32(col_o) - 1;

    let out_w = i32(dimension.size.x + 1);
    let out_h = i32(dimension.size.y + 1);
    
    // Load tile
    if (row_i >= 0 && row_i < out_h && 
      col_i >= 0 && col_i < out_w) {
      tile[ty][tx].position = getPosition(row_i * out_w + col_i);
      tile[ty][tx].velocity = getVelocity(row_i * out_w + col_i);
    } else {          
      tile[ty][tx].position = vec4<f32>(0.0, 0.0, 0.0, -1.0);
      tile[ty][tx].velocity = vec4<f32>(0.0, 0.0, 0.0, -1.0);
    }

    workgroupBarrier();
    
    let cx = tx + 1u;
    let cy = ty + 1u;

    // Out of grid || out of tile || fixed point
    if (row_o >= out_h || col_o >= out_w || 
      tx >= INNER_TILE || ty >= INNER_TILE ||
      tile[cy][cx].position.w < 0.0) {
      return;
    }
    
    force = params.gravity * params.mass;
    
    p1 = tile[cy][cx].position.xyz;
    v1 = tile[cy][cx].velocity.xyz;
    
    let rest_len = 2.0 / min(dimension.size.x, dimension.size.y);
    let diag_len = rest_len * SQRT2;

    // 8x spring damper force accumulation 
    spring_damper(tile[cy - 1u][cx - 1u].position, tile[cy - 1u][cx - 1u].velocity, diag_len);
    spring_damper(tile[cy - 1u][cx - 0u].position, tile[cy - 1u][cx - 0u].velocity, rest_len);
    spring_damper(tile[cy - 1u][cx + 1u].position, tile[cy - 1u][cx + 1u].velocity, diag_len);
    
    spring_damper(tile[cy][cx - 1u].position, tile[cy][cx - 1u].velocity, rest_len);
    spring_damper(tile[cy][cx + 1u].position, tile[cy][cx + 1u].velocity, rest_len);
    
    spring_damper(tile[cy + 1u][cx - 1u].position, tile[cy + 1u][cx - 1u].velocity, diag_len);
    spring_damper(tile[cy + 1u][cx - 0u].position, tile[cy + 1u][cx - 0u].velocity, rest_len);
    spring_damper(tile[cy + 1u][cx + 1u].position, tile[cy + 1u][cx + 1u].velocity, diag_len);
    
    
    // 8 Triangles aerodynamic force accumulation
    aerodynamic(tile[cy - 1u][cx - 1u], tile[cy - 1u][cx - 0u]);
    aerodynamic(tile[cy - 1u][cx - 0u], tile[cy - 1u][cx + 1u]);
    aerodynamic(tile[cy - 1u][cx + 1u], tile[cy - 0u][cx + 1u]);
    aerodynamic(tile[cy - 0u][cx + 1u], tile[cy + 1u][cx + 1u]);
    aerodynamic(tile[cy + 1u][cx + 1u], tile[cy + 1u][cx + 0u]);
    aerodynamic(tile[cy + 1u][cx + 0u], tile[cy + 1u][cx - 1u]);
    aerodynamic(tile[cy + 1u][cx - 1u], tile[cy + 0u][cx - 1u]);
    aerodynamic(tile[cy + 0u][cx - 1u], tile[cy - 1u][cx - 1u]);
    
    setForce(row_o * out_w + col_o, vec4<f32>(force, 0.0));
  }
  
  /** NORMALS **/
  
  var<private> accum_norm: vec3<f32>;

  fn triangle_normal(p2: vec4<f32>, p3: vec4<f32>) {
    if (p2.w < 0.0 || p3.w < 0.0) {
      return;
    }

    let prod = cross(p3.xyz - p1, p2.xyz - p1);

    if (length(prod) < EPSIL) {
      return;
    }

    let norm = normalize(prod);

    accum_norm = accum_norm + norm;
  }
  
  var<workgroup> p_tile : array<array<vec4<f32>, 16>, 16>;
  
  @compute @workgroup_size(TILE_SIZE, TILE_SIZE, 1) fn calc_normal(
    @builtin(workgroup_id)        blockIdx :  vec3<u32>,
    @builtin(local_invocation_id) threadIdx : vec3<u32>
  ) {
    let tx = threadIdx.x;
    let ty = threadIdx.y;

    let row_o = i32(blockIdx.y * INNER_TILE + ty);
    let col_o = i32(blockIdx.x * INNER_TILE + tx);

    // Could be -1 so it's all casted to signed
    let row_i = i32(row_o) - 1;
    let col_i = i32(col_o) - 1;

    let out_w = i32(dimension.size.x + 1);
    let out_h = i32(dimension.size.y + 1);
    
    // Load position tile
    if (row_i >= 0 && row_i < out_h && 
      col_i >= 0 && col_i < out_w) {
      p_tile[ty][tx] = getPosition(row_i * out_w + col_i);
    } else {
      p_tile[ty][tx] = vec4<f32>(0.0, 0.0, 0.0, -1.0);
    }

    workgroupBarrier();

    let cx = tx + 1u;
    let cy = ty + 1u;

    // Out of grid || out of tile
    if (row_o >= out_h || col_o >= out_w || 
      tx >= INNER_TILE || ty >= INNER_TILE) {
      return;
    }
    
    p1 = p_tile[cy][cx].xyz;

    accum_norm = vec3<f32>(0.0);

    // 8 Triangles normal accumulation
    triangle_normal(p_tile[cy - 1u][cx - 1u], p_tile[cy - 1u][cx - 0u]);
    triangle_normal(p_tile[cy - 1u][cx - 0u], p_tile[cy - 1u][cx + 1u]);
    triangle_normal(p_tile[cy - 1u][cx + 1u], p_tile[cy - 0u][cx + 1u]);
    triangle_normal(p_tile[cy - 0u][cx + 1u], p_tile[cy + 1u][cx + 1u]);
    triangle_normal(p_tile[cy + 1u][cx + 1u], p_tile[cy + 1u][cx + 0u]);
    triangle_normal(p_tile[cy + 1u][cx + 0u], p_tile[cy + 1u][cx - 1u]);
    triangle_normal(p_tile[cy + 1u][cx - 1u], p_tile[cy + 0u][cx - 1u]);
    triangle_normal(p_tile[cy + 0u][cx - 1u], p_tile[cy - 1u][cx - 1u]);

    // 4 Triangle normal accumulation
    // triangle_normal(p_tile[cy - 1u][cx], p_tile[cy][cx - 1u]);
    // triangle_normal(p_tile[cy][cx - 1u], p_tile[cy + 1u][cx]);
    // triangle_normal(p_tile[cy + 1u][cx], p_tile[cy][cx + 1u]);
    // triangle_normal(p_tile[cy][cx + 1u], p_tile[cy - 1u][cx]);

    accum_norm = accum_norm;

    if (length(accum_norm) < EPSIL) {
      return;
    }

    let norm = normalize(accum_norm);
    setNormal(row_o * out_w + col_o, vec4<f32>(norm, 0.0));
    
    let position = getPosition(row_o * out_w + col_o);
    setForce(row_o * out_w + col_o, position + vec4<f32>(norm, 0.0));
  }
  
  /** UPDATE **/
  
  @compute @workgroup_size(256) fn update(
    @builtin(workgroup_id)        blockIdx :  vec3<u32>,
    @builtin(local_invocation_id) threadIdx : vec3<u32>
  ) {
    let offset = i32(blockIdx.x * 256u + threadIdx.x);
    
    let out_w = i32(dimension.size.x + 1);
    let out_h = i32(dimension.size.y + 1);

    if (offset >= out_w * out_w) {
      return;
    }

    let pointPosition = getPosition(offset);
    let pointVelocity = getVelocity(offset);

    if (pointPosition.w < 0.0) {
      setVelocity(offset, vec4<f32>(0.0));
      // Not necessary but...
      setForce(offset, vec4<f32>(0.0));
      return;
    }

    let a = getForce(offset) / params.mass;
            
    setVelocity(offset, pointVelocity + a * params.deltaTime);
    
    let pos = pointPosition + getVelocity(offset) * params.deltaTime;
    setPosition(offset, vec4<f32>(pos.x, max(pos.y, params.floor), pos.zw));
  }
`

window.addEventListener('load', async () => {
  // set our main GPUCurtains instance it will handle everything we need
  // a WebGPU device and a renderer with its scene, requestAnimationFrame, resize and scroll events...
  const gpuCurtains = new GPUCurtains({
    container: '#canvas',
    watchScroll: false, // no need to listen for the scroll in this example
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
  })

  gpuCurtains.onError(() => {
    // display original medias
    document.body.classList.add('no-curtains')
  })

  await gpuCurtains.setDevice()

  const simulationSpeed = 2

  const clothDefinition = new Vec2(40)

  const clothGeometry = new PlaneGeometry({
    widthSegments: clothDefinition.x,
    heightSegments: clothDefinition.y,
  })

  const positionArray = clothGeometry.getAttributeByName('position').array.slice()

  const vertexPositionArray = new Float32Array((positionArray.length * 4) / 3)

  const normalPositionArray = new Float32Array(vertexPositionArray.length)
  const vertexVelocityArray = new Float32Array(vertexPositionArray.length)
  const vertexForceArray = new Float32Array(vertexPositionArray.length)

  // padded!
  for (let i = 0, j = 0; i < vertexPositionArray.length; i += 4, j += 3) {
    vertexPositionArray[i] = positionArray[j]
    vertexPositionArray[i + 1] = positionArray[j + 1]
    vertexPositionArray[i + 2] = positionArray[j + 2]

    const xPosIndex = Math.round((positionArray[j] + 1) * 0.5 * clothDefinition.x)
    const isFixed = positionArray[j + 1] === 1 && xPosIndex % 4 === 0

    vertexPositionArray[i + 3] = isFixed ? -1 : 0 // fixed point

    // explicitly set normals
    normalPositionArray[i] = 0
    normalPositionArray[i + 1] = 0
    normalPositionArray[i + 2] = 1
  }

  const computeBindGroup = new BindGroup(gpuCurtains.renderer, {
    label: 'Cloth simulation compute bind group',
    uniforms: {
      dimension: {
        struct: {
          size: {
            type: 'vec2f',
            value: clothDefinition,
          },
        },
      },
      params: {
        struct: {
          deltaTime: {
            type: 'f32',
            value: 0.001 * simulationSpeed,
          },
          mass: {
            type: 'f32',
            value: 1,
          },
          dampingConstant: {
            type: 'f32',
            value: 50,
          },
          floor: {
            type: 'f32',
            value: -1.25,
          },
          gravity: {
            type: 'vec3f',
            value: new Vec3(0, -0.0981, 0),
          },
        },
      },
      interaction: {
        struct: {
          pointerPosition: {
            type: 'vec2f',
            value: new Vec2(Infinity),
          },
          pointerVelocity: {
            type: 'vec2f',
            value: new Vec2(0), // pointer velocity divided by plane size
          },
          pointerSize: {
            type: 'f32',
            value: 0.85, // 1 is full plane
          },
          pointerStrength: {
            type: 'f32',
            value: 250,
          },
          wind: {
            type: 'vec3f',
            value: new Vec3(0, 0, 0),
          },
        },
      },
    },
    storages: {
      clothVertex: {
        access: 'read_write', // we want a readable AND writable buffer!
        usage: ['vertex'], // we're going to use this buffer as a vertex buffer along default usages
        struct: {
          position: {
            type: 'array<vec4f>',
            value: vertexPositionArray,
          },
          normal: {
            type: 'array<vec4f>',
            value: normalPositionArray,
          },
          force: {
            type: 'array<vec4f>',
            value: vertexForceArray,
          },
          velocity: {
            type: 'array<vec4f>',
            value: vertexVelocityArray,
          },
        },
      },
    },
  })

  // first our compute pass
  const computeForcesPass = new ComputePass(gpuCurtains, {
    label: 'Compute forces',
    shaders: {
      compute: {
        code: computeClothSim,
        entryPoint: 'calc_forces',
      },
    },
    autoRender: false, // we will manually take care of rendering
    bindGroups: [computeBindGroup],
    dispatchSize: [Math.ceil((clothDefinition.x + 1) / 14), Math.ceil((clothDefinition.y + 1) / 14)],
  })

  const computeUpdatePass = new ComputePass(gpuCurtains, {
    label: 'Compute update',
    shaders: {
      compute: {
        code: computeClothSim,
        entryPoint: 'update',
      },
    },
    autoRender: false, // we will manually take care of rendering
    bindGroups: [computeBindGroup],
    dispatchSize: [Math.ceil(((clothDefinition.x + 1) * (clothDefinition.y + 1)) / 256)],
  })

  const computeNormalPass = new ComputePass(gpuCurtains, {
    label: 'Compute normal',
    shaders: {
      compute: {
        code: computeClothSim,
        entryPoint: 'calc_normal',
      },
    },
    autoRender: false, // we will manually take care of rendering
    bindGroups: [computeBindGroup],
    dispatchSize: [Math.ceil((clothDefinition.x + 1) / 14), Math.ceil((clothDefinition.y + 1) / 14)],
  })

  // now use renderer onBeforeRender callback to render our compute passes
  // nb sims compute per render impacts the speed at which the simulation runs
  const nbSimsComputePerRender = Math.min(75, Math.ceil(150 / simulationSpeed))

  // add a task to our renderer onBeforeRenderScene tasks queue manager
  gpuCurtains.renderer.onBeforeRenderScene.add((commandEncoder) => {
    // set bind groups if needed
    if (!computeForcesPass.ready) computeForcesPass.onBeforeRenderPass()
    if (!computeUpdatePass.ready) computeUpdatePass.onBeforeRenderPass()
    if (!computeNormalPass.ready) computeNormalPass.onBeforeRenderPass()

    // now if the compute passes are not ready, do not render them
    if (!computeForcesPass.ready || !computeUpdatePass.ready || !computeNormalPass.ready) return

    for (let i = 0; i < nbSimsComputePerRender; i++) {
      const forcePass = commandEncoder.beginComputePass()
      computeForcesPass.render(forcePass)
      forcePass.end()

      const updatePass = commandEncoder.beginComputePass()
      computeUpdatePass.render(updatePass)
      updatePass.end()
    }

    const normalPass = commandEncoder.beginComputePass()
    computeNormalPass.render(normalPass)
    normalPass.end()
  })

  const clothVs = /* wgsl */ `
      struct VSOutput {
        @builtin(position) position: vec4f,
        @location(0) uv: vec2f,
        @location(1) normal: vec3f,
        @location(2) force: vec3f,
        @location(3) velocity: vec3f,
      };
      
      @vertex fn main(
        attributes: Attributes,
      ) -> VSOutput {
        var vsOutput: VSOutput;
                
        var transformed: vec3f = attributes.clothPosition.xyz;
        
        vsOutput.position = getOutputPosition(transformed);
      
        vsOutput.uv = attributes.uv;
        vsOutput.normal = attributes.clothNormal.xyz;
        vsOutput.force = attributes.clothForce.xyz;
        vsOutput.velocity = attributes.clothVelocity.xyz;
      
        return vsOutput;
      }
    `

  const clothFs = /* wgsl */ `
      struct VSOutput {
        @builtin(position) position: vec4f,
        @location(0) uv: vec2f,
        @location(1) normal: vec3f,
        @location(2) force: vec3f,
        @location(3) velocity: vec3f,
      };
      
      fn applyLightning(color: vec3f, normal: vec3f, lightPosition: vec3f) -> vec3f {
        var lightPos: vec3f = normalize(lightPosition);
        var light: f32 = smoothstep(0.45, 1.0, dot(normal, lightPos));

        var lightStrength: f32 = 0.35;
        var ambientLight: f32 = 1.0 - lightStrength;
        return color.rgb * light * lightStrength + color.rgb * ambientLight;
      }
      
      @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
        var color: vec4f;
      
        var shading: vec3f = vec3(0.5);
        
        //var shadedColor: vec3f = applyLightning(shading, fsInput.normal, vec3(0.3, 0.3, 1.0));
        //color: vec4f = vec4(shadedColor, 1.0);
        
        // debug normals
        color = vec4(normalize(fsInput.normal) * 0.5 + 0.5, 1.0);
        
        // debug force
        //color = vec4(normalize(fsInput.force) * 0.5 + 0.5, 1.0);
                      
        return color;
      }
    `

  clothGeometry.addVertexBuffer({
    name: 'clothAttributes',
    // add the compute bind group vertex buffer right away
    buffer: computeBindGroup.getBindingByName('clothVertex')?.buffer,
    // since we passed a buffer, we do not need to specify arrays for the attributes
    attributes: [
      {
        name: 'clothPosition',
        type: 'vec4f',
        bufferFormat: 'float32x4',
        size: 4,
        //array: vertexPositionArray,
      },
      {
        name: 'clothNormal',
        type: 'vec4f',
        bufferFormat: 'float32x4',
        size: 4,
        //array: normalPositionArray,
      },
      {
        name: 'clothForce',
        type: 'vec4f',
        bufferFormat: 'float32x4',
        size: 4,
        //array: vertexForceArray,
      },
      {
        name: 'clothVelocity',
        type: 'vec4f',
        bufferFormat: 'float32x4',
        size: 4,
        //array: vertexVelocityArray,
      },
    ],
  })

  const params = {
    geometry: clothGeometry,
    shaders: {
      vertex: {
        code: clothVs,
        entryPoint: 'main',
      },
      fragment: {
        code: clothFs,
        entryPoint: 'main',
      },
    },
    cullMode: 'none',
  }

  const plane = new Plane(gpuCurtains, '#cloth', params)

  const raycaster = new Raycaster(gpuCurtains)

  const pointer = new Vec2(Infinity)
  const velocity = new Vec2(0)
  const minVelocity = new Vec2(-100)
  const maxVelocity = new Vec2(100)
  let pointerTimer

  const onPointerMove = (e) => {
    const { clientX, clientY } = e.targetTouches && e.targetTouches.length ? e.targetTouches[0] : e

    if (pointer.x === Infinity) {
      velocity.set(0)
    } else {
      velocity.set(clientX - pointer.x, clientY - pointer.y)
    }

    velocity.clamp(minVelocity, maxVelocity)

    pointer.set(clientX, clientY)

    if (plane && computeForcesPass) {
      if (pointerTimer) clearTimeout(pointerTimer)

      // we could be a bit smarter here and just compute the vertex position
      // based on the pointer position and the plane position, and convert to the [-1, 1] range
      // but for the sake of the demo, let's use a raycaster
      raycaster.setFromMouse(e)

      const intersections = raycaster.intersectObject(plane)

      if (intersections.length) {
        const closestIntersection = intersections[0]
        computeForcesPass.uniforms.interaction.pointerPosition.value.set(
          closestIntersection.localPoint.x,
          closestIntersection.localPoint.y
        )
      } else {
        computeForcesPass.uniforms.interaction.pointerPosition.value.copy(Infinity)
      }

      computeForcesPass.uniforms.interaction.pointerVelocity.value.set(
        velocity.x / plane.boundingRect.width,
        velocity.y / plane.boundingRect.height
      )

      pointerTimer = setTimeout(() => {
        computeForcesPass.uniforms.interaction.pointerPosition.value.set(Infinity)
        computeForcesPass.uniforms.interaction.pointerVelocity.value.set(0)
      }, 25)
    }
  }

  window.addEventListener('mousemove', onPointerMove)
  window.addEventListener('touchmove', onPointerMove)
})
