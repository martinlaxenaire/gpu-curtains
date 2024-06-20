import { MeshDescriptor } from '../../types/gltf/GLTFScenesManager';
import { ShaderOptions } from '../../types/Materials';
import { Texture } from '../../core/textures/Texture';
import { Sampler } from '../../core/samplers/Sampler';
/**
 * Parameters used to build the shaders
 */
export interface ShaderBuilderParameters {
    /** Additional WGSL chunks to add to the shaders. */
    chunks?: {
        /** Additional WGSL chunk to add to the fragment shader head. */
        additionalFragmentHead?: string;
        /** Preliminary modification to apply to the fragment shader `color` `vec4f` variable before applying any lightning calculations. */
        preliminaryColorContribution?: string;
        /** Ambient light contribution to apply to the fragment shader `lightContribution.ambient` `vec3f` variable. Default is `vec3(1.0)`. */
        ambientContribution?: string;
        /** Light contribution to apply to the fragment shader `lightContribution.diffuse` `vec3f` and `lightContribution.specular` `vec3f` variables. Default is `vec3(0.0)` for both. */
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
 *
 * The shaders built by this function allow you to access a bunch of variables inside your fragment shader that you can use in your {@link ShaderBuilderParameters | shader parameters} chunks:
 *
 * - `geometryNormal: vec3f`: the normalized geometry normals.
 * - `normal: vec3f` or `N: vec3f`: the computed normalized normals accounting for the `normalTexture` and `tangent` attributes is defined, the `geometryNormal` else.
 * - `worldPosition: vec3f`: the world position.
 * - `viewDirection: vec3f`: the view direction in world space (camera position minus world position).
 * - `V: vec3f`: the normalized view direction in world space (camera position minus world position).
 * - `NdotV: f32`: the clamped dot product of `N` and `V`.
 * - `metallic: f32`: the metallic value. Default to `1.0`.
 * - `roughness: f32`: the roughness value. Default to `1.0`.
 * - `f0: vec3f`: the fresnel reflectance.
 * - `emissive: vec3f`: the emissive color value. Default to `vec3(0.0)`.
 * - `occlusion: f32`: the occlusion value. Default to `1.0`.
 * - `lightContribution: LightContribution`: the final light contribution to use. You should add your respective lightning calculations to this variable components, defined as follows:<br>
 * ```wgsl
 * struct LightContribution {
 *   ambient: vec3f, // default to vec3(1.0)
 *   diffuse: vec3f, // default to vec3(0.0)
 *   specular: vec3f, // default to vec3(0.0)
 * };
 * ```
 * - `color: vec4f`: the color that will be outputted. You can manipulate it with the `preliminaryColorContribution` (applied before lightning calculations) and `additionalColorContribution` (applied after lightning calculations).
 *
 * @param meshDescriptor - {@link MeshDescriptor} built by the {@link extras/gltf/GLTFScenesManager.GLTFScenesManager | GLTFScenesManager}
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
 * Parameters to use for IBL textures
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
export interface IBLShaderBuilderParameters extends ShaderBuilderParameters {
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
/**
 * Build Image Based Lightning shaders based on a {@link MeshDescriptor} and optional {@link ShaderBuilderParameters | IBL shader parameters}.
 * @param meshDescriptor - {@link MeshDescriptor} built by the {extras/gltf/GLTFScenesManager.GLTFScenesManager | GLTFScenesManager}
 * @param shaderParameters - {@link ShaderBuilderParameters | IBL shader parameters} to use.
 * @returns - object containing the shaders
 */
export declare const buildIBLShaders: (meshDescriptor: MeshDescriptor, shaderParameters?: IBLShaderBuilderParameters) => BuiltShaders;
