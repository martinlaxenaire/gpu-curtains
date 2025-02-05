/// <reference types="dist" />
import { CameraRenderer } from '../../core/renderers/utils';
import { GLTF } from '../../types/gltf/GLTF';
import { GLTFLoader } from '../loaders/GLTFLoader';
import { Texture } from '../../core/textures/Texture';
import { Mesh } from '../../core/meshes/Mesh';
import { TypedArrayConstructor } from '../../core/bindings/utils';
import { VertexBufferAttribute, VertexBufferAttributeParams } from '../../types/Geometries';
import { ChildDescriptor, MeshDescriptor, MeshDescriptorMaterialParams, PrimitiveInstanceDescriptor, ScenesManager } from '../../types/gltf/GLTFScenesManager';
/**
 * Used to create a {@link GLTFScenesManager} from a given {@link GLTFLoader.gltf | gltf} object.
 *
 * Parse the {@link GLTFLoader.gltf | gltf} object, create all the {@link Sampler} and {@link Texture}, create all the {@link Object3D} nodes to compute the correct transformations and parent -> child relationships, create all the needed {@link MeshDescriptor} containing the {@link Geometry}, {@link Mesh} parameters and so on.
 *
 * ## Loading Features
 *
 * - [x] Accessors
 *   - [x] Sparse accessors
 * - [x] Buffers
 * - [x] BufferViews
 * - [x] Images
 * - [x] Meshes
 * - [x] Nodes
 * - [x] Primitives
 *   - [x] Compute flat normals if normal attributes is missing
 *   - [x] Compute tangent space in fragment shader if tangent attributes is missing and a normal map is used (would be better/faster with [MikkTSpace](http://www.mikktspace.com/))
 * - [x] Samplers
 * - [x] Textures
 * - [x] Animations
 *   - Paths
 *     - [x] Translation
 *     - [x] Rotation
 *     - [x] Scale
 *     - [x] Weights
 *   - Interpolation
 *     - [x] Step
 *     - [x] Linear
 *     - [x] CubicSpline
 * - [x] Cameras
 *   - [ ] OrthographicCamera
 *   - [x] PerspectiveCamera
 * - [x] Materials
 * - [x] Skins
 * - [x] Morph targets
 *
 * ## Extensions
 * - [ ] KHR_animation_pointer
 * - [ ] KHR_draco_mesh_compression
 * - [x] KHR_lights_punctual (partial support - SpotLight not yet implemented)
 * - [ ] KHR_materials_anisotropy
 * - [ ] KHR_materials_clearcoat
 * - [x] KHR_materials_dispersion
 * - [x] KHR_materials_emissive_strength
 * - [x] KHR_materials_ior
 * - [ ] KHR_materials_iridescence
 * - [ ] KHR_materials_sheen
 * - [x] KHR_materials_specular
 * - [x] KHR_materials_transmission
 * - [x] KHR_materials_unlit
 * - [x] KHR_materials_variants
 * - [x] KHR_materials_volume
 * - [ ] KHR_mesh_quantization
 * - [ ] KHR_texture_basisu
 * - [x] KHR_texture_transform
 * - [ ] KHR_xmp_json_ld
 * - [x] EXT_mesh_gpu_instancing
 * - [ ] EXT_meshopt_compression
 * - [x] EXT_texture_webp
 *
 * @example
 * ```javascript
 * const gltfLoader = new GLTFLoader()
 * const gltf = await gltfLoader.loadFromUrl('path/to/model.gltf')
 *
 * // create a gltfScenesManager from the resulting 'gltf' object
 * // assuming 'renderer' is a valid camera renderer or curtains instance
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
     * Get the {@link GPUDevice.createRenderPipeline().topology | GPUPrimitiveTopology} based on the {@link GLTF.MeshPrimitiveMode | WebGL primitive mode}.
     * @param mode - {@link GLTF.MeshPrimitiveMode | WebGL primitive mode} to use.
     * @returns - corresponding {@link GPUDevice.createRenderPipeline().topology | GPUPrimitiveTopology}.
     */
    static gpuPrimitiveTopologyForMode(mode: GLTF.MeshPrimitiveMode): GPUPrimitiveTopology;
    /**
     * Get the {@link GPUDevice.createSampler().descriptor.addressModeU | GPUAddressMode} based on the {@link GLTF.TextureWrapMode | WebGL texture wrap mode}.
     * @param wrap - {@link GLTF.TextureWrapMode | WebGL texture wrap mode} to use.
     * @returns - corresponding {@link GPUDevice.createSampler().descriptor.addressModeU | GPUAddressMode}.
     */
    static gpuAddressModeForWrap(wrap: GLTF.TextureWrapMode): GPUAddressMode;
    /**
     * Create the {@link scenesManager} {@link TargetsAnimationsManager} if any animation is present in the {@link gltf}.
     */
    createAnimations(): void;
    /**
     * Create the {@link ScenesManager.lights | lights} defined by the `KHR_lights_punctual` extension if any.
     */
    createLights(): void;
    /**
     * Create the {@link Sampler} and add them to the {@link ScenesManager.samplers | scenesManager samplers array}.
     */
    createSamplers(): void;
    /**
     * Create a {@link Texture} based on the options.
     * @param material - material using that texture.
     * @param image - image source of the texture.
     * @param name - name of the texture.
     * @param useTransform - Whether the {@link Texture} should handle transformations.
     * @returns - newly created {@link Texture}.
     */
    createTexture(material: GLTF.IMaterial, image: ImageBitmap, name: string, useTransform?: boolean): Texture;
    /**
     * Create the {ScenesManager.materialsTextures | scenesManager materialsTextures array} and each associated {@link types/gltf/GLTFScenesManager.MaterialTexture | MaterialTexture} and their respective {@link Texture}.
     */
    createMaterialTextures(): void;
    /**
     * Get the {@link MeshDescriptorMaterialParams} for a given {@link GLTF.IMeshPrimitive.material | glTF primitive material index}.
     * @param materialIndex - {@link GLTF.IMeshPrimitive.material | glTF primitive material index}.
     * @param label - Optional label to use for the {@link RenderMaterial} created.
     * @returns - Created {@link MeshDescriptorMaterialParams}.
     */
    getMaterialBaseParameters(materialIndex: GLTF.IMeshPrimitive['material'], label?: string): MeshDescriptorMaterialParams;
    /**
     * Create all the {@link MeshDescriptorMaterialParams} from the {@link GLTF.IMaterial | glTF materials}.
     */
    createMaterialsParams(): void;
    /**
     * Create a {@link ChildDescriptor} from a parent {@link ChildDescriptor} and a {@link GLTF.INode | glTF Node}
     * @param parent - parent {@link ChildDescriptor} to use.
     * @param node - {@link GLTF.INode | glTF Node} to use.
     * @param index - Index of the {@link GLTF.INode | glTF Node} to use.
     */
    createNode(parent: ChildDescriptor, node: GLTF.INode, index: number): void;
    /**
     * Get a clean attribute name based on a glTF attribute name.
     * @param gltfAttributeName - glTF attribute name.
     * @returns - Attribute name conform to our expectations.
     */
    static getCleanAttributeName(gltfAttributeName: string): string;
    /**
     * Sort an array of {@link VertexBufferAttributeParams} by an array of attribute names.
     * @param attributesNames - array of attribute names to use for sorting.
     * @param attributes - {@link VertexBufferAttributeParams} array to sort.
     */
    sortAttributesByNames(attributesNames: string[], attributes: VertexBufferAttributeParams[]): void;
    /**
     * Create the mesh {@link Geometry} based on the given {@link gltf} primitive and {@link PrimitiveInstanceDescriptor}.
     * @param primitive - {@link gltf} primitive to use to create the {@link Geometry}.
     * @param primitiveInstance - {@link PrimitiveInstanceDescriptor} to use to create the {@link Geometry}.
     */
    createGeometry(primitive: GLTF.IMeshPrimitive, primitiveInstance: PrimitiveInstanceDescriptor): void;
    /**
     * Create the {@link SkinDefinition | skins definitions} for each {@link gltf} skins.
     */
    createSkins(): void;
    /**
     * Create the mesh material parameters based on the given {@link gltf} primitive and {@link PrimitiveInstanceDescriptor}.
     * @param primitive - {@link gltf} primitive to use to create the material parameters.
     * @param primitiveInstance - {@link PrimitiveInstanceDescriptor} to use to create the material parameters.
     */
    createMaterial(primitive: GLTF.IMeshPrimitive, primitiveInstance: PrimitiveInstanceDescriptor): void;
    /**
     * Create the {@link ScenesManager#scenes | ScenesManager scenes} based on the {@link gltf} object.
     */
    createScenes(): void;
    /**
     * Add all the needed {@link Mesh} based on the {@link ScenesManager#meshesDescriptors | ScenesManager meshesDescriptors} array.
     * @param patchMeshesParameters - allow to optionally patch the {@link Mesh} parameters before creating it (can be used to add custom shaders, uniforms or storages, change rendering options, etc.)
     * @returns - Array of created {@link Mesh}.
     */
    addMeshes(patchMeshesParameters?: (meshDescriptor: MeshDescriptor) => void): Mesh[];
    /**
     * Destroy the current {@link ScenesManager} by removing all created {@link ScenesManager#meshes | meshes} and destroying all the {@link Object3D} nodes.
     */
    destroy(): void;
}
