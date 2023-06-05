import { Vec3 } from '../../math/Vec3.js'
import { Mat4 } from '../../math/Mat4.js'

/***
 Here we create our Camera object
 Creates a perspective camera and its projection matrix (which is used by Plane's class objects)
 Uses a dirty shouldUpdate flag used to determine if we should update the matrix

 params:
 @fov (float, optional): the perspective field of view. Should be greater than 0 and lower than 180. Default to 50.
 @near (float, optional): near plane, the closest point where a mesh vertex is drawn. Default to 0.1.
 @far (float, optional): far plane, farthest point where a mesh vertex is drawn. Default to 150.
 @width (float, optional): width used to calculate the camera aspect ratio. Default to the renderer container's width.
 @height (float, optional): height used to calculate the camera aspect ratio. Default to the renderer container's height.
 @pixelRatio (float, optional): pixel ratio used to calculate the camera aspect ratio. Default to the renderer's pixel ratio.

 returns:
 @this: our Mesh element
 ***/
export class Camera {
  constructor({
    fov = 50,
    near = 0.01,
    far = 50,
    width,
    height,
    pixelRatio = 1,
    onBeforePerspectiveUpdate = () => {},
    onPositionChanged = () => {},
  } = {}) {
    // camera can't be at position (0, 0, 0), it needs some recoil
    // arbitrarily set to 1
    this.position = new Vec3(0, 0, 1).onChange(() => this.applyPosition())
    this.projectionMatrix = new Mat4()

    this.modelMatrix = new Mat4()
    this.viewMatrix = new Mat4()

    this.onBeforePerspectiveUpdate = onBeforePerspectiveUpdate
    this.onPositionChanged = onPositionChanged

    this.shouldUpdate = false

    this.setPerspective(fov, near, far, width, height, pixelRatio)
  }

  /***
   Sets the camera field of view
   Update the camera projection matrix only if the fov actually changed

   params:
   @fov (float, optional): field of view to use
   ***/
  setFov(fov) {
    fov = isNaN(fov) ? this.fov : parseFloat(fov)

    // clamp between 1 and 179
    fov = Math.max(1, Math.min(fov, 179))

    if (fov !== this.fov) {
      this.fov = fov
      this.setPosition()

      this.shouldUpdate = true
    }

    this.setScreenRatios()
    this.setCSSPerspective()
  }

  /***
   Sets the camera near plane value
   Update the camera projection matrix only if the near plane actually changed

   params:
   @near (float, optional): near plane value to use
   ***/
  setNear(near) {
    near = isNaN(near) ? this.near : parseFloat(near)
    near = Math.max(near, 0.01)

    if (near !== this.near) {
      this.near = near
      this.shouldUpdate = true
    }
  }

  /***
   Sets the camera far plane value
   Update the camera projection matrix only if the far plane actually changed

   params:
   @far (float, optional): far plane value to use
   ***/
  setFar(far) {
    far = isNaN(far) ? this.far : parseFloat(far)
    far = Math.max(far, 50)

    if (far !== this.far) {
      this.far = far
      this.shouldUpdate = true
    }
  }

  /***
   Sets the camera pixel ratio value
   Update the camera projection matrix only if the pixel ratio actually changed

   params:
   @pixelRatio (float, optional): pixelRatio value to use
   ***/
  setPixelRatio(pixelRatio) {
    if (pixelRatio !== this.pixelRatio) {
      this.shouldUpdate = true
    }

    this.pixelRatio = pixelRatio
  }

  /***
   Sets the camera width and height
   Update the camera projection matrix only if the width or height actually changed

   params:
   @width (float, optional): width value to use
   @height (float, optional): height value to use
   ***/
  setSize(width, height) {
    if (width !== this.width || height !== this.height) {
      this.shouldUpdate = true
    }

    this.width = width
    this.height = height

    this.setScreenRatios()
    this.setCSSPerspective()
  }

  /***
   Sets the camera perspective
   Update the camera projection matrix if our shouldUpdate flag is true

   params:
   @fov (float, optional): field of view to use
   @near (float, optional): near plane value to use
   @far (float, optional): far plane value to use
   @width (float, optional): width value to use
   @height (float, optional): height value to use
   @pixelRatio (float, optional): pixelRatio value to use
   ***/
  setPerspective(fov, near, far, width, height, pixelRatio) {
    this.setPixelRatio(pixelRatio)
    this.setSize(width, height)
    this.setFov(fov)
    this.setNear(near)
    this.setFar(far)

    this.onBeforePerspectiveUpdate()

    if (this.shouldUpdate) {
      this.updateProjectionMatrix()
    }
  }

  /***
   Sets the camera position based on its fov
   Used by the Plane class objects to scale the planes with the right amount
   ***/
  setPosition(position = this.position) {
    this.position.copy(position)

    this.applyPosition()
  }

  applyPosition() {
    // update matrices
    // prettier-ignore
    this.modelMatrix.setFromArray([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      this.position.x, this.position.y, this.position.z, 1,
    ])

    this.viewMatrix = this.viewMatrix.copy(this.modelMatrix).getInverse()

    this.setScreenRatios()
    this.onPositionChanged()
  }

  /***
   Sets a CSSPerspective property based on width, height, pixelRatio and fov
   Used to translate planes along the Z axis using pixel units as CSS would do
   Taken from: https://stackoverflow.com/questions/22421439/convert-field-of-view-value-to-css3d-perspective-value
   ***/
  setCSSPerspective() {
    this.CSSPerspective =
      Math.pow(
        Math.pow(this.width / (2 * this.pixelRatio), 2) + Math.pow(this.height / (2 * this.pixelRatio), 2),
        0.5
      ) / Math.tan((this.fov * 0.5 * Math.PI) / 180)
  }

  /***
   Sets visible width / height at a given z-depth from our camera parameters

   Taken from: https://discourse.threejs.org/t/functions-to-calculate-the-visible-width-height-at-a-given-z-depth-from-a-perspective-camera/269
   ***/
  setScreenRatios(depth = 0) {
    // compensate for cameras not positioned at z=0
    const cameraOffset = this.position.z
    if (depth < cameraOffset) {
      depth -= cameraOffset
    } else {
      depth += cameraOffset
    }

    // vertical fov in radians
    const vFOV = (this.fov * Math.PI) / 180

    // Math.abs to ensure the result is always positive
    const height = 2 * Math.tan(vFOV / 2) * Math.abs(depth)

    this.screenRatio = {
      width: (height * this.width) / this.height,
      height,
    }
  }

  /***
   Updates the camera projection matrix
   ***/
  updateProjectionMatrix() {
    const aspect = this.width / this.height

    const top = this.near * Math.tan((Math.PI / 180) * 0.5 * this.fov)
    const height = 2 * top
    const width = aspect * height
    const left = -0.5 * width

    const right = left + width
    const bottom = top - height

    const x = (2 * this.near) / (right - left)
    const y = (2 * this.near) / (top - bottom)

    const a = (right + left) / (right - left)
    const b = (top + bottom) / (top - bottom)
    const c = -(this.far + this.near) / (this.far - this.near)
    const d = (-2 * this.far * this.near) / (this.far - this.near)

    this.projectionMatrix.setFromArray([x, 0, 0, 0, 0, y, 0, 0, a, b, c, -1, 0, 0, d, 0])
  }

  /***
   Force the projection matrix to update (used in Plane class objects context restoration)
   ***/
  forceUpdate() {
    this.shouldUpdate = true
  }

  /***
   Cancel the projection matrix update (used in Plane class objects after the projection matrix has been updated)
   ***/
  cancelUpdate() {
    this.shouldUpdate = false
  }
}
