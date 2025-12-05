import { OrthographicCamera } from '../../core/cameras/OrthographicCamera';
import { PerspectiveCamera } from '../../core/cameras/PerspectiveCamera';
import { Object3D } from '../../core/objects3D/Object3D';
import { MediaTexture } from '../../core/textures/MediaTexture';
import { MeshDescriptor } from '../../types';
import { KeyframesAnimation, KeyframesAnimationValueType } from '../animations/KeyframesAnimation';
import { TargetsAnimationsManager } from '../animations/TargetsAnimationsManager';
import { LitMesh, LitMeshMaterialUniformParams, ShaderTextureDescriptor } from '../meshes/LitMesh';
import { GLTFScenesManager } from './GLTFScenesManager';
/** Defines the pointer animation types. */
export type PointerAnimationType = 'nodes' | 'materials' | 'textures' | 'cameras' | 'lights';
/** Defines the allowed pointer material animations properties. */
export type PointerAnimatedMaterialProperty = keyof LitMeshMaterialUniformParams | 'iridescenceThicknessMinimum' | 'iridescenceThicknessMaximum';
/** Defines the allowed pointer texture animation properties. */
export type PointerAnimatedTextureProperty = 'rotation' | 'scale' | 'offset';
/** Map of the pointer material animations using {@link PointerAnimatedMaterialProperty} and {@link KeyframesAnimation} as key/values. */
export type PointerMaterialAnimations = Map<PointerAnimatedMaterialProperty, KeyframesAnimation>;
/** Map of the mesh descriptor pointer materials animations using {@link MeshDescriptor} and {@link PointerMaterialAnimations} as key/values. */
export type MeshDescriptorPointerMaterialAnimations = Map<MeshDescriptor, PointerMaterialAnimations>;
/**
 * Additional class to help manage glTF pointer animations defined by the [KHR_animation_pointer](https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Khronos/KHR_animation_pointer) extension.
 *
 * @example
 * ```javascript
 * const gltfLoader = new GLTFLoader()
 * const pointerAnimationsManager = new GLTFPointerAnimationsManager()
 * const gltf = await gltfLoader.loadFromUrl('path/to/model.gltf')
 *
 * // create a gltfScenesManager from the resulting 'gltf' object
 * // assuming 'renderer' is a valid camera renderer or curtains instance
 * const gltfScenesManager = new GLTFScenesManager({ renderer, gltf })
 *
 * // create the pointer animations
 * pointerAnimationsManager.createPointerAnimations(gltfScenesManager)
 *
 * // add the meshes
 * gltfScenesManager.addMeshes()
 * ```
 */
export declare class GLTFPointerAnimationsManager {
    /** Current {@link GLTFScenesManager} instance to add the pointer animations to. */
    gltfScenesManager: GLTFScenesManager | null;
    /** Specific map of the mesh descriptor pointer materials animations. */
    materialAnimations: MeshDescriptorPointerMaterialAnimations;
    /**
     * {@link GLTFPointerAnimationsManager} constructor.
     */
    constructor();
    /** Reset the {@link materialAnimations} map. */
    resetAnimationsMaps(): void;
    /**
     * Add an {@link Object3D} as a {@link TargetsAnimationsManager} target.
     * @param object - {@link Object3D} to add.
     * @param targetsAnimation - {@link TargetsAnimationsManager} to add to.
     */
    addObjectToTargetAnimation(object: Object3D, targetsAnimation: TargetsAnimationsManager): void;
    /**
     * Get the {@link PointerAnimationType | animation type} and animated property from a given pointer animation channel.
     * @param propertyPaths - Array of strings parsed from the pointer channel extension path.
     * @returns - The correct animation type and property.
     */
    getAnimationTypeAndProperty(propertyPaths: string[]): {
        /** Animated property. */
        animatedProperty: string;
        /** {@link PointerAnimationType | Animation type}. */
        animationType: PointerAnimationType;
    };
    /**
     * Get any camera animations {@link KeyframesAnimationValueType | value type} and key (property) to use for the {@link KeyframesAnimation}.
     * @param animatedProperty - Animated property from the pointer channel extension path.
     * @returns - The camera animations {@link KeyframesAnimationValueType | value type} and key (property) to animate.
     */
    getCleanCameraProperties(animatedProperty: string): {
        /** Animation {@link KeyframesAnimationValueType | value type}. */
        type: KeyframesAnimationValueType;
        /** Camera key (property) to animate. */
        key: keyof OrthographicCamera | keyof PerspectiveCamera;
    };
    /**
     * Get any light animations {@link KeyframesAnimationValueType | value type} and key (property) to use for the {@link KeyframesAnimation}.
     * @param animatedProperty - Animated property from the pointer channel extension path.
     * @returns - The light animations {@link KeyframesAnimationValueType | value type} and key (property) to animate.
     */
    getCleanLightProperties(animatedProperty: string): {
        /** Animation {@link KeyframesAnimationValueType | value type}. */
        type: KeyframesAnimationValueType;
        /** Light key (property) to animate. */
        key: string;
    };
    /**
     * Get any material animations {@link KeyframesAnimationValueType | value type} and key (property) to use for the {@link KeyframesAnimation}.
     * @param animatedProperty - Animated property from the pointer channel extension path.
     * @returns - The material animations {@link KeyframesAnimationValueType | value type} and {@link PointerAnimatedMaterialProperty | material key (property)} to animate.
     */
    getCleanMaterialProperties(animatedProperty: string): {
        /** Animation {@link KeyframesAnimationValueType | value type}. */
        type: KeyframesAnimationValueType;
        /** {@link PointerAnimatedMaterialProperty | Material key (property)} to animate. */
        key: PointerAnimatedMaterialProperty;
    };
    /**
     * Get an array of {@link MediaTexture} from a given array of available {@link ShaderTextureDescriptor} corresponding to the given glTF texture name input.
     * @param textureName - glTF texture name to use to retrieve the textures.
     * @param texturesDescriptors - Array of available {@link ShaderTextureDescriptor}.
     * @returns - Array of matching {@link MediaTexture}.
     */
    getCleanTextures(textureName: string, texturesDescriptors: ShaderTextureDescriptor[]): MediaTexture[];
    /**
     * Create all the necessary pointer {@link KeyframesAnimation} for a given {@link GLTFScenesManager} instance.
     *
     * Parse the animations channels, and for each one:
     * - Get the animation path and use it to extract the {@link PointerAnimationType | animation type} and animated property.
     * - Based on the {@link PointerAnimationType | animation type}, create the corresponding {@link KeyframesAnimation} and handle the actual value update (except for materials, where it's done inside {@link registerMeshAnimations} method).
     *
     * @param gltfScenesManager - {@link GLTFScenesManager} instance to parse for pointer animations.
     */
    createPointerAnimations(gltfScenesManager?: any): void;
    /**
     * Handle the {@link PointerMaterialAnimations | pointer material animations} from the {@link materialAnimations} map after the {@link GLTFScenesManager} meshes have been created.
     *
     * Since material animations need an actual {@link LitMesh} to apply the animation, they actually need to be registered once the mesh has been created.
     *
     * This method is called internally by {@link GLTFScenesManager}.
     *
     * @param meshDescriptor - Reference {@link MeshDescriptor} to use as {@link materialAnimations} Map key.
     * @param mesh - {@link LitMesh} that will have its material uniform animated.
     */
    registerMeshAnimations(meshDescriptor: MeshDescriptor, mesh: LitMesh): void;
}
