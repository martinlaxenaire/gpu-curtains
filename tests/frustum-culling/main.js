// Goals of this test:
// - test the GPUDeviceManager and GPUCameraRenderer without the use of GPUCurtains class
// - test camera position, rotation, lookAt, fov
// - test frustum culling
window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const { BoxGeometry, GPUCameraRenderer, GPUDeviceManager, Mesh, SphereGeometry } = await import(
    /* @vite-ignore */ path
  )

  // create a device manager
  const gpuDeviceManager = new GPUDeviceManager({
    label: 'Custom device manager',
  })

  // wait for the device to be created
  await gpuDeviceManager.init()

  // create a camera renderer
  const gpuCameraRenderer = new GPUCameraRenderer({
    deviceManager: gpuDeviceManager,
    container: document.querySelector('#canvas'),
  })

  gpuCameraRenderer.camera.position.z = 25

  const boxGeometry = new BoxGeometry()
  const sphereGeometry = new SphereGeometry()

  const nbTestMeshes = 15
  const meshes = []

  const randomMeshTransform = (mesh) => {
    mesh.scale.x = 0.25 + Math.random() * 2
    mesh.scale.y = 0.25 + Math.random() * 2
    mesh.scale.z = 0.25 + Math.random() * 2

    mesh.position.x =
      (Math.random() * 10 * Math.sign(Math.random() - 0.5) * gpuCameraRenderer.boundingRect.width) /
      gpuCameraRenderer.boundingRect.height
    mesh.position.y = Math.random() * 10 * Math.sign(Math.random() - 0.5)

    mesh.position.z = Math.random() * 5 * Math.sign(Math.random() - 0.5)
  }

  for (let i = 0; i < nbTestMeshes; i++) {
    const mesh = new Mesh(gpuCameraRenderer, {
      label: 'Test mesh ' + i,
      geometry: Math.random() > 0.5 ? sphereGeometry : boxGeometry,
    })

    meshes.push(mesh)

    const boundingSphereDiv = document.createElement('div')
    boundingSphereDiv.setAttribute('id', 'bounding-sphere-' + i)
    boundingSphereDiv.classList.add('bounding-box', 'sphere-bounding-box')
    document.body.appendChild(boundingSphereDiv)

    const OBBDiv = document.createElement('div')
    OBBDiv.setAttribute('id', 'obb-' + i)
    OBBDiv.classList.add('bounding-box', 'obb-bounding-box')
    document.body.appendChild(OBBDiv)

    randomMeshTransform(mesh)

    mesh
      .onBeforeRender(() => {
        mesh.rotation.x += 0.01
        mesh.rotation.y += 0.02
        mesh.rotation.z += 0.005
      })
      .onRender(() => {
        mesh.domFrustum.setDocumentCoordsFromClipSpaceSphere(mesh.clipSpaceBoundingSphere)

        Object.assign(boundingSphereDiv.style, {
          left: mesh.domFrustum.projectedBoundingRect.left + 'px',
          top: mesh.domFrustum.projectedBoundingRect.top + 'px',
          width: mesh.domFrustum.projectedBoundingRect.width + 'px',
          height: mesh.domFrustum.projectedBoundingRect.height + 'px',
        })

        mesh.domFrustum.setDocumentCoordsFromClipSpaceOBB()

        Object.assign(OBBDiv.style, {
          left: mesh.domFrustum.projectedBoundingRect.left + 'px',
          top: mesh.domFrustum.projectedBoundingRect.top + 'px',
          width: mesh.domFrustum.projectedBoundingRect.width + 'px',
          height: mesh.domFrustum.projectedBoundingRect.height + 'px',
        })
      })
  }

  const shuffleButton = document.querySelector('#shuffle-button')
  shuffleButton.addEventListener('click', () => {
    meshes.forEach((mesh) => randomMeshTransform(mesh))
  })
})
