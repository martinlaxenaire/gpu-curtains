import { ShaderChunks } from '../shaders/ShaderChunks'

let pipelineId = 0

export class PipelineEntry {
  constructor({ renderer, label = 'Render Pipeline', attributes = {}, bindGroups = [], shaders = {} }) {
    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    if (!renderer || !(renderer.type === 'Renderer' || renderer.type === 'CurtainsRenderer')) {
      return
    }

    this.renderer = renderer

    Object.defineProperty(this, 'id', { value: pipelineId++ })

    this.layout = null
    this.pipeline = null

    this.attributes = attributes
    this.bindGroups = this.renderer.cameraBindGroup ? [this.renderer.cameraBindGroup, ...bindGroups] : bindGroups

    this.shaders = {
      vertex: {
        code: '',
        module: null,
      },
      fragment: {
        code: '',
        module: null,
      },
      full: {
        code: '',
        module: null, // TODO useless?
      },
    }

    this.options = {
      label,
      shaders,
    }

    this.setPipelineEntry()
  }

  /** SHADERS **/

  patchShaders() {
    this.shaders.vertex.code = this.options.shaders.vertex.code
    this.shaders.fragment.code = this.options.shaders.fragment.code

    // first add chunks
    for (const chunk in ShaderChunks.vertex) {
      this.shaders.vertex.code = `\n${ShaderChunks.vertex[chunk]}\n ${this.shaders.vertex.code}`
    }

    for (const chunk in ShaderChunks.fragment) {
      this.shaders.fragment.code = `\n${ShaderChunks.fragment[chunk]}\n ${this.shaders.fragment.code}`
    }

    this.bindGroups.toReversed().forEach((bindGroup) => {
      bindGroup.bindings.toReversed().forEach((binding) => {
        if (
          binding.visibility === GPUShaderStage.VERTEX ||
          binding.visibility === (GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT)
        ) {
          this.shaders.vertex.code = `\n@group(${bindGroup.index}) @binding(${binding.bindIndex}) ${binding.wgslGroupFragment} ${this.shaders.vertex.code}\n`

          if (binding.wgslStructFragment) {
            this.shaders.vertex.code = `${binding.wgslStructFragment}\n ${this.shaders.vertex.code}`
          }
        }

        if (
          binding.visibility === GPUShaderStage.FRAGMENT ||
          binding.visibility === (GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT)
        ) {
          this.shaders.fragment.code = `\n@group(${bindGroup.index}) @binding(${binding.bindIndex}) ${binding.wgslGroupFragment} ${this.shaders.fragment.code}\n`

          if (binding.wgslStructFragment) {
            this.shaders.fragment.code = `${binding.wgslStructFragment}\n ${this.shaders.fragment.code}`
          }
        }
      })

      this.shaders.vertex.code = `\n ${this.shaders.vertex.code}`
      this.shaders.fragment.code = `\n ${this.shaders.fragment.code}`
    })

    // add attributes to vertex shader only
    this.shaders.vertex.code = `${this.attributes.wgslStructFragment}\n ${this.shaders.vertex.code}`

    this.shaders.full.code = this.shaders.vertex.code + '\n' + this.shaders.fragment.code
  }

  createShaderModule({ code = '', type = '' }) {
    return this.renderer.device.createShaderModule({
      label: this.options.label + ': ' + type + 'Shader module',
      code,
    })
  }

  /** SETUP **/

  createShaders() {
    this.patchShaders()

    this.shaders.vertex.module = this.createShaderModule({
      code: this.shaders.vertex.code,
      type: 'Vertex',
    })

    this.shaders.fragment.module = this.createShaderModule({
      code: this.shaders.fragment.code,
      type: 'Vertex',
    })
  }

  createPipelineLayout() {
    this.layout = this.renderer.device.createPipelineLayout({
      bindGroupLayouts: this.bindGroups.map((bindGroup) => bindGroup.bindGroupLayout),
    })
  }

  createRenderPipeline() {
    if (!this.shaders.vertex.module || !this.shaders.fragment.module) return

    this.pipeline = this.renderer.device.createRenderPipeline({
      label: this.options.label,
      layout: this.layout,
      vertex: {
        module: this.shaders.vertex.module,
        entryPoint: this.options.shaders.vertex.entryPoint, // TODO editable via options?
        buffers: this.attributes.pipelineBuffers,
      },
      fragment: {
        module: this.shaders.fragment.module,
        entryPoint: this.options.shaders.fragment.entryPoint, // TODO editable via options?
        targets: [{ format: this.renderer.preferredFormat }],
      },
      ...(this.renderer.sampleCount > 1 && {
        multisample: {
          count: this.renderer.sampleCount,
        },
      }),
    })
  }

  flushPipelineEntry(newBindGroups = []) {
    this.bindGroups = this.renderer.cameraBindGroup ? [this.renderer.cameraBindGroup, ...newBindGroups] : newBindGroups
    this.setPipelineEntry()
  }

  setPipelineEntry() {
    this.createShaders()
    this.createPipelineLayout()
    this.createRenderPipeline()
  }
}
