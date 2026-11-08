import assert from 'node:assert/strict'
import test from 'node:test'
import { getVideoStudyProgress } from '../src/video-study-progress.js'

function videoAt(duration, currentTime, intervals, seeking = false) {
  return {
    duration,
    currentTime,
    seeking,
    played: {
      length: intervals.length,
      start: (index) => intervals[index][0],
      end: (index) => intervals[index][1],
    },
  }
}

test('libera o avanço somente perto do final com o trecho assistido', () => {
  assert.deepEqual(getVideoStudyProgress(videoAt(120, 113, [[0, 113]])), {
    percent: 94,
    canAdvance: false,
  })
  assert.deepEqual(getVideoStudyProgress(videoAt(120, 114, [[0, 114]])), {
    percent: 95,
    canAdvance: true,
  })
})

test('em vídeos longos espera até os últimos dez segundos', () => {
  assert.equal(getVideoStudyProgress(videoAt(600, 570, [[0, 570]])).canAdvance, false)
  assert.equal(getVideoStudyProgress(videoAt(600, 590, [[0, 590]])).canAdvance, true)
})

test('pular diretamente para o final não conta como assistir ao vídeo', () => {
  assert.deepEqual(getVideoStudyProgress(videoAt(120, 120, [[0, 10], [119, 120]])), {
    percent: 9,
    canAdvance: false,
  })
})

test('não duplica trechos repetidos e preserva lacunas não assistidas', () => {
  assert.deepEqual(getVideoStudyProgress(videoAt(100, 100, [[40, 80], [0, 50], [0, 50], [90, 100]])), {
    percent: 90,
    canAdvance: false,
  })
  assert.deepEqual(getVideoStudyProgress(videoAt(100, 100, [[40, 80], [0, 50], [0, 50], [80, 100]])), {
    percent: 100,
    canAdvance: true,
  })
})

test('durações indisponíveis, infinitas ou não positivas não liberam o avanço', () => {
  for (const duration of [undefined, NaN, Infinity, 0, -1]) {
    assert.deepEqual(getVideoStudyProgress(videoAt(duration, 120, [[0, 120]])), {
      percent: 0,
      canAdvance: false,
    })
  }
  assert.deepEqual(getVideoStudyProgress(null), { percent: 0, canAdvance: false })
})

test('em vídeo curto exige 95% assistidos em vez de liberar ao iniciar', () => {
  assert.equal(getVideoStudyProgress(videoAt(8, 1, [[0, 1]])).canAdvance, false)
  assert.equal(getVideoStudyProgress(videoAt(8, 7.5, [[0, 7.5]])).canAdvance, false)
  assert.deepEqual(getVideoStudyProgress(videoAt(8, 7.6, [[0, 7.6]])), {
    percent: 95,
    canAdvance: true,
  })
})

test('vídeo assistido até o término tem progresso completo', () => {
  assert.deepEqual(getVideoStudyProgress(videoAt(100, 100, [[0, 100]])), {
    percent: 100,
    canAdvance: true,
  })
})

test('não libera durante uma busca nem com tempo atual inválido', () => {
  assert.equal(getVideoStudyProgress(videoAt(100, 100, [[0, 100]], true)).canAdvance, false)
  assert.deepEqual(getVideoStudyProgress(videoAt(100, NaN, [[0, 100]])), {
    percent: 100,
    canAdvance: false,
  })
})

test('limita intervalos ao vídeo e ignora intervalos inválidos', () => {
  assert.deepEqual(getVideoStudyProgress(videoAt(100, 100, [
    [-10, 20], [80, 130], [60, 50], [NaN, 80], [20, Infinity], [-10, -1],
  ])), {
    percent: 40,
    canAdvance: false,
  })
})

test('intervalos indisponíveis ou ausentes não quebram o acompanhamento', () => {
  const video = videoAt(100, 100, [[0, 100]])
  video.played.start = () => { throw new Error('Intervalo indisponível') }
  assert.deepEqual(getVideoStudyProgress(video), { percent: 0, canAdvance: false })
  assert.deepEqual(getVideoStudyProgress({ duration: 100, currentTime: 100 }), {
    percent: 0,
    canAdvance: false,
  })
})
