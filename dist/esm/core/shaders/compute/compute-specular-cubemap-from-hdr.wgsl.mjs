var computeSpecularCubemapFromHdr = (
  /* wgsl */
  `
// Cube face lookup vectors
// positive and negative Y need to be inverted
const faceVectors = array<array<vec3<f32>, 2>, 6>(
  array<vec3<f32>, 2>(vec3<f32>(1.0, 0.0, 0.0), vec3<f32>(0.0, 1.0, 0.0)), // +X
  array<vec3<f32>, 2>(vec3<f32>(-1.0, 0.0, 0.0), vec3<f32>(0.0, 1.0, 0.0)), // -X
  array<vec3<f32>, 2>(vec3<f32>(0.0, -1.0, 0.0), vec3<f32>(0.0, 0.0, 1.0)),  // -Y
  array<vec3<f32>, 2>(vec3<f32>(0.0, 1.0, 0.0), vec3<f32>(0.0, 0.0, -1.0)), // +Y
  array<vec3<f32>, 2>(vec3<f32>(0.0, 0.0, 1.0), vec3<f32>(0.0, 1.0, 0.0)), // +Z
  array<vec3<f32>, 2>(vec3<f32>(0.0, 0.0, -1.0), vec3<f32>(0.0, 1.0, 0.0)) // -Z
);

// Utility to calculate 3D direction for a given cube face pixel
fn texelDirection(faceIndex : u32, u : f32, v : f32) -> vec3<f32> {
  let forward = faceVectors[faceIndex][0];
  let up = faceVectors[faceIndex][1];
  let right = normalize(cross(up, forward));
  return normalize(forward + (2.0 * u - 1.0) * right + (2.0 * v - 1.0) * up);
}

// Map 3D direction to equirectangular coordinates
fn dirToEquirect(dir : vec3<f32>) -> vec2<f32> {
  let phi = atan2(dir.z, dir.x);
  let theta = asin(dir.y);
  let u = 0.5 + 0.5 * phi / ${Math.PI};
  let v = 0.5 - theta / ${Math.PI};
  return vec2<f32>(u, v);
}

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {
  let faceSize = params.faceSize;
  let cubeFaceIndex = global_id.z;
  let x = global_id.x;
  let y = global_id.y;

  if (x >= faceSize || y >= faceSize || cubeFaceIndex >= 6u) {
    return;
  }

  let u = f32(x) / f32(faceSize);
  let v = f32(y) / f32(faceSize);

  // Get the 3D direction for this cube face texel
  let dir = texelDirection(cubeFaceIndex, u, v);

  // Map to equirectangular coordinates
  let uv = dirToEquirect(dir);        
  
  let hdrWidth = params.imageSize.x;
  let hdrHeight = params.imageSize.y;

  let texX = u32(clamp(uv.x * hdrWidth, 0.0, hdrWidth - 1.0));
  let texY = u32(clamp(uv.y * hdrHeight, 0.0, hdrHeight - 1.0));

  let hdrTexelIndex = texY * u32(hdrWidth) + texX;
  
  // Sample the equirectangular texture
  let sampledColor = params.hdrImageData[hdrTexelIndex];
  
  // Correct cube face order in texture store (fix for reversed face indices)
  textureStore(
    specularStorageCubemap,
    vec2<u32>(x, y),
    cubeFaceIndex,
    sampledColor
  );
}
`
);

export { computeSpecularCubemapFromHdr as default };
