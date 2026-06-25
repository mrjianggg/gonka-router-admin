// Tiptap Video node — a block-level <video controls> element.
//
// Schema: a void atom block (no editable children) so behavior matches
// images: cursor steps over it, Backspace removes the whole node. The
// element is rendered with `controls preload="metadata"` so a poster frame
// shows automatically when the browser fetches the first MB.
//
// Attributes:
//   - src      : direct URL (usually our OSS public URL)
//   - poster   : optional thumbnail (we don't auto-generate one server-side)
//   - controls : always true; left as an attr so future variants can disable
//
// Serialization: we round-trip as a real <video> tag so the published HTML
// renders identically on the public blog page without any post-processing.

import { Node } from '@tiptap/core'

export const Video = Node.create({
  name: 'video',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      src: { default: null },
      poster: { default: null },
      controls: { default: true },
    }
  },

  parseHTML() {
    // Match both standalone <video src="..."> and <video><source src="..."></video>.
    return [
      {
        tag: 'video',
        getAttrs: (el) => {
          const direct = el.getAttribute('src')
          const source = el.querySelector('source')
          const src = direct || source?.getAttribute('src') || null
          if (!src) return false
          return {
            src,
            poster: el.getAttribute('poster'),
            controls: el.hasAttribute('controls'),
          }
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const attrs = { ...HTMLAttributes }
    // controls is a presence-only HTML attribute — emit it as the empty
    // string when true, omit otherwise.
    if (attrs.controls) attrs.controls = ''
    else delete attrs.controls
    attrs.preload = 'metadata'
    attrs.playsinline = ''
    return ['video', attrs]
  },

  addCommands() {
    return {
      setVideo:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    }
  },
})
