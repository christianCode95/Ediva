const value = process.env.VITE_STUDENT_APP_URL
let studentURL
try {
  studentURL = new URL(value)
} catch {
  throw new Error('Configure STUDENT_APP_URL com a URL publicada da área do aluno antes de executar o Pages.')
}

const localTest = studentURL.protocol === 'http:'
  && ['localhost', '127.0.0.1', '[::1]'].includes(studentURL.hostname)
if ((studentURL.protocol !== 'https:' && !localTest)
  || studentURL.username || studentURL.password || studentURL.search || studentURL.hash) {
  throw new Error('A área do aluno deve usar uma URL HTTPS sem credenciais, parâmetros ou fragmentos.')
}

studentURL.pathname = studentURL.pathname.replace(/\/+$/, '') + '/'
let response
try {
  response = await fetch(new URL('api/health', studentURL), {
    headers: { Accept: 'application/json' },
    redirect: 'error',
    signal: AbortSignal.timeout(15000),
  })
} catch {
  throw new Error('Não foi possível acessar a área do aluno. Confirme a publicação do servidor antes do Pages.')
}
const health = await response.json().catch(() => null)
if (!response.ok || health?.status !== 'ok') {
  throw new Error('A área do aluno ainda não respondeu corretamente. Confirme a publicação do servidor antes do Pages.')
}
console.log('Área do aluno disponível. A publicação das páginas públicas pode continuar.')
