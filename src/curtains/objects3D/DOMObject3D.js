import { DOMElement } from '../../core/DOMElement'
import { Vec3 } from '../../math/Vec3'
import { isCurtainsRenderer } from '../../utils/renderer-utils'
import { ProjectedObject3D } from '../../core/objects3D/ProjectedObject3D'

export class DOMObject3D extends ProjectedObject3D {
  constructor(renderer, element) {
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

    this.setTransforms()
    this.setMatrices()

    this.camera = this.renderer.camera

    this.domElement = new DOMElement({
      element,
      onSizeChanged: (boundingRect) => this.resize(boundingRect),
      onPositionChanged: (boundingRect) => {
        this.size.document = boundingRect
        this.updateSizeAndPosition()
      },
    })
  }

  updateSizeAndPosition() {
    this.setWorldSizes()
    this.applyPosition()
  }

  updateSizePositionAndProjection() {
    this.updateSizeAndPosition()
    this.updateProjectionMatrixStack()
  }

  resize(boundingRect) {
    if (this.domElement?.isResizing) return

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
    return this.size.document
  }

  /** TRANSFOMS **/

  setTransforms() {
    // this.transforms = {
    //   origin: {
    //     model: new Vec3(0.5, 0.5, 0),
    //     world: new Vec3(),
    //   },
    //   quaternion: new Quat(),
    //   rotation: new Vec3(),
    //   position: {
    //     world: new Vec3(),
    //     document: new Vec3(),
    //   },
    //   scale: new Vec3(1),
    // }

    super.setTransforms()

    this.transforms.origin.world = new Vec3()
    this.transforms.position.document = new Vec3()

    //this.rotation.onChange(() => this.applyRotation())
    this.documentPosition.onChange(() => this.applyPosition())
    // this.scale.onChange(() => {
    //   this.transforms.scale.z = 1
    //   this.applyScale()
    // })
    this.transformOrigin.onChange(() => this.setWorldTransformOrigin())
  }

  // transform getters / setters
  // get rotation() {
  //   return this.transforms.rotation
  // }
  //
  // set rotation(value) {
  //   this.transforms.rotation = value
  //   this.applyRotation()
  // }
  //
  // get quaternion() {
  //   return this.transforms.quaternion
  // }
  //
  // set quaternion(value) {
  //   this.transforms.quaternion = value
  // }

  get documentPosition() {
    return this.transforms.position.document
  }

  set documentPosition(value) {
    this.transforms.position.document = value
    this.applyPosition()
  }

  // get position() {
  //   return this.transforms.position.world
  // }
  //
  // set position(value) {
  //   this.transforms.position.world = value
  // }
  //
  // get scale() {
  //   return this.transforms.scale
  // }
  //
  // set scale(value) {
  //   this.transforms.scale = value
  //   this.applyScale()
  // }

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
   This will apply our rotation and tells our model view matrix to update
   ***/
  applyRotation() {
    super.applyRotation()

    //this.quaternion.setFromVec3(this.rotation)

    this.updateModelMatrixStack()
  }

  /***
   This will set our plane position by adding plane computed bounding box values and computed relative position values
   ***/
  applyPosition() {
    super.applyPosition()

    // avoid unnecessary calculations if we don't have a users set relative position
    let worldPosition = new Vec3(0, 0, 0)
    if (!this.documentPosition.equals(worldPosition)) {
      worldPosition = this.documentToWorldSpace(this.documentPosition)
    }

    this.position.set(
      this.size.world.left + worldPosition.x,
      this.size.world.top + worldPosition.y,
      this.documentPosition.z / this.camera.CSSPerspective
    )

    this.updateModelMatrixStack()
  }

  applyScale() {
    super.applyScale()

    this.transforms.scale.z = 1
    // TODO update textures matrix...
    //this.resize()

    this.updateModelMatrixStack(true)
  }

  applyTransformOrigin() {
    super.applyTransformOrigin()

    this.setWorldTransformOrigin()
  }

  /** MATRICES **/

  // override for this special case
  updateModelMatrix() {
    // compose our model transformation matrix from custom origin
    this.modelMatrix.composeFromOrigin(this.position, this.quaternion, this.scale, this.worldTransformOrigin)

    // we need to scale our planes, from a square to a right sized rectangle
    // we're doing this after our transformation matrix because this scale transformation always have the same origin
    this.modelMatrix.scale({
      x: this.size.world.width,
      y: this.size.world.height,
      z: 1,
    })
  }

  updateModelMatrixStack(sizeChanged = false) {
    //this.matrices.model.shouldUpdate = true
    this.matrices.modelView.shouldUpdate = true
    this.matrices.modelViewProjection.shouldUpdate = true
  }

  updateProjectionMatrixStack() {}

  /***
   This function takes pixel values along X and Y axis and convert them to world space coordinates

   params :
   @vector (Vec3): position to convert on X, Y and Z axes

   returns :
   @worldPosition: plane's position in WebGL space
   ***/
  documentToWorldSpace(vector) {
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

    this.setWorldTransformOrigin()
    this.updateModelMatrixStack(true)
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

    this.updateModelMatrixStack()
  }

  // TODO setPosition, setRotation, setScale, etc.

  updateScrollPosition(lastXDelta, lastYDelta) {
    // actually update the plane position only if last X delta or last Y delta is not equal to 0
    if (lastXDelta || lastYDelta) {
      // set new positions based on our delta without triggering reflow
      this.domElement.updateScrollPosition(lastXDelta, lastYDelta)
    }
  }

  // render() {
  //   super.render()
  //   // for (const matrixName in this.matrices) {
  //   //   if (this.matrices[matrixName].shouldUpdate) {
  //   //     this.matrices[matrixName].onUpdate()
  //   //     this.matrices[matrixName].shouldUpdate = false
  //   //   }
  //   // }
  //
  //   // if (this.camera.shouldUpdate) {
  //   //   this.updateProjectionMatrixStack()
  //   //   this.camera.shouldUpdate = false
  //   // }
  // }
}
