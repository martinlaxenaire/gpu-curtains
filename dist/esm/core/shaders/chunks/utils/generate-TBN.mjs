const generateTBN = (
  /* wgsl */
  `
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
);

export { generateTBN };
