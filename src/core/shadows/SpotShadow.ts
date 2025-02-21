import { Shadow, ShadowBaseParams, shadowStruct } from './Shadow'
import { CameraRenderer } from '../renderers/utils'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { Vec2 } from '../../math/Vec2'
import { Input } from '../../types/BindGroups'
import { PerspectiveCamera } from '../cameras/PerspectiveCamera'
import { SpotLight } from '../lights/SpotLight'
import { VertexShaderInputBaseParams } from '../shaders/full/vertex/get-vertex-shader-code'
import { ShaderOptions } from '../../types/Materials'
import { Texture } from '../textures/Texture'
import { getDefaultSpotShadowDepthVs } from '../shaders/full/vertex/get-default-spot-shadow-depth-vertex-shader-code'

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

/**
 * Create a shadow map from a {@link SpotLight} by rendering to a depth texture using a {@link PerspectiveCamera}.
 */
// TODO there's a known issue where the shadow flickers when updating the light target
// we should try to fix that one day...
export class SpotShadow extends Shadow {
  /** {@link SpotLight} associated with this {@link SpotShadow}. */
  light: SpotLight
  /** Options used to create this {@link SpotShadow}. */
  options: SpotShadowParams
  /** Shadow {@link PerspectiveCamera} used for shadow calculations. */
  camera: PerspectiveCamera
  /** Focus of the {@link camera}. Default to `1`. */
  focus: number

  /**
   * SpotShadow constructor
   * @param renderer - {@link CameraRenderer} or {@link GPUCurtains} used to create this {@link SpotShadow}.
   * @param parameters - {@link SpotShadowParams} used to create this {@link SpotShadow}.
   */
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

    this.camera = new PerspectiveCamera({
      near: 0.1,
      far: this.light.range !== 0 ? this.light.range : 150,
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
   * Set the {@link PerspectiveCamera#fov | camera fov} based on the {@link SpotLight#angle | SpotLight angle}.
   */
  setCameraFov() {
    this.camera.fov = (180 / Math.PI) * 2 * this.light.angle * this.focus
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
