/// <reference types="dist" />
import { CameraRenderer } from '../../core/renderers/utils';
import { GLTF } from '../../types/gltf/GLTF';
import { GLTFLoader } from './GLTFLoader';
import { Texture } from '../../core/textures/Texture';
import { TypedArrayConstructor } from '../../core/bindings/utils';
import { VertexBufferAttribute } from '../../types/Geometries';
import { ChildDescriptor, ScenesManager } from '../../types/gltf/GLTFScenesManager';
/**
 * Used to create a {@link GLTFScenesManager} from a given {@link GLTFLoader.gltf | gltf} object.
 *
 * Parse the {@link GLTFLoader.gltf | gltf} object, create all the {@link Sampler} and {@link Texture}, create all the {@link Object3D} nodes to compute the correct transformations and parent -> child relationships, create all the needed {@link MeshDescriptor} containing the {@link Geometry}, {@link Mesh} parameters and so on.
 *
 * ## Loading Features
 *
 * - [x] Accessors
 *   - [ ] Sparse accessors
 * - [x] Buffers
 * - [x] BufferViews
 * - [x] Images
 * - [x] Meshes
 * - [x] Nodes
 * - [x] Primitives
 * - [x] Samplers
 * - [x] Textures
 * - [ ] Animations
 * - [ ] Cameras
 * - [x] Materials
 * - [ ] Skins
 *
 * @example
 * ```javascript
 * const gltfLoader = new GLTFLoader()
 * const gltf = await gltfLoader.loadFromUrl('path/to/model.gltf')
 *
 * // create a gltfScenesManager from the resulting 'gltf' object
 * // assuming 'renderer' is a valid camera or curtains renderer
 * const gltfScenesManager = new GLTFScenesManager({ renderer, gltf })
 * gltfScenesManager.addMeshes()
 * ```
 */
export declare class GLTFScenesManager {
    #private;
    /** The {@link CameraRenderer} used. */
    renderer: CameraRenderer;
    /** The {@link GLTFLoader.gltf | gltf} object used. */
    gltf: GLTFLoader['gltf'];
    /** The {@link ScenesManager} containing all the useful data. */
    scenesManager: ScenesManager;
    /**
     * {@link GLTFScenesManager} constructor.
     * @param parameters - parameters used to create our {@link GLTFScenesManager}.
     * @param parameters.renderer - our {@link CameraRenderer} class object.
     * @param parameters.gltf - The {@link GLTFLoader.gltf | gltf} object used.
     */
    constructor({ renderer, gltf }: {
        renderer: any;
        gltf: any;
    });
    /**
     * Get an attribute type, bufferFormat and size from its {@link GLTF.AccessorType | accessor type}.
     * @param type - {@link GLTF.AccessorType | accessor type} to use.
     * @returns - corresponding type, bufferFormat and size.
     */
    static getVertexAttributeParamsFromType(type: GLTF.AccessorType): {
        /** Corresponding attribute type */
        type: VertexBufferAttribute['type'];
        /** Corresponding attribute bufferFormat */
        bufferFormat: VertexBufferAttribute['bufferFormat'];
        /** Corresponding attribute size */
        size: VertexBufferAttribute['size'];
    };
    /**
     * Get the corresponding typed array constructor based on the {@link GLTF.AccessorComponentType | accessor component type}.
     * @param componentType - {@link GLTF.AccessorComponentType | accessor component type} to use.
     * @returns - corresponding typed array constructor.
     */
    static getTypedArrayConstructorFromComponentType(componentType: GLTF.AccessorComponentType): TypedArrayConstructor;
    /**
     * Get the {@link GPUPrimitiveTopology} based on the {@link GLTF.MeshPrimitiveMode | WebGL primitive mode}.
     * @param mode - {@link GLTF.MeshPrimitiveMode | WebGL primitive mode} to use.
     * @returns - corresponding {@link GPUPrimitiveTopology}.
     */
    static gpuPrimitiveTopologyForMode(mode: GLTF.MeshPrimitiveMode): GPUPrimitiveTopology;
    /**
     * Get the {@link GPUAddressMode} based on the {@link GLTF.TextureWrapMode | WebGL texture wrap mode}.
     * @param wrap - {@link GLTF.TextureWrapMode | WebGL texture wrap mode} to use.
     * @returns - corresponding {@link GPUAddressMode}.
     */
    static gpuAddressModeForWrap(wrap: GLTF.TextureWrapMode): GPUAddressMode;
    /**
     * Create the {@link Sampler} and add them to the {@link ScenesManager.samplers | scenesManager samplers array}.
     */
    createSamplers(): void;
    /**
     * Create a {@link Texture} based on the options.
     * @param material - material using that texture.
     * @param image - image source of the texture.
     * @param name - name of the texture.
     * @returns - newly created {@link Texture}.
     */
    createTexture(material: GLTF.IMaterial, image: ImageBitmap, name: string): Texture;
    /**
     * Create the {ScenesManager.materialsTextures | scenesManager materialsTextures array} and each associated {@link types/gltf/GLTFScenesManager.MaterialTexture | MaterialTexture} and their respective {@link Texture}.
     */
    createMaterialTextures(): void;
    /**
     * Create a {@link ChildDescriptor} from a parent {@link ChildDescriptor} and a {@link GLTF.INode | GLTF Node}
     * @param parent - parent {@link ChildDescriptor} to use.
     * @param node - {@link GLTF.INode | GLTF Node} to use.
     */
    createNode(parent: ChildDescriptor, node: GLTF.INode): void;
    /**
     * Create the {@link ScenesManager#scenes | ScenesManager scenes} based on the {@link gltf} object.
     */
    createScenes(): void;
    /**
     * Add all the needed {@link Mesh} based on the {@link ScenesManager#meshesDescriptors | ScenesManager meshesDescriptors} array.
     * @param parameters - optional helpers functions to help you patch the {@link Mesh} parameters.
     * @param parameters.patchMeshParameters - allow to optionally patch the {@link Mesh} parameters before creating it (can be used to add uniforms or storages, change rendering options, etc.)
     * @param parameters.setCustomMeshShaders - allow to optionally define custom shaders to use for the {@link Mesh}, or use the built-in PBR shader builder.
     */
    addMeshes({ patchMeshParameters, setCustomMeshShaders, }?: {
        patchMeshParameters?: (parameters: any) => void;
        setCustomMeshShaders?: (meshDescriptor: any, { ambientContribution, lightContribution }?: any) => {
            shaders: import("../../types/Materials").MaterialShaders;
        };
    }): void;
    /**
     * Destroy the current {@link ScenesManager} by removing all created {@link ScenesManager#meshes | meshes} and destroying all the {@link Object3D} nodes.
     */
    destroy(): void;
}
