import { Plane } from '../../../dist/gpu-curtains.js'
import { imagePlaneFs, imagePlaneVs } from '../shaders/image-plane.wgsl.js'

export class TexturesPlanes {
  constructor({ gpuCurtains }) {
    this.gpuCurtains = gpuCurtains

    this.planes = []
    this.tween = null

    this.init()
  }

  init() {
    const planeEls = document.querySelectorAll('.textures-plane')

    const scaleIncrease = 1.5
    const scales = {
      top: 1,
      bottom: 1,
    }

    const duration = 1

    planeEls.forEach((planeEl, index) => {
      const plane = new Plane(this.gpuCurtains, planeEl, {
        heightSegments: 20,
        shaders: {
          vertex: {
            code: imagePlaneVs,
          },
          fragment: {
            code: imagePlaneFs,
          },
        },
        uniforms: {
          deformation: {
            struct: {
              strength: {
                type: 'f32',
                value: 0,
              },
            },
          },
        },
        texturesOptions: {
          generateMips: true,
          useExternalTextures: false,
          placeholderColor: Math.random() > 0.5 ? [255, 0, 255, 1] : [0, 255, 255, 1],
        },
      })

      plane.userData.index = index

      plane.transformOrigin.y = index < 3 ? 0 : 1

      plane.onLoading((texture) => {
        texture.transformOrigin.y = index < 3 ? 0 : 1
        texture.scale.set(scaleIncrease, scaleIncrease, 1)

        if (texture.isVideoSource) {
          texture.source.play()
        }
      })

      this.planes.push(plane)
    })

    this.tween = gsap
      .timeline({
        repeat: -1,
      })
      .to(scales, {
        top: 0.75,
        bottom: 1.25,
        duration,
        ease: 'power3.out',
        onUpdate: () => {
          this.planes.forEach((plane) => {
            if (plane.userData.index < 3) {
              plane.scale.y = scales.top
              plane.uniforms.deformation.strength.value = scales.top - 1
            } else {
              plane.scale.y = scales.bottom
              plane.uniforms.deformation.strength.value = scales.bottom - 1

              plane.textures[0].scale.set(scaleIncrease / scales.bottom, scaleIncrease / scales.bottom, 1)
            }
          })
        },
      })
      .to(scales, {
        top: 1,
        bottom: 1,
        duration,
        ease: 'power3.in',
        onUpdate: () => {
          this.planes.forEach((plane) => {
            if (plane.userData.index < 3) {
              plane.scale.y = scales.top
              plane.uniforms.deformation.strength.value = scales.top - 1
            } else {
              plane.scale.y = scales.bottom
              plane.uniforms.deformation.strength.value = scales.bottom - 1

              plane.textures[0].scale.set(scaleIncrease / scales.bottom, scaleIncrease / scales.bottom, 1)
            }
          })
        },
      })
      .to(scales, {
        top: 1.25,
        bottom: 0.75,
        duration,
        ease: 'power3.out',
        onUpdate: () => {
          this.planes.forEach((plane) => {
            if (plane.userData.index < 3) {
              plane.scale.y = scales.top
              plane.uniforms.deformation.strength.value = scales.top - 1

              plane.textures[0].scale.set(scaleIncrease / scales.top, scaleIncrease / scales.top, 1)
            } else {
              plane.scale.y = scales.bottom
              plane.uniforms.deformation.strength.value = scales.bottom - 1
            }
          })
        },
      })
      .to(scales, {
        top: 1,
        bottom: 1,
        duration,
        ease: 'power3.in',
        onUpdate: () => {
          this.planes.forEach((plane) => {
            if (plane.userData.index < 3) {
              plane.scale.y = scales.top
              plane.uniforms.deformation.strength.value = scales.top - 1

              plane.textures[0].scale.set(scaleIncrease / scales.top, scaleIncrease / scales.top, 1)
            } else {
              plane.scale.y = scales.bottom
              plane.uniforms.deformation.strength.value = scales.bottom - 1
            }
          })
        },
      })
  }

  destroy() {
    this.tween?.kill()
    this.planes.forEach((plane) => plane.remove())
  }
}
