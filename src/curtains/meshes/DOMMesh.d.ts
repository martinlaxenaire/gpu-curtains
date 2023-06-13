import MeshMixin from '../../core/meshes/MeshMixin'
import { DOMObject3D } from '../objects3D/DOMObject3D'
import { MeshBaseProps } from '../../core/meshes/Mesh'
import { GPUCurtainsRenderer } from '../renderer/GPUCurtainsRenderer'
import { PlaneGeometry } from '../geometry/PlaneGeometry'

interface DOMMeshProps extends MeshBaseProps {
  geometry: PlaneGeometry
}

export class DOMMesh extends MeshMixin(DOMObject3D) {
  constructor(
    renderer: GPUCurtainsRenderer,
    element: HTMLElement,
    { label, geometry, shaders, bindings, cullMode, onRender }: DOMMeshProps
  )
}
