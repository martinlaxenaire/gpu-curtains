import { Mesh } from '../../core/meshes/Mesh';
import { CameraRenderer } from '../../core/renderers/utils';
import { GPUCurtains } from '../../curtains/GPUCurtains';
import { ProjectedMeshParameters } from '../../core/meshes/mixins/ProjectedMeshBaseMixin';
import { FragmentShaderInputParams, PBRFragmentShaderInputParams } from '../../core/shaders/full/fragment/get-fragment-shader-code';
import { Vec2 } from '../../math/Vec2';
import { Vec3 } from '../../math/Vec3';
import { AdditionalChunks } from '../../core/shaders/default-material-helpers';
import { VertexShaderInputParams } from '../../core/shaders/full/vertex/get-vertex-shader-code';
import { BufferBindingParams } from '../../core/bindings/BufferBinding';
import { Texture } from '../../core/textures/Texture';
import { MediaTexture } from '../../core/textures/MediaTexture';
import { Sampler } from '../../core/samplers/Sampler';
import { EnvironmentMap } from '../environmentMap/EnvironmentMap';
import { ColorSpace, FragmentOutput } from '../../types/shading';
/** Defines all kinds of shading models available. */
export type ShadingModels = 'Unlit' | 'Lambert' | 'Phong' | 'PBR';
/**
 * Define a {@link ShaderTextureDescriptor} used to associate a {@link core/textures/Texture.Texture | Texture} with the corresponding {@link Sampler} and UV names.
 */
export interface ShaderTextureDescriptor {
    /** {@link Texture} or {@link MediaTexture} to use. */
    texture: Texture | MediaTexture;
    /** {@link Sampler} to use. Fallback to default sampler if not provided. */
    sampler?: Sampler;
    /** Texture coordinate attribute name to use to map this texture. Default to `'uv'`. */
    texCoordAttributeName?: string;
}
/** Define the material uniform parameters. */
export interface LitMeshMaterialUniformParams {
    /** {@link ColorSpace} to use for material uniform colors. All lighting calculations must be done in `linear` space. Default to `srgb` (which means the uniform colors are converted to `linear` space), but glTF internally use `linear`. */
    colorSpace?: ColorSpace;
    /** Base color of the {@link LitMesh} as a {@link Vec3}. Default to `new Vec3(1)`. */
    color?: Vec3;
    /** Opacity of the {@link LitMesh}. If different than `1`, consider setting the `transparent` parameter to `true`. Default to `1`.  */
    opacity?: number;
    /** Alpha cutoff threshold value of the {@link LitMesh}. Default to `0.5`. */
    alphaCutoff?: number;
    /** The metallic factor of the {@link LitMesh}. Default to `1`. */
    metallic?: number;
    /** The roughness factor of the {@link LitMesh}. Default to `1`. */
    roughness?: number;
    /** How much the normal map affects the material normal texture if any. Typical ranges are [0-1]. Default to `new Vec2(1)`. */
    normalScale?: Vec2;
    /** A scalar multiplier controlling the amount of occlusion applied to the occlusion texture if any. Default to `1`. */
    occlusionIntensity?: number;
    /** Emissive intensity to apply to the emissive color of the {@link LitMesh}. Default to `1`. */
    emissiveIntensity?: number;
    /** Emissive color of the {@link LitMesh} as a {@link Vec3}. Default to `new Vec3(0)` (no emissive color). */
    emissiveColor?: Vec3;
    /** The strength of the specular reflections applied to the {@link LitMesh} (not applicable to `Lambert` shading). Default to `1`. */
    specularIntensity?: number;
    /** Specular color to use for the specular reflections of the {@link LitMesh} as a {@link Vec3} (not applicable to `Lambert` shading). Default to `new Vec3(1)`. */
    specularColor?: Vec3;
    /** Shininess of the {@link LitMesh} when using `Phong` shading. Default to `30`. */
    shininess?: number;
    /** The base percentage of light that is transmitted through the surface of the {@link LitMesh}. Only applicable to `PBR` shading if `transmissive` parameter is set to `true`. Default to `0`. */
    transmission?: number;
    /** The index of refraction of the {@link LitMesh}. Default to `1.5`. */
    ior?: number;
    /** The strength of the dispersion effect, specified as 20/Abbe number. Only applicable to `PBR` shading if `transmissive` parameter is set to `true`. Default to `0`. */
    dispersion?: number;
    /** The thickness of the volume beneath the surface. The value is given in the coordinate space of the mesh. If the value is 0 the material is thin-walled. Only applicable to `PBR` shading if `transmissive` parameter is set to `true`. Default to `0`. */
    thickness?: number;
    /** Density of the medium given as the average distance that light travels in the medium before interacting with a particle. The value is given in world space. Only applicable to `PBR` shading if `transmissive` parameter is set to `true`. Default to `Infinity`. */
    attenuationDistance?: number;
    /** The color as a {@link Vec3} that white light turns into due to absorption when reaching the attenuation distance. Only applicable to `PBR` shading if `transmissive` parameter is set to `true`. Default to `new Vec3(1)`. */
    attenuationColor?: Vec3;
}
/** Parameters used to get the {@link LitMesh} material uniforms. */
export interface GetLitMeshMaterialUniform extends LitMeshMaterialUniformParams {
    /** {@link ShadingModels} to use for lighting. Default to `PBR`. */
    shading?: ShadingModels;
    /** {@link EnvironmentMap} to use for IBL shading. */
    environmentMap?: EnvironmentMap;
}
/** {@link ShaderTextureDescriptor} used for a {@link LitMesh} with `Unlit` shading. */
export interface UnlitTexturesDescriptors {
    /** {@link ShaderTextureDescriptor | Base color texture descriptor} to use if any. */
    baseColorTexture?: ShaderTextureDescriptor;
}
/** {@link ShaderTextureDescriptor} used for a {@link LitMesh} with `Lambert` shading. */
export interface LambertTexturesDescriptors extends UnlitTexturesDescriptors {
    /** {@link ShaderTextureDescriptor | Normal texture descriptor} to use if any. */
    normalTexture?: ShaderTextureDescriptor;
    /** {@link ShaderTextureDescriptor | Emissive texture descriptor} to use if any. */
    emissiveTexture?: ShaderTextureDescriptor;
    /** {@link ShaderTextureDescriptor | Occlusion texture descriptor} to use if any. */
    occlusionTexture?: ShaderTextureDescriptor;
}
/** {@link ShaderTextureDescriptor} used for a {@link LitMesh} with `Phong` shading. */
export interface PhongTexturesDescriptors extends LambertTexturesDescriptors {
    /** {@link ShaderTextureDescriptor | Metallic roughness texture descriptor} to use if any. */
    metallicRoughnessTexture?: ShaderTextureDescriptor;
    /** {@link ShaderTextureDescriptor | Specular texture descriptor} (mixing both specular color in the `RGB` channels and specular intensity in the `A` channel) to use if any. */
    specularTexture?: ShaderTextureDescriptor;
    /** {@link ShaderTextureDescriptor | Specular intensity texture descriptor} (using the `A` channel) to use if any. */
    specularFactorTexture?: ShaderTextureDescriptor;
    /** {@link ShaderTextureDescriptor | Specular color texture descriptor} (using the `RGB` channels) to use if any. */
    specularColorTexture?: ShaderTextureDescriptor;
}
/** {@link ShaderTextureDescriptor} used for a {@link LitMesh} with `PBR` shading. */
export interface PBRTexturesDescriptors extends PhongTexturesDescriptors {
    /** {@link ShaderTextureDescriptor | Transmission texture descriptor} to use if any. */
    transmissionTexture?: ShaderTextureDescriptor;
    /** {@link ShaderTextureDescriptor | Thickness texture descriptor} to use if any. */
    thicknessTexture?: ShaderTextureDescriptor;
    /** {@link ShaderTextureDescriptor | Transmission scene background texture descriptor} to use if any. */
    transmissionBackgroundTexture?: ShaderTextureDescriptor;
}
/** Parameters used to get all the {@link LitMesh} {@link ShaderTextureDescriptor} as an array. */
export interface GetMaterialTexturesDescriptors extends PBRTexturesDescriptors {
    /** {@link ShadingModels} to use for lighting. Default to `PBR`. */
    shading?: ShadingModels;
}
/** Define the material parameters of a {@link LitMesh}. */
export interface LitMeshMaterialParams extends Omit<PBRFragmentShaderInputParams, 'chunks' | 'geometry' | 'receiveShadows' | 'extensionsUsed' | 'materialUniform' | 'materialUniformName' | 'transmissionBackgroundTexture'>, LitMeshMaterialUniformParams {
    /** {@link ShadingModels} to use for lighting. Default to `PBR`. */
    shading?: ShadingModels;
    /** In which {@link ColorSpace} the output should be done. `srgb` should be used most of the time, except for some post processing effects that need input colors in `linear` space (such as bloom). Default to `srgb`. */
    outputColorSpace?: ColorSpace;
    /** {@link AdditionalChunks | Additional WGSL chunks} to add to the vertex shaders. */
    vertexChunks?: AdditionalChunks;
    /** {@link AdditionalChunks | Additional WGSL chunks} to add to the fragment shaders. */
    fragmentChunks?: AdditionalChunks;
    /** Custom fragment shader output structure members and returned values to use if needed. Useful when rendering to a Multiple Render Target for example. */
    fragmentOutput?: FragmentOutput;
}
/** Parameters used to create a {@link LitMesh}. */
export interface LitMeshParameters extends Omit<ProjectedMeshParameters, 'shaders' | 'useProjection'> {
    /** Material parameters of the {@link LitMesh}. */
    material?: LitMeshMaterialParams;
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
export declare class LitMesh extends Mesh {
    /**
     * LitMesh constructor
     * @param renderer - {@link CameraRenderer} object or {@link GPUCurtains} class object used to create this {@link LitMesh}.
     * @param parameters - {@link LitMeshParameters} used to create this {@link LitMesh}.
     */
    constructor(renderer: CameraRenderer | GPUCurtains, parameters?: LitMeshParameters);
    /**
     * Get the material {@link BufferBindingParams} to build the material uniform.
     * @param parameters - {@link GetLitMeshMaterialUniform} parameters.
     * @returns - Material uniform {@link BufferBindingParams}.
     */
    static getMaterialUniform(parameters: GetLitMeshMaterialUniform): BufferBindingParams;
    /**
     * Get all the material {@link ShaderTextureDescriptor} as an array.
     * @param parameters - {@link GetMaterialTexturesDescriptors} parameters.
     * @returns - Array of {@link ShaderTextureDescriptor} to use.
     */
    static getMaterialTexturesDescriptors(parameters: GetMaterialTexturesDescriptors): ShaderTextureDescriptor[];
    /**
     * Generate the {@link LitMesh} vertex shader code.
     * @param parameters - {@link VertexShaderInputParams} used to generate the vertex shader code.
     * @returns - The vertex shader generated based on the provided parameters.
     */
    static getVertexShaderCode(parameters: VertexShaderInputParams): string;
    /**
     * Generate the {@link LitMesh} fragment shader.
     * @param parameters - {@link FragmentShaderInputParams} used to build the fragment shader.
     * @returns - The fragment shader generated based on the provided parameters.
     */
    static getFragmentShaderCode(parameters: FragmentShaderInputParams): string;
}
