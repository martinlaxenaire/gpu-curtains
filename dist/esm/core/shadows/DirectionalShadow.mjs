import { shadowStruct, Shadow } from './Shadow.mjs';
import { Mat4 } from '../../math/Mat4.mjs';
import { Vec3 } from '../../math/Vec3.mjs';
import { Texture } from '../textures/Texture.mjs';
import { getDefaultDirectionalShadowDepthVs } from '../shaders/full/vertex/get-default-directional-shadow-depth-vertex-shader-code.mjs';

const directionalShadowStruct = {
  ...shadowStruct,
  viewMatrix: {
    type: "mat4x4f",
    value: new Float32Array(16)
  },
  projectionMatrix: {
    type: "mat4x4f",
    value: new Float32Array(16)
  }
};
class DirectionalShadow extends Shadow {
  /**
   * DirectionalShadow constructor
   * @param renderer - {@link CameraRenderer} used to create this {@link DirectionalShadow}.
   * @param parameters - {@link DirectionalShadowParams | parameters} used to create this {@link DirectionalShadow}.
   */
  constructor(renderer, {
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
      far: 50
    }
  } = {}) {
    super(renderer, {
      light,
      intensity,
      bias,
      normalBias,
      pcfSamples,
      depthTextureSize,
      depthTextureFormat,
      autoRender
    });
    this.options = {
      ...this.options,
      camera
    };
    this.camera = {
      projectionMatrix: new Mat4(),
      viewMatrix: new Mat4(),
      up: new Vec3(0, 1, 0),
      _left: camera.left,
      _right: camera.right,
      _bottom: camera.bottom,
      _top: camera.top,
      _near: camera.near,
      _far: camera.far
    };
    const _self = this;
    const cameraProps = ["left", "right", "bottom", "top", "near", "far"];
    cameraProps.forEach((prop) => {
      Object.defineProperty(_self.camera, prop, {
        get() {
          return _self.camera["_" + prop];
        },
        set(v) {
          _self.camera["_" + prop] = v;
          _self.updateProjectionMatrix();
        }
      });
    });
  }
  /**
   * Set or reset this {@link DirectionalShadow} {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
   */
  setRendererBinding() {
    this.rendererBinding = this.renderer.bindings.directionalShadows;
  }
  /**
   * Set the parameters and start casting shadows by setting the {@link isActive} setter to `true`.<br>
   * Called internally by the associated {@link DirectionalLight} if any shadow parameters are specified when creating it. Can also be called directly.
   * @param parameters - parameters to use for this {@link DirectionalShadow}.
   */
  cast({ intensity, bias, normalBias, pcfSamples, depthTextureSize, depthTextureFormat, autoRender, camera } = {}) {
    if (camera) {
      this.camera.left = camera.left ?? -10;
      this.camera.right = camera.right ?? 10;
      this.camera.bottom = camera.bottom ?? -10;
      this.camera.top = camera.right ?? 10;
      this.camera.near = camera.near ?? 0.1;
      this.camera.far = camera.far ?? 50;
    }
    super.cast({ intensity, bias, normalBias, pcfSamples, depthTextureSize, depthTextureFormat, autoRender });
  }
  /**
   * Set the {@link depthComparisonSampler}, {@link depthTexture}, {@link depthPassTarget}, compute the {@link DirectionalShadow#camera.projectionMatrix | camera projection matrix} and start rendering to the shadow map.
   */
  init() {
    super.init();
    this.updateProjectionMatrix();
  }
  /**
   * Resend all properties to the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}. Called when the maximum number of corresponding {@link DirectionalLight} has been overflowed or when the {@link renderer} has changed.
   */
  reset() {
    this.setRendererBinding();
    super.reset();
    if (this.isActive) {
      this.onPropertyChanged("projectionMatrix", this.camera.projectionMatrix);
      this.onPropertyChanged("viewMatrix", this.camera.viewMatrix);
    }
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
      far: this.camera.far
    });
    this.onPropertyChanged("projectionMatrix", this.camera.projectionMatrix);
  }
  /**
   * Update the {@link DirectionalShadow#camera.viewMatrix | camera view matrix} and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
   */
  updateViewMatrix() {
    if (this.light.actualPosition.x === 0 && this.light.actualPosition.y !== 0 && this.light.actualPosition.z === 0) {
      this.camera.up.set(0, 0, 1);
    } else if (this.light.actualPosition.x === 0 && this.light.actualPosition.y === 0 && this.light.actualPosition.z !== 0) {
      this.camera.up.set(1, 0, 0);
    } else {
      this.camera.up.set(0, 1, 0);
    }
    this.camera.viewMatrix.makeView(this.light.actualPosition, this.light.target, this.camera.up);
    this.onPropertyChanged("viewMatrix", this.camera.viewMatrix);
  }
  /**
   * Create the {@link depthTexture}.
   */
  createDepthTexture() {
    this.depthTexture = new Texture(this.renderer, {
      label: `${this.light.options.label} (index: ${this.index}) shadow depth texture`,
      name: "directionalShadowDepthTexture" + this.index,
      type: "depth",
      format: this.depthTextureFormat,
      sampleCount: this.sampleCount,
      fixedSize: {
        width: this.depthTextureSize.x,
        height: this.depthTextureSize.y
      },
      autoDestroy: false
      // do not destroy when removing a mesh
    });
  }
  /**
   * Get the default depth pass vertex shader for this {@link Shadow}.
   * parameters - {@link VertexShaderInputBaseParams} used to compute the output `worldPosition` and `normal` vectors.
   * @returns - Depth pass vertex shader.
   */
  getDefaultShadowDepthVs({ bindings = [], geometry }) {
    return {
      /** Returned code. */
      code: getDefaultDirectionalShadowDepthVs(this.index, { bindings, geometry })
    };
  }
}

export { DirectionalShadow, directionalShadowStruct };
