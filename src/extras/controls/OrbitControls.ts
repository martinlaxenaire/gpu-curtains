import { Camera } from '../../core/camera/Camera'
import { Vec2 } from '../../math/Vec2'
import { Vec3 } from '../../math/Vec3'
import { throwWarning } from '../../utils/utils'

// largely based on https://github.com/oframe/ogl/blob/master/src/extras/Orbit.js

const tempVec2a = new Vec2()
const tempVec2b = new Vec2()
const tempVec3 = new Vec3()

/** Defines the base parameters used to set / reset an {@link OrbitControls}. */
export interface OrbitControlsBaseParams {
  /** The {@link Vec3 | focus point} or the {@link OrbitControls}. */
  target?: Vec3
  // zoom
  /** Whether to allow zooming or not. */
  enableZoom?: boolean
  /** Minimum zoom value to use. */
  minZoom?: number
  /** Maximum zoom value to use. */
  maxZoom?: number
  /** Zoom speed value to use. */
  zoomSpeed?: number
  // rotate
  /** Whether to allow rotating or not. */
  enableRotate?: boolean
  /** Minimum angle to use for vertical rotation. */
  minPolarAngle?: number
  /** Maximum angle to use for vertical rotation. */
  maxPolarAngle?: number
  /** Minimum angle to use for horizontal rotation. */
  minAzimuthAngle?: number
  /** Maximum angle to use for horizontal rotation. */
  maxAzimuthAngle?: number
  /** Rotate speed value to use. */
  rotateSpeed?: number
  // pan
  /** Whether to allow paning or not. */
  enablePan?: boolean
  /** Pan speed value to use. */
  panSpeed?: number
}

/** Defines base parameters used to create an {@link OrbitControls}. */
export interface OrbitControlsParams extends OrbitControlsBaseParams {
  /** Optional {@link Camera} to use. */
  camera?: Camera
  /** Optional {@link HTMLElement} (or {@link Window} element) to use for event listeners. */
  element?: HTMLElement | Window
}

/**
 * Helper to create orbit camera controls (sometimes called arc ball camera).
 *
 * @example
 * ```javascript
 * // assuming renderer is a valid CameraRenderer
 * const { camera } = renderer
 * const orbitControls = new OrbitControls({ camera })
 * ```
 */
export class OrbitControls {
  /** {@link Camera} to use with this {@link OrbitControls}. */
  camera: Camera

  /**
   * {@link HTMLElement} (or {@link Window} element) to use for event listeners.
   * @private
   */
  #element = null

  /** The {@link Vec3 | focus point} or the {@link OrbitControls}. Default to `Vec3(0)`. */
  target: Vec3

  /** @ignore */
  #offset = new Vec3()

  /** Whether to allow zooming or not. Default to `true`. */
  enableZoom: boolean
  /** Minimum zoom value to use. Default to `0`. */
  minZoom: number
  /** Maximum zoom value to use. Default to `Infinity`. */
  maxZoom: number
  /** Zoom speed value to use. Default to `1`. */
  zoomSpeed: number

  /** Whether to allow rotating or not. Default to `true`. */
  enableRotate: boolean
  /** Minimum angle to use for vertical rotation. Default to `0`. */
  minPolarAngle: number
  /** Maximum angle to use for vertical rotation. Default to `Math.PI`. */
  maxPolarAngle: number
  /** Minimum angle to use for horizontal rotation. Default to `-Infinity`. */
  minAzimuthAngle: number
  /** Maximum angle to use for horizontal rotation. Default to `Infinity`. */
  maxAzimuthAngle: number
  /** Rotate speed value to use. Default to `1`. */
  rotateSpeed: number
  /** @ignore */
  #isOrbiting = false
  /** @ignore */
  #spherical = { radius: 1, phi: 0, theta: 0 }
  /** @ignore */
  #rotateStart = new Vec2()

  /** Whether to allow paning or not. Default to `true`. */
  enablePan: boolean
  /** Pan speed value to use. Default to `1`. */
  panSpeed: number
  /** @ignore */
  #isPaning = false
  /** @ignore */
  #panStart = new Vec2()
  /** @ignore */
  #panDelta = new Vec3()

  /** @ignore */
  #_onContextMenu: () => void
  /** @ignore */
  #_onMouseDown: () => void
  /** @ignore */
  #_onMouseMove: () => void
  /** @ignore */
  #_onMouseUp: () => void
  /** @ignore */
  #_onTouchStart: () => void
  /** @ignore */
  #_onTouchMove: () => void
  /** @ignore */
  #_onTouchEnd: () => void
  /** @ignore */
  #_onMouseWheel: () => void

  /**
   * OrbitControls constructor
   * @param parameters - parameters to use.
   */
  constructor({
    camera,
    element = null,
    target = new Vec3(),
    // zoom
    enableZoom = true,
    minZoom = 0,
    maxZoom = Infinity,
    zoomSpeed = 1,
    // rotate
    enableRotate = true,
    minPolarAngle = 0,
    maxPolarAngle = Math.PI,
    minAzimuthAngle = -Infinity,
    maxAzimuthAngle = Infinity,
    rotateSpeed = 1,
    // pan
    enablePan = true,
    panSpeed = 1,
  }: OrbitControlsParams) {
    if (!camera) {
      throwWarning('OrbitControls: cannot initialize without a camera.')
      return
    }

    // options
    this.#setBaseParams({
      target,
      enableZoom,
      minZoom,
      maxZoom,
      zoomSpeed,
      enableRotate,
      minPolarAngle,
      maxPolarAngle,
      minAzimuthAngle,
      maxAzimuthAngle,
      rotateSpeed,
      enablePan,
      panSpeed,
    })

    this.#_onContextMenu = this.#onContextMenu.bind(this)
    this.#_onMouseDown = this.#onMouseDown.bind(this)
    this.#_onMouseMove = this.#onMouseMove.bind(this)
    this.#_onMouseUp = this.#onMouseUp.bind(this)
    this.#_onTouchStart = this.#onTouchStart.bind(this)
    this.#_onTouchMove = this.#onTouchMove.bind(this)
    this.#_onTouchEnd = this.#onTouchEnd.bind(this)
    this.#_onMouseWheel = this.#onMouseWheel.bind(this)

    this.element = element ?? (typeof window !== 'undefined' ? window : null)

    this.useCamera(camera)
  }

  /**
   * Allow to set or reset this {@link OrbitControls.camera | OrbitControls camera}.
   * @param camera - New {@link OrbitControls.camera | camera} to use.
   */
  useCamera(camera: Camera) {
    this.camera = camera

    this.camera.position.onChange(() => {
      this.camera.lookAt(this.target)
    })

    // Grab initial position values
    this.#offset.copy(this.camera.position).sub(this.target)
    this.#spherical.radius = this.#offset.length()
    this.#spherical.theta = Math.atan2(this.#offset.x, this.#offset.z)
    this.#spherical.phi = Math.acos(Math.min(Math.max(this.#offset.y / this.#spherical.radius, -1), 1))

    this.#update()
  }

  /**
   * Set / reset base params
   * @ignore
   */
  #setBaseParams({
    target,
    // zoom
    enableZoom = this.enableZoom,
    minZoom = this.minZoom,
    maxZoom = this.maxZoom,
    zoomSpeed = this.zoomSpeed,
    // rotate
    enableRotate = this.enableRotate,
    minPolarAngle = this.minPolarAngle,
    maxPolarAngle = this.maxPolarAngle,
    minAzimuthAngle = this.minAzimuthAngle,
    maxAzimuthAngle = this.maxAzimuthAngle,
    rotateSpeed = this.rotateSpeed,
    // pan
    enablePan = this.enablePan,
    panSpeed = this.panSpeed,
  }: OrbitControlsBaseParams = {}) {
    if (target) {
      this.target = target
    }

    this.enableZoom = enableZoom
    this.minZoom = minZoom
    this.maxZoom = maxZoom
    this.zoomSpeed = zoomSpeed

    this.enableRotate = enableRotate
    this.minPolarAngle = minPolarAngle
    this.maxPolarAngle = maxPolarAngle
    this.minAzimuthAngle = minAzimuthAngle
    this.maxAzimuthAngle = maxAzimuthAngle
    this.rotateSpeed = rotateSpeed

    this.enablePan = enablePan
    this.panSpeed = panSpeed
  }

  /**
   * Reset the {@link OrbitControls} values.
   * @param parameters - Parameters used to reset the values. Those are the same as {@link OrbitControlsBaseParams} with an additional position parameter to allow to override the {@link OrbitControls} position.
   */
  reset({
    position,
    target,
    // zoom
    enableZoom = this.enableZoom,
    minZoom = this.minZoom,
    maxZoom = this.maxZoom,
    zoomSpeed = this.zoomSpeed,
    // rotate
    enableRotate = this.enableRotate,
    minPolarAngle = this.minPolarAngle,
    maxPolarAngle = this.maxPolarAngle,
    minAzimuthAngle = this.minAzimuthAngle,
    maxAzimuthAngle = this.maxAzimuthAngle,
    rotateSpeed = this.rotateSpeed,
    // pan
    enablePan = this.enablePan,
    panSpeed = this.panSpeed,
  }: { position?: Vec3 } & OrbitControlsBaseParams = {}) {
    this.#setBaseParams({
      target,
      enableZoom,
      minZoom,
      maxZoom,
      zoomSpeed,
      enableRotate,
      minPolarAngle,
      maxPolarAngle,
      minAzimuthAngle,
      maxAzimuthAngle,
      rotateSpeed,
      enablePan,
      panSpeed,
    })

    if (position) {
      this.updatePosition(position)
    }
  }

  /**
   * Allow to override the {@link camera} position.
   * @param position - new {@link camera} position to set.
   */
  updatePosition(position = new Vec3()) {
    position.sub(this.target)
    this.#spherical.radius = position.length()
    this.#spherical.theta = Math.atan2(position.x, position.z)
    this.#spherical.phi = Math.acos(Math.min(Math.max(position.y / this.#spherical.radius, -1), 1))

    this.#update()
  }

  /**
   * Set the element to use for event listeners. Can remove previous event listeners first if needed.
   * @param value - {@link HTMLElement} (or {@link Window} element) to use.
   */
  set element(value: HTMLElement | Window | null) {
    if (this.#element && (!value || this.#element !== value)) {
      console.log('set element, remove events', value)
      this.#removeEvents()
    }

    this.#element = value

    if (value) {
      this.#addEvents()
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
   * @private
   */
  #addEvents() {
    this.#element.addEventListener('contextmenu', this.#_onContextMenu, false)
    this.#element.addEventListener('mousedown', this.#_onMouseDown, false)
    this.#element.addEventListener('mousemove', this.#_onMouseMove, false)
    this.#element.addEventListener('mouseup', this.#_onMouseUp, false)
    this.#element.addEventListener('touchstart', this.#_onTouchStart, { passive: false })
    this.#element.addEventListener('touchmove', this.#_onTouchMove, { passive: false })
    this.#element.addEventListener('touchend', this.#_onTouchEnd, false)
    this.#element.addEventListener('wheel', this.#_onMouseWheel, { passive: false })
  }

  /**
   * Remove the event listeners.
   * @private
   */
  #removeEvents() {
    this.#element.removeEventListener('contextmenu', this.#_onContextMenu, false)
    this.#element.removeEventListener('mousedown', this.#_onMouseDown, false)
    this.#element.removeEventListener('mousemove', this.#_onMouseMove, false)
    this.#element.removeEventListener('mouseup', this.#_onMouseUp, false)
    this.#element.removeEventListener('touchstart', this.#_onTouchStart, { passive: false })
    this.#element.removeEventListener('touchmove', this.#_onTouchMove, { passive: false })
    this.#element.removeEventListener('touchend', this.#_onTouchEnd, false)
    this.#element.removeEventListener('wheel', this.#_onMouseWheel, { passive: false })
  }

  /**
   * Callback executed on mouse down event.
   * @param e - {@link MouseEvent}.
   * @private
   */
  #onMouseDown(e: MouseEvent) {
    if (e.button === 0 && this.enableRotate) {
      this.#isOrbiting = true
      this.#rotateStart.set(e.clientX, e.clientY)
    } else if (e.button === 2 && this.enablePan) {
      this.#isPaning = true
      this.#panStart.set(e.clientX, e.clientY)
    }

    e.stopPropagation()
    e.preventDefault()
  }

  /**
   * Callback executed on touch start event.
   * @param e - {@link TouchEvent}.
   * @private
   */
  #onTouchStart(e: TouchEvent) {
    // TODO zoom / pan with 2 fingers
    if (e.touches.length === 1 && this.enableRotate) {
      this.#isOrbiting = true
      this.#rotateStart.set(e.touches[0].pageX, e.touches[0].pageY)
    }
  }

  /**
   * Callback executed on mouse move event.
   * @param e - {@link MouseEvent}.
   */
  #onMouseMove(e: MouseEvent) {
    if (this.#isOrbiting && this.enableRotate) {
      this.#rotate(e.clientX, e.clientY)
    } else if (this.#isPaning && this.enablePan) {
      this.#pan(e.clientX, e.clientY)
    }
  }

  /**
   * Callback executed on touch move event.
   * @param e - {@link TouchEvent}.
   * @private
   */
  #onTouchMove(e: TouchEvent) {
    if (this.#isOrbiting && this.enableRotate) {
      this.#rotate(e.touches[0].pageX, e.touches[0].pageY)
    }
  }

  /**
   * Callback executed on mouse up event.
   * @param e - {@link MouseEvent}.
   * @private
   */
  #onMouseUp(e: MouseEvent) {
    this.#isOrbiting = false
    this.#isPaning = false
  }

  /**
   * Callback executed on touch end event.
   * @param e - {@link MouseEvent}.
   * @private
   */
  #onTouchEnd(e: TouchEvent) {
    this.#isOrbiting = false
    this.#isPaning = false
  }

  /**
   * Callback executed on wheel event.
   * @param e - {@link WheelEvent}.
   * @private
   */
  #onMouseWheel(e: WheelEvent) {
    if (this.enableZoom) {
      this.#zoom(e.deltaY)

      e.preventDefault()
    }
  }

  /**
   * Prevent context menu apparition on right click
   * @param e - {@link MouseEvent}.
   * @private
   */
  #onContextMenu(e: MouseEvent) {
    e.preventDefault()
  }

  /**
   * Update the {@link camera} position based on the {@link target} and internal values.
   * @private
   */
  #update() {
    // apply rotation to offset
    const sinPhiRadius = this.#spherical.radius * Math.sin(Math.max(0.000001, this.#spherical.phi))
    this.#offset.x = sinPhiRadius * Math.sin(this.#spherical.theta)
    this.#offset.y = this.#spherical.radius * Math.cos(this.#spherical.phi)
    this.#offset.z = sinPhiRadius * Math.cos(this.#spherical.theta)

    // Apply updated values to object
    this.camera.position.copy(this.target).add(this.#offset)
  }

  /**
   * Update the {@link camera} position based on input coordinates so it rotates around the {@link target}.
   * @param x - input coordinate along the X axis.
   * @param y - input coordinate along the Y axis.
   * @private
   */
  #rotate(x: number, y: number) {
    tempVec2a.set(x, y)
    tempVec2b.copy(tempVec2a).sub(this.#rotateStart).multiplyScalar(this.rotateSpeed)
    this.#spherical.theta -= (2 * Math.PI * tempVec2b.x) / this.camera.size.height
    this.#spherical.phi -= (2 * Math.PI * tempVec2b.y) / this.camera.size.height

    this.#spherical.theta = Math.min(this.maxAzimuthAngle, Math.max(this.minAzimuthAngle, this.#spherical.theta))
    this.#spherical.phi = Math.min(this.maxPolarAngle, Math.max(this.minPolarAngle, this.#spherical.phi))

    this.#rotateStart.copy(tempVec2a)

    this.#update()
  }

  /**
   * Pan the {@link camera} position based on input coordinates by updating {@link target}.
   * @param x - input coordinate along the X axis.
   * @param y - input coordinate along the Y axis.
   * @private
   */
  #pan(x: number, y: number) {
    tempVec2a.set(x, y)
    tempVec2b.copy(tempVec2a).sub(this.#panStart).multiplyScalar(this.panSpeed)

    this.#panDelta.set(0)

    tempVec3.copy(this.camera.position).sub(this.target)
    let targetDistance = tempVec3.length()
    targetDistance *= Math.tan(((this.camera.fov / 2) * Math.PI) / 180.0)

    // pan left
    // get right direction axis accounting for camera transform
    tempVec3.set(
      this.camera.modelMatrix.elements[0],
      this.camera.modelMatrix.elements[1],
      this.camera.modelMatrix.elements[2]
    )

    tempVec3.multiplyScalar(-(2 * tempVec2b.x * targetDistance) / this.camera.size.height)
    this.#panDelta.add(tempVec3)

    // pan up
    // get up direction axis accounting for camera transform
    tempVec3.set(
      this.camera.modelMatrix.elements[4],
      this.camera.modelMatrix.elements[5],
      this.camera.modelMatrix.elements[6]
    )
    tempVec3.multiplyScalar((2 * tempVec2b.y * targetDistance) / this.camera.size.height)
    this.#panDelta.add(tempVec3)

    this.#panStart.copy(tempVec2a)

    this.target.add(this.#panDelta)
    this.#offset.copy(this.camera.position).sub(this.target)
    this.#spherical.radius = this.#offset.length()

    this.#update()
  }

  /**
   * Move the {@link camera} forward or backward.
   * @param value - new value to use for zoom.
   * @private
   */
  #zoom(value: number) {
    this.#spherical.radius = Math.min(
      this.maxZoom,
      Math.max(this.minZoom + 0.000001, this.#spherical.radius + (value * this.zoomSpeed) / 100)
    )

    this.#update()
  }

  /**
   * Destroy the {@link OrbitControls}.
   */
  destroy() {
    // will automatically remove listeners
    this.element = null
  }
}
