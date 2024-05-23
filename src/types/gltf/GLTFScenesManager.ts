import { GLTF } from './GLTF'
import { VertexBufferAttributeParams } from '../Geometries'
import { Texture, TextureParams } from '../../core/textures/Texture'
import { Sampler } from '../../core/samplers/Sampler'
import { ProjectedMeshParameters } from '../../core/meshes/mixins/ProjectedMeshBaseMixin'
import { Object3D } from '../../core/objects3D/Object3D'
import { Mesh } from '../../core/meshes/Mesh'
import { Box3 } from '../../math/Box3'

/**
 * Define a {@link MeshDescriptorAttribute} used to create the {@link core/geometries/Geometry.Geometry | Geometry}.
 */
export interface MeshDescriptorAttribute {
  /** Name of the attribute. */
  name: VertexBufferAttributeParams['name']
  /** Type of the attibute. */
  type: VertexBufferAttributeParams['type']
}

/**
 * Define a {@link MeshDescriptorTexture} used to associate the {@link core/textures/Texture.Texture | Texture} names with the corresponding {@link Sampler} names.
 */
export interface MeshDescriptorTexture {
  /** Name of the {@link core/textures/Texture.Texture | Texture} to use. */
  texture: TextureParams['name']
  /** Name of the {@link Sampler} to use. */
  sampler: Sampler['name']
  /** {@link MeshDescriptorAttribute.name | Texture coordinate attribute name} to use to map this texture. */
  texCoordAttributeName?: string
}

/**
 * Define a {@link MeshDescriptor} object, which helps creating a {@link Mesh} and its shaders based on the various properties.
 */
export interface MeshDescriptor {
  /** {@link ProjectedMeshParameters} used to create the {@link Mesh}. */
  parameters: ProjectedMeshParameters
  /** {@link Mesh} parent {@link Object3D}. */
  parent: Object3D
  /** {@link MeshDescriptorAttribute} defining the {@link core/geometries/Geometry.Geometry | Geometry} attributes used. Useful to build custom shaders from scratch. */
  attributes: MeshDescriptorAttribute[]
  /** {@link MeshDescriptorTexture} defining the available textures and corresponding sampler names. Useful to build custom shaders from scratch. */
  textures: MeshDescriptorTexture[]
  /** All the {@link core/geometries/Geometry.Geometry | Geometry} instances {@link Object3D} nodes used to calculate the eventual instances world and normal matrices. */
  nodes: Object3D[]
}

/**
 * Define a {@link MaterialTextureDescriptor} used to group a {@link Texture} and its associated {@link Sampler}.
 */
export interface MaterialTextureDescriptor {
  /** {@link Texture} to use. */
  texture: Texture
  /** {@link Sampler} to use. */
  sampler: Sampler
  /** {@link MeshDescriptorAttribute.name | Texture coordinate attribute name} to use to map this texture. */
  texCoordAttributeName?: string
}

/**
 * Define a {@link MaterialTexture} describing all {@link Texture} and {@link Sampler} used by a specified material.
 */
export interface MaterialTexture {
  /** Material index in the {@link extras/gltf/GLTFLoader.GPUCurtainsGLTF.materials | materials array}. */
  material: number
  /** {@link MaterialTextureDescriptor} defining the {@link Texture} and {@link Sampler} used by the material. */
  texturesDescriptors: MaterialTextureDescriptor[]
}

/**
 * Define a {@link PrimitiveInstanceDescriptor} used to group {@link core/geometries/Geometry.Geometry | Geometry} instances and transform nodes and their {@link MeshDescriptor}.
 */
export interface PrimitiveInstanceDescriptor {
  /** Array of {@link GLTF.INode | GLTF Node} describing the transforms and associated mesh. */
  instances: GLTF.INode[]
  /** Array of {@link Object3D} corresponding to the {@link instances}. */
  nodes: Object3D[]
  /** Unique {@link MeshDescriptor} used to create the instances {@link Mesh}. */
  meshDescriptor: MeshDescriptor
}

/**
 * {@link Map} the {@link PrimitiveInstanceDescriptor} by their {@link GLTF.IMeshPrimitive | GLTF Mesh Primitive}.
 */
export type PrimitiveInstances = Map<GLTF.IMeshPrimitive, PrimitiveInstanceDescriptor>

/**
 * Define a {@link ChildDescriptor}.
 */
export interface ChildDescriptor {
  /** Optional name if available in the {@link GLTF} json. */
  name?: string
  /** {@link Object3D} describing the transformations of this child. */
  node: Object3D
  /** Optional children of this child. */
  children: ChildDescriptor[]
}

/**
 * Define the {@link ScenesManager}.
 */
export interface ScenesManager {
  /** {@link Object3D} used as a parent for all {@link scenes} nodes. */
  node: Object3D
  /** Final computed {@link Box3 | bounding box} of the scenes. */
  boundingBox: Box3
  /** Array of {@link Sampler} used by this {@link ScenesManager}. */
  samplers: Sampler[]
  /** Array of {@link MaterialTexture} describing the material, {@link Texture} and {@link Sampler} relationship. */
  materialsTextures: MaterialTexture[]
  /** Array of scenes as {@link ChildDescriptor}. */
  scenes: ChildDescriptor[]
  /** Array of created {@link Mesh} to render this {@link ScenesManager} scene. */
  meshes: Mesh[]
  /** Array of {@link MeshDescriptor} used to create the {@link meshes}. */
  meshesDescriptors: MeshDescriptor[]
  /** Utility helper to get all the {@link Object3D} created by this {@link ScenesManager} */
  getScenesNodes: () => Object3D[]
}
