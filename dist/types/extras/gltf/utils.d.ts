import { MeshDescriptor } from '../../types/gltf/GLTFScenesManager';
import { ProjectedMeshParameters } from '../../core/meshes/mixins/ProjectedMeshBaseMixin';
/**
 * Parameters used to build the PBR shaders
 */
export interface PBRShaderParameters {
    /** Ambient light contribution to apply to the fragment shader `ambientContribution` `vec3f` variable. Default is `vec3(1.0)`. */
    ambientContribution?: string;
    /** Light contribution to apply to the fragment shader `lightContribution` `vec3f` variable. Default is `vec3(0.0)`. */
    lightContribution?: string;
}
/**
 * Build Physically Based Rendering shaders based on a {@link MeshDescriptor} and optional {@link PBRShaderParameters | PBR shader parameters}.
 * @param meshDescriptor - {@link MeshDescriptor} built by the {extras/gltf/GLTFScenesManager.GLTFScenesManager | GLTFScenesManager}
 * @param shaderParameters - {@link PBRShaderParameters | PBR shader parameters} to use.
 * @returns - object containing the shaders
 */
export declare const buildShaders: (meshDescriptor: MeshDescriptor, shaderParameters?: PBRShaderParameters) => {
    /** Shaders returned by the PBR shader builder. */
    shaders: ProjectedMeshParameters['shaders'];
};
