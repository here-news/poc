import Quill from 'quill'
import {youtubeParser} from 'utils'
const Clipboard = Quill.import('modules/clipboard')
const Delta = Quill.import('delta')
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

    const index = text.length + range.index
    const length = 0

    const delta = new Delta()
      .retain(range.index)
      .delete(range.length)
      .insert(text)

    this.quill.updateContents(delta, 'silent')
    this.quill.setSelection(index, length, 'silent')
    this.quill.scrollIntoView()

    const youtubeId = youtubeParser(text)
    if (youtubeId) {
      this.getVideoPreview(youtubeId)
    } else {
      const regex = /(https?:\/\/[^\s]+)/g
      const result = text.split(regex)

      for (let i = 0; i < result.length; i++) {
        if (regex.test(result[i])) {
          this.getPreviewOnLinkFound(result[i])
          break
        }
      }
    }
  }
}

export default PlainClipboard
