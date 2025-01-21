import { KeyframesAnimation } from './KeyframesAnimation';
import { Object3D } from '../../core/objects3D/Object3D';
import { Renderer } from '../../core/renderers/utils';
import { GPUCurtains } from '../../curtains/GPUCurtains';
/** Defines a {@link TargetsAnimationsManager} target. */
export interface Target {
    /** {@link Object3D} of this target. */
    object: Object3D;
    /** Array of {@link KeyframesAnimation} to use to animate the {@link Object3D}. */
    animations: KeyframesAnimation[];
}
/** Parameters used to create a {@link TargetsAnimationsManager}. */
export interface TargetsAnimationsManagerParams {
    /** Optional label of the {@link TargetsAnimationsManager}. */
    label?: string;
    /** Optional {@link Target} array to use with this {@link TargetsAnimationsManager}. Can be set later. */
    targets?: Target[];
}
/**
 * Class used to help synchronize and run {@link KeyframesAnimation} for a given list of {@link Object3D}. Mostly used internally when loading glTF files, but could be used externally as well.
 */
export declare class TargetsAnimationsManager {
    #private;
    /** The {@link Renderer} used to updte this {@link TargetsAnimationsManager}. */
    renderer: Renderer;
    /** Label of the {@link TargetsAnimationsManager}. */
    label: string;
    /** The universal unique id of this {@link TargetsAnimationsManager}. */
    readonly uuid: string;
    /** Array of {@link Target} defining the animations that this {@link TargetsAnimationsManager} should run. */
    targets: Target[];
    /** Total duration in seconds of all the animations handled by this {@link TargetsAnimationsManager}. */
    duration: number;
    /** Timescale to use for all the animations handled by this {@link TargetsAnimationsManager}. */
    timeScale: number;
    /** Whether the current {@link TargetsAnimationsManager} animations are playing or not. */
    isPlaying: boolean;
    /** Array of all children animations input accessor indices defined in the glTF, used to keep different {@link TargetsAnimationsManager} in sync. */
    inputIndices: number[];
    /** Map of other {@link TargetsAnimationsManager} using the exact same inputs and that should be synced together. */
    siblings: Map<TargetsAnimationsManager['uuid'], TargetsAnimationsManager>;
    /**
     * TargetsAnimationsManager constructor
     * @param renderer - {@link Renderer} or {@link GPUCurtains} class object used to create this {@link TargetsAnimationsManager}.
     * @param parameters - {@link TargetsAnimationsManagerParams | parameters} used to create this {@link TargetsAnimationsManager}.
     */
    constructor(renderer: Renderer | GPUCurtains, { label, targets }?: TargetsAnimationsManagerParams);
    /**
     * Set the current {@link TargetsAnimationsManager.renderer | renderer} to use with this {@link TargetsAnimationsManager}. Can be set to `null` to detach from the current {@link TargetsAnimationsManager.renderer | renderer}.
     * @param renderer
     */
    setRenderer(renderer: Renderer | GPUCurtains | null): void;
    /**
     * Add a new {@link Target} to the {@link targets} array based on an {@link Object3D}.
     * @param object - {@link Object3D} to use for the {@link Target}.
     */
    addTarget(object: Object3D): Target;
    /**
     * Add new {@link Target | targets} to the {@link targets} array based on an array of {@link Object3D}.
     * @param objects - array of {@link Object3D} to use for the {@link Target | targets}.
     */
    addTargets(objects: Object3D[]): void;
    /**
     * Add a {@link KeyframesAnimation} to a {@link Target#animations | target animations} array based on an {@link Object3D}.
     * @param object - {@link Object3D} to use for the {@link Target}.
     * @param animation - {@link KeyframesAnimation} to add.
     */
    addTargetAnimation(object: Object3D, animation: KeyframesAnimation): void;
    /**
     * Get a {@link Target} from the {@link targets} array based on an {@link Object3D}.
     * @param object - {@link Object3D} to use to find the {@link Target}.
     * @returns - {@link Target} found if any.
     */
    getTargetByObject3D(object: Object3D): Target | null;
    /**
     * Get the first animation from the {@link targets} array that matches the {@link Object3D} and {@link KeyframesAnimation#path | path} given.
     * @param object - {@link Object3D} to use to find the {@link KeyframesAnimation}.
     * @param path - {@link KeyframesAnimation#path | path} to use to find the {@link KeyframesAnimation}.
     * @returns - {@link KeyframesAnimation} found if any.
     */
    getAnimationByObject3DAndPath(object: Object3D, path: KeyframesAnimation['path']): KeyframesAnimation | null;
    /**
     * Play or resume the {@link TargetsAnimationsManager}.
     */
    play(): void;
    /**
     * Play the {@link TargetsAnimationsManager} once.
     */
    playOnce(): void;
    /**
     * Pause the {@link TargetsAnimationsManager}.
     */
    pause(): void;
    /**
     * Stop the {@link TargetsAnimationsManager} and reset all the animations values to last keyframe.
     */
    stop(): void;
    /**
     * {@link stop | Stop} the {@link TargetsAnimationsManager} at the end of the next animation loop.
     */
    stopAtEndOfLoop(): void;
    /**
     * Update all the {@link targets} animations.
     */
    update(): void;
    /**
     * Call all the {@link targets} animations {@link KeyframesAnimation#onAfterUpdate | onAfterUpdate} callbacks.
     */
    onAfterUpdate(): void;
}
