import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { auxiliarFinanceiroQuiz } from '../server/finance-quiz.js'

const appDirectory = fileURLToPath(new URL('../', import.meta.url))
const coursePath = '/api/courses/auxiliar-financeiro'
// Deliberately synthetic answers exercise grading without publishing the real key.
const expectedAnswers = auxiliarFinanceiroQuiz.questions.map((question, index) => question.options[index % 4].key)
const syntheticAnswerKeys = { 'auxiliar-financeiro': expectedAnswers }
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

async function unusedPort() {
  const probe = createServer()
  await new Promise((resolve, reject) => {
    probe.once('error', reject)
    probe.listen(0, '127.0.0.1', resolve)
  })
  const port = probe.address().port
  await new Promise(resolve => probe.close(resolve))
  return port
}

test('Auxiliar Financeiro publishes complete questions without private answer fields', () => {
  assert.equal(auxiliarFinanceiroQuiz.modules.length, 10)
  assert.deepEqual(auxiliarFinanceiroQuiz.modules.map(module => module.number), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  assert.equal(auxiliarFinanceiroQuiz.questions.length, 30)
  assert.ok(auxiliarFinanceiroQuiz.questions.every(question => !Object.hasOwn(question, 'answer')))
  for (const module of auxiliarFinanceiroQuiz.modules) {
    const questions = auxiliarFinanceiroQuiz.questions.filter(question => question.moduleNumber === module.number)
    assert.equal(questions.length, 3, 'Three supplied questions per module')
    for (const question of questions) {
      assert.equal(question.moduleTitle, module.title)
      assert.ok(question.text.trim())
      assert.deepEqual(question.options.map(option => option.key), ['A', 'B', 'C', 'D'])
      assert.ok(question.options.every(option => option.text.trim()))
    }
  }
})

test('financial assessment unlocks after ten modules, supports review and persists its certificate', { timeout: 30000 }, async t => {
  const directory = await mkdtemp(path.join(tmpdir(), 'ediva-finance-test-'))
  const port = await unusedPort()
  const origin = 'http://127.0.0.1:' + port
  let child, childExited, output = '', cookie = ''

  async function stopServer() {
    if (!child) return
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM')
    let timer
    try {
      await Promise.race([
        childExited,
        new Promise((resolve, reject) => {
          timer = setTimeout(() => reject(new Error('Disposable test server did not stop')), 5000)
        }),
      ])
    } finally {
      clearTimeout(timer)
      child = null
    }
  }

  t.after(async () => {
    await stopServer()
    const resolved = path.resolve(directory)
    assert.equal(path.dirname(resolved), path.resolve(tmpdir()))
    assert.ok(path.basename(resolved).startsWith('ediva-finance-test-'))
    await rm(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  })

  async function startServer(configuration = {}) {
    output = ''
    const answerKeysJSON = Object.hasOwn(configuration, 'answerKeysJSON')
      ? configuration.answerKeysJSON
      : JSON.stringify(syntheticAnswerKeys)
    const environment = {
      ...process.env,
      NODE_ENV: 'development',
      HOST: '127.0.0.1',
      PORT: String(port),
      EDIVA_DB_PATH: path.join(directory, 'accounts.sqlite'),
      EDIVA_ALLOWED_ORIGINS: origin,
      EDIVA_COURSE_ANSWER_KEYS_PATH: configuration.answerKeysPath || path.join(directory, 'missing-keys.json'),
    }
    if (answerKeysJSON == null) delete environment.EDIVA_COURSE_ANSWER_KEYS_JSON
    else environment.EDIVA_COURSE_ANSWER_KEYS_JSON = answerKeysJSON
    child = spawn(process.execPath, ['server/index.js'], {
      cwd: appDirectory,
      env: environment,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    childExited = new Promise((resolve, reject) => {
      child.once('exit', resolve)
      child.once('error', reject)
    })
    child.stdout.on('data', chunk => { output = (output + chunk).slice(-3000) })
    child.stderr.on('data', chunk => { output = (output + chunk).slice(-3000) })
    for (let attempt = 0; attempt < 100; attempt++) {
      if (child.exitCode !== null || child.signalCode !== null) throw new Error('Disposable server failed: ' + output)
      try {
        const response = await fetch(origin + '/api/health', { signal: AbortSignal.timeout(500) })
        if (response.ok) return
      } catch {}
      await delay(50)
    }
    throw new Error('Disposable server did not become ready: ' + output)
  }

  async function request(route, { method = 'GET', body, session = cookie } = {}) {
    const response = await fetch(origin + route, {
      method,
      headers: { Origin: origin, 'Content-Type': 'application/json', ...(session ? { Cookie: session } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(5000),
    })
    return { status: response.status, body: await response.json(), headers: response.headers }
  }

  const complete = number => request(coursePath + '/modules/' + number + '/complete', { method: 'POST', body: {} })
  const assess = answers => request(coursePath + '/assessment', { method: 'POST', body: { answers } })
  await startServer()

  await t.test('requires authentication and returns only public question fields', async () => {
    assert.equal((await request(coursePath)).status, 401)
    const registration = await request('/api/auth/register', {
      method: 'POST',
      body: { name: 'Finance test student', email: 'finance-student@example.test', password: 'Disposable password 123!' },
    })
    assert.equal(registration.status, 201)
    cookie = registration.headers.get('set-cookie').split(';')[0]
    const course = await request(coursePath)
    assert.equal(course.status, 200)
    assert.equal(course.body.course.id, 'auxiliar-financeiro')
    assert.equal(course.body.course.questions.length, 30)
    assert.equal(course.body.course.modules.length, 10)
    assert.deepEqual(course.body.progress.completedModules, [])
    assert.equal(course.body.progress.assessment, null)
    assert.ok(course.body.course.questions.every(question => !Object.hasOwn(question, 'answer')))
    for (const question of course.body.course.questions) {
      assert.deepEqual(Object.keys(question).sort(), ['category', 'moduleNumber', 'moduleTitle', 'options', 'text'])
      for (const option of question.options) assert.deepEqual(Object.keys(option).sort(), ['key', 'text'])
    }
    assert.equal((await request('/api/courses/constructor')).status, 404)
    assert.equal((await request('/api/courses/unknown-course')).status, 404)
  })

  await t.test('requires all modules in order and handles repeated completion once', async () => {
    assert.equal((await assess(expectedAnswers)).status, 409)
    assert.equal((await complete(0)).status, 400)
    assert.equal((await complete(11)).status, 400)
    assert.equal((await complete(2)).status, 409)
    for (let number = 1; number <= 9; number++) {
      const result = await complete(number)
      assert.equal(result.status, 200)
      assert.deepEqual(result.body.completedModules, Array.from({ length: number }, (_, index) => index + 1))
    }
    assert.equal((await assess(expectedAnswers)).status, 409, 'Nine modules do not unlock the assessment')
    const repeated = await complete(1)
    assert.equal(repeated.status, 200)
    assert.equal(repeated.body.completedModules.length, 9)
    const finalModule = await complete(10)
    assert.equal(finalModule.status, 200)
    assert.equal(finalModule.body.completedModules.length, 10)
  })

  await t.test('rejects incomplete answers and maps mistakes to the modules to review', async () => {
    assert.equal((await assess([])).status, 400)
    const invalid = [...expectedAnswers]
    invalid[0] = 'X'
    assert.equal((await assess(invalid)).status, 400)
    const mistaken = [...expectedAnswers]
    mistaken[3] = 'A'
    mistaken[22] = 'D'
    const result = await assess(mistaken)
    assert.equal(result.status, 200)
    assert.deepEqual(result.body, {
      passed: false, score: 28, total: 30, failedModules: [2, 8], completedAt: null, certificateId: null,
    })
    const saved = (await request(coursePath)).body.progress.assessment
    assert.deepEqual(saved, { attempts: 1, score: 28, failedModules: [2, 8], completedAt: null, certificateId: null })
  })

  await t.test('keeps the app usable but rejects grading when private configuration is unavailable or invalid', async () => {
    for (const answerKeysJSON of [null, 'not-json', '[]', JSON.stringify({ 'auxiliar-financeiro': [] }), JSON.stringify({ 'auxiliar-financeiro': expectedAnswers.map(() => 'X') })]) {
      await stopServer()
      // Undefined removes this variable from the child environment, testing a missing file.
      await startServer({ answerKeysJSON: answerKeysJSON === null ? undefined : answerKeysJSON })
      const unavailable = await assess(expectedAnswers)
      assert.equal(unavailable.status, 503)
      assert.equal(unavailable.body.error, 'A avaliação deste curso está temporariamente indisponível. Tente novamente mais tarde.')
      const saved = await request(coursePath)
      assert.equal(saved.status, 200)
      assert.equal(saved.body.progress.assessment.attempts, 1)
      assert.equal(saved.body.progress.assessment.certificateId, null)
    }
    await stopServer()
    await startServer()
  })

  let certificate
  await t.test('allows a corrected attempt and creates the certificate only after all answers are correct', async () => {
    const result = await assess(expectedAnswers)
    assert.equal(result.status, 200)
    assert.equal(result.body.passed, true)
    assert.equal(result.body.score, 30)
    assert.equal(result.body.total, 30)
    assert.deepEqual(result.body.failedModules, [])
    assert.ok(Number.isSafeInteger(result.body.completedAt))
    assert.match(result.body.certificateId, /^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i)
    certificate = (await request(coursePath)).body.progress.assessment
    assert.equal(certificate.attempts, 2)
    assert.equal(certificate.certificateId, result.body.certificateId)
    assert.equal((await assess(expectedAnswers)).status, 409)
    assert.deepEqual((await request(coursePath)).body.progress.assessment, certificate)
  })

  await t.test('keeps other courses and accounts independent', async () => {
    for (const otherCourse of ['adm', 'rh']) {
      const result = await request('/api/courses/' + otherCourse)
      assert.equal(result.status, 200)
      assert.deepEqual(result.body.progress.completedModules, [])
      assert.equal(result.body.progress.assessment, null)
    }
    const second = await request('/api/auth/register', {
      method: 'POST',
      session: '',
      body: { name: 'Another test student', email: 'another-finance-student@example.test', password: 'Another disposable password 123!' },
    })
    assert.equal(second.status, 201)
    const secondCookie = second.headers.get('set-cookie').split(';')[0]
    const independent = await request(coursePath, { session: secondCookie })
    assert.deepEqual(independent.body.progress.completedModules, [])
    assert.equal(independent.body.progress.assessment, null)
    assert.equal((await request(coursePath + '/assessment', { method: 'POST', body: { answers: expectedAnswers }, session: secondCookie })).status, 409)
  })

  await t.test('preserves progress, certificate and the account session across server restarts', async () => {
    await stopServer()
    await startServer()
    const saved = await request(coursePath)
    assert.equal(saved.status, 200)
    assert.deepEqual(saved.body.progress.completedModules, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    assert.deepEqual(saved.body.progress.assessment, certificate)
  })

  await t.test('loads private answer configuration from a file without publishing it', async () => {
    const filename = path.join(directory, 'synthetic-private-keys.json')
    await writeFile(filename, JSON.stringify(syntheticAnswerKeys))
    await stopServer()
    await startServer({ answerKeysJSON: null, answerKeysPath: filename })
    const current = await request(coursePath)
    assert.equal(current.status, 200)
    assert.deepEqual(current.body.progress.assessment, certificate)
    assert.ok(current.body.course.questions.every(question => !Object.hasOwn(question, 'answer')))
    const registration = await request('/api/auth/register', {
      method: 'POST',
      session: '',
      body: { name: 'Private file test student', email: 'private-file-student@example.test', password: 'Disposable file password 123!' },
    })
    assert.equal(registration.status, 201)
    const privateFileCookie = registration.headers.get('set-cookie').split(';')[0]
    for (let number = 1; number <= 10; number++) {
      assert.equal((await request(coursePath + '/modules/' + number + '/complete', {
        method: 'POST', body: {}, session: privateFileCookie,
      })).status, 200)
    }
    const graded = await request(coursePath + '/assessment', {
      method: 'POST', body: { answers: expectedAnswers }, session: privateFileCookie,
    })
    assert.equal(graded.status, 200)
    assert.equal(graded.body.passed, true)
    assert.equal(graded.body.score, 30)
  })
})
