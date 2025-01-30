import { EnvironmentMap } from '../../../../../extras/environmentMap/EnvironmentMap'
import { ShadingModels, UnlitFragmentShaderInputParams } from '../../../full/fragment/get-fragment-shader-code'

/** Parameters used to declare the fragment shader variables coming from the material uniforms. */
export interface DeclareMaterialVarsParams {
  /** The {@link core/bindings/BufferBinding.BufferBindingBaseParams | BufferBindingBaseParams} holding the material uniform values. Will use default values if not provided. */
  materialUniform?: UnlitFragmentShaderInputParams['materialUniform']
  /** The {@link core/bindings/BufferBinding.BufferBindingBaseParams | BufferBindingBaseParams} name to use for variables declarations. Default to `'material'`. */
  materialUniformName?: UnlitFragmentShaderInputParams['materialUniformName']
  /** The {@link ShadingModels} to use to declare the corresponding variables. Default to `'PBR'`. */
  shadingModel?: ShadingModels
  /** {@link EnvironmentMap} to use for specific environment map variables declarations if any.
   @returns - String with all the `material` variables declared. */
  environmentMap?: EnvironmentMap
}

/**
 * Helper used to declare all available material variables.
 * @param parameters - {@link DeclareMaterialVarsParams} used to declare the material variables.
 * @returns - A string with all the material variables declared.
 */
export const declareMaterialVars = ({
  materialUniform = null,
  materialUniformName = 'material',
  shadingModel = 'PBR',
  environmentMap = null,
}: DeclareMaterialVarsParams = {}) => {
  var materialStruct = (materialUniform && materialUniform.struct) || {}

  var materialVars = ''

  if (materialStruct.color) {
    materialVars += /* wgsl */ `
  var baseColorFactor: vec3f = ${materialUniformName}.color;`
  } else {
    materialVars += /* wgsl */ `
  var baseColorFactor: vec3f = vec3(1.0);`
  }

  if (materialStruct.opacity) {
    materialVars += /* wgsl */ `
  var baseOpacityFactor: f32 = ${materialUniformName}.opacity;`
  } else {
    materialVars += /* wgsl */ `
  var baseOpacityFactor: f32 = 1.0;`
  }

  if (materialStruct.alphaCutoff) {
    materialVars += /* wgsl */ `
  var alphaCutoff: f32 = ${materialUniformName}.alphaCutoff;`
  } else {
    materialVars += /* wgsl */ `
  var alphaCutoff: f32 = 0.0;`
  }

  if (shadingModel !== 'Unlit') {
    if (materialStruct.normalMapScale) {
      materialVars += /* wgsl */ `
  var normalMapScale: f32 = ${materialUniformName}.normalMapScale;`
    } else {
      materialVars += /* wgsl */ `
  var normalMapScale: f32 = 1.0;`
    }

    if (materialStruct.occlusionIntensity) {
      materialVars += /* wgsl */ `
  var occlusionIntensity: f32 = ${materialUniformName}.occlusionIntensity;`
    } else {
      materialVars += /* wgsl */ `
  var occlusionIntensity: f32 = 1.0;`
    }

    if (materialStruct.emissiveColor) {
      materialVars += /* wgsl */ `
  var emissive: vec3f = ${materialUniformName}.emissiveColor;`
    } else {
      materialVars += /* wgsl */ `
  var emissive: vec3f = vec3(0.0);`
    }

    if (materialStruct.emissiveIntensity) {
      materialVars += /* wgsl */ `
  var emissiveStrength: f32 = ${materialUniformName}.emissiveIntensity;`
    } else {
      materialVars += /* wgsl */ `
  var emissiveStrength: f32 = 1.0;`
    }
  }

  if (shadingModel === 'Phong' || shadingModel === 'PBR') {
    if (materialStruct.metallic) {
      materialVars += /* wgsl */ `
  var metallic: f32 = ${materialUniformName}.metallic;`
    } else {
      materialVars += /* wgsl */ `
  var metallic: f32 = 1.0;`
    }

    if (materialStruct.roughness) {
      materialVars += /* wgsl */ `
  var roughness: f32 = ${materialUniformName}.roughness;`
    } else {
      materialVars += /* wgsl */ `
  var roughness: f32 = 1.0;`
    }

    if (materialStruct.specularIntensity) {
      materialVars += /* wgsl */ `
  var specularFactor: f32 = ${materialUniformName}.specularIntensity;`
    } else {
      materialVars += /* wgsl */ `
  var specularFactor: f32 = 1.0;`
    }

    if (materialStruct.specularColor) {
      materialVars += /* wgsl */ `
  var specularColorFactor: vec3f = ${materialUniformName}.specularColor;`
    } else {
      materialVars += /* wgsl */ `
  var specularColorFactor: vec3f = vec3(1.0);`
    }

    if (materialStruct.ior) {
      materialVars += /* wgsl */ `
  var ior: f32 = ${materialUniformName}.ior;`
    } else {
      materialVars += /* wgsl */ `
  var ior: f32 = 1.5;`
    }
  }

  if (shadingModel === 'PBR') {
    if (materialStruct.transmission) {
      materialVars += /* wgsl */ `
  var transmission: f32 = ${materialUniformName}.transmission;`
    } else {
      materialVars += /* wgsl */ `
  var transmission: f32 = 0.0;`
    }

    if (materialStruct.dispersion) {
      materialVars += /* wgsl */ `
  var dispersion: f32 = ${materialUniformName}.dispersion;`
    } else {
      materialVars += /* wgsl */ `
  var dispersion: f32 = 0.0;`
    }

    if (materialStruct.thickness) {
      materialVars += /* wgsl */ `
  var thickness: f32 = ${materialUniformName}.thickness;`
    } else {
      materialVars += /* wgsl */ `
  var thickness: f32 = 0.0;`
    }

    if (materialStruct.attenuationDistance) {
      materialVars += /* wgsl */ `
  var attenuationDistance: f32 = ${materialUniformName}.attenuationDistance;`
    } else {
      materialVars += /* wgsl */ `
  var attenuationDistance: f32 = 1.0e38;`
    }

    if (materialStruct.attenuationColor) {
      materialVars += /* wgsl */ `
  var attenuationColor: vec3f = ${materialUniformName}.attenuationColor;`
    } else {
      materialVars += /* wgsl */ `
  var attenuationColor: vec3f = vec3(1.0);`
    }

    if (!!environmentMap) {
      if (materialStruct.envRotation) {
        materialVars += /* wgsl */ `
  var envRotation: mat3x3f = ${materialUniformName}.envRotation;`
      } else {
        materialVars += /* wgsl */ `
  var envRotation: mat3x3f = mat3x3f();`
      }

      if (materialStruct.envDiffuseIntensity) {
        materialVars += /* wgsl */ `
  var envDiffuseIntensity: f32 = ${materialUniformName}.envDiffuseIntensity;`
      } else {
        materialVars += /* wgsl */ `
  var envDiffuseIntensity: f32 = 1.0;`
      }

      if (materialStruct.envSpecularIntensity) {
        materialVars += /* wgsl */ `
  var envSpecularIntensity: f32 = ${materialUniformName}.envSpecularIntensity;`
      } else {
        materialVars += /* wgsl */ `
  var envSpecularIntensity: f32 = 1.0;`
      }
    }
  }

  return materialVars
}
