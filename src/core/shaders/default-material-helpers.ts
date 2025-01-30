import { Vec3 } from '../../math/Vec3'
import { BindGroupInputs } from '../../types/BindGroups'
import { ShadingModels } from './full/fragment/get-fragment-shader-code'
import { Mat3 } from '../../math/Mat3'

// chunks
/** Additional WGSL chunks to add to the shaders. */
export interface AdditionalChunks {
  /** Additional WGSL chunk to add to the shader head. Useful for additional WGSL functions. */
  additionalHead?: string
  /** Preliminary modification to apply to the shader.
   *
   * For the vertex shader, it is called after the attributes variables declarations and before applying any morph, skinning or matrices calculations.
   *
   * For the fragment shader, it is called after the material and attributes variables declarations and before applying any lightning calculations. */
  preliminaryContribution?: string
  /** Additional modification to apply to the shader.
   *
   * For the vertex shader, it is called after having applied morph, skinning and matrices calculations and before outputting the result.
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

// material uniforms
// export interface PatchMaterialUniform {
//   uniforms: BindGroupInputs['uniforms']
//   uniformName?: string
// }
//
// export interface PatchMaterialUniformForShadingModel extends PatchMaterialUniform {
//   shadingModel?: ShadingModels
// }
//
// // TODO useless?
// export const patchMaterialUniformForShading = ({
//   uniforms,
//   uniformName = 'material',
//   shadingModel = 'PBR',
// }: PatchMaterialUniformForShadingModel): BindGroupInputs['uniforms'] => {
//   let uniform = uniforms[uniformName]
//
//   if (!uniform) {
//     uniform = {
//       visibility: ['fragment'],
//       struct: {},
//     }
//   }
//
//   if (!uniform.struct) {
//     uniform.struct = {}
//   }
//
//   const shadingStruct = (() => {
//     switch (shadingModel) {
//       case 'Unlit':
//         return {
//           color: {
//             type: 'vec3f',
//             value: new Vec3(1),
//           },
//           opacity: {
//             type: 'f32',
//             value: 1,
//           },
//           alphaCutoff: {
//             type: 'f32',
//             value: 0,
//           },
//         }
//       case 'Lambert':
//         return {
//           color: {
//             type: 'vec3f',
//             value: new Vec3(1),
//           },
//           opacity: {
//             type: 'f32',
//             value: 1,
//           },
//           alphaCutoff: {
//             type: 'f32',
//             value: 0,
//           },
//           normalMapScale: {
//             type: 'f32',
//             value: 1,
//           },
//           occlusionIntensity: {
//             type: 'f32',
//             value: 1,
//           },
//           emissiveColor: {
//             type: 'vec3f',
//             value: new Vec3(0),
//           },
//           emissiveIntensity: {
//             type: 'f32',
//             value: 1,
//           },
//         }
//       case 'Phong':
//         return {
//           color: {
//             type: 'vec3f',
//             value: new Vec3(1),
//           },
//           opacity: {
//             type: 'f32',
//             value: 1,
//           },
//           alphaCutoff: {
//             type: 'f32',
//             value: 0,
//           },
//           normalMapScale: {
//             type: 'f32',
//             value: 1,
//           },
//           occlusionIntensity: {
//             type: 'f32',
//             value: 1,
//           },
//           emissiveColor: {
//             type: 'vec3f',
//             value: new Vec3(0),
//           },
//           emissiveIntensity: {
//             type: 'f32',
//             value: 1,
//           },
//           specularIntensity: {
//             type: 'f32',
//             value: 1,
//           },
//           specularColor: {
//             type: 'vec3f',
//             value: new Vec3(1),
//           },
//           shininess: {
//             type: 'f32',
//             value: 30,
//           },
//         }
//       case 'PBR':
//       default:
//         return {
//           color: {
//             type: 'vec3f',
//             value: new Vec3(1),
//           },
//           opacity: {
//             type: 'f32',
//             value: 1,
//           },
//           alphaCutoff: {
//             type: 'f32',
//             value: 0,
//           },
//           normalMapScale: {
//             type: 'f32',
//             value: 1,
//           },
//           occlusionIntensity: {
//             type: 'f32',
//             value: 1,
//           },
//           emissiveColor: {
//             type: 'vec3f',
//             value: new Vec3(0),
//           },
//           emissiveIntensity: {
//             type: 'f32',
//             value: 1,
//           },
//           specularIntensity: {
//             type: 'f32',
//             value: 1,
//           },
//           specularColor: {
//             type: 'vec3f',
//             value: new Vec3(1),
//           },
//           metallic: {
//             type: 'f32',
//             value: 1,
//           },
//           roughness: {
//             type: 'f32',
//             value: 1,
//           },
//           transmission: {
//             type: 'f32',
//             value: 0,
//           },
//           ior: {
//             type: 'f32',
//             value: 1.5,
//           },
//           dispersion: {
//             type: 'f32',
//             value: 0,
//           },
//           thickness: {
//             type: 'f32',
//             value: 0,
//           },
//           attenuationDistance: {
//             type: 'f32',
//             value: Infinity,
//           },
//           attenuationColor: {
//             type: 'vec3f',
//             value: new Vec3(1),
//           },
//           envRotation: {
//             type: 'mat3x3f',
//             value: new Mat3(),
//           },
//           envDiffuseIntensity: {
//             type: 'f32',
//             value: 1,
//           },
//           envSpecularIntensity: {
//             type: 'f32',
//             value: 1,
//           },
//         }
//     }
//   })()
//
//   uniform.struct = { ...shadingStruct, ...uniform.struct }
//
//   return uniforms
// }
