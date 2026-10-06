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
const computeClothSim = (workgroupSize = 16) => /* wgsl */ ` 
/* =========================
   CONSTANTS & HELPERS
   ========================= */

const TILE_SIZE  = ${workgroupSize}u;
const INNER_TILE = ${workgroupSize - 2}u;
const SQRT2      = 1.41421356237;
const EPSIL      = 1e-6;

const AIR_DENSITY = 1.225;
const DRAG_COEFFI = 1.0;

/* =========================
   DATA ACCESS
   ========================= */

fn getPosition(i: i32) -> vec4f { return clothVertex[i].position; }
fn setPosition(i: i32, v: vec4f) { clothVertex[i].position = v; }

fn getPrevPosition(i: i32) -> vec4f { return clothVertex[i].prevPosition; }
fn setPrevPosition(i: i32, v: vec4f) { clothVertex[i].prevPosition = v; }

fn getVelocity(i: i32) -> vec4f { return clothVertex[i].velocity; }
fn setVelocity(i: i32, v: vec4f) { clothVertex[i].velocity = v; }

fn getForce(i: i32) -> vec4f { return clothVertex[i].force; }
fn setForce(i: i32, v: vec4f) { clothVertex[i].force = v; }

fn getNormal(i: i32) -> vec4f { return clothVertex[i].normal; }
fn setNormal(i: i32, v: vec4f) { clothVertex[i].normal = v; }

/* =========================
   SHARED TYPES
   ========================= */

struct ClothPointShared {
  position : vec4f,
  velocity : vec4f
};

var<workgroup> tile : array<array<ClothPointShared, 16>, 16>;

var<private> p1    : vec3f;
var<private> v1    : vec3f;
var<private> force : vec3f;

/* =========================
   SPRING + DAMPER
   ========================= */

fn spring_damper(p: ClothPointShared, restLen: f32) {
  if (p.velocity.w < 0.0) { return; }

  let delta = p.position.xyz - p1;
  let len   = length(delta);
  if (len < EPSIL) { return; }

  let dir = delta / len;

  let fs = params.springConstant * (len - restLen);
  let dv = dot(v1 - p.velocity.xyz, dir);
  let fd = params.dampingConstant * dv;

  force += (fs - fd) * dir;
}

/* =========================
   AERODYNAMICS
   ========================= */

fn aerodynamic(p2: ClothPointShared, p3: ClothPointShared) {
  if (p2.velocity.w < 0.0 || p3.velocity.w < 0.0) { return; }

  let vSurf = (v1 + p2.velocity.xyz + p3.velocity.xyz) / 3.0;

  let dist = distance(interaction.pointerPosition, p1.xy);
  let w    = 1.0 - clamp(dist / interaction.pointerSize, 0.0, 1.0);

  let pointerForce =
    interaction.pointerStrength *
    pow(w, 1.5) *
    vec3(interaction.pointerVelocity, -length(interaction.pointerVelocity));

  let wind = interaction.wind + pointerForce;

  let vRel = vSurf - wind;
  let spd  = length(vRel);
  if (spd < EPSIL) { return; }

  let dir = vRel / spd;

  let e1 = p2.position.xyz - p1;
  let e2 = p3.position.xyz - p1;
  let cp = cross(e1, e2);
  let a2 = length(cp);
  if (a2 < EPSIL) { return; }

  let n = cp / a2;
  let projArea = abs(dot(n, dir)) * a2 * 0.5;

  let drag =
    0.5 * AIR_DENSITY * DRAG_COEFFI * spd * spd * projArea;

  force += -drag * n / 3.0;
}

/* =========================
   FORCE PASS
   ========================= */

@compute @workgroup_size(TILE_SIZE, TILE_SIZE)
fn calc_forces(
  @builtin(workgroup_id) bid : vec3u,
  @builtin(local_invocation_id) tid : vec3u
) {
  let tx = tid.x;
  let ty = tid.y;

  let rowO = i32(bid.y * INNER_TILE + ty);
  let colO = i32(bid.x * INNER_TILE + tx);

  let rowI = rowO - 1;
  let colI = colO - 1;

  let w = i32(dimension.size.x + 1);
  let h = i32(dimension.size.y + 1);

  if (rowI >= 0 && rowI < h && colI >= 0 && colI < w) {
    let i = rowI * w + colI;
    tile[ty][tx].position = getPosition(i);
    tile[ty][tx].velocity = getVelocity(i);
  } else {
    tile[ty][tx].position = vec4(0, 0, 0, -1);
    tile[ty][tx].velocity = vec4(0, 0, 0, -1);
  }

  workgroupBarrier();

  if (tx >= INNER_TILE || ty >= INNER_TILE ||
      rowO >= h || colO >= w ||
      tile[ty + 1u][tx + 1u].position.w < 0.0) {
    return;
  }

  p1 = tile[ty + 1u][tx + 1u].position.xyz;
  v1 = tile[ty + 1u][tx + 1u].velocity.xyz;

  force = params.gravity * params.mass;

  let rest = 2.0 / min(dimension.size.x, dimension.size.y);
  let diag = rest * SQRT2;

  spring_damper(tile[ty + 1u][tx], rest);
  spring_damper(tile[ty + 1u][tx + 2u], rest);
  spring_damper(tile[ty][tx + 1u], rest);
  spring_damper(tile[ty + 2u][tx + 1u], rest);

  spring_damper(tile[ty][tx], diag);
  spring_damper(tile[ty][tx + 2u], diag);
  spring_damper(tile[ty + 2u][tx], diag);
  spring_damper(tile[ty + 2u][tx + 2u], diag);

  aerodynamic(tile[ty][tx], tile[ty][tx + 1u]);
  aerodynamic(tile[ty][tx + 1u], tile[ty][tx + 2u]);
  aerodynamic(tile[ty][tx + 2u], tile[ty + 1u][tx + 2u]);
  aerodynamic(tile[ty + 1u][tx + 2u], tile[ty + 2u][tx + 2u]);
  aerodynamic(tile[ty + 2u][tx + 2u], tile[ty + 2u][tx + 1u]);
  aerodynamic(tile[ty + 2u][tx + 1u], tile[ty + 2u][tx]);
  aerodynamic(tile[ty + 2u][tx], tile[ty + 1u][tx]);
  aerodynamic(tile[ty + 1u][tx], tile[ty][tx]);

  setForce(rowO * w + colO, vec4(force, 0));
}

/* =========================
   VERLET UPDATE
   ========================= */

@compute @workgroup_size(${workgroupSize * workgroupSize})
fn update_verlet(
  @builtin(workgroup_id) bid : vec3u,
  @builtin(local_invocation_id) tid : vec3u
) {
  let i = i32(bid.x * ${workgroupSize * workgroupSize}u + tid.x);
  let w = i32(dimension.size.x + 1);
  let h = i32(dimension.size.y + 1);

  if (i >= w * h) { return; }

  let pos  = getPosition(i);
  if (pos.w < 0.0) { return; }

  let prev = getPrevPosition(i);
  let acc  = getForce(i).xyz / params.mass;
  let dt2  = params.deltaTime * params.deltaTime;

  let next =
    pos.xyz +
    (pos.xyz - prev.xyz) +
    acc * dt2;

  var finalPos = vec3(next.x, max(next.y, params.floor), next.z);

  setPrevPosition(i, vec4(pos.xyz, 0));
  setPosition(i, vec4(finalPos, pos.w));

  setVelocity(
    i,
    vec4((finalPos - prev.xyz) / (2.0 * params.deltaTime), 0)
  );
}

/* =========================
   NORMAL PASS (ONCE / FRAME)
   ========================= */

var<workgroup> p_tile : array<array<vec4f, ${workgroupSize}>, ${workgroupSize}>;
var<private> accum_norm : vec3f;

fn triangle_normal(p2: vec4f, p3: vec4f) {
  if (p2.w < 0.0 || p3.w < 0.0) { return; }
  let n = cross(p3.xyz - p1, p2.xyz - p1);
  if (length(n) > EPSIL) { accum_norm += normalize(n); }
}

@compute @workgroup_size(TILE_SIZE, TILE_SIZE)
fn calc_normal(
  @builtin(workgroup_id) bid : vec3u,
  @builtin(local_invocation_id) tid : vec3u
) {
  let tx = tid.x;
  let ty = tid.y;

  let rowO = i32(bid.y * INNER_TILE + ty);
  let colO = i32(bid.x * INNER_TILE + tx);

  let rowI = rowO - 1;
  let colI = colO - 1;

  let w = i32(dimension.size.x + 1);
  let h = i32(dimension.size.y + 1);

  if (rowI >= 0 && rowI < h && colI >= 0 && colI < w) {
    p_tile[ty][tx] = getPosition(rowI * w + colI);
  } else {
    p_tile[ty][tx] = vec4(0, 0, 0, -1);
  }

  workgroupBarrier();

  if (tx >= INNER_TILE || ty >= INNER_TILE ||
      rowO >= h || colO >= w) {
    return;
  }

  p1 = p_tile[ty + 1u][tx + 1u].xyz;
  accum_norm = vec3(0);

  triangle_normal(p_tile[ty][tx],     p_tile[ty][tx + 1u]);
  triangle_normal(p_tile[ty][tx + 1u], p_tile[ty][tx + 2u]);
  triangle_normal(p_tile[ty][tx + 2u], p_tile[ty + 1u][tx + 2u]);
  triangle_normal(p_tile[ty + 1u][tx + 2u], p_tile[ty + 2u][tx + 2u]);
  triangle_normal(p_tile[ty + 2u][tx + 2u], p_tile[ty + 2u][tx + 1u]);
  triangle_normal(p_tile[ty + 2u][tx + 1u], p_tile[ty + 2u][tx]);
  triangle_normal(p_tile[ty + 2u][tx], p_tile[ty + 1u][tx]);
  triangle_normal(p_tile[ty + 1u][tx], p_tile[ty][tx]);

  if (length(accum_norm) > EPSIL) {
    setNormal(rowO * w + colO, vec4(normalize(accum_norm), 0));
  }
}
`

window.addEventListener('load', async () => {
  // set our main GPUCurtains instance it will handle everything we need
  // a WebGPU device and a renderer with its scene, requestAnimationFrame, resize and scroll events...
  const gpuCurtains = new GPUCurtains({
    container: '#canvas',
    watchScroll: false, // no need to listen for the scroll in this example
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
    adapterOptions: {
      featureLevel: 'compatibility',
    },
    // Try requesting max limits
    requestAdapterLimits: ['maxComputeInvocationsPerWorkgroup', 'maxComputeWorkgroupSizeX'],
  })

  gpuCurtains.onError(() => {
    // display original medias
    document.body.classList.add('no-curtains')
  })

  await gpuCurtains.setDevice()

  const frameDt = 1 / 60
  // number of compute dispatchs per frame
  let simulationSteps = 25
  let mass = 0.5
  let springConstant = 65_000
  let dampingRatio = 0.8
  const { maxComputeInvocationsPerWorkgroup } = gpuCurtains.deviceManager.device.limits
  // Beware of actual compatibility mode limits
  const workgroupSize = maxComputeInvocationsPerWorkgroup < 256 ? 8 : 16

  const dampingPerSteps = () => {
    return 1.0 - Math.pow(1.0 - dampingRatio, 1 / simulationSteps)
  }

  const dampingConstant = () => {
    return (2 * mass * -Math.log(1 - dampingPerSteps())) / (frameDt / simulationSteps)
  }

  const clothDefinition = new Vec2(40)

  const clothGeometry = new PlaneGeometry({
    widthSegments: clothDefinition.x,
    heightSegments: clothDefinition.y,
    // topology: 'line-list',
  })

  const positionArray = clothGeometry.getAttributeByName('position').array.slice()

  const vertexPositionArray = new Float32Array((positionArray.length * 4) / 3)
  const prevVertexPositionArray = new Float32Array((positionArray.length * 4) / 3)

  const normalPositionArray = new Float32Array(vertexPositionArray.length)
  const vertexVelocityArray = new Float32Array(vertexPositionArray.length)
  const vertexForceArray = new Float32Array(vertexPositionArray.length)

  // padded!
  for (let i = 0, j = 0; i < vertexPositionArray.length; i += 4, j += 3) {
    vertexPositionArray[i] = positionArray[j]
    vertexPositionArray[i + 1] = positionArray[j + 1]
    vertexPositionArray[i + 2] = positionArray[j + 2]

    prevVertexPositionArray[i] = positionArray[j]
    prevVertexPositionArray[i + 1] = positionArray[j + 1]
    prevVertexPositionArray[i + 2] = positionArray[j + 2]

    const xPosIndex = Math.round((positionArray[j] + 1) * 0.5 * clothDefinition.x)
    const isFixed = positionArray[j + 1] === 1 && xPosIndex % 4 === 0

    vertexPositionArray[i + 3] = isFixed ? -1 : 0 // fixed point
    prevVertexPositionArray[i + 3] = isFixed ? -1 : 0 // fixed point

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
            value: frameDt / simulationSteps,
          },
          mass: {
            type: 'f32',
            value: mass,
          },
          springConstant: {
            type: 'f32',
            value: springConstant,
          },
          dampingConstant: {
            type: 'f32',
            value: dampingConstant(),
          },
          floor: {
            type: 'f32',
            value: -1.25,
          },
          gravity: {
            type: 'vec3f',
            value: new Vec3(0, -9.81, 0),
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
            value: 2_500,
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
          prevPosition: {
            type: 'array<vec4f>',
            value: prevVertexPositionArray,
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
        code: computeClothSim(workgroupSize),
        entryPoint: 'calc_forces',
      },
    },
    autoRender: false, // we will manually take care of rendering
    bindGroups: [computeBindGroup],
    dispatchSize: [
      Math.ceil((clothDefinition.x + 1) / (workgroupSize - 2)),
      Math.ceil((clothDefinition.y + 1) / (workgroupSize - 2)),
    ],
  })

  const computeUpdatePass = new ComputePass(gpuCurtains, {
    label: 'Compute update',
    shaders: {
      compute: {
        code: computeClothSim(workgroupSize),
        entryPoint: 'update_verlet',
      },
    },
    autoRender: false, // we will manually take care of rendering
    bindGroups: [computeBindGroup],
    dispatchSize: [Math.ceil(((clothDefinition.x + 1) * (clothDefinition.y + 1)) / (workgroupSize * workgroupSize))],
  })

  const computeNormalPass = new ComputePass(gpuCurtains, {
    label: 'Compute normal',
    shaders: {
      compute: {
        code: computeClothSim(workgroupSize),
        entryPoint: 'calc_normal',
      },
    },
    autoRender: false, // we will manually take care of rendering
    bindGroups: [computeBindGroup],
    dispatchSize: [
      Math.ceil((clothDefinition.x + 1) / (workgroupSize - 2)),
      Math.ceil((clothDefinition.y + 1) / (workgroupSize - 2)),
    ],
  })

  // add a task to our renderer onBeforeRenderScene tasks queue manager
  gpuCurtains.renderer.onBeforeRenderScene.add((commandEncoder) => {
    // set bind groups if needed
    if (!computeForcesPass.ready) computeForcesPass.onBeforeRenderPass()
    if (!computeUpdatePass.ready) computeUpdatePass.onBeforeRenderPass()
    if (!computeNormalPass.ready) computeNormalPass.onBeforeRenderPass()

    // now if the compute passes are not ready, do not render them
    if (!computeForcesPass.ready || !computeUpdatePass.ready || !computeNormalPass.ready) return

    for (let i = 0; i < simulationSteps; i++) {
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
      
        // basic shading
        let shadingColor: vec3f = vec3(0.65);
        let lightPosition: vec3f = vec3(0.3, 0.3, 1.0);
        let shadedColor: vec3f = applyLightning(shadingColor, fsInput.normal, lightPosition);
        
        // debug normals
        let normal: vec4f = vec4(normalize(fsInput.normal) * 0.5 + 0.5, 1.0);
        // debug force
        let force: vec4f = vec4(normalize(fsInput.force) * 0.5 + 0.5, 1.0);
        // debug velocity
        let velocity: vec4f = vec4(normalize(fsInput.velocity) * 0.5 + 0.5, 1.0);

        if(params.colorOutput == 0.0) {
          color = normal;
        } else if(params.colorOutput == 1.0) {
          color = force;
        } else if(params.colorOutput == 2.0) {
          color = velocity;
        } else if(params.colorOutput == 3.0) {
          color = vec4(shadedColor, 1.0);
        }
                      
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
      },
      {
        name: 'clothPrevPosition',
        type: 'vec4f',
        bufferFormat: 'float32x4',
        size: 4,
      },
      {
        name: 'clothNormal',
        type: 'vec4f',
        bufferFormat: 'float32x4',
        size: 4,
      },
      {
        name: 'clothForce',
        type: 'vec4f',
        bufferFormat: 'float32x4',
        size: 4,
      },
      {
        name: 'clothVelocity',
        type: 'vec4f',
        bufferFormat: 'float32x4',
        size: 4,
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
    uniforms: {
      params: {
        struct: {
          colorOutput: {
            type: 'f32',
            value: 0,
          },
        },
      },
    },
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

  const updateDamping = () => {
    computeForcesPass.uniforms.params.dampingConstant.value = dampingConstant()
  }

  // GUI
  const gui = new lil.GUI({
    title: 'Cloth simulation',
  })

  const computeFolder = gui.addFolder('Compute')

  computeFolder
    .add(
      {
        reset: () => {
          computeForcesPass.storages.clothVertex.position.shouldUpdate = true
          computeForcesPass.storages.clothVertex.prevPosition.shouldUpdate = true
          computeForcesPass.storages.clothVertex.force.shouldUpdate = true
          computeForcesPass.storages.clothVertex.velocity.shouldUpdate = true
          computeForcesPass.storages.clothVertex.normal.shouldUpdate = true
        },
      },
      'reset'
    )
    .name('Reset')

  const stepsField = computeFolder.add({ simulationSteps }, 'simulationSteps', 15, 25, 1).name('Number of steps')

  const paramsFolder = computeFolder.addFolder('Parameters')
  paramsFolder
    .add(computeForcesPass.uniforms.params.mass, 'value', 0.25, 1, 0.05)
    .name('Mass')
    .onChange((value) => {
      mass = value
      updateDamping()
    })
  paramsFolder
    .add(computeForcesPass.uniforms.params.springConstant, 'value', 5_000, 100_000, 1)
    .name('Spring constant')
    .onChange((value) => {
      springConstant = value
      updateDamping()
    })

  paramsFolder
    .add({ dampingRatio }, 'dampingRatio', 0, 0.6, 0.001)
    .name('Damping ratio')
    .onChange((value) => {
      dampingRatio = value

      updateDamping()
    })

  paramsFolder.add(computeForcesPass.uniforms.params.floor, 'value', -1.25, -0.5, 0.05).name('Floor position')

  stepsField.onChange((value) => {
    simulationSteps = value
    computeForcesPass.uniforms.params.deltaTime.value = frameDt / simulationSteps

    updateDamping()
  })

  const interactionFolder = computeFolder.addFolder('Interaction')

  const pointerFolder = interactionFolder.addFolder('Pointer')
  pointerFolder.add(computeForcesPass.uniforms.interaction.pointerSize, 'value', 0.25, 1, 0.05).name('Size')
  pointerFolder.add(computeForcesPass.uniforms.interaction.pointerStrength, 'value', 200, 5_000, 1).name('Strength')

  const windFolder = interactionFolder.addFolder('Wind strength')
  windFolder.add(computeForcesPass.uniforms.interaction.wind.value, 'x', -60, 60, 1).name('Along X')
  windFolder.add(computeForcesPass.uniforms.interaction.wind.value, 'y', -60, 60, 1).name('Along Y')
  windFolder.add(computeForcesPass.uniforms.interaction.wind.value, 'z', -50, 50, 1).name('Along Z')

  const output = ['Normal', 'Force', 'Velocity', 'Basic shading']

  const outputFolder = gui.addFolder('Output')
  outputFolder
    .add({ output: 'Normal' }, 'output', output)
    .name('Display')
    .onChange((value) => {
      const debugChannel = output.findIndex((v) => v === value)
      plane.uniforms.params.colorOutput.value = debugChannel
    })
})
