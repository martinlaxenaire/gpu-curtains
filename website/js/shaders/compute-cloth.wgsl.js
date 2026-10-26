// cloth sim compute
export const computeClothSim = (workgroupSize = 16) => /* wgsl */ ` 
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
  let forcedDamping = 0.9999;

  let next =
    pos.xyz +
    (pos.xyz - prev.xyz) * forcedDamping +
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
