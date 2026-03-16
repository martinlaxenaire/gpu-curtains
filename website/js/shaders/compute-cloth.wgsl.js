// cloth sim compute
export const computeClothSim = /* wgsl */ ` 
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
  
  const AIR_DENSITY = 1.225;
  const DRAG_COEFFI = 1.5;
  
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
    spring_damper(tile[cy - 1u][cx - 1u], diag_len);
    spring_damper(tile[cy - 1u][cx - 0u], rest_len);
    spring_damper(tile[cy - 1u][cx + 1u], diag_len);
    
    spring_damper(tile[cy][cx - 1u], rest_len);
    spring_damper(tile[cy][cx + 1u], rest_len);
    
    spring_damper(tile[cy + 1u][cx - 1u], diag_len);
    spring_damper(tile[cy + 1u][cx - 0u], rest_len);
    spring_damper(tile[cy + 1u][cx + 1u], diag_len);
    
    
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
