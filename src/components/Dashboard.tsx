'use client'

import { useState, useEffect } from 'react'
import { Bookmark } from '@/types'
import { createClient } from '@/utils/supabase/client'
import { BookmarkIcon, LogOut, Plus, Trash2, Globe, Search } from 'lucide-react'
import { logout } from '@/app/actions'
import AddBookmarkForm from './AddBookmarkForm'
import { formatDistanceToNow } from 'date-fns'

export default function Dashboard({ initialBookmarks, user }: { initialBookmarks: Bookmark[], user: any }) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(initialBookmarks)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase.channel('realtime:bookmarks')

    channel.on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'bookmarks',
      filter: `user_id=eq.${user.id}`
    }, (payload) => {
      setBookmarks((prev) => [payload.new as Bookmark, ...prev])
    })

    channel.on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'bookmarks',
      filter: `user_id=eq.${user.id}`
    }, (payload) => {
      setBookmarks((prev) => prev.map(b => b.id === payload.new.id ? payload.new as Bookmark : b))
    })

    channel.on('postgres_changes', {
      event: 'DELETE',
      schema: 'public',
      table: 'bookmarks'
    }, (payload) => {
      setBookmarks((prev) => prev.filter(b => b.id !== payload.old.id))
    })

    channel.subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, user.id])

  const filteredBookmarks = bookmarks.filter(b =>
    (b.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.url.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this bookmark?')) {
      const { error } = await supabase.from('bookmarks').delete().eq('id', id)
      if (error) {
        console.error('Delete error', error)
      }
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col">
      {/* Navbar */}
      <nav className="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <BookmarkIcon className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">Smart Bookmarks</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-sm text-zinc-400">
              <span>{user.email}</span>
            </div>
            <button
              onClick={() => logout()}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8 flex-1 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <h1 className="text-3xl font-bold">Your Bookmarks</h1>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 w-full sm:w-64"
              />
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-zinc-900 rounded-lg font-medium hover:bg-zinc-200 transition-colors shadow-sm shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Bookmark</span>
            </button>
          </div>
        </div>

        {bookmarks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-zinc-800 rounded-3xl bg-zinc-900/30">
            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
              <BookmarkIcon className="w-8 h-8 text-zinc-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No bookmarks yet</h3>
            <p className="text-zinc-400 max-w-sm mb-6">
              Save your favorite links here. We'll automatically fetch the title, description, and icon for you.
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-zinc-900 rounded-xl font-medium hover:bg-zinc-200 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add your first bookmark
            </button>
          </div>
        ) : filteredBookmarks.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center">
            <Search className="w-10 h-10 text-zinc-600 mb-4" />
            <p className="text-zinc-400 text-lg">No bookmarks match your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredBookmarks.map((bookmark) => (
              <a
                key={bookmark.id}
                href={bookmark.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col p-5 bg-zinc-900/50 border border-zinc-800/80 rounded-2xl hover:bg-zinc-900 hover:border-zinc-700 transition-all hover:shadow-2xl hover:shadow-black/50 relative overflow-hidden h-59"
              >
                <div className="flex items-start justify-between gap-4 mb-3 relative z-10">
                  <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                    {bookmark.icon_url ? (
                      <img src={bookmark.icon_url} alt="" className="w-6 h-6 object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
                    ) : (
                      <Globe className="w-5 h-5 text-zinc-500" />
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleDelete(bookmark.id)
                    }}
                    className="p-2 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg hover:bg-zinc-800"
                    title="Delete bookmark"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 relative z-10 mt-1">
                  <h3 className="font-semibold text-zinc-100 line-clamp-1 mb-1.5" title={bookmark.title || bookmark.url}>
                    {bookmark.title || bookmark.url}
                  </h3>
                  <p className="text-sm text-zinc-400 line-clamp-2 leading-relaxed" title={bookmark.description || ''}>
                    {bookmark.description || 'No description available for this bookmark.'}
                  </p>
                </div>

                <div className="mt-4 pt-3 flex items-center justify-between border-t border-zinc-800/50 text-xs text-zinc-500 relative z-10">
                  <span className="truncate max-w-[150px] font-medium">{new URL(bookmark.url).hostname.replace('www.', '')}</span>
                  <span>{formatDistanceToNow(new Date(bookmark.created_at))} ago</span>
                </div>

                {/* Subtle gradient hover effect */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </a>
            ))}
          </div>
        )}
      </main>

      {isAddModalOpen && (
        <AddBookmarkForm onClose={() => setIsAddModalOpen(false)} />
      )}
    </div>
  )
}
