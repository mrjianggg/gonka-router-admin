// Shared host allowlist for iframe embeds. Both the Tiptap Embed node and
// the paste normalizer consult this list, so we have ONE source of truth
// for what counts as a safe third-party video host.
//
// Adding a host here is a deliberate security decision — iframe content
// runs scripts in the user's browser, so only hosts whose <iframe> we
// trust by reputation should be added (e.g. official video platforms).
//
// Each entry exposes:
//   - test(url)     : returns true if the URL belongs to this host
//   - toEmbed(url)  : returns the canonical embed URL (e.g. youtube.com/embed/ID),
//                     or null if the URL can't be normalized
//   - aspectRatio   : intrinsic ratio for the iframe wrapper (default 16/9)

const YOUTUBE_REGEX = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i
const BILIBILI_BVID = /bilibili\.com\/video\/(BV[0-9A-Za-z]+)/i
const BILIBILI_AID = /bilibili\.com\/video\/av(\d+)/i
const BILIBILI_PLAYER = /player\.bilibili\.com\/player\.html/i

export const EMBED_HOSTS = [
  {
    id: 'youtube',
    label: 'YouTube',
    test: (url) => YOUTUBE_REGEX.test(url),
    toEmbed: (url) => {
      const m = url.match(YOUTUBE_REGEX)
      return m ? `https://www.youtube.com/embed/${m[1]}` : null
    },
    aspectRatio: 16 / 9,
    iframeOrigin: 'https://www.youtube.com',
  },
  {
    id: 'bilibili',
    label: 'Bilibili',
    test: (url) => BILIBILI_BVID.test(url) || BILIBILI_AID.test(url) || BILIBILI_PLAYER.test(url),
    toEmbed: (url) => {
      if (BILIBILI_PLAYER.test(url)) return url // already an embed URL
      const bv = url.match(BILIBILI_BVID)
      if (bv) return `https://player.bilibili.com/player.html?bvid=${bv[1]}&high_quality=1`
      const av = url.match(BILIBILI_AID)
      if (av) return `https://player.bilibili.com/player.html?aid=${av[1]}&high_quality=1`
      return null
    },
    aspectRatio: 16 / 9,
    iframeOrigin: 'https://player.bilibili.com',
  },
]

/** Resolve a paste/typed URL to a host entry, or null if none match. */
export function resolveEmbedHost(url) {
  if (!url || typeof url !== 'string') return null
  return EMBED_HOSTS.find((h) => h.test(url)) || null
}

/** Normalize a typed/paste URL to an embed URL we'll set on the iframe. */
export function toEmbedURL(url) {
  const host = resolveEmbedHost(url)
  if (!host) return null
  return host.toEmbed(url)
}

/**
 * Determine if an existing iframe src points at one of our allowed hosts.
 * The paste normalizer uses this to decide whether to keep or strip
 * unknown <iframe> elements pasted from external pages.
 */
export function isAllowedEmbedSrc(src) {
  if (!src || typeof src !== 'string') return false
  try {
    const u = new URL(src, 'https://placeholder.invalid/')
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false
    const host = u.hostname.toLowerCase()
    return (
      host === 'www.youtube.com' ||
      host === 'youtube.com' ||
      host === 'youtu.be' ||
      host === 'player.bilibili.com'
    )
  } catch {
    return false
  }
}
