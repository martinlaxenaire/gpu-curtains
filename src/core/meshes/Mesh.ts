import { CameraRenderer, isCameraRenderer } from '../../utils/renderer-utils'
import { ProjectedObject3D } from '../objects3D/ProjectedObject3D'
import MeshTransformedMixin from './MeshTransformedMixin'
import MeshBaseMixin from './MeshBaseMixin'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { MeshBaseParams } from '../../types/core/meshes/MeshBaseMixin'

export class Mesh extends MeshTransformedMixin(MeshBaseMixin(ProjectedObject3D)) {
  constructor(renderer: CameraRenderer | GPUCurtains, parameters = {} as MeshBaseParams) {
    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as CameraRenderer)

    isCameraRenderer(renderer, parameters.label ? parameters.label + ' Mesh' : 'Mesh')

    // @ts-ignore
    super({ renderer, element: null, parameters })

    this.type = 'Mesh'
  }
}
