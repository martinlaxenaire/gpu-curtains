import { GPURenderer, GPURendererParams } from './GPURenderer'
import { Camera } from '../camera/Camera'
import { Vec3 } from '../../math/Vec3'
import { DOMElementBoundingRect } from '../DOMElement'
import { BindGroup } from '../bindGroups/BindGroup'
import { BufferBindings } from '../bindings/BufferBindings'

interface GPUCameraRendererParams extends GPURendererParams {
  camera: Camera
}

export class GPUCameraRenderer extends GPURenderer {
  camera: Camera
  cameraUniformBinding: BufferBindings
  cameraBindGroup: BindGroup

  constructor({ container, pixelRatio, renderingScale, production, camera }: GPUCameraRendererParams)

  setCamera(camera: Camera)
  onCameraPositionChanged()
  setCameraUniformBinding()
  setCameraBindGroup()

  updateCameraMatrixStack()

  setPerspective(fov?: number, near?: number, far?: number)
  setCameraPosition(position?: Vec3)

  resize(boundingRect?: DOMElementBoundingRect | null)
  onResize()

  render()
}
