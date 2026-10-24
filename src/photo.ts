import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'

/** Scales to max 1600 px and stores as JPEG; returns the path to put into dish.photo. */
export async function addPhoto(file: File): Promise<string> {
  const img = await createImageBitmap(file)
  const scale = Math.min(1, 1600 / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise<Blob>((ok, fail) => canvas.toBlob((b) => (b ? ok(b) : fail(new Error('toBlob'))), 'image/jpeg', 0.82))
  const path = `photos/${crypto.randomUUID()}.jpg`
  await db.photos.put({ path, blob, _dirty: 1 })
  return path
}

export function usePhotoUrl(path?: string) {
  const blob = useLiveQuery(async () => (path ? (await db.photos.get(path))?.blob : undefined), [path])
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!blob) return setUrl(undefined)
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  return url
}
