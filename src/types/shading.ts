/** Defines all kinds of tone mappings available. */
export type ToneMappings = 'Khronos' | 'Reinhard' | 'Cineon' | false

/** Defines the available color spaces. */
export type ColorSpace = 'linear' | 'srgb'

/** Defines the fragment shader output structure and WGSL returned values. Allows declaring custom returned values, such as when rendering to a Multiple Render Target. */
export interface FragmentOutput {
  /** Define the fragment shader output structure as an array of `type` and `name` members. Default to `[{ type: 'vec4f', name: 'color }]`. */
  struct: Array<{
    /** WGSL type of the fragment shader output struct member, e.g. `vec4f`, `vec3f`, etc. */
    type: string
    /** Name of the fragment shader output struct member, e.g. `color`, `normal`, etc. */
    name: string
  }>
  /**
   * Define a custom fragment shader WGSL returned value. Should use the `FSOutput` struct type.
   * Default to:
   * ```wgsl
   * var output: FSOutput;
   * output.color = outputColor;
   * return output;
   * ```
   */
  output: string
}
