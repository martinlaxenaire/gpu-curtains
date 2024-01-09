import { CameraRenderer, isCameraRenderer } from '../renderers/utils'
import { ProjectedObject3D } from '../objects3D/ProjectedObject3D'
import MeshTransformedMixin from './MeshTransformedMixin'
import { MeshBaseParams } from './MeshBaseMixin'
import { GPUCurtains } from '../../curtains/GPUCurtains'

/**
 * Create a Mesh, with model and projection matrices.
 * TODO!
 * @extends MeshTransformedMixin
 * @mixes {MeshBaseMixin}
 *
 * @example
 * ```javascript
 * // set our main GPUCurtains instance
 * const gpuCurtains = new GPUCurtains({
 *   container: '#canvas' // selector of our WebGPU canvas container
 * })
 *
 * // set the GPU device
 * // note this is asynchronous
 * await gpuCurtains.setDevice()
 *
 * // create a mesh with a box geometry
 * const mesh = new Mesh(gpuCurtains, {
 *   geometry: new BoxGeometry(),
 * })
 * ```
 */
export class Mesh extends MeshTransformedMixin(ProjectedObject3D) {
  constructor(renderer: CameraRenderer | GPUCurtains, parameters = {} as MeshBaseParams) {
    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as CameraRenderer)

    isCameraRenderer(renderer, parameters.label ? parameters.label + ' Mesh' : 'Mesh')

    // @ts-ignore
    super(renderer, null, parameters)

    this.type = 'Mesh'
  }
}
