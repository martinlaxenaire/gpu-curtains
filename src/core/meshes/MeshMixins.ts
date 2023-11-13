import { MeshBase } from './MeshBase'
import { DOMElementBoundingRect, RectCoords } from '../DOM/DOMElement'
import { MeshBaseClass, MixinConstructor } from './MeshBaseMixin'
import { ProjectedObject3D } from '../objects3D/ProjectedObject3D'
import { DOMObject3D } from '../../curtains/objects3D/DOMObject3D'
import { DOMFrustum } from '../DOM/DOMFrustum'
import { Mat4 } from '../../math/Mat4'
import { CameraRenderer, isCameraRenderer } from '../renderers/utils'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { RenderMaterialParams } from '../../types/Materials'
import {
  MeshTransformedBaseClass,
  TransformedMeshBaseOptions,
  TransformedMeshBaseParams,
  TransformedMeshParameters,
} from './MeshTransformedMixin'

type TransformedObject3D = ProjectedObject3D | DOMObject3D

// This can live anywhere in your codebase:
function applyMixins(derivedCtor: any, constructors: any[]) {
  constructors.forEach((baseCtor) => {
    Object.getOwnPropertyNames(baseCtor.prototype).forEach((name) => {
      Object.defineProperty(
        derivedCtor.prototype,
        name,
        Object.getOwnPropertyDescriptor(baseCtor.prototype, name) || Object.create(null)
      )
    })
  })
}

// https://stackoverflow.com/a/43158068/13354068
const withClasses = <TBase extends MixinConstructor, MBase extends MixinConstructor>(baseClass, mixedClass) => {
  const base = class _Combined extends baseClass {
    constructor(...args) {
      super(...args)
      // mixins.forEach((mixin) => {
      //   mixin.prototype.initializer.call(this)
      // })

      mixedClass.prototype.initializer.call(this)
    }
  }
  const copyProps = (target, source) => {
    Object.getOwnPropertyNames(source)
      .concat(Object.getOwnPropertySymbols(source) as string[])
      .forEach((prop) => {
        if (prop.match(/^(?:constructor|prototype|arguments|caller|name|bind|call|apply|toString|length)$/)) return
        Object.defineProperty(target, prop, Object.getOwnPropertyDescriptor(source, prop))
      })
  }
  // mixins.forEach((mixin) => {
  //   copyProps(base.prototype, mixin.prototype)
  //   copyProps(base, mixin)
  // })

  copyProps(base.prototype, mixedClass.prototype)
  copyProps(base, mixedClass)

  return <TBase & MBase>base
}

// class Projected3DMeshBase = {}
// interface Projected3DMeshBase extends MeshBase, ProjectedObject3D {}
// applyMixins(Projected3DMeshBase, [MeshBase, ProjectedObject3D])
//
// class DOM3DMeshBase = {}
// interface DOM3DMeshBase extends MeshBase, DOMObject3D {}
// applyMixins(DOM3DMeshBase, [MeshBase, DOMObject3D])

/** @const - Default TransformedMesh parameters to merge with user defined parameters */
const defaultTransformedMeshParams: TransformedMeshBaseParams = {
  //useProjection: true,
  // frustum culling and visibility
  frustumCulled: true,
  DOMFrustumMargins: {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
}

export type ProjectedMeshBaseParams<T extends TransformedObject3D> = MixinConstructor<MeshBase> & T
export type ProjectedMeshBaseReturn<T extends TransformedObject3D> = MixinConstructor<MeshTransformedBaseClass> & T

export const ProjectedMeshBaseMixinTest = <TBase extends MixinConstructor<TransformedObject3D>>(Base: TBase) =>
  class extends (withClasses(Base, MeshBase) as MixinConstructor<MeshBase> & TBase) {
    /** The TransformedMesh [DOM Frustum]{@link DOMFrustum} class object */
    domFrustum: DOMFrustum
    /** Whether this TransformedMesh should be frustum culled (not drawn when outside of [camera]{@link CameraRenderer#camera} frustum) */
    frustumCulled: boolean
    /** Margins (in pixels) to applied to the [DOM Frustum]{@link MeshTransformedBaseClass#domFrustum} to determine if this TransformedMesh should be frustum culled or not */
    DOMFrustumMargins: RectCoords

    /** Options used to create this {@link MeshTransformedBaseClass} */
    options: TransformedMeshBaseOptions

    // callbacks / events
    /** function assigned to the [onReEnterView]{@link MeshTransformedBaseClass#onReEnterView} callback */
    _onReEnterViewCallback: () => void = () => {
      /* allow empty callback */
    }
    /** function assigned to the [onLeaveView]{@link MeshTransformedBaseClass#onLeaveView} callback */
    _onLeaveViewCallback: () => void = () => {
      /* allow empty callback */
    }

    // TODO we need to find a way to tell typescript that this mixin can only use ProjectedObject3D | DOMObject3D as Base!
    // modelMatrix: Mat4
    // modelViewMatrix: Mat4
    // modelViewProjectionMatrix: Mat4

    /**
   * MeshTransformedBase constructor
   * @typedef {TransformedMeshParameters} TransformedMeshBaseParameters
   * @extends MeshBaseParams
   * @property {boolean} frustumCulled - whether to use frustum culling
   * @property {RectCoords} DOMFrustumMargins - frustum margins to apply when frustum culling
   *
   * @typedef MeshBaseArrayParams
   * @type {array}
   * @property {(CameraRenderer|GPUCurtains)} 0 - our renderer class object
   * @property {(string|HTMLElement|null)} 1 - the DOM HTML Element that can be bound to a Mesh
   * @property {TransformedMeshParameters} 2 - Mesh parameters

   * @param {MeshBaseArrayParams} params - our MeshBaseMixin parameters
   */
    constructor(...params: any[]) {
      super(
        params[0] as CameraRenderer | GPUCurtains,
        params[1] as HTMLElement | string,
        { ...defaultTransformedMeshParams, ...params[2], ...{ useProjection: true } } as TransformedMeshParameters
      )

      let renderer = params[0]

      // for this mesh to use projection!
      const parameters = {
        ...defaultTransformedMeshParams,
        ...params[2],
        ...{ useProjection: true },
      } as TransformedMeshParameters

      this.type = 'MeshTransformed'

      // we could pass our curtains object OR our curtains renderer object
      renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as CameraRenderer)

      isCameraRenderer(renderer, parameters.label ? parameters.label + ' ' + this.type : this.type)

      this.renderer = renderer

      const { label, geometry, shaders, frustumCulled, DOMFrustumMargins } = parameters

      this.options = {
        ...(this.options ?? {}), // merge possible lower options?
        label,
        shaders,
        frustumCulled,
        DOMFrustumMargins,
      }

      // explicitly needed for DOM Frustum
      this.geometry = geometry

      // tell the model and projection matrices to update right away
      this.updateSizePositionAndProjection()
    }

    /* GEOMETRY */

    /**
     * Override {@link MeshBaseClass} method to add the domFrustum
     */
    computeGeometry() {
      if (this.geometry.shouldCompute) {
        this.geometry.computeGeometry()

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

        this.frustumCulled = this.options.frustumCulled
        this.DOMFrustumMargins = this.domFrustum.DOMFrustumMargins
        this.domFrustum.shouldUpdate = this.frustumCulled
      }
    }

    /* MATERIAL */

    /**
     * Set a Mesh matrices uniforms inputs then call {@link MeshBaseClass} super method
     * @param meshParameters - [RenderMaterial parameters]{@link RenderMaterialParams}
     */
    setMaterial(meshParameters: RenderMaterialParams) {
      // add matrices uniforms
      const matricesUniforms = {
        label: 'Matrices',
        bindings: {
          model: {
            name: 'model',
            type: 'mat4x4f',
            value: this.modelMatrix,
            onBeforeUpdate: () => {
              matricesUniforms.bindings.model.value = this.modelMatrix
            },
          },
          modelView: {
            // model view matrix (model matrix multiplied by camera view matrix)
            name: 'modelView',
            type: 'mat4x4f',
            value: this.modelViewMatrix,
            onBeforeUpdate: () => {
              matricesUniforms.bindings.modelView.value = this.modelViewMatrix
            },
          },
          modelViewProjection: {
            name: 'modelViewProjection',
            type: 'mat4x4f',
            value: this.modelViewProjectionMatrix,
            onBeforeUpdate: () => {
              matricesUniforms.bindings.modelViewProjection.value = this.modelViewProjectionMatrix
            },
          },
        },
      }

      if (!meshParameters.inputs) meshParameters.inputs = { uniforms: {} }

      meshParameters.inputs.uniforms.matrices = matricesUniforms

      super.setMaterial(meshParameters)
    }

    /* SIZE & TRANSFORMS */

    /**
     * Resize our {@link MeshTransformedBaseClass}
     * @param boundingRect - the new bounding rectangle
     */
    resize(boundingRect: DOMElementBoundingRect | null = null) {
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
     * Tell the model and projection matrices to update.
     * Here because else typescript is confused
     */
    updateSizePositionAndProjection() {
      // @ts-ignore
      super.updateSizePositionAndProjection()
    }

    /**
     * Update the model and projection matrices if needed.
     * Here because else typescript is confused
     */
    updateMatrixStack() {
      // @ts-ignore
      super.updateMatrixStack()
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
     * @param callback - callback to run when {@link MeshTransformedBaseClass} is reentering the view frustum
     * @returns - our Mesh
     */
    onReEnterView(callback: () => void): MeshTransformedBaseClass {
      if (callback) {
        this._onReEnterViewCallback = callback
      }

      return this
    }

    /**
     * Assign a callback function to _onLeaveViewCallback
     * @param callback - callback to run when {@link MeshTransformedBaseClass} is leaving the view frustum
     * @returns - our Mesh
     */
    onLeaveView(callback: () => void): MeshTransformedBaseClass {
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
     * Finally we call [Mesh base onBeforeRenderPass]{@link MeshBaseClass#onBeforeRenderPass} super
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

      // TODO check if frustumCulled
      if ((this.domFrustum && this.domFrustum.isIntersecting) || !this.frustumCulled) {
        // render ou material
        this.material.render(pass)
        // then render our geometry
        this.geometry.render(pass)
      }
    }
  } as unknown as MixinConstructor<MeshTransformedBaseClass> & TBase

//
// const ProjectedMeshBaseMixinTest = <TBase extends MixinConstructor<Projected3DMeshBase>>(Base: TBase) => class extends Base {
//
//   /** The TransformedMesh [DOM Frustum]{@link DOMFrustum} class object */
//   domFrustum: DOMFrustum
//   /** Whether this TransformedMesh should be frustum culled (not drawn when outside of [camera]{@link CameraRenderer#camera} frustum) */
//   frustumCulled: boolean
//   /** Margins (in pixels) to applied to the [DOM Frustum]{@link MeshTransformedBaseClass#domFrustum} to determine if this TransformedMesh should be frustum culled or not */
//   DOMFrustumMargins: RectCoords
//
//   /** Options used to create this {@link MeshTransformedBaseClass} */
//   options: TransformedMeshBaseOptions
//
//   // callbacks / events
//   /** function assigned to the [onReEnterView]{@link MeshTransformedBaseClass#onReEnterView} callback */
//   _onReEnterViewCallback: () => void = () => {
//     /* allow empty callback */
//   }
//   /** function assigned to the [onLeaveView]{@link MeshTransformedBaseClass#onLeaveView} callback */
//   _onLeaveViewCallback: () => void = () => {
//     /* allow empty callback */
//   }
//
//   // TODO we need to find a way to tell typescript that this mixin can only use ProjectedObject3D | DOMObject3D as Base!
//   // modelMatrix: Mat4
//   // modelViewMatrix: Mat4
//   // modelViewProjectionMatrix: Mat4
//
//   /**
//    * MeshTransformedBase constructor
//    * @typedef {TransformedMeshParameters} TransformedMeshBaseParameters
//    * @extends MeshBaseParams
//    * @property {boolean} frustumCulled - whether to use frustum culling
//    * @property {RectCoords} DOMFrustumMargins - frustum margins to apply when frustum culling
//    *
//    * @typedef MeshBaseArrayParams
//    * @type {array}
//    * @property {(CameraRenderer|GPUCurtains)} 0 - our renderer class object
//    * @property {(string|HTMLElement|null)} 1 - the DOM HTML Element that can be bound to a Mesh
//    * @property {TransformedMeshParameters} 2 - Mesh parameters
//
//    * @param {MeshBaseArrayParams} params - our MeshBaseMixin parameters
//    */
//   constructor(...params: any[]) {
//     super(
//       params[0] as CameraRenderer | GPUCurtains,
//       params[1] as HTMLElement | string,
//       { ...defaultTransformedMeshParams, ...params[2], ...{ useProjection: true } } as TransformedMeshParameters
//     )
//
//     let renderer = params[0]
//
//     // for this mesh to use projection!
//     const parameters = {
//       ...defaultTransformedMeshParams,
//       ...params[2],
//       ...{ useProjection: true },
//     } as TransformedMeshParameters
//
//     this.type = 'MeshTransformed'
//
//     // we could pass our curtains object OR our curtains renderer object
//     renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as CameraRenderer)
//
//     isCameraRenderer(renderer, parameters.label ? parameters.label + ' ' + this.type : this.type)
//
//     this.renderer = renderer
//
//     const { label, geometry, shaders, frustumCulled, DOMFrustumMargins } = parameters
//
//     this.options = {
//       ...(this.options ?? {}), // merge possible lower options?
//       label,
//       shaders,
//       frustumCulled,
//       DOMFrustumMargins,
//     }
//
//     // explicitly needed for DOM Frustum
//     this.geometry = geometry
//
//     // tell the model and projection matrices to update right away
//     this.updateSizePositionAndProjection()
//   }
//
//   /* GEOMETRY */
//
//   /**
//    * Override {@link MeshBaseClass} method to add the domFrustum
//    */
//   computeGeometry() {
//     if (this.geometry.shouldCompute) {
//       this.geometry.computeGeometry()
//
//       this.domFrustum = new DOMFrustum({
//         boundingBox: this.geometry.boundingBox,
//         modelViewProjectionMatrix: this.modelViewProjectionMatrix,
//         containerBoundingRect: this.renderer.boundingRect,
//         DOMFrustumMargins: this.options.DOMFrustumMargins,
//         onReEnterView: () => {
//           this._onReEnterViewCallback && this._onReEnterViewCallback()
//         },
//         onLeaveView: () => {
//           this._onLeaveViewCallback && this._onLeaveViewCallback()
//         },
//       })
//
//       this.frustumCulled = this.options.frustumCulled
//       this.DOMFrustumMargins = this.domFrustum.DOMFrustumMargins
//       this.domFrustum.shouldUpdate = this.frustumCulled
//     }
//   }
//
//   /* MATERIAL */
//
//   /**
//    * Set a Mesh matrices uniforms inputs then call {@link MeshBaseClass} super method
//    * @param meshParameters - [RenderMaterial parameters]{@link RenderMaterialParams}
//    */
//   setMaterial(meshParameters: RenderMaterialParams) {
//     // add matrices uniforms
//     const matricesUniforms = {
//       label: 'Matrices',
//       bindings: {
//         model: {
//           name: 'model',
//           type: 'mat4x4f',
//           value: this.modelMatrix,
//           onBeforeUpdate: () => {
//             matricesUniforms.bindings.model.value = this.modelMatrix
//           },
//         },
//         modelView: {
//           // model view matrix (model matrix multiplied by camera view matrix)
//           name: 'modelView',
//           type: 'mat4x4f',
//           value: this.modelViewMatrix,
//           onBeforeUpdate: () => {
//             matricesUniforms.bindings.modelView.value = this.modelViewMatrix
//           },
//         },
//         modelViewProjection: {
//           name: 'modelViewProjection',
//           type: 'mat4x4f',
//           value: this.modelViewProjectionMatrix,
//           onBeforeUpdate: () => {
//             matricesUniforms.bindings.modelViewProjection.value = this.modelViewProjectionMatrix
//           },
//         },
//       },
//     }
//
//     if (!meshParameters.inputs) meshParameters.inputs = { uniforms: {} }
//
//     meshParameters.inputs.uniforms.matrices = matricesUniforms
//
//     super.setMaterial(meshParameters)
//   }
//
//   /* SIZE & TRANSFORMS */
//
//   /**
//    * Resize our {@link MeshTransformedBaseClass}
//    * @param boundingRect - the new bounding rectangle
//    */
//   resize(boundingRect: DOMElementBoundingRect | null = null) {
//     if (this.domFrustum) this.domFrustum.setContainerBoundingRect(this.renderer.boundingRect)
//
//     super.resize(boundingRect)
//   }
//
//   /**
//    * Apply scale and resize textures
//    */
//   applyScale() {
//     // @ts-ignore
//     super.applyScale()
//
//     // resize textures on scale change!
//     this.textures.forEach((texture) => texture.resize())
//   }
//
//   /**
//    * Get our {@link DOMFrustum} projected bounding rectangle
//    * @readonly
//    */
//   get projectedBoundingRect(): DOMElementBoundingRect {
//     return this.domFrustum?.projectedBoundingRect
//   }
//
//   /**
//    * Tell the model and projection matrices to update.
//    * Here because else typescript is confused
//    */
//   updateSizePositionAndProjection() {
//     // @ts-ignore
//     super.updateSizePositionAndProjection()
//   }
//
//   /**
//    * Update the model and projection matrices if needed.
//    * Here because else typescript is confused
//    */
//   updateMatrixStack() {
//     // @ts-ignore
//     super.updateMatrixStack()
//   }
//
//   /**
//    * At least one of the matrix has been updated, update according uniforms and frustum
//    */
//   onAfterMatrixStackUpdate() {
//     if (this.material) {
//       this.material.shouldUpdateInputsBindings('matrices')
//     }
//
//     if (this.domFrustum) this.domFrustum.shouldUpdate = true
//   }
//
//   /* EVENTS */
//
//   /**
//    * Assign a callback function to _onReEnterViewCallback
//    * @param callback - callback to run when {@link MeshTransformedBaseClass} is reentering the view frustum
//    * @returns - our Mesh
//    */
//   onReEnterView(callback: () => void): MeshTransformedBase {
//     if (callback) {
//       this._onReEnterViewCallback = callback
//     }
//
//     return this
//   }
//
//   /**
//    * Assign a callback function to _onLeaveViewCallback
//    * @param callback - callback to run when {@link MeshTransformedBaseClass} is leaving the view frustum
//    * @returns - our Mesh
//    */
//   onLeaveView(callback: () => void): MeshTransformedBase {
//     if (callback) {
//       this._onLeaveViewCallback = callback
//     }
//
//     return this
//   }
//
//   /* RENDER */
//
//   /**
//    * Called before rendering the Mesh to update matrices and {@link DOMFrustum}.
//    * First, we update our matrices to have fresh results. It eventually calls onAfterMatrixStackUpdate() if at least one matrix has been updated.
//    * Then we check if we need to update the {@link DOMFrustum} projected bounding rectangle.
//    * Finally we call [Mesh base onBeforeRenderPass]{@link MeshBaseClass#onBeforeRenderPass} super
//    */
//   onBeforeRenderPass() {
//     this.updateMatrixStack()
//
//     if (this.domFrustum && this.domFrustum.shouldUpdate && this.frustumCulled) {
//       this.domFrustum.computeProjectedToDocumentCoords()
//       this.domFrustum.shouldUpdate = false
//     }
//
//     super.onBeforeRenderPass()
//   }
//
//   /**
//    * Only render the Mesh if it is in view frustum.
//    * Since render() is actually called before onRenderPass(), we are sure to have fresh frustum bounding rectangle values here.
//    * @param pass - current render pass
//    */
//   onRenderPass(pass: GPURenderPassEncoder) {
//     if (!this.material.ready) return
//
//     this._onRenderCallback && this._onRenderCallback()
//
//     // TODO check if frustumCulled
//     if ((this.domFrustum && this.domFrustum.isIntersecting) || !this.frustumCulled) {
//       // render ou material
//       this.material.render(pass)
//       // then render our geometry
//       this.geometry.render(pass)
//     }
//   }
// }

// const MeshBaseMixin = <TBase extends MixinConstructor<MeshBase>>(Base: TBase) =>
//   class extends Base {
//     /**
//      * Resize the Mesh's textures
//      * @param boundingRect
//      */
//     resize(boundingRect: DOMElementBoundingRect | null = null) {
//       // @ts-ignore
//       if (super.resize) {
//         // @ts-ignore
//         super.resize(boundingRect)
//       }
//     }
//
//     render(pass: GPURenderPassEncoder) {
//       // @ts-ignore
//       if (super.render) {
//         // @ts-ignore
//         super.render()
//       }
//     }
//
//     destroy() {
//       // @ts-ignore
//       if (super.destroy) {
//         // @ts-ignore
//         super.destroy()
//       }
//     }
//   } as MixinConstructor<MeshBase>
//
// const ProjectionMixin = <TBase extends MixinConstructor<MeshBase>>(Base: TBase) {
//
// }
//
// const ProjectedMeshBaseMixin = <TBase extends MixinConstructor<TransformedObject3D>>(Base: TBase) =>
//   class extends MeshBaseMixin(Base) {}
