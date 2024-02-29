const compareRenderingOptions = (newOptions = {}, baseOptions = {}) => {
  return Object.keys(newOptions).filter((key) => {
    if (Array.isArray(newOptions[key])) {
      return JSON.stringify(newOptions[key]) !== JSON.stringify(baseOptions[key]);
    } else {
      return newOptions[key] !== baseOptions[key];
    }
  });
};

export { compareRenderingOptions };
