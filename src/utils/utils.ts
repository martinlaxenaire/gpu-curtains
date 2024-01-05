/**
 * Generate a unique universal id
 * @returns - unique universal id generated
 */
export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16).toUpperCase()
  })
}

/**
 * Turns a string into a camel case string
 * @param string - string to transform
 * @returns - camel case string created
 */
export const toCamelCase = (string: string): string => {
  return string
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (ltr, idx) => (idx === 0 ? ltr.toLowerCase() : ltr.toUpperCase()))
    .replace(/\s+/g, '')
}

/**
 * Turns a string into a kebab case string
 * @param string - string to transform
 * @returns - kebab case string created
 */
export const toKebabCase = (string: string): string => {
  const camelCase = toCamelCase(string)
  return camelCase.charAt(0).toUpperCase() + camelCase.slice(1)
}

let warningThrown = 0

/**
 * Throw a console warning with the passed arguments
 * @param warning - warning to be thrown
 */
export const throwWarning = (warning: string) => {
  if (warningThrown > 100) {
    return
  } else if (warningThrown === 100) {
    console.warn('GPUCurtains: too many warnings thrown, stop logging.')
  } else {
    console.warn(warning)
  }

  warningThrown++
}

/**
 * Throw a javascript error with the passed arguments
 * @param error - error to be thrown
 */
export const throwError = (error: string) => {
  throw new Error(error)
}
