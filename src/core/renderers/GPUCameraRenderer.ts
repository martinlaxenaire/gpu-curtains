import { GPURenderer, GPURendererOptions, GPURendererParams, SceneObject } from './GPURenderer'
import { Camera } from '../cameras/Camera'
import { PerspectiveCamera, PerspectiveCameraBaseOptions } from '../cameras/PerspectiveCamera'
import { BufferBinding } from '../bindings/BufferBinding'
import { BindGroup } from '../bindGroups/BindGroup'
import { Vec3 } from '../../math/Vec3'
import { AllowedBindGroups, Input } from '../../types/BindGroups'
import { RectBBox } from '../DOM/DOMElement'
import type { Light, LightsType, ShadowCastingLights } from '../lights/Light'
import { WGSLVariableType } from '../bindings/utils'
import { throwWarning } from '../../utils/utils'
import { directionalShadowStruct } from '../shadows/DirectionalShadow'
import { pointShadowStruct } from '../shadows/PointShadow'
import { spotShadowStruct } from '../shadows/SpotShadow'
import { ShadowsType } from '../shadows/Shadow'
import { Texture } from '../textures/Texture'
import { Sampler } from '../samplers/Sampler'
import { RenderPassEntry } from '../scenes/Scene'
import { OrthographicCamera } from '../cameras/OrthographicCamera'
import { RenderPassViewport } from '../renderPasses/RenderPass'

/** Defines the parameters used to build the {@link BufferBinding} of each type of lights. */
export interface LightParams {
  /** Maximum number for a given type of light. */
  max: number
  /** Label for a given type of light. */
  label: string
  /** Parameters to use to build the {@link BufferBinding} for a given type of light. */
  params: Record<
    string,
    {
      /** WGSL type of the input. */
      type: WGSLVariableType
      /** Size of the input. */
      size: number
    }
  >
}

/** Defines the {@link BufferBinding} parameters for all kinds of {@link LightsType | light types}. */
export type LightsBindingParams = Record<LightsType, LightParams>

/** Defines all the possible {@link BufferBinding} to use in the {@link GPUCameraRenderer#cameraLightsBindGroup | renderer camera, lights and shadows bind group}. */
export type GPUCameraRendererBindings = Record<'camera' | LightsType | ShadowsType, BufferBinding>

/**
 * Base parameters for the maximum number of lights to use when creating a {@link GPUCameraRenderer}.
 */
export interface GPUCameraRendererLightParams {
  /** Maximum number of {@link core/lights/AmbientLight.AmbientLight | AmbientLight} to use. Default to `2`. */
  maxAmbientLights?: LightsBindingParams['ambientLights']['max']
  /** Maximum number of {@link core/lights/DirectionalLight.DirectionalLight | DirectionalLight} to use. Default to `5`. */
  maxDirectionalLights?: LightsBindingParams['directionalLights']['max']
  /** Maximum number of {@link core/lights/PointLight.PointLight | PointLight} to use. Default to `5`. */
  maxPointLights?: LightsBindingParams['pointLights']['max']
  /** Maximum number of {@link core/lights/SpotLight.SpotLight | SpotLight} to use. Default to `5`. */
  maxSpotLights?: LightsBindingParams['spotLights']['max']
  /** Whether to use `uniform` instead of `storage` binding type for the shadows bindings. In some case, for example when using models with skinning or morph targets, the maximum number of `storage` bindings can be reached in the vertex shader. This allows to bypass this limit by switching the shadows binding from `storage` to `uniforms`, but restrict the flexibility by removing the ability to overflow lights. Default to `false`. */
  useUniformsForShadows?: boolean
}

/** Extra parameters used to define the {@link Camera} and various lights options. */
export interface GPUCameraLightsRendererParams {
  /** An object defining {@link PerspectiveCameraBaseOptions | camera perspective parameters} */
  camera?: PerspectiveCameraBaseOptions
  /** An object defining {@link GPUCameraRendererLightParams | the maximum number of light} to use when creating the {@link GPUCameraRenderer}. Can be set to `false` to avoid creating lights and shadows buffers. */
  lights?: GPUCameraRendererLightParams | false
}

/** Parameters used to create a {@link GPUCameraRenderer}. */
export interface GPUCameraRendererParams extends GPURendererParams, GPUCameraLightsRendererParams {}

/** Options used to create a {@link GPUCameraRenderer}. */
export interface GPUCameraRendererOptions extends GPURendererOptions, GPUCameraLightsRendererParams {}

/**
 * This renderer is meant to render meshes projected by a {@link Camera}. It therefore creates a {@link Camera} with its associated {@link bindings} as well as lights and shadows {@link bindings} used for lighting and their associated {@link cameraLightsBindGroup | bind group}.<br>
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
  /** {@link Camera} used by this {@link GPUCameraRenderer}. */
  camera: Camera
  /** {@link BindGroup | bind group} handling the camera, lights and shadows {@link BufferBinding}. */
  cameraLightsBindGroup: BindGroup
  /** Additional {@link RenderPassViewport} from the {@link Camera} to use if any. Will be contained inside the {@link viewport} if any. */
  cameraViewport: RenderPassViewport | null

  /** Array of all the created {@link Light}. */
  lights: Light[]
  /** An object defining the current {@link LightsBindingParams | lights binding parameters}, including the maximum number of lights for each type and the structure used to create the associated {@link BufferBinding}. */
  lightsBindingParams: LightsBindingParams
  /** An object defining the structure used to create the shadows {@link BufferBinding}. */
  shadowsBindingsStruct: Record<string, Record<string, Input>>
  /** The bindings used by the {@link cameraLightsBindGroup | camera, lights and shadows bind group}. */
  bindings: GPUCameraRendererBindings

  /** An array of {@link BindGroup} containing a single {@link BufferBinding} with the cube face index onto which we'll want to draw for {@link core/shadows/PointShadow.PointShadow | PointShadow} depth cube map. Will be swapped for each face render passes by the {@link core/shadows/PointShadow.PointShadow | PointShadow}. */
  pointShadowsCubeFaceBindGroups: BindGroup[]

  /** Options used to create this {@link GPUCameraRenderer}. */
  options: GPUCameraRendererOptions

  /** @ignore */
  #shouldUpdateCameraLightsBindGroup: boolean

  /** If our scene contains transmissive objects, we need to handle the rendering of transmissive meshes. To do so, we'll need a new screen pass {@link RenderPassEntry} and a {@link Texture} onto which we'll write the content of the non transmissive objects main buffer rendered objects. */
  transmissionTarget: {
    /** The new screen pass {@link RenderPassEntry} where we'll draw our transmissive objects. */
    passEntry?: RenderPassEntry
    /** The {@link Texture} holding the content of all the non transmissive objects we've already drawn onto the main screen buffer. */
    texture?: Texture
    /** The {@link Sampler} used to sample the background output texture. */
    sampler: Sampler
  }

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
    context = {},
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
      context,
      renderPass,
    })

    this.type = 'GPUCameraRenderer'

    camera = { ...{ fov: 50, near: 0.1, far: 1000 }, ...camera }

    if (lights !== false) {
      lights = {
        ...{
          maxAmbientLights: 2,
          maxDirectionalLights: 5,
          maxPointLights: 5,
          maxSpotLights: 5,
          useUniformsForShadows: false,
        },
        ...lights,
      }
    }

    this.options = {
      ...this.options,
      camera,
      lights,
    }

    this.bindings = {} as GPUCameraRendererBindings
    this.#shouldUpdateCameraLightsBindGroup = true

    this.lights = []

    this.cameraViewport = null

    this.setCamera(camera)

    this.setCameraBinding()

    if (this.options.lights) {
      this.#initLights()
    }

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
    this.pointShadowsCubeFaceBindGroups.forEach((bindGroup) => bindGroup.loseContext())
  }

  /**
   * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been restored.
   * Configure the context again, resize the {@link core/renderPasses/RenderTarget.RenderTarget | render targets} and {@link core/textures/Texture.Texture | textures}, restore our {@link renderedObjects | rendered objects} context, re-write our {@link cameraLightsBindGroup | camera, lights and shadows bind group} bindings.
   */
  restoreContext() {
    super.restoreContext()
    this.cameraLightsBindGroup?.restoreContext()
    this.pointShadowsCubeFaceBindGroups.forEach((bindGroup) => bindGroup.restoreContext())
    this.updateCameraBindings()
  }

  /**
   * Set our {@link renderPass | main render pass} and our {@link transmissionTarget} sampler.
   */
  setMainRenderPasses() {
    super.setMainRenderPasses()

    this.transmissionTarget = {
      sampler: new Sampler(this, {
        label: 'Transmission sampler',
        name: 'transmissionSampler',
        magFilter: 'linear',
        minFilter: 'linear',
        mipmapFilter: 'linear',
        addressModeU: 'clamp-to-edge',
        addressModeV: 'clamp-to-edge',
      }),
    }
  }

  /* CAMERA */

  /**
   * Set the {@link camera}
   * @param cameraParameters - {@link PerspectiveCameraBaseOptions | parameters} used to create the {@link camera}
   */
  setCamera(cameraParameters: PerspectiveCameraBaseOptions) {
    const { width, height } = this.rectBBox

    this.useCamera(
      new PerspectiveCamera({
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
   * Tell our {@link GPUCameraRenderer} to use this {@link Camera}. If a {@link camera} has already been set, reset the {@link GPUCameraRenderer#bindings.camera | camera binding} inputs view values and the {@link meshes} {@link Camera} object.
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

    this.resizeCamera()

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
   * Update the {@link cameraViewport} if needed (i.e. if the camera use a different aspect ratio than the renderer).
   */
  updateCameraViewport() {
    let { width, height } = this.canvas

    if (this.viewport) {
      width = Math.min(width, this.viewport.width)
      height = Math.min(height, this.viewport.height)
    }

    if (this.camera instanceof PerspectiveCamera && this.camera.forceAspect) {
      width = Math.min(width, height * this.camera.forceAspect)
      height = Math.min(width / this.camera.forceAspect, height)

      this.setCameraViewport({
        width,
        height,
        top: (this.canvas.height - height) * 0.5,
        left: (this.canvas.width - width) * 0.5,
        minDepth: 0,
        maxDepth: 1,
      })
    } else {
      this.setCameraViewport()
    }
  }

  /**
   * Resize the {@link camera}, first by updating the {@link cameraViewport} and then resetting the {@link camera} projection.
   */
  resizeCamera() {
    this.updateCameraViewport()

    const { width, height } = this.cameraViewport ?? this.viewport ?? this.canvas

    if (this.camera instanceof PerspectiveCamera) {
      this.camera?.setPerspective({
        width: width,
        height: height,
        pixelRatio: this.pixelRatio,
      })
    } else if (this.camera instanceof OrthographicCamera) {
      const aspect = width / height
      const frustumSize = this.camera.top * 2

      this.camera.setOrthographic({
        left: (-frustumSize * aspect) / 2,
        right: (frustumSize * aspect) / 2,
        pixelRatio: this.pixelRatio,
      })
    }
  }

  /**
   * Set the {@link cameraViewport} (that should be contained within the renderer {@link viewport} if any) and update the {@link renderPass} and {@link postProcessingPass} {@link viewport} values.
   * @param viewport - {@link RenderPassViewport} settings to use if any.
   */
  setCameraViewport(viewport: RenderPassViewport | null = null) {
    this.cameraViewport = viewport

    if (!this.cameraViewport) {
      this.renderPass?.setViewport(this.viewport)
      this.postProcessingPass?.setViewport(this.viewport)
    } else {
      if (this.viewport) {
        // camera viewport must be contained within renderer viewport
        const aspect = this.cameraViewport.width / this.cameraViewport.height
        this.cameraViewport.width = Math.min(this.viewport.width, this.viewport.height * aspect)
        this.cameraViewport.height = Math.min(this.cameraViewport.width / aspect, this.viewport.height)
        this.cameraViewport.left = Math.max(0, (this.viewport.width - this.cameraViewport.width) * 0.5)
        this.cameraViewport.top = Math.max(0, (this.viewport.height - this.cameraViewport.height) * 0.5)
      }

      this.renderPass?.setViewport(this.cameraViewport)
      this.postProcessingPass?.setViewport(this.cameraViewport)
    }
  }

  /**
   * Resize the {@link camera} whenever the {@link viewport} is updated.
   * @param viewport - {@link RenderPassViewport} settings to use if any. Can be set to `null` to cancel the {@link viewport}.
   */
  setViewport(viewport: RenderPassViewport | null = null) {
    super.setViewport(viewport)
    this.resizeCamera()
  }

  /**
   * Update the {@link core/renderers/GPURenderer.ProjectedMesh | projected meshes} sizes and positions when the {@link camera} {@link Camera#position | position} changes.
   */
  onCameraMatricesChanged() {
    this.updateCameraBindings()

    for (const mesh of this.meshes) {
      if ('modelViewMatrix' in mesh) {
        mesh.shouldUpdateProjectionMatrixStack()
      }
    }
  }

  /**
   * Set the {@link GPUCameraRenderer#bindings.camera | camera buffer binding} and {@link cameraLightsBindGroup | camera bind group}
   */
  setCameraBinding() {
    // TODO add world matrix / inverseViewMatrix?
    this.bindings.camera = new BufferBinding({
      label: 'Camera',
      name: 'camera',
      visibility: ['vertex', 'fragment'],
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

  /**
   * Initialize the lights and shadows bindings.
   * @private
   */
  #initLights() {
    if (!this.options.lights) {
      this.options.lights = {
        maxAmbientLights: 2,
        maxDirectionalLights: 5,
        maxPointLights: 5,
        maxSpotLights: 5,
        useUniformsForShadows: false,
      }
    }

    this.setLightsBinding()
    this.setShadowsBinding()
  }

  /**
   * Add a {@link Light} to the {@link lights} array.
   * @param light - {@link Light} to add.
   */
  addLight(light: Light) {
    this.lights.push(light)
    this.#updateLightsCount(light.type as LightsType)
  }

  /**
   * Remove a {@link Light} from the {@link lights} array.
   * @param light - {@link Light} to remove.
   */
  removeLight(light: Light) {
    this.lights = this.lights.filter((l) => l.uuid !== light.uuid)
    this.#updateLightsCount(light.type as LightsType)
  }

  /**
   * Update the lights count for the given {@link LightsType} based on the max light index.
   * @param lightsType - {@link LightsType} for which to update the light count.
   * @private
   */
  #updateLightsCount(lightsType: LightsType) {
    let maxIndex = 0
    this.lights
      .filter((light) => light.type === lightsType)
      .forEach((light) => {
        maxIndex = Math.max(maxIndex, light.index + 1)
      })

    this.bindings[lightsType].inputs.count.value = maxIndex
    this.bindings[lightsType].inputs.count.shouldUpdate = true
  }

  /**
   * Set the lights {@link BufferBinding} based on the {@link lightsBindingParams}.
   */
  setLightsBinding() {
    if (!this.options.lights) return

    // TODO we could combine lights and shadows in a single buffer using childrenBindings
    // to improve performance by reducing writeBuffer calls
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
      spotLights: {
        max: this.options.lights.maxSpotLights,
        label: 'Spot lights',
        params: {
          color: {
            type: 'array<vec3f>',
            size: 3,
          },
          direction: {
            type: 'array<vec3f>',
            size: 3,
          },
          position: {
            type: 'array<vec3f>',
            size: 3,
          },
          coneCos: {
            type: 'array<f32>',
            size: 1,
          },
          penumbraCos: {
            type: 'array<f32>',
            size: 1,
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
      spotLights: null,
    }

    Object.keys(lightsBindings).forEach((lightsType) => {
      this.setLightsTypeBinding(lightsType as LightsType)
    })
  }

  /**
   * Set or reset the {@link BufferBinding} for a given {@link LightsType | type of light}.
   * @param lightsType - {@link LightsType | Type of light} for which to create the {@link BufferBinding}.
   */
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
          value: new Float32Array(Math.max(this.lightsBindingParams[lightsType].max, 1) * binding.size),
        }

        return acc
      }, {})

    this.bindings[lightsType] = new BufferBinding({
      label: this.lightsBindingParams[lightsType].label,
      name: lightsType,
      bindingType: 'storage',
      visibility: ['fragment', 'compute'], // TODO needed in compute?
      struct: {
        count: {
          type: 'i32',
          value: 0,
        },
        ...structParams,
      },
    })
  }

  /**
   * Called when a {@link LightsType | type of light} has overflown its maximum capacity. Destroys the associated {@link BufferBinding} (and eventually the associated shadow {@link BufferBinding}), recreates the {@link cameraLightsBindGroup | camera, lights and shadows bind group} and reset all lights for this {@link LightsType | type of light}.
   * @param lightsType - {@link LightsType | Type of light} that has overflown its maximum capacity.
   * @param lightIndex - The {@link Light#index | light index} that caused overflow. Will be used to reset the new max light count.
   */
  onMaxLightOverflow(lightsType: LightsType, lightIndex = 0) {
    if (!this.options.lights) {
      if (!this.production) {
        throwWarning(
          `${this.options.label} (${this.type}): You are adding a light (${lightsType}) to a renderer that should not initially handle lights. The renderer bind group will be re-created. This should be avoided.`
        )
      }

      this.#initLights()
      this.cameraLightsBindGroup.destroy()
      this.setCameraLightsBindGroup()
    } else {
      if (!this.production) {
        throwWarning(
          `${this.options.label} (${this.type}): You are overflowing the current max lights count of '${
            this.lightsBindingParams[lightsType].max
          }' for this type of lights: ${lightsType}. This should be avoided by setting a larger ${
            'max' + lightsType.charAt(0).toUpperCase() + lightsType.slice(1)
          } when instancing your ${this.type}.`
        )
      }

      //this.lightsBindingParams[lightsType].max++
      this.lightsBindingParams[lightsType].max = Math.max(this.lightsBindingParams[lightsType].max, lightIndex + 1)

      const oldLightBinding = this.cameraLightsBindGroup.getBindingByName(lightsType)
      if (oldLightBinding) {
        this.cameraLightsBindGroup.destroyBufferBinding(oldLightBinding as BufferBinding)
      }

      this.setLightsTypeBinding(lightsType)

      // reset count to new max
      //this.bindings[lightsType].inputs.count.value = this.lightsBindingParams[lightsType].max

      const lightBindingIndex = this.cameraLightsBindGroup.bindings.findIndex((binding) => binding.name === lightsType)

      if (lightBindingIndex !== -1) {
        this.cameraLightsBindGroup.bindings[lightBindingIndex] = this.bindings[lightsType]
      } else {
        // not used yet but could be useful
        // if we'd decide not to create a binding if max === 0
        this.bindings[lightsType].shouldResetBindGroup = true
        this.bindings[lightsType].shouldResetBindGroupLayout = true
        this.cameraLightsBindGroup.addBinding(this.bindings[lightsType])
        this.shouldUpdateCameraLightsBindGroup()
      }

      // increase shadows binding size as well
      if (lightsType === 'directionalLights' || lightsType === 'pointLights' || lightsType === 'spotLights') {
        const shadowsType = (lightsType.replace('Lights', '') + 'Shadows') as ShadowsType
        const oldShadowsBinding = this.cameraLightsBindGroup.getBindingByName(shadowsType)
        if (oldShadowsBinding) {
          this.cameraLightsBindGroup.destroyBufferBinding(oldShadowsBinding as BufferBinding)
        }

        this.setShadowsTypeBinding(lightsType)

        const shadowsBindingIndex = this.cameraLightsBindGroup.bindings.findIndex(
          (binding) => binding.name === shadowsType
        )

        if (shadowsBindingIndex !== -1) {
          this.cameraLightsBindGroup.bindings[shadowsBindingIndex] = this.bindings[shadowsType]
        } else {
          // not used yet, same as above
          this.bindings[shadowsType].shouldResetBindGroup = true
          this.bindings[shadowsType].shouldResetBindGroupLayout = true
          this.cameraLightsBindGroup.addBinding(this.bindings[shadowsType])
          this.shouldUpdateCameraLightsBindGroup()
        }
      }

      this.cameraLightsBindGroup.resetEntries()
      this.cameraLightsBindGroup.createBindGroup()

      this.lights.forEach((light) => {
        if (light.type === lightsType) {
          light.reset()
        }
      })
    }
  }

  /* SHADOW MAPS */

  /**
   * Get all the current {@link ShadowCastingLights | lights that can cast shadows}.
   * @returns - All {@link ShadowCastingLights | lights that can cast shadows}.
   */
  get shadowCastingLights(): ShadowCastingLights[] {
    return this.lights?.filter(
      (light) => light.type === 'directionalLights' || light.type === 'pointLights' || light.type === 'spotLights'
    ) as ShadowCastingLights[]
  }

  /**
   * Set the shadows {@link BufferBinding} based on the {@link shadowsBindingsStruct}.
   */
  setShadowsBinding() {
    this.shadowsBindingsStruct = {
      directional: directionalShadowStruct,
      point: pointShadowStruct,
      spot: spotShadowStruct,
    }

    this.setShadowsTypeBinding('directionalLights')
    this.setShadowsTypeBinding('pointLights')
    this.setShadowsTypeBinding('spotLights')
  }

  /**
   * Set or reset the associated shadow {@link BufferBinding} for a given {@link LightsType | type of light}.
   * @param lightsType - {@link LightsType | Type of light} for which to create the associated shadow {@link BufferBinding}.
   */
  setShadowsTypeBinding(lightsType: LightsType) {
    const type = lightsType.replace('Lights', '')
    const shadowsType = (type + 'Shadows') as ShadowsType
    const struct = this.shadowsBindingsStruct[type]
    const label = type.charAt(0).toUpperCase() + type.slice(1) + ' shadows'

    this.bindings[shadowsType] = new BufferBinding({
      label: label,
      name: shadowsType,
      bindingType: this.options.lights && this.options.lights.useUniformsForShadows ? 'uniform' : 'storage',
      visibility: ['vertex', 'fragment', 'compute'], // TODO needed in compute?
      childrenBindings: [
        {
          binding: new BufferBinding({
            label: label + ' element',
            name: shadowsType + 'Elements',
            bindingType: 'uniform',
            visibility: ['vertex', 'fragment'],
            struct,
          }),
          count: Math.max(1, this.lightsBindingParams[lightsType].max),
          forceArray: true, // needs to be iterable anyway!
        },
      ],
    })
  }

  /* CAMERA, LIGHTS & SHADOWS BIND GROUP */

  /**
   * Set the {@link cameraLightsBindGroup | camera, lights and shadows bind group}.
   */
  setCameraLightsBindGroup() {
    // now initialize bind group
    this.cameraLightsBindGroup = new BindGroup(this, {
      label: this.options.label + ': Camera and lights uniform bind group',
      bindings: Object.keys(this.bindings)
        .map((bindingName) => this.bindings[bindingName])
        .flat(),
    })

    this.cameraLightsBindGroup.consumers.add(this.uuid)

    // add point shadows cube faces bind groups
    this.pointShadowsCubeFaceBindGroups = []
    for (let face = 0; face < 6; face++) {
      const cubeFace = new BufferBinding({
        label: 'Cube face',
        name: 'cubeFace',
        bindingType: 'uniform',
        visibility: ['vertex'],
        struct: {
          face: {
            type: 'u32',
            value: face,
          },
        },
      })

      const cubeBindGroup = new BindGroup(this, {
        label: `Cube face bind group ${face}`,
        bindings: [cubeFace],
      })

      cubeBindGroup.createBindGroup()
      cubeBindGroup.consumers.add(this.uuid)

      this.pointShadowsCubeFaceBindGroups.push(cubeBindGroup)
    }

    // create eagerly
    if (this.device) {
      this.createCameraLightsBindGroup()
    }
  }

  /**
   * Create the {@link cameraLightsBindGroup | camera, lights and shadows bind group} buffers
   */
  createCameraLightsBindGroup() {
    if (this.cameraLightsBindGroup && this.cameraLightsBindGroup.shouldCreateBindGroup) {
      this.cameraLightsBindGroup.setIndex(0)
      this.cameraLightsBindGroup.createBindGroup()
    }
  }

  /**
   * Tell our  {@link cameraLightsBindGroup | camera, lights and shadows bind group} to update.
   */
  shouldUpdateCameraLightsBindGroup() {
    this.#shouldUpdateCameraLightsBindGroup = true
  }

  /**
   * Tell our {@link GPUCameraRenderer#bindings.camera | camera buffer binding} that we should update its bindings and update the bind group. Called each time the camera matrices change.
   */
  updateCameraBindings() {
    this.bindings.camera?.shouldUpdateBinding('view')
    this.bindings.camera?.shouldUpdateBinding('projection')
    this.bindings.camera?.shouldUpdateBinding('position')

    // tell our bind group to update
    this.shouldUpdateCameraLightsBindGroup()
  }

  /**
   * Update the {@link cameraLightsBindGroup | camera and lights BindGroup}.
   */
  updateCameraLightsBindGroup() {
    if (this.cameraLightsBindGroup && this.#shouldUpdateCameraLightsBindGroup) {
      this.cameraLightsBindGroup.update()
      this.#shouldUpdateCameraLightsBindGroup = false
    }
  }

  /**
   * Get all objects ({@link core/renderers/GPURenderer.RenderedMesh | rendered meshes} or {@link core/computePasses/ComputePass.ComputePass | compute passes}) using a given {@link AllowedBindGroups | bind group}, including {@link cameraLightsBindGroup | camera and lights bind group}.
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
   * Set our {@link camera} {@link Camera#position | position}
   * @param position - new {@link Camera#position | position}
   */
  setCameraPosition(position: Vec3 = new Vec3(0, 0, 1)) {
    this.camera.position.copy(position)
  }

  /* TRANSMISSIVE */

  /**
   * Create the {@link transmissionTarget} {@link Texture} and {@link RenderPassEntry} if not already created.
   */
  createTransmissionTarget() {
    if (!this.transmissionTarget.texture) {
      this.transmissionTarget.passEntry = this.scene.createScreenPassEntry('Transmission scene screen render pass')
      this.transmissionTarget.texture = new Texture(this, {
        label: 'Transmission background scene render target output',
        name: 'transmissionBackgroundTexture',
        generateMips: true, // needed for roughness LOD!
        format: this.options.context.format,
        autoDestroy: false,
      })

      this.transmissionTarget.passEntry.onBeforeRenderPass = (commandEncoder, swapChainTexture) => {
        // Copy background scene texture to the output, because the output texture needs mips
        // and we can't have mips on a rendered texture
        this.copyGPUTextureToTexture(swapChainTexture, this.transmissionTarget.texture, commandEncoder)
      }
    }
  }

  /**
   * Destroy the {@link transmissionTarget} {@link Texture} and {@link RenderPassEntry} if already created.
   */
  destroyTransmissionTarget() {
    if (this.transmissionTarget.texture) {
      this.transmissionTarget.texture.destroy()
      this.scene.renderPassEntries.screen = this.scene.renderPassEntries.screen.filter(
        (passEntry) => passEntry.label !== 'Transmission scene screen render pass'
      )

      this.transmissionTarget.texture = null
      this.transmissionTarget.passEntry = null
    }
  }

  /**
   * Resize our {@link GPUCameraRenderer} and resize our {@link camera} before anything else.
   * @param rectBBox - the optional new {@link canvas} {@link RectBBox} to set
   */
  resize(rectBBox: RectBBox | null = null) {
    this.setSize(rectBBox)

    this.resizeCamera()

    this._onResizeCallback && this._onResizeCallback()

    this.resizeObjects()

    this._onAfterResizeCallback && this._onAfterResizeCallback()
  }

  /* RENDER */

  /**
   * {@link createCameraLightsBindGroup | Set the camera bind group if needed} and then call our {@link GPURenderer#render | GPURenderer render method}.
   * @param commandEncoder - Current {@link GPUCommandEncoder}.
   */
  render(commandEncoder: GPUCommandEncoder) {
    if (!this.ready) return

    this.createCameraLightsBindGroup()

    this.updateCameraLightsBindGroup()

    super.render(commandEncoder)

    if (this.cameraLightsBindGroup) {
      this.cameraLightsBindGroup.needsPipelineFlush = false
    }
  }

  /**
   * Destroy our {@link GPUCameraRenderer}
   */
  destroy() {
    this.cameraLightsBindGroup?.destroy()
    this.pointShadowsCubeFaceBindGroups.forEach((bindGroup) => bindGroup.destroy())
    this.destroyTransmissionTarget()
    this.lights.forEach((light) => light.destroy())
    super.destroy()
    this.lights.forEach((light) => this.removeLight(light))
  }
}
