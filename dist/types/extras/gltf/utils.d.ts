import { MeshDescriptor } from '../../types/gltf/GLTFScenesManager';
import { ShaderOptions } from '../../types/Materials';
import { Texture } from '../../core/textures/Texture';
/**
 * Parameters used to build the shaders
 */
export interface ShaderBuilderParameters {
    /** Additional WGSL chunks to add to the shaders. */
    chunks?: {
        /** Additional WGSL chunk to add to the fragment shader head. */
        additionalFragmentHead?: string;
        /** Ambient light contribution to apply to the fragment shader `ambientContribution` `vec3f` variable. Default is `vec3(1.0)`. */
        ambientContribution?: string;
        /** Light contribution to apply to the fragment shader `lightContribution` `vec3f` variable. Default is `vec3(0.0)`. */
        lightContribution?: string;
        /** Additional modification to apply to the fragment shader `color` `vec4f` variable before returning it. */
        additionalColorContribution?: string;
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
 * Build shaders based on a {@link MeshDescriptor} and optional {@link ShaderBuilderParameters | shader parameters}.
 * @param meshDescriptor - {@link MeshDescriptor} built by the {extras/gltf/GLTFScenesManager.GLTFScenesManager | GLTFScenesManager}
 * @param shaderParameters - {@link ShaderBuilderParameters | shader parameters} to use.
 * @returns - object containing the shaders
 */
export declare const buildShaders: (meshDescriptor: MeshDescriptor, shaderParameters?: ShaderBuilderParameters) => BuiltShaders;
/**
 * Build Physically Based Rendering shaders based on a {@link MeshDescriptor} and optional {@link ShaderBuilderParameters | PBR shader parameters}.
 * @param meshDescriptor - {@link MeshDescriptor} built by the {extras/gltf/GLTFScenesManager.GLTFScenesManager | GLTFScenesManager}
 * @param shaderParameters - {@link ShaderBuilderParameters | PBR shader parameters} to use.
 * @returns - object containing the shaders
 */
export declare const buildPBRShaders: (meshDescriptor: MeshDescriptor, shaderParameters?: ShaderBuilderParameters) => BuiltShaders;
/**
 * Parameters used to build the shaders
 */
export interface IBLShaderBuilderParameters extends ShaderBuilderParameters {
    /** Additional IBL parameters to pass as uniform and textures. */
    iblParameters?: {
        /** Environment diffuse strength. Default to `0.5`. */
        diffuseStrength?: number;
        /** Environment specular strength. Default to `0.5`. */
        specularStrength?: number;
        /** Look Up Table texture to use for IBL. */
        lutTexture: Texture;
        /** Environment diffuse texture to use for IBL. */
        envDiffuseTexture: Texture;
        /** Environment specular texture to use for IBL. */
        envSpecularTexture: Texture;
    };
}
/**
 * Build Image Based Lightning shaders based on a {@link MeshDescriptor} and optional {@link ShaderBuilderParameters | IBL shader parameters}.
 * @param meshDescriptor - {@link MeshDescriptor} built by the {extras/gltf/GLTFScenesManager.GLTFScenesManager | GLTFScenesManager}
 * @param shaderParameters - {@link ShaderBuilderParameters | IBL shader parameters} to use.
 * @returns - object containing the shaders
 */
export declare const buildIBLShaders: (meshDescriptor: MeshDescriptor, shaderParameters?: IBLShaderBuilderParameters) => BuiltShaders;
