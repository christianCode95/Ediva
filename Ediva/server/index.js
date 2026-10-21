import argon2 from 'argon2'
import Database from 'better-sqlite3'
import dotenv from 'dotenv'
import nodemailer from 'nodemailer'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import { mkdir, readFile, stat } from 'node:fs/promises'
import { dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isIP } from 'node:net'

const serverDirectory = dirname(fileURLToPath(import.meta.url))
const appDirectory = resolve(serverDirectory, '..')
dotenv.config({ path: resolve(appDirectory, '.env') })
const distDirectory = resolve(appDirectory, 'dist')
let publicBaseUrl = (process.env.EDIVA_PUBLIC_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : '')).replace(/\/+$/, '')
let publicOrigin = ''
if (publicBaseUrl) {
  try {
    const parsedPublicUrl = new URL(publicBaseUrl)
    publicOrigin = parsedPublicUrl.origin
    if (parsedPublicUrl.pathname !== '/' || parsedPublicUrl.search || parsedPublicUrl.hash) {
      throw new Error('EDIVA_PUBLIC_URL deve conter somente a origem do site, sem caminho ou parâmetros.')
    }
  } catch (error) {
    throw new Error(`EDIVA_PUBLIC_URL inválida: ${error.message}`, { cause: error })
  }
}
const configuredDatabasePath = process.env.EDIVA_DB_PATH
const databasePath = configuredDatabasePath
  ? (isAbsolute(configuredDatabasePath) ? configuredDatabasePath : resolve(appDirectory, configuredDatabasePath))
  : resolve(appDirectory, 'data', 'ediva.sqlite')
if (!['development', 'production'].includes(process.env.NODE_ENV)) {
  throw new Error('Defina NODE_ENV como development ou production antes de iniciar o servidor.')
}
const isProduction = process.env.NODE_ENV === 'production'
const sessionCookieName = 'ediva_session'
const sessionDurationSeconds = 60 * 60 * 24 * 30
const verificationDurationMs = 24 * 60 * 60 * 1000
const allowedOrigins = (process.env.EDIVA_ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
const rateLimitBuckets = new Map()
const smtpHost = process.env.EDIVA_SMTP_HOST?.trim() || ''
const smtpPort = Number(process.env.EDIVA_SMTP_PORT || 587)
const smtpSecure = process.env.EDIVA_SMTP_SECURE
  ? process.env.EDIVA_SMTP_SECURE === 'true'
  : smtpPort === 465
const smtpUser = process.env.EDIVA_SMTP_USER || ''
const smtpPassword = process.env.EDIVA_SMTP_PASSWORD || ''
const mailFrom = process.env.EDIVA_MAIL_FROM?.trim() || ''
const mailReplyTo = process.env.EDIVA_MAIL_REPLY_TO?.trim() || ''
const emailTransport = smtpHost && smtpUser && smtpPassword
  ? nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: { user: smtpUser, pass: smtpPassword },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    disableFileAccess: true,
    disableUrlAccess: true,
  })
  : null

if (isProduction && allowedOrigins.length === 0) {
  throw new Error('Configure EDIVA_ALLOWED_ORIGINS com a origem HTTPS pública antes de iniciar em produção.')
}
if (isProduction && (!publicBaseUrl || !publicOrigin.startsWith('https://'))) {
  throw new Error('Configure EDIVA_PUBLIC_URL com a URL HTTPS pública antes de iniciar em produção.')
}
if (isProduction && !allowedOrigins.includes(publicOrigin)) {
  throw new Error('EDIVA_PUBLIC_URL também precisa estar presente em EDIVA_ALLOWED_ORIGINS.')
}
if (isProduction && (!emailTransport || !mailFrom || !smtpPort)) {
  throw new Error('Configure o SMTP e EDIVA_MAIL_FROM para enviar confirmações de e-mail em produção.')
}

await mkdir(dirname(databasePath), { recursive: true })

const database = new Database(databasePath)
database.pragma('journal_mode = WAL')
database.pragma('foreign_keys = ON')
database.pragma('busy_timeout = 5000')
database.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL COLLATE NOCASE UNIQUE,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    email_verified INTEGER NOT NULL DEFAULT 0,
    email_verification_token_hash TEXT,
    email_verification_expires_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);
`)

const existingUserColumns = new Set(database.pragma('table_info(users)').map((column) => column.name))
if (!existingUserColumns.has('email_verified')) {
  database.exec('ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0')
}
if (!existingUserColumns.has('email_verification_token_hash')) {
  database.exec('ALTER TABLE users ADD COLUMN email_verification_token_hash TEXT')
}
if (!existingUserColumns.has('email_verification_expires_at')) {
  database.exec('ALTER TABLE users ADD COLUMN email_verification_expires_at INTEGER')
}

const insertUser = database.prepare(
  'INSERT INTO users (id, name, email, password_hash, created_at, email_verified, email_verification_token_hash, email_verification_expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
)
const findUserByEmail = database.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE')
const findUserByVerificationToken = database.prepare(`
  SELECT id, name, email, created_at
  FROM users
  WHERE email_verification_token_hash = ?
    AND email_verified = 0
    AND email_verification_expires_at > ?
`)
const updateVerificationToken = database.prepare(`
  UPDATE users
  SET email_verification_token_hash = ?, email_verification_expires_at = ?
  WHERE id = ? AND email_verified = 0
`)
const markEmailVerified = database.prepare(`
  UPDATE users
  SET email_verified = 1, email_verification_token_hash = NULL, email_verification_expires_at = NULL
  WHERE id = ? AND email_verified = 0
`)
const deleteExpiredVerificationToken = database.prepare(`
  UPDATE users
  SET email_verification_token_hash = NULL, email_verification_expires_at = NULL
  WHERE email_verified = 0 AND email_verification_expires_at <= ?
`)
const insertSession = database.prepare(
  'INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)',
)
const deleteSession = database.prepare('DELETE FROM sessions WHERE token_hash = ?')
const findSessionUser = database.prepare(`
  SELECT users.id, users.name, users.email, users.created_at
  FROM sessions
  INNER JOIN users ON users.id = sessions.user_id
  WHERE sessions.token_hash = ? AND sessions.expires_at > ? AND users.email_verified = 1
`)
const createUser = database.transaction((user) => {
  insertUser.run(
    user.id,
    user.name,
    user.email,
    user.passwordHash,
    user.createdAt,
    0,
    user.verificationTokenHash,
    user.verificationExpiresAt,
  )
})
const verifyEmailAndCreateSession = database.transaction((tokenHash, session) => {
  const user = findUserByVerificationToken.get(tokenHash, Date.now())
  if (!user) return null
  const updated = markEmailVerified.run(user.id)
  if (updated.changes !== 1) return null
  insertSession.run(session.tokenHash, user.id, session.expiresAt, session.createdAt)
  return user
})

const dummyPasswordHash = await argon2.hash(randomBytes(24).toString('hex'), {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
})

function setSecurityHeaders(response) {
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('X-Frame-Options', 'DENY')
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'",
  )
  if (isProduction) response.setHeader('Strict-Transport-Security', 'max-age=31536000')
}

function sendJson(response, statusCode, payload, extraHeaders = {}) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extraHeaders,
  })
  response.end(JSON.stringify(payload))
}

function cookieValue(request, name) {
  const cookies = request.headers.cookie?.split(';') || []
  for (const cookie of cookies) {
    const separator = cookie.indexOf('=')
    if (separator < 0) continue
    if (cookie.slice(0, separator).trim() === name) return cookie.slice(separator + 1).trim()
  }
  return null
}

function tokenDigest(token) {
  return createHash('sha256').update(token).digest('hex')
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character])
}

async function sendVerificationEmail(user, token) {
  if (!emailTransport || !mailFrom) return false

  const verificationUrl = `${publicBaseUrl}/confirmar-email?token=${encodeURIComponent(token)}`
  try {
    await emailTransport.sendMail({
      from: mailFrom,
      to: user.email,
      ...(mailReplyTo ? { replyTo: mailReplyTo } : {}),
      subject: 'Confirme seu e-mail para acessar a EDIVA',
      text: [
        `Olá, ${user.name}!`,
        '',
        'Para confirmar que este e-mail é seu e ativar sua conta EDIVA, abra o link abaixo:',
        verificationUrl,
        '',
        'Este link só pode ser usado uma vez e expira em 24 horas.',
        'Se você não criou uma conta na EDIVA, ignore esta mensagem.',
      ].join('\n'),
      html: `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f8f5ff;font-family:Arial,sans-serif;color:#24105f"><main style="max-width:560px;margin:32px auto;padding:32px;background:#fff;border:1px solid #eee7ff;border-radius:20px"><p style="margin:0 0 10px;color:#a024d3;font-size:12px;font-weight:bold;letter-spacing:1px">EDIVA · ESCOLA DIGITAL</p><h1 style="margin:0 0 16px;font-size:25px">Confirme seu e-mail</h1><p>Olá, ${escapeHtml(user.name)}! Para confirmar que este endereço é seu e ativar sua conta EDIVA, use o botão abaixo.</p><p style="margin:26px 0"><a href="${verificationUrl}" style="display:inline-block;padding:14px 22px;border-radius:10px;background:#4f0cb8;color:#fff;text-decoration:none;font-weight:bold">Confirmar meu e-mail</a></p><p style="font-size:13px;color:#695d89">O link só pode ser usado uma vez e expira em 24 horas. Se você não criou uma conta na EDIVA, ignore esta mensagem.</p></main></body></html>`,
      disableFileAccess: true,
      disableUrlAccess: true,
    })
    return true
  } catch (error) {
    console.error('Falha ao enviar e-mail de confirmação:', error.code || 'ERRO_SMTP')
    return false
  }
}

function sessionCookie(token, maxAge) {
  const secure = isProduction ? '; Secure' : ''
  return `${sessionCookieName}=${token}; Max-Age=${maxAge}; Path=/; HttpOnly; SameSite=Lax${secure}`
}

function startSession(response, userId, request) {
  const priorToken = cookieValue(request, sessionCookieName)
  if (priorToken && /^[A-Za-z0-9_-]{43}$/.test(priorToken)) deleteSession.run(tokenDigest(priorToken))

  const token = randomBytes(32).toString('base64url')
  const now = Date.now()
  insertSession.run(tokenDigest(token), userId, now + sessionDurationSeconds * 1000, now)
  response.setHeader('Set-Cookie', sessionCookie(token, sessionDurationSeconds))
}

function clearSession(response, request) {
  const token = cookieValue(request, sessionCookieName)
  if (token && /^[A-Za-z0-9_-]{43}$/.test(token)) deleteSession.run(tokenDigest(token))
  response.setHeader('Set-Cookie', sessionCookie('', 0))
}

function currentUser(request) {
  const token = cookieValue(request, sessionCookieName)
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null
  return findSessionUser.get(tokenDigest(token), Date.now()) || null
}

function requestOriginIsAllowed(request) {
  const origin = request.headers.origin
  if (!origin) return request.headers['sec-fetch-site'] !== 'cross-site'
  if (!isProduction && /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return true
  return allowedOrigins.includes(origin)
}

function clientAddress(request) {
  if (process.env.EDIVA_TRUST_CLOUDFLARE === 'true') {
    const cloudflareAddress = request.headers['cf-connecting-ip']
    if (typeof cloudflareAddress === 'string' && isIP(cloudflareAddress.trim())) {
      return cloudflareAddress.trim()
    }
  }

  if (process.env.EDIVA_TRUST_PROXY === 'true') {
    const forwardedFor = request.headers['x-forwarded-for']
    if (typeof forwardedFor === 'string') {
      const firstForwardedAddress = forwardedFor.split(',')[0].trim()
      if (isIP(firstForwardedAddress)) return firstForwardedAddress
    }
  }
  return request.socket.remoteAddress || 'unknown'
}

function consumeRateLimit(key, maximum, windowMs) {
  const now = Date.now()
  let bucket = rateLimitBuckets.get(key)
  if (!bucket || bucket.expiresAt <= now) {
    bucket = { count: 0, expiresAt: now + windowMs }
    rateLimitBuckets.set(key, bucket)
  }
  bucket.count += 1

  if (rateLimitBuckets.size > 5_000) {
    for (const [bucketKey, bucketValue] of rateLimitBuckets) {
      if (bucketValue.expiresAt <= now) rateLimitBuckets.delete(bucketKey)
    }
  }

  return bucket.count <= maximum ? 0 : Math.max(1, Math.ceil((bucket.expiresAt - now) / 1000))
}

async function readJson(request) {
  if (!request.headers['content-type']?.toLowerCase().startsWith('application/json')) {
    throw Object.assign(new Error('Envie os dados em formato JSON.'), { statusCode: 415 })
  }

  const chunks = []
  let totalSize = 0
  for await (const chunk of request) {
    totalSize += chunk.length
    if (totalSize > 8_192) {
      throw Object.assign(new Error('A solicitação é muito grande.'), { statusCode: 413 })
    }
    chunks.push(chunk)
  }

  try {
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new Error('JSON object required')
    }
    return body
  } catch {
    throw Object.assign(new Error('Não foi possível ler os dados enviados.'), { statusCode: 400 })
  }
}

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function getRegistrationData(body) {
  const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : ''
  const email = normalizeEmail(body.email)
  const password = typeof body.password === 'string' ? body.password : ''
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (name.length < 2 || name.length > 80) {
    throw Object.assign(new Error('Informe seu nome, com até 80 caracteres.'), { statusCode: 400 })
  }
  if (email.length > 254 || !emailPattern.test(email)) {
    throw Object.assign(new Error('Informe um e-mail válido.'), { statusCode: 400 })
  }
  if ([...password].length < 12 || [...password].length > 128) {
    throw Object.assign(new Error('A senha deve ter de 12 a 128 caracteres.'), { statusCode: 400 })
  }

  return { name, email, password }
}

function contentTypeFor(pathname) {
  const extension = extname(pathname).toLowerCase()
  return ({
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
  })[extension] || 'application/octet-stream'
}

async function serveFrontend(request, response, pathname) {
  let decodedPath
  try {
    decodedPath = decodeURIComponent(pathname)
  } catch {
    sendJson(response, 400, { error: 'Endereço inválido.' })
    return
  }

  const requestedFile = resolve(distDirectory, `.${decodedPath}`)
  const isInsideDist = requestedFile === distDirectory || requestedFile.startsWith(`${distDirectory}${sep}`)
  if (!isInsideDist) {
    sendJson(response, 404, { error: 'Página não encontrada.' })
    return
  }

  let filePath = requestedFile
  try {
    if ((await stat(filePath)).isDirectory()) filePath = resolve(filePath, 'index.html')
    await stat(filePath)
  } catch {
    if (extname(decodedPath)) {
      sendJson(response, 404, { error: 'Arquivo não encontrado.' })
      return
    }
    filePath = resolve(distDirectory, 'index.html')
  }

  try {
    const contents = await readFile(filePath)
    const fileRelativePath = relative(distDirectory, filePath)
    const cacheControl = fileRelativePath === 'index.html' ? 'no-cache' : 'public, max-age=3600'
    response.writeHead(200, {
      'Content-Type': contentTypeFor(filePath),
      'Cache-Control': cacheControl,
      'Content-Length': contents.length,
    })
    response.end(request.method === 'HEAD' ? undefined : contents)
  } catch {
    sendJson(response, 503, { error: 'O site ainda não foi compilado. Execute npm run build.' })
  }
}

const server = createServer(async (request, response) => {
  setSecurityHeaders(response)
  const requestUrl = new URL(request.url || '/', 'http://localhost')
  const { pathname } = requestUrl

  try {
    if (pathname === '/api/health' && request.method === 'GET') {
      sendJson(response, 200, { status: 'ok' })
      return
    }

    if (pathname === '/api/auth/me' && request.method === 'GET') {
      sendJson(response, 200, { user: currentUser(request) })
      return
    }

    if (pathname === '/api/auth/register' && request.method === 'POST') {
      if (!requestOriginIsAllowed(request)) {
        sendJson(response, 403, { error: 'Origem da solicitação não permitida.' })
        return
      }

      const body = await readJson(request)
      const { name, email, password } = getRegistrationData(body)
      const address = clientAddress(request)
      const addressWait = consumeRateLimit(`register:ip:${address}`, 12, 60 * 60 * 1000)
      const emailWait = consumeRateLimit(`register:email:${email}`, 4, 60 * 60 * 1000)
      const waitSeconds = Math.max(addressWait, emailWait)
      if (waitSeconds) {
        sendJson(response, 429, { error: 'Muitas tentativas de cadastro. Aguarde e tente novamente.' }, { 'Retry-After': String(waitSeconds) })
        return
      }

      const now = Date.now()
      let user = findUserByEmail.get(email)
      if (user?.email_verified) {
        sendJson(response, 409, { error: 'Este e-mail já está cadastrado. Entre na sua conta.' })
        return
      }

      const verificationToken = randomBytes(32).toString('base64url')
      if (!user) {
        user = {
          id: randomUUID(),
          name,
          email,
          passwordHash: await argon2.hash(password, {
            type: argon2.argon2id,
            memoryCost: 19_456,
            timeCost: 2,
            parallelism: 1,
          }),
          createdAt: now,
          verificationTokenHash: tokenDigest(verificationToken),
          verificationExpiresAt: now + verificationDurationMs,
        }
        try {
          createUser(user)
        } catch (error) {
          if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            sendJson(response, 409, { error: 'Este e-mail já está cadastrado. Entre na sua conta.' })
            return
          }
          throw error
        }
      } else {
        updateVerificationToken.run(
          tokenDigest(verificationToken),
          now + verificationDurationMs,
          user.id,
        )
      }

      const emailSent = await sendVerificationEmail(user, verificationToken)
      sendJson(response, 202, {
        status: 'verification_pending',
        email: user.email,
        emailSent,
        message: 'Confira sua caixa de entrada para confirmar seu e-mail.',
      })
      return
    }

    if (pathname === '/api/auth/login' && request.method === 'POST') {
      if (!requestOriginIsAllowed(request)) {
        sendJson(response, 403, { error: 'Origem da solicitação não permitida.' })
        return
      }

      const body = await readJson(request)
      const email = normalizeEmail(body.email)
      const password = typeof body.password === 'string' ? body.password : ''
      if (email.length > 254 || [...password].length > 128) {
        sendJson(response, 400, { error: 'Confira o e-mail e a senha informados.' })
        return
      }

      const address = clientAddress(request)
      const addressWait = consumeRateLimit(`login:ip:${address}`, 40, 15 * 60 * 1000)
      const emailWait = consumeRateLimit(`login:email:${email}`, 10, 15 * 60 * 1000)
      const waitSeconds = Math.max(addressWait, emailWait)
      if (waitSeconds) {
        sendJson(response, 429, { error: 'Muitas tentativas de entrada. Aguarde e tente novamente.' }, { 'Retry-After': String(waitSeconds) })
        return
      }

      const user = findUserByEmail.get(email)
      const passwordIsValid = await argon2.verify(user?.password_hash || dummyPasswordHash, password)
      if (!user || !passwordIsValid) {
        sendJson(response, 401, { error: 'E-mail ou senha incorretos.' })
        return
      }
      if (!user.email_verified) {
        sendJson(response, 403, {
          code: 'EMAIL_NOT_VERIFIED',
          email: user.email,
          error: 'Confirme seu e-mail antes de entrar na conta.',
        })
        return
      }

      startSession(response, user.id, request)
      sendJson(response, 200, {
        user: { id: user.id, name: user.name, email: user.email, created_at: user.created_at },
      })
      return
    }

    if (pathname === '/api/auth/resend-verification' && request.method === 'POST') {
      if (!requestOriginIsAllowed(request)) {
        sendJson(response, 403, { error: 'Origem da solicitação não permitida.' })
        return
      }

      const body = await readJson(request)
      const email = normalizeEmail(body.email)
      if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        sendJson(response, 400, { error: 'Informe um e-mail válido.' })
        return
      }

      const address = clientAddress(request)
      const addressWait = consumeRateLimit(`resend:ip:${address}`, 12, 60 * 60 * 1000)
      const emailWait = consumeRateLimit(`resend:email:${email}`, 4, 60 * 60 * 1000)
      const waitSeconds = Math.max(addressWait, emailWait)
      if (waitSeconds) {
        sendJson(response, 429, { error: 'Muitas solicitações. Aguarde e tente novamente.' }, { 'Retry-After': String(waitSeconds) })
        return
      }

      const user = findUserByEmail.get(email)
      if (user && !user.email_verified) {
        const token = randomBytes(32).toString('base64url')
        const now = Date.now()
        updateVerificationToken.run(tokenDigest(token), now + verificationDurationMs, user.id)
        await sendVerificationEmail(user, token)
      }

      sendJson(response, 202, {
        message: 'Se houver uma conta aguardando confirmação para este e-mail, enviaremos um novo link.',
      })
      return
    }

    if (pathname === '/api/auth/verify-email' && request.method === 'POST') {
      if (!requestOriginIsAllowed(request)) {
        sendJson(response, 403, { error: 'Origem da solicitação não permitida.' })
        return
      }

      const body = await readJson(request)
      const token = typeof body.token === 'string' ? body.token : ''
      if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
        sendJson(response, 400, { error: 'Este link de confirmação é inválido ou expirou.' })
        return
      }

      const sessionToken = randomBytes(32).toString('base64url')
      const now = Date.now()
      const user = verifyEmailAndCreateSession(tokenDigest(token), {
        tokenHash: tokenDigest(sessionToken),
        createdAt: now,
        expiresAt: now + sessionDurationSeconds * 1000,
      })
      if (!user) {
        sendJson(response, 400, { error: 'Este link de confirmação é inválido, já foi usado ou expirou. Solicite um novo link.' })
        return
      }

      response.setHeader('Set-Cookie', sessionCookie(sessionToken, sessionDurationSeconds))
      sendJson(response, 200, { user })
      return
    }

    if (pathname === '/api/auth/logout' && request.method === 'POST') {
      if (!requestOriginIsAllowed(request)) {
        sendJson(response, 403, { error: 'Origem da solicitação não permitida.' })
        return
      }
      clearSession(response, request)
      sendJson(response, 200, { ok: true })
      return
    }

    if (pathname.startsWith('/api/')) {
      sendJson(response, 404, { error: 'Rota da API não encontrada.' })
      return
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      sendJson(response, 405, { error: 'Método não permitido.' }, { Allow: 'GET, HEAD' })
      return
    }

    await serveFrontend(request, response, pathname)
  } catch (error) {
    if (error.statusCode) {
      sendJson(response, error.statusCode, { error: error.message })
      return
    }
    console.error('Erro ao processar solicitação:', error.message)
    sendJson(response, 500, { error: 'Não foi possível concluir a solicitação. Tente novamente.' })
  }
})

const cleanupTimer = setInterval(() => {
  const now = Date.now()
  database.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now)
  deleteExpiredVerificationToken.run(now)
}, 60 * 60 * 1000)
cleanupTimer.unref()

const port = Number(process.env.PORT || 8787)
const host = process.env.HOST || '0.0.0.0'
server.listen(port, host, () => {
  console.log(`EDIVA online em http://${host}:${port}`)
  console.log(`Banco de contas: ${databasePath}`)
})

function shutdown() {
  clearInterval(cleanupTimer)
  server.close(() => {
    database.close()
    process.exit(0)
  })
  setTimeout(() => process.exit(1), 10_000).unref()
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
