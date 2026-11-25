import { useRef, useState } from 'react'

const playbackRates = [0.75, 1, 1.25, 1.5, 2]
const playbackRateFormat = new Intl.NumberFormat('pt-BR')

export default function ModuleStudyMaterials({
  courseId,
  module,
  isCompleted,
  completing,
  completionDisabled,
  completionError,
  onComplete,
  onPdfOpen,
  allowDownload = false,
}) {
  const [method, setMethod] = useState(() => module.url ? 'pdf' : 'video')
  const [videoFailed, setVideoFailed] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const videoRef = useRef(null)
  const panelId = 'study-' + courseId + '-' + module.number
  const moduleLabel = String(module.number).padStart(2, '0')
  const canComplete = !isCompleted && !completing && !completionDisabled

  function selectMethod(nextMethod) {
    if (nextMethod !== 'video') videoRef.current?.pause()
    setMethod(nextMethod)
  }

  function changePlaybackRate(event) {
    const rate = Number(event.target.value)
    videoRef.current.defaultPlaybackRate = rate
    videoRef.current.playbackRate = rate
    setPlaybackRate(rate)
  }

  return (
    <div className="learning-study-materials">
      {module.videoPending && module.url && (
        <p className="learning-study-help">
          A videoaula deste módulo ainda não está disponível. Você pode estudar pelo PDF.
        </p>
      )}
      {module.videoUrl && module.url && (
        <fieldset className="learning-study-methods">
          <legend>Materiais do módulo {moduleLabel}</legend>
          <div className="learning-study-choices">
            <label className={method === 'pdf' ? 'is-selected' : undefined}>
              <input
                type="radio"
                name={panelId + '-method'}
                value="pdf"
                checked={method === 'pdf'}
                onChange={() => selectMethod('pdf')}
                aria-controls={panelId + '-pdf'}
              />
              PDF
            </label>
            <label className={method === 'video' ? 'is-selected' : undefined}>
              <input
                type="radio"
                name={panelId + '-method'}
                value="video"
                checked={method === 'video'}
                onChange={() => selectMethod('video')}
                aria-controls={panelId + '-video'}
              />
              Videoaula
            </label>
          </div>
        </fieldset>
      )}

      {module.url && (
        <div className="learning-study-panel" id={panelId + '-pdf'} hidden={method !== 'pdf'}>
          <div className="learning-material-links">
            <a
              className="learning-text-link"
              href={module.url}
              onClick={onPdfOpen ? () => onPdfOpen(module.number) : undefined}
              rel="noopener noreferrer"
              target="_blank"
              aria-label={
                (isCompleted ? 'Revisar o PDF do módulo ' : 'Abrir o PDF do módulo ')
                + moduleLabel + ': ' + module.title + ' (abre em nova aba)'
              }
            >
              {isCompleted ? 'Revisar material PDF' : 'Abrir material PDF'}
              <span className="learning-new-tab">(nova aba)</span>
            </a>
            {allowDownload && (
              <a
                className="learning-text-link"
                href={module.url}
                download
                aria-label={'Baixar PDF do módulo ' + moduleLabel + ': ' + module.title}
              >Baixar PDF</a>
            )}
          </div>
        </div>
      )}

      {module.videoUrl && (
        <div
          className="learning-study-panel learning-module-video"
          id={panelId + '-video'}
          hidden={method !== 'video'}
        >
          <video
            ref={videoRef}
            aria-label={'Videoaula do módulo ' + moduleLabel + ' — ' + module.title}
            controls
            muted={false}
            onRateChange={(event) => setPlaybackRate(event.currentTarget.playbackRate)}
            onError={() => setVideoFailed(true)}
            playsInline
            preload="none"
          >
            <source src={module.videoUrl} type="video/mp4" onError={() => setVideoFailed(true)} />
            Seu navegador não oferece suporte a este vídeo.
            {module.url ? ' Você pode estudar pelo PDF.' : ''}
          </video>
          {!videoFailed && (
            <label className="learning-playback-rate">
              Velocidade
              <select value={playbackRate} onChange={changePlaybackRate}>
                {!playbackRates.includes(playbackRate) && (
                  <option value={playbackRate}>{playbackRateFormat.format(playbackRate)}×</option>
                )}
                {playbackRates.map((rate) => (
                  <option key={rate} value={rate}>{playbackRateFormat.format(rate)}×</option>
                ))}
              </select>
            </label>
          )}
          {videoFailed && (
            <p className="learning-error" role="alert">
              Não foi possível reproduzir a videoaula.
              {module.url
                ? ' O material também está disponível em PDF.'
                : ' Tente reproduzir novamente mais tarde.'}
            </p>
          )}
        </div>
      )}

      {onComplete && (
        <div className="learning-study-completion">
          <button
            className={'learning-button' + (isCompleted ? ' is-completed' : '')}
            aria-disabled={!canComplete}
            tabIndex={isCompleted ? -1 : undefined}
            onClick={() => {
              if (canComplete) onComplete(module.number)
            }}
            type="button"
          >
            {isCompleted ? 'Concluído' : completing ? 'Salvando…' : 'Marcar como concluído'}
          </button>
          {completionError && <p className="learning-error" role="alert">{completionError}</p>}
        </div>
      )}
    </div>
  )
}
