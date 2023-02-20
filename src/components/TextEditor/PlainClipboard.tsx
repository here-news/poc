import Quill from 'quill'
import { youtubeParser } from 'utils'
const Clipboard = Quill.import('modules/clipboard')
const Delta = Quill.import('delta')

const BlockEmbed = Quill.import('blots/block/embed')

class LinkEmbed extends BlockEmbed {
  static create(value: any) {
    const node = super.create(value)
    node.setAttribute('href', value.href)
    node.setAttribute('rel', 'noopener noreferrer')
    node.setAttribute('target', '_blank')
    node.setAttribute(
      'style',
      'text-decoration-line: underline; color:rgb(37, 99, 235); white-space: normal;'
    )
    node.innerHTML = value.innerHTML
    return node
  }
}

LinkEmbed.blotName = 'link-embed'
LinkEmbed.tagName = 'a'
Quill.register(LinkEmbed)

class PlainClipboard extends Clipboard {
  constructor(
    quill: Quill,
    options: {
      getPreviewOnLinkFound: (link: string) => void
      getVideoPreview: (link: string) => void
    }
  ) {
    super(quill, options)
    this.getPreviewOnLinkFound = options.getPreviewOnLinkFound
    this.getVideoPreview = options.getVideoPreview
  }

  async onPaste(e: any) {
    e.preventDefault()
    const range = this.quill.getSelection()
    const text = e.clipboardData.getData('text/plain')

    const regex = /(https?:\/\/[^\s]+)/g
    const result = text.split(regex)
    const resultToAdd = result.reverse()

    for (let i = 0; i < result.length; i++) {
      if (regex.test(result[i])) {
        const tag = document.createElement('a')
        tag.href = result[i]
        tag.innerHTML = result[i]
        await this.quill.insertEmbed(range.index, 'link-embed', tag)
      } else {
        const delta = new Delta()
          .retain(range.index)
          .delete(range.length)
          .insert(result[i])

        await this.quill.updateContents(delta, 'silent')
      }
    }

    const youtubeId = youtubeParser(text)
    if (youtubeId) {
      this.getVideoPreview(youtubeId)
    } else {
      for (let i = 0; i < resultToAdd.length; i++) {
        if (regex.test(resultToAdd[i])) {
          this.getPreviewOnLinkFound(resultToAdd[i])
          break
        }
      }
    }
  }
}

export default PlainClipboard
