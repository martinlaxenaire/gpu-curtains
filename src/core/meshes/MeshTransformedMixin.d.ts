import { CameraRenderer } from '../../types/renderer-utils'
import { BufferBindings } from '../bindings/BufferBindings'
import { Material, MaterialBaseParams, MaterialParams } from '../materials/Material'
import { Texture, TextureBaseParams } from '../textures/Texture'
import { DOMObject3D, RectCoords } from '../../curtains/objects3D/DOMObject3D'
import { ProjectedObject3D } from '../objects3D/ProjectedObject3D'
import { DOMFrustum } from '../frustum/DOMFrustum'
import { DOMElement, DOMElementBoundingRect } from '../DOMElement'
import { Vec2 } from '../../math/Vec2'
import { Vec3 } from '../../math/Vec3'
import { Mat4 } from '../../math/Mat4'
import { Geometry } from '../geometries/Geometry'
import { IndexedGeometry } from '../geometries/IndexedGeometry'
import MeshBaseMixin, {
  MeshBase,
  MeshBaseParams,
  MeshBindings,
  MeshMaterialParameters,
  MixinConstructor,
} from './MeshBaseMixin'

export interface TransformedMeshParams {
  frustumCulled?: boolean
  DOMFrustumMargins?: RectCoords
  // callbacks
  onReEnterView?: () => void
  onLeaveView?: () => void
}

interface TransformedMeshMaterialParameters extends MeshMaterialParameters {
  frustumCulled: boolean
  DOMFrustumMargins: RectCoords
}

declare const defaultMeshParams: TransformedMeshParams

export class MeshTransformedBase {
  matrixUniformBinding: BufferBindings

  domFrustum: DOMFrustum
  frustumCulled: boolean
  DOMFrustumMargins: RectCoords

  // callbacks
  onReEnterView: () => void
  onLeaveView: () => void

  constructor(renderer: CameraRenderer, element: HTMLElement | null, parameters: MeshBaseParams)

  setMeshMaterial(materialParameters: TransformedMeshMaterialParameters)

  setMatricesUniformGroup()

  applyScale()

  get projectedBoundingRect(): DOMElementBoundingRect

  updateModelMatrix()
  updateProjectionMatrixStack()

  //render(pass: GPURenderPassEncoder)

  remove()
  //destroy()
}

// https://stackoverflow.com/questions/65134811/es6-exporting-classes-with-typescript-mixins
// https://www.typescriptlang.org/docs/handbook/mixins.html

export default function MeshTransformedMixin<TBase extends MixinConstructor>(
  superclass: TBase
): new (...args: any[]) => InstanceType<TBase> & MeshBase & MeshTransformedBase
