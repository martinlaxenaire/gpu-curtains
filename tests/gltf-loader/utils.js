// helper to traverse scenes and fire a callback when a mesh is found
export const traverseScenes = (scenes, callback) => {
  const traverseChild = (child) => {
    child.meshes.forEach((meshDescriptor) => {
      callback({ child, meshDescriptor })
    })

    child.children.forEach((c) => {
      traverseChild(c)
    })
  }

  scenes.forEach((scene) => {
    scene.children.forEach((child) => {
      traverseChild(child)
    })
  })
}

// helper to build vertex and fragment shaders based on our meshDescriptor object
export const buildShaders = (meshDescriptor) => {
  const facultativeAttributes = meshDescriptor.attributes.filter((attribute) => attribute.name !== 'position')

  const structAttributes = facultativeAttributes
    .map((attribute, index) => {
      return `@location(${index}) ${attribute.name}: ${attribute.type},`
    })
    .join('\n')

  const outputAttributes = facultativeAttributes
    .map((attribute) => {
      return `vsOutput.${attribute.name} = attributes.${attribute.name};`
    })
    .join('\n')

  let outputPosition = 'vsOutput.position = getOutputPosition(attributes.position);'

  if (meshDescriptor.parameters.storages && meshDescriptor.parameters.storages.instances) {
    outputPosition = `
      var transformed: vec4f = instances.instanceMatrix[attributes.instanceIndex] * vec4f(attributes.position, 1.0);
      vsOutput.position = camera.projection * camera.view * transformed;`
  }

  const vs = /* wgsl */ `
    struct VertexOutput {
      @builtin(position) position: vec4f,
      ${structAttributes}
    };
    
    @vertex fn main(
      attributes: Attributes,
    ) -> VertexOutput {
      var vsOutput: VertexOutput;
    
      ${outputPosition}
      ${outputAttributes}
      
      return vsOutput;
    }
  `

  // not a PBR material for now, as it does not use roughness/metalness
  // we might want to implement it later
  // see https://github.com/oframe/ogl/blob/master/examples/load-gltf.html#L133
  const initColor = /* wgsl */ 'var color: vec4f = vec4();'
  const returnColor = /* wgsl */ 'return color;'

  // start with the base color
  let baseColor = /* wgsl */ 'var baseColor: vec4f = material.baseColorFactor;'

  const baseColorTexture = meshDescriptor.textures.find((t) => t.texture === 'baseColorTexture')

  if (baseColorTexture) {
    baseColor = /* wgsl */ `
      var baseColor: vec4f = textureSample(baseColorTexture, ${baseColorTexture.sampler}, fsInput.uv) * material.baseColorFactor;
      
      if (baseColor.a < material.alphaCutoff) {
        discard;
      }
    `
  }

  // add lightning
  const surfaceColor = /* wgsl */ `
    // An extremely simple directional lighting model, just to give our model some shape.
    let N = normalize(fsInput.normal);
    let L = normalize(light.position);
    let NDotL = max(dot(N, L), 0.0);
    color = vec4((baseColor.rgb * light.ambient) + (baseColor.rgb * NDotL * light.color), baseColor.a);
  `

  // emissive and occlusion
  const emissiveTexture = meshDescriptor.textures.find((t) => t.texture === 'emissiveTexture')
  const occlusionTexture = meshDescriptor.textures.find((t) => t.texture === 'occlusionTexture')

  let emissiveOcclusion = ''

  if (emissiveTexture) {
    emissiveOcclusion = /* wgsl */ `
        let gamma = 2.2; // Gamma value typically used for encoding
        var emissive: vec4f = textureSample(emissiveTexture, ${emissiveTexture.sampler}, fsInput.uv);
        emissive = vec4(material.emissiveFactor * pow(emissive.rgb, vec3(1.0 / gamma)), emissive.a);
      `
    if (occlusionTexture) {
      emissiveOcclusion += /* wgsl */ `
        var occlusion: vec4f = textureSample(occlusionTexture, ${occlusionTexture.sampler}, fsInput.uv);
        emissive *= occlusion.r;
      `
    }

    emissiveOcclusion += /* wgsl */ `
      color += emissive;
    `
  }

  const fs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      ${structAttributes}
    };
  
    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {          
      ${initColor}
      ${baseColor}
      ${surfaceColor}
      ${emissiveOcclusion}
      ${returnColor}
    }
  `

  return { vs, fs }
}
