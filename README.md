# Private AI Shorts Maker

Mobile-first personal AI Shorts & Reels Studio with Dark Liquid Glass UI, Bengali & English support, server-side owner authentication, Gemini AI analysis, and browser-side FFmpeg.wasm 9:16 MP4 export.

## Quick Setup (Android / Web)
1. Upload all files to a **Private** GitHub repository.
2. Import the repo in **Netlify** (Free Tier).
3. Add these Environment Variables in Netlify (**Site configuration → Environment variables**):
   - `OWNER_EMAIL`: Your login email
   - `OWNER_PASSWORD`: Your secret password
   - `SESSION_SECRET`: Any random 32+ character text
   - `GEMINI_API_KEY`: Free key from https://aistudio.google.com/apikey
   - `GEMINI_MODEL`: `gemini-2.5-flash`
4. Trigger a deploy and open your `.netlify.app` URL in Chrome on Android.
5. Tap Chrome Menu (⋮) → **Add to Home screen → Install** to use as an Android PWA app.
  
