// Uploads images (teaser images, or images inserted into an article body)
// to the `digest-images` Supabase Storage bucket — see supabase/setup.sql
// for the bucket + RLS (public read, admin-only write).
import { supabase } from './supabase'

export async function uploadDigestImage(file) {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file.')
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error('Images must be under 8MB.')
  }

  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'jpg'
  const path = `${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage.from('digest-images').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw error

  const { data } = supabase.storage.from('digest-images').getPublicUrl(path)
  return data.publicUrl
}
