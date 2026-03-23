//#region src/core/shaders/full/fragment/get-default-fragment-code.ts
/** Default fragment shader code that outputs only black pixels. */
const getDefaultFragmentCode = `
@fragment fn main() -> @location(0) vec4f {
  return vec4(0.0, 0.0, 0.0, 1.0);
}`;
//#endregion
export { getDefaultFragmentCode };
