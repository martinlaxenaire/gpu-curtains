import { GLTF } from './GLTF';
import { VertexBufferAttributeParams } from '../Geometries';
import { Texture } from '../../core/textures/Texture';
import { Sampler } from '../../core/samplers/Sampler';
import { ProjectedMeshParameters } from '../../core/meshes/mixins/ProjectedMeshBaseMixin';
import { Object3D } from '../../core/objects3D/Object3D';
import { Mesh } from '../../core/meshes/Mesh';
import { Box3 } from '../../math/Box3';
import { Camera } from '../../core/camera/Camera';
import { BufferBinding } from '../../core/bindings/BufferBinding';
import { TargetsAnimationsManager } from '../../extras/animations/TargetsAnimationsManager';
import { Mat4 } from '../../math/Mat4';
import { RenderPassEntry } from '../../core/scenes/Scene';
import { ShaderTextureDescriptor } from '../../core/shaders/full/fragment/get-fragment-code';
import { GLTFExtensionsUsed } from './GLTFExtensions';
/**
 * Define a {@link MeshDescriptorAttribute} used to create the {@link core/geometries/Geometry.Geometry | Geometry}.
 */
export interface MeshDescriptorAttribute {
    /** Name of the attribute. */
    name: VertexBufferAttributeParams['name'];
    /** Type of the attibute. */
    type: VertexBufferAttributeParams['type'];
}
/**
 * Define a {@link MeshDescriptor} object, which helps creating a {@link Mesh} and its shaders based on the various properties.
 */
export interface MeshDescriptor {
    /** {@link ProjectedMeshParameters} used to create the {@link Mesh}. */
    parameters: ProjectedMeshParameters;
    /** {@link Mesh} parent {@link Object3D}. */
    parent: Object3D;
    /** Array of {@link ShaderTextureDescriptor} defining the available textures and corresponding sampler names. Useful to build custom shaders from scratch. */
    textures: ShaderTextureDescriptor[];
    /** All the {@link core/geometries/Geometry.Geometry | Geometry} instances {@link Object3D} nodes used to calculate the eventual instances world and normal matrices. */
    nodes: Object3D[];
    extensionsUsed: GLTFExtensionsUsed;
}
/**
 * Define a {@link MaterialTextureDescriptor} used to group a {@link Texture} and its associated {@link Sampler}.
 */
export interface MaterialTextureDescriptor {
    /** {@link Texture} to use. */
    texture: Texture;
    /** {@link Sampler} to use. */
    sampler: Sampler;
    /** {@link MeshDescriptorAttribute.name | Texture coordinate attribute name} to use to map this texture. */
    texCoordAttributeName?: string;
}
/**
 * Define a {@link MaterialTexture} describing all {@link Texture} and {@link Sampler} used by a specified material.
 */
export interface MaterialTexture {
    /** Material index in the {@link extras/loaders/GLTFLoader.GPUCurtainsGLTF.materials | materials array}. */
    material: number;
    /** {@link MaterialTextureDescriptor} defining the {@link Texture} and {@link Sampler} used by the material. */
    texturesDescriptors: MaterialTextureDescriptor[];
}
/**
 * Define a {@link PrimitiveInstanceDescriptor} used to group {@link core/geometries/Geometry.Geometry | Geometry} instances and transform nodes and their {@link MeshDescriptor}.
 */
export interface PrimitiveInstanceDescriptor {
    /** Array of {@link GLTF.INode | GLTF Node} describing the transforms and associated mesh. */
    instances: GLTF.INode[];
    /** Array of {@link Object3D} corresponding to the {@link instances}. */
    nodes: Object3D[];
    /** Unique {@link MeshDescriptor} used to create the instanced {@link Mesh}. */
    meshDescriptor: MeshDescriptor;
}
/**
 * {@link Map} the {@link PrimitiveInstanceDescriptor} by their {@link GLTF.IMeshPrimitive | GLTF Mesh Primitive}.
 */
export type PrimitiveInstances = Map<GLTF.IMeshPrimitive, PrimitiveInstanceDescriptor>;
/**
 * Define a {@link ChildDescriptor}.
 */
export interface ChildDescriptor {
    /** Index of the {@link GLTF.INode | glTF Node} used by this child. */
    index?: number;
    /** Optional name if available in the {@link GLTF} json. */
    name?: string;
    /** {@link Object3D} describing the transformations of this child. */
    node: Object3D;
    /** Optional children of this child. */
    children: ChildDescriptor[];
}
/**
 * Define a {@link SkinDefinition} used to handle skin animations.
 */
export interface SkinDefinition {
    /** The parent {@link Object3D} used to calculate joint matrices. */
    parentNode: Object3D;
    /** An array of joint {@link Object3D}. */
    joints: Object3D[];
    /** A {@link Float32Array} containing all the skin inverse bind matrices. */
    inverseBindMatrices: Float32Array;
    /** A {@link Mat4} that will handle our joint matrix. */
    jointMatrix: Mat4;
    /** A {@link Mat4} that will handle our joint normal matrix. */
    normalMatrix: Mat4;
    /** A {@link Mat4} that will handle the parent {@link Object3D} inverse world matrix. */
    parentInverseWorldMatrix: Mat4;
    /** The storage {@link BufferBinding} used to send the matrices to the shaders. */
    binding: BufferBinding;
}
/**
 * Define the {@link ScenesManager}.
 */
export interface ScenesManager {
    /** {@link Object3D} used as a parent for all {@link scenes} nodes. */
    node: Object3D;
    /** A {@link Map} of all the nodes {@link Object3D} created by the {@link ScenesManager}. */
    nodes: Map<number, Object3D>;
    /** Final computed {@link Box3 | bounding box} of the scenes. */
    boundingBox: Box3;
    /** Array of {@link Sampler} used by this {@link ScenesManager}. */
    samplers: Sampler[];
    /** Array of {@link MaterialTexture} describing the material, {@link Texture} and {@link Sampler} relationship. */
    materialsTextures: MaterialTexture[];
    /** Array of scenes as {@link ChildDescriptor}. */
    scenes: ChildDescriptor[];
    /** Array of created {@link Mesh} to render this {@link ScenesManager} scene. */
    meshes: Mesh[];
    /** Array of {@link MeshDescriptor} used to create the {@link meshes}. */
    meshesDescriptors: MeshDescriptor[];
    /** Array of {@link TargetsAnimationsManager} used by this {@link ScenesManager}. */
    animations: TargetsAnimationsManager[];
    /** Array of available created {@link Camera}. */
    cameras: Camera[];
    /** Array of {@link SkinDefinition} used by this {@link ScenesManager}. */
    skins: SkinDefinition[];
    /** If our parsed glTF contains one of the `KHR_materials_transmission`, `KHR_materials_volume` or `KHR_materials_dispersion`, we need to handle the rendering of transmissive meshes. To do so, we'll need a new screen pass {@link RenderPassEntry} and a {@link Texture} onto which we'll write the content of the non transmissive objects main buffer rendered objects. */
    transmissionCompositing?: {
        /** The new screen pass {@link RenderPassEntry} where we'll draw our transmissive objects. */
        sceneTransmissionPassEntry: RenderPassEntry;
        /** The {@link Texture} holding the content of all the non transmissive objects we've already drawn onto the main screen buffer. */
        backgroundOutputTexture: Texture;
        /** The {@link Sampler} used to sample the background output texture. */
        sampler: Sampler;
    };
}
