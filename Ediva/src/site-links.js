function isDocumentReference(path) {
  return typeof path !== 'string'
    || !path.startsWith('/')
    || path.startsWith('//')
}

function localBasePath(base) {
  const pathname = new URL(base || '/', 'https://ediva.invalid').pathname
  const trimmed = pathname.replace(/^\/+|\/+$/g, '')
  return trimmed ? '/' + trimmed + '/' : '/'
}

function remoteBaseURL(value) {
  if (!value) return ''
  const url = new URL(value)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('Configure a URL pública do site sem credenciais, parâmetros ou fragmentos.')
  }
  return url.origin + url.pathname.replace(/\/+$/, '')
}

export function isStudentRoute(path) {
  if (typeof path !== 'string') return false
  const pathname = path.split(/[?#]/, 1)[0].replace(/\/+$/, '')
  return ['/entrar', '/cadastro', '/conta', '/estudar'].includes(pathname)
    || pathname.startsWith('/estudar/')
}

export function createSiteLinks({ base = '/', pages = false, studentAppURL = '', publicSiteURL = '' } = {}) {
  const localBase = localBasePath(base)
  const localPrefix = localBase === '/' ? '' : localBase.slice(0, -1)
  const studentBase = remoteBaseURL(studentAppURL)
  const publicBase = remoteBaseURL(publicSiteURL)

  function localLink(path) {
    if (isDocumentReference(path)) return path
    if (localPrefix && (path === localPrefix || path.startsWith(localBase))) {
      return path === localPrefix ? localBase : path
    }
    return localBase + path.slice(1)
  }

  function appLink(path) {
    if (isDocumentReference(path)) return path
    const studentRoute = isStudentRoute(path)
    if (pages && studentRoute && studentBase) return studentBase + path
    if (!pages && !studentRoute && publicBase) return publicBase + path
    return localLink(path)
  }

  function currentRoutePath(pathname = globalThis.location?.pathname || '/') {
    let route = pathname.split(/[?#]/, 1)[0]
    if (localPrefix && (route === localPrefix || route.startsWith(localBase))) {
      route = route.slice(localPrefix.length)
    }
    return route.replace(/\/+$/, '') || '/'
  }

  return { appLink, assetLink: localLink, currentRoutePath }
}

const environment = import.meta.env || {}
export const isPagesBuild = environment.MODE === 'pages'
const siteLinks = createSiteLinks({
  base: environment.BASE_URL || '/',
  pages: isPagesBuild,
  studentAppURL: environment.VITE_STUDENT_APP_URL,
  publicSiteURL: environment.VITE_PUBLIC_SITE_URL,
})

export const appLink = siteLinks.appLink
export const assetLink = siteLinks.assetLink
export const currentRoutePath = siteLinks.currentRoutePath
