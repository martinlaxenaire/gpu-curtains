window.addEventListener('DOMContentLoaded', async () => {
  // set up our WebGL context and append the canvas to our wrapper
  const gpuCurtains = new GPUCurtains.GPUCurtains({
    container: 'canvas',
    watchScroll: false, // no need to listen for the scroll in this example
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
  })

  await gpuCurtains.setRendererContext()

  const meshVs = /* wgsl */ `  
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };

    @vertex fn main(
      attributes: Attributes,
    ) -> VSOutput {    
      var vsOutput : VSOutput;
                    
      vsOutput.position = getOutputPosition(camera, matrices, attributes.position);
      vsOutput.uv = getUVCover(attributes.uv, planeTextureMatrix);
      
      return vsOutput;
    }
  `

  const meshFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };
  
    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      return textureSample(planeTexture, defaultSampler, fsInput.uv);
    }
  `

  //const cube = new GPUCurtains.DOMMesh(gpuCurtains, '#canvas', {
  const plane = new GPUCurtains.Plane(gpuCurtains, '.plane', {
    shaders: {
      vertex: {
        code: meshVs,
      },
      fragment: {
        code: meshFs,
      },
    },
    cullMode: 'none',
  })

  const planeBBox = document.createElement('div')
  planeBBox.classList.add('mesh-bounding-box')
  planeBBox.style.borderColor = 'red'
  document.body.appendChild(planeBBox)

  plane.onRender(() => {
    planeBBox.style.top = plane.projectedBoundingRect.top + 'px'
    planeBBox.style.left = plane.projectedBoundingRect.left + 'px'
    planeBBox.style.width = plane.projectedBoundingRect.width + 'px'
    planeBBox.style.height = plane.projectedBoundingRect.height + 'px'
  })

  // GUI
  const gui = new lil.GUI({
    title: 'Plane transformations',
  })

  const { camera } = gpuCurtains

  const perspectiveFolder = gui.addFolder('Camera')
  perspectiveFolder
    .add({ value: camera.fov }, 'value', 1, 179, 1)
    .name('Field of view')
    .onChange((value) => {
      camera.setFov(value)
    })

  const debugProjectionFolder = gui.addFolder('Frustum culling DOM bounding rectangle')

  debugProjectionFolder
    .add({ show: true }, 'show')
    .name('Show')
    .onChange((value) => {
      planeBBox.style.display = value ? 'block' : 'none'
    })

  const planeFolder = gui.addFolder('Plane')

  const positionFolder = planeFolder.addFolder('DOM Position')
  positionFolder
    .add(plane.documentPosition, 'x', -1 * gpuCurtains.boundingRect.width, gpuCurtains.boundingRect.width, 20)
    .name('X')
  positionFolder
    .add(plane.documentPosition, 'y', -1 * gpuCurtains.boundingRect.height, gpuCurtains.boundingRect.height, 20)
    .name('Y')
  positionFolder.add(plane.documentPosition, 'z', -1000, 1000, 0.1).name('Z')

  const transformOriginFolder = planeFolder.addFolder('Transform origin')
  transformOriginFolder.add(plane.transformOrigin, 'x', -1, 2, 0.1).name('X')
  transformOriginFolder.add(plane.transformOrigin, 'y', -1, 2, 0.1).name('Y')
  transformOriginFolder.add(plane.transformOrigin, 'z', -1, 2, 0.1).name('Z')

  const rotationFolder = planeFolder.addFolder('Rotation')
  rotationFolder.add(plane.rotation, 'x', Math.PI * -2, Math.PI * 2, 0.01).name('X')
  rotationFolder.add(plane.rotation, 'y', Math.PI * -2, Math.PI * 2, 0.01).name('Y')
  rotationFolder.add(plane.rotation, 'z', Math.PI * -2, Math.PI * 2, 0.01).name('Z')

  const scaleFolder = planeFolder.addFolder('Scale')
  scaleFolder.add(plane.scale, 'x', 0.1, 2, 0.1).name('X')
  scaleFolder.add(plane.scale, 'y', 0.1, 2, 0.1).name('Y')
  scaleFolder.add(plane.scale, 'z', 0.1, 2, 0.1).name('Z')

  const texture = plane.textures[0]

  const textureFolder = gui.addFolder('Texture')

  const textureTransformOriginFolder = textureFolder.addFolder('Transform origin')
  textureTransformOriginFolder.add(texture.transformOrigin, 'x', -1, 2, 0.1).name('X')
  textureTransformOriginFolder.add(texture.transformOrigin, 'y', -1, 2, 0.1).name('Y')

  const textureRotationFolder = textureFolder.addFolder('Rotation')
  textureRotationFolder.add(texture.rotation, 'z', Math.PI * -2, Math.PI * 2, 0.01).name('Z')

  const textureScaleFolder = textureFolder.addFolder('Scale')
  textureScaleFolder.add(texture.scale, 'x', 0.1, 2, 0.1).name('X')
  textureScaleFolder.add(texture.scale, 'y', 0.1, 2, 0.1).name('Y')
})
