import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const pages = mode === 'pages'
  const appDirectory = fileURLToPath(new URL('./', import.meta.url))
  const environment = loadEnv(mode, appDirectory, 'VITE_')
  const pagesBase = environment.VITE_PAGES_BASE || '/Ediva/'

  if (pages) {
    if (!pagesBase.startsWith('/') || !pagesBase.endsWith('/') || /[?#\\]/.test(pagesBase)
      || pagesBase.includes('//') || pagesBase.split('/').some(part => part === '.' || part === '..')) {
      throw new Error('VITE_PAGES_BASE deve ser um caminho como /Ediva/ ou /.')
    }

    let studentApplication
    try {
      studentApplication = new URL(environment.VITE_STUDENT_APP_URL)
    } catch {
      throw new Error('Defina VITE_STUDENT_APP_URL com o endereço publicado da área do aluno antes de gerar o GitHub Pages.')
    }
    const localTest = studentApplication.protocol === 'http:'
      && ['localhost', '127.0.0.1', '[::1]'].includes(studentApplication.hostname)
    if ((studentApplication.protocol !== 'https:' && !localTest)
      || studentApplication.username || studentApplication.password || studentApplication.search || studentApplication.hash) {
      throw new Error('VITE_STUDENT_APP_URL deve usar HTTPS e não pode conter credenciais, consulta ou fragmento. HTTP é permitido somente em testes locais.')
    }
  }

  return {
    base: pages ? pagesBase : '/',
    plugins: [react()],
    resolve: {
      alias: {
        '#course-materials': fileURLToPath(new URL(
          pages ? './src/course-assets-pages.js' : './src/course-assets.js',
          import.meta.url,
        )),
      },
    },
    server: {
      proxy: {
        '/api': 'http://127.0.0.1:8787',
      },
    },
  }
})
