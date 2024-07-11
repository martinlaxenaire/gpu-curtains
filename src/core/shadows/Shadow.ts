import { CameraRenderer, isCameraRenderer } from '../renderers/utils'
import { Vec2 } from '../../math/Vec2'
import { Mat4 } from '../../math/Mat4'
import { Texture } from '../textures/Texture'
import { RenderTarget } from '../renderPasses/RenderTarget'
import { Sampler } from '../samplers/Sampler'
import { ProjectedMesh } from '../renderers/GPURenderer'
import { RenderMaterial } from '../materials/RenderMaterial'
import { ProjectedMeshParameters } from '../meshes/mixins/ProjectedMeshBaseMixin'
import { DirectionalLight } from '../lights/DirectionalLight'
import { PointLight } from '../lights/PointLight'
import { getDefaultShadowDepthVs } from '../shaders/chunks/utils/shadows'
import { BufferBinding } from '../bindings/BufferBinding'

export type ShadowsType = 'directionalShadows' | 'pointShadows'

export interface ShadowBaseParams {
  intensity?: number
  bias?: number
  normalBias?: number
  depthTextureSize?: Vec2
  depthTextureFormat?: GPUTextureFormat
}

export interface ShadowParams extends ShadowBaseParams {
  light: DirectionalLight | PointLight
}

export class Shadow {
  renderer: CameraRenderer
  index: number

  light: DirectionalLight | PointLight

  options: ShadowBaseParams

  sampleCount: number

  #intensity: number
  #bias: number
  #normalBias: number
  depthTextureSize: Vec2
  depthTextureFormat: GPUTextureFormat

  #isActive: boolean

  depthTexture: null | Texture
  depthPassTarget: null | RenderTarget
  depthComparisonSampler: null | Sampler

  meshes: Map<ProjectedMesh['uuid'], ProjectedMesh>
  materials: Map<ProjectedMesh['uuid'], RenderMaterial>
  depthMaterials: Map<ProjectedMesh['uuid'], RenderMaterial>
  #depthPassTaskID: null | number

  rendererBinding: BufferBinding | null

  constructor(
    renderer: CameraRenderer,
    {
      light,
      intensity = 1,
      bias = 0,
      normalBias = 0,
      depthTextureSize = new Vec2(512),
      depthTextureFormat = 'depth24plus' as GPUTextureFormat,
    } = {} as ShadowParams
  ) {
    renderer = isCameraRenderer(renderer, this.constructor.name)

    this.renderer = renderer

    this.rendererBinding = null

    this.light = light

    this.index = this.light.index

    this.options = {
      intensity,
      bias,
      normalBias,
      depthTextureSize,
      depthTextureFormat,
    }

    // mandatory so we could use textureSampleCompare()
    // if we'd like to use MSAA, we would have to use an additional pass
    // to manually resolve the depth texture before using it
    this.sampleCount = 1

    this.meshes = new Map()
    this.materials = new Map()
    this.depthMaterials = new Map()

    this.#depthPassTaskID = null

    this.#setBaseParameters({ intensity, bias, depthTextureSize, depthTextureFormat })

    this.isActive = false
  }

  #setBaseParameters(
    {
      intensity = 1,
      bias = 0,
      normalBias = 0,
      depthTextureSize = new Vec2(512),
      depthTextureFormat = 'depth24plus',
    } = {} as ShadowBaseParams
  ) {
    this.intensity = intensity
    this.bias = bias
    this.normalBias = normalBias
    this.depthTextureSize = depthTextureSize
    this.depthTextureSize.onChange(() => this.onDepthTextureSizeChanged())
    this.depthTextureFormat = depthTextureFormat as GPUTextureFormat
  }

  setParameters(
    {
      intensity = 1,
      bias = 0,
      normalBias = 0,
      depthTextureSize = new Vec2(512),
      depthTextureFormat = 'depth24plus',
    } = {} as ShadowBaseParams
  ) {
    this.isActive = true
    this.#setBaseParameters({ intensity, bias, normalBias, depthTextureSize, depthTextureFormat })
  }

  get isActive(): boolean {
    return this.#isActive
  }

  set isActive(value: boolean) {
    if (!value && this.isActive) {
      this.destroy()
    } else if (value && !this.isActive) {
      this.init()
    }

    this.#isActive = value
  }

  get intensity(): number {
    return this.#intensity
  }

  set intensity(value: number) {
    this.#intensity = value
    if (this.isActive) this.updateShadowProperty('intensity', this.intensity)
  }

  get bias(): number {
    return this.#bias
  }

  set bias(value: number) {
    this.#bias = value
    if (this.isActive) this.updateShadowProperty('bias', this.bias)
  }

  get normalBias(): number {
    return this.#normalBias
  }

  set normalBias(value: number) {
    this.#normalBias = value
    if (this.isActive) this.updateShadowProperty('normalBias', this.normalBias)
  }

  init() {
    if (!this.depthComparisonSampler) {
      const samplerExists = this.renderer.samplers.find((sampler) => sampler.name === 'depthComparisonSampler')

      this.depthComparisonSampler =
        samplerExists ||
        new Sampler(this.renderer, {
          label: 'Depth comparison sampler',
          name: 'depthComparisonSampler',
          // we do not want to repeat the shadows
          addressModeU: 'clamp-to-edge',
          addressModeV: 'clamp-to-edge',
          compare: 'less',
          minFilter: 'linear',
          magFilter: 'linear',
          type: 'comparison',
        })
    }

    this.setDepthTexture()

    if (!this.depthPassTarget) {
      this.setDepthPassTarget()
    }

    if (this.#depthPassTaskID === null) {
      this.setDepthPass()
    }

    this.updateShadowProperty('isActive', 1)
  }

  onDepthTextureSizeChanged() {
    this.setDepthTexture()
  }

  setDepthTexture() {
    if (
      this.depthTexture &&
      (this.depthTexture.size.width !== this.depthTextureSize.x ||
        this.depthTexture.size.height !== this.depthTextureSize.y)
    ) {
      this.depthTexture.options.fixedSize.width = this.depthTextureSize.x
      this.depthTexture.size.width = this.depthTextureSize.x
      this.depthTexture.options.fixedSize.height = this.depthTextureSize.y
      this.depthTexture.size.height = this.depthTextureSize.y
      this.depthTexture.createTexture()

      if (this.depthPassTarget) {
        this.depthPassTarget.resize()
      }
    } else if (!this.depthTexture) {
      this.createDepthTexture()
    }
  }

  createDepthTexture() {
    this.depthTexture = new Texture(this.renderer, {
      label: 'Shadow depth texture ' + this.index,
      name: 'shadowDepthTexture' + this.index,
      type: 'depth',
      format: this.depthTextureFormat,
      sampleCount: this.sampleCount,
      fixedSize: {
        width: this.depthTextureSize.x,
        height: this.depthTextureSize.y,
      },
    })
  }

  setDepthPassTarget() {
    this.depthPassTarget = new RenderTarget(this.renderer, {
      label: 'Depth pass render target ' + this.constructor.name + ' ' + this.index,
      useColorAttachments: false,
      depthTexture: this.depthTexture,
      sampleCount: this.sampleCount,
    })
  }

  updateShadowProperty(propertyKey: string, value: Mat4 | number) {
    if (this.rendererBinding) {
      if (value instanceof Mat4) {
        for (let i = 0; i < value.elements.length; i++) {
          this.rendererBinding.bindings[this.index].inputs[propertyKey].value[i] = value.elements[i]
        }

        this.rendererBinding.bindings[this.index].inputs[propertyKey].shouldUpdate = true
      } else {
        this.rendererBinding.bindings[this.index].inputs[propertyKey].value = value
      }

      this.renderer.shouldUpdateCameraLightsBindGroup()
    }
  }

  setDepthPass() {
    // add the depth pass (rendered each tick before our main scene)
    this.#depthPassTaskID = this.depthPassTask()
  }

  depthPassTask(): number {
    return this.renderer.onBeforeRenderScene.add(
      (commandEncoder) => {
        if (!this.meshes.size) return

        // assign depth material to meshes
        this.meshes.forEach((mesh) => {
          mesh.useMaterial(this.depthMaterials.get(mesh.uuid))
        })

        // reset renderer current pipeline
        this.renderer.pipelineManager.resetCurrentPipeline()

        // begin depth pass
        const depthPass = commandEncoder.beginRenderPass(this.depthPassTarget.renderPass.descriptor)

        // render meshes with their depth material
        this.meshes.forEach((mesh) => {
          if (mesh.ready) mesh.render(depthPass)
        })

        depthPass.end()

        // reset depth meshes material to use the original
        // so the scene renders them normally
        this.meshes.forEach((mesh) => {
          mesh.useMaterial(this.materials.get(mesh.uuid))
        })

        // reset renderer current pipeline again
        this.renderer.pipelineManager.resetCurrentPipeline()
      },
      {
        order: this.index,
      }
    )
  }

  getDefaultShadowDepthVs(index = 0) {
    return getDefaultShadowDepthVs(index)
  }

  getDefaultShadowDepthFs(): boolean | Record<'code', string> {
    return false // we do not need to output to a fragment shader unless we do late Z writing
  }

  patchShadowCastingMeshParams(mesh: ProjectedMesh, parameters: ProjectedMeshParameters = {}) {
    if (parameters.bindings) {
      parameters.bindings = [mesh.material.getBufferBindingByName('matrices'), ...parameters.bindings]
    } else {
      parameters.bindings = [mesh.material.getBufferBindingByName('matrices')]
    }
  }

  addShadowCastingMesh(mesh: ProjectedMesh, parameters: ProjectedMeshParameters = {}) {
    mesh.options.castShadows = true

    if (!parameters.shaders) {
      parameters.shaders = {
        vertex: {
          code: this.getDefaultShadowDepthVs(this.index),
        },
        fragment: this.getDefaultShadowDepthFs(),
      }
    }

    parameters = { ...mesh.material.options.rendering, ...parameters }

    // explicitly set empty output targets
    // we just want to write to the depth texture
    parameters.targets = []

    parameters.sampleCount = this.sampleCount
    parameters.depthFormat = this.depthTextureFormat

    this.patchShadowCastingMeshParams(mesh, parameters)

    this.materials.set(mesh.uuid, mesh.material)

    if (this.depthMaterials.get(mesh.uuid)) {
      this.depthMaterials.get(mesh.uuid).destroy()
      this.depthMaterials.delete(mesh.uuid)
    }

    this.depthMaterials.set(
      mesh.uuid,
      new RenderMaterial(this.renderer, {
        label: mesh.options.label + ' depth render material',
        ...parameters,
      })
    )

    this.meshes.set(mesh.uuid, mesh)
  }

  removeMesh(mesh: ProjectedMesh) {
    const depthMaterial = this.depthMaterials.get(mesh.uuid)

    if (depthMaterial) {
      depthMaterial.destroy()
      this.depthMaterials.delete(mesh.uuid)
    }

    this.meshes.delete(mesh.uuid)
  }

  destroy() {
    this.updateShadowProperty('isActive', 0)

    if (this.#depthPassTaskID !== null) {
      this.renderer.onBeforeRenderScene.remove(this.#depthPassTaskID)
      this.#depthPassTaskID = null
    }

    this.meshes.forEach((mesh) => this.removeMesh(mesh))
    this.materials = new Map()
    this.depthMaterials = new Map()
    this.meshes = new Map()

    this.depthPassTarget?.destroy()
    this.depthTexture?.destroy()
  }
}
