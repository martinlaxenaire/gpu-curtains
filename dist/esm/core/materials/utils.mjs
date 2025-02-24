const compareRenderingOptions = (newOptions = {}, baseOptions = {}) => {
  const renderingOptions = [
    "useProjection",
    "transparent",
    "depth",
    "depthWriteEnabled",
    "depthCompare",
    "depthFormat",
    "cullMode",
    "sampleCount",
    "targets",
    "stencil",
    "verticesOrder",
    "topology"
  ];
  return renderingOptions.map((key) => {
    if (newOptions[key] !== void 0 && baseOptions[key] === void 0 || baseOptions[key] !== void 0 && newOptions[key] === void 0) {
      return key;
    } else if (Array.isArray(newOptions[key]) || typeof newOptions[key] === "object") {
      return JSON.stringify(newOptions[key]) !== JSON.stringify(baseOptions[key]) ? key : false;
    } else {
      return newOptions[key] !== baseOptions[key] ? key : false;
    }
  }).filter(Boolean);
};

export { compareRenderingOptions };
