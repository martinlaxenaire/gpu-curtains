import { CameraRenderer, isCameraRenderer } from '../../renderers/utils'
import { DOMFrustum } from '../../DOM/DOMFrustum'
import { MeshBaseClass, MeshBaseMixin, MeshBaseOptions, MeshBaseParams, MixinConstructor } from './MeshBaseMixin'
import { GPUCurtains } from '../../../curtains/GPUCurtains'
import { DOMElementBoundingRect, RectCoords } from '../../DOM/DOMElement'
import { RenderMaterialParams, ShaderOptions } from '../../../types/Materials'
import { ProjectedObject3D } from '../../objects3D/ProjectedObject3D'
import { DOMObject3D } from '../../../curtains/objects3D/DOMObject3D'
import default_projected_vsWgsl from '../../shaders/chunks/default_projected_vs.wgsl'
import default_normal_fsWgsl from '../../shaders/chunks/default_normal_fs.wgsl'

/**
 * Base parameters used to create a ProjectedMesh
 */
export interface ProjectedMeshBaseParams {
  /** Whether this ProjectedMesh should be frustum culled (not drawn when outside of {@link CameraRenderer#camera | camera} frustum) */
  frustumCulled?: boolean
  /** Margins (in pixels) to applied to the {@link ProjectedMeshBaseClass#domFrustum | DOM Frustum} to determine if this ProjectedMesh should be frustum culled or not */
  DOMFrustumMargins?: RectCoords
}

/** Parameters used to create a ProjectedMesh */
export interface ProjectedMeshParameters extends MeshBaseParams, ProjectedMeshBaseParams {}

/** @const - Default ProjectedMesh parameters to merge with user defined parameters */
const defaultProjectedMeshParams: ProjectedMeshBaseParams = {
  // frustum culling and visibility
  frustumCulled: true,
  DOMFrustumMargins: {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
}

/** Base options used to create this ProjectedMesh */
export interface ProjectedMeshBaseOptions extends MeshBaseOptions, Partial<ProjectedMeshBaseParams> {}

/**
 * This class describes the properties and methods to set up a Projected Mesh (i.e. a basic {@link MeshBaseClass | Mesh} with {@link ProjectedObject3D} transformations matrices and a {@link core/camera/Camera.Camera | Camera} to use for projection), implemented in the {@link ProjectedMeshBaseMixin}:
 * - Handle the frustum culling (check if the {@link ProjectedObject3D} currently lies inside the {@link core/camera/Camera.Camera | Camera} frustum)
 * - Add callbacks for when the Mesh enters or leaves the {@link core/camera/Camera.Camera | Camera} frustum
 */
export declare class ProjectedMeshBaseClass extends MeshBaseClass {
  /** The {@link CameraRenderer} used */
  renderer: CameraRenderer
  /** The ProjectedMesh {@link DOMFrustum} class object */
  domFrustum: DOMFrustum
  /** Whether this ProjectedMesh should be frustum culled (not drawn when outside of {@link CameraRenderer#camera | camera} frustum) */
  frustumCulled: boolean
  /** Margins (in pixels) to applied to the {@link ProjectedMeshBaseClass#domFrustum | DOM Frustum} to determine if this ProjectedMesh should be frustum culled or not */
  DOMFrustumMargins: RectCoords

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
   * Set default shaders if one or both of them are missing
   */
  setShaders(): void

  /**
   * Override {@link MeshBaseClass} method to add the domFrustum
   */
  computeGeometry(): void

  /**
   * Set a Mesh matrices uniforms inputs then call {@link MeshBaseClass} super method
   * @param meshParameters - {@link RenderMaterialParams | RenderMaterial parameters}
   */
  setMaterial(meshParameters: RenderMaterialParams): void

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
   * At least one of the matrix has been updated, update according uniforms and frustum
   */
  onAfterMatrixStackUpdate(): void

  /**
   * Assign a callback function to _onReEnterViewCallback
   * @param callback - callback to run when {@link ProjectedMeshBaseClass} is reentering the view frustum
   * @returns - our Mesh
   */
  onReEnterView: (callback: () => void) => ProjectedMeshBaseClass
  /**
   * Assign a callback function to _onLeaveViewCallback
   * @param callback - callback to run when {@link ProjectedMeshBaseClass} is leaving the view frustum
   * @returns - our Mesh
   */
  onLeaveView: (callback: () => void) => ProjectedMeshBaseClass

  /**
   * Called before rendering the Mesh to update matrices and {@link DOMFrustum}.
   * First, we update our matrices to have fresh results. It eventually calls onAfterMatrixStackUpdate() if at least one matrix has been updated.
   * Then we check if we need to update the {@link DOMFrustum} projected bounding rectangle.
   * Finally we call {@link MeshBaseClass#onBeforeRenderPass | Mesh base onBeforeRenderPass} super
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
 * Used to add the properties and methods defined in {@link ProjectedMeshBaseClass} to the {@link MeshBaseClass} and mix it with a given Base of type {@link ProjectedObject3D} or {@link DOMObject3D}.
 * @exports
 * @param Base - the class to mix onto, should be of {@link ProjectedObject3D} or {@link DOMObject3D} type
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
    /** Whether this ProjectedMesh should be frustum culled (not drawn when outside of {@link CameraRenderer#camera | camera} frustum) */
    frustumCulled: boolean
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

      // we could pass our curtains object OR our curtains renderer object
      renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as CameraRenderer)

      isCameraRenderer(renderer, parameters.label ? parameters.label + ' ' + this.type : this.type)

      this.renderer = renderer

      const { geometry, frustumCulled, DOMFrustumMargins } = parameters

      this.options = {
        ...(this.options ?? {}), // merge possible lower options?
        frustumCulled,
        DOMFrustumMargins,
      }

      this.setDOMFrustum()

      // explicitly needed for DOM Frustum
      this.geometry = geometry

      // tell the model and projection matrices to update right away
      this.shouldUpdateMatrixStack()
    }

    /* SHADERS */

    /**
     * Set default shaders if one or both of them are missing
     */
    setShaders() {
      let { shaders } = this.options

      if (!shaders) {
        shaders = {
          vertex: {
            code: default_projected_vsWgsl,
            entryPoint: 'main',
          },
          fragment: {
            code: default_normal_fsWgsl,
            entryPoint: 'main',
          },
        }
      } else {
        if (!shaders.vertex || !shaders.vertex.code) {
          shaders.vertex = {
            code: default_projected_vsWgsl,
            entryPoint: 'main',
          }
        }

        if (shaders.fragment === undefined || (shaders.fragment && !(shaders.fragment as ShaderOptions).code)) {
          shaders.fragment = {
            code: default_normal_fsWgsl,
            entryPoint: 'main',
          }
        }
      }
    }

    /* GEOMETRY */

    /**
     * Set the Mesh frustum culling
     */
    setDOMFrustum() {
      this.domFrustum = new DOMFrustum({
        boundingBox: this.geometry.boundingBox,
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
      this.frustumCulled = this.options.frustumCulled
      this.domFrustum.shouldUpdate = this.frustumCulled
    }

    /* MATERIAL */

    /**
     * Set a Mesh matrices uniforms inputs then call {@link MeshBaseClass} super method
     * @param meshParameters - {@link RenderMaterialParams | RenderMaterial parameters}
     */
    setMaterial(meshParameters: RenderMaterialParams) {
      // add matrices uniforms
      const matricesUniforms = {
        label: 'Matrices',
        struct: {
          model: {
            name: 'model',
            type: 'mat4x4f',
            value: this.modelMatrix,
          },
          world: {
            name: 'world',
            type: 'mat4x4f',
            value: this.worldMatrix,
          },
          modelView: {
            // model view matrix (world matrix multiplied by camera view matrix)
            name: 'modelView',
            type: 'mat4x4f',
            value: this.modelViewMatrix,
          },
          modelViewProjection: {
            name: 'modelViewProjection',
            type: 'mat4x4f',
            value: this.modelViewProjectionMatrix,
          },
        },
      }

      if (!meshParameters.uniforms) meshParameters.uniforms = {}
      meshParameters.uniforms.matrices = matricesUniforms

      super.setMaterial(meshParameters)
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
     * Apply scale and resize textures
     */
    applyScale() {
      super.applyScale()

      // resize textures on scale change!
      this.textures.forEach((texture) => texture.resize())
    }

    /**
     * Get our {@link DOMFrustum} projected bounding rectangle
     * @readonly
     */
    get projectedBoundingRect(): DOMElementBoundingRect {
      return this.domFrustum?.projectedBoundingRect
    }

    /**
     * At least one of the matrix has been updated, update according uniforms and frustum
     */
    onAfterMatrixStackUpdate() {
      if (this.material) {
        this.material.shouldUpdateInputsBindings('matrices')
      }

      if (this.domFrustum) this.domFrustum.shouldUpdate = true
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
     * Called before rendering the Mesh to update matrices and {@link DOMFrustum}.
     * First, we update our matrices to have fresh results. It eventually calls onAfterMatrixStackUpdate() if at least one matrix has been updated.
     * Then we check if we need to update the {@link DOMFrustum} projected bounding rectangle.
     * Finally we call {@link MeshBaseClass#onBeforeRenderPass | Mesh base onBeforeRenderPass} super
     */
    onBeforeRenderPass() {
      this.updateMatrixStack()

      if (this.domFrustum && this.domFrustum.shouldUpdate && this.frustumCulled) {
        this.domFrustum.computeProjectedToDocumentCoords()
        this.domFrustum.shouldUpdate = false
      }

      super.onBeforeRenderPass()
    }

    /**
     * Only render the Mesh if it is in view frustum.
     * Since render() is actually called before onRenderPass(), we are sure to have fresh frustum bounding rectangle values here.
     * @param pass - current render pass
     */
    onRenderPass(pass: GPURenderPassEncoder) {
      if (!this.material.ready) return

      this._onRenderCallback && this._onRenderCallback()

      if ((this.domFrustum && this.domFrustum.isIntersecting) || !this.frustumCulled) {
        // render ou material
        this.material.render(pass)
        // then render our geometry
        this.geometry.render(pass)
      }
    }
  }
}

export { ProjectedMeshBaseMixin }
