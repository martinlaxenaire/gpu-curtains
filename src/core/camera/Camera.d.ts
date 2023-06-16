import { Vec3 } from '../../math/Vec3'
import { Mat4 } from '../../math/Mat4'

interface CameraBasePerspectiveOptions {
  fov?: number
  near?: number
  far?: number
}

interface CameraPerspectiveOptions extends CameraBasePerspectiveOptions {
  width?: number
  height?: number
  pixelRatio?: number
}

interface CameraParams extends CameraPerspectiveOptions {
  onPerspectiveChanged?: () => void
  onPositionChanged?: () => void
}

export class Camera {
  position: Vec3
  projectionMatrix: Mat4
  modelMatrix: Mat4
  viewMatrix: Mat4

  onPerspectiveChanged: () => void
  onPositionChanged: () => void

  CSSPerspective: number
  screenRatio: {
    width: number
    height: number
  }

  shouldUpdate: boolean

  constructor({ fov, near, far, width, height, pixelRatio, onPerspectiveChanged, onPositionChanged }: CameraParams)

  setFov(fov?: number)
  setNear(near?: number)
  setFar(far?: number)
  setPixelRatio(pixelRatio?: number)
  setSize(width: number, height: number)
  setPerspective(fov?: number, near?: number, far?: number, width?: number, height?: number, pixelRatio?: number)
  setPosition(position?: Vec3)
  applyPosition()
  setCSSPerspective()
  setScreenRatios(depth?: number)
  updateProjectionMatrix()
  forceUpdate()
  cancelUpdate()
}
