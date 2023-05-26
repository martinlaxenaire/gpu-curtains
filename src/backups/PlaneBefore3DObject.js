import { Mesh } from './Mesh'
import { UniformBinding } from './UniformBinding'
import { Camera } from '../camera/Camera'
import { DOMElement } from './DOMElement'
import { Mat4 } from '../math/Mat4'
import { Quat } from '../math/Quat'
import { Vec3 } from '../math/Vec3'

export class Plane {
  constructor(
    renderer,
    element,
    {
      label = 'Plane',

      // material
      vertexShader = '',
      fragmentShader = '',
      bindings = [],

      // geometry
      widthSegments = 1,
      heightSegments = 1,

      // Plane specific params
      alwaysDraw = false,
      visible = true,
      //transparent = false,
      drawCheckMargins = {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      },
      autoloadSources = true,
      watchScroll = true,
      fov = 50,

      // events
      onRender = () => {},
    } = {}
  ) {
    this.type = 'Plane'

    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    if (!renderer || renderer.type !== 'Renderer') {
      return
    }

    this.renderer = renderer
    this.renderer.planes.push(this)

    this.textures = []

    this.size = {
      world: {
        width: 0,
        height: 0,
        top: 0,
        left: 0,
        transformOrigin: {
          x: 0,
          y: 0,
          z: 0,
        },
      },
      document: {
        width: 0,
        height: 0,
        top: 0,
        left: 0,
      },
    }

    this.alwaysDraw = alwaysDraw
    this.visible = visible

    this.autoloadSources = autoloadSources

    this.watchScroll = watchScroll

    this.camera = new Camera({
      fov: fov,
      width: this.renderer.domElement.boundingRect.width,
      height: this.renderer.domElement.boundingRect.height,
      pixelRatio: this.renderer.pixelRatio,
      onBeforeUpdate: () => {
        if (!this.camera) return

        console.log('set world size from camera before update')
        this.setWorldSizes()
        this.applyTranslation()

        // translation along the Z axis is dependant of camera CSSPerspective
        // we're computing it here because it changes when the fov changes
        // because else we're skipping calcs inside applyTranslation
        this.translation.z = this.relativeTranslation.z / this.camera.CSSPerspective
      },
    })

    this.setMatricesUniformGroup()
    this.initTransformValues()

    this.domElement = new DOMElement({
      element,
      onSizeChanged: (boundingRect) => this.resize(boundingRect),
      onPositionChanged: (boundingRect) => {
        this.size.document = boundingRect

        this.setWorldSizes()
        this.applyTranslation()
      },
    })

    this.uniformsBindings = [
      this.matrixUniformBinding,
      ...bindings.map((binding, index) => {
        return new UniformBinding({
          label: binding.label || 'Uniforms' + index,
          name: binding.name || 'uniforms' + index,
          bindIndex: index + 1, // bindIndex 0 is already taken by matrix uniforms
          uniforms: binding.uniforms,
        })
      }),
    ]

    this.mesh = new Mesh(renderer, {
      label,
      vertexShader,
      fragmentShader,
      widthSegments,
      heightSegments,
      uniformsBindings: this.uniformsBindings,
    })

    console.log(this.mesh)

    this.uniforms = this.mesh.uniforms

    this.setInitSources()

    // callbacks
    this.onRender = onRender
  }

  resize(boundingRect) {
    this.size.document = boundingRect ?? this.domElement.element.getBoundingClientRect()
    // reset perspective
    // it will trigger camera onBeforeUpdate callback and update position and translation
    this.setPerspective(this.camera.fov, this.camera.near, this.camera.far)

    this.textures.forEach((texture) => texture.resize())

    // TODO onAfterResize callback
  }

  /***
   This will set our perspective matrix new parameters (fov, near plane and far plane)
   used internally but can be used externally as well to change fov for example

   params :
   @fov (float): the field of view
   @near (float): the nearest point where object are displayed
   @far (float): the farthest point where object are displayed
   ***/
  setPerspective(fov, near, far) {
    const containerBoundingRect = this.renderer.domElement.boundingRect
    this.camera.setPerspective(
      fov,
      near,
      far,
      containerBoundingRect.width,
      containerBoundingRect.height,
      this.renderer.pixelRatio
    )
  }

  /***
   This function takes pixel values along X and Y axis and convert them to world space coordinates

   params :
   @vector (Vec3): position to convert on X, Y and Z axes

   returns :
   @worldPosition: plane's position in WebGL space
   ***/
  documentToWorldSpace(vector) {
    return new Vec3(
      ((vector.x * this.renderer.pixelRatio) / this.renderer.domElement.boundingRect.width) *
        this.camera.screenRatio.width,
      -((vector.y * this.renderer.pixelRatio) / this.renderer.domElement.boundingRect.height) *
        this.camera.screenRatio.height,
      vector.z
    )
  }

  /**
   *
   */
  setWorldSizes() {
    const containerBoundingRect = this.renderer.domElement.boundingRect

    // dimensions and positions of our plane in the document and clip spaces
    // don't forget translations in webgl space are referring to the center of our plane and canvas
    const planeCenter = {
      x: this.size.document.width / 2 + this.size.document.left,
      y: this.size.document.height / 2 + this.size.document.top,
    }

    const containerCenter = {
      x: containerBoundingRect.width / 2 + containerBoundingRect.left,
      y: containerBoundingRect.height / 2 + containerBoundingRect.top,
    }

    // our plane world informations
    // since our vertices values range from -1 to 1, it is supposed to draw a square
    // we need to scale them under the hood relatively to our canvas
    // to display an accurately sized planes
    const world = {
      width: ((this.size.document.width / containerBoundingRect.width) * this.camera.screenRatio.width) / 2,
      height: ((this.size.document.height / containerBoundingRect.height) * this.camera.screenRatio.height) / 2,
      top: ((containerCenter.y - planeCenter.y) / containerBoundingRect.height) * this.camera.screenRatio.height,
      left: ((planeCenter.x - containerCenter.x) / containerBoundingRect.width) * this.camera.screenRatio.width,
    }

    console.log('sizes world', world, this.size.document)

    this.size.world = {
      ...world,
      // TODO new vec3 each time is not optimized
      transformOrigin: new Vec3(
        (this.transformOrigin.x * 2 - 1) * // between -1 and 1
          world.width,
        -(this.transformOrigin.y * 2 - 1) * // between -1 and 1
          world.height,
        this.transformOrigin.z
      ),
    }

    // this.matrixUniformBinding.uniforms.world.shouldUpdate = true;
    // this.matrixUniformBinding.uniforms.modelView.shouldUpdate = true;
    // this.matrixUniformBinding.uniforms.modelViewProjection.shouldUpdate = true;

    this.matrixUniformBinding.shouldUpdateUniform('world')
    this.matrixUniformBinding.shouldUpdateUniform('modelView')
    this.matrixUniformBinding.shouldUpdateUniform('modelViewProjection')
  }

  // setWorldPositions() {
  //   // positions of our plane in the document and clip spaces
  //   // don't forget translations in webgl space are referring to the center of our plane and canvas
  //   const planeCenter = {
  //     x: (this.size.document.width / 2) + this.size.document.left,
  //     y: (this.size.document.height / 2) + this.size.document.top,
  //   };
  //
  //   const containerBoundingRect = this.renderer.domElement.boundingRect
  //
  //   const containerCenter = {
  //     x: (containerBoundingRect.width / 2) + containerBoundingRect.left,
  //     y: (containerBoundingRect.height / 2) + containerBoundingRect.top,
  //   };
  //
  //   this.size.world.top = ((containerCenter.y - planeCenter.y) / containerBoundingRect.height) * this.camera.screenRatio.height;
  //   this.size.world.left = ((planeCenter.x - containerCenter.x) / containerBoundingRect.width) * this.camera.screenRatio.width;
  //
  //   this.matrixUniformBinding.shouldUpdateUniform('world')
  //   this.matrixUniformBinding.shouldUpdateUniform('modelView')
  //   this.matrixUniformBinding.shouldUpdateUniform('modelViewProjection')
  // }
  //
  // applyWorldPositions() {
  //   // set our plane sizes and positions relative to the world clipspace
  //   this.setWorldPositions();
  //
  //   // set the translation values
  //   this.applyTranslation();
  // }

  initTransformValues() {
    this.rotation = new Vec3()
    this.rotation.onChange(() => this.applyRotation())

    // initial quaternion
    this.quaternion = new Quat()

    // translation in viewport coordinates
    this.relativeTranslation = new Vec3()
    this.relativeTranslation.onChange(() => this.applyTranslation())

    // translation in webgl coordinates
    this.translation = new Vec3()

    // scale is a Vec3 with z always equal to 1
    this.scale = new Vec3(1)
    this.scale.onChange(() => {
      this.scale.z = 1
      this.applyScale()
    })

    // set plane transform origin to center
    this.transformOrigin = new Vec3(0.5, 0.5, 0)
    this.transformOrigin.onChange(() => {
      // set transformation origin relative to world space as well
      //this._setWorldTransformOrigin();
      //this._updateMVMatrix = true;
      // this.matrixUniformBinding.uniforms.world.shouldUpdate = true;
      // this.matrixUniformBinding.uniforms.modelView.shouldUpdate = true;
      // this.matrixUniformBinding.uniforms.modelViewProjection.shouldUpdate = true;

      this.matrixUniformBinding.shouldUpdateUniform('world')
      this.matrixUniformBinding.shouldUpdateUniform('modelView')
      this.matrixUniformBinding.shouldUpdateUniform('modelViewProjection')
    })
  }

  /***
   Init our plane model view and projection matrices and set their uniform locations
   ***/
  setMatricesUniformGroup() {
    this.matrixUniformBinding = new UniformBinding({
      label: 'Matrices',
      name: 'matrices',
      uniforms: {
        world: {
          name: 'world',
          type: 'mat4x4f',
          value: new Mat4(),
          onBeforeUpdate: () => {
            // compose our world transformation matrix from custom origin
            this.matrixUniformBinding.uniforms.world.value =
              this.matrixUniformBinding.uniforms.world.value.composeFromOrigin(
                this.translation,
                this.quaternion,
                this.scale,
                this.size.world.transformOrigin
              )

            // we need to scale our planes, from a square to a right sized rectangle
            // we're doing this after our transformation matrix because this scale transformation always have the same origin
            this.matrixUniformBinding.uniforms.world.value.scale({
              x: this.size.world.width,
              y: this.size.world.height,
              z: 1,
            })
          },
        },
        modelView: {
          // model view matrix (world matrix multiplied by camera view matrix)
          name: 'modelView',
          type: 'mat4x4f',
          value: new Mat4(),
          onBeforeUpdate: () => {
            // our model view matrix is our world matrix multiplied with our camera view matrix
            // in our case we're just subtracting the camera Z position to our world matrix
            // TODO copy?
            this.matrixUniformBinding.uniforms.modelView.value = this.matrixUniformBinding.uniforms.world.value
            this.matrixUniformBinding.uniforms.modelView.value.elements[14] -= this.camera.position.z
          },
        },
        projection: {
          // camera projection matrix
          name: 'projection',
          type: 'mat4x4f',
          value: new Mat4(),
          onBeforeUpdate: () => {
            this.matrixUniformBinding.uniforms.projection.value = this.camera.projectionMatrix
          },
        },
        modelViewProjection: {
          name: 'modelViewProjection',
          type: 'mat4x4f',
          value: new Mat4(),
          onBeforeUpdate: () => {
            // our modelViewProjection matrix, useful for bounding box calculations and frustum culling
            // this is the result of our projection matrix multiplied by our modelView matrix
            this.matrixUniformBinding.uniforms.modelViewProjection.value =
              this.matrixUniformBinding.uniforms.projection.value.multiply(
                this.matrixUniformBinding.uniforms.modelView.value
              )
          },
        },
      },
    })
  }

  setInitSources() {
    let loaderSize = 0
    if (this.autoloadSources) {
      const images = this.domElement.element.querySelectorAll('img')
      const videos = this.domElement.element.querySelectorAll('video')
      const canvases = this.domElement.element.querySelectorAll('canvas')

      // load images
      if (images.length) {
        //this.loadImages(images);
        images.forEach((image) => {
          //console.log(image.src)
          const texture = this.createTexture({
            // TODO index in texture for bindings
            name: image.getAttribute('data-name') ?? 'texture' + this.textures.length,
          })

          texture.loadSource(image.src)
        })
      }

      // load videos
      if (videos.length) {
        //this.loadVideos(videos);
      }

      // load canvases
      if (canvases.length) {
        //this.loadCanvases(canvases);
      }

      loaderSize = images.length + videos.length + canvases.length
    }
  }

  createTexture(options = {}) {
    if (!options.name) {
      options.name = 'texture' + this.textures.length
    }

    const texture = this.mesh.createTexture(options)
    texture.parent = this

    this.textures.push(texture)

    return texture
  }

  /***
   This will apply our rotation and tells our model view matrix to update
   ***/
  applyRotation() {
    this.quaternion.setFromVec3(this.rotation)

    // we should update the model view matrices
    // this.matrixUniformBinding.uniforms.world.shouldUpdate = true;
    // this.matrixUniformBinding.uniforms.modelView.shouldUpdate = true;
    // this.matrixUniformBinding.uniforms.modelViewProjection.shouldUpdate = true;

    this.matrixUniformBinding.shouldUpdateUniform('world')
    this.matrixUniformBinding.shouldUpdateUniform('modelView')
    this.matrixUniformBinding.shouldUpdateUniform('modelViewProjection')
  }

  /***
   This will set our plane translation by adding plane computed bounding box values and computed relative position values
   ***/
  applyTranslation() {
    // avoid unnecessary calculations if we don't have a users set relative position
    let worldPosition = new Vec3(0, 0, 0)
    //if(!this.relativeTranslation.equals(worldPosition)) {
    worldPosition = this.documentToWorldSpace(this.relativeTranslation)
    //}

    this.translation.set(
      this.size.world.left + worldPosition.x,
      this.size.world.top + worldPosition.y,
      this.relativeTranslation.z / this.camera.CSSPerspective
    )

    // this.matrixUniformBinding.uniforms.world.shouldUpdate = true;
    // this.matrixUniformBinding.uniforms.modelView.shouldUpdate = true;
    // this.matrixUniformBinding.uniforms.modelViewProjection.shouldUpdate = true;

    this.matrixUniformBinding.shouldUpdateUniform('world')
    this.matrixUniformBinding.shouldUpdateUniform('modelView')
    this.matrixUniformBinding.shouldUpdateUniform('modelViewProjection')
  }

  applyScale() {
    // ...

    // this.matrixUniformBinding.uniforms.world.shouldUpdate = true;
    // this.matrixUniformBinding.uniforms.modelView.shouldUpdate = true;
    // this.matrixUniformBinding.uniforms.modelViewProjection.shouldUpdate = true;

    this.matrixUniformBinding.shouldUpdateUniform('world')
    this.matrixUniformBinding.shouldUpdateUniform('modelView')
    this.matrixUniformBinding.shouldUpdateUniform('modelViewProjection')
  }

  updateScrollPosition(lastXDelta, lastYDelta) {
    // actually update the plane position only if last X delta or last Y delta is not equal to 0
    if (lastXDelta || lastYDelta) {
      // set new positions based on our delta without triggering reflow
      this.domElement.updateScrollPosition(lastXDelta * this.renderer.pixelRatio, lastYDelta * this.renderer.pixelRatio)
    }
  }

  render(pass) {
    // no point to render if the WebGPU device is not ready
    if (!this.renderer.ready || !this.visible) return

    // TODO move uniform bindings & texture onBeforeRender calls inside Mesh class?
    this.uniformsBindings.forEach((uniformBinding) => {
      uniformBinding.onBeforeRender()
    })

    this.textures.forEach((texture) => {
      texture.textureMatrix.onBeforeRender()
    })

    this.mesh.render(pass)

    this.onRender()
  }
}
