import { GLTF } from './GLTF'

/** List of available glTF extensions. */
export type GLTFExtensionsTypes =
  | 'KHR_animation_pointer'
  | 'KHR_draco_mesh_compression'
  | 'KHR_lights_punctual'
  | 'KHR_materials_anisotropy'
  | 'KHR_materials_clearcoat'
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
  | 'KHR_mesh_quantization'
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
  /** contains accessor ids for the `TRANSLATION`, `ROTATION`, and `SCALE` attribute buffers, all of which are optional. */
  attributes?: GLTF.IMeshPrimitive['attributes']
}

/** Base mapping for all potential nodes GLTF extensions types. */
export type GLTFNodesExtensionsMapping = {
  /** Define the `KHR_lights_punctual` extension node options. */
  KHR_lights_punctual: GLTFLightsPunctualExtension
  /** Define the `EXT_mesh_gpu_instancing` extension node options. */
  EXT_mesh_gpu_instancing: GLTFMeshGPUInstancingExtension
}

/** Extract keys from GLTFExtensionsTypes that are present in GLTFNodesExtensionsMapping. */
export type NodesExtensionKeys = Extract<keyof GLTFNodesExtensionsMapping, GLTFExtensionsTypes>

/**  All the glTF nodes extensions properties. */
export type GLTFNodesExtensions = Pick<GLTFNodesExtensionsMapping, NodesExtensionKeys>

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

/** Base mapping for all potential primitives GLTF extensions types. */
export type GLTFPrimitivesExtensionsMapping = {
  /** Define the `KHR_materials_variants` extension primitives options. */
  KHR_materials_variants: GLTFMaterialsVariants
}

/** Extract keys from GLTFExtensionsTypes that are present in GLTFPrimitivesExtensionsMapping. */
export type PrimitivesExtensionKeys = Extract<keyof GLTFPrimitivesExtensionsMapping, GLTFExtensionsTypes>

/**  All the glTF primitives extensions properties. */
export type GLTFPrimitivesExtensions = Pick<GLTFPrimitivesExtensionsMapping, PrimitivesExtensionKeys>

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
}

/** Extract keys from GLTFExtensionsTypes that are present in GLTFMaterialsExtensionsMapping. */
export type MaterialExtensionKeys = Extract<keyof GLTFMaterialsExtensionsMapping, GLTFExtensionsTypes>

/**  All the glTF materials extensions properties. */
export type GLTFMaterialsExtensions = Pick<GLTFMaterialsExtensionsMapping, MaterialExtensionKeys>
