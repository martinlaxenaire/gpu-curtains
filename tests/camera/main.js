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
      @location(1) normal: vec3f,
    };

    @vertex fn main(
      attributes: Attributes,
    ) -> VSOutput {    
      var vsOutput : VSOutput;
                    
      vsOutput.position = getOutputPosition(camera, matrices, attributes.position);
      vsOutput.uv = attributes.uv;
      vsOutput.normal = attributes.normal;
      
      return vsOutput;
    }
  `

  const meshFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
      @location(1) normal: vec3f,
    };
  
    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      // normals
      return vec4(fsInput.normal * 0.5 + 0.5, 1.0);
    }
  `

  //const cube = new GPUCurtains.DOMMesh(gpuCurtains, '#canvas', {
  const cube = new GPUCurtains.Mesh(gpuCurtains, {
    geometry: new GPUCurtains.BoxGeometry(),
    shaders: {
      vertex: {
        code: meshVs,
      },
      fragment: {
        code: meshFs,
      },
    },
  })

  cube.position.x = 1.5

  const cubeBBox = document.createElement('div')
  cubeBBox.classList.add('mesh-bounding-box')
  cubeBBox.style.borderColor = 'red'
  document.body.appendChild(cubeBBox)

  cube.onRender(() => {
    cube.rotation.x += 0.02

    cubeBBox.style.top = cube.projectedBoundingRect.top + 'px'
    cubeBBox.style.left = cube.projectedBoundingRect.left + 'px'
    cubeBBox.style.width = cube.projectedBoundingRect.width + 'px'
    cubeBBox.style.height = cube.projectedBoundingRect.height + 'px'
  })

  const plane = new GPUCurtains.Mesh(gpuCurtains, {
    geometry: new GPUCurtains.PlaneGeometry(),
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

  plane.position.x = -1.5

  const planeBBox = document.createElement('div')
  planeBBox.classList.add('mesh-bounding-box')
  planeBBox.style.borderColor = 'yellow'
  document.body.appendChild(planeBBox)

  plane.onRender(() => {
    plane.rotation.y += 0.02

    planeBBox.style.top = plane.projectedBoundingRect.top + 'px'
    planeBBox.style.left = plane.projectedBoundingRect.left + 'px'
    planeBBox.style.width = plane.projectedBoundingRect.width + 'px'
    planeBBox.style.height = plane.projectedBoundingRect.height + 'px'
  })

  // GUI
  const gui = new lil.GUI({
    title: 'Camera',
  })

  const { camera } = gpuCurtains
  const lookAt = new GPUCurtains.Vec3()

  const perspectiveFolder = gui.addFolder('Perspective')
  perspectiveFolder
    .add({ value: camera.fov }, 'value', 1, 179, 1)
    .name('Field of view')
    .onChange((value) => {
      camera.setFov(value)
    })

  const positionFolder = gui.addFolder('Position')
  positionFolder
    .add(camera.position, 'x', -20, 20, 0.1)
    .name('X')
    .onChange(() => {
      camera.lookAt(lookAt)
    })

  positionFolder
    .add(camera.position, 'y', -20, 20, 0.1)
    .name('Y')
    .onChange(() => {
      camera.lookAt(lookAt)
    })

  positionFolder
    .add(camera.position, 'z', -20, 20, 0.1)
    .name('Z')
    .onChange(() => {
      camera.lookAt(lookAt)
    })

  const lookAtFolder = gui.addFolder('Look at')
  lookAtFolder
    .add(lookAt, 'x', -20, 20, 0.1)
    .name('X')
    .onChange(() => {
      camera.lookAt(lookAt)
    })

  lookAtFolder
    .add(lookAt, 'y', -20, 20, 0.1)
    .name('Y')
    .onChange(() => {
      camera.lookAt(lookAt)
    })

  lookAtFolder
    .add(lookAt, 'z', -20, 20, 0.1)
    .name('Z')
    .onChange(() => {
      camera.lookAt(lookAt)
    })

  const debugProjectionFolder = gui.addFolder('Frustum culling DOM bounding rectangles')
  debugProjectionFolder
    .add({ show: true }, 'show')
    .name('Cube')
    .onChange((value) => {
      cubeBBox.style.display = value ? 'block' : 'none'
    })

  debugProjectionFolder
    .add({ show: true }, 'show')
    .name('Plane')
    .onChange((value) => {
      planeBBox.style.display = value ? 'block' : 'none'
    })
})
