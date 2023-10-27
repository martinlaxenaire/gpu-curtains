import { Vec3 } from '../../math/Vec3'
import { Mat4 } from '../../math/Mat4'

export interface CameraBasePerspectiveOptions {
  fov?: number
  near?: number
  far?: number
}

export interface CameraPerspectiveOptions extends CameraBasePerspectiveOptions {
  width?: number
  height?: number
  pixelRatio?: number
}

export interface CameraParams extends CameraPerspectiveOptions {
  onPerspectiveChanged?: () => void
  onPositionChanged?: () => void
}

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

 @returns {Camera}: our Camera element
 ***/
export class Camera {
  position: Vec3
  projectionMatrix: Mat4
  modelMatrix: Mat4
  viewMatrix: Mat4

  fov: number
  near: number
  far: number

  width: number
  height: number
  pixelRatio: number

  onPerspectiveChanged: () => void
  onPositionChanged: () => void

  CSSPerspective: number
  screenRatio: {
    width: number
    height: number
  }

  shouldUpdate: boolean

  constructor(
    {
      fov = 50,
      near = 0.01,
      far = 50,
      width = 1,
      height = 1,
      pixelRatio = 1,
      onPerspectiveChanged = () => {
        /* allow empty callback */
      },
      onPositionChanged = () => {
        /* allow empty callback */
      },
    } = {} as CameraParams
  ) {
    // camera can't be at position (0, 0, 0), it needs some recoil
    // arbitrarily set to 1
    this.position = new Vec3(0, 0, 1).onChange(() => this.applyPosition())
    this.projectionMatrix = new Mat4()

    this.modelMatrix = new Mat4()
    this.viewMatrix = new Mat4()

    this.onPerspectiveChanged = onPerspectiveChanged
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
  setFov(fov: number = this.fov) {
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
  setNear(near: number = this.near) {
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
  setFar(far: number = this.far) {
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
  setPixelRatio(pixelRatio: number = this.pixelRatio) {
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
  setSize(width: number, height: number) {
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
  setPerspective(
    fov: number = this.fov,
    near: number = this.near,
    far: number = this.far,
    width: number = this.width,
    height: number = this.height,
    pixelRatio: number = this.pixelRatio
  ) {
    this.setPixelRatio(pixelRatio)
    this.setSize(width, height)
    this.setFov(fov)
    this.setNear(near)
    this.setFar(far)

    if (this.shouldUpdate) {
      this.updateProjectionMatrix()
      this.onPerspectiveChanged()
    }
  }

  /***
   Sets the camera position based on its fov
   Used by the Plane class objects to scale the planes with the right amount
   ***/
  setPosition(position: Vec3 = this.position) {
    this.position.copy(position)

    this.applyPosition()
  }

  applyPosition() {
    // update matrices
    // prettier-ignore
    this.modelMatrix.set(
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      this.position.x, this.position.y, this.position.z, 1,
    )

    this.viewMatrix = this.modelMatrix.clone().getInverse()

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

    // prettier-ignore
    this.projectionMatrix.set(
      x, 0, 0, 0,
      0, y, 0, 0,
      a, b, c, -1,
      0, 0, d, 0
    )
  }
}
