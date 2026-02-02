// YouTube Search Edge Function for Teacher Mode
// Searches YouTube for educational videos and returns formatted results

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
  url: string;
}

interface YouTubeSearchResult {
  success: boolean;
  videos: YouTubeVideo[];
  error?: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, maxResults = 5, language = 'uz' } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ success: false, error: 'Query is required', videos: [] }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'AUTH_REQUIRED', videos: [] }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'AUTH_REQUIRED', videos: [] }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get YouTube API key (prefer dedicated key, fallback to Google Search key)
    const youtubeApiKey = Deno.env.get('YOUTUBE_API_KEY') || Deno.env.get('GOOGLE_SEARCH_API_KEY');
    
    if (!youtubeApiKey) {
      console.error('[YouTube] Missing YOUTUBE_API_KEY or GOOGLE_SEARCH_API_KEY');
      return new Response(
        JSON.stringify({ success: false, error: 'API configuration error', videos: [] }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build YouTube Data API request
    const searchParams = new URLSearchParams({
      part: 'snippet',
      q: query,
      type: 'video',
      maxResults: String(maxResults),
      relevanceLanguage: language,
      safeSearch: 'strict',
      videoEmbeddable: 'true',
      key: youtubeApiKey,
    });

    console.log('[YouTube] Searching for:', query);
    
    const youtubeResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${searchParams}`
    );

    if (!youtubeResponse.ok) {
      const errorText = await youtubeResponse.text();
      console.error('[YouTube] API error:', errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'YouTube API error', videos: [] }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const youtubeData = await youtubeResponse.json();

    // Transform results
    const videos: YouTubeVideo[] = (youtubeData.items || []).map((item: any) => ({
      id: item.id?.videoId || '',
      title: item.snippet?.title || '',
      description: item.snippet?.description || '',
      thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
      channelTitle: item.snippet?.channelTitle || '',
      publishedAt: item.snippet?.publishedAt || '',
      url: `https://www.youtube.com/watch?v=${item.id?.videoId}`,
    })).filter((v: YouTubeVideo) => v.id);

    console.log('[YouTube] Found', videos.length, 'videos');

    // Log usage event
    await supabaseAdmin.from('usage_events').insert({
      user_id: user.id,
      event_type: 'youtube_search',
      meta: {
        query,
        results_count: videos.length,
        language,
      },
    });

    return new Response(
      JSON.stringify({ success: true, videos }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[YouTube] Exception:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        videos: [],
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
