import { GPURenderer, GPURendererParams } from './GPURenderer'
import { Camera } from '../camera/Camera'
import { Vec3 } from '../../math/Vec3'
import { BindGroup } from '../bindGroups/BindGroup'
import { BufferBindings } from '../bindings/BufferBindings'

export interface GPUCameraRendererParams extends GPURendererParams {
  camera: Camera
}

export class GPUCameraRenderer extends GPURenderer {
  camera: Camera
  cameraUniformBinding: BufferBindings
  cameraBindGroup: BindGroup

  constructor({
    container,
    pixelRatio,
    sampleCount,
    production,
    preferredFormat,
    onError,
    camera,
  }: GPUCameraRendererParams)

  setCamera(camera: Camera)
  onCameraPositionChanged()
  setCameraUniformBinding()
  setCameraBindGroup()

  updateCameraMatrixStack()

  setPerspective(fov?: number, near?: number, far?: number)
  setCameraPosition(position?: Vec3)

  onResize()

  render()

  destroy()
}
