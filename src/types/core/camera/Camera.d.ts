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
