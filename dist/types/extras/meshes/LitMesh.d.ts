import { Mesh } from '../../core/meshes/Mesh';
import { CameraRenderer } from '../../core/renderers/utils';
import { GPUCurtains } from '../../curtains/GPUCurtains';
import { ProjectedMeshParameters } from '../../core/meshes/mixins/ProjectedMeshBaseMixin';
import { FragmentShaderInputParams, PBRFragmentShaderInputParams, ShadingModels } from '../../core/shaders/full/fragment/get-fragment-shader-code';
import { Vec2 } from '../../math/Vec2';
import { Vec3 } from '../../math/Vec3';
import { AdditionalChunks } from '../../core/shaders/default-material-helpers';
import { VertexShaderInputParams } from '../../core/shaders/full/vertex/get-vertex-shader-code';
/** Define the material uniform parameters. */
export interface LitMeshMaterialUniformParams {
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
    /** The base percentage of light that is transmitted through the surface of the {@link LitMesh}. Only applicable is `transmissive` parameter is set to `true`. Default to `0`. */
    transmission?: number;
    /** The index of refraction of the {@link LitMesh}. Default to `1.5`. */
    ior?: number;
    /** The strength of the dispersion effect, specified as 20/Abbe number. Only applicable is `transmissive` parameter is set to `true`. Default to `0`. */
    dispersion?: number;
    /** The thickness of the volume beneath the surface. The value is given in the coordinate space of the mesh. If the value is 0 the material is thin-walled. Only applicable is `transmissive` parameter is set to `true`. Default to `0`. */
    thickness?: number;
    /** Density of the medium given as the average distance that light travels in the medium before interacting with a particle. The value is given in world space. Only applicable is `transmissive` parameter is set to `true`. Default to `Infinity`. */
    attenuationDistance?: number;
    /** The color as a {@link Vec3} that white light turns into due to absorption when reaching the attenuation distance. Only applicable is `transmissive` parameter is set to `true`. Default to `new Vec3(1)`. */
    attenuationColor?: Vec3;
}
/** Define the material parameters of a {@link LitMesh}. */
export interface LitMeshMaterialParams extends Omit<PBRFragmentShaderInputParams, 'chunks' | 'geometry' | 'receiveShadows' | 'extensionsUsed' | 'materialUniform' | 'materialUniformName' | 'transmissionBackgroundTexture'>, LitMeshMaterialUniformParams {
    /** {@link ShadingModels} to use for lighting. Default to `PBR`. */
    shading?: ShadingModels;
    /** {@link AdditionalChunks | Additional WGSL chunks} to add to the vertex shaders. */
    vertexChunks?: AdditionalChunks;
    /** {@link AdditionalChunks | Additional WGSL chunks} to add to the fragment shaders. */
    fragmentChunks?: AdditionalChunks;
}
/** Parameters used to create a {@link LitMesh}. */
export interface LitMeshParameters extends Omit<ProjectedMeshParameters, 'shaders'> {
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
export declare class LitMesh extends Mesh {
    /**
     * LitMesh constructor
     * @param renderer - {@link CameraRenderer} object or {@link GPUCurtains} class object used to create this {@link LitMesh}.
     * @param parameters - {@link LitMeshParameters} used to create this {@link LitMesh}.
     */
    constructor(renderer: CameraRenderer | GPUCurtains, parameters?: LitMeshParameters);
    static getVertexShaderCode({ bindings, geometry, chunks, additionalVaryings, }: VertexShaderInputParams): string;
    static getFragmentShaderCode(params: FragmentShaderInputParams): string;
}
