import { Vec2 } from '../math/Vec2'
import { Vec3 } from '../math/Vec3'
import { Mat4 } from '../math/Mat4'
import { UniformBinding } from './UniformBinding'

export class Texture {
  constructor(
    renderer,
    options = {
      label: 'Texture',
      name: 'texture',
      generateMips: false,
      flipY: true,
      addressModeU: 'repeat',
      addressModeV: 'repeat',
      magFilter: 'linear',
      minFilter: 'linear',
      mipmapFilter: 'linear',
    }
  ) {
    this.type = 'Texture'

    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    if (!renderer || renderer.type !== 'Renderer') {
      return
    }

    this.renderer = renderer

    const defaultOptions = {
      label: '',
      name: '',
      generateMips: false,
      flipY: true,
      addressModeU: 'repeat',
      addressModeV: 'repeat',
      magFilter: 'linear',
      minFilter: 'linear',
      mipmapFilter: 'linear',
    }

    this.options = { ...defaultOptions, ...options }

    this.sampler = null
    this.texture = null
    this.source = null

    // sizes
    this.size = {
      width: 1,
      height: 1,
    }

    // TODO
    this.scale = new Vec2(1)
    this.scale.onChange(() => this.resize())

    this.offset = new Vec2()
    this.offset.onChange(() => this.resize())

    // we will always declare a texture matrix
    // this.textureMatrix = {
    //   matrix: new Mat4(),
    //   isActive: false
    // }

    this.textureMatrix = new UniformBinding({
      label: 'TextureMatrix',
      name: this.options.name + 'Matrix',
      groupIndex: 1, // TODO dirty?
      bindIndex: 2, // TODO dirty?
      useStruct: false,
      uniforms: {
        matrix: {
          name: this.options.name + 'Matrix',
          type: 'mat4x4f',
          value: new Mat4(),
          onBeforeUpdate: () => {
            const sizes = this.computeSize()

            // calculate scale to apply to the matrix
            const textureScale = new Vec3(
              sizes.parentWidth / (sizes.parentWidth - sizes.xOffset),
              sizes.parentHeight / (sizes.parentHeight - sizes.yOffset),
              1
            )

            // apply texture scale
            textureScale.x /= this.scale.x
            textureScale.y /= this.scale.y

            // compose our world transformation matrix from custom origin
            // this.textureMatrix.uniforms.matrix.value  = new Mat4().setFromArray([
            //   textureScale.x, 0, 0, 0,
            //   0, textureScale.y, 0, 0,
            //   0, 0, 1, 0,
            //   (1 - textureScale.x) / 2 + this.offset.x, (1 - textureScale.y) / 2 + this.offset.y, 0, 1
            // ])

            // TODO will it trigger an update?
            this.textureMatrix.uniforms.matrix.value.setFromArray([
              textureScale.x,
              0,
              0,
              0,
              0,
              textureScale.y,
              0,
              0,
              0,
              0,
              1,
              0,
              (1 - textureScale.x) / 2 + this.offset.x,
              (1 - textureScale.y) / 2 + this.offset.y,
              0,
              1,
            ])
          },
        },
      },
    })

    this.uniformGroup = {
      groupIndex: 1,
      bindings: [
        {
          name: this.options.name + 'Sampler',
          groupIndex: 1,
          bindIndex: 0,
          resource: this.sampler,
          wgslGroupFragment: '@group(1) @binding(0) var ' + this.options.name + 'Sampler: sampler;', // TODO
        },
        {
          name: this.options.name,
          groupIndex: 1,
          bindIndex: 1,
          resource: this.texture,
          wgslGroupFragment: '@group(1) @binding(1) var ' + this.options.name + ': texture_2d<f32>;', // TODO
        },
        this.textureMatrix,
      ],
    }

    this._parent = null

    this.sourceLoaded = false
    this.shouldUpdate = false
    this.shouldBindGroup = false
  }

  get parent() {
    return this._parent
  }

  set parent(value) {
    this._parent = value
    // TODO

    this.textureMatrix.shouldUpdateUniform(this.options.name + 'Matrix')
  }

  computeSize() {
    const scale = this.parent && this.parent.scale ? this.parent.scale.clone() : new Vec2(1, 1)

    const parentWidth = this.parent ? this.parent.size.document.width * scale.x : this.size.width
    const parentHeight = this.parent ? this.parent.size.document.height * scale.y : this.size.height

    const sourceWidth = this.size.width
    const sourceHeight = this.size.height

    const sourceRatio = sourceWidth / sourceHeight
    const parentRatio = parentWidth / parentHeight

    // center image in its container
    let xOffset = 0
    let yOffset = 0

    if (parentRatio > sourceRatio) {
      // means parent is larger
      yOffset = Math.min(0, parentHeight - parentWidth * (1 / sourceRatio))
    } else if (parentRatio < sourceRatio) {
      // means parent is taller
      xOffset = Math.min(0, parentWidth - parentHeight * sourceRatio)
    }

    return {
      parentWidth: parentWidth,
      parentHeight: parentHeight,
      sourceWidth: sourceWidth,
      sourceHeight: sourceHeight,
      xOffset: xOffset,
      yOffset: yOffset,
    }
  }

  resize() {}

  getNumMipLevels(...sizes) {
    const maxSize = Math.max(...sizes)
    return (1 + Math.log2(maxSize)) | 0
  }

  async loadImageBitmap(url) {
    const res = await fetch(url)
    const blob = await res.blob()
    return await createImageBitmap(blob, { colorSpaceConversion: 'none' })
  }

  uploadTexture(device) {
    if (this.source) {
      device.queue.copyExternalImageToTexture(
        { source: this.source, flipY: this.options.flipY },
        { texture: this.texture },
        { width: this.size.width, height: this.size.height }
      )

      if (this.texture.mipLevelCount > 1) {
        this.generateMips(device)
      }
    } else {
      device.queue.writeTexture(
        { texture: this.texture },
        new Uint8Array([0, 0, 0, 255]),
        { bytesPerRow: 4 },
        { width: 1, height: 1 }
      )
    }

    this.shouldUpdate = false
  }

  createTexture() {
    const textureOptions = this.source
      ? {
          format: 'rgba8unorm',
          mipLevelCount: this.options.generateMips ? this.getNumMipLevels(this.size.width, this.size.height) : 1,
          size: [this.size.width, this.size.height],
          usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
        }
      : {
          format: 'rgba8unorm',
          size: [this.size.width, this.size.height],
          usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
        }

    this.texture = this.renderer.createTexture(textureOptions)

    this.shouldBindGroup = true
    this.shouldUpdate = true
  }

  generateMips = ((device) => {
    let sampler
    let module
    const pipelineByFormat = {}

    return function generateMips(device) {
      if (!module) {
        module = device.createShaderModule({
          label: 'textured quad shaders for mip level generation',
          code: `
            struct VSOutput {
              @builtin(position) position: vec4f,
              @location(0) texcoord: vec2f,
            };

            @vertex fn vs(
              @builtin(vertex_index) vertexIndex : u32
            ) -> VSOutput {
              var pos = array<vec2f, 6>(

                vec2f( 0.0,  0.0),  // center
                vec2f( 1.0,  0.0),  // right, center
                vec2f( 0.0,  1.0),  // center, top

                // 2st triangle
                vec2f( 0.0,  1.0),  // center, top
                vec2f( 1.0,  0.0),  // right, center
                vec2f( 1.0,  1.0),  // right, top
              );

              var vsOutput: VSOutput;
              let xy = pos[vertexIndex];
              vsOutput.position = vec4f(xy * 2.0 - 1.0, 0.0, 1.0);
              vsOutput.texcoord = vec2f(xy.x, 1.0 - xy.y);
              return vsOutput;
            }

            @group(0) @binding(0) var ourSampler: sampler;
            @group(0) @binding(1) var ourTexture: texture_2d<f32>;

            @fragment fn fs(fsInput: VSOutput) -> @location(0) vec4f {
              return textureSample(ourTexture, ourSampler, fsInput.texcoord);
            }
          `,
        })

        sampler = device.createSampler({
          minFilter: 'linear',
        })
      }

      if (!pipelineByFormat[this.texture.format]) {
        pipelineByFormat[this.texture.format] = device.createRenderPipeline({
          label: 'mip level generator pipeline',
          layout: 'auto',
          vertex: {
            module,
            entryPoint: 'vs',
          },
          fragment: {
            module,
            entryPoint: 'fs',
            targets: [{ format: this.texture.format }],
          },
        })
      }
      const pipeline = pipelineByFormat[this.texture.format]

      const encoder = device.createCommandEncoder({
        label: 'mip gen encoder',
      })

      let width = this.texture.width
      let height = this.texture.height
      let baseMipLevel = 0
      while (width > 1 || height > 1) {
        width = Math.max(1, (width / 2) | 0)
        height = Math.max(1, (height / 2) | 0)

        const bindGroup = device.createBindGroup({
          layout: pipeline.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: sampler },
            {
              binding: 1,
              resource: this.texture.createView({
                baseMipLevel,
                mipLevelCount: 1,
              }),
            },
          ],
        })

        ++baseMipLevel

        const renderPassDescriptor = {
          label: 'our basic canvas renderPass',
          colorAttachments: [
            {
              view: this.texture.createView({ baseMipLevel, mipLevelCount: 1 }),
              loadOp: 'clear',
              storeOp: 'store',
            },
          ],
        }

        const pass = encoder.beginRenderPass(renderPassDescriptor)
        pass.setPipeline(pipeline)
        pass.setBindGroup(0, bindGroup)
        pass.draw(6) // call our vertex shader 6 times
        pass.end()
      }

      const commandBuffer = encoder.finish()
      device.queue.submit([commandBuffer])
    }
  })()

  createSampler() {
    this.sampler = this.renderer.createSampler({
      addressModeU: this.options.addressModeU,
      addressModeV: this.options.addressModeV,
      magFilter: this.options.magFilter,
      minFilter: this.options.minFilter,
      mipmapFilter: this.options.mipmapFilter,
    })
  }

  async loadSource(source) {
    this.options.source = source
    this.source = await this.loadImageBitmap(this.options.source)

    this.size = {
      width: this.source.naturalWidth || this.source.width || this.source.videoWidth,
      height: this.source.naturalHeight || this.source.height || this.source.videoHeight,
    }

    this.textureMatrix.shouldUpdateUniform(this.options.name + 'Matrix')

    this.sourceLoaded = true // TODO useful?
    this.createTexture()
  }
}
