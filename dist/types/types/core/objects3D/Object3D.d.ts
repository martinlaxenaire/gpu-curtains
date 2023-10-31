import { Vec3 } from '../../../math/Vec3';
import { Quat } from '../../../math/Quat';
import { Mat4 } from '../../../math/Mat4';
export type Object3DMatricesType = 'model';
export interface Object3DTransformMatrix {
    matrix: Mat4;
    shouldUpdate: boolean;
    onUpdate: () => void;
}
export type Object3DMatrices = Record<Object3DMatricesType, Object3DTransformMatrix>;
export interface Object3DTransforms {
    origin: {
        model: Vec3;
        world?: Vec3;
    };
    quaternion: Quat;
    rotation: Vec3;
    position: {
        world: Vec3;
        document?: Vec3;
    };
    scale: Vec3;
}
