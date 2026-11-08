import { useEffect, useRef, useState } from 'react'
import { getVideoStudyProgress } from './video-study-progress.js'

export default function ModuleStudyMaterials({
  courseId,
  module,
  isActive,
  isCompleted,
  isLastModule,
  initialMethod = 'pdf',
  completing,
  onComplete,
  onPdfOpen,
  allowDownload = false,
}) {
  const tracksCompletion = typeof onComplete === 'function'
  const [method, setMethod] = useState(() => (
    module.videoUrl && (!module.url || initialMethod === 'video') ? 'video' : 'pdf'
  ))
  const [pdfOpened, setPdfOpened] = useState(false)
  const [videoFailed, setVideoFailed] = useState(false)
  const [videoNotice, setVideoNotice] = useState('')
  const [videoCompletionFailed, setVideoCompletionFailed] = useState(false)
  const videoRef = useRef(null)
  const completionInFlightRef = useRef(false)
  const panelId = 'study-' + courseId + '-' + module.number
  const moduleLabel = String(module.number).padStart(2, '0')
  const nextStep = isLastModule ? 'liberar o questionário' : 'ir para o próximo módulo'

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.defaultMuted = false
    video.muted = false
    video.volume = 1
  }, [module.videoUrl])

  function selectMethod(nextMethod) {
    if (nextMethod !== 'video') videoRef.current?.pause()
    setMethod(nextMethod)
  }

  async function saveCompletion(studyMethod) {
    if (!tracksCompletion || completionInFlightRef.current || completing || !isActive || isCompleted) return false
    completionInFlightRef.current = true
    setVideoCompletionFailed(false)
    setVideoNotice('')
    let saved = false
    try {
      saved = await onComplete(module.number, studyMethod)
      return saved
    } catch {
      return false
    } finally {
      completionInFlightRef.current = saved
      if (!saved && studyMethod === 'video') {
        setVideoCompletionFailed(true)
        setVideoNotice('Não foi possível salvar a conclusão. Tente novamente sem precisar rever a videoaula.')
      }
    }
  }

  function finishVideo(event) {
    const video = event.currentTarget
    if (!tracksCompletion || !isActive || isCompleted || !video.ended) return
    if (!getVideoStudyProgress(video).canAdvance) {
      setVideoNotice('Assista à videoaula para concluir o módulo. Você pode rever os trechos que pulou'
        + (module.url ? ' ou estudar pelo PDF.' : '.'))
      return
    }
    void saveCompletion('video')
  }

  function completeStudy() {
    videoRef.current?.pause()
    void saveCompletion('pdf')
  }

  return (
    <div className="learning-study-materials">
      {module.videoUrl && module.url && (
        <fieldset className="learning-study-methods">
          <legend>{isCompleted ? 'Escolha como revisar este módulo' : 'Como você prefere estudar?'}</legend>
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
              Ler o PDF
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
              Assistir à videoaula <span className="learning-optional-label">opcional</span>
            </label>
          </div>
        </fieldset>
      )}

      {module.url && (
        <div className="learning-study-panel" id={panelId + '-pdf'} hidden={method !== 'pdf'}>
          <p className="learning-study-help">
            {tracksCompletion
              ? 'Estude o material em PDF no seu ritmo. Depois, volte aqui e confirme que estudou para avançar.'
              : 'Estude o material em PDF no seu ritmo. Você pode abrir em outra aba ou baixar uma cópia.'}
            {tracksCompletion && module.videoUrl ? ' Você não precisa assistir ao vídeo para concluir este módulo.' : ''}
          </p>
          <div className="learning-material-links">
            <a
              className="learning-text-link"
              href={module.url}
              onClick={() => {
                setPdfOpened(true)
                onPdfOpen?.(module.number)
              }}
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
          <h4 id={panelId + '-video-heading'}>Videoaula do módulo {moduleLabel}</h4>
          <p className="learning-study-help">
            {!tracksCompletion
              ? 'Assista à videoaula no seu ritmo. Você pode voltar ao conteúdo para revisar quando quiser.'
              : isCompleted
                ? 'Este módulo já foi concluído. Você pode rever a videoaula quando quiser.'
                : isLastModule
                  ? 'Ao terminar a videoaula, a conclusão será salva e o questionário final será aberto.'
                  : 'Ao terminar a videoaula, a conclusão será salva e você seguirá para o próximo módulo.'}
          </p>
          <video
            ref={videoRef}
            aria-labelledby={panelId + '-video-heading'}
            controls
            muted={false}
            onEnded={finishVideo}
            onError={() => setVideoFailed(true)}
            playsInline
            preload="none"
          >
            <source src={module.videoUrl} type="video/mp4" onError={() => setVideoFailed(true)} />
            Seu navegador não oferece suporte a este vídeo.
            {module.url ? ' Você pode estudar pelo PDF.' : ''}
          </video>
          {videoFailed && (
            <p className="learning-error" role="alert">
              Não foi possível reproduzir a videoaula.
              {module.url
                ? ' Você pode selecionar “Ler o PDF” e continuar seus estudos.'
                : ' Tente reproduzir novamente mais tarde.'}
            </p>
          )}
          {tracksCompletion && isActive && !isCompleted && (completing || videoNotice) && (
            <p className="learning-video-status" role="status">
              {completing ? 'Salvando a conclusão e abrindo a próxima etapa…' : videoNotice}
            </p>
          )}
          {tracksCompletion && isActive && !isCompleted && videoCompletionFailed && (
            <button
              className="learning-button"
              disabled={completing}
              onClick={() => { void saveCompletion('video') }}
              type="button"
            >Tentar salvar conclusão novamente</button>
          )}
        </div>
      )}

      {tracksCompletion && module.url && isActive && !isCompleted && method === 'pdf' && (
        <div className="learning-study-completion">
          <button
            className="learning-button"
            disabled={!pdfOpened || completing}
            onClick={completeStudy}
            type="button"
            aria-describedby={panelId + '-completion-help'}
          >
            {completing ? 'Salvando conclusão…' : 'Estudei pelo PDF — ' + nextStep}
          </button>
          <p className="learning-study-help" id={panelId + '-completion-help'}>
            {pdfOpened
              ? 'Confirme somente quando terminar de estudar o PDF.'
              : 'Abra o PDF para habilitar a confirmação de estudo.'}
          </p>
        </div>
      )}
    </div>
  )
}
