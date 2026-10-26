import {
  GLTFLoader,
  Raycaster,
  AmbientLight,
  DirectionalLight,
  EnvironmentMap,
  GLTFScenesManager,
  DOMObject3D,
  Vec3,
} from '../../../dist/esm/index.mjs'

export class GLTFExample {
  constructor({ gpuCurtains, scrollObserver }) {
    this.gpuCurtains = gpuCurtains
    this.scrollObserver = scrollObserver

    this.init()
  }

  async init() {
    this.renderer = this.gpuCurtains.createCurtainsRenderer({
      label: 'Suzanne Curtains Renderer',
      container: '#suzanne-canvas',
      camera: {
        fov: 35,
      },
      hdrRendering: true,
      toneMapping: 'Khronos',
      colorSpace: 'srgb',
    })

    this.raycaster = new Raycaster(this.renderer)

    // raycaster scroll offset
    this.offsetTop = window.pageYOffset

    this.renderer.onResize(() => {
      this.offsetTop = window.pageYOffset
    })

    this.scrollObserver.observe({
      element: this.renderer.domElement.element,
      keepObserving: true,
      onElVisible: () => {
        this.renderer.shouldRenderScene = true
      },
      onElHidden: () => {
        this.renderer.shouldRenderScene = false
      },
    })

    // LIGHTS
    this.environmentMap = new EnvironmentMap(this.renderer, {
      diffuseIntensity: 1,
      specularIntensity: 0.325,
    })

    this.environmentMap.loadAndComputeFromHDR('./website/assets/hdr/cannon_1k.hdr')

    this.ambientLight = new AmbientLight(this.renderer, {
      intensity: 0.1,
    })

    this.blueDirectionalLight = new DirectionalLight(this.renderer, {
      position: new Vec3(50, 50, 12.5),
      intensity: 0.375,
      color: new Vec3(0, 1, 1),
    })

    this.pinkDirectionalLight = new DirectionalLight(this.renderer, {
      position: new Vec3(-50, -50, 25),
      intensity: 0.5,
      color: new Vec3(1, 0, 1),
    })

    this.opacityTween = gsap.timeline({
      paused: true,
    })

    this.gltfElement = document.querySelector('#suzanne-gltf')

    // will hold our gltf scenes
    this.parentNode = new DOMObject3D(this.renderer, this.gltfElement, {
      watchScroll: false,
    }).onAfterDOMElementResize(() => {
      this.parentNode.position.z = -0.5 * this.parentNode.boundingBox.size.z * this.parentNode.DOMObjectWorldScale.z
    })

    this.parentNode.parent = this.renderer.scene

    this.renderer.onBeforeRender(() => {
      this.parentNode.rotation.y += 0.01
    })

    this.gltfLoader = new GLTFLoader()
    await this.loadGLTF()
  }

  async loadGLTF() {
    const gltf = await this.gltfLoader.loadFromUrl('./website/assets/gltf/Suzanne.gltf')
    this.gltfScenesManager = new GLTFScenesManager({ renderer: this.renderer, gltf })
    const { scenesManager } = this.gltfScenesManager
    const { node, boundingBox } = scenesManager
    const { center } = boundingBox

    // center the scenes manager parent node
    // needed for accurate position and transform origin calculations
    node.position.sub(center)
    node.parent = this.parentNode

    // reset parent node rotation
    this.parentNode.rotation.y = 0

    // copy new scenes bounding box into DOMObject3D own bounding box
    this.parentNode.boundingBox.copy(boundingBox)

    // add the meshes with a really basic lightning setup
    this.meshes = this.gltfScenesManager.addMeshes((meshDescriptor) => {
      const { parameters } = meshDescriptor

      parameters.userData = {
        isHovered: false,
        scaleTween: null,
      }

      parameters.material.environmentMap = this.environmentMap

      // add iridescence and clearcoat
      parameters.material.iridescence = 0.5
      parameters.material.clearcoat = 1

      parameters.material.opacity = 0
      // for a better result we won't use transparency blending
      // but rather multiply the rgb values with opacity
      //parameters.transparent = true
      parameters.material.fragmentChunks = {
        additionalContribution: `
          outputColor = vec4(outputColor.rgb * outputColor.a, outputColor.a);
        `,
      }

      parameters.material.shading = 'PBR'
    })

    this.meshes.forEach((mesh, index) => {
      this.opacityTween.to(mesh.uniforms.material.opacity, {
        value: 1,
        duration: 1.5,
        delay: 0.5,
      })
    })

    const parentContainer = this.gltfElement.closest('#engine-3d-suzanne')

    this.opacityTween.call(() => parentContainer.classList.add('is-visible'), null, 0.25)

    this.scrollObserver.observe({
      element: this.gltfElement,
      onElVisible: () => {
        this.opacityTween.play()
      },
    })

    window.addEventListener('mousemove', this.onPointerMove.bind(this))
    window.addEventListener('touchmove', this.onPointerMove.bind(this))
  }

  onPointerMove(e) {
    if (this.meshes && this.meshes.length) {
      const scroll = window.pageYOffset
      const offset = { x: 0, y: scroll - this.offsetTop }
      this.raycaster.setFromMouse(e, offset)

      const intersections = this.raycaster.intersectObjects(this.meshes)

      if (intersections.length) {
        const closestIntersection = intersections[0]

        if (!closestIntersection.object.userData.isHovered) {
          closestIntersection.object.userData.isHovered = true

          if (closestIntersection.object.userData.scaleTween) {
            closestIntersection.object.userData.scaleTween.kill()
          }

          closestIntersection.object.userData.scaleTween = gsap.to(closestIntersection.object.scale, {
            x: 1.1,
            y: 1.1,
            z: 1.1,
            duration: 0.5,
            ease: 'power3.inOut',
            onComplete: () => {
              closestIntersection.object.userData.scaleTween = null
            },
          })
        }
      } else {
        this.meshes.forEach((mesh) => {
          mesh.userData.isHovered = false

          if (mesh.userData.scaleTween) {
            mesh.userData.scaleTween.kill()
          }

          mesh.userData.scaleTween = gsap.to(mesh.scale, {
            x: 1,
            y: 1,
            z: 1,
            duration: 0.5,
            ease: 'power3.out',
            onComplete: () => {
              mesh.userData.scaleTween = null
            },
          })
        })
      }
    }
  }

  destroy() {
    window.removeEventListener('mousemove', this.onPointerMove.bind(this))
    window.removeEventListener('touchmove', this.onPointerMove.bind(this))

    this.opacityTween.kill()

    this.gltfScenesManager?.scenesManager.meshes.forEach((mesh) => {
      if (mesh.userData.scaleTween) {
        mesh.userData.scaleTween.kill()
      }
    })

    this.gltfScenesManager?.destroy()

    this.ambientLight.remove()
    this.blueDirectionalLight.remove()
    this.pinkDirectionalLight.remove()
  }
}
