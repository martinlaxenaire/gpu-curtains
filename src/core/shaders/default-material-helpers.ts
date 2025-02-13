// chunks
/** Additional WGSL chunks to add to the shaders. */
export interface AdditionalChunks {
  /** Additional WGSL chunk to add to the shader head. Useful for additional WGSL functions. */
  additionalHead?: string
  /** Preliminary modification to apply to the shader.
   *
   * For the vertex shader, it is called after the attributes variables declarations and before applying any morph, skinning or matrices calculations.
   *
   * For the fragment shader, it is called after the material and attributes variables declarations and before applying any lighting calculations. */
  preliminaryContribution?: string
  /** Additional modification to apply to the shader.
   *
   * For the vertex shader, it is called after having declared the outputted result and can therefore be used to update the outputted result.
   *
   * For the fragment shader, it is called after having applied the lighting calculations and before applying tone mapping if any. */
  additionalContribution?: string
}

/**
 * Patch {@link AdditionalChunks} in case they are missing.
 * @param chunks - Chunks to patch.
 */
export const patchAdditionalChunks = (chunks: AdditionalChunks = null): AdditionalChunks => {
  // patch chunks
  if (!chunks) {
    chunks = {
      additionalHead: '',
      preliminaryContribution: '',
      additionalContribution: '',
    }
  } else {
    if (!chunks.additionalHead) {
      chunks.additionalHead = ''
    }

    if (!chunks.preliminaryContribution) {
      chunks.preliminaryContribution = ''
    }

    if (!chunks.additionalContribution) {
      chunks.additionalContribution = ''
    }
  }

  return chunks
}
