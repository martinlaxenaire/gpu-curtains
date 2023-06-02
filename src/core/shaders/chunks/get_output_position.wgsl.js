export default /* wgsl */ `
  fn getOutputPosition(camera: Camera, matrices: Matrices, position: vec3f) -> vec4f {
    return camera.projection * matrices.model * camera.view * vec4f(position, 1.0);
  }
`
