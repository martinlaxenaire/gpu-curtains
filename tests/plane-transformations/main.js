// Goal of this test is to help debug plane transformations and raycasting
window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const { GPUCurtains, Plane, Vec2, Raycaster, RenderBundle } = await import(/* @vite-ignore */ path)

  // set up our WebGPU context and append the canvas to our wrapper
  const gpuCurtains = new GPUCurtains({
    container: '#canvas',
    watchScroll: false, // no need to listen for the scroll in this example
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
  })

  await gpuCurtains.setDevice()

  console.log(gpuCurtains)

  const meshShader = /* wgsl */ `  
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) originalUv: vec2f,
      @location(1) uv: vec2f,
    };

    @vertex fn vsMain(
      attributes: Attributes,
    ) -> VSOutput {    
      var vsOutput : VSOutput;
                    
      vsOutput.position = getOutputPosition(attributes.position);
      vsOutput.originalUv = attributes.uv;
      vsOutput.uv = getUVCover(attributes.uv, texturesMatrices.planeTexture.matrix);
      
      return vsOutput;
    }
    
    @fragment fn fsMain(fsInput: VSOutput) -> @location(0) vec4f {
      var color: vec4f = textureSample(planeTexture, defaultSampler, fsInput.uv);
      
      var cursor: vec2f = fsInput.originalUv - raycasting.uv;
      cursor.x = cursor.x * raycasting.aspect;
      var cursorSize: f32 = step(length(cursor), raycasting.size);
      
      return mix(color, vec4(1.0), cursorSize);
    }
  `

  const renderBundle = new RenderBundle(gpuCurtains, {
    size: 1,
    useBuffer: true,
  })

  const plane = new Plane(gpuCurtains, '.plane', {
    renderBundle,
    shaders: {
      vertex: {
        code: meshShader,
        entryPoint: 'vsMain',
      },
      fragment: {
        code: meshShader,
        entryPoint: 'fsMain',
      },
    },
    cullMode: 'none',
    uniforms: {
      raycasting: {
        struct: {
          uv: {
            type: 'vec2f',
            value: new Vec2(Infinity),
          },
          aspect: {
            type: 'f32',
            value: 1,
          },
          size: {
            type: 'f32',
            value: 0.2,
          },
        },
      },
    },
  })

  const setMouseAspect = () => {
    plane.uniforms.raycasting.aspect.value = plane.boundingRect.width / plane.boundingRect.height
  }

  setMouseAspect()

  const planeBBox = document.createElement('div')
  planeBBox.classList.add('mesh-bounding-box')
  planeBBox.style.borderColor = 'red'
  document.body.appendChild(planeBBox)

  plane
    .onRender(() => {
      planeBBox.style.top = plane.projectedBoundingRect.top + 'px'
      planeBBox.style.left = plane.projectedBoundingRect.left + 'px'
      planeBBox.style.width = plane.projectedBoundingRect.width + 'px'
      planeBBox.style.height = plane.projectedBoundingRect.height + 'px'
    })
    .onAfterResize(setMouseAspect)

  console.log(plane)

  const raycaster = new Raycaster(gpuCurtains)

  const onMouseMove = (e) => {
    raycaster.setFromMouse(e)

    const intersections = raycaster.intersectObject(plane)

    if (intersections.length) {
      const closestIntersection = intersections[0]
      plane.uniforms.raycasting.uv.value.copy(closestIntersection.uv)
    } else {
      plane.uniforms.raycasting.uv.value.set(Infinity)
    }
  }

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('touchmove', onMouseMove)

  // GUI
  const gui = new lil.GUI({
    title: 'Plane transformations',
  })

  const { camera } = gpuCurtains.renderer

  const perspectiveFolder = gui.addFolder('Camera')
  perspectiveFolder.add(camera, 'fov', 1, 179, 1).name('Field of view')

  const debugProjectionFolder = gui.addFolder('Frustum culling DOM bounding rectangle')

  debugProjectionFolder
    .add({ show: true }, 'show')
    .name('Show')
    .onChange((value) => {
      planeBBox.style.display = value ? 'block' : 'none'
    })

  const planeFolder = gui.addFolder('Plane')

  planeFolder
    .add(plane.material.options.rendering, 'cullMode', ['front', 'back', 'none'])
    .name('Cull mode')
    .onChange((value) => {
      plane.material.setRenderingOptions({
        cullMode: value,
      })
    })

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

  const texture = plane.domTextures[0]

  const textureFolder = gui.addFolder('Texture')

  const textureTransformOriginFolder = textureFolder.addFolder('Transform origin')
  textureTransformOriginFolder.add(texture.transformOrigin, 'x', -1, 2, 0.1).name('X')
  textureTransformOriginFolder.add(texture.transformOrigin, 'y', -1, 2, 0.1).name('Y')

  textureFolder.add(texture, 'rotation', Math.PI * -2, Math.PI * 2, 0.01).name('Rotation')

  const textureScaleFolder = textureFolder.addFolder('Scale')
  textureScaleFolder.add(texture.scale, 'x', 0.1, 2, 0.1).name('X')
  textureScaleFolder.add(texture.scale, 'y', 0.1, 2, 0.1).name('Y')
})
