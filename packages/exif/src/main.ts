import './style.css'

import { Exif } from './exif.js'

const html = `
  <form>
    <input type="file" id="file" />
  </form>
  <pre id="result"></pre>
`

const app = document.querySelector('#app')!
app.innerHTML = html

const file = document.querySelector('#file')!
const result = document.querySelector('#result')!

file.addEventListener('change', async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  const reader = new FileReader()
  const data = await new Promise((resolve, reject) => {
    try {
      reader.onload = ({ target }) => {
        if (!target) throw new Error('no blob found')
        const { result: buffer } = target
        if (!buffer || typeof buffer === 'string')
          throw new Error('not a valid file')

        const data = new Exif(buffer).read()
        if (!data) throw new Error('no exif found')

        resolve(data)
      }
    } catch (e) {
      reject(e)
    }
    reader.readAsArrayBuffer(file)
  })

  result.innerHTML = JSON.stringify(data, null, 2)
})
