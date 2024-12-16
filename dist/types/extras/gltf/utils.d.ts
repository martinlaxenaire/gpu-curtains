import { MeshDescriptor } from '../../types/gltf/GLTFScenesManager';
import { ShaderOptions } from '../../types/Materials';
import { Texture } from '../../core/textures/Texture';
import { Sampler } from '../../core/samplers/Sampler';
import { EnvironmentMap } from '../environment-map/EnvironmentMap';
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
        /** {@link EnvironmentMap} to use for IBL shading. */
        environmentMap?: EnvironmentMap;
    };
}
/** Shaders returned by the shaders builder function. */
export interface BuiltShaders {
    /** Vertex shader returned by the PBR shader builder. */
    vertex: ShaderOptions;
    /** Fragment shader returned by the PBR shader builder. */
    fragment: ShaderOptions;
}
/**
 * Build shaders made for glTF parsed objects, based on a {@link MeshDescriptor} and optional {@link ShaderBuilderParameters | shader parameters}.
 *
 * @param meshDescriptor - {@link MeshDescriptor} built by the {@link extras/gltf/GLTFScenesManager.GLTFScenesManager | GLTFScenesManager}
 * @param shaderParameters - {@link ShaderBuilderParameters | shader parameters} to use.
 * @returns - An object containing the shaders.
 */
export declare const buildShaders: (meshDescriptor: MeshDescriptor, shaderParameters?: ShaderBuilderParameters) => BuiltShaders;
