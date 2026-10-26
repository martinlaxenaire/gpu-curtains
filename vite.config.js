import basicSsl from '@vitejs/plugin-basic-ssl'

export default ({ mode }) => {
  // Serve using https when running 'yarn dev:https' to allow local mobile debugging
  const useHttps = mode === 'https'

  return {
    plugins: useHttps ? [basicSsl()] : [],
    server: {
      https: useHttps,
    },
  }
}
