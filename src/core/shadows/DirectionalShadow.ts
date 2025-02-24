import { Shadow, ShadowBaseParams, shadowStruct } from './Shadow'
import { CameraRenderer } from '../renderers/utils'
import { OrthographicCamera, OrthographicCameraBaseOptions } from '../cameras/OrthographicCamera'
import { Mat4 } from '../../math/Mat4'
import { Vec3 } from '../../math/Vec3'
import { Input } from '../../types/BindGroups'
import { DirectionalLight } from '../lights/DirectionalLight'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { Texture } from '../textures/Texture'
import { VertexShaderInputBaseParams } from '../shaders/full/vertex/get-vertex-shader-code'
import { ShaderOptions } from '../../types/Materials'
import { getDefaultDirectionalShadowDepthVs } from '../shaders/full/vertex/get-default-directional-shadow-depth-vertex-shader-code'

/**
 * Base parameters used to create a {@link DirectionalShadow}.
 */
export interface DirectionalShadowParams extends ShadowBaseParams {
  /** {@link DirectionalLight} used to create the {@link DirectionalShadow}. */
  light: DirectionalLight
  /** {@link OrthographicCameraBaseOptions | Orthographic projection parameters} to use. */
  camera?: OrthographicCameraBaseOptions
}

/** @ignore */
export const directionalShadowStruct: Record<string, Input> = {
  ...shadowStruct,
  direction: {
    type: 'vec3f',
    value: new Vec3(),
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

/**
 * Create a shadow map from a {@link DirectionalLight}  by rendering to a depth texture using a {@link OrthographicCamera}.
 */
export class DirectionalShadow extends Shadow {
  /** {@link DirectionalLight} associated with this {@link DirectionalShadow}. */
  light: DirectionalLight

  /** Shadow {@link OrthographicCamera} to use for shadow calculations. */
  camera: OrthographicCamera

  /** Options used to create this {@link DirectionalShadow}. */
  options: DirectionalShadowParams

  /**
   * Direction of the parent {@link DirectionalLight}. Duplicate to avoid adding the {@link DirectionalLight} binding to vertex shaders.
   * @private
   */
  #direction: Vec3

  /**
   * DirectionalShadow constructor
   * @param renderer - {@link CameraRenderer} or {@link GPUCurtains} used to create this {@link DirectionalShadow}.
   * @param parameters - {@link DirectionalShadowParams} used to create this {@link DirectionalShadow}.
   */
  constructor(
    renderer: CameraRenderer | GPUCurtains,
    {
      light,
      intensity,
      bias,
      normalBias,
      pcfSamples,
      depthTextureSize,
      depthTextureFormat,
      autoRender,
      camera = {
        left: -10,
        right: 10,
        bottom: -10,
        top: 10,
        near: 0.1,
        far: 150,
      },
    } = {} as DirectionalShadowParams
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

    this.options = {
      ...this.options,
      camera,
    }

    this.camera = new OrthographicCamera({
      left: camera.left,
      right: camera.right,
      top: camera.top,
      bottom: camera.bottom,
      near: camera.near,
      far: camera.far,
      onMatricesChanged: () => {
        this.onPropertyChanged('projectionMatrix', this.camera.projectionMatrix)
        this.onPropertyChanged('viewMatrix', this.camera.viewMatrix)
      },
    })

    // force camera position to 0
    this.camera.position.set(0)
    this.camera.parent = this.light

    this.#direction = new Vec3()
  }

  /**
   * Set or reset this {@link DirectionalShadow} {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
   */
  setRendererBinding() {
    this.rendererBinding = this.renderer.bindings.directionalShadows
  }

  /**
   * Set the parameters and start casting shadows by setting the {@link isActive} setter to `true`.<br>
   * Called internally by the associated {@link DirectionalLight} if any shadow parameters are specified when creating it. Can also be called directly.
   * @param parameters - parameters to use for this {@link DirectionalShadow}.
   */
  cast(
    { intensity, bias, normalBias, pcfSamples, depthTextureSize, depthTextureFormat, autoRender, camera } = {} as Omit<
      DirectionalShadowParams,
      'light'
    >
  ) {
    if (camera) {
      this.camera.left = camera.left ?? -10
      this.camera.right = camera.right ?? 10
      this.camera.top = camera.top ?? 10
      this.camera.bottom = camera.bottom ?? -10
      this.camera.near = camera.near ?? 0.1
      this.camera.far = camera.far ?? 150
    }

    super.cast({ intensity, bias, normalBias, pcfSamples, depthTextureSize, depthTextureFormat, autoRender })
  }

  /**
   * Resend all properties to the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}. Called when the maximum number of corresponding {@link DirectionalLight} has been overflowed or when the {@link renderer} has changed.
   */
  reset() {
    this.setRendererBinding()
    super.reset()

    this.onPropertyChanged('projectionMatrix', this.camera.projectionMatrix)
    this.onPropertyChanged('viewMatrix', this.camera.viewMatrix)
    this.onPropertyChanged('direction', this.#direction)
  }

  /**
   * Copy the {@link DirectionalLight} direction and update binding.
   * @param direction - {@link DirectionalLight} direction to copy.
   */
  setDirection(direction = new Vec3()) {
    this.#direction.copy(direction)
    this.onPropertyChanged('direction', this.#direction)
  }

  /**
   * Create the {@link depthTexture}.
   */
  createDepthTexture() {
    this.depthTexture = new Texture(this.renderer, {
      label: `${this.light.options.label} (index: ${this.index}) shadow depth texture`,
      name: 'directionalShadowDepthTexture' + this.index,
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
   * Get the default depth pass vertex shader for this {@link Shadow}.
   * parameters - {@link VertexShaderInputBaseParams} used to compute the output `worldPosition` and `normal` vectors.
   * @returns - Depth pass vertex shader.
   */
  getDefaultShadowDepthVs({ bindings = [], geometry }: VertexShaderInputBaseParams): ShaderOptions {
    return {
      /** Returned code. */
      code: getDefaultDirectionalShadowDepthVs(this.index, { bindings, geometry }),
    }
  }
}
