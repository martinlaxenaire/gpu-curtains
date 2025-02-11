import { Renderer } from '../../core/renderers/utils';
import { GPUCurtains } from '../../curtains/GPUCurtains';
import { HDRImageData, HDRLoader } from '../loaders/HDRLoader';
import { Texture, TextureParams } from '../../core/textures/Texture';
import { Sampler } from '../../core/samplers/Sampler';
import { Mat3 } from '../../math/Mat3';
/** Define the base parameters for the {@link ComputePass} {@link Texture} writing. */
export interface ComputePassTextureParams {
    /** The size of the {@link Texture}, knowing the `width` and `height` are equal. */
    size?: number;
    /** Number of samples to use in the {@link ComputePass} to generate the {@link Texture}. */
    computeSampleCount?: number;
}
/** Define the base {@link Texture} parameters for the textures. */
export interface ComputeTextureBaseParams {
    /** Label of the {@link Texture}. */
    label?: TextureParams['label'];
    /** Name of the {@link Texture}. */
    name?: TextureParams['name'];
    /** Format of the {@link Texture}. */
    format?: TextureParams['format'];
}
/** Define the parameters used to create the LUT {@link Texture}. */
export interface LUTTextureParams extends ComputePassTextureParams, ComputeTextureBaseParams {
}
/** Define the parameters used to create the diffuse cube map {@link Texture}. */
export interface DiffuseTextureParams extends ComputePassTextureParams, ComputeTextureBaseParams {
}
/** Define the parameters used to create the specular cube map {@link Texture}. */
export interface SpecularTextureParams extends ComputeTextureBaseParams {
    /** Whether to generate mips for this {@link Texture} or not. */
    generateMips?: TextureParams['generateMips'];
}
/** Define the options used to create the textures by the {@link EnvironmentMap}. */
export interface EnvironmentMapOptions {
    /** Define the parameters used to create the LUT {@link Texture}. */
    lutTextureParams: LUTTextureParams;
    /** Define the parameters used to create the diffuse cube map {@link Texture}. */
    diffuseTextureParams: DiffuseTextureParams;
    /** Define the parameters used to create the specular cube map {@link Texture}. */
    specularTextureParams: SpecularTextureParams;
    /** Define the intensity of the indirect diffuse contribution to use in a PBR shader. Default to `1`. */
    diffuseIntensity: number;
    /** Define the intensity of the indirect specular contribution to use in a PBR shader. Default to `1`. */
    specularIntensity: number;
    /** Define the {@link EnvironmentMap} rotation along Y axis, in radians. Default to `Math.PI / 2` (90 degrees). */
    rotation: number;
}
/** Define the parameters used to create the {@link EnvironmentMap}. */
export interface EnvironmentMapParams extends Partial<EnvironmentMapOptions> {
}
/**
 * Utility to create environment maps specular, diffuse and LUT textures using an HDR file.
 *
 * Create a LUT texture on init using a {@link ComputePass}. Can load an HDR file and then create the specular and diffuse textures using two separate {@link ComputePass}.
 *
 * Especially useful for IBL shading with glTF.
 *
 * @example
 * ```javascript
 * // assuming 'renderer' is a valid renderer or curtains instance
 * const environmentMap = new EnvironmentMap(renderer)
 * await environmentMap.loadAndComputeFromHDR('path/to/environment-map.hdr')
 * ```
 */
export declare class EnvironmentMap {
    #private;
    /** The {@link Renderer} used. */
    renderer: Renderer;
    /** The {@link Sampler} used in both the {@link ComputePass} and in `IBL` shading from the {@link core/shaders/full/fragment/get-PBR-fragment-shader-code | getPBRFragmentShaderCode} utility function. */
    sampler: Sampler;
    /** {@link HDRLoader} used to load the .hdr file. */
    hdrLoader: HDRLoader;
    /** Options used to generate the {@link lutTexture}, {@link specularTexture} and {@link diffuseTexture}. */
    options: EnvironmentMapOptions;
    /** Define the default environment maps rotation {@link Mat3}. */
    rotationMatrix: Mat3;
    /** BRDF GGX LUT {@link Texture} used for IBL shading. */
    lutTexture: Texture | null;
    /** Diffuse environment cube map {@link Texture}. */
    diffuseTexture: Texture | null;
    /** Specular environment cube map {@link Texture}. */
    specularTexture: Texture | null;
    /** function assigned to the {@link onRotationAxisChanged} callback */
    _onRotationAxisChangedCallback: () => void;
    /**
     * {@link EnvironmentMap} constructor.
     * @param renderer - {@link Renderer} or {@link GPUCurtains} class object used to create this {@link EnvironmentMap}.
     * @param params - {@link EnvironmentMapParams | parameters} use to create this {@link EnvironmentMap}. Defines the various textures options.
     */
    constructor(renderer: Renderer | GPUCurtains, params?: EnvironmentMapParams);
    /**
     * Get the current {@link EnvironmentMapOptions.rotation | rotation}, in radians.
     */
    get rotation(): number;
    /**
     * Set the current {@link EnvironmentMapOptions.rotation | rotation}, in radians.
     * @param value - New {@link EnvironmentMapOptions.rotation | rotation} to use, in radians.
     */
    set rotation(value: number);
    /**
     * Callback to call whenever the {@link EnvironmentMapOptions.rotation | rotation} changed.
     * @param callback - Called whenever the {@link EnvironmentMapOptions.rotation | rotation} changed.
     */
    onRotationAxisChanged(callback: () => void): this;
    /**
     * Create the {@link lutTexture | BRDF GGX LUT texture} using the provided {@link LUTTextureParams | LUT texture options} and a {@link ComputePass} that runs once.
     */
    computeBRDFLUTTexture(): Promise<void>;
    /**
     * Create the {@link specularTexture | specular cube map texture} from a loaded {@link HDRImageData} using the provided {@link SpecularTextureParams | specular texture options} and a {@link ComputePass} that runs once.
     * @param parsedHdr - parsed {@link HDRImageData} loaded by the {@link hdrLoader}.
     */
    computeSpecularCubemapFromHDRData(parsedHdr: HDRImageData): Promise<void>;
    /**
     * Compute the {@link diffuseTexture | diffuse cube map texture} from the {@link specularTexture | specular cube map texture } using the provided {@link DiffuseTextureParams | diffuse texture options} and a {@link ComputePass} that runs once.
     */
    computeDiffuseFromSpecular(): Promise<void>;
    /**
     * Load an HDR environment map and then generates the {@link specularTexture} and {@link diffuseTexture} using two separate {@link ComputePass}.
     * @param url - The url of the .hdr file to load.
     */
    loadAndComputeFromHDR(url: string): Promise<void>;
    /**
     * Destroy the {@link EnvironmentMap} and its associated textures.
     */
    destroy(): void;
}
