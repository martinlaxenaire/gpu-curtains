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

/** Define the `KHR_materials_dispersion` extension materials options. */
export interface GLTFDispersionExtension {
  /** The strength of the dispersion effect, specified as 20/Abbe number. Default to `0`. */
  dispersion?: number
}

/** Define the `KHR_materials_ior` extension materials options. */
export interface GLTFIorExtension {
  /** The index of refraction. Default to `1.5`.  */
  ior?: number
}

/** Define the `KHR_materials_specular` extension materials options. */
export interface GLTFSpecularExtension {
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
export interface GLTFTransmissionExtension {
  /** The base percentage of light that is transmitted through the surface. Default to `0`. */
  transmissionFactor?: number
  /** A texture that defines the transmission percentage of the surface, stored in the `R` channel. This will be multiplied by `transmissionFactor`. */
  transmissionTexture?: GLTF.ITextureInfo
}

/** Define the `KHR_materials_volume` extension materials options. */
export interface GLTFVolumeExtension {
  /** The thickness of the volume beneath the surface. The value is given in the coordinate space of the mesh. If the value is 0 the material is thin-walled. Otherwise the material is a volume boundary. The doubleSided property has no effect on volume boundaries. Range is [0, +inf). Default to `0`. */
  thicknessFactor?: number
  /** A texture that defines the thickness, stored in the `G` channel. This will be multiplied by `thicknessFactor`. Range is [0, 1]. */
  thicknessTexture?: GLTF.ITextureInfo
  /** Density of the medium given as the average distance that light travels in the medium before interacting with a particle. The value is given in world space. Range is (0, +inf). Default to `Infinity`. */
  attenuationDistance?: number
  /** The color that white light turns into due to absorption when reaching the attenuation distance. Default to `[1, 1, 1]`. */
  attenuationColor?: [number, number, number]
}

/** Define the `EXT_mesh_gpu_instancing` extension materials options. */
export interface GLTFInstancingExtension {
  /** contains accessor ids for the `TRANSLATION`, `ROTATION`, and `SCALE` attribute buffers, all of which are optional. */
  attributes?: GLTF.IMeshPrimitive['attributes']
}

/** Base mapping for all potential GLTF extension types. */
export type GLTFExtensionsMapping = {
  /** Define the `KHR_materials_dispersion` extension materials options. */
  KHR_materials_dispersion: GLTFDispersionExtension
  /** Define the `KHR_materials_ior` extension materials options. */
  KHR_materials_ior: GLTFIorExtension
  /** Define the `KHR_materials_transmission` extension materials options. */
  KHR_materials_transmission: GLTFTransmissionExtension
  /** Define the `KHR_materials_specular` extension materials options. */
  KHR_materials_specular: GLTFSpecularExtension
  /** Define the `KHR_materials_volume` extension materials options. */
  KHR_materials_volume: GLTFVolumeExtension
  /** Define the `EXT_mesh_gpu_instancing` extension materials options. */
  EXT_mesh_gpu_instancing: GLTFInstancingExtension
}

/** Extract keys from GLTFExtensionsTypes that are present in GLTFExtensionsMapping. */
export type MaterialExtensionKeys = Extract<keyof GLTFExtensionsMapping, GLTFExtensionsTypes>

/**  All the glTF materials extensions properties. */
export type GLTFMaterialsExtensions = Pick<GLTFExtensionsMapping, MaterialExtensionKeys>
