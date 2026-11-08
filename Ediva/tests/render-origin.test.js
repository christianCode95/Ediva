import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const appDirectory = fileURLToPath(new URL('../', import.meta.url))
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

async function freePort() {
  const probe = createServer()
  await new Promise((resolve, reject) => {
    probe.once('error', reject)
    probe.listen(0, '127.0.0.1', resolve)
  })
  const port = probe.address().port
  await new Promise(resolve => probe.close(resolve))
  return port
}

async function startProductionServer(t, { explicitOrigin = '', renderURL = '' } = {}) {
  const directory = await mkdtemp(path.join(tmpdir(), 'ediva-render-origin-'))
  const port = await freePort()
  const origin = 'http://127.0.0.1:' + port
  let output = ''
  const child = spawn(process.execPath, ['server/index.js'], {
    cwd: appDirectory,
    env: {
      ...process.env,
      NODE_ENV: 'production', HOST: '127.0.0.1', PORT: String(port),
      EDIVA_DB_PATH: path.join(directory, 'accounts.sqlite'),
      EDIVA_ALLOWED_ORIGINS: explicitOrigin,
      RENDER_EXTERNAL_URL: renderURL,
    },
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const exited = new Promise((resolve, reject) => {
    child.once('exit', resolve)
    child.once('error', reject)
  })
  child.stdout.on('data', chunk => { output = (output + chunk).slice(-3000) })
  child.stderr.on('data', chunk => { output = (output + chunk).slice(-3000) })
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM')
    let timeout
    try {
      await Promise.race([exited, new Promise((resolve, reject) => {
        timeout = setTimeout(() => reject(new Error('Test server did not stop')), 5000)
      })])
    } finally {
      clearTimeout(timeout)
      const resolved = path.resolve(directory)
      assert.equal(path.dirname(resolved), path.resolve(tmpdir()))
      assert.ok(path.basename(resolved).startsWith('ediva-render-origin-'))
      await rm(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
    }
  })
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null || child.signalCode !== null) {
      return { child, origin, failedOutput: output }
    }
    try {
      const response = await fetch(origin + '/api/health', { signal: AbortSignal.timeout(500) })
      if (response.ok) return { child, origin }
    } catch {}
    await delay(50)
  }
  throw new Error('Test server did not become ready: ' + output)
}

async function registrationStatus(server, requestOrigin) {
  const response = await fetch(server.origin + '/api/auth/register', {
    method: 'POST',
    headers: { Origin: requestOrigin, 'Content-Type': 'application/json' },
    body: '{}',
    signal: AbortSignal.timeout(5000),
  })
  await response.arrayBuffer()
  return response.status
}

test('production uses the Render service origin without enabling cross-origin account requests', { timeout: 15000 }, async t => {
  const server = await startProductionServer(t, { renderURL: 'https://students.onrender.com' })
  assert.equal(server.failedOutput, undefined)
  assert.equal(await registrationStatus(server, 'https://students.onrender.com'), 400, 'Allowed origin reaches field validation')
  assert.equal(await registrationStatus(server, 'https://christiancode95.github.io'), 403)
})

test('an explicit production allowlist takes priority over the Render URL', { timeout: 15000 }, async t => {
  const server = await startProductionServer(t, {
    explicitOrigin: 'https://students.example.test', renderURL: 'https://students.onrender.com',
  })
  assert.equal(server.failedOutput, undefined)
  assert.equal(await registrationStatus(server, 'https://students.example.test'), 400)
  assert.equal(await registrationStatus(server, 'https://students.onrender.com'), 403)
})

test('production still refuses to start without any allowed origin', { timeout: 15000 }, async t => {
  const server = await startProductionServer(t)
  assert.equal(server.child.exitCode, 1)
  assert.match(server.failedOutput, /Configure EDIVA_ALLOWED_ORIGINS/)
})
