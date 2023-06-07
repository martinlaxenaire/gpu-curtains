import { GPURenderer, GPURendererProps } from './GPURenderer'
import { Camera } from '../camera/Camera'
import { Vec3 } from '../../math/Vec3'
import { DOMElementBoundingRect } from '../DOMElement'
import { BindGroup } from '../bindGroups/BindGroup'
import { BindGroupBufferBindings } from '../bindGroupBindings/BindGroupBufferBindings'

interface GPUCameraRendererProps extends GPURendererProps {
  camera: Camera
}

export class GPUCameraRenderer extends GPURenderer {
  camera: Camera
  cameraUniformBinding: BindGroupBufferBindings
  cameraBindGroup: BindGroup

  constructor({ container, pixelRatio, renderingScale, camera }: GPUCameraRendererProps)

  setCamera(camera: Camera)
  onCameraPositionChanged()
  setCameraUniformBinding()
  setCameraBindGroup()

  updateCameraMatrixStack()

  setPerspective(fov?: number, near?: number, far?: number)
  setCameraPosition(position?: Vec3)

  resize(boundingRect: DOMElementBoundingRect | null)
  onResize()

  render()
}
