import { ProjectedObject3D } from '../../core/objects3D/ProjectedObject3D'
import { GPUCurtainsRenderer } from '../renderers/GPUCurtainsRenderer'
import { GPUCurtains } from '../GPUCurtains'
import { isCurtainsRenderer } from '../../core/renderers/utils'
import { DOMElement, DOMElementBoundingRect, DOMElementParams, DOMPosition, RectBBox } from '../../core/DOM/DOMElement'
import { Vec2 } from '../../math/Vec2'
import { Vec3 } from '../../math/Vec3'
import { Object3DTransforms } from '../../core/objects3D/Object3D'
import { Box3 } from '../../math/Box3'

/** Defines the {@link DOMObject3D} bounding boxes in both document and world spaces */
export interface DOMObject3DSize {
  /** The {@link DOMObject3D} bounding box in document space */
  document: RectBBox

  /** Normalized world size represent the size ratio of the DOM element compared to its container (the renderer DOM element). */
  normalizedWorld: {
    /** 2D size of the {@link DOMObject3D} relative to the document, in the [0, 1] range. */
    size: Vec2
    /** 2D position of the {@link DOMObject3D} relative to the document, in the [-1, 1] range, [0, 0] being at the container center. */
    position: Vec2
  }
  /** Camera world size and position are the {@link normalizedWorld} size and positions accounting for camera screen ratio (visible height / width in world unit) */
  cameraWorld: {
    /** 2D size of the {@link DOMObject3D} relative to the camera field of view and size. */
    size: Vec2
  }
  /** Scaled world size and position are the {@link cameraWorld} size and position scaled by the geometry bounding box, because the geometry vertices are not always in the [-1, 1] range. */
  scaledWorld: {
    /** 3D size of the {@link DOMObject3D} relative to the camera field of view and size and the geometry bounding box. */
    size: Vec3
    /** 3D position of the {@link DOMObject3D} relative to the camera field of view and size and the normalized coordinates. */
    position: Vec3
  }
}

/**
 * Defines all necessary {@link Vec3 | vectors}/{@link math/Quat.Quat | quaternions} to compute a 3D {@link math/Mat4.Mat4 | model matrix} based on a DOM {@link HTMLElement}
 */
export interface DOMObject3DTransforms extends Omit<Object3DTransforms, 'origin' | 'position'> {
  /** Transformation origin object */
  origin: {
    /** Transformation origin {@link Vec3 | vector} relative to the {@link DOMObject3D} */
    model: Vec3
    /** Transformation origin {@link Vec3 | vector} relative to the 3D world */
    world: Vec3
  }
  /** Position object */
  position: {
    /** Position {@link Vec3 | vector} relative to the 3D world */
    world: Vec3
    /** Additional translation {@link Vec3 | vector} relative to the DOM document */
    document: Vec3
  }
}

/**
 * Parameters used to create a {@link DOMObject3D}
 */
export interface DOMObject3DParams {
  /** Whether to automatically update the {@link DOMObject3D} document and world positions on scroll */
  watchScroll?: boolean
}

/**
 * This special kind of {@link ProjectedObject3D} uses an {@link HTMLElement} to convert the corresponding X and Y {@link DOMObject3D#scale | scale} and {@link DOMObject3D#position | position} relative to the 3D world space.
 *
 * Internally used by the {@link curtains/meshes/DOMMesh.DOMMesh | DOMMesh} and {@link curtains/meshes/Plane.Plane | Plane}, but can also be used as any {@link core/meshes/Mesh.Mesh | Mesh} {@link parent} to map it with an {@link HTMLElement} size and position values.
 */
export class DOMObject3D extends ProjectedObject3D {
  /** {@link GPUCurtainsRenderer} used to create this {@link DOMObject3D} */
  renderer: GPUCurtainsRenderer

  /** Defines the {@link DOMObject3D} bounding boxes in both document and world spaces */
  size: DOMObject3DSize
  /** {@link DOMElement} used to track the given {@link HTMLElement} size change */
  domElement: DOMElement

  /** Whether to automatically update the {@link DOMObject3D} document and world positions on scroll */
  watchScroll: boolean

  /** {@link DOMObject3DTransforms | Transformation object} of the {@link DOMObject3D} */
  transforms: DOMObject3DTransforms

  /** Private {@link Vec3 | vector} used to keep track of the actual {@link DOMObject3DTransforms#position.world | world position} accounting the {@link DOMObject3DTransforms#position.document | additional document translation} converted into world space */
  #DOMObjectWorldPosition: Vec3 = new Vec3()
  /** Private {@link Vec3 | vector} used to keep track of the actual {@link DOMObject3D} world scale accounting the {@link DOMObject3D#size.world | DOMObject3D world size} */
  #DOMObjectWorldScale: Vec3 = new Vec3(1)
  /** Private number representing the scale ratio of the {@link DOMObject3D} along Z axis to apply. Since it can be difficult to guess the most accurate scale along the Z axis of an object mapped to 2D coordinates, this helps with adjusting the scale along the Z axis. */
  #DOMObjectDepthScaleRatio: number = 1

  /** Helper {@link Box3 | bounding box} used to map the 3D object onto the 2D DOM element. */
  boundingBox: Box3 = new Box3(new Vec3(-1), new Vec3(1))

  /** function assigned to the {@link onAfterDOMElementResize} callback */
  _onAfterDOMElementResizeCallback: () => void = () => {
    /* allow empty callback */
  }

  /**
   * DOMObject3D constructor
   * @param renderer - {@link GPUCurtainsRenderer} object or {@link GPUCurtains} class object used to create this {@link DOMObject3D}
   * @param element - {@link HTMLElement} or string representing an {@link HTMLElement} selector used to scale and position the {@link DOMObject3D}
   * @param parameters - {@link DOMObject3DParams | parameters} used to create this {@link DOMObject3D}
   */
  constructor(
    renderer: GPUCurtainsRenderer | GPUCurtains,
    element: DOMElementParams['element'],
    parameters: DOMObject3DParams = {}
  ) {
    super(renderer)

    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as GPUCurtainsRenderer)

    isCurtainsRenderer(renderer, 'DOM3DObject')

    this.renderer = renderer

    this.size = {
      document: {
        width: 0,
        height: 0,
        top: 0,
        left: 0,
      },
      normalizedWorld: {
        size: new Vec2(1),
        position: new Vec2(),
      },
      cameraWorld: {
        size: new Vec2(1),
      },
      scaledWorld: {
        size: new Vec3(1),
        position: new Vec3(),
      },
    }

    this.watchScroll = parameters.watchScroll

    this.camera = this.renderer.camera

    this.boundingBox.min.onChange(() => this.updateSizeAndPosition())
    this.boundingBox.max.onChange(() => this.updateSizeAndPosition())

    this.setDOMElement(element)
    ;(this.renderer as GPUCurtainsRenderer).domObjects.push(this)
  }

  /**
   * Set the {@link domElement | DOM Element}
   * @param element - {@link HTMLElement} or string representing an {@link HTMLElement} selector to use
   */
  setDOMElement(element: DOMElementParams['element']) {
    this.domElement = new DOMElement({
      element,
      onSizeChanged: (boundingRect) => this.resize(boundingRect),
      onPositionChanged: (boundingRect) => this.onPositionChanged(boundingRect),
    })
  }

  /**
   * Update size and position when the {@link domElement | DOM Element} position changed
   * @param boundingRect - the new bounding rectangle
   */
  onPositionChanged(boundingRect?: DOMElementBoundingRect | null) {
    if (this.watchScroll) {
      this.size.document = boundingRect ?? this.domElement.element.getBoundingClientRect()
      this.updateSizeAndPosition()
    }
  }

  /**
   * Reset the {@link domElement | DOMElement}
   * @param element - the new {@link HTMLElement} or string representing an {@link HTMLElement} selector to use
   */
  resetDOMElement(element: string | HTMLElement) {
    if (this.domElement) {
      this.domElement.destroy()
    }

    this.setDOMElement(element)
  }

  /**
   * Update the {@link DOMObject3D} sizes and position
   */
  updateSizeAndPosition() {
    this.setWorldSizes()
    this.applyPosition()
  }

  /**
   * Resize the {@link DOMObject3D}
   * @param boundingRect - new {@link domElement | DOM Element} {@link DOMElement#boundingRect | bounding rectangle}
   */
  resize(boundingRect: DOMElementBoundingRect | null = null) {
    if (!boundingRect && (!this.domElement || this.domElement?.isResizing)) return

    this.size.document = boundingRect ?? this.domElement.element.getBoundingClientRect()
    this.updateSizeAndPosition()

    this._onAfterDOMElementResizeCallback && this._onAfterDOMElementResizeCallback()
  }

  /* BOUNDING BOXES GETTERS */

  /**
   * Get the {@link domElement | DOM Element} {@link DOMElement#boundingRect | bounding rectangle}
   * @readonly
   */
  get boundingRect(): DOMElementBoundingRect {
    return this.domElement.boundingRect
  }

  /* TRANSFOMS */

  /**
   * Set our transforms properties and {@link Vec3#onChange | onChange vector} callbacks
   */
  setTransforms() {
    super.setTransforms()

    // reset our model transform origin to reflect CSS transform origins
    this.transforms.origin.model.set(0.5, 0.5, 0)

    this.transforms.origin.world = new Vec3()
    this.transforms.position.document = new Vec3()

    this.documentPosition.onChange(() => this.applyPosition())
    this.transformOrigin.onChange(() => this.setWorldTransformOrigin())
  }

  /**
   * Get the {@link DOMObject3DTransforms#position.document | additional translation relative to the document}
   */
  get documentPosition(): Vec3 {
    return this.transforms.position.document
  }

  /**
   * Set the {@link DOMObject3DTransforms#position.document | additional translation relative to the document}
   * @param value - additional translation relative to the document to apply
   */
  set documentPosition(value: Vec3) {
    this.transforms.position.document = value
    this.applyPosition()
  }

  /**
   * Get the {@link domElement | DOM element} scale in world space
   * @readonly
   */
  get DOMObjectWorldScale(): Vec3 {
    return this.#DOMObjectWorldScale.clone()
  }

  /**
   * Get the {@link DOMObject3D} scale in world space (accounting for {@link scale})
   * @readonly
   */
  get worldScale(): Vec3 {
    return this.DOMObjectWorldScale.multiply(this.scale)
  }

  /**
   * Get the {@link DOMObject3D} position in world space
   * @readonly
   */
  get worldPosition(): Vec3 {
    return this.#DOMObjectWorldPosition.clone()
  }

  /**
   * Get the {@link DOMObject3D} transform origin relative to the {@link DOMObject3D}
   */
  get transformOrigin(): Vec3 {
    return this.transforms.origin.model
  }

  /**
   * Set the {@link DOMObject3D} transform origin relative to the {@link DOMObject3D}
   * @param value - new transform origin
   */
  set transformOrigin(value: Vec3) {
    this.transforms.origin.model = value
    this.setWorldTransformOrigin()
  }

  /**
   * Get the {@link DOMObject3D} transform origin in world space
   */
  get worldTransformOrigin(): Vec3 {
    return this.transforms.origin.world
  }

  /**
   * Set the {@link DOMObject3D} transform origin in world space
   * @param value - new world space transform origin
   */
  set worldTransformOrigin(value: Vec3) {
    this.transforms.origin.world = value
  }

  /**
   * Set the {@link DOMObject3D} world position using its world position and document translation converted to world space
   */
  applyPosition() {
    this.applyDocumentPosition()
    super.applyPosition()
  }

  /**
   * Compute the {@link DOMObject3D} world position using its world position and document translation converted to world space
   */
  applyDocumentPosition() {
    // avoid unnecessary calculations if we don't have a users set relative position
    let worldPosition = new Vec3(0, 0, 0)
    if (!this.documentPosition.equals(worldPosition)) {
      worldPosition = this.documentToWorldSpace(this.documentPosition)
    }

    this.#DOMObjectWorldPosition.set(
      this.position.x + this.size.scaledWorld.position.x + worldPosition.x,
      this.position.y + this.size.scaledWorld.position.y + worldPosition.y,
      this.position.z + this.size.scaledWorld.position.z + this.documentPosition.z / this.camera.CSSPerspective
    )
  }

  /**
   * Apply the transform origin and set the {@link DOMObject3D} world transform origin
   */
  applyTransformOrigin() {
    if (!this.size) return

    this.setWorldTransformOrigin()

    super.applyTransformOrigin()
  }

  /* MATRICES */

  /**
   * Update the {@link modelMatrix | model matrix} accounting the {@link DOMObject3D} world position and {@link DOMObject3D} world scale
   */
  updateModelMatrix() {
    // override for this special case
    // compose our model transformation matrix from custom origin
    this.modelMatrix.composeFromOrigin(
      this.#DOMObjectWorldPosition,
      this.quaternion,
      this.scale,
      this.worldTransformOrigin
    )

    // we need to scale our meshes at least on X and Y axis, from a square to a right sized rectangle
    // we're doing this after our transformation matrix because this scale transformation always have the same origin
    this.modelMatrix.scale(this.DOMObjectWorldScale)

    this.shouldUpdateWorldMatrix()
  }

  /**
   * Convert a document position {@link Vec3 | vector} to a world position {@link Vec3 | vector}
   * @param vector - document position {@link Vec3 | vector} converted to world space
   */
  documentToWorldSpace(vector: Vec3 = new Vec3()): Vec3 {
    return new Vec3(
      ((vector.x * this.renderer.pixelRatio) / this.renderer.boundingRect.width) * this.camera.visibleSize.width,
      -((vector.y * this.renderer.pixelRatio) / this.renderer.boundingRect.height) * this.camera.visibleSize.height,
      vector.z
    )
  }

  /**
   * Compute the {@link DOMObject3D#size | world sizes}
   */
  computeWorldSizes() {
    const containerBoundingRect = this.renderer.boundingRect

    // dimensions and positions of our plane in the document and clip spaces
    // don't forget positions in webgl space are referring to the center of our plane and canvas
    const planeCenter = {
      x: this.size.document.width / 2 + this.size.document.left,
      y: this.size.document.height / 2 + this.size.document.top,
    }

    const containerCenter = {
      x: containerBoundingRect.width / 2 + containerBoundingRect.left,
      y: containerBoundingRect.height / 2 + containerBoundingRect.top,
    }

    // not always ranging from -1 to 1!
    const { size, center } = this.boundingBox
    if (size.x !== 0 && size.y !== 0 && size.z !== 0) {
      center.divide(size)
    }

    // normalized world size represent the size ratio of the DOM element compared to its container (the renderer DOM element)
    // in the [0, 1] range
    this.size.normalizedWorld.size.set(
      this.size.document.width / containerBoundingRect.width,
      this.size.document.height / containerBoundingRect.height
    )

    // normalized world position represent the position of the DOM element compared to its container (the renderer DOM element)
    // in the [-1, 1] range, [0, 0] being the center of the container
    this.size.normalizedWorld.position.set(
      (planeCenter.x - containerCenter.x) / containerBoundingRect.width,
      (containerCenter.y - planeCenter.y) / containerBoundingRect.height
    )

    // camera world size and position are the normalized world size and positions accounting for camera screen ratio (visible height / width in world unit).
    this.size.cameraWorld.size.set(
      this.size.normalizedWorld.size.x * this.camera.visibleSize.width,
      this.size.normalizedWorld.size.y * this.camera.visibleSize.height
    )

    // scaled world size and position are the camera world size and position scaled by the geometry bounding box
    // because the geometry vertices do not always have a [-1, 1] range
    this.size.scaledWorld.size.set(this.size.cameraWorld.size.x / size.x, this.size.cameraWorld.size.y / size.y, 1)

    // Z size is based on Y component, because with a perspective camera, the width is based upon the height
    // we could still adjust with #DOMObjectDepthScaleRatio
    this.size.scaledWorld.size.z =
      this.size.scaledWorld.size.y * (size.x / size.y / (this.size.document.width / this.size.document.height))

    // our scaled world position is the normalized position multiplied by the camera screen ratio
    this.size.scaledWorld.position.set(
      this.size.normalizedWorld.position.x * this.camera.visibleSize.width,
      this.size.normalizedWorld.position.y * this.camera.visibleSize.height,
      0
    )
  }

  /**
   * Compute and set the {@link DOMObject3D#size.world | world size} and set the {@link DOMObject3D} world transform origin
   */
  setWorldSizes() {
    this.computeWorldSizes()
    this.setWorldScale()
    this.setWorldTransformOrigin()
  }

  /**
   * Set the {@link worldScale} accounting for scaled world size and {@link DOMObjectDepthScaleRatio}
   */
  setWorldScale() {
    this.#DOMObjectWorldScale.set(
      this.size.scaledWorld.size.x,
      this.size.scaledWorld.size.y,
      this.size.scaledWorld.size.z * this.#DOMObjectDepthScaleRatio
    )

    this.shouldUpdateMatrixStack()
  }

  /**
   * Set {@link DOMObjectDepthScaleRatio}. Since it can be difficult to guess the most accurate scale along the Z axis of an object mapped to 2D coordinates, this helps with adjusting the scale along the Z axis.
   * @param value - depth scale ratio value to use
   */
  set DOMObjectDepthScaleRatio(value: number) {
    this.#DOMObjectDepthScaleRatio = value

    this.setWorldScale()
  }

  /**
   * Set the {@link DOMObject3D} world transform origin and tell the matrices to update
   */
  setWorldTransformOrigin() {
    // set transformation origin relative to world space as well
    this.transforms.origin.world = new Vec3(
      (this.transformOrigin.x * 2 - 1) * // between -1 and 1
        this.#DOMObjectWorldScale.x,
      -(this.transformOrigin.y * 2 - 1) * // between -1 and 1
        this.#DOMObjectWorldScale.y,
      this.transformOrigin.z * this.#DOMObjectWorldScale.z
    )

    this.shouldUpdateMatrixStack()
  }

  /**
   * Update the {@link domElement | DOM Element} scroll position
   * @param delta - last {@link utils/ScrollManager.ScrollManager.delta | scroll delta values}
   */
  updateScrollPosition(delta: DOMPosition = { x: 0, y: 0 }) {
    // actually update the plane position only if last X delta or last Y delta is not equal to 0
    if (delta.x || delta.y) {
      // set new positions based on our delta without triggering reflow
      this.domElement.updateScrollPosition(delta)
    }
  }

  /**
   * Callback to execute just after the {@link domElement} has been resized.
   * @param callback - callback to run just after {@link domElement} has been resized
   * @returns - our {@link DOMObject3D}
   */
  onAfterDOMElementResize(callback: () => void): DOMObject3D {
    if (callback) {
      this._onAfterDOMElementResizeCallback = callback
    }

    return this
  }

  /**
   * Destroy our {@link DOMObject3D}
   */
  destroy() {
    super.destroy()
    this.domElement?.destroy()
  }
}
