import { MeshDescriptor } from '../../types/gltf/GLTFScenesManager';
import { ShaderOptions } from '../../types/Materials';
import { Texture } from '../../core/textures/Texture';
import { Sampler } from '../../core/samplers/Sampler';
import { Renderer } from '../../core/renderers/utils';
/** Defines all kinds of shading models available. */
export type ShadingModels = 'Lambert' | 'Phong' | 'PBR' | 'IBL';
/**
 * Parameters to use for IBL textures.
 */
export interface IBLShaderTextureParams {
    /** {@link Texture} to use. */
    texture: Texture;
    /** {@link Sampler#name | Sampler name} to use. */
    samplerName?: Sampler['name'];
}
/**
 * Parameters used to build the shaders
 */
export interface ShaderBuilderParameters {
    /** Shading model to use. */
    shadingModel?: ShadingModels;
    /** Additional WGSL chunks to add to the shaders. */
    chunks?: {
        /** Additional WGSL chunk to add to the fragment shader head. */
        additionalFragmentHead?: string;
        /** Preliminary modification to apply to the fragment shader `color` `vec4f` variable before applying any lightning calculations. */
        preliminaryColorContribution?: string;
        /** Additional modification to apply to the fragment shader `color` `vec4f` variable before returning it. */
        additionalColorContribution?: string;
    };
    /** Additional IBL parameters to pass as uniform and textures. */
    iblParameters?: {
        /** Environment diffuse strength. Default to `0.5`. */
        diffuseStrength?: number;
        /** Environment specular strength. Default to `0.5`. */
        specularStrength?: number;
        /** Look Up Table texture parameters to use for IBL. */
        lutTexture?: IBLShaderTextureParams;
        /** Environment diffuse texture parameters to use for IBL. */
        envDiffuseTexture?: IBLShaderTextureParams;
        /** Environment specular texture parameters to use for IBL. */
        envSpecularTexture?: IBLShaderTextureParams;
    };
}
/** Shaders returned by the shaders builder function. */
export interface BuiltShaders {
    /** Vertex shader returned by the PBR shader builder. */
    vertex: ShaderOptions;
    /** Fragment shader returned by the PBR shader builder. */
    fragment: ShaderOptions;
}
export declare const buildShaders: (meshDescriptor: MeshDescriptor, shaderParameters?: ShaderBuilderParameters) => BuiltShaders;
/**
 * Compute a diffuse cube map from a specular cube map using a {@link ComputePass} and copy the result into the diffuse texture {@link GPUTexture}.
 * @param renderer - {@link Renderer} to use.
 * @param diffuseTexture - diffuse cube map texture onto which the result of the {@link ComputePass} should be copied.
 * @param specularTexture - specular cube map texture to use as a source.
 */
export declare const computeDiffuseFromSpecular: (renderer: Renderer, diffuseTexture: Texture, specularTexture: Texture) => Promise<void>;
