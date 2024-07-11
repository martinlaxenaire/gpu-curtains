import { GPURenderer, GPURendererParams, SceneObject } from './GPURenderer'
import type { ProjectedMesh, RenderedMesh } from './GPURenderer'
import { Camera, CameraBasePerspectiveOptions } from '../camera/Camera'
import { BufferBinding } from '../bindings/BufferBinding'
import { BindGroup } from '../bindGroups/BindGroup'
import { Vec3 } from '../../math/Vec3'
import { AllowedBindGroups, Input } from '../../types/BindGroups'
import { RectBBox } from '../DOM/DOMElement'
import { Light, LightsType, ShadowCastingLights } from '../lights/Light'
import { WGSLVariableType } from '../bindings/utils'
import { throwWarning } from '../../utils/utils'
import { DirectionalLight } from '../lights/DirectionalLight'
import { PointLight } from '../lights/PointLight'
import { directionalShadowStruct } from '../shadows/DirectionalShadow'
import { pointShadowStruct } from '../shadows/PointShadow'
import { ShadowsType } from '../shadows/Shadow'

export interface LightParams {
  max: number
  label: string
  params: Record<string, { type: WGSLVariableType; size: number }>
}

export type LightsBindingParams = Record<LightsType, LightParams>

export type GPUCameraRendererBindings = Record<'camera' | LightsType | ShadowsType, BufferBinding>

export interface GPUCameraRendererLightParams {
  maxAmbientLights?: LightsBindingParams['ambientLights']['max']
  maxDirectionalLights?: LightsBindingParams['directionalLights']['max']
  maxPointLights?: LightsBindingParams['pointLights']['max']
}

/**
 * Parameters used to create a {@link GPUCameraRenderer}
 */
export interface GPUCameraRendererParams extends GPURendererParams {
  /** An object defining {@link CameraBasePerspectiveOptions | camera perspective parameters} */
  camera?: CameraBasePerspectiveOptions
  lights?: GPUCameraRendererLightParams
}

/**
 * This renderer also creates a {@link Camera} and its associated {@link bindings} and {@link cameraLightsBindGroup | bind group}.<br>
 * Can be safely used to render compute passes and meshes if they do not need to be tied to the DOM.
 *
 * @example
 * ```javascript
 * // first, we need a WebGPU device, that's what GPUDeviceManager is for
 * const gpuDeviceManager = new GPUDeviceManager({
 *   label: 'Custom device manager',
 * })
 *
 * // we need to wait for the WebGPU device to be created
 * await gpuDeviceManager.init()
 *
 * // then we can create a camera renderer
 * const gpuCameraRenderer = new GPUCameraRenderer({
 *   deviceManager: gpuDeviceManager, // we need the WebGPU device to create the renderer context
 *   container: document.querySelector('#canvas'),
 * })
 * ```
 */
export class GPUCameraRenderer extends GPURenderer {
  /** {@link Camera} used by this {@link GPUCameraRenderer} */
  camera: Camera
  /** {@link BindGroup | bind group} handling the {@link cameraBinding | camera buffer binding} */
  cameraLightsBindGroup: BindGroup

  lights: Light[]
  lightsBindingParams: LightsBindingParams
  shadowsBindingsStruct: Record<string, Record<string, Input>>
  bindings: GPUCameraRendererBindings

  /** Options used to create this {@link GPUCameraRenderer} */
  options: GPUCameraRendererParams

  /** @ignore */
  #shouldUpdateCameraLightsBindGroup: boolean

  /**
   * GPUCameraRenderer constructor
   * @param parameters - {@link GPUCameraRendererParams | parameters} used to create this {@link GPUCameraRenderer}
   */
  constructor({
    deviceManager,
    label,
    container,
    pixelRatio = 1,
    autoResize = true,
    preferredFormat,
    alphaMode = 'premultiplied',
    renderPass,
    camera = {},
    lights = {},
  }: GPUCameraRendererParams) {
    super({
      deviceManager,
      label,
      container,
      pixelRatio,
      autoResize,
      preferredFormat,
      alphaMode,
      renderPass,
    })

    this.type = 'GPUCameraRenderer'

    camera = { ...{ fov: 50, near: 0.1, far: 1000 }, ...camera }
    lights = { ...{ maxAmbientLights: 2, maxDirectionalLights: 5, maxPointLights: 5 }, ...lights }

    this.options = {
      ...this.options,
      camera,
      lights,
    }

    this.bindings = {} as GPUCameraRendererBindings
    this.#shouldUpdateCameraLightsBindGroup = true

    this.lights = []

    this.setCamera(camera)

    this.setCameraBinding()
    this.setLightsBinding()
    this.setShadowsBinding()
    this.setCameraLightsBindGroup()
  }

  /**
   * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} is lost.
   * Reset all our samplers, force all our scene objects and camera bind group to lose context.
   */
  loseContext() {
    super.loseContext()
    // lose camera bind group context as well
    this.cameraLightsBindGroup.loseContext()
  }

  /**
   * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been restored.
   * Configure the context again, resize the {@link core/renderPasses/RenderTarget.RenderTarget | render targets} and {@link core/textures/Texture.Texture | textures}, restore our {@link renderedObjects | rendered objects} context, re-write our {@link cameraBinding | camera buffer binding}.
   * @async
   */
  restoreContext() {
    super.restoreContext()
    this.cameraLightsBindGroup?.restoreContext()
    this.updateCameraBindings()
  }

  /* CAMERA */

  /**
   * Set the {@link camera}
   * @param cameraParameters - {@link CameraBasePerspectiveOptions | parameters} used to create the {@link camera}
   */
  setCamera(cameraParameters: CameraBasePerspectiveOptions) {
    const { width, height } = this.rectBBox

    this.useCamera(
      new Camera({
        fov: cameraParameters.fov,
        near: cameraParameters.near,
        far: cameraParameters.far,
        width,
        height,
        pixelRatio: this.pixelRatio,
        onMatricesChanged: () => {
          this.onCameraMatricesChanged()
        },
      })
    )
  }

  /**
   * Tell our {@link GPUCameraRenderer} to use this {@link Camera}. If a {@link camera} has already been set, reset the {@link cameraBinding} inputs view values and the {@link meshes} {@link Camera} object.
   * @param camera - new {@link Camera} to use.
   */
  useCamera(camera: Camera) {
    if (this.camera && camera && this.camera.uuid === camera.uuid) return

    if (this.camera) {
      this.camera.parent = null
      this.camera.onMatricesChanged = () => {}
    }

    this.camera = camera
    this.camera.parent = this.scene

    if (this.bindings.camera) {
      this.camera.onMatricesChanged = () => this.onCameraMatricesChanged()

      // replace the 2 matrices inputs view values
      // position will be computed before updating the binding anyway
      this.bindings.camera.inputs.view.value = this.camera.viewMatrix
      this.bindings.camera.inputs.projection.value = this.camera.projectionMatrix

      for (const mesh of this.meshes) {
        if ('modelViewMatrix' in mesh) {
          mesh.camera = this.camera
        }
      }
    }
  }

  /**
   * Update the {@link ProjectedMesh | projected meshes} sizes and positions when the {@link camera} {@link Camera#position | position} changes
   */
  onCameraMatricesChanged() {
    this.updateCameraBindings()

    for (const mesh of this.meshes) {
      if ('modelViewMatrix' in mesh) {
        mesh.shouldUpdateMatrixStack()
      }
    }
  }

  /**
   * Set the {@link cameraBinding | camera buffer binding} and {@link cameraLightsBindGroup | camera bind group}
   */
  setCameraBinding() {
    // TODO add world matrix / inverseViewMatrix?
    this.bindings.camera = new BufferBinding({
      label: 'Camera',
      name: 'camera',
      visibility: ['vertex'],
      struct: {
        view: {
          // camera view matrix
          type: 'mat4x4f',
          value: this.camera.viewMatrix,
        },
        projection: {
          // camera projection matrix
          type: 'mat4x4f',
          value: this.camera.projectionMatrix,
        },
        position: {
          // camera world position
          type: 'vec3f',
          value: this.camera.position.clone().setFromMatrixPosition(this.camera.worldMatrix),
          onBeforeUpdate: () => {
            ;(this.bindings.camera.inputs.position.value as Vec3)
              .copy(this.camera.position)
              .setFromMatrixPosition(this.camera.worldMatrix)
          },
        },
      },
    })
  }

  /* LIGHTS */

  addLight(light: Light) {
    this.lights.push(light)
  }

  removeLight(light: Light) {
    this.lights = this.lights.filter((l) => l.uuid !== light.uuid)
    light.destroy()
  }

  setLightsBinding() {
    this.lightsBindingParams = {
      ambientLights: {
        max: this.options.lights.maxAmbientLights,
        label: 'Ambient lights',
        params: {
          color: {
            type: 'array<vec3f>',
            size: 3,
          },
        },
      },
      directionalLights: {
        max: this.options.lights.maxDirectionalLights,
        label: 'Directional lights',
        params: {
          color: {
            type: 'array<vec3f>',
            size: 3,
          },
          direction: {
            type: 'array<vec3f>',
            size: 3,
          },
        },
      },
      pointLights: {
        max: this.options.lights.maxPointLights,
        label: 'Point lights',
        params: {
          color: {
            type: 'array<vec3f>',
            size: 3,
          },
          position: {
            type: 'array<vec3f>',
            size: 3,
          },
          range: {
            type: 'array<f32>',
            size: 1,
          },
        },
      },
    }

    const lightsBindings = {
      ambientLights: null,
      directionalLights: null,
      pointLights: null,
    }

    Object.keys(lightsBindings).forEach((lightsType) => {
      this.setLightsTypeBinding(lightsType as LightsType)
    })
  }

  setLightsTypeBinding(lightsType: LightsType) {
    const structParams = Object.keys(this.lightsBindingParams[lightsType].params)
      .map((paramKey) => {
        return {
          key: paramKey,
          type: this.lightsBindingParams[lightsType].params[paramKey].type,
          size: this.lightsBindingParams[lightsType].params[paramKey].size,
        }
      })
      .reduce((acc, binding) => {
        acc[binding.key] = {
          type: binding.type,
          value: new Float32Array(this.lightsBindingParams[lightsType].max * binding.size),
        }

        return acc
      }, {})

    this.bindings[lightsType] = new BufferBinding({
      label: this.lightsBindingParams[lightsType].label,
      name: lightsType,
      bindingType: 'storage',
      visibility: ['vertex', 'fragment', 'compute'], // TODO needed in compute?
      struct: {
        count: {
          type: 'i32',
          value: 0,
        },
        ...structParams,
      },
    })
  }

  onMaxLightOverflow(lightsType: LightsType) {
    if (!this.production) {
      throwWarning(
        `${this.type}: You are overflowing the current max lights count of ${
          this.lightsBindingParams[lightsType].max
        } for this type of lights: ${lightsType}. This should be avoided by setting a larger ${
          'max' + lightsType.charAt(0).toUpperCase() + lightsType.slice(1)
        } when instancing your ${this.type}.`
      )
    }

    this.lightsBindingParams[lightsType].max++

    const oldLightBinding = this.cameraLightsBindGroup.getBindingByName(lightsType)
    this.cameraLightsBindGroup.destroyBufferBinding(oldLightBinding as BufferBinding)

    this.setLightsTypeBinding(lightsType)

    const lightBindingIndex = this.cameraLightsBindGroup.bindings.findIndex((binding) => binding.name === lightsType)

    this.cameraLightsBindGroup.bindings[lightBindingIndex] = this.bindings[lightsType]

    // increase shadows binding size as well
    if (lightsType === 'directionalLights' || lightsType === 'pointLights') {
      const shadowsType = (lightsType.replace('Lights', '') + 'Shadows') as ShadowsType
      const oldShadowsBinding = this.cameraLightsBindGroup.getBindingByName(shadowsType)
      this.cameraLightsBindGroup.destroyBufferBinding(oldShadowsBinding as BufferBinding)
      this.setShadowsTypeBinding(lightsType)

      const shadowsBindingIndex = this.cameraLightsBindGroup.bindings.findIndex(
        (binding) => binding.name === shadowsType
      )
      this.cameraLightsBindGroup.bindings[shadowsBindingIndex] = this.bindings[shadowsType]
    }

    this.cameraLightsBindGroup.resetEntries()
    this.cameraLightsBindGroup.createBindGroup()
  }

  /* SHADOW MAPS */

  get shadowCastingLights(): ShadowCastingLights[] {
    return this.lights.filter(
      (light) => light instanceof DirectionalLight || light instanceof PointLight
    ) as ShadowCastingLights[]
  }

  setShadowsBinding() {
    this.shadowsBindingsStruct = {
      directional: directionalShadowStruct,
      point: pointShadowStruct,
    }

    this.setShadowsTypeBinding('directionalLights')
    this.setShadowsTypeBinding('pointLights')
  }

  setShadowsTypeBinding(lightsType: LightsType) {
    const type = lightsType.replace('Lights', '')
    const shadowsType = (type + 'Shadows') as ShadowsType
    const struct = this.shadowsBindingsStruct[type]
    const label = type.charAt(0).toUpperCase() + type.slice(1) + ' shadows'

    const binding = new BufferBinding({
      label: label + ' element',
      name: shadowsType + 'Elements',
      bindingType: 'uniform',
      visibility: ['vertex', 'fragment'],
      struct,
    })

    this.bindings[shadowsType] = new BufferBinding({
      label: label,
      name: shadowsType,
      bindingType: 'storage',
      visibility: ['vertex', 'fragment', 'compute'], // TODO needed in compute?
      bindings: Array.from(Array(this.lightsBindingParams[lightsType].max).keys()).map((i) => {
        return binding.clone({
          ...binding.options,
          // clone struct with new arrays
          struct: Object.keys(struct).reduce((acc, bindingKey) => {
            const binding = struct[bindingKey]
            return {
              ...acc,
              [bindingKey]: {
                type: binding.type,
                value:
                  Array.isArray(binding.value) || ArrayBuffer.isView(binding.value)
                    ? new binding.value.constructor(binding.value.length)
                    : binding.value,
              },
            }
          }, {}),
        })
      }),
    })
  }

  /* CAMERA, LIGHTS & SHADOWS BIND GROUP */

  setCameraLightsBindGroup() {
    // now initialize bind group
    this.cameraLightsBindGroup = new BindGroup(this, {
      label: 'Camera and lights uniform bind group',
      bindings: Object.keys(this.bindings)
        .map((bindingName) => this.bindings[bindingName])
        .flat(),
    })

    this.cameraLightsBindGroup.consumers.add(this.uuid)
  }

  /**
   * Create the {@link cameraLightsBindGroup | camera and lights bind group} buffers
   */
  setCameraBindGroup() {
    if (this.cameraLightsBindGroup && this.cameraLightsBindGroup.shouldCreateBindGroup) {
      this.cameraLightsBindGroup.setIndex(0)
      this.cameraLightsBindGroup.createBindGroup()
    }
  }

  shouldUpdateCameraLightsBindGroup() {
    this.#shouldUpdateCameraLightsBindGroup = true
  }

  /**
   * Tell our {@link cameraBinding | camera buffer binding} that we should update its bindings and update the bind group. Called each time the camera matrices change.
   */
  updateCameraBindings() {
    this.bindings.camera?.shouldUpdateBinding('view')
    this.bindings.camera?.shouldUpdateBinding('projection')
    this.bindings.camera?.shouldUpdateBinding('position')

    // tell our bind group to update
    this.shouldUpdateCameraLightsBindGroup()
  }

  /**
   * Get all objects ({@link RenderedMesh | rendered meshes} or {@link core/computePasses/ComputePass.ComputePass | compute passes}) using a given {@link AllowedBindGroups | bind group}, including {@link cameraLightsBindGroup | camera and lights bind group}.
   * Useful to know if a resource is used by multiple objects and if it is safe to destroy it or not.
   * @param bindGroup - {@link AllowedBindGroups | bind group} to check
   */
  getObjectsByBindGroup(bindGroup: AllowedBindGroups): undefined | SceneObject[] {
    return this.deviceRenderedObjects.filter((object) => {
      return [
        ...object.material.bindGroups,
        ...object.material.inputsBindGroups,
        ...object.material.clonedBindGroups,
        this.cameraLightsBindGroup,
      ].some((bG) => bG.uuid === bindGroup.uuid)
    })
  }

  /**
   * Set our {@link camera} perspective matrix new parameters (fov, near plane and far plane)
   * @param parameters - {@link CameraBasePerspectiveOptions | parameters} to use for the perspective
   */
  setPerspective({ fov, near, far }: CameraBasePerspectiveOptions = {}) {
    this.camera?.setPerspective({
      fov,
      near,
      far,
      width: this.rectBBox.width,
      height: this.rectBBox.height,
      pixelRatio: this.pixelRatio,
    })
  }

  /**
   * Set our {@link camera} {@link Camera#position | position}
   * @param position - new {@link Camera#position | position}
   */
  setCameraPosition(position: Vec3 = new Vec3(0, 0, 1)) {
    this.camera.position.copy(position)
  }

  /**
   * Resize our {@link GPUCameraRenderer} and resize our {@link camera} before anything else.
   * @param rectBBox - the optional new {@link canvas} {@link RectBBox} to set
   */
  resize(rectBBox: RectBBox | null = null) {
    this.setSize(rectBBox)

    this.setPerspective()

    this._onResizeCallback && this._onResizeCallback()

    this.resizeObjects()

    this._onAfterResizeCallback && this._onAfterResizeCallback()
  }

  /* RENDER */

  /**
   * {@link setCameraBindGroup | Set the camera bind group if needed} and then call our {@link GPURenderer#render | GPURenderer render method}
   * @param commandEncoder - current {@link GPUCommandEncoder}
   */
  render(commandEncoder: GPUCommandEncoder) {
    if (!this.ready) return

    this.setCameraBindGroup()

    if (this.cameraLightsBindGroup && this.#shouldUpdateCameraLightsBindGroup) {
      this.cameraLightsBindGroup.update()
      this.#shouldUpdateCameraLightsBindGroup = false
    }

    super.render(commandEncoder)
  }

  /**
   * Destroy our {@link GPUCameraRenderer}
   */
  destroy() {
    this.cameraLightsBindGroup?.destroy()
    this.lights.forEach((light) => light.remove())
    super.destroy()
  }
}
