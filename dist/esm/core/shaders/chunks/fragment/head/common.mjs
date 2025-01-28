const common = (
  /* wgsl */
  `
struct ReflectedLight {
  directDiffuse: vec3f,
  directSpecular: vec3f,
  indirectDiffuse: vec3f,
  indirectSpecular: vec3f,
}

struct DirectLight {
  color: vec3f,
  direction: vec3f,
  visible: bool,
}

fn lessThan3(a: vec3f, b: vec3f) -> vec3f {
  return vec3f(vec3<bool>(a.x < b.x, a.y < b.y, a.z < b.z));
}

fn pow2( x: f32 ) -> f32 {
  return x * x;
}

fn pow3( x: f32 ) -> f32 {
  return x * x * x;
}

fn pow4( x: f32 ) -> f32 {
  return pow2(x) * pow2(x);
}

fn isinf(value: f32) -> bool {
  return value > 1.0e38 || value < -1.0e38;
}

fn BRDF_Lambert(diffuseColor: vec3f) -> vec3f {
  return RECIPROCAL_PI * diffuseColor;
}

fn F_Schlick(VdotH: f32, f0: vec3f, f90: f32) -> vec3f {
  let fresnel: f32 = pow( 1.0 - VdotH, 5.0 );
  return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
`
);

export { common };
