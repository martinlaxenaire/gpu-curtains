import { GLTF } from './GLTF'

/** List of available glTF extensions. */
export type GLTFExtensionsTypes =
  | 'KHR_animation_pointer'
  | 'KHR_draco_mesh_compression'
  | 'KHR_lights_punctual'
  | 'KHR_materials_anisotropy'
  | 'KHR_materials_clearcoat'
  | 'KHR_materials_diffuse_transmission'
  | 'KHR_materials_dispersion'
  | 'KHR_materials_emissive_strength'
  | 'KHR_materials_ior'
  | 'KHR_materials_iridescence'
  | 'KHR_materials_sheen'
  | 'KHR_materials_specular'
  | 'KHR_materials_transmission'
  | 'KHR_materials_unlit'
  | 'KHR_materials_variants'
  | 'KHR_materials_volume'
  | 'KHR_materials_volume_scatter'
  | 'KHR_mesh_quantization'
  | 'KHR_node_visibility'
  | 'KHR_texture_basisu'
  | 'KHR_texture_transform'
  | 'KHR_xmp_json_ld'
  | 'KHR_xmp'
  | 'EXT_mesh_gpu_instancing'
  | 'EXT_meshopt_compression'
  | 'EXT_texture_webp'

/** Array of all available glTF extensions. */
export type GLTFExtensionsUsed = Array<GLTFExtensionsTypes>

/* TOP LEVEL EXTENSIONS */

/** Define the `KHR_lights_punctual` extension top level options. */
export interface GLTFLightsPunctual {
  /** Array of available lights. */
  lights?: Array<{
    /** Name of the light. Default to `''`. */
    name?: string
    /** RGB value for the light's color in linear space. Default to `[1, 1, 1]`. */
    color?: [number, number, number]
    /** Brightness of the light. The units that this is defined in depend on the type of light. `point` and `spot` lights use luminous intensity in candela (lm/sr) while `directional` lights use illuminance in lux (lm/m2). Default to `1`. */
    intensity?: number
    /** Declares the type of the light. */
    type: 'directional' | 'point' | 'spot'
    /** Hint defining a distance cutoff at which the light's intensity may be considered to have reached zero. Supported only for `point` and `spot` lights. Must be > 0. When undefined, range is assumed to be infinite. */
    range?: number
    /** When a light's type is `spot`, this property on the light is required. */
    spot?: {
      /** Angle, in radians, from centre of spotlight where falloff begins. Must be greater than or equal to `0` and less than `outerConeAngle`. Default to `0`. */
      innerConeAngle?: number
      /** Angle, in radians, from centre of spotlight where falloff ends. Must be greater than `innerConeAngle` and less than or equal to `PI / 2.0`. Default to `PI / 4.0`. */
      outerConeAngle?: number
    }
  }>
}

/** Define the `KHR_materials_variants` extension top level options. */
export interface GLTFVariants {
  /** Array of available variants names. */
  variants?: Array<Record<'name', string>>
}

/** Base mapping for all potential top level GLTF extensions types. */
export type GLTFExtensionsMapping = {
  /** Define the `KHR_lights_punctual` extension options. */
  KHR_lights_punctual: GLTFLightsPunctual
  /** Define the `KHR_materials_variants` extension options. */
  KHR_materials_variants: GLTFVariants
}

/** Extract keys from GLTFExtensionsTypes that are present in GLTFExtensionsMapping. */
export type ExtensionKeys = Extract<keyof GLTFExtensionsMapping, GLTFExtensionsTypes>

/**  All the glTF top level extensions properties. */
export type GLTFExtensions = Pick<GLTFExtensionsMapping, ExtensionKeys>

/* NODE EXTENSIONS */

/** Define the `KHR_lights_punctual` extension nodes options. */
export interface GLTFLightsPunctualExtension {
  /** Index into the {@link GLTFExtensions} lights array representing the light to use. */
  light: number
}

/** Define the `EXT_mesh_gpu_instancing` extension nodes options. */
export interface GLTFMeshGPUInstancingExtension {
  /** Contains accessor ids for the `TRANSLATION`, `ROTATION`, and `SCALE` attribute buffers, all of which are optional. */
  attributes?: GLTF.IMeshPrimitive['attributes']
}

/** Defines the `KHR_node_visibility` extension nodes options. */
export interface GLTFNodeVisibilityExtension {
  /** Specifies whether the node is visible. */
  visible?: boolean
}

/** Base mapping for all potential nodes GLTF extensions types. */
export type GLTFNodesExtensionsMapping = {
  /** Define the `KHR_lights_punctual` extension node options. */
  KHR_lights_punctual: GLTFLightsPunctualExtension
  /** Define the `EXT_mesh_gpu_instancing` extension node options. */
  EXT_mesh_gpu_instancing: GLTFMeshGPUInstancingExtension
  /** Define the `KHR_node_visibility` extension node options. */
  KHR_node_visibility: GLTFNodeVisibilityExtension
}

/** Extract keys from GLTFExtensionsTypes that are present in GLTFNodesExtensionsMapping. */
export type NodesExtensionKeys = Extract<keyof GLTFNodesExtensionsMapping, GLTFExtensionsTypes>

/**  All the glTF nodes extensions properties. */
export type GLTFNodesExtensions = Pick<GLTFNodesExtensionsMapping, NodesExtensionKeys>

/* ANIMATION TARGETS EXTENSION */

/** Defines the `KHR_animation_pointer` extension animations targets options. */
export interface GLTFAnimationPointerExtension {
  /** Pointer path to the specific glTF asset property to animate. */
  pointer: string
}

/** Base mapping for all potential animstions targets GLTF extensions types. */
export type GLTFAnimationsTargetsExtensionsMapping = {
  /** Define the `KHR_animation_pointer` extension animation target options. */
  KHR_animation_pointer: GLTFAnimationPointerExtension
}

/** Extract keys from GLTFExtensionsTypes that are present in GLTFAnimationsTargetsExtensionsMapping. */
export type AnimationsTargetsExtensionKeys = Extract<keyof GLTFAnimationsTargetsExtensionsMapping, GLTFExtensionsTypes>

/**  All the glTF animations targets extensions properties. */
export type GLTFAnimationsTargetsExtensions = Pick<
  GLTFAnimationsTargetsExtensionsMapping,
  AnimationsTargetsExtensionKeys
>

/* PRIMITIVE EXTENSIONS */

/** Define the `KHR_materials_variants` extension primitives options. */
export interface GLTFMaterialsVariants {
  /** Defines the mappings between the registered material variants in the glTF extension declared at top level and a {@link GLTF.IMeshPrimitive.material | glTF material index}. */
  mappings?: Array<{
    /** {@link GLTF.IMeshPrimitive.material | glTF material index} to use for the variants. */
    material?: GLTF.IMeshPrimitive['material']
    /** Variants indices fom the glTF extension declared at top level. */
    variants?: number[]
  }>
}

/** Define the `KHR_draco_mesh_compression` extension primitives options. */
export interface GLTFDracoMeshCompression {
  /** Index of the buffer containing compressed data. */
  bufferView: number
  /** Attributes stored in the decompressed geometry. Each attribute is associated with an attribute id which is its unique id in the compressed data. */
  attributes: GLTF.IMeshPrimitive['attributes']
}

/** Base mapping for all potential primitives GLTF extensions types. */
export type GLTFPrimitivesExtensionsMapping = {
  /** Define the `KHR_materials_variants` extension primitives options. */
  KHR_materials_variants: GLTFMaterialsVariants
  /** Define the `KHR_draco_mesh_compression` extension primitives options. */
  KHR_draco_mesh_compression: GLTFDracoMeshCompression
}

/** Extract keys from GLTFExtensionsTypes that are present in GLTFPrimitivesExtensionsMapping. */
export type PrimitivesExtensionKeys = Extract<keyof GLTFPrimitivesExtensionsMapping, GLTFExtensionsTypes>

/**  All the glTF primitives extensions properties. */
export type GLTFPrimitivesExtensions = Pick<GLTFPrimitivesExtensionsMapping, PrimitivesExtensionKeys>

/* TEXTURES EXTENSIONS */

/** Define the `EXT_texture_webp` extension textures options. */
export interface GLTFTextureWebP {
  /** Specifies a source property that contains the index of the WebP image object. */
  source: number
}

/** Define the `KHR_texture_basisu` extension textures options. */
export interface GLTFTextureBasisU {
  /** Specifies a source property that contains the index of the Basis Universal image object. */
  source: number
}

/** Base mapping for all potential textures GLTF extensions types. */
export type GLTFTexturesExtensionsMapping = {
  /** Define the `EXT_texture_webp` extension textures options. */
  EXT_texture_webp: GLTFTextureWebP
  /** Define the `KHR_texture_basisu` extension textures options. */
  KHR_texture_basisu: GLTFTextureBasisU
}

/** Extract keys from GLTFExtensionsTypes that are present in GLTFTexturesExtensions. */
export type TexturesExtensionKeys = Extract<keyof GLTFTexturesExtensionsMapping, GLTFExtensionsTypes>

/**  All the glTF textures extensions properties. */
export type GLTFTexturesExtensions = Pick<GLTFTexturesExtensionsMapping, TexturesExtensionKeys>

/* TEXTURES INFOS EXTENSIONS */

/** Define the `KHR_texture_transform` extension textures infos options. */
export interface GLTFTextureTransform {
  /** The offset of the UV coordinate origin as a factor of the texture dimensions. Default to `[0.0, 0.0]`. */
  offset?: [number, number]
  /** Rotate the UVs by this many radians counter-clockwise around the origin. This is equivalent to a similar rotation of the image clockwise. Default to `0`. */
  rotation?: number
  /** The scale factor applied to the components of the UV coordinates. Default to `[1.0, 1.0]`. */
  scale?: [number, number]
  /** Overrides the textureInfo texCoord value if supplied, and if this extension is supported. */
  texCoord?: number
}

/** Base mapping for all potential textures infos GLTF extensions types. */
export type GLTFTexturesInfosExtensionsMapping = {
  /** Define the `KHR_texture_transform` extension textures infos options. */
  KHR_texture_transform: GLTFTextureTransform
}

/** Extract keys from GLTFExtensionsTypes that are present in GLTFTexturesInfosExtensionsMapping. */
export type TexturesInfosExtensionKeys = Extract<keyof GLTFTexturesInfosExtensionsMapping, GLTFExtensionsTypes>

/**  All the glTF textures infos extensions properties. */
export type GLTFTexturesInfosExtensions = Pick<GLTFTexturesInfosExtensionsMapping, TexturesInfosExtensionKeys>

/* MATERIALS EXTENSIONS */

/** Define the `KHR_materials_dispersion` extension materials options. */
export interface GLTFMaterialsDispersionExtension {
  /** The strength of the dispersion effect, specified as 20/Abbe number. Default to `0`. */
  dispersion?: number
}

/** Define the `KHR_materials_emissive_strength` extension materials options. */
export interface GLTFMaterialsEmissiveStrengthExtension {
  /** The strength adjustment to be multiplied with the material's emissive value. Default to `1.0`. */
  emissiveStrength?: number
}

/** Define the `KHR_materials_ior` extension materials options. */
export interface GLTFMaterialsIorExtension {
  /** The index of refraction. Default to `1.5`.  */
  ior?: number
}

/** Define the `KHR_materials_specular` extension materials options. */
export interface GLTFMaterialsSpecularExtension {
  /** The strength of the specular reflection. Default to `1`. */
  specularFactor?: number
  /** A texture that defines the strength of the specular reflection, stored in the alpha (`A`) channel. This will be multiplied by `specularFactor`. */
  specularTexture?: GLTF.ITextureInfo
  /** The F0 color of the specular reflection (linear `RGB`). Default to `[1, 1, 1]`. */
  specularColorFactor?: [number, number, number]
  /** A texture that defines the F0 color of the specular reflection, stored in the `RGB` channels and encoded in sRGB. This texture will be multiplied by `specularColorFactor`. */
  specularColorTexture?: GLTF.ITextureInfo
}

/** Define the `KHR_materials_transmission` extension materials options. */
export interface GLTFMaterialsTransmissionExtension {
  /** The base percentage of light that is transmitted through the surface. Default to `0`. */
  transmissionFactor?: number
  /** A texture that defines the transmission percentage of the surface, stored in the `R` channel. This will be multiplied by `transmissionFactor`. */
  transmissionTexture?: GLTF.ITextureInfo
}

/** Define the `KHR_materials_volume` extension materials options. */
export interface GLTFMaterialsVolumeExtension {
  /** The thickness of the volume beneath the surface. The value is given in the coordinate space of the mesh. If the value is 0 the material is thin-walled. Otherwise the material is a volume boundary. The doubleSided property has no effect on volume boundaries. Range is [0, +inf). Default to `0`. */
  thicknessFactor?: number
  /** A texture that defines the thickness, stored in the `G` channel. This will be multiplied by `thicknessFactor`. Range is [0, 1]. */
  thicknessTexture?: GLTF.ITextureInfo
  /** Density of the medium given as the average distance that light travels in the medium before interacting with a particle. The value is given in world space. Range is (0, +inf). Default to `Infinity`. */
  attenuationDistance?: number
  /** The color that white light turns into due to absorption when reaching the attenuation distance. Default to `[1, 1, 1]`. */
  attenuationColor?: [number, number, number]
}

/** Define the `KHR_materials_volume_scatter` extension materials options. */
export interface GLTFMaterialsVolumeScatterExtension {
  /** The multi-scatter albedo. Default to `[0, 0, 0]`. */
  multiscatterColor?: [number, number, number]
  /** The anisotropy of scatter events. Range is (-1, 1).	 Default to `0`. */
  scatterAnisotropy?: number
}

/** Define the `KHR_materials_sheen` extension materials options. */
export interface GLTFMaterialsSheenExtension {
  /** The sheen color in linear space. Default to `[0, 0, 0]`. */
  sheenColorFactor?: [number, number, number]
  /** The sheen color, stored in the `RGB` channels. The sheen color is in sRGB transfer function. */
  sheenColorTexture?: GLTF.ITextureInfo
  /** The sheen roughness. Default to `0`. */
  sheenRoughnessFactor?: number
  /** The sheen roughness texture, stored in the alpha `A` channel. */
  sheenRoughnessTexture?: GLTF.ITextureInfo
}

/** Define the `KHR_materials_clearcoat` extension materials options. */
export interface GLTFMaterialsClearcoatExtension {
  /** The clearcoat layer intensity. Default to `0`. */
  clearcoatFactor?: number
  /** The clearcoat layer intensity texture (RGB in linear space). */
  clearcoatTexture?: GLTF.ITextureInfo
  /** The clearcoat layer roughness. Default to `0`. */
  clearcoatRoughnessFactor?: number
  /** The clearcoat layer roughness texture (RGB in linear space). */
  clearcoatRoughnessTexture?: GLTF.ITextureInfo
  /** The clearcoat normal map texture. */
  clearcoatNormalTexture?: GLTF.IMaterialNormalTextureInfo
}

/** Define the `KHR_materials_anisotropy` extension materials options. */
export interface GLTFMaterialsAnisotropyExtension {
  /** The anisotropy strength. When the `anisotropyTexture` is present, this value is multiplied by the texture's `B` channel. Default to `0`. */
  anisotropyStrength?: number
  /** The rotation of the anisotropy in tangent, bitangent space, measured in radians counter-clockwise from the tangent. When the `anisotropyTexture` is present, this value provides additional rotation to the vectors in the texture. Default to `0`. */
  anisotropyRotation?: number
  /** The anisotropy texture. `R` and `G` channels represent the anisotropy direction in `[-1, 1]` tangent, bitangent space to be rotated by the anisotropy rotation. The `B` channel contains strength as `[0, 1]` to be multiplied by the `anisotropyStrength`. */
  anisotropyTexture?: GLTF.ITextureInfo
}

/** Define the `KHR_materials_iridescence` extension materials options. */
export interface GLTFMaterialsIridescenceExtension {
  /** The iridescence intensity factor. Default to `0`. */
  iridescenceFactor?: number
  /** The iridescence intensity texture, stored in the `R` channel. */
  iridescenceTexture?: GLTF.ITextureInfo
  /** The index of refraction of the dielectric thin-film layer. Default to `1.3`. */
  iridescenceIor?: number
  /** The minimum thickness of the thin-film layer given in nanometers. Default to `100`. */
  iridescenceThicknessMinimum?: number
  /** The maximum thickness of the thin-film layer given in nanometers. Default to `400`. */
  iridescenceThicknessMaximum?: number
  /** The thickness texture of the thin-film layer, stored in the `G` channel. */
  iridescenceThicknessTexture?: GLTF.ITextureInfo
}

/** Define the `KHR_materials_diffuse_transmission` extension materials options. */
export interface GLTFMaterialsDiffuseTransmissionExtension {
  /** The percentage of non-specularly reflected light that is diffusely transmitted through the surface. Default to `0`. */
  diffuseTransmissionFactor?: number
  /** A texture that defines the percentage of non-specularly reflected light that is diffusely transmitted through the surface. Stored in the alpha `A` channel. */
  diffuseTransmissionTexture?: GLTF.ITextureInfo
  /** The color that modulates the transmitted light. Default to `[1, 1, 1]`. */
  diffuseTransmissionColorFactor?: [number, number, number]
  /** A texture that defines the color that modulates the diffusely transmitted light, stored in the `RGB` channels. */
  diffuseTransmissionColorTexture?: GLTF.ITextureInfo
}

/** Base mapping for all potential GLTF materials extensions types. */
export type GLTFMaterialsExtensionsMapping = {
  /** Define the `KHR_materials_dispersion` extension materials options. */
  KHR_materials_dispersion: GLTFMaterialsDispersionExtension
  /** Define the `KHR_materials_emissive_strength` extension materials options. */
  KHR_materials_emissive_strength: GLTFMaterialsEmissiveStrengthExtension
  /** Define the `KHR_materials_ior` extension materials options. */
  KHR_materials_ior: GLTFMaterialsIorExtension
  /** Define the `KHR_materials_transmission` extension materials options. */
  KHR_materials_transmission: GLTFMaterialsTransmissionExtension
  /** Define the `KHR_materials_specular` extension materials options. */
  KHR_materials_specular: GLTFMaterialsSpecularExtension
  /** Define the `KHR_materials_unlit` extension materials options. */
  KHR_materials_unlit: Record<string, never>
  /** Define the `KHR_materials_volume` extension materials options. */
  KHR_materials_volume: GLTFMaterialsVolumeExtension
  /** Define the `KHR_materials_volume_scatter` extension materials options. */
  KHR_materials_volume_scatter: GLTFMaterialsVolumeScatterExtension
  /** Define the `KHR_materials_sheen` extension materials options. */
  KHR_materials_sheen: GLTFMaterialsSheenExtension
  /** Define the `KHR_materials_clearcoat` extension materials options. */
  KHR_materials_clearcoat: GLTFMaterialsClearcoatExtension
  /** Define the `KHR_materials_anisotropy` extension materials options. */
  KHR_materials_anisotropy: GLTFMaterialsAnisotropyExtension
  /** Define the `KHR_materials_iridescence` extension materials options. */
  KHR_materials_iridescence: GLTFMaterialsIridescenceExtension
  /** Define the `KHR_materials_diffuse_transmission` extension materials options. */
  KHR_materials_diffuse_transmission: GLTFMaterialsDiffuseTransmissionExtension
}

/** Extract keys from GLTFExtensionsTypes that are present in GLTFMaterialsExtensionsMapping. */
export type MaterialExtensionKeys = Extract<keyof GLTFMaterialsExtensionsMapping, GLTFExtensionsTypes>

/**  All the glTF materials extensions properties. */
export type GLTFMaterialsExtensions = Pick<GLTFMaterialsExtensionsMapping, MaterialExtensionKeys>
