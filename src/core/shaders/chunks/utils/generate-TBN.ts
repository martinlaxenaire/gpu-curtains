/**
 * WGSL function to generate a tangent bitangent normal coordinate frame from the normal.
 */
export const generateTBN = /* wgsl */ `
// Normal Mapping Without Precomputed Tangents in world space
// http://www.thetenthplanet.de/archives/1180
fn getTangentFrame( modelPosition: vec3f, normal: vec3f, uv: vec2f ) -> mat3x3f {
  let q0: vec3f = dpdx( modelPosition.xyz );
  let q1: vec3f = dpdy( modelPosition.xyz );
  let st0: vec2f = dpdx( uv.xy );
  let st1: vec2f = dpdy( uv.xy );

  let N: vec3f = normal; // normalized

  let q1perp: vec3f = cross( q1, N );
  let q0perp: vec3f = cross( N, q0 );

  let T: vec3f = q1perp * st0.x + q0perp * st1.x;
  let B: vec3f = q1perp * st0.y + q0perp * st1.y;

  let det: f32 = max( dot( T, T ), dot( B, B ) );
  let scale: f32 = select(inverseSqrt( det ), 0.0, det == 0.0);

  return mat3x3f( T * scale, B * scale, N );

}

// TBN generates a tangent bitangent normal coordinate frame from the normal
// (the normal must be normalized)
fn generateTBN(normal: vec3f) -> mat3x3f {
  var bitangent: vec3f = vec3(0.0, 1.0, 0.0);

  let NdotUp: f32 = dot(normal, vec3(0.0, 1.0, 0.0));
  
  if (1.0 - abs(NdotUp) <= EPSILON) {
    // Sampling +Y or -Y, so we need a more robust bitangent.
    if (NdotUp > 0.0) {
      bitangent = vec3(0.0, 0.0, 1.0);
    }
    else {
      bitangent = vec3(0.0, 0.0, -1.0);
    }
  }

  let tangent: vec3f = normalize(cross(bitangent, normal));
  bitangent = cross(normal, tangent);

  return mat3x3f(tangent, bitangent, normal);
}
`
