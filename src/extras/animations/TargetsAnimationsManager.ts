import { KeyframesAnimation } from './KeyframesAnimation'
import { Object3D } from '../../core/objects3D/Object3D'
import { generateUUID } from '../../utils/utils'
import { isRenderer, Renderer } from '../../core/renderers/utils'
import { GPUCurtains } from '../../curtains/GPUCurtains'

/** Defines a {@link TargetsAnimationsManager} target. */
export interface Target {
  /** {@link Object3D} of this target. */
  object: Object3D
  /** Array of {@link KeyframesAnimation} to use to animate the {@link Object3D}. */
  animations: KeyframesAnimation[]
}

/** Parameters used to create a {@link TargetsAnimationsManager}. */
export interface TargetsAnimationsManagerParams {
  /** Optional label of the {@link TargetsAnimationsManager}. */
  label?: string
  /** Optional {@link Target} array to use with this {@link TargetsAnimationsManager}. Can be set later. */
  targets?: Target[]
}

/**
 * Class used to help synchronize and run {@link KeyframesAnimation} for a given list of {@link Object3D}. Mostly used internally when loading glTF files, but could be used externally as well.
 */
export class TargetsAnimationsManager {
  /** The {@link Renderer} used to updte this {@link TargetsAnimationsManager}. */
  renderer: Renderer

  /** Label of the {@link TargetsAnimationsManager}. */
  label: string
  /** The universal unique id of this {@link TargetsAnimationsManager}. */
  readonly uuid: string
  /** Array of {@link Target} defining the animations that this {@link TargetsAnimationsManager} should run. */
  targets: Target[]

  // inner time values
  /** @ignore */
  #startTime: number
  /** @ignore */
  #currentTime: number
  /** @ignore */
  #deltaTime: number

  /** Total duration in seconds of all the animations handled by this {@link TargetsAnimationsManager}. */
  duration: number
  /** Timescale to use for all the animations handled by this {@link TargetsAnimationsManager}. */
  timeScale: number

  /** @ignore */
  #count: number
  /** @ignore */
  #maxCount: number
  /** Whether the current {@link TargetsAnimationsManager} animations are playing or not. */
  isPlaying: boolean

  /**
   * TargetsAnimationsManager constructor
   * @param renderer - {@link Renderer} or {@link GPUCurtains} class object used to create this {@link TargetsAnimationsManager}.
   * @param parameters - {@link TargetsAnimationsManagerParams | parameters} used to create this {@link TargetsAnimationsManager}.
   */
  constructor(renderer: Renderer | GPUCurtains, { label = '', targets = [] } = {} as TargetsAnimationsManagerParams) {
    this.uuid = generateUUID()

    this.setRenderer(renderer)

    this.label = label
    this.targets = []
    this.duration = 0
    this.timeScale = 1

    this.#startTime = performance.now()
    this.#currentTime = performance.now()
    this.#deltaTime = 0
    this.#count = 0

    this.#count = 0
    this.#maxCount = Infinity
    this.isPlaying = false

    if (targets && targets.length) {
      this.targets = [...this.targets, ...targets]
    }
  }

  /**
   * Set the current {@link TargetsAnimationsManager.renderer | renderer} to use with this {@link TargetsAnimationsManager}. Can be set to `null` to detach from the current {@link TargetsAnimationsManager.renderer | renderer}.
   * @param renderer
   */
  setRenderer(renderer: Renderer | GPUCurtains | null) {
    if (this.renderer) {
      this.renderer.animations.delete(this.uuid)
    }

    if (renderer) {
      renderer = isRenderer(renderer, 'TargetsAnimationsManager')
      this.renderer = renderer
      this.renderer.animations.set(this.uuid, this)
    }
  }

  /**
   * Add a new {@link Target} to the {@link targets} array based on an {@link Object3D}.
   * @param object - {@link Object3D} to use for the {@link Target}.
   */
  addTarget(object: Object3D): Target {
    const target = {
      object,
      animations: [],
    }

    this.targets.push(target)

    return target
  }

  /**
   * Add new {@link Target | targets} to the {@link targets} array based on an array of {@link Object3D}.
   * @param objects - array of {@link Object3D} to use for the {@link Target | targets}.
   */
  addTargets(objects: Object3D[]) {
    objects.forEach((object) => this.addTarget(object))
  }

  /**
   * Add a {@link KeyframesAnimation} to a {@link Target#animations | target animations} array based on an {@link Object3D}.
   * @param object - {@link Object3D} to use for the {@link Target}.
   * @param animation - {@link KeyframesAnimation} to add.
   */
  addTargetAnimation(object: Object3D, animation: KeyframesAnimation) {
    this.duration = Math.max(this.duration, animation.duration)

    let target = this.getTargetByObject3D(object)

    if (!target) {
      target = this.addTarget(object)
    }

    target.animations.push(animation)
  }

  /**
   * Get a {@link Target} from the {@link targets} array based on an {@link Object3D}.
   * @param object - {@link Object3D} to use to find the {@link Target}.
   * @returns - {@link Target} found if any.
   */
  getTargetByObject3D(object: Object3D): Target | null {
    return this.targets.find((target) => target.object.object3DIndex === object.object3DIndex)
  }

  /**
   * Get the first animation from the {@link targets} array that matches the {@link Object3D} and {@link KeyframesAnimation#path | path} given.
   * @param object - {@link Object3D} to use to find the {@link KeyframesAnimation}.
   * @param path - {@link KeyframesAnimation#path | path} to use to find the {@link KeyframesAnimation}.
   * @returns - {@link KeyframesAnimation} found if any.
   */
  getAnimationByObject3DAndPath(object: Object3D, path: KeyframesAnimation['path']): KeyframesAnimation | null {
    const target = this.getTargetByObject3D(object)

    if (target) {
      return target.animations.find((animation) => animation.path === path)
    } else {
      return null
    }
  }

  /**
   * Play or resume the {@link TargetsAnimationsManager}.
   */
  play() {
    this.isPlaying = true
  }

  /**
   * Play the {@link TargetsAnimationsManager} once.
   */
  playOnce() {
    this.#maxCount = 1
    this.play()
  }

  /**
   * Pause the {@link TargetsAnimationsManager}.
   */
  pause() {
    this.isPlaying = false
    // reset start time so we could know we'll be coming back from a pause
    this.#startTime = 0
  }

  /**
   * Stop the {@link TargetsAnimationsManager} and reset all the animations values to last keyframe.
   */
  stop() {
    this.isPlaying = false
    this.#count = 0

    // force reset all animations to end frame
    this.targets.forEach((target) =>
      target.animations.forEach((animation) =>
        animation.update(target.object, Math.min(animation.duration, this.duration))
      )
    )

    // update joints matrices if needed
    this.renderer.onAfterRenderScene.add(
      () => {
        this.targets.forEach((target) => {
          target.animations.forEach((animation) => {
            if (animation.onAfterUpdate) animation.onAfterUpdate()
          })
        })
      },
      {
        once: true,
      }
    )
  }

  /**
   * {@link stop | Stop} the {@link TargetsAnimationsManager} at the end of the next animation loop.
   */
  stopAtEndOfLoop() {
    this.#maxCount = this.#count + 1
  }

  /**
   * Update all the {@link targets} animations.
   */
  update() {
    if (!this.isPlaying) return

    if (this.#startTime === 0) {
      // we're coming back from a pause
      this.#startTime = performance.now() - this.#deltaTime
    }

    this.#currentTime = performance.now()

    // in seconds
    this.#deltaTime = this.#currentTime - this.#startTime
    const time = (this.#deltaTime * this.timeScale) / 1000

    const currentTime = time % this.duration
    this.#count = Math.floor(time / this.duration)

    if (this.#count >= this.#maxCount) {
      this.stop()
      return
    }

    this.targets.forEach((target) =>
      target.animations.forEach((animation) => animation.update(target.object, currentTime))
    )
  }

  /**
   * Call all the {@link targets} animations {@link KeyframesAnimation#onAfterUpdate | onAfterUpdate} callbacks.
   */
  onAfterUpdate() {
    if (!this.isPlaying) return

    this.targets.forEach((target) =>
      target.animations.forEach((animation) => {
        if (animation.onAfterUpdate) animation.onAfterUpdate()
      })
    )
  }
}
