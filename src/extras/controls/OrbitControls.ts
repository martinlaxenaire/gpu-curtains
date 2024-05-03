import { CameraRenderer } from '../../core/renderers/utils'
import { Camera } from '../../core/camera/Camera'
import { Object3D } from '../../core/objects3D/Object3D'
import { Vec2 } from '../../math/Vec2'
import { Vec3 } from '../../math/Vec3'

// port of https://github.com/toji/webgpu-gltf-case-study/blob/main/samples/js/tiny-webgpu-demo.js#L312

/**
 * Helper to create orbit camera controls (sometimes called arcball camera).
 *
 * @example
 * ```javascript
 * const orbitControls = new OrbitControl(renderer)
 * ```
 */
export class OrbitControls extends Object3D {
  /** {@link CameraRenderer} used to get the {@link core/scenes/Scene.Scene | Scene} object to use as {@link Object3D#parent | parent}, and eventually the {@link CameraRenderer#camera | Camera} as well. */
  renderer: CameraRenderer
  /** {@link Camera} to use with this {@link OrbitControls}. */
  camera: Camera

  /**
   * Last pointer {@link Vec2 | position}, used internally for orbiting delta calculations.
   * @private
   */
  #lastPosition = new Vec2()
  /**
   * Whether the {@link OrbitControls} are currently orbiting.
   * @private
   */
  #isOrbiting = false

  /** Whether to constrain the orbit controls along X axis or not. */
  constrainXOrbit = true
  /** Whether to constrain the orbit controls along Y axis or not. */
  constrainYOrbit = false

  /** Minimum orbit values to apply along both axis if constrained. */
  minOrbit = new Vec2(-Math.PI * 0.5, -Math.PI)
  /** Maximum orbit values to apply along both axis if constrained. */
  maxOrbit = new Vec2(Math.PI * 0.5, Math.PI)
  /** Orbit step (speed) values to use. */
  orbitStep = new Vec2(0.025)

  /** Whether to constrain the zoom or not. */
  constrainZoom = true
  /** Minimum zoom value to apply if constrained (can be negative). */
  minZoom = 0
  /** Maximum zoom value to apply if constrained. */
  maxZoom = 20
  /** Zoom step (speed) value to use. */
  zoomStep = 0.005

  /** {@link OrbitControls} target. */
  //target = new Vec3()

  /**
   * {@link HTMLElement} (or {@link Window} element) to use for event listeners.
   * @private
   */
  #element = null

  /**
   * OrbitControls constructor
   * @param renderer - {@link CameraRenderer} used to get the {@link core/scenes/Scene.Scene | Scene} object to use as {@link Object3D#parent | parent}, and eventually the {@link CameraRenderer#camera | Camera} as well.
   * @param camera - optional {@link Camera} to use.
   */
  constructor(renderer: CameraRenderer, camera: Camera = null) {
    super()

    this.renderer = renderer
    this.parent = this.renderer.scene

    this.quaternion.setAxisOrder('YXZ')

    this.camera = camera || this.renderer.camera
    this.camera.parent = this

    this.element = this.renderer.domElement.element
  }

  /**
   * Set the element to use for event listeners. Can remove previous event listeners first if needed.
   * @param value - {@link HTMLElement} (or {@link Window} element) to use.
   */
  set element(value: HTMLElement | Window | null) {
    if (this.#element && (!value || this.#element !== value)) {
      this.removeEvents()
    }

    this.#element = value

    if (value) {
      this.addEvents()
    }
  }

  /**
   * Get our element to use for event listeners.
   * @returns - {@link HTMLElement} (or {@link Window} element) used.
   */
  get element() {
    return this.#element
  }

  /**
   * Add the event listeners.
   */
  addEvents() {
    this.#element.addEventListener('pointerdown', this.onPointerDown.bind(this))
    this.#element.addEventListener('pointermove', this.onPointerMove.bind(this))
    this.#element.addEventListener('pointerup', this.onPointerUp.bind(this))
    this.#element.addEventListener('wheel', this.onMouseWheel.bind(this))
  }

  /**
   * Remove the event listeners.
   */
  removeEvents() {
    this.#element.removeEventListener('pointerdown', this.onPointerDown.bind(this))
    this.#element.removeEventListener('pointermove', this.onPointerMove.bind(this))
    this.#element.removeEventListener('pointerup', this.onPointerUp.bind(this))
    this.#element.removeEventListener('wheel', this.onMouseWheel.bind(this))
  }

  /**
   * Callback executed on pointer down event.
   * @param e - {@link PointerEvent}.
   */
  onPointerDown(e: PointerEvent) {
    if (e.isPrimary) {
      this.#isOrbiting = true
    }

    this.#lastPosition.set(e.pageX, e.pageY)
  }

  /**
   * Callback executed on pointer move event.
   * @param e - {@link PointerEvent}.
   */
  onPointerMove(e: PointerEvent) {
    let xDelta, yDelta

    // TODO PointerLock API?
    // https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API
    if (document.pointerLockElement) {
      xDelta = e.movementX
      yDelta = e.movementY
      this.orbit(xDelta * this.orbitStep.x, yDelta * this.orbitStep.y)
    } else if (this.#isOrbiting) {
      xDelta = e.pageX - this.#lastPosition.x
      yDelta = e.pageY - this.#lastPosition.y
      this.#lastPosition.set(e.pageX, e.pageY)
      this.orbit(xDelta * this.orbitStep.x, yDelta * this.orbitStep.y)
    }
  }

  /**
   * Callback executed on pointer up event.
   * @param e - {@link PointerEvent}.
   */
  onPointerUp(e: PointerEvent) {
    if (e.isPrimary) {
      this.#isOrbiting = false
    }
  }

  /**
   * Callback executed on wheel event.
   * @param e - {@link WheelEvent}.
   */
  onMouseWheel(e: WheelEvent) {
    this.zoom(this.position.z + e.deltaY * this.zoomStep)
    e.preventDefault()
  }

  /**
   * Reset the {@link OrbitControls} {@link position} and {@link rotation} values.
   */
  reset() {
    this.position.set(0)
    this.rotation.set(0)
  }

  /**
   * Update the {@link OrbitControls} {@link rotation} based on deltas.
   * @param xDelta - delta along the X axis.
   * @param yDelta - delta along the Y axis.
   */
  orbit(xDelta: number, yDelta: number) {
    if (xDelta || yDelta) {
      this.rotation.y -= xDelta
      if (this.constrainYOrbit) {
        this.rotation.y = Math.min(Math.max(this.rotation.y, this.minOrbit.y), this.maxOrbit.y)
      } else {
        while (this.rotation.y < -Math.PI) {
          this.rotation.y += Math.PI * 2
        }
        while (this.rotation.y >= Math.PI) {
          this.rotation.y -= Math.PI * 2
        }
      }

      this.rotation.x -= yDelta
      if (this.constrainXOrbit) {
        this.rotation.x = Math.min(Math.max(this.rotation.x, this.minOrbit.x), this.maxOrbit.x)
      } else {
        while (this.rotation.x < -Math.PI) {
          this.rotation.x += Math.PI * 2
        }
        while (this.rotation.x >= Math.PI) {
          this.rotation.x -= Math.PI * 2
        }
      }
    }
  }

  /**
   * Update the {@link OrbitControls} {@link position} Z component based on the new distance.
   * @param distance - new distance to use.
   */
  zoom(distance: number) {
    this.position.z = distance
    if (this.constrainZoom) {
      this.position.z = Math.min(Math.max(this.position.z, this.minZoom), this.maxZoom)
    }
  }

  /**
   * Override {@link Object3D#updateModelMatrix | updateModelMatrix} method to compose the {@link modelMatrix}.
   */
  updateModelMatrix() {
    // compose our model transformation matrix from translations and rotation in the right order
    this.modelMatrix
      .identity()
      //.translate(this.target)
      .rotateFromQuaternion(this.quaternion)
      .translate(this.position)

    // tell our world matrix to update
    this.shouldUpdateWorldMatrix()
  }

  /**
   * Destroy the {@link OrbitControls}.
   */
  destroy() {
    this.camera.parent = this.renderer.scene
    this.parent = null

    this.element = null
  }
}
