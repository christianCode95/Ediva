import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { politicaCidadaniaQuiz } from '../server/politics-quiz.js'

const appDirectory = fileURLToPath(new URL('../', import.meta.url))
const courseId = 'politica'
const coursePath = '/api/courses/' + courseId
// These deliberately synthetic answers do not contain the supplied private key.
const expectedAnswers = politicaCidadaniaQuiz.questions.map((question, index) => question.options[index % 4].key)
const syntheticAnswerKeys = { [courseId]: expectedAnswers }
const allModules = [1, 2, 3, 4, 5]
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

test('Politics and Citizenship publishes the supplied five groups of five questions without private answer fields', () => {
  assert.deepEqual(politicaCidadaniaQuiz.modules.map(module => module.number), allModules)
  assert.equal(politicaCidadaniaQuiz.questions.length, 25)
  assert.ok(politicaCidadaniaQuiz.questions.every(question => !Object.hasOwn(question, 'answer')))
  for (const module of politicaCidadaniaQuiz.modules) {
    const questions = politicaCidadaniaQuiz.questions.filter(question => question.moduleNumber === module.number)
    assert.equal(questions.length, 5)
    for (const question of questions) {
      assert.equal(question.moduleTitle, module.title)
      assert.ok(question.text.trim())
      assert.deepEqual(question.options.map(option => option.key), ['A', 'B', 'C', 'D'])
      assert.ok(question.options.every(option => option.text.trim()))
    }
  }
})

test('Politics and Citizenship unlocks its assessment after five modules, supports review and persists its certificate', { timeout: 30000 }, async t => {
  const directory = await mkdtemp(path.join(tmpdir(), 'ediva-politics-assessment-'))
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
          timer = setTimeout(() => reject(new Error('Disposable Politics and Citizenship server did not stop')), 5000)
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
    assert.ok(path.basename(resolved).startsWith('ediva-politics-assessment-'))
    await rm(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  })

  async function startServer(answerKeysJSON = JSON.stringify(syntheticAnswerKeys)) {
    output = ''
    child = spawn(process.execPath, ['server/index.js'], {
      cwd: appDirectory,
      env: {
        ...process.env,
        NODE_ENV: 'development',
        HOST: '127.0.0.1',
        PORT: String(port),
        EDIVA_DB_PATH: path.join(directory, 'accounts.sqlite'),
        EDIVA_ALLOWED_ORIGINS: origin,
        // Always override both private inputs, including missing-key cases.
        EDIVA_COURSE_ANSWER_KEYS_JSON: answerKeysJSON,
        EDIVA_COURSE_ANSWER_KEYS_PATH: path.join(directory, 'missing-keys.json'),
      },
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
      if (child.exitCode !== null || child.signalCode !== null) throw new Error('Disposable Politics and Citizenship server failed: ' + output)
      try {
        if ((await fetch(origin + '/api/health', { signal: AbortSignal.timeout(500) })).ok) return
      } catch {}
      await delay(50)
    }
    throw new Error('Disposable Politics and Citizenship server did not become ready: ' + output)
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

  await t.test('requires authentication and returns only public questions', async () => {
    assert.equal((await request(coursePath)).status, 401)
    assert.equal((await complete(1)).status, 401)
    assert.equal((await assess(expectedAnswers)).status, 401)
    const registration = await request('/api/auth/register', {
      method: 'POST',
      body: { name: 'Politics and Citizenship test student', email: 'politics-student@example.test', password: 'Disposable Politics and Citizenship password 123!' },
    })
    assert.equal(registration.status, 201)
    cookie = registration.headers.get('set-cookie').split(';')[0]
    const response = await request(coursePath)
    assert.equal(response.status, 200)
    assert.equal(response.body.course.id, courseId)
    assert.equal(response.body.course.hasAssessment, true)
    assert.equal(response.body.course.questions.length, 25)
    assert.deepEqual(response.body.course.modules.map(module => module.number), allModules)
    assert.deepEqual(response.body.progress.completedModules, [])
    assert.equal(response.body.progress.assessment, null)
    for (const question of response.body.course.questions) {
      assert.deepEqual(Object.keys(question).sort(), ['category', 'moduleNumber', 'moduleTitle', 'options', 'text'])
      for (const option of question.options) assert.deepEqual(Object.keys(option).sort(), ['key', 'text'])
    }
  })

  await t.test('saves modules in any order and opens the assessment after all five are complete', async () => {
    assert.equal((await assess(expectedAnswers)).status, 409)
    assert.equal((await complete(0)).status, 400)
    assert.equal((await complete(6)).status, 400)
    const lastModuleFirst = await complete(5)
    assert.equal(lastModuleFirst.status, 200)
    assert.deepEqual(lastModuleFirst.body.completedModules, [5])
    assert.equal(lastModuleFirst.body.modulesCompletedAt, null)
    for (let number = 1; number <= 3; number++) {
      const response = await complete(number)
      assert.equal(response.status, 200)
      assert.deepEqual(response.body.completedModules, [...allModules.slice(0, number), 5])
      assert.equal(response.body.modulesCompletedAt, null)
    }
    assert.equal((await assess(expectedAnswers)).status, 409, 'The assessment stays blocked while module 4 is missing')
    assert.deepEqual((await complete(1)).body.completedModules, [1, 2, 3, 5])
    const finalModule = await complete(4)
    assert.equal(finalModule.status, 200)
    assert.deepEqual(finalModule.body.completedModules, allModules)
    assert.ok(Number.isSafeInteger(finalModule.body.modulesCompletedAt))
  })

  await t.test('rejects invalid submissions and reports the assessment topics to review', async () => {
    assert.equal((await assess([])).status, 400)
    assert.equal((await assess(expectedAnswers.slice(1))).status, 400)
    const invalid = [...expectedAnswers]
    invalid[0] = 'X'
    assert.equal((await assess(invalid)).status, 400)
    assert.equal((await request(coursePath)).body.progress.assessment, null)
    const mistaken = [...expectedAnswers]
    mistaken[7] = 'A'
    mistaken[18] = 'D'
    const response = await assess(mistaken)
    assert.equal(response.status, 200)
    assert.deepEqual(response.body, {
      passed: false, score: 23, total: 25, failedModules: [2, 4], completedAt: null, certificateId: null,
    })
    assert.deepEqual((await request(coursePath)).body.progress.assessment, {
      attempts: 1, score: 23, failedModules: [2, 4], completedAt: null, certificateId: null,
    })
  })

  await t.test('does not grade or change attempts when private keys are missing or malformed', async () => {
    for (const keyJSON of ['{}', 'not-json', '[]', JSON.stringify({ [courseId]: [] }), JSON.stringify({ [courseId]: expectedAnswers.map(() => 'X') })]) {
      await stopServer()
      await startServer(keyJSON)
      assert.equal((await assess(expectedAnswers)).status, 503)
      const saved = (await request(coursePath)).body.progress
      assert.deepEqual(saved.completedModules, allModules)
      assert.deepEqual(saved.assessment, {
        attempts: 1, score: 23, failedModules: [2, 4], completedAt: null, certificateId: null,
      })
    }
    await stopServer()
    await startServer()
  })

  let certificate
  await t.test('allows a corrected attempt and issues one certificate only after all answers are correct', async () => {
    const response = await assess(expectedAnswers)
    assert.equal(response.status, 200)
    assert.equal(response.body.passed, true)
    assert.equal(response.body.score, 25)
    assert.equal(response.body.total, 25)
    assert.deepEqual(response.body.failedModules, [])
    assert.ok(Number.isSafeInteger(response.body.completedAt))
    assert.match(response.body.certificateId, /^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i)
    certificate = (await request(coursePath)).body.progress.assessment
    assert.equal(certificate.attempts, 2)
    assert.equal(certificate.certificateId, response.body.certificateId)
    assert.equal((await assess(expectedAnswers)).status, 409)
    assert.deepEqual((await request(coursePath)).body.progress.assessment, certificate)
  })

  await t.test('keeps courses and student accounts independent', async () => {
    for (const id of ['adm', 'rh', 'auxiliar-financeiro', 'inteligencia-artificial', 'aprender-a-aprender', 'psicologia-no-trabalho', 'primeiro-emprego', 'marketing-digital', 'atendimento-ao-cliente']) {
      const response = await request('/api/courses/' + id)
      assert.equal(response.status, 200)
      assert.deepEqual(response.body.progress.completedModules, [])
      assert.equal(response.body.progress.assessment, null)
    }
    const registration = await request('/api/auth/register', {
      method: 'POST', session: '',
      body: { name: 'Another Politics and Citizenship student', email: 'another-politics-student@example.test', password: 'Another disposable Politics and Citizenship password 123!' },
    })
    assert.equal(registration.status, 201)
    const secondCookie = registration.headers.get('set-cookie').split(';')[0]
    const second = await request(coursePath, { session: secondCookie })
    assert.deepEqual(second.body.progress.completedModules, [])
    assert.equal(second.body.progress.assessment, null)
    assert.equal((await request(coursePath + '/assessment', { method: 'POST', body: { answers: expectedAnswers }, session: secondCookie })).status, 409)
    assert.deepEqual((await request(coursePath)).body.progress.assessment, certificate)
  })

  await t.test('preserves progress, certificate and the student session after a server restart', async () => {
    await stopServer()
    await startServer()
    const saved = await request(coursePath)
    assert.equal(saved.status, 200)
    assert.deepEqual(saved.body.progress.completedModules, allModules)
    assert.ok(Number.isSafeInteger(saved.body.progress.modulesCompletedAt))
    assert.deepEqual(saved.body.progress.assessment, certificate)
  })
})
