import { GPURenderer } from './GPURenderer';
import { Camera } from '../camera/Camera';
import { BufferBindings } from '../bindings/BufferBindings';
import { BindGroup } from '../bindGroups/BindGroup';
import { Vec3 } from '../../math/Vec3';
import { CameraBasePerspectiveOptions } from '../camera/Camera';
import { GPURendererParams } from './GPURenderer';
export interface GPUCameraRendererParams extends GPURendererParams {
    camera: CameraBasePerspectiveOptions;
}
export declare class GPUCameraRenderer extends GPURenderer {
    camera: Camera;
    cameraUniformBinding: BufferBindings;
    cameraBindGroup: BindGroup;
    constructor({ container, pixelRatio, sampleCount, preferredFormat, production, camera, onError, }: GPUCameraRendererParams);
    setCamera(camera: CameraBasePerspectiveOptions): void;
    onCameraPositionChanged(): void;
    setCameraUniformBinding(): void;
    setCameraBindGroup(): void;
    updateCameraMatrixStack(): void;
    /***
     This will set our perspective matrix new parameters (fov, near plane and far plane)
     used internally but can be used externally as well to change fov for example
  
     params :
     @fov (float): the field of view
     @near (float): the nearest point where object are displayed
     @far (float): the farthest point where object are displayed
     ***/
    setPerspective(fov?: number, near?: number, far?: number): void;
    setCameraPosition(position?: Vec3): void;
    onResize(): void;
    render(): void;
    destroy(): void;
}
