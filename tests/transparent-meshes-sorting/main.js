// Goals of this test:
// - test the transparent meshes sorting
window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const { BoxGeometry, GPUCameraRenderer, GPUDeviceManager, Object3D, Mesh, OrbitControls } = await import(
    /* @vite-ignore */ path
  )

  // create a device manager
  const gpuDeviceManager = new GPUDeviceManager({
    label: 'Custom device manager',
    adapterOptions: {
      minFeatureLevel: 'compatibility',
    },
  })

  // wait for the device to be created
  await gpuDeviceManager.init()

  // create a camera renderer
  const gpuCameraRenderer = new GPUCameraRenderer({
    deviceManager: gpuDeviceManager,
    container: document.querySelector('#canvas'),
    //pixelRatio: window.devicePixelRatio,
    hdrRendering: false,
    toneMapping: false,
    colorSpace: 'linear',
  })

  const pivot = new Object3D()
  pivot.parent = gpuCameraRenderer.scene

  // pivot.quaternion.setAxisOrder('ZXY')
  // pivot.rotation.z = Math.PI / 2

  gpuCameraRenderer.camera.position.z = 25
  const orbitControls = new OrbitControls(gpuCameraRenderer)

  gpuDeviceManager.onBeforeRender(() => {
    // pivot.rotation.y += 0.02
  })

  const boxGeometry = new BoxGeometry()

  const meshes = []

  const assignBoundingDiv = (mesh) => {
    const boundingDiv = document.createElement('div')
    boundingDiv.setAttribute('id', mesh.uuid)
    boundingDiv.classList.add('bounding-box', 'hidden')
    document.body.appendChild(boundingDiv)

    mesh.userData.boundingDiv = boundingDiv

    mesh.onRender(() => {
      mesh.domFrustum.setDocumentCoordsFromClipSpaceSphere(mesh.clipSpaceBoundingSphere)

      Object.assign(boundingDiv.style, {
        left: mesh.domFrustum.projectedBoundingRect.left + 'px',
        top: mesh.domFrustum.projectedBoundingRect.top + 'px',
        width: mesh.domFrustum.projectedBoundingRect.width + 'px',
        height: mesh.domFrustum.projectedBoundingRect.height + 'px',
      })
    })
  }

  const nbCubes = 6
  const cullMode = 'back'
  const opacity = 0.5

  const uniforms = {
    params: {
      struct: {
        opacity: {
          type: 'f32',
          value: opacity,
        },
      },
    },
  }

  const fs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
      @location(1) normal: vec3f,
    };

    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      // normals
      return vec4(normalize(fsInput.normal) * 0.5 + 0.5, params.opacity);
    }
  `

  for (let i = 0; i < nbCubes; i++) {
    const mesh = new Mesh(gpuCameraRenderer, {
      label: 'Rotating cube ' + i,
      geometry: boxGeometry,
      transparent: true,
      //renderOrder: i === 0 ? 1 : 0,
      cullMode,
      shaders: {
        fragment: {
          code: fs,
        },
      },
      uniforms,
    })

    const cubePivot = new Object3D()
    cubePivot.parent = pivot

    cubePivot.rotation.y = (Math.PI * i * 2) / nbCubes
    mesh.position.x = 10

    mesh.parent = cubePivot

    assignBoundingDiv(mesh)

    meshes.push(mesh)
  }

  const smallCube = new Mesh(gpuCameraRenderer, {
    label: 'Small cube',
    geometry: boxGeometry,
    transparent: true,
    cullMode,
    shaders: {
      fragment: {
        code: fs,
      },
    },
    uniforms,
  })

  smallCube.position.z = 2

  assignBoundingDiv(smallCube)
  meshes.push(smallCube)

  const bigCube = new Mesh(gpuCameraRenderer, {
    label: 'Big cube',
    geometry: boxGeometry,
    transparent: true,
    cullMode,
    shaders: {
      fragment: {
        code: fs,
      },
    },
    uniforms,
  })

  bigCube.scale.set(4)

  assignBoundingDiv(bigCube)
  meshes.push(bigCube)

  // update bounding div helpers HTML with draw index
  gpuCameraRenderer.onBeforeRender(() => {
    const sortedMeshes = [...meshes]
    gpuCameraRenderer.scene.sortTransparentMeshes(sortedMeshes)

    sortedMeshes.forEach((mesh, index) => {
      mesh.userData.boundingDiv.innerHTML = index
    })
  })

  // GUI
  const gui = new lil.GUI({
    title: 'Transparent sorting',
  })

  gui
    .add({ showDebug: false }, 'showDebug')
    .name('Show debug')
    .onChange(() => {
      meshes.forEach((mesh) => {
        mesh.userData.boundingDiv.classList.toggle('hidden')
      })
    })

  gui
    .add({ opacity }, 'opacity', 0.05, 0.95, 0.01)
    .name('Opacity')
    .onChange((value) => {
      meshes.forEach((mesh) => (mesh.uniforms.params.opacity.value = value))
    })
})
