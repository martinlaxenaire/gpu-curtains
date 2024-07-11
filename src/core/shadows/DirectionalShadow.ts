import { Shadow, ShadowBaseParams } from './Shadow'
import { CameraRenderer } from '../renderers/utils'
import { Vec2 } from '../../math/Vec2'
import { Mat4 } from '../../math/Mat4'
import { Vec3 } from '../../math/Vec3'
import { Input } from '../../types/BindGroups'

export interface DirectionalShadowParams extends ShadowBaseParams {
  camera?: {
    left: number
    right: number
    bottom: number
    top: number
    near: number
    far: number
  }
}

export const directionalShadowStruct: Record<string, Input> = {
  isActive: {
    type: 'i32',
    value: 0,
  },
  bias: {
    type: 'f32',
    value: 0,
  },
  normalBias: {
    type: 'f32',
    value: 0,
  },
  intensity: {
    type: 'f32',
    value: 0,
  },
  viewMatrix: {
    type: 'mat4x4f',
    value: new Float32Array(16),
  },
  projectionMatrix: {
    type: 'mat4x4f',
    value: new Float32Array(16),
  },
}

export class DirectionalShadow extends Shadow {
  viewMatrix: Mat4
  projectionMatrix: Mat4
  up: Vec3

  constructor(
    renderer: CameraRenderer,
    {
      light,
      intensity = 1,
      bias = 0,
      normalBias = 0,
      depthTextureSize = new Vec2(512),
      depthTextureFormat = 'depth24plus',
      camera = {
        left: -10,
        right: 10,
        bottom: -10,
        top: 10,
        near: 0.1,
        far: 50,
      },
    } = {} as DirectionalShadowParams
  ) {
    super(renderer, { light, intensity, bias, normalBias, depthTextureSize, depthTextureFormat })

    this.rendererBinding = this.renderer.bindings.directionalShadows

    this.viewMatrix = new Mat4()

    // TODO change values
    this.projectionMatrix = new Mat4().makeOrthographic(camera)

    this.up = new Vec3(0, 1, 0)
  }

  init() {
    super.init()
    this.updateShadowProperty('projectionMatrix', this.projectionMatrix)
  }

  updateViewMatrix(position = new Vec3(), target = new Vec3()) {
    if (this.isActive) {
      this.viewMatrix.makeView(position, target, this.up)
      this.updateShadowProperty('viewMatrix', this.viewMatrix)
    }
  }
}
