// normalizePastedHTML rewrites external HTML (typically rich-text copies
// from Medium / Notion / seeklab / general blog platforms) into a shape that
// TipTap with our enabled extensions can fully preserve.
//
// What it handles, top to bottom:
//   1. <picture><source><img></picture>   →  <img>
//        Tiptap's image extension doesn't render <picture>, and ProseMirror
//        will drop the whole element if the schema doesn't recognise it.
//   2. <img srcset="…" data-src="…">      →  <img src="…">
//        Lazy-loading attrs and srcset don't survive a round-trip; pick the
//        best concrete URL so the saved HTML still resolves.
//   3. <figure>                            →  <img> [ + <p class="caption"> ]
//        Without an explicit Figure extension, Tiptap unwraps unknown block
//        wrappers — the wrap survives in some cases, gets dropped in others.
//        We normalize up-front so the result is predictable: keep the image,
//        and demote the caption (if any) to a plain paragraph below.
//   4. Strip <script>, <style>, <link>, <meta>, <noscript>, comments.
//   5. Strip dangerous attributes (on*, javascript:, …) defensively even
//      though the editor is admin-only.
//
// All transformations happen via DOMParser in a detached document, so the
// caller can use the result as a plain HTML string.

const DANGEROUS_TAGS = new Set([
  'script',
  'style',
  'link',
  'meta',
  'noscript',
  'iframe',
  'object',
  'embed',
])

const DROP_ATTR_PREFIXES = ['on'] // onclick, onload, …
const DROP_ATTR_NAMES = new Set(['srcset', 'data-src', 'data-original', 'data-srcset'])

function isUnsafeURL(value) {
  if (!value) return false
  const v = value.trim().toLowerCase()
  return v.startsWith('javascript:') || v.startsWith('data:text/html')
}

function pickBestImageSrc(img) {
  // Order: explicit src > data-original > data-src > first srcset entry.
  const direct = img.getAttribute('src')
  if (direct && !direct.startsWith('data:image/gif;base64,R0lGOD')) {
    // Skip 1x1 gif placeholders sometimes used as lazy-loader.
    return direct
  }
  const candidates = [
    img.getAttribute('data-original'),
    img.getAttribute('data-src'),
  ]
  for (const c of candidates) {
    if (c) return c
  }
  const srcset = img.getAttribute('srcset') || img.getAttribute('data-srcset')
  if (srcset) {
    // Pick the last (usually highest-resolution) candidate.
    const entries = srcset.split(',').map((s) => s.trim()).filter(Boolean)
    if (entries.length) {
      const last = entries[entries.length - 1]
      const url = last.split(/\s+/)[0]
      if (url) return url
    }
  }
  return direct || ''
}

function unwrapPicture(doc) {
  doc.querySelectorAll('picture').forEach((pic) => {
    const img = pic.querySelector('img')
    if (img) {
      pic.replaceWith(img)
    } else {
      pic.remove()
    }
  })
}

function normalizeImages(doc) {
  doc.querySelectorAll('img').forEach((img) => {
    const best = pickBestImageSrc(img)
    if (!best || isUnsafeURL(best)) {
      img.remove()
      return
    }
    img.setAttribute('src', best)
    // Drop attrs we don't want.
    DROP_ATTR_NAMES.forEach((n) => img.removeAttribute(n))
    // Drop on* handlers.
    Array.from(img.attributes).forEach((a) => {
      if (DROP_ATTR_PREFIXES.some((p) => a.name.toLowerCase().startsWith(p))) {
        img.removeAttribute(a.name)
      }
    })
  })
}

function unwrapFigures(doc) {
  doc.querySelectorAll('figure').forEach((fig) => {
    const img = fig.querySelector('img')
    const captionEl = fig.querySelector('figcaption')
    const captionText = captionEl ? captionEl.textContent.trim() : ''

    const replacements = []
    if (img) replacements.push(img)
    if (captionText) {
      const p = doc.createElement('p')
      p.className = 'image-caption'
      p.textContent = captionText
      replacements.push(p)
    }

    if (replacements.length === 0) {
      fig.remove()
      return
    }
    // Replace figure with its flattened contents, preserving order.
    const parent = fig.parentNode
    replacements.forEach((node) => parent.insertBefore(node, fig))
    fig.remove()
  })
}

function stripDangerousNodes(doc) {
  DANGEROUS_TAGS.forEach((tag) => {
    doc.querySelectorAll(tag).forEach((el) => el.remove())
  })
  // Strip HTML comments — DOMParser keeps them as Comment nodes.
  const walker = doc.createTreeWalker(doc.body || doc, NodeFilter.SHOW_COMMENT, null)
  const comments = []
  let node
  while ((node = walker.nextNode())) comments.push(node)
  comments.forEach((n) => n.remove())
}

function stripDangerousAttributes(doc) {
  const all = doc.querySelectorAll('*')
  all.forEach((el) => {
    Array.from(el.attributes).forEach((a) => {
      const name = a.name.toLowerCase()
      if (DROP_ATTR_PREFIXES.some((p) => name.startsWith(p))) {
        el.removeAttribute(a.name)
        return
      }
      if ((name === 'href' || name === 'src') && isUnsafeURL(a.value)) {
        el.removeAttribute(a.name)
      }
    })
  })
}

export function normalizePastedHTML(html) {
  if (!html || typeof html !== 'string') return html
  // Quick exit: if the string is plainly not HTML, skip the parser.
  if (!/<[a-z!][^>]*>/i.test(html)) return html

  let doc
  try {
    doc = new DOMParser().parseFromString(html, 'text/html')
  } catch {
    return html
  }
  if (!doc || !doc.body) return html

  stripDangerousNodes(doc)
  unwrapPicture(doc)
  unwrapFigures(doc)
  normalizeImages(doc)
  stripDangerousAttributes(doc)

  return doc.body.innerHTML
}
