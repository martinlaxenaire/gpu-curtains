import { GPURendererParams } from './GPURenderer'
import { CameraBasePerspectiveOptions } from '../camera/Camera'

export interface GPUCameraRendererParams extends GPURendererParams {
  camera: CameraBasePerspectiveOptions
}
