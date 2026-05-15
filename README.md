# Smart Bookmark App

A modern, real-time bookmark manager built with Next.js App Router, Supabase, and Tailwind CSS.

## Features

- **Google OAuth Login**: Seamless authentication using Supabase Auth with Google OAuth provider.
- **Private Bookmarks**: Row Level Security (RLS) ensures that bookmarks are strictly private to each user.
- **Real-Time Sync**: Instant updates across tabs without refreshing, powered by Supabase Realtime subscriptions.
- **Add & Delete Bookmarks**: Clean and responsive UI with instant feedback and delete confirmations.
- **Bonus Feature - Auto Metadata Extraction**: When adding a URL, the app automatically fetches the target site's `<title>`, `<meta name="description">`, and Favicon, saving you the effort of typing them out manually!

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database & Auth**: Supabase (PostgreSQL, Realtime, Google OAuth)
- **Styling**: Tailwind CSS v4
- **Deployment**: Vercel

## Supabase Auth and RLS

### Setup
Supabase Auth is configured to use Google OAuth. Only authenticated users can access the dashboard. We utilize `@supabase/ssr` to securely handle session cookies in Server Components, Server Actions, and Middleware.

### Row Level Security (RLS)
RLS is strictly enforced at the database level.
```sql
-- Users can only view, insert, update, or delete their OWN bookmarks
CREATE POLICY "Users can view their own bookmarks" ON bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own bookmarks" ON bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own bookmarks" ON bookmarks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own bookmarks" ON bookmarks FOR DELETE USING (auth.uid() = user_id);
```
**Why it's correct**: This ensures that even if a malicious user tries to query the database directly using the `anon` key, PostgreSQL will evaluate `auth.uid()` against the JWT token and return/affect *only* rows where `user_id` matches the token. Data leakage is impossible.

## Real-Time Sync Implementation

Real-time sync is implemented using `supabase.channel` listening to `postgres_changes` on the `bookmarks` table. 
- **Subscription**: The frontend listens for `INSERT`, `UPDATE`, and `DELETE` events, filtering specifically for `user_id=eq.${user.id}` to avoid receiving updates from other users.
- **State Management**: When an event arrives, React state is updated optimistically (e.g., `setBookmarks(prev => [payload.new, ...prev])`).
- **Cleanup**: The subscription is closed in the `useEffect` cleanup function (`supabase.removeChannel(channel)`) to prevent memory leaks when the component unmounts.

## Bonus Feature: Metadata Extraction

**What**: Automatic extraction of URL metadata (Title, Description, Favicon).
**Why**: Typing out the title and finding an icon for a bookmark is tedious. By automatically parsing the URL's HTML using `cheerio` on the server-side, the UX is vastly improved—users just paste a link and hit save.

## Problems Encountered & Solutions

1. **Next.js Caching with Supabase**: Real-time updates handled the client state, but a hard refresh would occasionally show stale data due to Next.js App Router aggressively caching the server component route.
   *Solution*: Called `revalidatePath('/')` in the Server Actions (`addBookmark`, `deleteBookmark`) to clear the Next.js cache whenever a mutation occurs.

2. **Parsing Favicons**: Favicons can be defined as absolute, relative, or protocol-relative URLs.
   *Solution*: Added robust parsing logic in the Server Action to ensure the `icon_url` always resolves to an absolute `https://` URL.

## Future Improvements (With More Time)

- **Folders/Tags**: Allow users to categorize their bookmarks into custom folders or apply tags for better organization.
- **Browser Extension**: A Chrome extension to instantly save the current tab to the database without needing to visit the web app.
