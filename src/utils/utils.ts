export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16).toUpperCase()
  })
}

export const toCamelCase = (string: string): string => {
  return string
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (ltr, idx) => (idx === 0 ? ltr.toLowerCase() : ltr.toUpperCase()))
    .replace(/\s+/g, '')
}

export const toKebabCase = (string: string): string => {
  const camelCase = toCamelCase(string)
  return camelCase.charAt(0).toUpperCase() + camelCase.slice(1)
}

/***
 Throw a console warning with the passed arguments
 ***/

let warningThrown = 0

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

/***
 Log a console error with the passed arguments
 ***/
export const logError = (error: string) => {
  console.error(error)
}

/***
 Throw a javascript error with the passed arguments
 ***/
export const throwError = (error: string) => {
  throw new Error(error)
}
