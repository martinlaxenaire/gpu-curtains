import { PipelineEntry } from './PipelineEntry'
import { ProjectedShaderChunks, shaderChunks } from '../shaders/shader-chunks'
import { isRenderer } from '../renderers/utils'
import { throwError } from '../../utils/utils'
import {
  PipelineEntryShaders,
  RenderPipelineEntryOptions,
  RenderPipelineEntryParams,
} from '../../types/PipelineEntries'
import { BindGroupBufferBindingElement } from '../../types/BindGroups'
import { RenderMaterialAttributes, ShaderOptions } from '../../types/Materials'

/**
 * Used to create a {@link PipelineEntry} specifically designed to handle {@link core/materials/RenderMaterial.RenderMaterial | RenderMaterial}.
 *
 * ## Shaders patching
 *
 * The {@link RenderPipelineEntry} uses each of its {@link RenderPipelineEntry#bindGroups | bind groups} {@link core/bindings/Binding.Binding | Binding} to patch the given vertex and fragment shaders before creating the {@link GPUShaderModule}.<br>
 * It will prepend every {@link core/bindings/Binding.Binding | Binding} WGSL code snippets (or fragments) with the correct bind group and bindings indices.
 *
 * ## Pipeline compilation
 *
 * The {@link RenderPipelineEntry} will then create a {@link GPURenderPipeline} (asynchronously by default).
 *
 * ## Default attributes and uniforms
 *
 * ### Attributes
 *
 * Attributes are only added to the vertex shaders. They are generated based on the {@link core/geometries/Geometry.Geometry | Geometry} used and may vary in case you're using a geometry with custom attributes. Here are the default ones:
 *
 * ```wgsl
 * struct Attributes {
 *  @builtin(vertex_index) vertexIndex : u32,
 *  @builtin(instance_index) instanceIndex : u32,
 *  @location(0) position: vec3f,
 *  @location(1) uv: vec2f,
 *  @location(2) normal: vec3f
 * };
 *
 * // you can safely access them in your vertex shader
 * // using attributes.position or attributes.uv for example
 * ```
 *
 * ### Uniforms
 *
 * If the Mesh is one of {@link core/meshes/Mesh.Mesh | Mesh}, {@link curtains/meshes/DOMMesh.DOMMesh | DOMMesh} or {@link curtains/meshes/Plane.Plane | Plane}, some additional uniforms are added to the shaders.
 *
 * #### Vertex shaders
 *
 * ```wgsl
 * struct Matrices {
 * 	model: mat4x4f,
 * 	modelView: mat4x4f,
 * 	normal: mat3x3f
 * };
 *
 * struct Camera {
 * 	view: mat4x4f,
 * 	projection: mat4x4f,
 * 	position: vec3f
 * };
 *
 * @group(0) @binding(0) var<uniform> camera: Camera;
 *
 * // note that matrices uniform @group index might change depending on use cases
 * @group(1) @binding(0) var<uniform> matrices: Matrices;
 *
 * // you can safely access these uniforms in your vertex shader
 * // using matrices.modelView or camera.projection for example
 * ```
 *
 * #### Fragment shaders
 *
 * ```wgsl
 * struct Matrices {
 * 	model: mat4x4f,
 * 	modelView: mat4x4f,
 * 	normal: mat3x3f
 * };
 *
 * // note that matrices uniform @group index might change depending on use cases
 * @group(1) @binding(0) var<uniform> matrices: Matrices;
 *
 * // you can safely access these uniforms in your fragment shader
 * // using matrices.model or matrices.modelView for example
 * ```
 *
 * ### Helpers
 *
 * Finally, some helpers functions are added to the shaders as well.
 *
 * #### Vertex and fragment shaders
 *
 * To help you compute scaled UV based on a texture matrix, this function is always added to both vertex and fragment shaders:
 *
 * ```wgsl
 * fn getUVCover(uv: vec2f, textureMatrix: mat3x3f) -> vec2f {
 *   return (textureMatrix * vec4f(uv, 1.0)).xy;
 * }
 * ```
 *
 * #### Vertex shaders
 *
 * If the Mesh is one of {@link core/meshes/Mesh.Mesh | Mesh}, {@link curtains/meshes/DOMMesh.DOMMesh | DOMMesh} or {@link curtains/meshes/Plane.Plane | Plane}, some functions are added to the vertex shader to help you compute the vertices positions and normals.
 *
 * ##### Position
 *
 * Position helper function:
 *
 * ```wgsl
 * fn getOutputPosition(position: vec3f) -> vec4f {
 *   return camera.projection * matrices.modelView * vec4f(position, 1.0);
 * }
 * ```
 *
 * Note that it is not mandatory to use it. If you want to do these computations yourself, you are free to do it the way you like most. You could for example use this formula instead:
 *
 * ```wgsl
 * var transformed: vec3f = camera.projection * camera.view * matrices.model * vec4f(position, 1.0);
 * ```
 *
 * ##### Normal
 *
 * The normal matrix provided, available as `matrices.normal`, is computed in world space (i.e. it is the inverse transpose of the world matrix). A couple helpers functions are added to help you compute the normals in the right space:
 *
 * ```wgsl
 * fn getWorldNormal(normal: vec3f) -> vec3f {
 *   return normalize(matrices.normal * normal);
 * }
 *
 * fn getViewNormal(normal: vec3f) -> vec3f {
 *   return normalize((camera.view * vec4(matrices.normal * normal, 0.0)).xyz);
 * }
 * ```
 *
 * #### Fragment shaders
 *
 * Last but not least, those couple functions are added to the fragment shaders to help you convert vertex positions to UV coordinates:
 *
 * ```wgsl
 * fn getVertex2DToUVCoords(vertex: vec2f) -> vec2f {
 *   return vec2(
 *     vertex.x * 0.5 + 0.5,
 *     0.5 - vertex.y * 0.5
 *   );
 * }
 *
 * fn getVertex3DToUVCoords(vertex: vec3f) -> vec2f {
 *   return getVertex2DToUVCoords( vec2(vertex.x, vertex.y) );
 * }
 * ```
 */
export class RenderPipelineEntry extends PipelineEntry {
  /** Shaders to use with this {@link RenderPipelineEntry} */
  shaders: PipelineEntryShaders
  /** {@link RenderMaterialAttributes | Geometry attributes} sent to the {@link RenderPipelineEntry} */
  attributes: RenderMaterialAttributes
  /** {@link GPUDevice.createRenderPipeline().descriptor | GPURenderPipelineDescriptor} based on {@link layout} and {@link shaders} */
  descriptor: GPURenderPipelineDescriptor | null
  /** Options used to create this {@link RenderPipelineEntry} */
  options: RenderPipelineEntryOptions

  /**
   * RenderPipelineEntry constructor
   * @param parameters - {@link RenderPipelineEntryParams | parameters} used to create this {@link RenderPipelineEntry}
   */
  constructor(parameters: RenderPipelineEntryParams) {
    // eslint-disable-next-line prefer-const
    let { renderer, ...pipelineParams } = parameters
    const { label, attributes, bindGroups, cacheKey, ...renderingOptions } = pipelineParams

    const type = 'RenderPipelineEntry'

    isRenderer(renderer, label ? label + ' ' + type : type)

    super(parameters)

    this.type = type

    this.shaders = {
      vertex: {
        head: '',
        code: '',
        module: null,
      },
      fragment: {
        head: '',
        code: '',
        module: null,
      },
      full: {
        head: '',
        code: '',
        module: null,
      },
    }

    this.descriptor = null

    this.options = {
      ...this.options,
      attributes,
      ...renderingOptions,
    }

    this.attributes = attributes
  }

  /* SHADERS */

  /**
   * Patch the shaders by appending all the necessary shader chunks, {@link bindGroups | bind groups}) and {@link attributes} WGSL code fragments to the given {@link types/PipelineEntries.PipelineEntryParams#shaders | parameter shader code}
   */
  patchShaders() {
    this.shaders.vertex.head = ''
    this.shaders.vertex.code = ''
    this.shaders.fragment.head = ''
    this.shaders.fragment.code = ''
    this.shaders.full.head = ''
    this.shaders.full.code = ''

    // first add chunks
    for (const chunk in shaderChunks.vertex) {
      this.shaders.vertex.head = `${shaderChunks.vertex[chunk]}\n${this.shaders.vertex.head}`
      this.shaders.full.head = `${shaderChunks.vertex[chunk]}\n${this.shaders.full.head}`
    }

    if (this.options.shaders.fragment) {
      for (const chunk in shaderChunks.fragment) {
        this.shaders.fragment.head = `${shaderChunks.fragment[chunk]}\n${this.shaders.fragment.head}`

        if (this.shaders.full.head.indexOf(shaderChunks.fragment[chunk]) === -1) {
          this.shaders.full.head = `${shaderChunks.fragment[chunk]}\n${this.shaders.full.head}`
        }
      }
    }

    if (this.options.rendering.useProjection) {
      for (const chunk in ProjectedShaderChunks.vertex) {
        this.shaders.vertex.head = `${ProjectedShaderChunks.vertex[chunk]}\n${this.shaders.vertex.head}`
        this.shaders.full.head = `${ProjectedShaderChunks.vertex[chunk]}\n${this.shaders.full.head}`
      }

      if (this.options.shaders.fragment) {
        for (const chunk in ProjectedShaderChunks.fragment) {
          this.shaders.fragment.head = `${ProjectedShaderChunks.fragment[chunk]}\n${this.shaders.fragment.head}`

          if (this.shaders.full.head.indexOf(ProjectedShaderChunks.fragment[chunk]) === -1) {
            this.shaders.full.head = `${ProjectedShaderChunks.fragment[chunk]}\n${this.shaders.full.head}`
          }
        }
      }
    }

    const groupsBindings = []
    for (const bindGroup of this.bindGroups) {
      let bindIndex = 0
      bindGroup.bindings.forEach((binding, bindingIndex) => {
        binding.wgslGroupFragment.forEach((groupFragment, groupFragmentIndex) => {
          groupsBindings.push({
            groupIndex: bindGroup.index,
            visibility: binding.options.visibility,
            bindIndex,
            wgslStructFragment: (binding as BindGroupBufferBindingElement).wgslStructFragment,
            wgslGroupFragment: groupFragment,
            newLine:
              bindingIndex === bindGroup.bindings.length - 1 &&
              groupFragmentIndex === binding.wgslGroupFragment.length - 1,
          })

          bindIndex++
        })
      })
    }

    for (const groupBinding of groupsBindings) {
      if (groupBinding.visibility.includes('vertex')) {
        // do not duplicate structs
        if (
          groupBinding.wgslStructFragment &&
          this.shaders.vertex.head.indexOf(groupBinding.wgslStructFragment) === -1
        ) {
          this.shaders.vertex.head = `\n${groupBinding.wgslStructFragment}\n${this.shaders.vertex.head}`
        }

        // do not duplicate struct var as well
        if (this.shaders.vertex.head.indexOf(groupBinding.wgslGroupFragment) === -1) {
          this.shaders.vertex.head = `${this.shaders.vertex.head}\n@group(${groupBinding.groupIndex}) @binding(${groupBinding.bindIndex}) ${groupBinding.wgslGroupFragment}`

          if (groupBinding.newLine) this.shaders.vertex.head += `\n`
        }
      }

      if (this.options.shaders.fragment && groupBinding.visibility.includes('fragment')) {
        // do not duplicate structs
        if (
          groupBinding.wgslStructFragment &&
          this.shaders.fragment.head.indexOf(groupBinding.wgslStructFragment) === -1
        ) {
          this.shaders.fragment.head = `\n${groupBinding.wgslStructFragment}\n${this.shaders.fragment.head}`
        }

        // do not duplicate struct var as well
        if (this.shaders.fragment.head.indexOf(groupBinding.wgslGroupFragment) === -1) {
          this.shaders.fragment.head = `${this.shaders.fragment.head}\n@group(${groupBinding.groupIndex}) @binding(${groupBinding.bindIndex}) ${groupBinding.wgslGroupFragment}`

          if (groupBinding.newLine) this.shaders.fragment.head += `\n`
        }
      }

      if (groupBinding.wgslStructFragment && this.shaders.full.head.indexOf(groupBinding.wgslStructFragment) === -1) {
        this.shaders.full.head = `\n${groupBinding.wgslStructFragment}\n${this.shaders.full.head}`
      }

      if (this.shaders.full.head.indexOf(groupBinding.wgslGroupFragment) === -1) {
        this.shaders.full.head = `${this.shaders.full.head}\n@group(${groupBinding.groupIndex}) @binding(${groupBinding.bindIndex}) ${groupBinding.wgslGroupFragment}`

        if (groupBinding.newLine) this.shaders.full.head += `\n`
      }
    }

    // add attributes to vertex shader only
    this.shaders.vertex.head = `${this.attributes.wgslStructFragment}\n${this.shaders.vertex.head}`
    this.shaders.full.head = `${this.attributes.wgslStructFragment}\n${this.shaders.full.head}`

    this.shaders.vertex.code = this.shaders.vertex.head + this.options.shaders.vertex.code

    if (typeof this.options.shaders.fragment === 'object')
      this.shaders.fragment.code = this.shaders.fragment.head + this.options.shaders.fragment.code

    // check if its one shader string with different entry points
    if (typeof this.options.shaders.fragment === 'object') {
      if (
        this.options.shaders.vertex.entryPoint !== this.options.shaders.fragment.entryPoint &&
        this.options.shaders.vertex.code.localeCompare(this.options.shaders.fragment.code) === 0
      ) {
        this.shaders.full.code = this.shaders.full.head + this.options.shaders.vertex.code
      } else {
        this.shaders.full.code =
          this.shaders.full.head + this.options.shaders.vertex.code + this.options.shaders.fragment.code
      }
    }
  }

  /* SETUP */

  /**
   * Get whether the shaders modules have been created
   * @readonly
   */
  get shadersModulesReady(): boolean {
    return !(!this.shaders.vertex.module || (this.options.shaders.fragment && !this.shaders.fragment.module))
  }

  /**
   * Create the {@link shaders}: patch them and create the {@link GPUShaderModule}
   */
  createShaders() {
    this.patchShaders()

    const isSameShader =
      typeof this.options.shaders.fragment === 'object' &&
      this.options.shaders.vertex.entryPoint !== this.options.shaders.fragment.entryPoint &&
      this.options.shaders.vertex.code.localeCompare(this.options.shaders.fragment.code) === 0

    this.shaders.vertex.module = this.createShaderModule({
      code: this.shaders[isSameShader ? 'full' : 'vertex'].code,
      type: 'vertex',
    })

    if (this.options.shaders.fragment) {
      this.shaders.fragment.module = this.createShaderModule({
        code: this.shaders[isSameShader ? 'full' : 'fragment'].code,
        type: 'fragment',
      })
    }
  }

  /**
   * Get default transparency blend state.
   * @returns - The default transparency blend state.
   */
  static getDefaultTransparentBlending(): GPUBlendState {
    return {
      color: {
        srcFactor: 'src-alpha',
        dstFactor: 'one-minus-src-alpha',
      },
      alpha: {
        srcFactor: 'one',
        dstFactor: 'one-minus-src-alpha',
      },
    }
  }

  /**
   * Create the render pipeline {@link descriptor}
   */
  createPipelineDescriptor() {
    if (!this.shadersModulesReady) return

    let vertexLocationIndex = -1

    if (this.options.rendering.targets.length) {
      // we will assume our renderer alphaMode is set to 'premultiplied'
      // we either disable blending if mesh if opaque
      // use a custom blending if set
      // or use this blend equation if mesh is transparent (see https://limnu.com/webgl-blending-youre-probably-wrong/)
      if (this.options.rendering.transparent) {
        this.options.rendering.targets[0].blend = this.options.rendering.targets[0].blend
          ? this.options.rendering.targets[0].blend
          : RenderPipelineEntry.getDefaultTransparentBlending()
      }
    } else {
      this.options.rendering.targets = []
    }

    this.descriptor = {
      label: this.options.label,
      layout: this.layout,
      vertex: {
        module: this.shaders.vertex.module,
        entryPoint: this.options.shaders.vertex.entryPoint,
        buffers: this.attributes.vertexBuffers.map((vertexBuffer) => {
          return {
            stepMode: vertexBuffer.stepMode,
            arrayStride: vertexBuffer.arrayStride * 4, // 4 bytes each
            attributes: vertexBuffer.attributes.map((attribute) => {
              vertexLocationIndex++
              return {
                shaderLocation: vertexLocationIndex,
                offset: attribute.bufferOffset, // previous attribute size * 4
                format: attribute.bufferFormat,
              }
            }),
          }
        }),
      },
      ...(this.options.shaders.fragment && {
        fragment: {
          module: this.shaders.fragment.module,
          entryPoint: (this.options.shaders.fragment as ShaderOptions).entryPoint,
          targets: this.options.rendering.targets,
        },
      }),
      primitive: {
        topology: this.options.rendering.topology,
        frontFace: this.options.rendering.verticesOrder,
        cullMode: this.options.rendering.cullMode,
      },
      ...(this.options.rendering.depth && {
        depthStencil: {
          depthWriteEnabled: this.options.rendering.depthWriteEnabled,
          depthCompare: this.options.rendering.depthCompare,
          format: this.options.rendering.depthFormat,
        },
      }),
      ...(this.options.rendering.sampleCount > 1 && {
        multisample: {
          count: this.options.rendering.sampleCount,
        },
      }),
    } as GPURenderPipelineDescriptor
  }

  /**
   * Create the render {@link pipeline}
   */
  createRenderPipeline() {
    if (!this.shadersModulesReady) return

    try {
      this.pipeline = this.renderer.createRenderPipeline(this.descriptor)
    } catch (error) {
      this.status.error = error
      throwError(error)
    }
  }

  /**
   * Asynchronously create the render {@link pipeline}
   * @returns - void promise result
   */
  async createRenderPipelineAsync(): Promise<void> {
    if (!this.shadersModulesReady) return

    try {
      this.pipeline = await this.renderer.createRenderPipelineAsync(this.descriptor)
      this.status.compiled = true
      this.status.compiling = false
      this.status.error = null
    } catch (error) {
      this.status.error = error
      throwError(error)
    }
  }

  /**
   * Call {@link PipelineEntry#compilePipelineEntry | PipelineEntry compilePipelineEntry} method, then create our render {@link pipeline}
   */
  async compilePipelineEntry(): Promise<void> {
    super.compilePipelineEntry()

    if (this.options.useAsync) {
      await this.createRenderPipelineAsync()
    } else {
      this.createRenderPipeline()
      this.status.compiled = true
      this.status.compiling = false
      this.status.error = null
    }
  }
}
