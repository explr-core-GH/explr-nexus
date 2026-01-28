const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format URL
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log('Fetching OpenGraph data for:', formattedUrl);

    // Fetch the page with a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(formattedUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; OpenGraphBot/1.0)',
        'Accept': 'text/html',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return new Response(
        JSON.stringify({ success: false, error: `Failed to fetch page: ${response.status}` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = await response.text();

    // Extract OpenGraph and meta images
    const ogImage = extractMetaContent(html, 'og:image');
    const twitterImage = extractMetaContent(html, 'twitter:image');
    const twitterImageSrc = extractMetaContent(html, 'twitter:image:src');
    
    // Also try to find a favicon or apple-touch-icon as fallback
    const appleTouchIcon = extractLinkHref(html, 'apple-touch-icon');
    const icon = extractLinkHref(html, 'icon');
    
    // Get title and description too
    const ogTitle = extractMetaContent(html, 'og:title');
    const ogDescription = extractMetaContent(html, 'og:description');
    const title = ogTitle || extractTitle(html);
    const description = ogDescription || extractMetaContent(html, 'description');

    // Priority: og:image > twitter:image > apple-touch-icon > icon
    let imageUrl = ogImage || twitterImage || twitterImageSrc || appleTouchIcon || icon;

    // Make relative URLs absolute
    if (imageUrl && !imageUrl.startsWith('http')) {
      const urlObj = new URL(formattedUrl);
      if (imageUrl.startsWith('//')) {
        imageUrl = `${urlObj.protocol}${imageUrl}`;
      } else if (imageUrl.startsWith('/')) {
        imageUrl = `${urlObj.origin}${imageUrl}`;
      } else {
        imageUrl = `${urlObj.origin}/${imageUrl}`;
      }
    }

    console.log('Extracted image:', imageUrl);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          imageUrl,
          title,
          description,
          url: formattedUrl,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching OpenGraph data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch page';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function extractMetaContent(html: string, property: string): string | null {
  // Try property attribute (OpenGraph style)
  const propertyRegex = new RegExp(
    `<meta[^>]*property=["']${escapeRegex(property)}["'][^>]*content=["']([^"']+)["']`,
    'i'
  );
  let match = html.match(propertyRegex);
  if (match) return match[1];

  // Try content before property
  const reversePropertyRegex = new RegExp(
    `<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${escapeRegex(property)}["']`,
    'i'
  );
  match = html.match(reversePropertyRegex);
  if (match) return match[1];

  // Try name attribute (standard meta style)
  const nameRegex = new RegExp(
    `<meta[^>]*name=["']${escapeRegex(property)}["'][^>]*content=["']([^"']+)["']`,
    'i'
  );
  match = html.match(nameRegex);
  if (match) return match[1];

  // Try content before name
  const reverseNameRegex = new RegExp(
    `<meta[^>]*content=["']([^"']+)["'][^>]*name=["']${escapeRegex(property)}["']`,
    'i'
  );
  match = html.match(reverseNameRegex);
  if (match) return match[1];

  return null;
}

function extractLinkHref(html: string, rel: string): string | null {
  const regex = new RegExp(
    `<link[^>]*rel=["'][^"']*${escapeRegex(rel)}[^"']*["'][^>]*href=["']([^"']+)["']`,
    'i'
  );
  let match = html.match(regex);
  if (match) return match[1];

  // Try href before rel
  const reverseRegex = new RegExp(
    `<link[^>]*href=["']([^"']+)["'][^>]*rel=["'][^"']*${escapeRegex(rel)}[^"']*["']`,
    'i'
  );
  match = html.match(reverseRegex);
  if (match) return match[1];

  return null;
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim() : null;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
