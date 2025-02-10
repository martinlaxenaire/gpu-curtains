import { MeshDescriptor } from '../../types/gltf/GLTFScenesManager';
import { ShaderOptions } from '../../types/Materials';
import { FragmentShaderInputBaseParams, PBRFragmentShaderInputParams, ShadingModels } from '../../core/shaders/full/fragment/get-fragment-shader-code';
import { AdditionalChunks } from '../../core/shaders/default-material-helpers';
/** Parameters used to build the shaders. */
export interface ShaderBuilderParameters extends FragmentShaderInputBaseParams {
    /** Shading model to use. */
    shadingModel?: ShadingModels;
    /** {@link AdditionalChunks | Additional WGSL chunks} to add to the vertex shaders. */
    vertexChunks?: AdditionalChunks;
    /** {@link AdditionalChunks | Additional WGSL chunks} to add to the fragment shaders. */
    fragmentChunks?: AdditionalChunks;
    /** Additional IBL parameters to pass as uniform and textures. */
    environmentMap?: PBRFragmentShaderInputParams['environmentMap'];
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
