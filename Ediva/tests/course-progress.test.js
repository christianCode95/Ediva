import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const appDirectory = fileURLToPath(new URL('../', import.meta.url))
const courseIds = ['primeiro-emprego', 'politica']
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

test('courses without an assessment save study progress without issuing certificates', { timeout: 45000 }, async t => {
  const directory = await mkdtemp(path.join(tmpdir(), 'ediva-course-progress-'))
  const port = await unusedPort()
  const origin = 'http://127.0.0.1:' + port
  let child, childExited, output = '', cookie = '', secondCookie = ''
  const completionDates = new Map()

  async function stopServer() {
    if (!child) return
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM')
    let timer
    try {
      await Promise.race([
        childExited,
        new Promise((resolve, reject) => {
          timer = setTimeout(() => reject(new Error('Disposable progress server did not stop')), 5000)
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
    assert.ok(path.basename(resolved).startsWith('ediva-course-progress-'))
    await rm(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  })

  async function startServer() {
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
        // These courses require no answer keys. Never read real private keys in tests.
        EDIVA_COURSE_ANSWER_KEYS_JSON: '{}',
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
      if (child.exitCode !== null || child.signalCode !== null) throw new Error('Disposable progress server failed: ' + output)
      try {
        const response = await fetch(origin + '/api/health', { signal: AbortSignal.timeout(500) })
        if (response.ok) return
      } catch {}
      await delay(50)
    }
    throw new Error('Disposable progress server did not become ready: ' + output)
  }

  async function request(route, { method = 'GET', body, session = cookie, requestOrigin = origin } = {}) {
    const response = await fetch(origin + route, {
      method,
      headers: { Origin: requestOrigin, 'Content-Type': 'application/json', ...(session ? { Cookie: session } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(5000),
    })
    return { status: response.status, body: await response.json(), headers: response.headers }
  }

  const coursePath = id => '/api/courses/' + id
  const complete = (id, number, options = {}) => request(coursePath(id) + '/modules/' + number + '/complete', { method: 'POST', body: {}, ...options })
  const assess = id => request(coursePath(id) + '/assessment', { method: 'POST', body: { answers: [] } })
  await startServer()

  await t.test('requires a student session for every newly tracked course', async () => {
    for (const id of courseIds) {
      assert.equal((await request(coursePath(id))).status, 401, id)
      assert.equal((await complete(id, 1)).status, 401, id)
      assert.equal((await assess(id)).status, 401, id)
    }
    const registration = await request('/api/auth/register', {
      method: 'POST',
      body: { name: 'Course progress student', email: 'progress-student@example.test', password: 'Disposable progress password 123!' },
    })
    assert.equal(registration.status, 201)
    cookie = registration.headers.get('set-cookie').split(';')[0]
  })

  await t.test('publishes five numbered modules with no assessment or certificate', async () => {
    for (const id of courseIds) {
      const result = await request(coursePath(id))
      assert.equal(result.status, 200, id)
      assert.equal(result.body.course.id, id)
      assert.ok(result.body.course.title.trim())
      assert.equal(result.body.course.hasAssessment, false)
      assert.deepEqual(result.body.course.modules.map(module => module.number), allModules)
      assert.ok(result.body.course.modules.every(module => module.title.trim()))
      assert.deepEqual(result.body.course.questions, [])
      assert.deepEqual(result.body.progress.completedModules, [])
      assert.equal(result.body.progress.modulesCompletedAt, null)
      assert.equal(result.body.progress.assessment, null)
      assert.equal((await assess(id)).status, 404, 'An empty question list must never create an assessment')
    }
    for (const unknown of ['constructor', 'unknown-course', 'informatica-basica']) {
      assert.equal((await request(coursePath(unknown))).status, 404)
    }
  })

  await t.test('rejects invalid bounds and foreign-origin writes without saving progress', async () => {
    for (const id of courseIds) {
      assert.equal((await complete(id, 0)).status, 400, id)
      assert.equal((await complete(id, 6)).status, 400, id)
      assert.equal((await complete(id, 1, { requestOrigin: 'https://unrelated.example.test' })).status, 403, id)
      assert.deepEqual((await request(coursePath(id))).body.progress.completedModules, [])
    }
  })

  await t.test('saves modules in any order and keeps progress separate by course', async () => {
    for (const [courseIndex, id] of courseIds.entries()) {
      const lastModuleFirst = await complete(id, 5)
      assert.equal(lastModuleFirst.status, 200)
      assert.deepEqual(lastModuleFirst.body.completedModules, [5])
      assert.equal(lastModuleFirst.body.modulesCompletedAt, null)
      assert.deepEqual((await complete(id, 5)).body.completedModules, [5], 'Repeated completion must not duplicate progress')
      for (const nextCourse of courseIds.slice(courseIndex + 1)) {
        assert.deepEqual((await request(coursePath(nextCourse))).body.progress.completedModules, [], 'Courses keep separate progress')
      }
      for (let number = 1; number < 5; number++) {
        const result = await complete(id, number)
        assert.equal(result.status, 200, id + ' module ' + number)
        assert.deepEqual(result.body.completedModules, [...allModules.slice(0, number), 5])
        if (number < 4) assert.equal(result.body.modulesCompletedAt, null)
        else assert.ok(Number.isSafeInteger(result.body.modulesCompletedAt) && result.body.modulesCompletedAt > 0)
      }
      const saved = await request(coursePath(id))
      assert.deepEqual(saved.body.progress.completedModules, allModules)
      assert.ok(Number.isSafeInteger(saved.body.progress.modulesCompletedAt) && saved.body.progress.modulesCompletedAt > 0)
      assert.equal(saved.body.progress.assessment, null)
      completionDates.set(id, saved.body.progress.modulesCompletedAt)
      const repeated = await complete(id, 5)
      assert.equal(repeated.status, 200)
      assert.deepEqual(repeated.body.completedModules, allModules)
      assert.equal((await request(coursePath(id))).body.progress.modulesCompletedAt, completionDates.get(id))
    }
  })

  await t.test('finishing a course without questions never creates an assessment attempt or a certificate', async () => {
    for (const id of courseIds) {
      assert.equal((await assess(id)).status, 404, id)
      const saved = (await request(coursePath(id))).body.progress
      assert.deepEqual(saved.completedModules, allModules)
      assert.equal(saved.assessment, null)
      assert.equal(saved.certificateId, undefined)
    }
    for (const [id, questionCount] of Object.entries({ adm: 90, rh: 30, 'auxiliar-financeiro': 30, 'inteligencia-artificial': 25, 'aprender-a-aprender': 15, 'psicologia-no-trabalho': 15, 'marketing-digital': 50 })) {
      const assessed = await request(coursePath(id))
      assert.equal(assessed.status, 200)
      assert.equal(assessed.body.course.hasAssessment, true)
      assert.equal(assessed.body.course.questions.length, questionCount)
      assert.deepEqual(assessed.body.progress.completedModules, [])
      assert.equal(assessed.body.progress.assessment, null)
    }
  })

  await t.test('keeps another student and their progress independent', async () => {
    const registration = await request('/api/auth/register', {
      method: 'POST', session: '',
      body: { name: 'Another progress student', email: 'another-progress-student@example.test', password: 'Another disposable progress password 123!' },
    })
    assert.equal(registration.status, 201)
    secondCookie = registration.headers.get('set-cookie').split(';')[0]
    for (const id of courseIds) {
      const second = await request(coursePath(id), { session: secondCookie })
      assert.deepEqual(second.body.progress.completedModules, [])
      assert.equal(second.body.progress.assessment, null)
    }
    assert.equal((await complete(courseIds[0], 2, { session: secondCookie })).status, 200)
    for (const id of courseIds) {
      assert.deepEqual((await request(coursePath(id))).body.progress.completedModules, allModules)
    }
  })

  await t.test('retains both student sessions and each course progress after restarting the server', async () => {
    await stopServer()
    await startServer()
    for (const id of courseIds) {
      const first = await request(coursePath(id))
      assert.equal(first.status, 200)
      assert.deepEqual(first.body.progress.completedModules, allModules)
      assert.equal(first.body.progress.modulesCompletedAt, completionDates.get(id))
      assert.equal(first.body.progress.assessment, null)
      const second = await request(coursePath(id), { session: secondCookie })
      assert.equal(second.status, 200)
      assert.deepEqual(second.body.progress.completedModules, id === courseIds[0] ? [2] : [])
      assert.equal(second.body.progress.assessment, null)
    }
  })
})
