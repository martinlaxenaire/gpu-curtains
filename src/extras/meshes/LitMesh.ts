import { Mesh } from '../../core/meshes/Mesh'
import { CameraRenderer, isCameraRenderer } from '../../core/renderers/utils'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { ProjectedMeshParameters } from '../../core/meshes/mixins/ProjectedMeshBaseMixin'
import {
  FragmentShaderInputParams,
  getFragmentShaderCode,
  PBRFragmentShaderInputParams,
} from '../../core/shaders/full/fragment/get-fragment-shader-code'
import { Vec2 } from '../../math/Vec2'
import { Vec3 } from '../../math/Vec3'
import { AdditionalChunks } from '../../core/shaders/default-material-helpers'
import { getVertexShaderCode, VertexShaderInputParams } from '../../core/shaders/full/vertex/get-vertex-shader-code'
import { BufferBinding, BufferBindingParams } from '../../core/bindings/BufferBinding'
import { Input } from '../../types/BindGroups'
import { sRGBToLinear } from '../../math/color-utils'
import { Texture } from '../../core/textures/Texture'
import { MediaTexture } from '../../core/textures/MediaTexture'
import { Sampler } from '../../core/samplers/Sampler'
import { EnvironmentMap } from '../environmentMap/EnvironmentMap'

/** Defines all kinds of shading models available. */
export type ShadingModels = 'Unlit' | 'Lambert' | 'Phong' | 'PBR'

/** Defines all kinds of tone mappings available. */
export type ToneMappings = 'Khronos' | 'Reinhard' | 'Cineon' | false

/**
 * Define a {@link ShaderTextureDescriptor} used to associate the {@link core/textures/Texture.Texture | Texture} names with the corresponding {@link Sampler} and UV names.
 */
export interface ShaderTextureDescriptor {
  /** Name of the {@link Texture} or {@link MediaTexture} to use. */
  texture: Texture | MediaTexture
  /** Name of the {@link Sampler} to use. */
  sampler?: Sampler
  /** Texture coordinate attribute name to use to map this texture. */
  texCoordAttributeName?: string
}

/** Define the color space in which the colors parameters are passed to the {@link LitMeshMaterialParams}. */
export type ColorSpace = 'linear' | 'srgb'

// MATERIAL UNIFORM

/** Define the material uniform parameters. */
export interface LitMeshMaterialUniformParams {
  /** {@link ColorSpace} to use for material uniform colors. All lighting calculations must be done in `linear` space. Default to `srgb` (which means the uniform colors are converted to `linear` space), but glTF internally use `linear`. */
  colorSpace?: ColorSpace
  /** Base color of the {@link LitMesh} as a {@link Vec3}. Default to `new Vec3(1)`. */
  color?: Vec3
  /** Opacity of the {@link LitMesh}. If different than `1`, consider setting the `transparent` parameter to `true`. Default to `1`.  */
  opacity?: number
  /** Alpha cutoff threshold value of the {@link LitMesh}. Default to `0.5`. */
  alphaCutoff?: number
  /** The metallic factor of the {@link LitMesh}. Default to `1`. */
  metallic?: number
  /** The roughness factor of the {@link LitMesh}. Default to `1`. */
  roughness?: number
  /** How much the normal map affects the material normal texture if any. Typical ranges are [0-1]. Default to `new Vec2(1)`. */
  normalScale?: Vec2
  /** A scalar multiplier controlling the amount of occlusion applied to the occlusion texture if any. Default to `1`. */
  occlusionIntensity?: number
  /** Emissive intensity to apply to the emissive color of the {@link LitMesh}. Default to `1`. */
  emissiveIntensity?: number
  /** Emissive color of the {@link LitMesh} as a {@link Vec3}. Default to `new Vec3(0)` (no emissive color). */
  emissiveColor?: Vec3
  /** The strength of the specular reflections applied to the {@link LitMesh} (not applicable to `Lambert` shading). Default to `1`. */
  specularIntensity?: number
  /** Specular color to use for the specular reflections of the {@link LitMesh} as a {@link Vec3} (not applicable to `Lambert` shading). Default to `new Vec3(1)`. */
  specularColor?: Vec3
  /** Shininess of the {@link LitMesh} when using `Phong` shading. Default to `30`. */
  shininess?: number
  /** The base percentage of light that is transmitted through the surface of the {@link LitMesh}. Only applicable is `transmissive` parameter is set to `true`. Default to `0`. */
  transmission?: number
  /** The index of refraction of the {@link LitMesh}. Default to `1.5`. */
  ior?: number
  /** The strength of the dispersion effect, specified as 20/Abbe number. Only applicable is `transmissive` parameter is set to `true`. Default to `0`. */
  dispersion?: number
  /** The thickness of the volume beneath the surface. The value is given in the coordinate space of the mesh. If the value is 0 the material is thin-walled. Only applicable is `transmissive` parameter is set to `true`. Default to `0`. */
  thickness?: number
  /** Density of the medium given as the average distance that light travels in the medium before interacting with a particle. The value is given in world space. Only applicable is `transmissive` parameter is set to `true`. Default to `Infinity`. */
  attenuationDistance?: number
  /** The color as a {@link Vec3} that white light turns into due to absorption when reaching the attenuation distance. Only applicable is `transmissive` parameter is set to `true`. Default to `new Vec3(1)`. */
  attenuationColor?: Vec3
}

/** Parameters used to get the {@link LitMesh} material uniforms. */
export interface GetLitMeshMaterialUniform extends LitMeshMaterialUniformParams {
  /** {@link ShadingModels} to use for lighting. Default to `PBR`. */
  shading?: ShadingModels
  /** {@link EnvironmentMap} to use for IBL shading. */
  environmentMap?: EnvironmentMap
}

// MATERIAL TEXTURES

/** {@link ShaderTextureDescriptor} used for a {@link LitMesh} with unlit shading. */
export interface UnlitTexturesDescriptors {
  /** {@link ShaderTextureDescriptor | Base color texture descriptor} to use if any. */
  baseColorTexture?: ShaderTextureDescriptor
}

/** {@link ShaderTextureDescriptor} used for a {@link LitMesh} with lambert shading. */
export interface LambertTexturesDescriptors extends UnlitTexturesDescriptors {
  /** {@link ShaderTextureDescriptor | Normal texture descriptor} to use if any. */
  normalTexture?: ShaderTextureDescriptor
  /** {@link ShaderTextureDescriptor | Emissive texture descriptor} to use if any. */
  emissiveTexture?: ShaderTextureDescriptor
  /** {@link ShaderTextureDescriptor | Occlusion texture descriptor} to use if any. */
  occlusionTexture?: ShaderTextureDescriptor
}

/** {@link ShaderTextureDescriptor} used for a {@link LitMesh} with phong shading. */
export interface PhongTexturesDescriptors extends LambertTexturesDescriptors {
  /** {@link ShaderTextureDescriptor | Metallic roughness texture descriptor} to use if any. */
  metallicRoughnessTexture?: ShaderTextureDescriptor
  /** {@link ShaderTextureDescriptor | Specular texture descriptor} (mixing both specular color in the `RGB` channels and specular intensity in the `A` channel) to use if any. */
  specularTexture?: ShaderTextureDescriptor
  /** {@link ShaderTextureDescriptor | Specular intensity texture descriptor} (using the `A` channel) to use if any. */
  specularFactorTexture?: ShaderTextureDescriptor
  /** {@link ShaderTextureDescriptor | Specular color texture descriptor} (using the `RGB` channels) to use if any. */
  specularColorTexture?: ShaderTextureDescriptor
}

/** {@link ShaderTextureDescriptor} used for a {@link LitMesh} with PBR shading. */
export interface PBRTexturesDescriptors extends PhongTexturesDescriptors {
  /** {@link ShaderTextureDescriptor | Transmission texture descriptor} to use if any. */
  transmissionTexture?: ShaderTextureDescriptor
  /** {@link ShaderTextureDescriptor | Thickness texture descriptor} to use if any. */
  thicknessTexture?: ShaderTextureDescriptor
  /** {@link ShaderTextureDescriptor | Transmission scene background texture descriptor} to use if any. */
  transmissionBackgroundTexture?: ShaderTextureDescriptor
}

/** Parameters used to get all the {@link LitMesh} {@link ShaderTextureDescriptor} as an array. */
export interface GetMaterialTexturesDescriptors extends PBRTexturesDescriptors {
  /** {@link ShadingModels} to use for lighting. Default to `PBR`. */
  shading?: ShadingModels
}

/** Define the material parameters of a {@link LitMesh}. */
export interface LitMeshMaterialParams
  extends Omit<
      PBRFragmentShaderInputParams,
      | 'chunks'
      | 'geometry'
      | 'receiveShadows'
      | 'extensionsUsed'
      | 'materialUniform'
      | 'materialUniformName'
      | 'transmissionBackgroundTexture'
    >,
    LitMeshMaterialUniformParams {
  /** {@link ShadingModels} to use for lighting. Default to `PBR`. */
  shading?: ShadingModels
  /** {@link AdditionalChunks | Additional WGSL chunks} to add to the vertex shaders. */
  vertexChunks?: AdditionalChunks
  /** {@link AdditionalChunks | Additional WGSL chunks} to add to the fragment shaders. */
  fragmentChunks?: AdditionalChunks
}

/** Parameters used to create a {@link LitMesh}. */
export interface LitMeshParameters extends Omit<ProjectedMeshParameters, 'shaders'> {
  /** Material parameters of the {@link LitMesh}. */
  material?: LitMeshMaterialParams
}

/**
 * Class used to create a {@link Mesh} with built-in lighting. Shading types include 'Unlit' (no lighting), 'Lambert', 'Phong' and 'PBR'. For a better 'PBR' shading result, you should always use an associated {@link extras/environmentMap/EnvironmentMap.EnvironmentMap | EnvironmentMap}.
 *
 * Since the shaders are automatically generated based on the {@link LitMeshMaterialParams | `material`} parameter passed, it is more difficult to tweak them, even tho a few options exist. If you want full control over your shading, consider using a regular {@link Mesh} and writing your own shaders.
 *
 * @example
 * ```javascript
 * // assume 'renderer' is a valid camera renderer
 *
 * const ambientLight = new AmbientLight(renderer, {
 *   intensity: 0.1,
 * })
 *
 * const directionalLight = new DirectionalLight(renderer, {
 *   position: new Vec3(10),
 * })
 *
 * const lambertMesh = new LitMesh(renderer, {
 *   label: 'Mesh with lambert shading',
 *   geometry: new BoxGeometry(),
 *   material: {
 *     shading: 'Lambert',
 *     color: new Vec3(1),
 *   },
 * })
 *
 * const phongMesh = new LitMesh(renderer, {
 *   label: 'Mesh with phong shading',
 *   geometry: new BoxGeometry(),
 *   material: {
 *     shading: 'Phong',
 *     fragmentChunks: {
 *       preliminaryContribution: 'outputColor = mix(outputColor, vec4(1.0, 0.0, 0.0, 1.0), 0.5);'
 *     },
 *     color: new Vec3(1),
 *     shininess: 60,
 *   },
 * })
 * ```
 */
export class LitMesh extends Mesh {
  /**
   * LitMesh constructor
   * @param renderer - {@link CameraRenderer} object or {@link GPUCurtains} class object used to create this {@link LitMesh}.
   * @param parameters - {@link LitMeshParameters} used to create this {@link LitMesh}.
   */
  constructor(renderer: CameraRenderer | GPUCurtains, parameters: LitMeshParameters = {}) {
    renderer = isCameraRenderer(renderer, 'LitMesh')

    const { material, ...defaultParams } = parameters

    let { colorSpace } = material

    if (!colorSpace) {
      colorSpace = 'srgb'
    }

    const {
      shading,
      additionalVaryings,
      vertexChunks,
      fragmentChunks,
      toneMapping,
      // material uniform values
      color,
      opacity,
      alphaCutoff,
      metallic,
      roughness,
      normalScale,
      occlusionIntensity,
      emissiveIntensity,
      emissiveColor,
      specularIntensity,
      specularColor,
      shininess,
      transmission,
      ior,
      dispersion,
      thickness,
      attenuationDistance,
      attenuationColor,
      // texture descriptors
      baseColorTexture,
      normalTexture,
      emissiveTexture,
      occlusionTexture,
      metallicRoughnessTexture,
      specularTexture,
      specularFactorTexture,
      specularColorTexture,
      transmissionTexture,
      thicknessTexture,
      environmentMap,
    } = material

    // material uniform
    const materialUniform = LitMesh.getMaterialUniform({
      shading,
      colorSpace,
      color,
      opacity,
      alphaCutoff,
      metallic,
      roughness,
      normalScale,
      occlusionIntensity,
      emissiveIntensity,
      emissiveColor,
      specularIntensity,
      specularColor,
      shininess,
      transmission,
      ior,
      dispersion,
      thickness,
      attenuationDistance,
      attenuationColor,
      environmentMap,
    })

    if (defaultParams.uniforms) {
      defaultParams.uniforms = {
        ...defaultParams.uniforms,
        ...{
          material: materialUniform,
        },
      }
    } else {
      defaultParams.uniforms = {
        material: materialUniform,
      }
    }

    // material textures
    if (!defaultParams.textures) {
      defaultParams.textures = []
    }

    if (!defaultParams.samplers) {
      defaultParams.samplers = []
    }

    const materialTextures = LitMesh.getMaterialTexturesDescriptors({
      shading,
      baseColorTexture,
      normalTexture,
      emissiveTexture,
      occlusionTexture,
      metallicRoughnessTexture,
      specularTexture,
      specularFactorTexture,
      specularColorTexture,
      transmissionTexture,
      thicknessTexture,
    })

    materialTextures.forEach((textureDescriptor) => {
      if (textureDescriptor.sampler) {
        const samplerExists = defaultParams.samplers.find((s) => s.uuid === textureDescriptor.sampler.uuid)

        if (!samplerExists) {
          defaultParams.samplers.push(textureDescriptor.sampler)
        }
      }

      defaultParams.textures.push(textureDescriptor.texture)
    })

    // env map
    if (environmentMap && (shading === 'PBR' || !shading)) {
      // add environment map textures and sampler
      if (!defaultParams.textures) {
        defaultParams.textures = []
      }

      defaultParams.textures = [
        ...defaultParams.textures,
        environmentMap.lutTexture,
        environmentMap.diffuseTexture,
        environmentMap.specularTexture,
      ]

      if (!defaultParams.samplers) {
        defaultParams.samplers = []
      }

      defaultParams.samplers = [...defaultParams.samplers, environmentMap.sampler]
    }

    // transmission background texture for transmissive objects
    let transmissionBackgroundTexture = null
    if (parameters.transmissive) {
      renderer.createTransmissionTarget()
      transmissionBackgroundTexture = {
        texture: renderer.transmissionTarget.texture,
        sampler: renderer.transmissionTarget.sampler,
      }
    }

    const extensionsUsed = []

    // dispersion extension
    if (dispersion) {
      extensionsUsed.push('KHR_materials_dispersion')
    }

    const hasNormal = defaultParams.geometry && defaultParams.geometry.getAttributeByName('normal')

    if (defaultParams.geometry && !hasNormal) {
      // compute geometry right away
      // so we have fresh attributes to send to the shaders' generation helper functions
      defaultParams.geometry.computeGeometry()
    }

    // shaders
    const vs = LitMesh.getVertexShaderCode({
      bindings: defaultParams.bindings as BufferBinding[],
      geometry: defaultParams.geometry,
      chunks: vertexChunks,
      additionalVaryings,
    })

    const fs = LitMesh.getFragmentShaderCode({
      shadingModel: shading,
      chunks: fragmentChunks,
      extensionsUsed,
      receiveShadows: defaultParams.receiveShadows,
      toneMapping,
      geometry: defaultParams.geometry,
      additionalVaryings,
      materialUniform,
      baseColorTexture,
      normalTexture,
      metallicRoughnessTexture,
      specularTexture,
      specularFactorTexture,
      specularColorTexture,
      transmissionTexture,
      thicknessTexture,
      emissiveTexture,
      occlusionTexture,
      transmissionBackgroundTexture,
      environmentMap,
    })

    const shaders = {
      vertex: {
        code: vs,
        entryPoint: 'main',
      },
      fragment: {
        code: fs,
        entryPoint: 'main',
      },
    }

    super(renderer, { ...defaultParams, ...{ shaders } })
  }

  /**
   * Get the material {@link BufferBindingParams} to build the material uniform.
   * @param parameters - {@link GetLitMeshMaterialUniform} parameters.
   * @returns - Material uniform {@link BufferBindingParams}.
   */
  static getMaterialUniform(parameters: GetLitMeshMaterialUniform): BufferBindingParams {
    const {
      shading,
      colorSpace,
      color,
      opacity,
      alphaCutoff,
      metallic,
      roughness,
      normalScale,
      occlusionIntensity,
      emissiveIntensity,
      emissiveColor,
      specularIntensity,
      specularColor,
      shininess,
      transmission,
      ior,
      dispersion,
      thickness,
      attenuationDistance,
      attenuationColor,
      environmentMap,
    } = parameters

    // build material uniform based on shading model
    // basic struct (unlit)
    const baseUniformStruct: Record<string, Input> = {
      color: {
        type: 'vec3f',
        value:
          color !== undefined ? (colorSpace === 'srgb' ? sRGBToLinear(color.clone()) : color.clone()) : new Vec3(1),
      },
      opacity: {
        type: 'f32',
        value: opacity !== undefined ? opacity : 1,
      },
      alphaCutoff: {
        type: 'f32',
        value: alphaCutoff !== undefined ? alphaCutoff : 0.5,
      },
    }

    // diffuse struct (lambert)
    const diffuseUniformStruct: Record<string, Input> = {
      ...baseUniformStruct,
      normalScale: {
        type: 'vec2f',
        value: normalScale !== undefined ? normalScale : new Vec2(1),
      },
      occlusionIntensity: {
        type: 'f32',
        value: occlusionIntensity !== undefined ? occlusionIntensity : 1,
      },
      emissiveIntensity: {
        type: 'f32',
        value: emissiveIntensity !== undefined ? emissiveIntensity : 1,
      },
      emissiveColor: {
        type: 'vec3f',
        value:
          emissiveColor !== undefined
            ? colorSpace === 'srgb'
              ? sRGBToLinear(emissiveColor.clone())
              : emissiveColor.clone()
            : new Vec3(),
      },
    }

    // specular struct
    const specularUniformStruct: Record<string, Input> = {
      ...diffuseUniformStruct,
      specularIntensity: {
        type: 'f32',
        value: specularIntensity !== undefined ? specularIntensity : 1,
      },
      specularColor: {
        type: 'vec3f',
        value:
          specularColor !== undefined
            ? colorSpace === 'srgb'
              ? sRGBToLinear(specularColor.clone())
              : specularColor.clone()
            : new Vec3(1),
      },
    }

    // phong struct
    const phongUniformStruct: Record<string, Input> = {
      ...specularUniformStruct,
      shininess: {
        type: 'f32',
        value: shininess !== undefined ? shininess : 30,
      },
    }

    // PBR struct
    const pbrUniformStruct: Record<string, Input> = {
      ...specularUniformStruct,
      metallic: {
        type: 'f32',
        value: metallic !== undefined ? metallic : 1,
      },
      roughness: {
        type: 'f32',
        value: roughness !== undefined ? roughness : 1,
      },
      transmission: {
        type: 'f32',
        value: transmission !== undefined ? transmission : 0,
      },
      ior: {
        type: 'f32',
        value: ior !== undefined ? ior : 1.5,
      },
      dispersion: {
        type: 'f32',
        value: dispersion !== undefined ? dispersion : 0,
      },
      thickness: {
        type: 'f32',
        value: thickness !== undefined ? thickness : 0,
      },
      attenuationDistance: {
        type: 'f32',
        value: attenuationDistance !== undefined ? attenuationDistance : Infinity,
      },
      attenuationColor: {
        type: 'vec3f',
        value:
          attenuationColor !== undefined
            ? colorSpace === 'srgb'
              ? sRGBToLinear(attenuationColor.clone())
              : attenuationColor.clone()
            : new Vec3(1),
      },
      ...(environmentMap && {
        envRotation: {
          type: 'mat3x3f',
          value: environmentMap.rotation,
        },
        envDiffuseIntensity: {
          type: 'f32',
          value: environmentMap.options.diffuseIntensity,
        },
        envSpecularIntensity: {
          type: 'f32',
          value: environmentMap.options.specularIntensity,
        },
      }),
    }

    const materialStruct = (() => {
      switch (shading) {
        case 'Unlit':
          return baseUniformStruct
        case 'Lambert':
          return diffuseUniformStruct
        case 'Phong':
          return phongUniformStruct
        case 'PBR':
        default:
          return pbrUniformStruct
      }
    })()

    // note that we do not need to add the env map params
    // they will be added by the shader builder
    return {
      visibility: ['fragment'],
      struct: materialStruct,
    }
  }

  /**
   * Get all the material {@link ShaderTextureDescriptor} as an array.
   * @param parameters - {@link GetMaterialTexturesDescriptors} parameters.
   * @returns - Array of {@link ShaderTextureDescriptor} to use.
   */
  static getMaterialTexturesDescriptors(parameters: GetMaterialTexturesDescriptors): ShaderTextureDescriptor[] {
    const {
      shading,
      baseColorTexture,
      normalTexture,
      emissiveTexture,
      occlusionTexture,
      metallicRoughnessTexture,
      specularTexture,
      specularFactorTexture,
      specularColorTexture,
      transmissionTexture,
      thicknessTexture,
    } = parameters

    // base textures (unlit)
    const baseTextures = [baseColorTexture]

    // diffuse textures (lambert)
    const diffuseTextures = [...baseTextures, normalTexture, emissiveTexture, occlusionTexture]

    // specular textures (phong)
    // adding metallic roughness texture in phong because from glTF assets we'd need it to compute the shininess
    const specularTextures = [
      ...diffuseTextures,
      metallicRoughnessTexture,
      specularTexture,
      specularFactorTexture,
      specularColorTexture,
    ]

    // PBR textures
    const pbrTextures = [...specularTextures, transmissionTexture, thicknessTexture]

    const materialTextures = (() => {
      switch (shading) {
        case 'Unlit':
          return baseTextures
        case 'Lambert':
          return diffuseTextures
        case 'Phong':
          return specularTextures
        case 'PBR':
        default:
          return pbrTextures
      }
    })()

    return materialTextures.filter(Boolean)
  }

  /**
   * Generate the {@link LitMesh} vertex shader code.
   * @param parameters - {@link VertexShaderInputParams} used to generate the vertex shader code.
   * @returns - The vertex shader generated based on the provided parameters.
   */
  static getVertexShaderCode(parameters: VertexShaderInputParams): string {
    return getVertexShaderCode(parameters)
  }

  /**
   * Generate the {@link LitMesh} fragment shader.
   * @param parameters - {@link FragmentShaderInputParams} used to build the fragment shader.
   * @returns - The fragment shader generated based on the provided parameters.
   */
  static getFragmentShaderCode(parameters: FragmentShaderInputParams): string {
    return getFragmentShaderCode(parameters)
  }
}
