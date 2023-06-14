import MeshMixin, { MeshBase } from '../../core/meshes/MeshMixin'
import { DOMObject3D, DOMObject3DSize, DOMObject3DTransforms, RectBBox } from '../objects3D/DOMObject3D'
import { MeshBaseParams, MeshBindings, MeshParams } from '../../core/meshes/Mesh'
import { GPUCurtainsRenderer } from '../renderer/GPUCurtainsRenderer'
import { PlaneGeometry } from '../geometry/PlaneGeometry'
import { DOMElement, DOMElementBoundingRect } from '../../core/DOMElement'
import { Vec3 } from '../../math/Vec3'
import { Camera } from '../../core/camera/Camera'
import { Mat4 } from '../../math/Mat4'
import { ProjectedObject3DMatrices } from '../../core/objects3D/ProjectedObject3D'
import { Quat } from '../../math/Quat'
import { BindGroupBufferBindings } from '../../core/bindGroupBindings/BindGroupBufferBindings'
import { Material, MaterialParams } from '../../core/Material'
import { Texture, TextureBaseParams } from '../../core/Texture'

interface DOMMeshParams extends MeshBaseParams {
  geometry: PlaneGeometry
}

export class DOMMesh extends MeshMixin(DOMObject3D) implements DOMObject3D, MeshBase {
  type: string
  renderer: GPUCurtainsRenderer
  camera: Camera

  size: DOMObject3DSize
  domElement: DOMElement

  transforms: DOMObject3DTransforms
  matrices: ProjectedObject3DMatrices

  options: {
    label: MeshParams['label']
    shaders: MeshParams['shaders']
  }

  matrixUniformBinding: BindGroupBufferBindings
  uniformsBindings: BindGroupBufferBindings[]

  material: Material
  geometry: MeshParams['geometry']

  uniforms: Material['uniforms']

  textures: Texture[]

  visible: boolean

  // callbacks
  onRender: () => void

  constructor(renderer: GPUCurtainsRenderer, element: HTMLElement, parameters: DOMMeshParams)

  updateSizeAndPosition()

  updateSizePositionAndProjection()

  resize(boundingRect?: DOMElementBoundingRect)

  getBoundingRect(): DOMElementBoundingRect

  setTransforms()

  get rotation(): Vec3
  set rotation(value: Vec3)

  get quaternion(): Quat
  set quaternion(value: Quat)

  get position(): Vec3
  set position(value: Vec3)

  get scale(): Vec3
  set scale(value: Vec3)

  get documentPosition(): Vec3
  set documentPosition(value: Vec3)

  get transformOrigin(): Vec3
  set transformOrigin(value: Vec3)

  get worldTransformOrigin()
  set worldTransformOrigin(value: Vec3)

  applyRotation()
  applyPosition()
  applyScale()
  applyTransformOrigin()

  setMatrices()

  get modelMatrix()
  set modelMatrix(value: Mat4)

  shouldUpdateModelMatrix()
  updateModelMatrix()

  get modelViewMatrix()
  set modelViewMatrix(value: Mat4)

  get viewMatrix()

  get projectionMatrix()

  get modelViewProjectionMatrix()
  set modelViewProjectionMatrix(value: Mat4)

  updateProjectionMatrixStack()

  documentToWorldSpace(vector?: Vec3): Vec3

  setWorldSizes()
  setWorldTransformOrigin()

  updateScrollPosition(lastXDelta?: number, lastYDelta?: number)

  setMaterial(materialParameters: MaterialParams)

  createTexture(options: TextureBaseParams): Texture
  onTextureCreated(texture: Texture)

  setMatricesUniformGroup()
  setUniformBindings(bindings: MeshBindings)

  render()

  destroy()
}
