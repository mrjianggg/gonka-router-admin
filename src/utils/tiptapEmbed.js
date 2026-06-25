// Tiptap Embed node — a block-level <iframe> wrapped in a 16:9 container.
//
// The HTML shape we serialize is:
//
//   <div class="embed-wrapper" data-aspect="16/9">
//     <iframe src="…" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>
//   </div>
//
// We use the wrapper div to (a) get an aspect-ratio cropped container
// independent of the host platform's quirks, and (b) tag the node with
// data-aspect so the public renderer can apply matching CSS without
// inline styles.
//
// Security:
//   - parseHTML rejects unknown iframe src via the embedHosts allowlist
//   - renderHTML never emits sandbox-removing attributes
//   - serialized HTML is checked at paste/render time on the public side

import { Node } from '@tiptap/core'
import { isAllowedEmbedSrc } from './embedHosts'

export const Embed = Node.create({
  name: 'embed',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      src: { default: null },
      // Stored as a string like "16/9" so the public CSS can read it via
      // aspect-ratio: attr(data-aspect) — falls back gracefully if attr()
      // isn't supported (we also style .embed-wrapper directly).
      aspect: { default: '16/9' },
    }
  },

  parseHTML() {
    return [
      // Preferred form: the wrapper div we emit ourselves.
      {
        tag: 'div.embed-wrapper',
        getAttrs: (el) => {
          const iframe = el.querySelector('iframe')
          const src = iframe?.getAttribute('src')
          if (!isAllowedEmbedSrc(src)) return false
          return { src, aspect: el.getAttribute('data-aspect') || '16/9' }
        },
      },
      // Fallback: bare <iframe> pasted from a trusted host.
      {
        tag: 'iframe',
        getAttrs: (el) => {
          const src = el.getAttribute('src')
          if (!isAllowedEmbedSrc(src)) return false
          return { src, aspect: '16/9' }
        },
      },
    ]
  },

  renderHTML({ node }) {
    const { src, aspect } = node.attrs
    if (!isAllowedEmbedSrc(src)) {
      // Defensive: if the schema somehow holds an untrusted src, render an
      // empty placeholder rather than the iframe.
      return ['div', { class: 'embed-wrapper embed-blocked', 'data-aspect': aspect }, '']
    }
    return [
      'div',
      { class: 'embed-wrapper', 'data-aspect': aspect },
      [
        'iframe',
        {
          src,
          frameborder: '0',
          allowfullscreen: '',
          referrerpolicy: 'strict-origin-when-cross-origin',
          allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
          loading: 'lazy',
        },
      ],
    ]
  },

  addCommands() {
    return {
      setEmbed:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    }
  },
})
