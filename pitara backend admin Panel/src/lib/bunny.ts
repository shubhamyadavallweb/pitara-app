export async function uploadToBunny(file: Blob, path: string): Promise<string> {
  const apiKey = import.meta.env.VITE_BUNNY_API_KEY as string | undefined
  const storageZone = import.meta.env.VITE_BUNNY_STORAGE_ZONE as string | undefined
  const pullZoneUrl = import.meta.env.VITE_BUNNY_PULL_ZONE_URL as string | undefined

  if (!apiKey || !storageZone || !pullZoneUrl) {
    throw new Error("Missing Bunny env vars: VITE_BUNNY_API_KEY, VITE_BUNNY_STORAGE_ZONE, VITE_BUNNY_PULL_ZONE_URL")
  }

  const uploadUrl = `https://storage.bunnycdn.com/${storageZone}/${path}`

  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'AccessKey': apiKey,
      'Content-Type': 'application/octet-stream'
    },
    body: file
  })

  if (!res.ok) {
    const message = await res.text().catch(() => res.statusText)
    throw new Error(`Bunny upload failed: ${res.status} ${message}`)
  }

  // Publicly accessible URL via pull zone
  return `${pullZoneUrl}/${path}`
} 