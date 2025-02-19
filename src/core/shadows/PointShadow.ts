import { Shadow, ShadowBaseParams, shadowStruct } from './Shadow'
import { CameraRenderer } from '../renderers/utils'
import { Mat4 } from '../../math/Mat4'
import { Vec3 } from '../../math/Vec3'
import { Texture } from '../textures/Texture'
import { PerspectiveCamera } from '../cameras/PerspectiveCamera'
import { PointLight } from '../lights/PointLight'
import { Input } from '../../types/BindGroups'
import { RenderMaterialParams, ShaderOptions } from '../../types/Materials'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { BufferBinding } from '../bindings/BufferBinding'
import { VertexShaderInputBaseParams } from '../shaders/full/vertex/get-vertex-shader-code'
import { getDefaultPointShadowDepthVs } from '../shaders/full/vertex/get-default-point-shadow-depth-vertex-shader-code'
import { getDefaultPointShadowDepthFs } from '../shaders/full/fragment/get-default-point-shadow-depth-fragment-code'
import { Mesh } from '../meshes/Mesh'

/**
 * Base parameters used to create a {@link PointShadow}.
 */
export interface PointShadowParams extends ShadowBaseParams {
  /** {@link PointLight} used to create the {@link PointShadow}. */
  light: PointLight
}

/** @ignore */
export const pointShadowStruct: Record<string, Input> = {
  ...shadowStruct,
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

/**
 * Create a shadow map from a {@link PointLight} by rendering to a depth cube texture using an array of view {@link Mat4} based on the {@link PointLight} position and a {@link PerspectiveCamera#projectionMatrix | Camera projectionMatrix}.
 *
 * This type of shadow is more expensive than {@link core/shadows/DirectionalShadow.DirectionalShadow | DirectionalShadow} since its scene needs to be rendered 6 times to each face of a depth cube texture instead of once.
 */
export class PointShadow extends Shadow {
  /** {@link PointLight} associated with this {@link PointShadow}. */
  light: PointLight

  /** {@link PerspectiveCamera} to use for shadow calculations. */
  camera: PerspectiveCamera

  /** Options used to create this {@link PointShadow}. */
  options: PointShadowParams

  /** Array of {@link Vec3} representing each cube face up directions to compute the #viewMatrices. */
  cubeUps: Vec3[]
  /** Array of {@link Vec3} representing each cube face directions to compute the #viewMatrices. */
  cubeDirections: Vec3[]
  /**
   * {@link Vec3} used to calculate the actual current direction based on the {@link PointLight} position.
   * @private
   */
  #tempCubeDirection: Vec3

  /**
   * Array of {@link Mat4} view matrices to use for cube map faces rendering.
   * @private
   */
  #viewMatrices: Mat4[]

  /**
   * PointShadow constructor
   * @param renderer - {@link CameraRenderer} used to create this {@link PointShadow}.
   * @param parameters - {@link PointShadowParams | parameters} used to create this {@link PointShadow}.
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
    } = {} as PointShadowParams
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

    this.#viewMatrices = []

    for (let i = 0; i < 6; i++) {
      this.#viewMatrices.push(new Mat4())
    }

    this.camera = new PerspectiveCamera({
      fov: 90,
      near: 0.1,
      far: this.light.range !== 0 ? this.light.range : 150,
      width: this.depthTextureSize.x,
      height: this.depthTextureSize.y,
      onMatricesChanged: () => {
        this.onProjectionMatrixChanged()
      },
    })

    // override view matrix onUpdate to compute all 6 view matrices
    this.camera.matrices.view.onUpdate = () => {
      this.updateViewMatrices()
    }

    // force camera position to 0
    this.camera.position.set(0)
    this.camera.parent = this.light
  }

  /**
   * Set or reset this {@link PointShadow} {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
   */
  setRendererBinding() {
    this.rendererBinding = this.renderer.bindings.pointShadows
  }

  /**
   * Set the {@link depthComparisonSampler}, {@link depthTexture}, {@link depthPassTarget}, compute the {@link PointShadow#camera.projectionMatrix | camera projection matrix} and start rendering to the shadow map.
   */
  init() {
    super.init()
    this.onProjectionMatrixChanged()
  }

  /**
   * Resend all properties to the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}. Called when the maximum number of corresponding {@link PointLight} has been overflowed or when the {@link renderer} has changed.
   */
  reset() {
    this.setRendererBinding()
    super.reset()

    this.onProjectionMatrixChanged()
    this.onViewMatricesChanged()
  }

  /**
   * Called whenever the {@link PerspectiveCamera#projectionMatrix | camera projectionMatrix} changed (or on reset) to update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
   */
  onProjectionMatrixChanged() {
    this.onPropertyChanged('projectionMatrix', this.camera.projectionMatrix)
    this.onPropertyChanged('cameraNear', this.camera.near)
    this.onPropertyChanged('cameraFar', this.camera.far)
  }

  /**
   * Update the #viewMatrices and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
   */
  updateViewMatrices() {
    for (let i = 0; i < 6; i++) {
      this.#tempCubeDirection.copy(this.cubeDirections[i]).add(this.camera.actualPosition)
      this.camera.viewMatrix.makeView(this.camera.actualPosition, this.#tempCubeDirection, this.cubeUps[i])
      this.#viewMatrices[i].copy(this.camera.viewMatrix)

      for (let j = 0; j < 16; j++) {
        this.rendererBinding.childrenBindings[this.index].inputs.viewMatrices.value[i * 16 + j] =
          this.#viewMatrices[i].elements[j]
      }
    }

    this.onViewMatricesChanged()
  }

  /**
   * Called whenever the #viewMatrices changed (or on reset) to update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
   */
  onViewMatricesChanged() {
    this.rendererBinding.childrenBindings[this.index].inputs.viewMatrices.shouldUpdate = true
  }

  /**
   * Set or resize the {@link depthTexture} and eventually resize the {@link depthPassTarget} as well.
   */
  setDepthTexture() {
    if (
      this.depthTexture &&
      (this.depthTexture.size.width !== this.depthTextureSize.x ||
        this.depthTexture.size.height !== this.depthTextureSize.y)
    ) {
      const maxSize = Math.max(this.depthTextureSize.x, this.depthTextureSize.y)
      this.depthTexture.options.fixedSize.width = maxSize
      this.depthTexture.options.fixedSize.height = maxSize
      this.depthTexture.size.width = maxSize
      this.depthTexture.size.height = maxSize
      this.depthTexture.createTexture()

      if (this.depthPassTarget) {
        this.depthPassTarget.resize()
      }
    } else if (!this.depthTexture) {
      this.createDepthTexture()
    }
  }

  /**
   * Create the cube {@link depthTexture}.
   */
  createDepthTexture() {
    const maxSize = Math.max(this.depthTextureSize.x, this.depthTextureSize.y)
    this.depthTexture = new Texture(this.renderer, {
      label: `${this.light.options.label} (index: ${this.index}) shadow depth texture`,
      name: 'pointShadowCubeDepthTexture' + this.index,
      type: 'depth',
      format: this.depthTextureFormat,
      viewDimension: 'cube',
      sampleCount: this.sampleCount,
      fixedSize: {
        width: maxSize,
        height: maxSize,
      },
      autoDestroy: false, // do not destroy when removing a mesh
    })
  }

  /**
   * Clear the content of the depth texture. Called whenever the {@link castingMeshes} {@link Map} is empty after having removed a mesh, or if all {@link castingMeshes} `visible` properties are `false`.
   */
  clearDepthTexture() {
    if (!this.depthTexture || !this.depthTexture.texture) return

    // Create a command encoder
    const commandEncoder = this.renderer.device.createCommandEncoder()
    !this.renderer.production &&
      commandEncoder.pushDebugGroup(`Clear ${this.depthTexture.texture.label} command encoder`)

    for (let i = 0; i < 6; i++) {
      const view = this.depthTexture.texture.createView({
        label: 'Clear ' + this.depthTexture.texture.label + ' cube face view',
        dimension: '2d',
        arrayLayerCount: 1,
        baseArrayLayer: i,
      })

      // Define the render pass descriptor
      const renderPassDescriptor: GPURenderPassDescriptor = {
        colorAttachments: [],
        depthStencilAttachment: {
          view,
          depthLoadOp: 'clear', // Clear the depth attachment
          depthClearValue: 1.0, // Clear to the maximum depth (farthest possible depth)
          depthStoreOp: 'store', // Store the cleared depth
        },
      }

      // Begin the render pass
      const passEncoder = this.depthPassTarget.renderPass.beginRenderPass(commandEncoder, renderPassDescriptor)
      // End the render pass (we don't need to draw anything, just clear)
      passEncoder.end()
    }

    // Submit the command buffer
    !this.renderer.production && commandEncoder.popDebugGroup()
    this.renderer.device.queue.submit([commandEncoder.finish()])
  }

  /**
   * Render the depth pass. Called by the {@link CameraRenderer#scene | scene} when rendering the {@link depthPassTarget} render pass entry, or by the {@link renderOnce} method.<br />
   * - For each face of the depth cube texture:
   *   - Set the {@link depthPassTarget} descriptor depth texture view to our depth cube texture current face.
   *   - Render all the depth meshes.
   * @param commandEncoder - {@link GPUCommandEncoder} to use.
   */
  render(commandEncoder: GPUCommandEncoder) {
    // TODO once multi-view is available,
    // we'll be able to use a single render pass
    // to render to all 6 faces of the cube depth map
    // see https://kidrigger.dev/post/vulkan-render-to-cubemap-using-multiview/
    if (!this.castingMeshes.size) return

    let shouldRender = false
    for (const [_uuid, mesh] of this.castingMeshes) {
      if (mesh.visible) {
        shouldRender = true
        break
      }
    }

    // no visible meshes to draw
    if (!shouldRender) {
      this.clearDepthTexture()
      return
    }

    for (let face = 0; face < 6; face++) {
      this.depthPassTarget.renderPass.setRenderPassDescriptor(
        this.depthTexture.texture.createView({
          label: this.depthTexture.texture.label + ' cube face view ' + face,
          dimension: '2d',
          arrayLayerCount: 1,
          baseArrayLayer: face,
        })
      )

      this.renderDepthPass(commandEncoder, face)
    }

    // reset renderer current pipeline again
    this.renderer.pipelineManager.resetCurrentPipeline()
  }

  /**
   * Render all the {@link castingMeshes} into the {@link depthPassTarget}. Before rendering them, we swap the cube face bind group with the {@link CameraRenderer.pointShadowsCubeFaceBindGroups | renderer pointShadowsCubeFaceBindGroups} at the index containing the current face onto which we'll draw.
   * @param commandEncoder - {@link GPUCommandEncoder} to use.
   * @param face - Current cube map face onto which we're drawing.
   */
  renderDepthPass(commandEncoder: GPUCommandEncoder, face: number = 0) {
    // reset renderer current pipeline
    this.renderer.pipelineManager.resetCurrentPipeline()

    // begin depth pass
    const depthPass = commandEncoder.beginRenderPass(this.depthPassTarget.renderPass.descriptor)

    if (!this.renderer.production)
      depthPass.pushDebugGroup(`${this.constructor.name} (index: ${this.index}): depth pass for face ${face}`)

    // render depth meshes
    for (const [uuid, depthMesh] of this.depthMeshes) {
      // bail if original mesh is not visible
      if (!this.castingMeshes.get(uuid)?.visible) {
        continue
      }

      // set cube face bind group index
      const cubeFaceBindGroupIndex = depthMesh.material.bindGroups.length - 1
      this.renderer.pointShadowsCubeFaceBindGroups[face].setIndex(cubeFaceBindGroupIndex)
      // swap with bind group containing current face
      depthMesh.material.bindGroups[cubeFaceBindGroupIndex] = this.renderer.pointShadowsCubeFaceBindGroups[face]

      depthMesh.render(depthPass)
    }

    if (!this.renderer.production) depthPass.popDebugGroup()

    depthPass.end()
  }

  /**
   * Get the default depth pass vertex shader for this {@link PointShadow}.
   * parameters - {@link VertexShaderInputBaseParams} used to compute the output `worldPosition` and `normal` vectors.
   * @returns - Depth pass vertex shader.
   */
  getDefaultShadowDepthVs({ bindings = [], geometry }: VertexShaderInputBaseParams): ShaderOptions {
    return {
      /** Returned code. */
      code: getDefaultPointShadowDepthVs(this.index, { bindings, geometry }),
    }
  }

  /**
   * Get the default depth pass {@link types/Materials.ShaderOptions | fragment shader options} for this {@link PointShadow}.
   * @returns - A {@link types/Materials.ShaderOptions | ShaderOptions} with the depth pass fragment shader.
   */
  getDefaultShadowDepthFs(): ShaderOptions {
    return {
      /** Returned code. */
      code: getDefaultPointShadowDepthFs(this.index),
    }
  }

  /**
   * Patch the given {@link Mesh} material parameters to create the depth mesh. Here we'll be adding the first {@link CameraRenderer.pointShadowsCubeFaceBindGroups | renderer pointShadowsCubeFaceBindGroups} bind group containing the face index onto which we'll be drawing. This bind group will be swapped when rendering using {@link renderDepthPass}.
   * @param mesh - original {@link Mesh} to use.
   * @param parameters - Optional additional parameters to use for the depth mesh.
   * @returns - Patched parameters.
   */
  patchShadowCastingMeshParams(mesh: Mesh, parameters: RenderMaterialParams = {}): RenderMaterialParams {
    if (!parameters.bindGroups) {
      parameters.bindGroups = []
    }

    parameters.bindGroups = [...parameters.bindGroups, this.renderer.pointShadowsCubeFaceBindGroups[0]]

    return super.patchShadowCastingMeshParams(mesh, parameters)
  }
}
