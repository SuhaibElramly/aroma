export function getApiUrl(): string {
  const url = import.meta.env.VITE_API_URL
  if (!url) {
    if (import.meta.env.PROD) {
      throw new Error('VITE_API_URL is required in production')
    }
    return 'http://localhost:8000/api'
  }
  return url
}
