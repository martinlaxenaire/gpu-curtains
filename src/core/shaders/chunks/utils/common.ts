/** Common WGSL functions and struct declarations to use for light shading. */
export const common = /* wgsl */ `
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

fn max3( v: vec3f ) -> f32 {
  return max( max( v.x, v.y ), v.z );
}

fn isinf(value: f32) -> bool {
  return value > 1.0e38 || value < -1.0e38;
}

fn BRDF_Lambert(diffuseColor: vec3f) -> vec3f {
  return RECIPROCAL_PI * diffuseColor;
}

fn F_Schlick(f0: vec3f, f90: f32, VdotH: f32) -> vec3f {
  let fresnel: f32 = exp2( ( - 5.55473 * VdotH - 6.98316 ) * VdotH );
  return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}

fn F_Schlick_1(f0: f32, f90: f32, VdotH: f32) -> f32 {
  let fresnel: f32 = exp2( ( - 5.55473 * VdotH - 6.98316 ) * VdotH );
  return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
`
