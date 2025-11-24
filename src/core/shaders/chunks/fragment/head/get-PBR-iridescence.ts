/**
 * Helper WGSL functions to get the PBR direct iridescence contribution.
 */
export const getPBRIridescence = /* wgsl */ `
// XYZ to linear-sRGB color space
const XYZ_TO_REC709: mat3x3f = mat3x3f(
   3.2404542, -0.9692660,  0.0556434,
  -1.5371385,  1.8760108, -0.2040259,
  -0.4985314,  0.0415560,  1.0572252
);

// Assume air interface for top
// Note: We don't handle the case fresnel0 == 1
fn Fresnel0ToIor( fresnel0: vec3f ) -> vec3f {
  let sqrtF0: vec3f = sqrt( fresnel0 );
  return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
}

// Conversion FO/IOR
fn IorToFresnel0_3( transmittedIor: vec3f, incidentIor: f32 ) -> vec3f {
  let iorToFresnel: vec3f = ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) );
  return iorToFresnel * iorToFresnel;
}

// ior is a value between 1.0 and 3.0. 1.0 is air interface
fn IorToFresnel0( transmittedIor: f32, incidentIor: f32 ) -> f32 {
  return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
}

// Fresnel equations for dielectric/dielectric interfaces.
// Ref: https://belcour.github.io/blog/research/2017/05/01/brdf-thin-film.html
// Evaluation XYZ sensitivity curves in Fourier space
fn evalSensitivity( OPD: f32, shift: vec3f ) -> vec3f {
  let phase: f32 = 2.0 * PI * OPD * 1.0e-9;
  let val: vec3f = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
  let pos: vec3f = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
  let vari: vec3f = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );

  var xyz: vec3f = val * sqrt( 2.0 * PI * vari ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * vari );
  xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
  xyz /= 1.0685e-7;

  let rgb: vec3f = XYZ_TO_REC709 * xyz;
  return rgb;
}

fn evalIridescence( outsideIOR: f32, eta2: f32, cosTheta1: f32, thinFilmThickness: f32, baseF0: vec3f ) -> vec3f {
   var I: vec3f;

   // Force iridescenceIOR -> outsideIOR when thinFilmThickness -> 0.0
  let iridescenceIOR: f32 = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
  // Evaluate the cosTheta on the base layer (Snell law)
  let sinTheta2Sq: f32 = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );

  // Handle TIR:
  let cosTheta2Sq: f32 = 1.0 - sinTheta2Sq;
  if ( cosTheta2Sq < 0.0 ) {
    return vec3( 1.0 );
  }

  let cosTheta2: f32 = sqrt( cosTheta2Sq );

  // First interface
  let R0: f32 = IorToFresnel0( iridescenceIOR, outsideIOR );
  let R12: f32 = F_Schlick_1( R0, 1.0, cosTheta1 );
  let T121: f32 = 1.0 - R12;
  var phi12: f32 = 0.0;
  if ( iridescenceIOR < outsideIOR ) {
    phi12 = PI;
  }
  let phi21: f32 = PI - phi12;

  // Second interface
  let baseIOR: vec3f = Fresnel0ToIor( clamp( baseF0, vec3(0.0), vec3(0.9999) ) ); // guard against 1.0
  let R1: vec3f = IorToFresnel0_3( baseIOR, iridescenceIOR );
  let R23: vec3f = F_Schlick( R1, 1.0, cosTheta2 );
  var phi23: vec3f = vec3( 0.0 );
  if ( baseIOR[ 0 ] < iridescenceIOR ) {
    phi23[ 0 ] = PI;
  }
  if ( baseIOR[ 1 ] < iridescenceIOR ) {
    phi23[ 1 ] = PI;
  }
  if ( baseIOR[ 2 ] < iridescenceIOR ) {
    phi23[ 2 ] = PI;
  }

  // Phase shift
  let OPD: f32 = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
  let phi: vec3f = vec3( phi21 ) + phi23;

  // Compound terms
  let R123: vec3f = clamp( R12 * R23, vec3(1e-5), vec3(0.9999) );
  let r123: vec3f = sqrt( R123 );
  let Rs: vec3f = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );

  // Reflectance term for m = 0 (DC term amplitude)
  let C0: vec3f = R12 + Rs;
  I = C0;

  // Reflectance term for m > 0 (pairs of diracs)
  var Cm: vec3f = Rs - T121;
  for (var m = 1u; m <= 2; m++ ) {
    Cm *= r123;
    let Sm: vec3f = 2.0 * evalSensitivity( f32( m ) * OPD, f32( m ) * phi );
    I += Cm * Sm;
  }

  // Since out of gamut colors might be produced, negative color values are clamped to 0.
  return max( I, vec3( 0.0 ) );
}`
