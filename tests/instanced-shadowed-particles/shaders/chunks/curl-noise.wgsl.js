export const curlNoise = /* wgsl */ `
  // some of the utility functions here were taken from
  // https://gist.github.com/munrocket/236ed5ba7e409b8bdf1ff6eca5dcdc39
  
  // snoise4 and curlNoise have been ported from a previous WebGL experiment
  // can't remember where I found them in the first place
  // if you know it, please feel free to contact me to add due credit

  fn mod289_4(x: vec4f) -> vec4f {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }
  
  fn mod289_3(x: vec3f) -> vec3f {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }
  
  fn mod289_2(x: vec2f) -> vec2f {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }
  
  fn mod289(x: f32) -> f32 {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }
  
  fn permute4(x: vec4f) -> vec4f {
    return mod289_4(((x*34.0)+1.0)*x);
  }
  
  fn permute3(x: vec3f) -> vec3f {
    return mod289_3(((x*34.0)+1.0)*x);
  }

  fn permute(x: f32) -> f32 {
    return mod289(((x*34.0)+1.0)*x);
  }
  
  fn taylorInvSqrt4(r: vec4f) -> vec4f {
    return 1.79284291400159 - 0.85373472095314 * r;
  }

  fn taylorInvSqrt(r: f32) -> f32 {
    return 1.79284291400159 - 0.85373472095314 * r;
  }  
  
  fn lessThan4(a: vec4f, b: vec4f) -> vec4<bool> {
    return vec4<bool>(a.x < b.x, a.y < b.y, a.z < b.z, a.w < b.w);
  }
  
  fn grad4(j: f32, ip: vec4f) -> vec4f {
    let ones: vec4f = vec4(1.0, 1.0, 1.0, -1.0);
    var p: vec4f;
    var s: vec4f;

    p = vec4(floor( fract (vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0, p.w);
    p.w = 1.5 - dot(abs(p.xyz), ones.xyz);
    s = vec4<f32>(lessThan4(p, vec4(0.0)));

    p = vec4(p.xyz + (s.xyz*2.0 - 1.0) * s.www, p.w);

    return p;
  }
  
  const F4: f32 = 0.309016994374947451;
  
  fn snoise4(v: vec4f) -> vec4f {
    let C: vec4f = vec4( 0.138196601125011,0.276393202250021,0.414589803375032,-0.447213595499958);

    var i: vec4f  = floor(v + dot(v, vec4(F4)) );
    let x0: vec4f = v - i + dot(i, C.xxxx);

    var i0: vec4f;
    var isX: vec3f = step( x0.yzw, x0.xxx );
    var isYZ: vec3f = step( x0.zww, x0.yyz );
    i0.x = isX.x + isX.y + isX.z;
    
    i0 = vec4(i0.x, 1.0 - isX);
    //i0.yzw = 1.0 - isX;
    i0.y += isYZ.x + isYZ.y;
    
    i0 = vec4(i0.x, i0.y, i0.zw + 1.0 - isYZ.xy);
    //i0.zw += 1.0 - isYZ.xy;
    i0.z += isYZ.z;
    i0.w += 1.0 - isYZ.z;

    var i3: vec4f = clamp( i0, vec4(0.0), vec4(1.0) );
    var i2: vec4f = clamp( i0-1.0, vec4(0.0), vec4(1.0) );
    var i1: vec4f = clamp( i0-2.0, vec4(0.0), vec4(1.0) );

    var x1: vec4f = x0 - i1 + C.xxxx;
    var x2: vec4f = x0 - i2 + C.yyyy;
    var x3: vec4f = x0 - i3 + C.zzzz;
    var x4: vec4f = x0 + C.wwww;

    i = mod289_4(i);
    var j0: f32 = permute( permute( permute( permute(i.w) + i.z) + i.y) + i.x);
    var j1: vec4f = permute4( permute4( permute4( permute4 (
            i.w + vec4(i1.w, i2.w, i3.w, 1.0 ))
          + i.z + vec4(i1.z, i2.z, i3.z, 1.0 ))
          + i.y + vec4(i1.y, i2.y, i3.y, 1.0 ))
          + i.x + vec4(i1.x, i2.x, i3.x, 1.0 ));


    var ip: vec4f = vec4(1.0/294.0, 1.0/49.0, 1.0/7.0, 0.0) ;

    var p0: vec4f = grad4(j0,   ip);
    var p1: vec4f = grad4(j1.x, ip);
    var p2: vec4f = grad4(j1.y, ip);
    var p3: vec4f = grad4(j1.z, ip);
    var p4: vec4f = grad4(j1.w, ip);

    var norm: vec4f = taylorInvSqrt4(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    p4 *= taylorInvSqrt(dot(p4,p4));

    var values0: vec3f = vec3(dot(p0, x0), dot(p1, x1), dot(p2, x2)); //value of contributions from each corner at point
    var values1: vec2f = vec2(dot(p3, x3), dot(p4, x4));

    var m0: vec3f = max(0.5 - vec3(dot(x0,x0), dot(x1,x1), dot(x2,x2)), vec3(0.0)); //(0.5 - x^2) where x is the distance
    var m1: vec2f = max(0.5 - vec2(dot(x3,x3), dot(x4,x4)), vec2(0.0));

    var temp0: vec3f = -6.0 * m0 * m0 * values0;
    var temp1: vec2f = -6.0 * m1 * m1 * values1;

    var mmm0: vec3f = m0 * m0 * m0;
    var mmm1: vec2f = m1 * m1 * m1;

    let dx: f32 = temp0[0] * x0.x + temp0[1] * x1.x + temp0[2] * x2.x + temp1[0] * x3.x + temp1[1] * x4.x + mmm0[0] * p0.x + mmm0[1] * p1.x + mmm0[2] * p2.x + mmm1[0] * p3.x + mmm1[1] * p4.x;
    let dy: f32 = temp0[0] * x0.y + temp0[1] * x1.y + temp0[2] * x2.y + temp1[0] * x3.y + temp1[1] * x4.y + mmm0[0] * p0.y + mmm0[1] * p1.y + mmm0[2] * p2.y + mmm1[0] * p3.y + mmm1[1] * p4.y;
    let dz: f32 = temp0[0] * x0.z + temp0[1] * x1.z + temp0[2] * x2.z + temp1[0] * x3.z + temp1[1] * x4.z + mmm0[0] * p0.z + mmm0[1] * p1.z + mmm0[2] * p2.z + mmm1[0] * p3.z + mmm1[1] * p4.z;
    let dw: f32 = temp0[0] * x0.w + temp0[1] * x1.w + temp0[2] * x2.w + temp1[0] * x3.w + temp1[1] * x4.w + mmm0[0] * p0.w + mmm0[1] * p1.w + mmm0[2] * p2.w + mmm1[0] * p3.w + mmm1[1] * p4.w;

    return vec4(dx, dy, dz, dw) * 49.0;
  }
  
  fn curlNoise( p: vec3f, noiseTime: f32, persistence: f32 ) -> vec3f {

    var xNoisePotentialDerivatives: vec4f = vec4(0.0);
    var yNoisePotentialDerivatives: vec4f = vec4(0.0);
    var zNoisePotentialDerivatives: vec4f = vec4(0.0);

    for (var i: i32 = 0; i < 3; i++) {

        let twoPowI: f32 = pow(2.0, f32(i));
        let scale: f32 = 0.5 * twoPowI * pow(persistence, f32(i));

        xNoisePotentialDerivatives += snoise4(vec4(p * twoPowI, noiseTime)) * scale;
        yNoisePotentialDerivatives += snoise4(vec4((p + vec3(123.4, 129845.6, -1239.1)) * twoPowI, noiseTime)) * scale;
        zNoisePotentialDerivatives += snoise4(vec4((p + vec3(-9519.0, 9051.0, -123.0)) * twoPowI, noiseTime)) * scale;
    }

    return vec3(
        zNoisePotentialDerivatives[1] - yNoisePotentialDerivatives[2],
        xNoisePotentialDerivatives[2] - zNoisePotentialDerivatives[0],
        yNoisePotentialDerivatives[0] - xNoisePotentialDerivatives[1]
    );
  }
`
