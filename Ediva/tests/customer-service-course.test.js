import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const appDirectory = fileURLToPath(new URL('../', import.meta.url))
const coursePath = '/api/courses/atendimento-ao-cliente'
const allModules = Array.from({ length: 10 }, (_, index) => index + 1)
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

test('Atendimento ao Cliente saves ten study modules without issuing an empty assessment certificate', { timeout: 30000 }, async t => {
  const directory = await mkdtemp(path.join(tmpdir(), 'ediva-customer-service-'))
  const origin = 'http://127.0.0.1:' + await unusedPort()
  let child, childExited, output = '', cookie = '', secondCookie = '', completedAt

  async function stopServer() {
    if (!child) return
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM')
    let timer
    try {
      await Promise.race([
        childExited,
        new Promise((resolve, reject) => {
          timer = setTimeout(() => reject(new Error('Disposable customer service server did not stop')), 5000)
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
    assert.ok(path.basename(resolved).startsWith('ediva-customer-service-'))
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
        PORT: new URL(origin).port,
        EDIVA_DB_PATH: path.join(directory, 'accounts.sqlite'),
        EDIVA_ALLOWED_ORIGINS: origin,
        // This course needs no key. Never read private production answer keys.
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
      if (child.exitCode !== null || child.signalCode !== null) throw new Error('Disposable customer service server failed: ' + output)
      try {
        if ((await fetch(origin + '/api/health', { signal: AbortSignal.timeout(500) })).ok) return
      } catch {}
      await delay(50)
    }
    throw new Error('Disposable customer service server did not become ready: ' + output)
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

  const complete = (number, options = {}) => request(coursePath + '/modules/' + number + '/complete', { method: 'POST', body: {}, ...options })
  const assess = options => request(coursePath + '/assessment', { method: 'POST', body: { answers: [] }, ...options })
  await startServer()

  await t.test('requires authentication and exposes ten numbered modules without an assessment', async () => {
    assert.equal((await request(coursePath)).status, 401)
    assert.equal((await complete(1)).status, 401)
    assert.equal((await assess()).status, 401)
    const registered = await request('/api/auth/register', {
      method: 'POST',
      body: { name: 'Customer service student', email: 'customer-service@example.test', password: 'Disposable customer service password 123!' },
    })
    assert.equal(registered.status, 201)
    cookie = registered.headers.get('set-cookie').split(';')[0]
    const result = await request(coursePath)
    assert.equal(result.status, 200)
    assert.equal(result.body.course.id, 'atendimento-ao-cliente')
    assert.equal(result.body.course.title, 'Atendimento ao Cliente')
    assert.equal(result.body.course.hasAssessment, false)
    assert.deepEqual(result.body.course.modules.map(module => module.number), allModules)
    assert.ok(result.body.course.modules.every(module => module.title.trim()))
    assert.deepEqual(result.body.course.questions, [])
    assert.deepEqual(result.body.progress.completedModules, [])
    assert.equal(result.body.progress.modulesCompletedAt, null)
    assert.equal(result.body.progress.assessment, null)
    assert.equal((await assess()).status, 404)
  })

  await t.test('rejects invalid bounds and foreign-origin writes', async () => {
    assert.equal((await complete(0)).status, 400)
    assert.equal((await complete(11)).status, 400)
    assert.equal((await complete(1, { requestOrigin: 'https://unrelated.example.test' })).status, 403)
    assert.deepEqual((await request(coursePath)).body.progress.completedModules, [])
  })

  await t.test('saves modules in any order, supports review and keeps other courses independent', async () => {
    const lastModuleFirst = await complete(10)
    assert.equal(lastModuleFirst.status, 200)
    assert.deepEqual(lastModuleFirst.body.completedModules, [10])
    assert.equal(lastModuleFirst.body.modulesCompletedAt, null)
    for (const number of allModules.slice(0, -1)) {
      const result = await complete(number)
      assert.equal(result.status, 200, 'module ' + number)
      assert.deepEqual(result.body.completedModules, [...allModules.slice(0, number), 10])
      if (number < 9) assert.equal(result.body.modulesCompletedAt, null)
      else completedAt = result.body.modulesCompletedAt
    }
    assert.ok(Number.isSafeInteger(completedAt) && completedAt > 0)
    for (const number of [1, 5, 10]) {
      const repeated = await complete(number)
      assert.equal(repeated.status, 200)
      assert.deepEqual(repeated.body.completedModules, allModules)
      assert.equal(repeated.body.modulesCompletedAt, completedAt)
    }
    for (const id of ['adm', 'rh', 'primeiro-emprego']) {
      const other = await request('/api/courses/' + id)
      assert.equal(other.status, 200)
      assert.deepEqual(other.body.progress.completedModules, [])
      assert.equal(other.body.progress.assessment, null)
    }
  })

  await t.test('finishing all ten modules cannot create an empty assessment or certificate', async () => {
    assert.equal((await assess()).status, 404)
    const saved = (await request(coursePath)).body.progress
    assert.deepEqual(saved.completedModules, allModules)
    assert.equal(saved.modulesCompletedAt, completedAt)
    assert.equal(saved.assessment, null)
    assert.equal(saved.certificateId, undefined)
  })

  await t.test('keeps another student independent', async () => {
    const registered = await request('/api/auth/register', {
      method: 'POST', session: '',
      body: { name: 'Another customer service student', email: 'another-customer-service@example.test', password: 'Another disposable customer service password 123!' },
    })
    assert.equal(registered.status, 201)
    secondCookie = registered.headers.get('set-cookie').split(';')[0]
    assert.deepEqual((await request(coursePath, { session: secondCookie })).body.progress.completedModules, [])
    assert.equal((await complete(2, { session: secondCookie })).status, 200)
    assert.deepEqual((await request(coursePath)).body.progress.completedModules, allModules)
  })

  await t.test('preserves both sessions and their distinct progress after a server restart', async () => {
    await stopServer()
    await startServer()
    const saved = await request(coursePath)
    assert.equal(saved.status, 200)
    assert.deepEqual(saved.body.progress.completedModules, allModules)
    assert.equal(saved.body.progress.modulesCompletedAt, completedAt)
    assert.equal(saved.body.progress.assessment, null)
    const second = await request(coursePath, { session: secondCookie })
    assert.equal(second.status, 200)
    assert.deepEqual(second.body.progress.completedModules, [2])
    assert.equal(second.body.progress.modulesCompletedAt, null)
    assert.equal(second.body.progress.assessment, null)
  })
})
