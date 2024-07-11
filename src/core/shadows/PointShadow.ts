import { Shadow, ShadowBaseParams } from './Shadow'
import { CameraRenderer } from '../renderers/utils'
import { Vec2 } from '../../math/Vec2'
import { Mat4 } from '../../math/Mat4'
import { Vec3 } from '../../math/Vec3'
import { Texture } from '../textures/Texture'
import { ProjectedMesh } from '../renderers/GPURenderer'
import { ProjectedMeshParameters } from '../meshes/mixins/ProjectedMeshBaseMixin'
import { getDefaultPointShadowDepthFs, getDefaultPointShadowDepthVs } from '../shaders/chunks/utils/shadows'
import { PointLight } from '../lights/PointLight'
import { Input } from '../../types/BindGroups'

export interface PointShadowParams extends ShadowBaseParams {
  camera?: { near: number; far: number }
}

export const pointShadowStruct: Record<string, Input> = {
  isActive: {
    type: 'i32',
    value: 0,
  },
  face: {
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
  cameraNear: {
    type: 'f32',
    value: 0,
  },
  cameraFar: {
    type: 'f32',
    value: 0,
  },
  projectionMatrix: {
    type: 'mat4x4f',
    value: new Float32Array(16),
  },
  viewMatrices: {
    type: 'array<mat4x4f>',
    value: new Float32Array(16 * 6),
  },
}

export class PointShadow extends Shadow {
  light: PointLight

  options: PointShadowParams

  viewMatrices: Mat4[]
  cubeDirections: Vec3[]
  #tempCubeDirection: Vec3
  cubeUps: Vec3[]

  projectionMatrix: Mat4

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
        near: 0.1,
        far: light.range || 150,
      },
    } = {} as PointShadowParams
  ) {
    super(renderer, { light, intensity, bias, normalBias, depthTextureSize, depthTextureFormat })

    this.options = {
      ...this.options,
      camera,
    }

    this.rendererBinding = this.renderer.bindings.pointShadows

    this.viewMatrices = []

    this.cubeDirections = [
      new Vec3(-1, 0, 0),
      new Vec3(1, 0, 0),
      new Vec3(0, -1, 0),
      new Vec3(0, 1, 0),
      new Vec3(0, 0, -1),
      new Vec3(0, 0, 1),
    ]

    this.#tempCubeDirection = new Vec3()

    this.cubeUps = [
      new Vec3(0, -1, 0),
      new Vec3(0, -1, 0),
      new Vec3(0, 0, 1),
      new Vec3(0, 0, -1),
      new Vec3(0, -1, 0),
      new Vec3(0, -1, 0),
    ]

    // TODO change near/far
    this.updateProjectionMatrix()

    for (let i = 0; i < 6; i++) {
      this.viewMatrices.push(new Mat4())
    }
  }

  init() {
    super.init()
    this.updateShadowProperty('projectionMatrix', this.projectionMatrix)

    this.rendererBinding.bindings[this.index].inputs.cameraNear.value = this.options.camera.near
    this.rendererBinding.bindings[this.index].inputs.cameraFar.value = this.options.camera.far
  }

  updateProjectionMatrix() {
    this.projectionMatrix = new Mat4().makePerspective({
      ...this.options.camera,
      fov: 90,
      aspect: this.depthTextureSize.x / this.depthTextureSize.y, // TODO
    })
  }

  // TODO
  updateViewMatrices(position = new Vec3()) {
    if (this.isActive) {
      for (let i = 0; i < 6; i++) {
        this.#tempCubeDirection.copy(this.cubeDirections[i]).add(position)
        this.viewMatrices[i].makeView(position, this.#tempCubeDirection, this.cubeUps[i])

        for (let j = 0; j < 16; j++) {
          this.rendererBinding.bindings[this.index].inputs.viewMatrices.value[i * 16 + j] =
            this.viewMatrices[i].elements[j]
        }
      }

      this.rendererBinding.bindings[this.index].inputs.viewMatrices.shouldUpdate = true
    }
  }

  onDepthTextureSizeChanged() {
    this.updateProjectionMatrix()
    this.updateShadowProperty('projectionMatrix', this.projectionMatrix)

    super.onDepthTextureSizeChanged()
  }

  createDepthTexture() {
    this.depthTexture = new Texture(this.renderer, {
      label: 'Point shadow cube depth texture ' + this.index,
      name: 'pointShadowCubeDepthTexture' + this.index,
      type: 'depth',
      format: this.depthTextureFormat,
      viewDimension: 'cube',
      sampleCount: this.sampleCount,
      fixedSize: {
        width: this.depthTextureSize.x,
        height: this.depthTextureSize.y,
      },
    })
  }

  getDefaultShadowDepthVs() {
    return getDefaultPointShadowDepthVs(this.index)
  }

  getDefaultShadowDepthFs() {
    return {
      code: getDefaultPointShadowDepthFs(this.index),
    }
  }

  patchShadowCastingMeshParams(mesh: ProjectedMesh, parameters: ProjectedMeshParameters = {}) {
    if (parameters.bindings) {
      parameters.bindings = [mesh.material.getBufferBindingByName('matrices'), ...parameters.bindings]
    } else {
      parameters.bindings = [mesh.material.getBufferBindingByName('matrices')]
    }
  }

  depthPassTask(): number {
    return this.renderer.onBeforeCommandEncoderCreation.add(
      () => {
        if (!this.meshes.size) return

        // assign depth material to meshes
        this.meshes.forEach((mesh) => {
          mesh.useMaterial(this.depthMaterials.get(mesh.uuid))
        })

        for (let i = 0; i < 6; i++) {
          const commandEncoder = this.renderer.device.createCommandEncoder()

          // reset renderer current pipeline
          this.renderer.pipelineManager.resetCurrentPipeline()

          this.depthPassTarget.renderPass.setRenderPassDescriptor(
            this.depthTexture.texture.createView({
              label: this.depthTexture.texture.label + ' cube face view ' + i,
              dimension: '2d',
              arrayLayerCount: 1,
              baseArrayLayer: i,
            })
          )

          // update face index
          this.rendererBinding.bindings[this.index].inputs.face.value = i
          // since we're not inside the main loop,
          // we need to explicitly update the renderer camera & lights bind group
          this.renderer.cameraLightsBindGroup.update()

          // begin depth pass
          const depthPass = commandEncoder.beginRenderPass(this.depthPassTarget.renderPass.descriptor)

          // render meshes with their depth material
          this.meshes.forEach((mesh) => {
            if (mesh.ready) {
              mesh.render(depthPass)
            }
          })

          depthPass.end()

          const commandBuffer = commandEncoder.finish()
          this.renderer.device.queue.submit([commandBuffer])
        }

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

  destroy() {
    super.destroy()
  }
}
