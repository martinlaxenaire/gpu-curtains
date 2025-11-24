/**
 * WGSL BRDF GGX functions. Need the `constants` and `common` chunks.
 */
export const BRDF_GGX = /* wgsl */ `
fn Schlick_to_F0( f: vec3f, f90: f32, dotVH: f32 ) -> vec3f {
  let x: f32 = clamp( 1.0 - dotVH, 0.0, 1.0 );
  let x2: f32 = x * x;
  let x5: f32 = clamp( x * x2 * x2, 0.0, 0.9999 );

  return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}

fn DistributionGGX(NdotH: f32, roughness: f32) -> f32 {
  let a: f32 = pow2( roughness );
  let a2: f32 = pow2( a );

  let denom: f32 = (pow2( NdotH ) * (a2 - 1.0) + 1.0);

  return RECIPROCAL_PI * a2 / ( pow2( denom ) );
}

// Geometric Shadowing function
fn GeometrySmith(NdotL: f32, NdotV: f32, roughness: f32) -> f32 {
  let a: f32 = pow2( roughness );
  let a2: f32 = pow2( a );
  
  let gv: f32 = NdotL * sqrt( a2 + ( 1.0 - a2 ) * pow2( NdotV ) );
  let gl: f32 = NdotV * sqrt( a2 + ( 1.0 - a2 ) * pow2( NdotL ) );

  return 0.5 / max( gv + gl, EPSILON );
}
`
