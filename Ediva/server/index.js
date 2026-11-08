import argon2 from 'argon2'
import Database from 'better-sqlite3'
import dotenv from 'dotenv'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { createServer } from 'node:http'
import { mkdir, readFile, stat } from 'node:fs/promises'
import { dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isIP } from 'node:net'
import { courseQuizzes } from './course-quizzes.js'
import { loadCourseAnswerKeys } from './course-answer-keys.js'

const serverDirectory = dirname(fileURLToPath(import.meta.url))
const appDirectory = resolve(serverDirectory, '..')
dotenv.config({ path: resolve(appDirectory, '.env') })
const distDirectory = resolve(appDirectory, 'dist')
const configuredDatabasePath = process.env.EDIVA_DB_PATH
const databasePath = configuredDatabasePath
  ? (isAbsolute(configuredDatabasePath) ? configuredDatabasePath : resolve(appDirectory, configuredDatabasePath))
  : resolve(appDirectory, 'data', 'ediva.sqlite')
const answerKeysPath = process.env.EDIVA_COURSE_ANSWER_KEYS_PATH
  ? resolve(appDirectory, process.env.EDIVA_COURSE_ANSWER_KEYS_PATH)
  : resolve(appDirectory, 'data', 'course-answer-keys.json')
const courseAnswerKeys = await loadCourseAnswerKeys(courseQuizzes, {
  json: process.env.EDIVA_COURSE_ANSWER_KEYS_JSON,
  filePath: answerKeysPath,
})
if (!['development', 'production'].includes(process.env.NODE_ENV)) {
  throw new Error('Defina NODE_ENV como development ou production antes de iniciar o servidor.')
}
const isProduction = process.env.NODE_ENV === 'production'
const sessionCookieName = 'ediva_session'
const sessionDurationSeconds = 60 * 60 * 24 * 30
const allowedOrigins = (process.env.EDIVA_ALLOWED_ORIGINS || process.env.RENDER_EXTERNAL_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
const rateLimitBuckets = new Map()

if (isProduction && allowedOrigins.length === 0) {
  throw new Error('Configure EDIVA_ALLOWED_ORIGINS com a origem HTTPS pública antes de iniciar em produção.')
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

  CREATE TABLE IF NOT EXISTS course_module_progress (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL,
    module_number INTEGER NOT NULL,
    completed_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, course_id, module_number)
  );

  CREATE TABLE IF NOT EXISTS course_assessment_results (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    score INTEGER,
    failed_modules TEXT NOT NULL DEFAULT '[]',
    completed_at INTEGER,
    certificate_id TEXT,
    PRIMARY KEY (user_id, course_id)
  );
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
database.exec(`
  UPDATE users
  SET email_verified = 1,
      email_verification_token_hash = NULL,
      email_verification_expires_at = NULL
  WHERE email_verified = 0
`)

const insertUser = database.prepare(
  'INSERT INTO users (id, name, email, password_hash, created_at, email_verified, email_verification_token_hash, email_verification_expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
)
const findUserByEmail = database.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE')
const insertSession = database.prepare(
  'INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)',
)
const deleteSession = database.prepare('DELETE FROM sessions WHERE token_hash = ?')
const listCourseModuleProgress = database.prepare(`
  SELECT module_number, completed_at
  FROM course_module_progress
  WHERE user_id = ? AND course_id = ?
  ORDER BY module_number
`)
const completeCourseModule = database.prepare(`
  INSERT OR IGNORE INTO course_module_progress (user_id, course_id, module_number, completed_at)
  VALUES (?, ?, ?, ?)
`)
const getCourseAssessment = database.prepare(`
  SELECT attempts, score, failed_modules, completed_at, certificate_id
  FROM course_assessment_results
  WHERE user_id = ? AND course_id = ?
`)
const saveCourseAssessment = database.prepare(`
  INSERT INTO course_assessment_results (
    user_id, course_id, attempts, score, failed_modules, completed_at, certificate_id
  ) VALUES (?, ?, 1, ?, ?, ?, ?)
  ON CONFLICT (user_id, course_id) DO UPDATE SET
    attempts = course_assessment_results.attempts + 1,
    score = excluded.score,
    failed_modules = excluded.failed_modules,
    completed_at = excluded.completed_at,
    certificate_id = excluded.certificate_id
`)
const findSessionUser = database.prepare(`
  SELECT users.id, users.name, users.email, users.created_at
  FROM sessions
  INNER JOIN users ON users.id = sessions.user_id
  WHERE sessions.token_hash = ? AND sessions.expires_at > ?
`)
const createUser = database.transaction((user) => {
  insertUser.run(
    user.id,
    user.name,
    user.email,
    user.passwordHash,
    user.createdAt,
    1,
    null,
    null,
  )
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
    '.mp4': 'video/mp4',
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.webm': 'video/webm',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
  })[extension] || 'application/octet-stream'
}

function parseMediaRange(rangeHeader, fileSize) {
  const match = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim())
  if (!match || (!match[1] && !match[2]) || fileSize === 0) return null

  let start
  let end
  if (!match[1]) {
    const suffixLength = Number(match[2])
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return null
    start = Math.max(fileSize - suffixLength, 0)
    end = fileSize - 1
  } else {
    start = Number(match[1])
    const requestedEnd = match[2] ? Number(match[2]) : fileSize - 1
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(requestedEnd)) return null
    end = Math.min(requestedEnd, fileSize - 1)
  }

  return start >= fileSize || start > end ? null : { start, end }
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
    const fileRelativePath = relative(distDirectory, filePath)
    const cacheControl = fileRelativePath === 'index.html' ? 'no-cache' : 'public, max-age=3600'
    if (['.mp4', '.webm'].includes(extname(filePath).toLowerCase())) {
      const { size } = await stat(filePath)
      const rangeHeader = request.method === 'GET' ? request.headers.range : undefined
      const byteRange = rangeHeader ? parseMediaRange(rangeHeader, size) : null
      const mediaHeaders = {
        'Content-Type': contentTypeFor(filePath),
        'Cache-Control': cacheControl,
        'Accept-Ranges': 'bytes',
      }

      if (rangeHeader && !byteRange) {
        response.writeHead(416, {
          ...mediaHeaders,
          'Content-Range': `bytes */${size}`,
          'Content-Length': 0,
        })
        response.end()
        return
      }

      const statusCode = byteRange ? 206 : 200
      const headers = {
        ...mediaHeaders,
        'Content-Length': byteRange ? byteRange.end - byteRange.start + 1 : size,
        ...(byteRange ? { 'Content-Range': `bytes ${byteRange.start}-${byteRange.end}/${size}` } : {}),
      }
      if (request.method === 'HEAD') {
        response.writeHead(statusCode, headers)
        response.end()
        return
      }

      const stream = createReadStream(filePath, byteRange || undefined)
      response.once('close', () => stream.destroy())
      stream.once('error', () => {
        if (response.destroyed) return
        if (response.headersSent) response.destroy()
        else sendJson(response, 503, { error: 'O site ainda não foi compilado. Execute npm run build.' })
      })
      stream.once('open', () => {
        if (response.destroyed) {
          stream.destroy()
          return
        }
        response.writeHead(statusCode, headers)
        stream.pipe(response)
      })
      return
    }

    const contents = await readFile(filePath)
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

    const courseRoute = pathname.match(/^\/api\/courses\/([a-z]+(?:-[a-z]+)*)(?:\/modules\/(\d+)\/complete|\/assessment)?$/)
    if (courseRoute) {
      const [, courseId, moduleNumberText] = courseRoute
      const course = Object.hasOwn(courseQuizzes, courseId) ? courseQuizzes[courseId] : null
      if (!course) {
        sendJson(response, 404, { error: 'Curso não encontrado.' })
        return
      }

      const user = currentUser(request)
      if (!user) {
        sendJson(response, 401, { error: 'Entre na sua conta para acompanhar este curso.' })
        return
      }

      const isAssessmentRoute = pathname.endsWith('/assessment')
      if (request.method === 'GET' && !moduleNumberText && !isAssessmentRoute) {
        const progress = listCourseModuleProgress.all(user.id, courseId)
        const assessment = getCourseAssessment.get(user.id, courseId)
        sendJson(response, 200, {
          user: { id: user.id, name: user.name },
          course: {
            id: courseId,
            title: course.title,
            modules: course.modules,
            questions: course.questions.map((question) => ({
              moduleNumber: question.moduleNumber,
              moduleTitle: question.moduleTitle,
              category: question.category,
              text: question.text,
              options: question.options.map(({ key, text }) => ({ key, text })),
            })),
          },
          progress: {
            completedModules: progress.map((item) => item.module_number),
            assessment: assessment
              ? {
                attempts: assessment.attempts,
                score: assessment.score,
                failedModules: JSON.parse(assessment.failed_modules),
                completedAt: assessment.completed_at,
                certificateId: assessment.certificate_id,
              }
              : null,
          },
        })
        return
      }

      if (request.method !== 'POST') {
        sendJson(response, 405, { error: 'Método não permitido.' }, { Allow: 'GET, POST' })
        return
      }
      if (!requestOriginIsAllowed(request)) {
        sendJson(response, 403, { error: 'Origem da solicitação não permitida.' })
        return
      }

      if (moduleNumberText) {
        const moduleNumber = Number(moduleNumberText)
        if (!Number.isInteger(moduleNumber) || moduleNumber < 1 || moduleNumber > course.modules.length) {
          sendJson(response, 400, { error: 'Módulo inválido.' })
          return
        }

        const completedModules = listCourseModuleProgress.all(user.id, courseId)
        const previousModulesCompleted = Array.from({ length: moduleNumber - 1 }, (_, index) => index + 1)
          .every((number) => completedModules.some((item) => item.module_number === number))
        if (!previousModulesCompleted) {
          sendJson(response, 409, { error: 'Conclua os módulos anteriores antes de avançar.' })
          return
        }

        await readJson(request)
        completeCourseModule.run(user.id, courseId, moduleNumber, Date.now())
        sendJson(response, 200, {
          completedModules: listCourseModuleProgress.all(user.id, courseId).map((item) => item.module_number),
        })
        return
      }

      if (!isAssessmentRoute) {
        sendJson(response, 404, { error: 'Rota do curso não encontrada.' })
        return
      }

      const completedModules = listCourseModuleProgress.all(user.id, courseId)
      if (completedModules.length !== course.modules.length) {
        sendJson(response, 409, { error: 'Conclua todos os módulos antes de fazer o questionário.' })
        return
      }

      const existingAssessment = getCourseAssessment.get(user.id, courseId)
      if (existingAssessment?.completed_at) {
        sendJson(response, 409, { error: 'Este curso já foi concluído e o certificado já está disponível.' })
        return
      }

      const expectedAnswers = courseAnswerKeys.get(courseId)
      if (!expectedAnswers) {
        sendJson(response, 503, { error: 'A avaliação deste curso está temporariamente indisponível. Tente novamente mais tarde.' })
        return
      }

      const body = await readJson(request)
      const answers = body.answers
      if (!Array.isArray(answers)
        || answers.length !== course.questions.length
        || answers.some((answer) => !['A', 'B', 'C', 'D'].includes(answer))) {
        sendJson(response, 400, { error: 'Responda todas as questões antes de enviar o questionário.' })
        return
      }

      const incorrectQuestions = course.questions
        .map((question, index) => ({ question, answer: answers[index], expectedAnswer: expectedAnswers[index] }))
        .filter(({ answer, expectedAnswer }) => answer !== expectedAnswer)
      const score = course.questions.length - incorrectQuestions.length
      const failedModules = [...new Set(incorrectQuestions.map(({ question }) => question.moduleNumber))]
        .sort((left, right) => left - right)
      const completedAt = score === course.questions.length ? Date.now() : null
      const certificateId = completedAt ? randomUUID() : null

      saveCourseAssessment.run(
        user.id,
        courseId,
        score,
        JSON.stringify(failedModules),
        completedAt,
        certificateId,
      )
      sendJson(response, 200, {
        passed: score === course.questions.length,
        score,
        total: course.questions.length,
        failedModules,
        completedAt,
        certificateId,
      })
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

      if (findUserByEmail.get(email)) {
        sendJson(response, 409, { error: 'Este e-mail já está cadastrado. Entre na sua conta.' })
        return
      }

      const user = {
        id: randomUUID(),
        name,
        email,
        passwordHash: await argon2.hash(password, {
          type: argon2.argon2id,
          memoryCost: 19_456,
          timeCost: 2,
          parallelism: 1,
        }),
        createdAt: Date.now(),
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

      startSession(response, user.id, request)
      sendJson(response, 201, {
        user: { id: user.id, name: user.name, email: user.email, created_at: user.createdAt },
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
      startSession(response, user.id, request)
      sendJson(response, 200, {
        user: { id: user.id, name: user.name, email: user.email, created_at: user.created_at },
      })
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
