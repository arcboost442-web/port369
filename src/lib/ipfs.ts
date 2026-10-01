const JWT = process.env.NEXT_PUBLIC_PINATA_JWT!

export async function uploadImageToIPFS(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  form.append('pinataMetadata', JSON.stringify({ name: file.name }))
  form.append('pinataOptions', JSON.stringify({ cidVersion: 1 }))

  const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: { Authorization: `Bearer ${JWT}` },
    body: form,
  })

  if (!res.ok) throw new Error('Upload failed: ' + res.statusText)
  const data = await res.json()
  return `ipfs://${data.IpfsHash}`
}

export async function uploadMetaToIPFS(meta: object): Promise<string> {
  const res = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${JWT}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      pinataContent: meta,
      pinataMetadata: { name: 'token-meta.json' },
      pinataOptions: { cidVersion: 1 },
    }),
  })

  if (!res.ok) throw new Error('Upload failed: ' + res.statusText)
  const data = await res.json()
  return `ipfs://${data.IpfsHash}`
}

export function ipfsToHttp(uri: string): string {
  if (!uri) return ''
  if (uri.startsWith('ipfs://')) {
    return `https://gateway.pinata.cloud/ipfs/${uri.slice(7)}`
  }
  return uri
}