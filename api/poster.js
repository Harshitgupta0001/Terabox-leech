// api/poster.js
import fetch from 'node-fetch';
import { parse } from 'node-html-parser';

export default async (req, res) => {
  try {
    // Get URL from query parameter
    const ottUrl = req.query.pos || req.query.url;
    
    if (!ottUrl) {
      return res.status(400).json({
        success: false,
        error: "Missing URL parameter. Use /poster?pos=OTT_URL"
      });
    }

    // Validate URL format
    try {
      new URL(ottUrl);
    } catch (e) {
      return res.status(400).json({
        success: false,
        error: "Invalid URL format"
      });
    }

    // Fetch OTT page content
    const response = await fetch(ottUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      redirect: 'follow',
      timeout: 10000
    });

    if (!response.ok) {
      return res.status(404).json({
        success: false,
        error: `Page not found (HTTP ${response.status})`
      });
    }

    const html = await response.text();
    const root = parse(html);

    // Try to extract poster from meta tags
    const metaTags = [
      root.querySelector('meta[property="og:image"]'),
      root.querySelector('meta[name="og:image"]'),
      root.querySelector('meta[name="twitter:image"]'),
      root.querySelector('meta[property="twitter:image"]'),
      root.querySelector('meta[itemprop="image"]'),
      root.querySelector('meta[name="poster"]'),
      root.querySelector('meta[property="poster"]')
    ];

    for (const tag of metaTags) {
      if (tag?.getAttribute('content')) {
        return res.json({
          success: true,
          posterUrl: resolveUrl(ottUrl, tag.getAttribute('content'))
        });
      }
    }

    // Fallback to large images with relevant keywords
    const images = root.querySelectorAll('img');
    for (const img of images) {
      const src = img.getAttribute('src');
      if (src && isPosterImage(src)) {
        return res.json({
          success: true,
          posterUrl: resolveUrl(ottUrl, src)
        });
      }
    }

    return res.status(404).json({
      success: false,
      error: "No landscape poster found"
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
};

// Helper to resolve relative URLs
function resolveUrl(base, path) {
  try {
    return new URL(path, base).href;
  } catch {
    return path;
  }
}

// Helper to identify poster images
function isPosterImage(src) {
  const lowerSrc = src.toLowerCase();
  const keywords = ['poster', 'cover', 'movie', 'series', 'artwork', 'banner'];
  return keywords.some(kw => lowerSrc.includes(kw));
}
