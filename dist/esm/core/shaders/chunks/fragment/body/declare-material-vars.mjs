const declareMaterialVars = ({
  materialUniform = null,
  materialUniformName = "material",
  shadingModel = "PBR",
  environmentMap = null
} = {}) => {
  const materialStruct = materialUniform && materialUniform.struct || {};
  const defaultMaterialVars = {
    baseColorFactor: {
      name: "color",
      type: "vec3f",
      default: "vec3(1.0)"
    },
    baseOpacityFactor: {
      name: "opacity",
      type: "f32",
      value: "1.0"
    },
    alphaCutoff: {
      type: "f32",
      value: "0.0"
    },
    occlusionIntensity: {
      type: "f32",
      value: "1.0"
    },
    emissive: {
      name: "emissiveColor",
      type: "vec3f",
      value: "vec3(0.0)"
    },
    emissiveStrength: {
      name: "emissiveIntensity",
      type: "f32",
      value: "1.0"
    }
  };
  const defaultLambertMaterialVars = {
    ...defaultMaterialVars,
    normalScale: {
      type: "vec2f",
      value: "vec2(1.0)"
    }
  };
  const defaultPhongMaterialVars = {
    ...defaultLambertMaterialVars,
    metallic: {
      type: "f32",
      value: "0.0"
    },
    roughness: {
      type: "f32",
      value: "1.0"
    },
    specularIntensity: {
      type: "f32",
      value: "1.0"
    },
    specularColor: {
      type: "vec3f",
      value: "vec3(1.0)"
    },
    ior: {
      type: "f32",
      value: "1.5"
    }
  };
  const defaultPBRMaterialVars = {
    ...defaultPhongMaterialVars,
    transmission: {
      type: "f32",
      value: "0.0"
    },
    dispersion: {
      type: "f32",
      value: "0.0"
    },
    thickness: {
      type: "f32",
      value: "0.0"
    },
    attenuationDistance: {
      type: "f32",
      value: "1.0e38"
    },
    attenuationColor: {
      type: "vec3f",
      value: "vec3(1.0)"
    },
    multiscatterColor: {
      type: "vec3f",
      value: "vec3(0.0)"
    },
    scatterAnisotropy: {
      type: "f32",
      value: "0.0"
    },
    sheenColor: {
      type: "vec3f",
      value: "vec3(0.0)"
    },
    sheenRoughness: {
      type: "f32",
      value: "0.0"
    },
    clearcoat: {
      type: "f32",
      value: "0.0"
    },
    clearcoatRoughness: {
      type: "f32",
      value: "0.0"
    },
    clearcoatNormalScale: {
      type: "vec2f",
      value: "vec2(1.0)"
    },
    iridescence: {
      type: "f32",
      value: "0"
    },
    iridescenceIOR: {
      type: "f32",
      value: "1.3"
    },
    iridescenceThicknessRange: {
      type: "vec2f",
      value: "vec2(100, 400)"
    },
    anisotropy: {
      type: "f32",
      value: "0.0"
    },
    anisotropyVector: {
      type: "vec2f",
      value: "vec2(1.0, 0.0)"
    },
    diffuseTransmission: {
      type: "f32",
      value: "0.0"
    },
    diffuseTransmissionColor: {
      type: "vec3f",
      value: "vec3(1.0)"
    }
  };
  const defaultEnvMaterialVars = {
    envRotation: {
      type: "mat3x3f",
      value: "mat3x3f()"
    },
    envDiffuseIntensity: {
      type: "f32",
      value: "1.0"
    },
    envSpecularIntensity: {
      type: "f32",
      value: "1.0"
    }
  };
  let usedMaterialVars = (() => {
    switch (shadingModel) {
      case "Unlit":
        return defaultMaterialVars;
      case "Lambert":
        return defaultLambertMaterialVars;
      case "Phong":
        return defaultPhongMaterialVars;
      case "PBR":
      default:
        return defaultPBRMaterialVars;
    }
  })();
  if (!!environmentMap && shadingModel === "PBR") {
    usedMaterialVars = { ...usedMaterialVars, ...defaultEnvMaterialVars };
  }
  let materialVars = Object.keys(usedMaterialVars).map((key) => {
    const name = usedMaterialVars[key].name ?? key;
    return materialStruct[name] ? `
  var ${key}: ${usedMaterialVars[key].type} = ${materialUniformName}.${name};` : `
  var ${key}: ${usedMaterialVars[key].type} = ${usedMaterialVars[key].value};`;
  }).join("");
  if (shadingModel === "Phong") {
    if (materialStruct.shininess) {
      materialVars += /* wgsl */
      `
  var shininess: f32 = ${materialUniformName}.shininess;`;
    } else {
      materialVars += /* wgsl */
      `
  // approximating phong shading from PBR properties
  // arbitrary computation of diffuse, shininess and specular color from roughness and metallic  
  baseColorFactor = mix(baseColorFactor, vec3(0.0), metallic);
  specularColor = mix(specularColor, baseColorFactor, metallic);
  // from https://graphicrants.blogspot.com/2013/08/specular-brdf-reference.html
  var shininess: f32 = clamp(2.0 / (roughness * roughness * roughness * roughness) - 2.0, 1000.0);
  `;
    }
  }
  return materialVars;
};

export { declareMaterialVars };
