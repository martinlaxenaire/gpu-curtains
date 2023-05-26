export class Texture {
  constructor(
    renderer,
    options = {
      source: null,
      generateMips: false,
      flipY: true,
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
      source: null,
      generateMips: false,
      flipY: true,
    }

    this.options = { ...defaultOptions, ...options }

    this.source = null

    this.sourceLoaded = false
    this.shouldUpdate = false
    this.shouldBindGroup = false
  }

  getNumMipLevels(...sizes) {
    const maxSize = Math.max(...sizes)
    return (1 + Math.log2(maxSize)) | 0
  }

  async loadImageBitmap(url) {
    const res = await fetch(url)
    const blob = await res.blob()
    return await createImageBitmap(blob, { colorSpaceConversion: 'none' })
  }

  // createEmptyTexture(device) {
  //   this.texture = device.createTexture({
  //     format: 'rgba8unorm',
  //     size: [1, 1],
  //     usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
  //   })
  //
  //   device.queue.writeTexture(
  //     { texture: this.texture },
  //     new Uint8Array([0, 0, 0, 255]),
  //     { bytesPerRow: 4 },
  //     { width: 1, height: 1 },
  //   )
  // }

  // copySourceToTexture(device, texture, source) {
  //   device.queue.copyExternalImageToTexture(
  //     { source: this.source, flipY: this.options.flipY, },
  //     { texture: texture },
  //     { width: this.source.width, height: this.source.height },
  //   );
  //
  //   if (texture.mipLevelCount > 1) {
  //     this.generateMips(device);
  //   }
  // }

  uploadTexture(device) {
    if (this.source) {
      device.queue.copyExternalImageToTexture(
        { source: this.source, flipY: this.options.flipY },
        { texture: this.texture },
        { width: this.source.width, height: this.source.height }
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

  // createTextureFromSource(device, options = {}) {
  //   const texture = device.createTexture({
  //     format: 'rgba8unorm',
  //     mipLevelCount: this.options.generateMips ? this.getNumMipLevels(this.source.width, this.source.height) : 1,
  //     size: [this.source.width, this.source.height],
  //     usage: GPUTextureUsage.TEXTURE_BINDING |
  //       GPUTextureUsage.COPY_DST |
  //       GPUTextureUsage.RENDER_ATTACHMENT,
  //   });
  //   this.copySourceToTexture(device, texture, options);
  //   return texture;
  // }

  createTexture() {
    const textureOptions = this.source
      ? {
          format: 'rgba8unorm',
          mipLevelCount: this.options.generateMips ? this.getNumMipLevels(this.source.width, this.source.height) : 1,
          size: [this.source.width, this.source.height],
          usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
        }
      : {
          format: 'rgba8unorm',
          size: [1, 1],
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

  // async createTextureFromImage(device, url, options) {
  //   this.source = await this.loadImageBitmap(url);
  //   return this.createTextureFromSource(device, options);
  // }

  createSampler() {
    this.sampler = this.renderer.createSampler({
      addressModeU: 'repeat',
      addressModeV: 'repeat',
      magFilter: 'linear',
      minFilter: 'linear',
      mipmapFilter: 'linear',
    })
  }

  async loadSource() {
    this.source = await this.loadImageBitmap(this.options.source)
    this.createTexture()
  }

  /*async createTexture(device, pipeline, url, options) {
    // create a sampler
    //this.sampler = this.createSampler(device)

    // create an empty texture and bind group
    this.createEmptyTexture(device)
    this.shouldBindGroup = true

    // this.bindGroup = device.createBindGroup({
    //   label: 'Texture',
    //   layout: pipeline.getBindGroupLayout(1),
    //   entries: [
    //     { binding: 0, resource: this.sampler },
    //     { binding: 1, resource: this.texture.createView() },
    //   ],
    // });

    // again
    this.texture = await this.createTextureFromImage(device, url, options)
    this.shouldBindGroup = true
    // this.bindGroup = device.createBindGroup({
    //   label: 'Texture',
    //   layout: pipeline.getBindGroupLayout(1),
    //   entries: [
    //     { binding: 0, resource: this.sampler },
    //     { binding: 1, resource: this.texture.createView() },
    //   ],
    // });

    this.sourceLoaded = true
  }*/
}
