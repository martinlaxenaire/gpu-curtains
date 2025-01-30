/** Default fragment shader code that outputs only black pixels. */
export const getDefaultFragmentCode = /* wgsl */ `
@fragment fn main() -> @location(0) vec4f {
  return vec4(0.0, 0.0, 0.0, 1.0);
}`
