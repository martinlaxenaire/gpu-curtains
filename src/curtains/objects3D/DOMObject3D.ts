import { ProjectedObject3D } from '../../core/objects3D/ProjectedObject3D'
import { GPUCurtainsRenderer } from '../renderers/GPUCurtainsRenderer'
import { GPUCurtains } from '../GPUCurtains'
import { isCurtainsRenderer } from '../../core/renderers/utils'
import { DOMElement, DOMElementBoundingRect, DOMElementParams, DOMPosition, RectBBox } from '../../core/DOM/DOMElement'
import { Vec3 } from '../../math/Vec3'
import { Camera } from '../../core/camera/Camera'
import { Object3DTransforms } from '../../core/objects3D/Object3D'

/** Defines the {@link DOMObject3D} bounding boxes in both document and world spaces */
export interface DOMObject3DSize {
  /** The {@link DOMObject3D} bounding box in world space */
  world: RectBBox
  /** The {@link DOMObject3D} bounding box in document space */
  document: RectBBox
}

/**
 * Defines all necessary [vectors]{@link Vec3}/[quaternions]{@link Quat} to compute a 3D [model matrix]{@link Mat4} based on a DOM [HTML Element]{@link HTMLElement}
 */
export interface DOMObject3DTransforms extends Omit<Object3DTransforms, 'origin' | 'position'> {
  /** Transformation origin object */
  origin: {
    /** Transformation origin [vector]{@link Vec3} relative to the {@link DOMObject3D} */
    model: Vec3
    /** Transformation origin [vector]{@link Vec3} relative to the 3D world */
    world: Vec3
  }
  /** Position object */
  position: {
    /** Position [vector]{@link Vec3} relative to the 3D world */
    world: Vec3
    /** Additional translation [vector]{@link Vec3} relative to the DOM document */
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
 * DOMObject3D class:
 * Used to create 3D objects with transform and projection matrices based on a {@link Camera} and an [HTML Element]{@link HTMLElement}
 * @extends ProjectedObject3D
 */
export class DOMObject3D extends ProjectedObject3D {
  /** [Curtains renderer]{@link GPUCurtainsRenderer} used to create this {@link DOMObject3D} */
  renderer: GPUCurtainsRenderer

  /** Defines the {@link DOMObject3D} bounding boxes in both document and world spaces */
  size: DOMObject3DSize
  /** {@link DOMElement} used to track the given [HTML Element]{@link HTMLElement} size change */
  domElement: DOMElement

  /** Whether to automatically update the {@link DOMObject3D} document and world positions on scroll */
  watchScroll: boolean

  /** [Transformation object]{@link DOMObject3DTransforms} of the {@link DOMObject3D} */
  transforms: DOMObject3DTransforms

  /** Private [vector]{@link Vec3} used to keep track of the actual [world position]{@link DOMObject3DTransforms#position.world} accounting the [additional document translation]{@link DOMObject3DTransforms#position.document} converted into world space */
  #DOMObjectWorldPosition: Vec3 = new Vec3()
  /** Private [vector]{@link Vec3} used to keep track of the actual {@link DOMObject3D} world scale accounting the [DOMObject3D world size]{@link DOMObject3D#size.world} */
  #DOMObjectWorldScale: Vec3 = new Vec3()

  /**
   * DOMObject3D constructor
   * @param renderer - [Curtains renderer]{@link GPUCurtainsRenderer} object or {@link GPUCurtains} class object used to create this {@link Plane}
   * @param element - {@link HTMLElement} or string representing an {@link HTMLElement} selector used to scale and position the {@link DOMObject3D}
   * @param parameters - [parameters]{@link DOMObject3DParams} used to create this {@link DOMObject3D}
   */
  constructor(
    renderer: GPUCurtainsRenderer | GPUCurtains,
    element: DOMElementParams['element'],
    parameters: DOMObject3DParams
  ) {
    super(renderer)

    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as GPUCurtainsRenderer)

    isCurtainsRenderer(renderer, 'DOM3DObject')

    this.renderer = renderer

    this.size = {
      world: {
        width: 0,
        height: 0,
        top: 0,
        left: 0,
      },
      document: {
        width: 0,
        height: 0,
        top: 0,
        left: 0,
      },
    }

    this.watchScroll = parameters.watchScroll

    this.camera = this.renderer.camera

    this.setDOMElement(element)
  }

  /**
   * Set the [DOMElement]{@link DOMObject3D#domElement}
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
   * Update size and position when the [DOMElement]{@link DOMObject3D#domElement} position changed
   * @param boundingRect - the new bounding rectangle
   */
  onPositionChanged(boundingRect?: DOMElementBoundingRect | null) {
    if (this.watchScroll) {
      this.size.document = boundingRect ?? this.domElement.element.getBoundingClientRect()
      this.updateSizeAndPosition()
    }
  }

  /**
   * Reset the [DOMElement]{@link DOMObject3D#domElement}
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

    this.shouldUpdateModelMatrix()
  }

  /**
   * Update the {@link DOMObject3D} sizes, position and projection
   */
  shouldUpdateMatrixStack() {
    this.updateSizeAndPosition()

    super.shouldUpdateMatrixStack()
  }

  /**
   * Resize the {@link DOMObject3D}
   * @param boundingRect - new [DOM Element]{@link DOMObject3D#domElement} [bounding rectangle]{@link DOMElement#boundingRect}
   */
  resize(boundingRect?: DOMElementBoundingRect | null) {
    if (!boundingRect && (!this.domElement || this.domElement?.isResizing)) return

    this.size.document = boundingRect ?? this.domElement.element.getBoundingClientRect()
    this.shouldUpdateMatrixStack()
  }

  /* BOUNDING BOXES GETTERS */

  /**
   * Get the [DOM Element]{@link DOMObject3D#domElement} [bounding rectangle]{@link DOMElement#boundingRect}
   * @readonly
   */
  get boundingRect(): DOMElementBoundingRect {
    return this.domElement.boundingRect
  }

  /* TRANSFOMS */

  /**
   * Set our transforms properties and [onChange]{@link Vec3#onChange} callbacks
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
   * Get/set the [additional translation relative to the document]{@link DOMObject3DTransforms#position.document}
   */
  get documentPosition(): Vec3 {
    return this.transforms.position.document
  }

  set documentPosition(value: Vec3) {
    this.transforms.position.document = value
    this.applyPosition()
  }

  /**
   * Get the [DOMObject3D DOM element]{@link DOMObject3D#domElement} scale in world space
   */
  get DOMObjectWorldScale(): Vec3 {
    return this.#DOMObjectWorldScale.clone()
  }

  /**
   * Get the {@link DOMObject3D} scale in world space (accounting for [scale]{@link DOMObject3D#scale})
   */
  get worldScale(): Vec3 {
    return this.DOMObjectWorldScale.multiply(this.scale)
  }

  /**
   * Get the {@link DOMObject3D} position in world space
   */
  get worldPosition(): Vec3 {
    return this.#DOMObjectWorldPosition.clone()
  }

  /**
   * Get/set the {@link DOMObject3D} transform origin relative to the {@link DOMObject3D}
   */
  get transformOrigin(): Vec3 {
    return this.transforms.origin.model
  }

  set transformOrigin(value: Vec3) {
    this.transforms.origin.model = value
    this.setWorldTransformOrigin()
  }

  /**
   * Get/set the {@link DOMObject3D} transform origin in world space
   */
  get worldTransformOrigin(): Vec3 {
    return this.transforms.origin.world
  }

  set worldTransformOrigin(value: Vec3) {
    this.transforms.origin.world = value
  }

  /**
   * Set the [DOMObject3D world position]{@link DOMObject3D##DOMObjectWorldPosition} using its world position and document translation converted to world space
   */
  applyPosition() {
    this.applyDocumentPosition()
    super.applyPosition()
  }

  /**
   * Compute the [DOMObject3D world position]{@link DOMObject3D##DOMObjectWorldPosition} using its world position and document translation converted to world space
   */
  applyDocumentPosition() {
    // avoid unnecessary calculations if we don't have a users set relative position
    let worldPosition = new Vec3(0, 0, 0)
    if (!this.documentPosition.equals(worldPosition)) {
      worldPosition = this.documentToWorldSpace(this.documentPosition)
    }

    this.#DOMObjectWorldPosition.set(
      this.position.x + this.size.world.left + worldPosition.x,
      this.position.y + this.size.world.top + worldPosition.y,
      this.position.z + this.documentPosition.z / this.camera.CSSPerspective
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
   * Update the [model matrix]{@link DOMObject3D#modelMatrix} accounting the [DOMObject3D world position]{@link DOMObject3D##DOMObjectWorldPosition} and [DOMObject3D world scale]{@link DOMObject3D##DOMObjectWorldScale}
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

    // we need to scale our meshes, from a square to a right sized rectangle
    // we're doing this after our transformation matrix because this scale transformation always have the same origin
    this.modelMatrix.scale(this.#DOMObjectWorldScale)
  }

  /**
   * Convert a document position [vector]{@link Vec3} to a world position [vector]{@link Vec3}
   * @param vector - document position [vector]{@link Vec3} converted to world space
   */
  documentToWorldSpace(vector: Vec3 = new Vec3()): Vec3 {
    return new Vec3(
      ((vector.x * this.renderer.pixelRatio) / this.renderer.boundingRect.width) * this.camera.screenRatio.width,
      -((vector.y * this.renderer.pixelRatio) / this.renderer.boundingRect.height) * this.camera.screenRatio.height,
      vector.z
    )
  }

  /**
   * Set the [DOMOBject3D world size]{@link DOMObject3D#size.world} and set the {@link DOMObject3D} world transform origin
   */
  setWorldSizes() {
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

    // our DOM object world size
    // since our vertices values range from -1 to 1, we need to scale it relatively to our canvas
    // to display an accurately sized object
    this.size.world = {
      width: ((this.size.document.width / containerBoundingRect.width) * this.camera.screenRatio.width) / 2,
      height: ((this.size.document.height / containerBoundingRect.height) * this.camera.screenRatio.height) / 2,
      top: ((containerCenter.y - planeCenter.y) / containerBoundingRect.height) * this.camera.screenRatio.height,
      left: ((planeCenter.x - containerCenter.x) / containerBoundingRect.width) * this.camera.screenRatio.width,
    }

    this.#DOMObjectWorldScale.set(this.size.world.width, this.size.world.height, 1)

    this.setWorldTransformOrigin()
  }

  /**
   * Set the {@link DOMObject3D} world transform origin and tell the matrices to update
   */
  setWorldTransformOrigin() {
    // set transformation origin relative to world space as well
    this.transforms.origin.world = new Vec3(
      (this.transformOrigin.x * 2 - 1) * // between -1 and 1
        this.size.world.width,
      -(this.transformOrigin.y * 2 - 1) * // between -1 and 1
        this.size.world.height,
      this.transformOrigin.z
    )

    this.shouldUpdateModelMatrix()
    this.shouldUpdateProjectionMatrixStack()
  }

  /**
   * Update the [DOMOBject3D DOMElement]{@link DOMObject3D#domElement} scroll position
   * @param delta - last [scroll delta values]{@link ScrollManager#delta}
   */
  updateScrollPosition(delta: DOMPosition = { x: 0, y: 0 }) {
    // actually update the plane position only if last X delta or last Y delta is not equal to 0
    if (delta.x || delta.y) {
      // set new positions based on our delta without triggering reflow
      this.domElement.updateScrollPosition(delta)
    }
  }

  /**
   * Destroy our {@link DOMObject3D}
   */
  destroy() {
    this.domElement?.destroy()
  }
}
