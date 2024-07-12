import { Shadow, ShadowBaseParams, shadowStruct } from './Shadow'
import { CameraRenderer } from '../renderers/utils'
import { Mat4, OrthographicProjectionParams } from '../../math/Mat4'
import { Vec3 } from '../../math/Vec3'
import { Input } from '../../types/BindGroups'
import { DirectionalLight } from '../lights/DirectionalLight'

/** Defines the orthographic shadow camera. */
export interface OrthographicShadowCamera extends OrthographicProjectionParams {
  /** @ignore */
  _left: number
  /** @ignore */
  _right: number
  /** @ignore */
  _bottom: number
  /** @ignore */
  _top: number
  /** @ignore */
  _near: number
  /** @ignore */
  _far: number
  /** Orthographic camera projection {@link Mat4}. */
  projectionMatrix: Mat4
  /** Orthographic camera view {@link Mat4}. */
  viewMatrix: Mat4
  /** Up {@link Vec3} used to compute the view {@link Mat4}. */
  up: Vec3
}

/**
 * Base parameters used to create a {@link DirectionalShadow}.
 */
export interface DirectionalShadowParams extends ShadowBaseParams {
  /** {@link DirectionalLight} used to create the {@link DirectionalShadow}. */
  light: DirectionalLight
  /** {@link OrthographicProjectionParams | Orthographic projection parameters} to use. */
  camera?: OrthographicProjectionParams
}

/** @ignore */
export const directionalShadowStruct: Record<string, Input> = {
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
 * Create a shadow map from a {@link DirectionalLight} by rendering to a depth texture using a view {@link Mat4} based on the {@link DirectionalLight} position and target and an {@link OrthographicShadowCamera | orthographic shadow camera} {@link Mat4}.
 */
export class DirectionalShadow extends Shadow {
  /** {@link DirectionalLight} associated with this {@link DirectionalShadow}. */
  light: DirectionalLight

  /** {@link OrthographicShadowCamera | Orthographic shadow camera} to use for shadow calculations. */
  camera: OrthographicShadowCamera

  /** Options used to create this {@link DirectionalShadow}. */
  options: DirectionalShadowParams

  /**
   * DirectionalShadow constructor
   * @param renderer - {@link CameraRenderer} used to create this {@link DirectionalShadow}.
   * @param parameters - {@link DirectionalShadowParams | parameters} used to create this {@link DirectionalShadow}.
   */
  constructor(
    renderer: CameraRenderer,
    {
      light,
      intensity,
      bias,
      normalBias,
      pcfSamples,
      depthTextureSize,
      depthTextureFormat,
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
    super(renderer, { light, intensity, bias, normalBias, pcfSamples, depthTextureSize, depthTextureFormat })

    this.options = {
      ...this.options,
      camera,
    }

    this.setRendererBinding()

    this.camera = {
      projectionMatrix: new Mat4(),
      viewMatrix: new Mat4(),
      up: new Vec3(0, 1, 0),
      _left: camera.left,
      _right: camera.right,
      _bottom: camera.bottom,
      _top: camera.top,
      _near: camera.near,
      _far: camera.far,
    }

    // camera props getters and setters
    const _self = this
    const cameraProps = ['left', 'right', 'bottom', 'top', 'near', 'far'] as Array<keyof OrthographicProjectionParams>

    cameraProps.forEach((prop) => {
      Object.defineProperty(_self.camera, prop, {
        get() {
          return _self.camera['_' + prop]
        },
        set(v) {
          _self.camera['_' + prop] = v
          _self.updateProjectionMatrix()
        },
      })
    })
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
    { intensity, bias, normalBias, pcfSamples, depthTextureSize, depthTextureFormat, camera } = {} as Omit<
      DirectionalShadowParams,
      'light'
    >
  ) {
    super.cast({ intensity, bias, normalBias, pcfSamples, depthTextureSize, depthTextureFormat })

    if (camera) {
      this.camera.left = camera.left ?? -10
      this.camera.right = camera.right ?? 10
      this.camera.bottom = camera.bottom ?? -10
      this.camera.top = camera.right ?? 10
      this.camera.near = camera.near ?? 0.1
      this.camera.far = camera.far ?? 50
    }
  }

  /**
   * Set the {@link depthComparisonSampler}, {@link depthTexture}, {@link depthPassTarget}, compute the {@link DirectionalShadow#camera.projectionMatrix | camera projection matrix} and start rendering to the shadow map.
   */
  init() {
    super.init()
    this.updateProjectionMatrix()
  }

  /**
   * Resend all properties to the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}. Called when the maximum number of corresponding {@link DirectionalLight} has been overflowed.
   */
  reset() {
    this.setRendererBinding()
    super.reset()
    this.onPropertyChanged('projectionMatrix', this.camera.projectionMatrix)
    this.onPropertyChanged('viewMatrix', this.camera.viewMatrix)
  }

  /**
   * Update the {@link DirectionalShadow#camera.projectionMatrix | camera orthographic projection matrix} and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
   */
  updateProjectionMatrix() {
    this.camera.projectionMatrix.identity().makeOrthographic({
      left: this.camera.left,
      right: this.camera.right,
      bottom: this.camera.bottom,
      top: this.camera.top,
      near: this.camera.near,
      far: this.camera.far,
    })

    this.onPropertyChanged('projectionMatrix', this.camera.projectionMatrix)
  }

  /**
   * Update the {@link DirectionalShadow#camera.viewMatrix | camera view matrix} and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
   * @param position - {@link Vec3} to use as position for the {@link DirectionalShadow#camera.viewMatrix | camera view matrix}, based on the {@link light} position.
   * @param target - {@link Vec3} to use as target for the {@link DirectionalShadow#camera.viewMatrix | camera view matrix}, based on the {@link light} target.
   */
  updateViewMatrix(position = new Vec3(), target = new Vec3()) {
    if (this.isActive) {
      this.camera.viewMatrix.makeView(position, target, this.camera.up)
      this.onPropertyChanged('viewMatrix', this.camera.viewMatrix)
    }
  }
}
