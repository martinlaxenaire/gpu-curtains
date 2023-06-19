import { DOMElement } from '../../core/DOMElement'
import { Vec3 } from '../../math/Vec3'
import { isCurtainsRenderer } from '../../utils/renderer-utils'
import { ProjectedObject3D } from '../../core/objects3D/ProjectedObject3D'

export class DOMObject3D extends ProjectedObject3D {
  #DOMObjectWorldPosition = new Vec3()
  #DOMObjectWorldScale = new Vec3()

  constructor(renderer, element, parameters) {
    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    if (!isCurtainsRenderer(renderer, 'DOM3DObject')) {
      console.warn('DOM3DObject fail')
      return
    }

    super(renderer)

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
    console.log(this.watchScroll)

    this.setTransforms()
    this.setMatrices()

    this.camera = this.renderer.camera

    this.domElement = new DOMElement({
      element,
      onSizeChanged: (boundingRect) => this.resize(boundingRect),
      onPositionChanged: (boundingRect) => {
        if (this.watchScroll) {
          this.size.document = boundingRect
          this.updateSizeAndPosition()
        }
      },
    })
  }

  updateSizeAndPosition() {
    this.setWorldSizes()
    this.applyPosition()

    super.updateSizeAndPosition()
  }

  updateSizePositionAndProjection() {
    this.updateSizeAndPosition()

    super.updateSizePositionAndProjection()
  }

  resize(boundingRect = null) {
    if (!boundingRect && (!this.domElement || this.domElement?.isResizing)) return

    this.size.document = boundingRect ?? this.domElement.element.getBoundingClientRect()
    this.updateSizePositionAndProjection()
  }

  /*** BOUNDING BOXES GETTERS ***/

  /***
   Useful to get our plane HTML element bounding rectangle without triggering a reflow/layout

   returns :
   @boundingRectangle (obj): an object containing our plane HTML element bounding rectangle (width, height, top, bottom, right and left properties)
   ***/
  getBoundingRect() {
    return this.domElement.boundingRect
  }

  /** TRANSFOMS **/

  setTransforms() {
    super.setTransforms()

    // reset our model transform origin to reflect CSS transform origins
    this.transforms.origin.model.set(0.5, 0.5, 0)

    this.transforms.origin.world = new Vec3()
    this.transforms.position.document = new Vec3()

    this.documentPosition.onChange(() => this.applyPosition())
    this.transformOrigin.onChange(() => this.setWorldTransformOrigin())
  }

  get documentPosition() {
    return this.transforms.position.document
  }

  set documentPosition(value) {
    this.transforms.position.document = value
    this.applyPosition()
  }

  get worldScale() {
    return this.#DOMObjectWorldScale.clone().multiply(this.scale)
  }

  get transformOrigin() {
    return this.transforms.origin.model
  }

  set transformOrigin(value) {
    this.transforms.origin.model = value
    this.setWorldTransformOrigin()
  }

  get worldTransformOrigin() {
    return this.transforms.origin.world
  }

  set worldTransformOrigin(value) {
    this.transforms.origin.world = value
  }

  /***
   This will set our plane position by adding plane computed bounding box values and computed relative position values
   ***/
  applyPosition() {
    this.applyDocumentPosition()
    super.applyPosition()
  }

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

  applyTransformOrigin() {
    this.setWorldTransformOrigin()

    super.applyTransformOrigin()
  }

  /** MATRICES **/

  // override for this special case
  updateModelMatrix() {
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

  /***
   This function takes pixel values along X and Y axis and convert them to world space coordinates

   params :
   @vector (Vec3): position to convert on X, Y and Z axes

   returns :
   @worldPosition: plane's position in WebGL space
   ***/
  documentToWorldSpace(vector = new Vec3()) {
    return new Vec3(
      ((vector.x * this.renderer.pixelRatio) / this.renderer.domElement.boundingRect.width) *
        this.camera.screenRatio.width,
      -((vector.y * this.renderer.pixelRatio) / this.renderer.domElement.boundingRect.height) *
        this.camera.screenRatio.height,
      vector.z
    )
  }

  setWorldSizes() {
    const containerBoundingRect = this.renderer.domElement.boundingRect

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

    // our plane world informations
    // since our vertices values range from -1 to 1, it is supposed to draw a square
    // we need to scale them under the hood relatively to our canvas
    // to display an accurately sized planes
    this.size.world = {
      width: ((this.size.document.width / containerBoundingRect.width) * this.camera.screenRatio.width) / 2,
      height: ((this.size.document.height / containerBoundingRect.height) * this.camera.screenRatio.height) / 2,
      top: ((containerCenter.y - planeCenter.y) / containerBoundingRect.height) * this.camera.screenRatio.height,
      left: ((planeCenter.x - containerCenter.x) / containerBoundingRect.width) * this.camera.screenRatio.width,
    }

    this.#DOMObjectWorldScale.set(this.size.world.width, this.size.world.height, 1)

    this.setWorldTransformOrigin()
  }

  setWorldTransformOrigin() {
    // set transformation origin relative to world space as well
    this.transforms.origin.world = new Vec3(
      (this.transforms.origin.model.x * 2 - 1) * // between -1 and 1
        this.size.world.width,
      -(this.transforms.origin.model.y * 2 - 1) * // between -1 and 1
        this.size.world.height,
      this.transforms.origin.model.z
    )

    this.updateModelMatrix()
    this.updateProjectionMatrixStack()
  }

  // TODO setPosition, setRotation, setScale, etc?

  updateScrollPosition(lastXDelta = 0, lastYDelta = 0) {
    // actually update the plane position only if last X delta or last Y delta is not equal to 0
    if (lastXDelta || lastYDelta) {
      // set new positions based on our delta without triggering reflow
      this.domElement.updateScrollPosition(lastXDelta, lastYDelta)
    }
  }
}
