import { CameraRenderer, isCameraRenderer } from '../../renderers/utils'
import { DOMFrustum } from '../../DOM/DOMFrustum'
import {
  MeshBaseClass,
  MeshBaseMixin,
  MeshBaseOptions,
  MeshBaseParams,
  MeshBaseRenderParams,
  MixinConstructor,
} from './MeshBaseMixin'
import { GPUCurtains } from '../../../curtains/GPUCurtains'
import { DOMElementBoundingRect, RectCoords } from '../../DOM/DOMElement'
import { RenderMaterialParams, ShaderOptions } from '../../../types/Materials'
import { ProjectedObject3D } from '../../objects3D/ProjectedObject3D'
import { Vec3 } from '../../../math/Vec3'
import { RenderBundle } from '../../renderPasses/RenderBundle'
import { BufferBinding, BufferBindingParams } from '../../bindings/BufferBinding'

import { getDefaultProjectedVertexShaderCode } from '../../shaders/full/vertex/get-default-projected-vertex-shader-code'
import { getDefaultNormalFragmentCode } from '../../shaders/full/fragment/get-default-normal-fragment-code'
import { getPCFDirectionalShadowContribution } from '../../shaders/chunks/fragment/head/get-PCF-directional-shadow-contribution'
import { getPCFDirectionalShadows } from '../../shaders/chunks/fragment/head/get-PCF-directional-shadows'
import { getPCFPointShadowContribution } from '../../shaders/chunks/fragment/head/get-PCF-point-shadow-contribution'
import { getPCFPointShadows } from '../../shaders/chunks/fragment/head/get-PCF-point-shadows'
import { Texture } from '../../textures/Texture'
import { getPCFSpotShadows } from '../../shaders/chunks/fragment/head/get-PCF-spot-shadows'
import { getPCFSpotShadowContribution } from '../../shaders/chunks/fragment/head/get-PCF-spot-shadow-contribution'
import { getPCFBaseShadowContribution } from '../../shaders/chunks/fragment/head/get-PCF-base-shadow-contribution'
import { BindGroup } from '../../bindGroups/BindGroup'

/** Define all possible frustum culling checks. */
export type FrustumCullingCheck = 'OBB' | 'sphere' | false

/**
 * Base parameters used to create a ProjectedMesh
 */
export interface ProjectedMeshBaseParams {
  /** Frustum culling check to use. Accepts `OBB`, `sphere` or a boolean. Default to `OBB`. When set to `true`, `OBB` is used. */
  frustumCulling?: FrustumCullingCheck
  /** Margins (in pixels) to applied to the {@link ProjectedMeshBaseClass#domFrustum | DOM Frustum} to determine if this ProjectedMesh should be frustum culled or not. */
  DOMFrustumMargins?: RectCoords

  /** Whether the mesh should receive the shadows from shadow casting lights. If set to `true`, the lights shadow map textures and sampler will be added to the material, and some shader chunks helpers will be added. Default to `false`. */
  receiveShadows?: boolean
  /** Whether the mesh should cast shadows from shadow casting lights. If set to `true`, the mesh will be automatically added to all shadow maps. If you want to cast only specific shadows, see {@link core/shadows/Shadow.Shadow#addShadowCastingMesh | shadow's addShadowCastingMesh} method. Default to `false`. */
  castShadows?: boolean

  /** Whether the mesh should be considered as transmissive, like glass or transparent plastic. Will be rendered after the non transmissive meshes and have the {@link CameraRenderer#transmissionTarget | camera renderer transmissionTarget} texture and sampler properties attached to it to handle transmission effect. */
  transmissive?: boolean
}

/** Parameters used to create a ProjectedMesh */
export interface ProjectedMeshParameters extends MeshBaseParams, ProjectedMeshBaseParams {}

/** Parameters used to create a Projected Render Material */
export interface ProjectedRenderMaterialParams extends RenderMaterialParams, ProjectedMeshBaseParams {}

/** @const - Default ProjectedMesh parameters to merge with user defined parameters */
const defaultProjectedMeshParams: ProjectedMeshBaseParams = {
  // frustum culling and visibility
  frustumCulling: 'OBB',
  DOMFrustumMargins: {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  receiveShadows: false,
  castShadows: false,
  transmissive: false,
}

/** Base options used to create this ProjectedMesh */
export interface ProjectedMeshBaseOptions extends MeshBaseOptions, ProjectedMeshBaseParams {}

/**
 * This class describes the properties and methods to set up a Projected Mesh (i.e. a basic {@link MeshBaseClass | Mesh} with {@link ProjectedObject3D} transformations matrices and a {@link core/cameras/Camera.Camera | Camera} to use for projection), implemented in the {@link ProjectedMeshBaseMixin}:
 * - Handle the frustum culling (check if the {@link ProjectedObject3D} currently lies inside the {@link core/cameras/Camera.Camera | Camera} frustum)
 * - Add callbacks for when the Mesh enters or leaves the {@link core/cameras/Camera.Camera | Camera} frustum
 */
export declare class ProjectedMeshBaseClass extends MeshBaseClass {
  /** The {@link CameraRenderer} used */
  renderer: CameraRenderer
  /** The ProjectedMesh {@link DOMFrustum} class object */
  domFrustum: DOMFrustum
  /** Frustum culling check to use. Accepts `OBB`, `sphere` or a boolean. Default to `OBB`. When set to `true`, `OBB` is used. */
  frustumCulling: FrustumCullingCheck
  /** Margins (in pixels) to applied to the {@link ProjectedMeshBaseClass#domFrustum | DOM Frustum} to determine if this ProjectedMesh should be frustum culled or not */
  DOMFrustumMargins: RectCoords

  /** Options used to create this {@link ProjectedMeshBaseClass} */
  options: ProjectedMeshBaseOptions

  // callbacks
  /** function assigned to the {@link onReEnterView} callback */
  _onReEnterViewCallback: () => void
  /** function assigned to the {@link onLeaveView} callback */
  _onLeaveViewCallback: () => void

  /**
   * {@link ProjectedMeshBaseClass} constructor
   * @param renderer - our {@link CameraRenderer} class object
   * @param element - a DOM HTML Element that can be bound to a Mesh
   * @param parameters - {@link ProjectedMeshParameters | Projected Mesh base parameters}
   */
  constructor(renderer: CameraRenderer, element: HTMLElement | null, parameters: ProjectedMeshParameters)

  /**
   * Set or reset this Mesh {@link CameraRenderer | renderer}.
   * @param renderer - New {@link CameraRenderer} or {@link GPUCurtains} instance to use.
   */
  setRenderer(renderer: CameraRenderer | GPUCurtains): void

  /**
   * Assign or remove a {@link RenderBundle} to this Mesh.
   * @param renderBundle - the {@link RenderBundle} to assign or null if we want to remove the current {@link RenderBundle}.
   * @param updateScene - Whether to remove and then re-add the Mesh from the {@link core/scenes/Scene.Scene | Scene} or not.
   */
  setRenderBundle(renderBundle?: RenderBundle | null, updateScene?: boolean): void

  /**
   * Reset the {@link BufferBinding | matrices buffer binding} parent and offset and tell its bind group to update.
   * @param offset - New offset to use in the parent {@link RenderBundle#binding | RenderBundle binding}.
   */
  patchRenderBundleBinding(offset?: number): void

  /**
   * Set default shaders if one or both of them are missing
   */
  setShaders(): void

  /**
   * Set the Mesh frustum culling
   */
  setDOMFrustum(): void

  /**
   * Get whether the Mesh is currently in the {@link CameraRenderer#camera | camera} frustum.
   * @readonly
   */
  get isInFrustum(): boolean

  /**
   * Set a Mesh matrices uniforms inputs then call {@link MeshBaseClass} super method
   * @param meshParameters - {@link RenderMaterialParams | RenderMaterial parameters}
   */
  setMaterial(meshParameters: ProjectedRenderMaterialParams): void

  /**
   * Get the visible property value
   */
  get visible(): boolean

  /**
   * Set the visible property value
   * @param value - new visibility value
   */
  set visible(value: boolean)

  /**
   * Resize our Mesh
   * @param boundingRect - the new bounding rectangle
   */
  resize(boundingRect: DOMElementBoundingRect | null): void

  /**
   * Apply scale and resize textures
   */
  applyScale(): void

  /**
   * Get our {@link DOMFrustum} projected bounding rectangle
   * @readonly
   */
  get projectedBoundingRect(): DOMElementBoundingRect

  /**
   * Callback to execute when a Mesh is reentering the view frustum.
   * @param callback - callback to run when {@link ProjectedMeshBaseClass} is reentering the view frustum
   * @returns - our Mesh
   */
  onReEnterView: (callback: () => void) => ProjectedMeshBaseClass

  /**
   * Callback to execute when a Mesh is leaving the view frustum.
   * @param callback - callback to run when {@link ProjectedMeshBaseClass} is leaving the view frustum
   * @returns - our Mesh
   */
  onLeaveView: (callback: () => void) => ProjectedMeshBaseClass

  /**
   * Get the geometry bounding sphere in clip space.
   * @readonly
   */
  get clipSpaceBoundingSphere(): {
    /** Center of the bounding sphere. */
    center: Vec3
    /** Radius of the bounding sphere. */
    radius: number
  }

  /**
   * Check if the Mesh lies inside the {@link CameraRenderer#camera | camera} view frustum or not.
   */
  checkFrustumCulling(): void

  /**
   * Tell our matrices bindings to update if needed and call {@link MeshBaseClass#onBeforeRenderPass | Mesh base onBeforeRenderPass} super.
   */
  onBeforeRenderPass(): void

  /**
   * Only render the Mesh if it is in view frustum.
   * Since render() is actually called before onRenderPass(), we are sure to have fresh frustum bounding rectangle values here.
   * @param pass - current render pass
   */
  onRenderPass(pass: GPURenderPassEncoder): void
}

/**
 * Used to add the properties and methods defined in {@link ProjectedMeshBaseClass} to the {@link MeshBaseClass} and mix it with a given Base of type {@link ProjectedObject3D} or {@link curtains/objects3D/DOMObject3D.DOMObject3D | DOMObject3D}.
 * @param Base - the class to mix onto, should be of {@link ProjectedObject3D} or {@link curtains/objects3D/DOMObject3D.DOMObject3D | DOMObject3D} type
 * @returns - the mixed classes, creating a Projected Mesh.
 */
function ProjectedMeshBaseMixin<TBase extends MixinConstructor<ProjectedObject3D>>(
  Base: TBase
): MixinConstructor<ProjectedMeshBaseClass> & TBase {
  /**
   * ProjectedMeshBase defines our base properties and methods
   */
  return class ProjectedMeshBase extends MeshBaseMixin(Base) {
    /** The {@link CameraRenderer} used */
    renderer: CameraRenderer
    /** The ProjectedMesh {@link DOMFrustum} class object */
    domFrustum: DOMFrustum
    /** Frustum culling check to use. Accepts `OBB`, `sphere` or a boolean. Default to `OBB`. When set to `true`, `OBB` is used. */
    frustumCulling: FrustumCullingCheck
    /** Margins (in pixels) to applied to the {@link ProjectedMeshBaseClass#domFrustum | DOM Frustum} to determine if this ProjectedMesh should be frustum culled or not */
    DOMFrustumMargins: RectCoords

    /** Options used to create this {@link ProjectedMeshBaseClass} */
    options: ProjectedMeshBaseOptions

    // callbacks / events
    /** function assigned to the {@link onReEnterView} callback */
    _onReEnterViewCallback: () => void = () => {
      /* allow empty callback */
    }
    /** function assigned to the {@link onLeaveView} callback */
    _onLeaveViewCallback: () => void = () => {
      /* allow empty callback */
    }

    /**
     * ProjectedMeshBase constructor
     *
     * @typedef MeshBaseArrayParams
     * @type {array}
     * @property {(CameraRenderer|GPUCurtains)} 0 - our renderer class object
     * @property {(string|HTMLElement|null)} 1 - the DOM HTML Element that can be bound to a Mesh
     * @property {ProjectedMeshParameters} 2 - Projected Mesh parameters
     *
     * @param {MeshBaseArrayParams} params - our MeshBaseMixin parameters
     */
    constructor(...params: any[]) {
      super(
        params[0] as CameraRenderer | GPUCurtains,
        params[1] as HTMLElement | string,
        { ...defaultProjectedMeshParams, ...params[2], ...{ useProjection: true } } as ProjectedMeshParameters
      )

      let renderer = params[0]

      // force this mesh to use projection!
      const parameters = {
        ...defaultProjectedMeshParams,
        ...params[2],
        ...{ useProjection: true },
      } as ProjectedMeshParameters

      this.type = 'MeshTransformed'

      renderer = isCameraRenderer(renderer, parameters.label ? parameters.label + ' ' + this.type : this.type)

      this.renderer = renderer

      const { frustumCulling, DOMFrustumMargins, receiveShadows, castShadows, transmissive } = parameters

      this.options = {
        ...(this.options ?? {}), // merge possible lower options?
        frustumCulling,
        DOMFrustumMargins,
        receiveShadows,
        castShadows,
        transmissive,
      }

      if (this.options.castShadows) {
        this.renderer.shadowCastingLights.forEach((light) => {
          if (light.shadow.isActive) {
            light.shadow.addShadowCastingMesh(this)
          }
        })
      }

      this.setDOMFrustum()
    }

    /**
     * Set or reset this Mesh {@link renderer}.
     * @param renderer - New {@link CameraRenderer} or {@link GPUCurtains} instance to use.
     */
    setRenderer(renderer: CameraRenderer | GPUCurtains) {
      // if it casts shadows, remove depth mesh from old renderer
      if (this.renderer && this.options.castShadows) {
        this.renderer.shadowCastingLights.forEach((light) => {
          if (light.shadow.isActive) {
            light.shadow.removeMesh(this)
          }
        })
      }

      // recreate future renderer transmission target
      // and copy texture if needed
      if (this.options.transmissive) {
        renderer = isCameraRenderer(renderer, this.options.label + ' ' + renderer.type)
        renderer.createTransmissionTarget()
        let transmissiveTexture = this.material.textures.find(
          (texture) => texture.options.name === 'transmissionBackgroundTexture'
        )

        if (transmissiveTexture) {
          transmissiveTexture.copy(renderer.transmissionTarget.texture)
        }
      }

      super.setRenderer(renderer)

      // force update of new camera
      this.camera = this.renderer.camera

      if (this.options.castShadows) {
        this.renderer.shadowCastingLights.forEach((light) => {
          if (light.shadow.isActive) {
            light.shadow.addShadowCastingMesh(this)
          }
        })
      }
    }

    /**
     * Assign or remove a {@link RenderBundle} to this Mesh.
     * @param renderBundle - The {@link RenderBundle} to assign or null if we want to remove the current {@link RenderBundle}.
     * @param updateScene - Whether to remove and then re-add the Mesh from the {@link core/scenes/Scene.Scene | Scene} or not.
     */
    setRenderBundle(renderBundle: RenderBundle | null, updateScene = true) {
      // same render bundle? abort
      if (this.renderBundle && renderBundle && this.renderBundle.uuid === renderBundle.uuid) return

      const hasRenderBundle = !!this.renderBundle
      const bindGroup = this.material.getBindGroupByBindingName('matrices')
      const matrices = this.material.getBufferBindingByName('matrices') as BufferBinding

      if (this.renderBundle && !renderBundle && matrices.parent) {
        // if we did have a render bundle, reset the parent and bind group
        matrices.parent = null
        matrices.shouldResetBindGroup = true
        bindGroup.createBindingBuffer(matrices)
      }

      super.setRenderBundle(renderBundle, updateScene)

      if (this.renderBundle && this.renderBundle.binding) {
        // if we did not have a render bundle, but now we have one with a buffer
        // destroy current matrices binding
        if (hasRenderBundle) {
          bindGroup.destroyBufferBinding(matrices)
        }

        matrices.options.offset = this.renderBundle.meshes.size - 1
        matrices.parent = this.renderBundle.binding

        matrices.shouldResetBindGroup = true
      }
    }

    /**
     * Reset the {@link BufferBinding | matrices buffer binding} parent and offset and tell its bind group to update.
     * @param offset - New offset to use in the parent {@link RenderBundle#binding | RenderBundle binding}.
     */
    patchRenderBundleBinding(offset = 0) {
      const matrices = this.material.getBufferBindingByName('matrices') as BufferBinding

      matrices.options.offset = offset
      matrices.parent = this.renderBundle.binding

      matrices.shouldResetBindGroup = true
    }

    /* SHADERS */

    /**
     * Set default shaders if one or both of them are missing.
     * Can also patch the fragment shader if the mesh should receive shadows.
     */
    setShaders() {
      const { shaders } = this.options

      if (!shaders) {
        this.options.shaders = {
          vertex: {
            code: getDefaultProjectedVertexShaderCode,
            entryPoint: 'main',
          },
          fragment: {
            code: getDefaultNormalFragmentCode,
            entryPoint: 'main',
          },
        }
      } else {
        if (!shaders.vertex || !shaders.vertex.code) {
          shaders.vertex = {
            code: getDefaultProjectedVertexShaderCode,
            entryPoint: 'main',
          }
        }

        if (shaders.fragment === undefined || (shaders.fragment && !(shaders.fragment as ShaderOptions).code)) {
          shaders.fragment = {
            code: getDefaultNormalFragmentCode,
            entryPoint: 'main',
          }
        }
      }

      // add shadow receiving chunks to shaders
      // TODO what if we change the mesh renderer?
      if (this.options.receiveShadows) {
        this.renderer.shadowCastingLights.forEach((light) => {
          light.shadow.addShadowReceivingMesh(this)
        })

        const hasActiveShadows = this.renderer.shadowCastingLights.find((light) => light.shadow.isActive)

        if (hasActiveShadows && shaders.fragment) {
          shaders.fragment.code =
            getPCFBaseShadowContribution +
            getPCFDirectionalShadows(this.renderer) +
            getPCFDirectionalShadowContribution +
            getPCFPointShadows(this.renderer) +
            getPCFPointShadowContribution +
            getPCFSpotShadows(this.renderer) +
            getPCFSpotShadowContribution +
            shaders.fragment.code
        }
      }

      return shaders
    }

    /* GEOMETRY */

    /**
     * Set or update the Projected Mesh {@link Geometry}
     * @param geometry - new {@link Geometry} to use
     */
    useGeometry(geometry) {
      super.useGeometry(geometry)

      // if it casts shadows, update depth mesh geometry
      if (this.renderer && this.options.castShadows) {
        this.renderer.shadowCastingLights.forEach((light) => {
          if (light.shadow.isActive) {
            light.shadow.updateMeshGeometry(this, geometry)
          }
        })
      }

      // update DOM Frustum bounding box
      if (this.domFrustum) {
        this.domFrustum.boundingBox = this.geometry.boundingBox
      }

      // tell the model and projection matrices to update right away
      this.shouldUpdateMatrixStack()
    }

    /**
     * Set the Mesh frustum culling
     */
    setDOMFrustum() {
      this.domFrustum = new DOMFrustum({
        boundingBox: this.geometry?.boundingBox,
        modelViewProjectionMatrix: this.modelViewProjectionMatrix,
        containerBoundingRect: this.renderer.boundingRect,
        DOMFrustumMargins: this.options.DOMFrustumMargins,
        onReEnterView: () => {
          this._onReEnterViewCallback && this._onReEnterViewCallback()
        },
        onLeaveView: () => {
          this._onLeaveViewCallback && this._onLeaveViewCallback()
        },
      })

      this.DOMFrustumMargins = this.domFrustum.DOMFrustumMargins
      this.frustumCulling = this.options.frustumCulling
    }

    /**
     * Get whether the Mesh is currently in the {@link camera} frustum.
     * @readonly
     */
    get isInFrustum(): boolean {
      return this.domFrustum.isIntersecting
    }

    /* MATERIAL */

    /**
     * Hook used to clean up parameters before sending them to the material.
     * @param parameters - parameters to clean before sending them to the {@link core/materials/RenderMaterial.RenderMaterial | RenderMaterial}
     * @returns - cleaned parameters
     */
    cleanupRenderMaterialParameters(parameters: ProjectedRenderMaterialParams): MeshBaseRenderParams {
      // patch mesh parameters
      delete parameters.castShadows
      delete parameters.DOMFrustumMargins
      delete parameters.frustumCulling
      delete parameters.receiveShadows
      delete parameters.transmissive

      if (this.options.receiveShadows) {
        const depthTextures = []
        let depthSamplers = []

        this.renderer.shadowCastingLights.forEach((light) => {
          if (light.shadow.isActive) {
            depthTextures.push(light.shadow.depthTexture)
            depthSamplers.push(light.shadow.depthComparisonSampler)
          }
        })

        // filter duplicate depth comparison samplers
        depthSamplers = depthSamplers.filter(
          (sampler, i, array) => array.findIndex((s) => s.uuid === sampler.uuid) === i
        )

        if (parameters.textures) {
          parameters.textures = [...parameters.textures, ...depthTextures]
        } else {
          parameters.textures = depthTextures
        }

        if (parameters.samplers) {
          parameters.samplers = [...parameters.samplers, ...depthSamplers]
        } else {
          parameters.samplers = depthSamplers
        }
      }

      // add transmissive texture and sampler if needed
      if (this.options.transmissive) {
        this.renderer.createTransmissionTarget()

        const transmissionTexture = new Texture(this.renderer, {
          label: this.options.label + ' transmission texture',
          name: 'transmissionBackgroundTexture',
          fromTexture: this.renderer.transmissionTarget.texture,
        })

        if (parameters.textures) {
          parameters.textures = [...parameters.textures, transmissionTexture]
        } else {
          parameters.textures = [transmissionTexture]
        }

        if (parameters.samplers) {
          parameters.samplers = [...parameters.samplers, this.renderer.transmissionTarget.sampler]
        } else {
          parameters.samplers = [this.renderer.transmissionTarget.sampler]
        }
      }

      return super.cleanupRenderMaterialParameters(parameters)
    }

    /**
     * Set a Mesh matrices uniforms inputs then call {@link MeshBaseClass} super method
     * @param meshParameters - {@link RenderMaterialParams | RenderMaterial parameters}
     */
    setMaterial(meshParameters: RenderMaterialParams) {
      // add matrices uniforms
      // https://threejs.org/docs/#api/en/renderers/webgl/WebGLProgram
      // https://doc.babylonjs.com/features/featuresDeepDive/materials/shaders/introToShaders#built-in-variables
      const matricesUniforms: BufferBindingParams = {
        label: 'Matrices',
        name: 'matrices',
        visibility: ['vertex', 'fragment'],
        minOffset: this.renderer.device ? this.renderer.device.limits.minUniformBufferOffsetAlignment : 256,
        struct: {
          model: {
            type: 'mat4x4f',
            value: this.worldMatrix,
          },
          modelView: {
            // model view matrix (world matrix multiplied by camera view matrix)
            type: 'mat4x4f',
            value: this.modelViewMatrix,
          },
          normal: {
            // normal matrix
            type: 'mat3x3f',
            value: this.normalMatrix,
          },
        },
      }

      if (this.options.renderBundle && this.options.renderBundle.binding) {
        matricesUniforms.parent = this.options.renderBundle.binding
        matricesUniforms.offset = this.options.renderBundle.meshes.size
      }

      const meshTransformationBinding = new BufferBinding(matricesUniforms)

      if (!meshParameters.bindings) meshParameters.bindings = []
      meshParameters.bindings.unshift(meshTransformationBinding)

      super.setMaterial(meshParameters)
    }

    /**
     * Update this Mesh camera {@link BindGroup}. Useful if the Mesh needs to be rendered with a different {@link Camera} than the {@link CameraRenderer} one.
     * @param cameraBindGroup - New camera {@link BindGroup} to use. Should be a clon from the {@link CameraRenderer} one.
     */
    setCameraBindGroup(cameraBindGroup: BindGroup) {
      if (this.material && this.material.useCameraBindGroup && this.material.bindGroups.length) {
        this.material.bindGroups[0] = cameraBindGroup
      }
    }

    /**
     * Get the visible property value
     */
    get visible(): boolean {
      return this._visible
    }

    /**
     * Set the visible property value
     * @param value - new visibility value
     */
    set visible(value: boolean) {
      this.shouldUpdateMatrixStack()
      this._visible = value
    }

    /* SIZE & TRANSFORMS */

    /**
     * Resize our {@link ProjectedMeshBaseClass}
     * @param boundingRect - the new bounding rectangle
     */
    resize(boundingRect?: DOMElementBoundingRect | null) {
      if (this.domFrustum) this.domFrustum.setContainerBoundingRect(this.renderer.boundingRect)

      super.resize(boundingRect)
    }

    /**
     * Get our {@link DOMFrustum} projected bounding rectangle
     * @readonly
     */
    get projectedBoundingRect(): DOMElementBoundingRect {
      return this.domFrustum?.projectedBoundingRect
    }

    /* EVENTS */

    /**
     * Assign a callback function to _onReEnterViewCallback
     * @param callback - callback to run when {@link ProjectedMeshBaseClass} is reentering the view frustum
     * @returns - our Mesh
     */
    onReEnterView(callback: () => void): ProjectedMeshBaseClass {
      if (callback) {
        this._onReEnterViewCallback = callback
      }

      return this
    }

    /**
     * Assign a callback function to _onLeaveViewCallback
     * @param callback - callback to run when {@link ProjectedMeshBaseClass} is leaving the view frustum
     * @returns - our Mesh
     */
    onLeaveView(callback: () => void): ProjectedMeshBaseClass {
      if (callback) {
        this._onLeaveViewCallback = callback
      }

      return this
    }

    /* RENDER */

    /**
     * Get the geometry bounding sphere in clip space.
     * @readonly
     */
    get clipSpaceBoundingSphere(): {
      /** Center of the bounding sphere. */
      center: Vec3
      /** Radius of the bounding sphere. */
      radius: number
    } {
      const { center, radius, min, max } = this.geometry.boundingBox

      // get actual translation and max scale
      const translation = this.worldMatrix.getTranslation()
      const maxWorldRadius = radius * this.worldMatrix.getMaxScaleOnAxis()

      // get the center on the back face
      const cMin = center.clone().add(translation)
      cMin.z += min.z

      // get the center on the front face
      const cMax = center.clone().add(translation)
      cMax.z += max.z

      // get a point on the back face sphere
      // use Y because the projection is dependent of the Y axis
      const sMin = cMin.clone()
      sMin.y += maxWorldRadius

      // get a point on the front face sphere
      const sMax = cMax.clone()
      sMax.y += maxWorldRadius

      // apply view projection matrix
      cMin.applyMat4(this.camera.viewProjectionMatrix)
      cMax.applyMat4(this.camera.viewProjectionMatrix)
      sMin.applyMat4(this.camera.viewProjectionMatrix)
      sMax.applyMat4(this.camera.viewProjectionMatrix)

      // now get the bounding rectangle of the back and front face rectangles
      const rMin = cMin.distance(sMin)
      const rMax = cMax.distance(sMax)

      const rectMin = {
        xMin: cMin.x - rMin,
        xMax: cMin.x + rMin,
        yMin: cMin.y - rMin,
        yMax: cMin.y + rMin,
      }

      const rectMax = {
        xMin: cMax.x - rMax,
        xMax: cMax.x + rMax,
        yMin: cMax.y - rMax,
        yMax: cMax.y + rMax,
      }

      // compute final rectangle
      const rect = {
        xMin: Math.min(rectMin.xMin, rectMax.xMin),
        yMin: Math.min(rectMin.yMin, rectMax.yMin),
        xMax: Math.max(rectMin.xMax, rectMax.xMax),
        yMax: Math.max(rectMin.yMax, rectMax.yMax),
      }

      // get sphere center
      const sphereCenter = cMax.add(cMin).multiplyScalar(0.5).clone()
      sphereCenter.x = (rect.xMax + rect.xMin) / 2
      sphereCenter.y = (rect.yMax + rect.yMin) / 2

      // get sphere radius
      const sphereRadius = Math.max(rect.xMax - rect.xMin, rect.yMax - rect.yMin) * 0.5

      return {
        center: sphereCenter,
        radius: sphereRadius,
      }
    }

    /**
     * Check if the Mesh lies inside the {@link camera} view frustum or not using the test defined by {@link frustumCulling}.
     */
    checkFrustumCulling() {
      if (this.matricesNeedUpdate) {
        if (this.domFrustum && this.frustumCulling) {
          if (this.frustumCulling === 'sphere') {
            this.domFrustum.setDocumentCoordsFromClipSpaceSphere(this.clipSpaceBoundingSphere)
          } else {
            this.domFrustum.setDocumentCoordsFromClipSpaceOBB()
          }

          this.domFrustum.intersectsContainer()
        }
      }
    }

    /**
     * Tell our matrices bindings to update if needed and call {@link MeshBaseClass#onBeforeRenderPass | Mesh base onBeforeRenderPass} super.
     */
    onBeforeRenderPass() {
      if (this.material && this.matricesNeedUpdate) {
        this.material.shouldUpdateInputsBindings('matrices')
      }

      super.onBeforeRenderPass()
    }

    /**
     * Render our Mesh if the {@link RenderMaterial} is ready and if it is not frustum culled.
     * @param pass - current render pass
     */
    onRenderPass(pass: GPURenderPassEncoder) {
      if (!this.ready) return

      if ((this.domFrustum && this.domFrustum.isIntersecting) || !this.frustumCulling) {
        this.renderPass(pass)
      }
    }

    /**
     * Destroy the Mesh, and handle shadow casting or receiving meshes.
     */
    destroy() {
      if (this.options.castShadows) {
        this.renderer.shadowCastingLights.forEach((light) => {
          if (light.shadow.isActive) {
            light.shadow.removeMesh(this)
          }
        })
      }

      if (this.options.receiveShadows) {
        this.renderer.shadowCastingLights.forEach((light) => {
          light.shadow.removeShadowReceivingMesh(this)
        })
      }

      super.destroy()
    }
  }
}

export { ProjectedMeshBaseMixin }
