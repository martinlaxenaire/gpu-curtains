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
import { ColorSpace, FragmentOutput, ToneMappings } from '../../types/shading'
import { MaterialExtensionKeys } from '../../types/gltf/GLTFExtensions'

/** Defines all kinds of shading models available. */
export type ShadingModels = 'Unlit' | 'Lambert' | 'Phong' | 'PBR'

/**
 * Define a {@link ShaderTextureDescriptor} used to associate a {@link core/textures/Texture.Texture | Texture} with the corresponding {@link Sampler} and UV names.
 */
export interface ShaderTextureDescriptor {
  /** {@link Texture} or {@link MediaTexture} to use. */
  texture: Texture | MediaTexture
  /** {@link Sampler} to use. Fallback to default sampler if not provided. */
  sampler?: Sampler
  /** Texture coordinate attribute name to use to map this texture. Default to `'uv'`. */
  texCoordAttributeName?: string
}

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
  /** The base percentage of light that is transmitted through the surface of the {@link LitMesh}. Only applicable to `PBR` shading if `transmissive` parameter is set to `true`. Default to `0`. */
  transmission?: number

  /** The index of refraction of the {@link LitMesh}. Default to `1.5`. */
  ior?: number
  /** The strength of the dispersion effect, specified as 20/Abbe number. Only applicable to `PBR` shading if `transmissive` parameter is set to `true`. Default to `0`. */
  dispersion?: number
  /** The thickness of the volume beneath the surface. The value is given in the coordinate space of the mesh. If the value is 0 the material is thin-walled. Only applicable to `PBR` shading if `transmissive` parameter is set to `true`. Default to `0`. */
  thickness?: number
  /** Density of the medium given as the average distance that light travels in the medium before interacting with a particle. The value is given in world space. Only applicable to `PBR` shading if `transmissive` parameter is set to `true`. Default to `Infinity`. */
  attenuationDistance?: number
  /** The color as a {@link Vec3} that white light turns into due to absorption when reaching the attenuation distance. Only applicable to `PBR` shading if `transmissive` parameter is set to `true`. Default to `new Vec3(1)`. */
  attenuationColor?: Vec3

  /** The multi-scatter albedo. Default to `new Vec3(0)`. */
  multiscatterColor?: Vec3
  /** The anisotropy of scatter events. Range is (-1, 1).	 Default to `0`. */
  scatterAnisotropy?: number

  /** Sheen color to use. Default to `new Vec3(0)`, but sheen is not taken into account if this and `sheenRoughness` are not set. */
  sheenColor?: Vec3
  /** Sheen roughness to use. Default to `0`, but sheen is not taken into account if this and `sheenColor` are not set. */
  sheenRoughness?: number

  /** Anisotropy strength. Default to `0`, but anisotropy is not taken into account if not set or equal to `0`. */
  anisotropy?: number
  /** Anisotropy vector based on a rotation value, where `x` component is `cos(rotation)` and `y` component is `sin(rotation)`. Default to `new Vec2(1, 0)`. */
  anisotropyVector?: Vec2

  /** Clearcoat layer intensity. Default to `0`, but clearcoat is not taken into account if not set or equal to `0`. */
  clearcoat?: number
  /** Clearcoat layer roughness. Default to `0`. */
  clearcoatRoughness?: number
  /** Clearcoat normal map scale if any clearcoat normal texture is defined. Default to `new Vec2(1).` */
  clearcoatNormalScale?: Vec2

  /** Iridescence intensity factor. Default to `0`, but iridescence is not taken into account if not set or equal to `0`. */
  iridescence?: number
  /** Index of refraction of the dielectric thin-film layer. Default to `1.3`. */
  iridescenceIOR?: number
  /** Minimum and maximum thickness of the iridescence layer. Default to `new Vec2(100, 400)`. */
  iridescenceThicknessRange?: Vec2

  /** The percentage of non-specularly reflected light that is diffusely transmitted through the surface. Default to `0`. */
  diffuseTransmission?: number
  /** The color that modulates the transmitted light. Default to `new Vec3(1)`. */
  diffuseTransmissionColor?: Vec3
}

/** Parameters used to get the {@link LitMesh} material uniforms. */
export interface GetLitMeshMaterialUniform extends LitMeshMaterialUniformParams {
  /** {@link ShadingModels} to use for lighting. Default to `PBR`. */
  shading?: ShadingModels
  /** {@link EnvironmentMap} to use for IBL shading. */
  environmentMap?: EnvironmentMap
}

// MATERIAL TEXTURES

/** {@link ShaderTextureDescriptor} used for a {@link LitMesh} with `Unlit` shading. */
export interface UnlitTexturesDescriptors {
  /** {@link ShaderTextureDescriptor | Base color texture descriptor} to use if any. Format should be `rgba8unorm-srgb`. */
  baseColorTexture?: ShaderTextureDescriptor
  /** {@link ShaderTextureDescriptor | Emissive texture descriptor} to use if any. Format should be `rgba8unorm-srgb`. */
  emissiveTexture?: ShaderTextureDescriptor
  /** {@link ShaderTextureDescriptor | Occlusion texture descriptor} to use if any. Format must be at least `r8unorm`. */
  occlusionTexture?: ShaderTextureDescriptor
}

/** {@link ShaderTextureDescriptor} used for a {@link LitMesh} with `Lambert` shading. */
export interface LambertTexturesDescriptors extends UnlitTexturesDescriptors {
  /** {@link ShaderTextureDescriptor | Normal texture descriptor} to use if any. Format should be `rgba8unorm`. */
  normalTexture?: ShaderTextureDescriptor
}

/** {@link ShaderTextureDescriptor} used for a {@link LitMesh} with `Phong` shading. */
export interface PhongTexturesDescriptors extends LambertTexturesDescriptors {
  /** {@link ShaderTextureDescriptor | Metallic roughness texture descriptor} to use if any. Format should be `rgba8unorm`. */
  metallicRoughnessTexture?: ShaderTextureDescriptor
  /** {@link ShaderTextureDescriptor | Specular texture descriptor} (mixing both specular color in the `RGB` channels and specular intensity in the `A` channel) to use if any. Format should be `rgba8unorm-srgb`. */
  specularTexture?: ShaderTextureDescriptor
  /** {@link ShaderTextureDescriptor | Specular intensity texture descriptor} (using the `A` channel) to use if any. Format should be `rgba8unorm-srgb` or `rgba8unorm`. */
  specularFactorTexture?: ShaderTextureDescriptor
  /** {@link ShaderTextureDescriptor | Specular color texture descriptor} (using the `RGB` channels) to use if any. Format should be `rgba8unorm-srgb`. */
  specularColorTexture?: ShaderTextureDescriptor
}

/** {@link ShaderTextureDescriptor} used for a {@link LitMesh} with `PBR` shading. */
export interface PBRTexturesDescriptors extends PhongTexturesDescriptors {
  /** {@link ShaderTextureDescriptor | Transmission thickness texture descriptor} (using the `R` channel for transmission and the `G` channel for thickness) to use if any. Format must be at least `rg8unorm`. */
  transmissionThicknessTexture?: ShaderTextureDescriptor
  /** {@link ShaderTextureDescriptor | Transmission texture descriptor} (using the `R` channel) to use if any. Format must be at least `r8unorm`. */
  transmissionTexture?: ShaderTextureDescriptor
  /** {@link ShaderTextureDescriptor | Thickness texture descriptor} (using the `G` channel) to use if any. Format must be at least `rg8unorm`. */
  thicknessTexture?: ShaderTextureDescriptor
  /** {@link ShaderTextureDescriptor | Transmission scene background texture descriptor} to use if any. Handled internally by the renderer. */
  transmissionBackgroundTexture?: ShaderTextureDescriptor

  /** {@link ShaderTextureDescriptor | Sheen texture descriptor} (mixing both sheen color in the `RGB` channels and roughness in the `A` channel) to use if any. Format should be `rgba8unorm-srgb`. */
  sheenTexture?: ShaderTextureDescriptor
  /** {@link ShaderTextureDescriptor | Sheen color texture descriptor} (using the `RGB` channels) to use if any. Format should be `rgba8unorm-srgb`. */
  sheenColorTexture?: ShaderTextureDescriptor
  /** {@link ShaderTextureDescriptor | Sheen roughness texture descriptor} (using the `A` channel) to use if any. Format should be `rgba8unorm-srgb` or `rgba8unorm`. */
  sheenRoughnessTexture?: ShaderTextureDescriptor

  /** {@link ShaderTextureDescriptor | Anisotropy texture descriptor} to use if any. Format should be `rgba8unorm`. */
  anisotropyTexture?: ShaderTextureDescriptor

  /** {@link ShaderTextureDescriptor | Clearcoat texture descriptor} (mixing both clearcoat factor in the `R` channel and roughness in the `G` channel) to use if any. Format must be at least `rg8unorm`. */
  clearcoatTexture?: ShaderTextureDescriptor
  /** {@link ShaderTextureDescriptor | Clearcoat factor texture descriptor} (using the `R` channel) to use if any. Format must be at least `r8unorm`. */
  clearcoatFactorTexture?: ShaderTextureDescriptor
  /** {@link ShaderTextureDescriptor | Clearcoat  roughness texture descriptor} (using the `G` channel) to use if any. Format must be at least `rg8unorm`. */
  clearcoatRoughnessTexture?: ShaderTextureDescriptor
  /** {@link ShaderTextureDescriptor | Clearcoat normal texture descriptor} to use if any. Format should be `rgba8unorm`. */
  clearcoatNormalTexture?: ShaderTextureDescriptor

  /** {@link ShaderTextureDescriptor | Iridescence texture descriptor} (using the `R` channel for intensity and `G` channel for thickness) to use if any. Format must be at least `rg8unorm`. */
  iridescenceTexture?: ShaderTextureDescriptor
  /** {@link ShaderTextureDescriptor | Iridescence texture descriptor} (using the `R` channel) to use if any. Format must be at least `r8unorm`. */
  iridescenceFactorTexture?: ShaderTextureDescriptor
  /** {@link ShaderTextureDescriptor | Iridescence thickness texture descriptor} (using the `G` channel) to use if any. Format must be at least `rg8unorm`. */
  iridescenceThicknessTexture?: ShaderTextureDescriptor

  /** {@link ShaderTextureDescriptor | Diffuse transmission texture descriptor} (using the `RGB` channels for color and `A` channel for intensity) to use if any. Format should be `rgba8unorm-srgb`. */
  diffuseTransmissionTexture?: ShaderTextureDescriptor
  /** {@link ShaderTextureDescriptor | Diffuse transmission intensity texture descriptor} (using the `A` channel) to use if any. Format should be `rgba8unorm-srgb` or `rgba8unorm`. */
  diffuseTransmissionFactorTexture?: ShaderTextureDescriptor
  /** {@link ShaderTextureDescriptor | Diffuse transmission texture descriptor} (using the `RGB` channels) to use if any. Format should be `rgba8unorm-srgb`. */
  diffuseTransmissionColorTexture?: ShaderTextureDescriptor
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
  /** Custom fragment shader output structure members and returned values to use if needed. Useful when rendering to a Multiple Render Target for example. */
  fragmentOutput?: FragmentOutput
}

/** Parameters used to create a {@link LitMesh}. */
export interface LitMeshParameters extends Omit<ProjectedMeshParameters, 'shaders' | 'useProjection'> {
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
 * // A mesh with 'Lambert' shading
 * const lambertMesh = new LitMesh(renderer, {
 *   label: 'Mesh with lambert shading',
 *   geometry: new BoxGeometry(),
 *   material: {
 *     shading: 'Lambert',
 *     color: new Vec3(1),
 *   },
 * })
 *
 * // A mesh with a base color texture, 'Phong' shading
 * // and where we modify the output color before the lighting calculations
 *
 * // create a base color texture
 * baseColorTexture = new MediaTexture(renderer, {
 *   label: 'Base color texture',
 *   name: 'baseColorTexture',
 *   format: 'rgba8unorm-srgb',
 *   visibility: ['fragment'],
 * })
 *
 * // load the image
 * baseColorTexture.loadImage('./path/to/texture.jpg')
 *
 * // create the mesh
 * const phongMesh = new LitMesh(renderer, {
 *   label: 'Mesh with phong shading',
 *   geometry: new BoxGeometry(),
 *   material: {
 *     shading: 'Phong',
 *     fragmentChunks: {
 *       // applied after having set the color and baseColorTexture to outputColor
 *       // but before lighting calculations
 *       preliminaryContribution: 'outputColor = mix(outputColor, vec4(vec3(modifiedMaterial.color), 1.0), modifiedMaterial.mixValue);'
 *     },
 *     color: new Vec3(1),
 *     shininess: 60,
 *     baseColorTexture: {
 *       texture: baseColorTexture,
 *     },
 *   },
 *   uniforms: {
 *     modifiedMaterial: {
 *       visibility: ['fragment'],
 *       struct: {
 *         color: {
 *           type: 'vec3f',
 *           value: sRGBToLinear(new Vec3(0.5)), // colors need to be in linear space
 *         },
 *         mixValue: {
 *           type: 'f32',
 *           value: 0.5,
 *         }
 *       },
 *     },
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

    let { material, ...defaultParams } = parameters

    if (!material) material = {}

    // color spaces
    let {
      colorSpace,
      transmissiveInputColorSpace,
      transmissiveInputToneMapping,
      outputColorSpace,
      flatShading,
      fragmentOutput,
    } = material

    if (!colorSpace) {
      colorSpace = 'srgb'
    }

    if (!outputColorSpace) {
      outputColorSpace = 'srgb'
    }

    if (!transmissiveInputColorSpace) {
      transmissiveInputColorSpace = 'srgb'
    }

    if (transmissiveInputToneMapping === undefined) {
      transmissiveInputToneMapping = 'Khronos'
    }

    if (!fragmentOutput) {
      fragmentOutput = {
        struct: [
          {
            type: 'vec4f',
            name: 'color',
          },
        ],
        output: /* wgsl */ `
  var output: FSOutput;
  output.color = outputColor;
  return output;`,
      }
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
      multiscatterColor,
      scatterAnisotropy,
      sheenColor,
      sheenRoughness,
      anisotropy,
      anisotropyVector,
      clearcoat,
      clearcoatRoughness,
      clearcoatNormalScale,
      iridescence,
      iridescenceIOR,
      iridescenceThicknessRange,
      diffuseTransmission,
      diffuseTransmissionColor,
      // texture descriptors
      baseColorTexture,
      normalTexture,
      emissiveTexture,
      occlusionTexture,
      metallicRoughnessTexture,
      specularTexture,
      specularFactorTexture,
      specularColorTexture,
      transmissionThicknessTexture,
      transmissionTexture,
      thicknessTexture,
      sheenTexture,
      sheenColorTexture,
      sheenRoughnessTexture,
      anisotropyTexture,
      clearcoatTexture,
      clearcoatFactorTexture,
      clearcoatRoughnessTexture,
      clearcoatNormalTexture,
      iridescenceTexture,
      iridescenceFactorTexture,
      iridescenceThicknessTexture,
      diffuseTransmissionTexture,
      diffuseTransmissionFactorTexture,
      diffuseTransmissionColorTexture,
      // environment map
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
      multiscatterColor,
      scatterAnisotropy,
      sheenColor,
      sheenRoughness,
      anisotropy,
      anisotropyVector,
      clearcoat,
      clearcoatRoughness,
      clearcoatNormalScale,
      iridescence,
      iridescenceIOR,
      iridescenceThicknessRange,
      diffuseTransmission,
      diffuseTransmissionColor,
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
      transmissionThicknessTexture,
      transmissionTexture,
      thicknessTexture,
      sheenTexture,
      sheenColorTexture,
      sheenRoughnessTexture,
      anisotropyTexture,
      clearcoatTexture,
      clearcoatFactorTexture,
      clearcoatRoughnessTexture,
      clearcoatNormalTexture,
      iridescenceTexture,
      iridescenceFactorTexture,
      iridescenceThicknessTexture,
      diffuseTransmissionTexture,
      diffuseTransmissionFactorTexture,
      diffuseTransmissionColorTexture,
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
    const useEnvMap = environmentMap && (shading === 'PBR' || !shading)
    if (useEnvMap) {
      // add environment map textures and sampler
      if (!defaultParams.textures) {
        defaultParams.textures = []
      }

      defaultParams.textures = [
        ...defaultParams.textures,
        environmentMap.diffuseTexture,
        environmentMap.specularTexture,
      ]

      // if environment map has a LUT texture
      if (environmentMap.lutTexture) {
        defaultParams.textures = [...defaultParams.textures, environmentMap.lutTexture]
      }

      if (!defaultParams.samplers) {
        defaultParams.samplers = []
      }

      defaultParams.samplers = [...defaultParams.samplers, environmentMap.sampler]
    }

    // PBR extensions
    const extensionsUsed: MaterialExtensionKeys[] = []

    // transmission background texture for transmissive objects
    let transmissionBackgroundTexture = null
    if (parameters.transmissive) {
      extensionsUsed.push('KHR_materials_transmission')

      renderer.createTransmissionTarget()
      transmissionBackgroundTexture = {
        texture: renderer.transmissionTarget.texture,
        sampler: renderer.transmissionTarget.sampler,
      }
    }

    if (thickness) {
      extensionsUsed.push('KHR_materials_volume')
    }

    if (dispersion) {
      extensionsUsed.push('KHR_materials_dispersion')
    }

    if (sheenColor || sheenRoughness) {
      extensionsUsed.push('KHR_materials_sheen')
    }

    if (anisotropy !== undefined) {
      extensionsUsed.push('KHR_materials_anisotropy')
    }

    if (clearcoat) {
      extensionsUsed.push('KHR_materials_clearcoat')
    }

    if (iridescence) {
      extensionsUsed.push('KHR_materials_iridescence')
    }

    if (diffuseTransmission !== undefined) {
      extensionsUsed.push('KHR_materials_diffuse_transmission')
    }

    if (multiscatterColor !== undefined || scatterAnisotropy !== undefined) {
      extensionsUsed.push('KHR_materials_volume_scatter')
    }

    const hasNormal = defaultParams.geometry && defaultParams.geometry.getAttributeByName('normal')

    if (defaultParams.geometry && !hasNormal) {
      // compute geometry right away
      // so we have fresh attributes to send to the shaders' generation helper functions
      defaultParams.geometry.computeGeometry()
      // no normals? use flat shading
      flatShading = true
    }

    // shaders
    const vs = LitMesh.getVertexShaderCode({
      bindings: defaultParams.bindings as BufferBinding[],
      geometry: defaultParams.geometry,
      chunks: vertexChunks,
      additionalVaryings,
    })

    const cullMode = parameters.cullMode ?? 'back'

    const fs = LitMesh.getFragmentShaderCode({
      shadingModel: shading,
      outputColorSpace,
      fragmentOutput,
      chunks: fragmentChunks,
      extensionsUsed,
      receiveShadows: defaultParams.receiveShadows,
      cullMode,
      flatShading,
      toneMapping,
      transmissiveInputColorSpace,
      transmissiveInputToneMapping,
      geometry: defaultParams.geometry,
      additionalVaryings,
      materialUniform,
      baseColorTexture,
      normalTexture,
      metallicRoughnessTexture,
      specularTexture,
      specularFactorTexture,
      specularColorTexture,
      transmissionThicknessTexture,
      transmissionTexture,
      thicknessTexture,
      emissiveTexture,
      occlusionTexture,
      sheenTexture,
      sheenColorTexture,
      sheenRoughnessTexture,
      anisotropyTexture,
      clearcoatTexture,
      clearcoatFactorTexture,
      clearcoatRoughnessTexture,
      clearcoatNormalTexture,
      iridescenceTexture,
      iridescenceFactorTexture,
      iridescenceThicknessTexture,
      diffuseTransmissionTexture,
      diffuseTransmissionFactorTexture,
      diffuseTransmissionColorTexture,
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

    if (useEnvMap) {
      environmentMap.onRotationAxisChanged(() => {
        this.uniforms.material.envRotation.value = environmentMap.rotationMatrix
      })
    }
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
      multiscatterColor,
      scatterAnisotropy,
      sheenColor,
      sheenRoughness,
      anisotropy,
      anisotropyVector,
      clearcoat,
      clearcoatRoughness,
      clearcoatNormalScale,
      iridescence,
      iridescenceIOR,
      iridescenceThicknessRange,
      diffuseTransmission,
      diffuseTransmissionColor,
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

    // diffuse struct (lambert)
    const diffuseUniformStruct: Record<string, Input> = {
      ...baseUniformStruct,
      normalScale: {
        type: 'vec2f',
        value: normalScale !== undefined ? normalScale : new Vec2(1),
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
      multiscatterColor: {
        type: 'vec3f',
        value:
          multiscatterColor !== undefined
            ? colorSpace === 'srgb'
              ? sRGBToLinear(multiscatterColor.clone())
              : multiscatterColor.clone()
            : new Vec3(0),
      },
      scatterAnisotropy: {
        type: 'f32',
        value: scatterAnisotropy !== undefined ? scatterAnisotropy : 0,
      },
      // sheen
      sheenColor: {
        type: 'vec3f',
        value:
          sheenColor !== undefined
            ? colorSpace === 'srgb'
              ? sRGBToLinear(sheenColor.clone())
              : sheenColor.clone()
            : new Vec3(0),
      },
      sheenRoughness: {
        type: 'f32',
        value: sheenRoughness !== undefined ? sheenRoughness : 0,
      },
      // anisotropy
      anisotropy: {
        type: 'f32',
        value: anisotropy !== undefined ? anisotropy : 0,
      },
      anisotropyVector: {
        type: 'vec2f',
        value: anisotropyVector !== undefined ? anisotropyVector.clone() : new Vec2(1, 0),
      },
      // clearcoat
      clearcoat: {
        type: 'f32',
        value: clearcoat !== undefined ? clearcoat : 0,
      },
      clearcoatRoughness: {
        type: 'f32',
        value: clearcoatRoughness !== undefined ? clearcoatRoughness : 0,
      },
      clearcoatNormalScale: {
        type: 'vec2f',
        value: clearcoatNormalScale !== undefined ? clearcoatNormalScale.clone() : new Vec2(1),
      },
      // iridescence
      iridescence: {
        type: 'f32',
        value: iridescence !== undefined ? iridescence : 0,
      },
      iridescenceIOR: {
        type: 'f32',
        value: iridescenceIOR !== undefined ? iridescenceIOR : 1.3,
      },
      iridescenceThicknessRange: {
        type: 'vec2f',
        value: iridescenceThicknessRange !== undefined ? iridescenceThicknessRange.clone() : new Vec2(100, 400),
      },
      diffuseTransmission: {
        type: 'f32',
        value: diffuseTransmission !== undefined ? diffuseTransmission : 0,
      },
      diffuseTransmissionColor: {
        type: 'vec3f',
        value:
          diffuseTransmissionColor !== undefined
            ? colorSpace === 'srgb'
              ? sRGBToLinear(diffuseTransmissionColor.clone())
              : diffuseTransmissionColor.clone()
            : new Vec3(1),
      },
      ...(environmentMap && {
        envRotation: {
          type: 'mat3x3f',
          value: environmentMap.rotationMatrix,
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
      transmissionThicknessTexture,
      transmissionTexture,
      thicknessTexture,
      sheenTexture,
      sheenColorTexture,
      sheenRoughnessTexture,
      anisotropyTexture,
      clearcoatTexture,
      clearcoatFactorTexture,
      clearcoatRoughnessTexture,
      clearcoatNormalTexture,
      iridescenceTexture,
      iridescenceFactorTexture,
      iridescenceThicknessTexture,
      diffuseTransmissionTexture,
      diffuseTransmissionFactorTexture,
      diffuseTransmissionColorTexture,
    } = parameters

    // base textures (unlit)
    const baseTextures = [baseColorTexture, emissiveTexture, occlusionTexture]

    // diffuse textures (lambert)
    const diffuseTextures = [...baseTextures, normalTexture]

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
    const pbrTextures = [
      ...specularTextures,
      transmissionThicknessTexture,
      transmissionTexture,
      thicknessTexture,
      sheenTexture,
      sheenColorTexture,
      sheenRoughnessTexture,
      anisotropyTexture,
      clearcoatTexture,
      clearcoatFactorTexture,
      clearcoatRoughnessTexture,
      clearcoatNormalTexture,
      iridescenceTexture,
      iridescenceFactorTexture,
      iridescenceThicknessTexture,
      diffuseTransmissionTexture,
      diffuseTransmissionFactorTexture,
      diffuseTransmissionColorTexture,
    ]

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
