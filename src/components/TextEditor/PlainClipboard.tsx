import axios from 'axios'
import { ENV } from 'lib/env'
import Quill from 'quill'
const Clipboard = Quill.import('modules/clipboard')
const Delta = Quill.import('delta')

const getLinkDetails = async (linkString: string) => {
  const { data } = await axios.get(
    `${ENV.API_URL}/getLinkDetails/${encodeURIComponent(linkString)}`
  )
  console.log('data is >>', data)

  const preview = document.createElement('a')
  preview.href = data.data.url
  preview.rel = 'noopener noreferrer'
  preview.target = '_blank'

  const container = document.createElement('div')
  container.classList.add(
    'flex',
    'flex-col',
    'border-[0.0625rem]',
    'border-slate-400',
    'rounded-lg',
    'px-5',
    'py-4',
    'transition-colors',
    'duration-300',
    'hover:bg-gray-200',
    'cursor-pointer'
  )

  const row = document.createElement('div')
  row.classList.add('flex', 'flex-row')

  const imgContainer = document.createElement('div')
  imgContainer.classList.add('relative')

  if (data.data.favicons && data.data.favicons.length > 0) {
    const img = document.createElement('img')
    img.src = data.data.favicons[0]
    img.alt = 'link embed'
    img.style.width = '4px'
    img.style.height = '4px'
    imgContainer.appendChild(img)
  }

  const name = document.createElement('p')
  name.classList.add('ml-2', 'text-xs', 'text-slate-700')
  name.textContent = data.data.siteName
    ? data.data.siteName
    : new URL(data.data.url).hostname.split('.').slice(-2).join('.')
  row.appendChild(imgContainer)
  row.appendChild(name)

  const imageContainer = document.createElement('div')

  if (data.data.images && data.data.images.length > 0) {
    imageContainer.classList.add(
      'relative',
      'w-full',
      'h-44',
      'mt-1',
      'mb-4'
    )
    const image = document.createElement('img')
    image.src = data.data.images[0]
    image.alt = 'link_preview-image'
    image.classList.add(
      'object-cover',
      'bg-gray-300',
      'w-44',
      'h-full'
    )
    imageContainer.appendChild(image)
  }

  const title = document.createElement('h2')
  title.classList.add('text-lg', 'text-slate-800', 'font-bold')
  title.textContent = data.data.title

  const description = document.createElement('p')
  description.classList.add('mt-2', 'text-md', 'text-slate-800')
  description.textContent = data.data.description

  const articleLink = document.createElement('p')
  articleLink.classList.add(
    'mt-6',
    'text-blue-600',
    'underline',
    'text-sm'
  )
  articleLink.textContent = 'Read the full article at '
  const link = document.createElement('a')
  link.href = data.data.url
  link.textContent = new URL(data.data.url).hostname
    .split('.')
    .slice(-2)
    .join('.')
  articleLink.appendChild(link)
  articleLink.appendChild(document.createTextNode(' »'))

  container.appendChild(row)
  container.appendChild(imageContainer)
  container.appendChild(title)
  container.appendChild(description)
  container.appendChild(articleLink)

  preview.appendChild(container)

  const previewRaw = `
    <a
    href='${data.data.url}'
    rel='noopener noreferrer'
    target='_blank'
  >
    <div class='flex flex-col border-[0.0625rem] border-slate-400 rounded-lg px-5 py-4 transition-colors duration-300 hover:bg-gray-200 cursor-pointer'>
      <div class='flex flex-row'>
        <div class='relative'>
        ${
          data.data.favicons && data.data.favicons.length > 0
            ? `
            <img  src='${data.data.favicons[0]}'
            alt='link embed'
            style='w-4 h-4'
            />
            `
            : ''
        }
        </div>
        <p class='ml-2 text-xs text-slate-700'>
          ${
            data.data.siteName
              ? data.data.siteName
              : new URL(data.data.url).hostname
                  .split('.')
                  .slice(-2)
                  .join('.')
          }
        </p>
      </div>
      ${
        data.data.images && data.data.images.length > 0
          ? `
      <div class='relative w-full h-44 mt-1 mb-4'>
        <image
          src='${data.data.images[0]}'
          alt='link_preview-image'
          class='object-cover bg-gray-300 w-44 h-full'
        />
      </div>`
          : ''
      }
  ${
    data.data.title
      ? `<h2 class='text-lg text-slate-800 font-bold'>
        ${data.data.title}
      </h2>`
      : ''
  }

  ${
    data.data.description
      ? `
      <p class='mt-2 text-md text-slate-800'>
        ${data.data.description}
      </p>
      `
      : ''
  }

      <p class='mt-6 text-blue-600 underline text-sm'>
        Read the full article at${' '}
        ${new URL(data.data.url).hostname
          .split('.')
          .slice(-2)
          .join('.')}${' '}
        »
      </p>
    </div>
  </a>
    `

  return { preview, previewRaw }
}
class PlainClipboard extends Clipboard {
  async onPaste(e: any) {
    e.preventDefault()
    console.log('here PASTING')
    const range = this.quill.getSelection()
    const text = e.clipboardData.getData('text/plain')

    const index = text.length + range.index
    const length = 0

    const regex = /(https?:\/\/[^\s]+)/g
    const result = text.split(regex)
    console.log('result is >>', {
      text,
      result
    })

    let parentContainer = document.createElement('div')

    let parentText = ''
    for (let i = 0; i < result.length; i++) {
      if (regex.test(result[i])) {
        const preview = await getLinkDetails(result[i])
        parentContainer.appendChild(preview.preview)
        parentText += preview.previewRaw
      } else {
        const p = document.createElement('p')
        p.textContent = result[i]
        parentContainer.appendChild(p)
        parentText += result[i]
      }
    }

    console.log('end result is >>', {
      parentContainer,
      parentText
    })
    // console.log('new delta is >>', newDelta)
    this.quill.addContainer(
      parentContainer,
      document.querySelector('#editor .ql-editor')
    )

    const newDelta = this.quill.clipboard.convert(
      parentContainer.innerHTML
    )

    // this.quill.updateContents(newDelta, 'silent')
    this.quill.setSelection(index, length, 'silent')
    // this.quill.scrollIntoView()
  }
}

export default PlainClipboard
