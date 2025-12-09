export const loadGLTFFromFileInput = async (files) => {
  const buildFileMap = (files) => {
    const map = {}
    for (const file of files) {
      map[file.name] = URL.createObjectURL(file)
    }
    return map
  }

  const fileMap = buildFileMap(files)

  // find root glTF file
  const root = files.find((f) => f.name.endsWith('.gltf') || f.name.endsWith('.glb'))
  if (!root) throw new Error('No .gltf or .glb file selected')

  // GLB needs no patching
  if (root.name.endsWith('.glb')) {
    const arrayBuffer = await root.arrayBuffer()
    return arrayBuffer
  }

  // GLTF: patch URIs
  const text = await root.text()
  const json = JSON.parse(text)

  // rewrite buffers
  if (json.buffers) {
    for (const buffer of json.buffers) {
      if (buffer.uri && fileMap[buffer.uri]) {
        buffer.uri = fileMap[buffer.uri]
      }
    }
  }

  // rewrite images
  if (json.images) {
    for (const image of json.images) {
      if (image.uri && fileMap[image.uri]) {
        image.uri = fileMap[image.uri]
      }
    }
  }

  return json
}
