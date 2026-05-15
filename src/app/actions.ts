'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import * as cheerio from 'cheerio'

export async function addBookmark(formData: FormData) {
  const url = formData.get('url') as string
  let title = formData.get('title') as string

  if (!url) {
    return { error: 'URL is required' }
  }

  let description = null
  let iconUrl = null
  
  if (!title) {
    try {
      const res = await fetch(url, { next: { revalidate: 3600 } })
      const html = await res.text()
      const $ = cheerio.load(html)
      title = $('title').text() || url
      description = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || null
      
      const icon = $('link[rel="icon"]').attr('href') || $('link[rel="shortcut icon"]').attr('href')
      if (icon) {
        if (icon.startsWith('http')) {
          iconUrl = icon
        } else if (icon.startsWith('//')) {
          iconUrl = `https:${icon}`
        } else {
          const urlObj = new URL(url)
          iconUrl = `${urlObj.origin}${icon.startsWith('/') ? '' : '/'}${icon}`
        }
      } else {
        const urlObj = new URL(url)
        iconUrl = `${urlObj.origin}/favicon.ico`
      }
    } catch (e) {
      console.error('Failed to fetch metadata', e)
      title = url
    }
  }

  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { error } = await supabase.from('bookmarks').insert({
    user_id: user.id,
    url,
    title,
    description,
    icon_url: iconUrl
  })

  if (error) {
    console.error('Insert error:', error)
    return { error: 'Failed to add bookmark' }
  }

  revalidatePath('/')
  return { success: true }
}

export async function deleteBookmark(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('bookmarks').delete().eq('id', id)
  if (error) {
    return { error: 'Failed to delete bookmark' }
  }
  revalidatePath('/')
  return { success: true }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
}
