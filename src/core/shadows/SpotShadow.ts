import { Shadow, ShadowBaseParams, shadowStruct } from './Shadow'
import { CameraRenderer } from '../renderers/utils'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { Vec2 } from '../../math/Vec2'
import { Input } from '../../types/BindGroups'
import { Camera } from '../camera/Camera'
import { SpotLight } from '../lights/SpotLight'
import { VertexShaderInputBaseParams } from '../shaders/full/vertex/get-vertex-shader-code'
import { ShaderOptions } from '../../types/Materials'
import { getDefaultSpotShadowDepthVs } from '../shaders/full/vertex/get-default-spot-shadow-depth-vertex-shader-code'
import { Vec3 } from '../../math/Vec3'
import { Texture } from '../textures/Texture'

/**
 * Base parameters used to create a {@link SpotShadow}.
 */
export interface SpotShadowParams extends ShadowBaseParams {
  /** {@link SpotLight} used to create the {@link SpotShadow}. */
  light: SpotLight
}

/** @ignore */
export const spotShadowStruct: Record<string, Input> = {
  ...shadowStruct,
  viewMatrix: {
    type: 'mat4x4f',
    value: new Float32Array(16),
  },
  projectionMatrix: {
    type: 'mat4x4f',
    value: new Float32Array(16),
  },
}

export class SpotShadow extends Shadow {
  /** {@link SpotLight} associated with this {@link SpotShadow}. */
  light: SpotLight
  /** Options used to create this {@link SpotShadow}. */
  options: SpotShadowParams
  /** Shadow {@link Camera} used for shadow calculations. */
  camera: Camera
  /** Focus of the {@link camera}. Default to `1`. */
  focus: number

  constructor(
    renderer: CameraRenderer | GPUCurtains,
    {
      light,
      intensity = 1,
      bias = 0,
      normalBias = 0,
      pcfSamples = 1,
      depthTextureSize = new Vec2(512),
      depthTextureFormat = 'depth24plus' as GPUTextureFormat,
      autoRender = true,
    } = {} as SpotShadowParams
  ) {
    super(renderer, {
      light,
      intensity,
      bias,
      normalBias,
      pcfSamples,
      depthTextureSize,
      depthTextureFormat,
      autoRender,
    })

    // arbitrary
    this.focus = 1

    this.camera = new Camera({
      near: 0.1,
      far: this.light.range !== 0 ? this.light.range : 500,
      fov: (180 / Math.PI) * 2 * this.light.angle * this.focus,
      width: this.options.depthTextureSize.x,
      height: this.options.depthTextureSize.y,
      onMatricesChanged: () => {
        this.onPropertyChanged('projectionMatrix', this.camera.projectionMatrix)
        this.onPropertyChanged('viewMatrix', this.camera.viewMatrix)
      },
    })

    // force camera position to 0
    this.camera.position.set(0)
    this.camera.parent = this.light
  }

  /**
   * Set or reset this {@link SpotShadow} {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
   */
  setRendererBinding() {
    this.rendererBinding = this.renderer.bindings.spotShadows
  }

  /**
   * Resend all properties to the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}. Called when the maximum number of corresponding {@link SpotLight} has been overflowed or when the {@link renderer} has changed.
   */
  reset() {
    this.setRendererBinding()
    super.reset()

    this.onPropertyChanged('projectionMatrix', this.camera.projectionMatrix)
    this.onPropertyChanged('viewMatrix', this.camera.viewMatrix)
  }

  /**
   * Set the {@link Camera#fov | camera fov} based on the {@link SpotLight#angle | SpotLight angle}.
   */
  setCameraFov() {
    this.camera.fov = (180 / Math.PI) * 2 * this.light.angle * this.focus
  }

  /**
   * Update the {@link camera} target based on the {@link light} position.
   * @param position - {@link Vec3} to use as position for the {@link camera} look at calculations, based on the {@link light} position.
   */
  updateLookAt(position = new Vec3()) {
    if (position.x === 0 && position.z === 0) {
      this.camera.up.set(0, 0, 1)
    } else {
      this.camera.up.set(0, 1, 0)
    }

    this.camera.lookAt(this.light.target, position)
  }

  /**
   * Reset the {@link depthTexture} when the {@link depthTextureSize} changes and update camera ratio.
   */
  onDepthTextureSizeChanged() {
    super.setDepthTexture()
    this.camera.setSize({
      width: this.depthTextureSize.x,
      height: this.depthTextureSize.y,
    })
  }

  /**
   * Create the {@link depthTexture}.
   */
  createDepthTexture() {
    this.depthTexture = new Texture(this.renderer, {
      label: `${this.light.options.label} (index: ${this.light.index}) shadow depth texture`,
      name: 'spotShadowDepthTexture' + this.index,
      type: 'depth',
      format: this.depthTextureFormat,
      sampleCount: this.sampleCount,
      fixedSize: {
        width: this.depthTextureSize.x,
        height: this.depthTextureSize.y,
      },
      autoDestroy: false, // do not destroy when removing a mesh
    })
  }

  /**
   * Get the default depth pass vertex shader for this {@link SpotShadow}.
   * parameters - {@link VertexShaderInputBaseParams} used to compute the output `worldPosition` and `normal` vectors.
   * @returns - Depth pass vertex shader.
   */
  getDefaultShadowDepthVs({ bindings = [], geometry }: VertexShaderInputBaseParams): ShaderOptions {
    return {
      /** Returned code. */
      code: getDefaultSpotShadowDepthVs(this.index, { bindings, geometry }),
    }
  }
}
