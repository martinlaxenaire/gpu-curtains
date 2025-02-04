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

/* DISPERSION */

/** Define the `KHR_materials_dispersion` extension materials options. */
export interface GLTFMaterialsDispersionExtension {
  /** The strength of the dispersion effect, specified as 20/Abbe number. Default to `0`. */
  dispersion?: number
}

/* EMISSIVE STRENGTH */

/** Define the `KHR_materials_emissive_strength` extension materials options. */
export interface GLTFMaterialsEmissiveStrengthExtension {
  /** The strength adjustment to be multiplied with the material's emissive value. Default to `1.0`. */
  emissiveStrength?: number
}

/* IOR */

/** Define the `KHR_materials_ior` extension materials options. */
export interface GLTFMaterialsIorExtension {
  /** The index of refraction. Default to `1.5`.  */
  ior?: number
}

/* SPECULAR */

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

/* TRANSMISSION */

/** Define the `KHR_materials_transmission` extension materials options. */
export interface GLTFMaterialsTransmissionExtension {
  /** The base percentage of light that is transmitted through the surface. Default to `0`. */
  transmissionFactor?: number
  /** A texture that defines the transmission percentage of the surface, stored in the `R` channel. This will be multiplied by `transmissionFactor`. */
  transmissionTexture?: GLTF.ITextureInfo
}

/* VARIANTS */

/** Define the `KHR_materials_variants` extension top level options. */
export interface GLTFVariants {
  /** Array of available variants names. */
  variants?: Array<Record<'name', string>>
}

/** Define the `KHR_materials_variants` extension materials options. */
export interface GLTFMaterialsVariants {
  /** Defines the mappings between the registered material variants in the glTF extension declared at top level and a {@link GLTF.IMeshPrimitive.material | glTF material index}. */
  mappings?: Array<{
    /** {@link GLTF.IMeshPrimitive.material | glTF material index} to use for the variants. */
    material?: GLTF.IMeshPrimitive['material']
    /** Variants indices fom the glTF extension declared at top level. */
    variants?: number[]
  }>
}

/* VOLUME */

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

/* INSTANCING */

/** Define the `EXT_mesh_gpu_instancing` extension materials options. */
export interface GLTFMeshGPUInstancingExtension {
  /** contains accessor ids for the `TRANSLATION`, `ROTATION`, and `SCALE` attribute buffers, all of which are optional. */
  attributes?: GLTF.IMeshPrimitive['attributes']
}

/* TOP LEVEL EXTENSIONS */

/** Base mapping for all potential top level GLTF extensions types. */
export type GLTFExtensionsMapping = {
  /** Define the `KHR_materials_variants` extension options. */
  KHR_materials_variants: GLTFVariants
}

/** Extract keys from GLTFExtensionsTypes that are present in GLTFMaterialsExtensionsMapping. */
export type ExtensionKeys = Extract<keyof GLTFExtensionsMapping, GLTFExtensionsTypes>

/**  All the glTF materials extensions properties. */
export type GLTFExtensions = Pick<GLTFExtensionsMapping, ExtensionKeys>

/* MATERIALS EXTENSIONS */

/** Base mapping for all potential GLTF materials extensions types. */
export type GLTFMaterialsExtensionsMapping = {
  /** Define the `KHR_materials_dispersion` extension materials options. */
  KHR_materials_dispersion: GLTFMaterialsDispersionExtension
  /** Define the `KHR_materials_emissive_strength` extension materials options. */
  KHR_materials_emissive_strength: GLTFMaterialsEmissiveStrengthExtension
  /** Define the `KHR_materials_ior` extension materials options. */
  KHR_materials_ior: GLTFMaterialsIorExtension
  /** Define the `KHR_materials_variants` extension materials options. */
  KHR_materials_variants: GLTFMaterialsVariants
  /** Define the `KHR_materials_transmission` extension materials options. */
  KHR_materials_transmission: GLTFMaterialsTransmissionExtension
  /** Define the `KHR_materials_specular` extension materials options. */
  KHR_materials_specular: GLTFMaterialsSpecularExtension
  /** Define the `KHR_materials_unlit` extension materials options. */
  KHR_materials_unlit: Record<string, never>
  /** Define the `KHR_materials_volume` extension materials options. */
  KHR_materials_volume: GLTFMaterialsVolumeExtension
  /** Define the `EXT_mesh_gpu_instancing` extension materials options. */
  EXT_mesh_gpu_instancing: GLTFMeshGPUInstancingExtension
}

/** Extract keys from GLTFExtensionsTypes that are present in GLTFMaterialsExtensionsMapping. */
export type MaterialExtensionKeys = Extract<keyof GLTFMaterialsExtensionsMapping, GLTFExtensionsTypes>

/**  All the glTF materials extensions properties. */
export type GLTFMaterialsExtensions = Pick<GLTFMaterialsExtensionsMapping, MaterialExtensionKeys>
