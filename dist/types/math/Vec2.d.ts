/***
 Here we create a Vec2 class object
 This is a really basic Vector2 class used for vector calculations
 Highly based on https://github.com/mrdoob/three.js/blob/dev/src/math/Vector2.js and http://glmatrix.net/docs/vec2.js.html

 params :
 @x (float): X component of our vector
 @y (float): Y component of our vector

 @returns {Vec2}: our Vec2 class object
 ***/
export declare class Vec2 {
    type: string;
    private _x;
    private _y;
    _onChangeCallback?(): void;
    constructor(x?: number, y?: number);
    /***
     Getters and setters (with onChange callback)
     ***/
    get x(): number;
    set x(value: number);
    get y(): number;
    set y(value: number);
    onChange(callback: () => void): Vec2;
    /***
     Sets the vector from values
  
     params:
     @x (float): X component of our vector
     @y (float): Y component of our vector
  
     @returns {Vec2}: this vector after being set
     ***/
    set(x?: number, y?: number): Vec2;
    /***
     Adds a vector to this vector
  
     params:
     @vector (Vec2): vector to add
  
     @returns {Vec2}: this vector after addition
     ***/
    add(vector?: Vec2): Vec2;
    /***
     Adds a scalar to this vector
  
     params:
     @value (float): number to add
  
     @returns {Vec2}: this vector after addition
     ***/
    addScalar(value?: number): Vec2;
    /***
     Subtracts a vector from this vector
  
     params:
     @vector (Vec2): vector to use for subtraction
  
     @returns {Vec2}: this vector after subtraction
     ***/
    sub(vector?: Vec2): Vec2;
    /***
     Subtracts a scalar to this vector
  
     params:
     @value (float): number to use for subtraction
  
     @returns {Vec2}: this vector after subtraction
     ***/
    subScalar(value?: number): Vec2;
    /***
     Multiplies a vector with this vector
  
     params:
     @vector (Vec2): vector to use for multiplication
  
     @returns {Vec2}: this vector after multiplication
     ***/
    multiply(vector?: Vec2): Vec2;
    /***
     Multiplies a scalar with this vector
  
     params:
     @value (float): number to use for multiplication
  
     @returns {Vec2}: this vector after multiplication
     ***/
    multiplyScalar(value?: number): Vec2;
    /***
     Copy a vector into this vector
  
     params:
     @vector (Vec2): vector to copy
  
     @returns {Vec2}: this vector after copy
     ***/
    copy(vector?: Vec2): Vec2;
    /***
     Clone this vector
  
     @returns {Vec2}: cloned vector
     ***/
    clone(): Vec2;
    /***
     Apply max values to this vector
  
     params:
     @vector (Vec2): vector representing max values
  
     @returns {Vec2}: vector with max values applied
     ***/
    max(vector?: Vec2): Vec2;
    /***
     Apply min values to this vector
  
     params:
     @vector (Vec2): vector representing min values
  
     @returns {Vec2}: vector with min values applied
     ***/
    min(vector?: Vec2): Vec2;
    /***
     Checks if 2 vectors are equal
  
     params:
     @vector (Vec2): vector to compare
  
     @returns {boolean}: whether the vectors are equals or not
     ***/
    equals(vector?: Vec2): boolean;
    /***
     Normalize this vector
  
     @returns {Vec2}: normalized vector
     ***/
    normalize(): Vec2;
    /***
     Calculates the dot product of 2 vectors
  
     params:
     @vector (Vec2): vector to use for dot product
  
     @returns {number}: dot product of the 2 vectors
     ***/
    dot(vector?: Vec2): number;
    lerp(vector?: Vec2, alpha?: number): Vec2;
}
