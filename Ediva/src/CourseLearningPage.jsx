import { useEffect, useMemo, useState } from 'react'
import CourseModuleCard from './CourseModuleCard.jsx'
import CourseStudyLayout from './CourseStudyLayout.jsx'
import ModuleStudyMaterials from './ModuleStudyMaterials.jsx'
import { appLink } from './site-links.js'
import './CourseLearningPage.css'

function formatDate(timestamp) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(timestamp))
}

export default function CourseLearningPage({ course }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [authRequired, setAuthRequired] = useState(false)
  const [completionError, setCompletionError] = useState(null)
  const [completionMessage, setCompletionMessage] = useState('')
  const [focusTarget, setFocusTarget] = useState('')
  const [answers, setAnswers] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [completingModule, setCompletingModule] = useState(null)
  const [result, setResult] = useState(null)

  useEffect(() => {
    let active = true
    fetch('/api/courses/' + course.id)
      .then(async (response) => {
        const responseData = await response.json()
        if (!response.ok) {
          if (response.status === 401 && active) setAuthRequired(true)
          throw new Error(responseData.error || 'Não foi possível carregar o curso.')
        }
        if (active) {
          setData(responseData)
          setAnswers(Array(responseData.course.questions?.length || 0).fill(''))
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Não foi possível conectar ao servidor.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [course.id])

  useEffect(() => {
    if (!focusTarget) return undefined
    const animationFrame = window.requestAnimationFrame(() => {
      const target = document.getElementById(focusTarget)
      if (!target) return
      target.focus()
      target.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'center',
      })
      setFocusTarget('')
    })

    return () => window.cancelAnimationFrame(animationFrame)
  }, [focusTarget, data])

  const completedModules = data?.progress.completedModules || []
  const modules = course.modules
  const hasAssessment = Boolean(data?.course.hasAssessment ?? course.hasAssessment)
    && Boolean(data?.course.questions?.length)
  const allModulesCompleted = modules.length > 0
    && modules.every((module) => completedModules.includes(module.number))
  const moduleGroups = useMemo(() => {
    if (!data) return []
    return (data.course.questions || []).reduce((groups, question, index) => {
      let currentGroup = groups.at(-1)
      if (!currentGroup || currentGroup.number !== question.moduleNumber) {
        currentGroup = {
          number: question.moduleNumber,
          title: question.moduleTitle,
          questions: [],
        }
        groups.push(currentGroup)
      }
      currentGroup.questions.push({ ...question, index })
      return groups
    }, [])
  }, [data])

  async function completeModule(moduleNumber) {
    if (completingModule !== null || completedModules.includes(moduleNumber)) return
    setCompletingModule(moduleNumber)
    setCompletionError(null)
    setCompletionMessage('')
    try {
      const response = await fetch('/api/courses/' + course.id + '/modules/' + moduleNumber + '/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const responseData = await response.json()
      if (!response.ok) {
        throw new Error(responseData.error || 'Não foi possível registrar a conclusão do módulo.')
      }

      setData((current) => ({
        ...current,
        progress: {
          ...current.progress,
          completedModules: responseData.completedModules,
          modulesCompletedAt: responseData.modulesCompletedAt,
        },
      }))
      const message = 'Módulo ' + String(moduleNumber).padStart(2, '0') + ' concluído.'
      setCompletionMessage(responseData.modulesCompletedAt && hasAssessment
        ? message + ' O questionário final está disponível.'
        : message)
    } catch (requestError) {
      setCompletionError({
        moduleNumber,
        message: requestError.message || 'Não foi possível salvar. Tente novamente.',
      })
    } finally {
      setCompletingModule(null)
    }
  }

  async function submitAssessment(event) {
    event.preventDefault()
    const unansweredIndex = answers.findIndex((answer) => !answer)
    if (unansweredIndex !== -1) {
      setError('Responda todas as questões antes de enviar o questionário.')
      window.requestAnimationFrame(() => {
        document.getElementById('question-' + unansweredIndex + '-A')?.focus()
      })
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const response = await fetch('/api/courses/' + course.id + '/assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      })
      const responseData = await response.json()
      if (!response.ok) throw new Error(responseData.error || 'Não foi possível corrigir o questionário.')
      setResult(responseData)
      setData((current) => ({
        ...current,
        progress: {
          ...current.progress,
          assessment: {
            attempts: (current.progress.assessment?.attempts || 0) + 1,
            score: responseData.score,
            failedModules: responseData.failedModules,
            completedAt: responseData.completedAt,
            certificateId: responseData.certificateId,
          },
        },
      }))
      setFocusTarget(responseData.passed ? 'certificate-heading' : 'assessment-result')
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível conectar ao servidor.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className="learning-page">
        <p className="learning-status" role="status">Carregando seu curso…</p>
      </main>
    )
  }

  if (!data) {
    return (
      <main className="learning-page">
        <section className="learning-message">
          <a className="learning-brand" href={appLink('/')}>EDIVA</a>
          <h1>{authRequired ? 'Entre para acompanhar seu curso' : 'Não foi possível abrir o curso'}</h1>
          <p role="alert">{error}</p>
          {authRequired && (
            <a className="learning-button" href={appLink('/entrar?redirect=' + encodeURIComponent('/estudar/' + course.id))}>
              Entrar na conta
            </a>
          )}
          <a className="learning-back-link" href={appLink('/cursos')}>Voltar aos cursos</a>
        </section>
      </main>
    )
  }

  const assessment = data.progress.assessment
  const reviewSources = course.assessmentReviewSources
  const failedGroups = assessment?.failedModules ?? []
  const topicsToReview = failedGroups.length
    ? moduleGroups.filter((group) => failedGroups.includes(group.number))
    : moduleGroups
  const certificateAvailable = hasAssessment && Boolean(assessment?.completedAt && assessment?.certificateId)
  const progressPercent = modules.length ? Math.round((completedModules.length / modules.length) * 100) : 0

  return (
    <CourseStudyLayout
      course={course}
      intro="Escolha por onde começar e estude no seu ritmo. Marque os módulos como concluídos para salvar seu progresso."
    >
        <section className="learning-progress" aria-labelledby="progress-heading">
          <div className="learning-progress-heading">
            <strong id="progress-heading">Seu progresso</strong>
            <span>{completedModules.length} de {modules.length} módulos concluídos</span>
          </div>
          <div
            className="learning-progress-track"
            role="progressbar"
            aria-label="Progresso dos módulos do curso"
            aria-valuemin="0"
            aria-valuemax={modules.length}
            aria-valuenow={completedModules.length}
            aria-valuetext={completedModules.length + ' de ' + modules.length + ' módulos concluídos'}
          >
            <span aria-hidden="true" style={{ width: progressPercent + '%' }} />
          </div>
          {hasAssessment && (
            allModulesCompleted ? (
              <a className="learning-text-link learning-assessment-link" href={certificateAvailable ? '#certificate-heading' : '#assessment-heading'}>
                {certificateAvailable ? 'Ver certificado' : 'Ir para o questionário final'}
              </a>
            ) : (
              <p className="learning-section-help learning-assessment-link">Marque todos os módulos como concluídos para abrir o questionário final.</p>
            )
          )}
        </section>

        {error && <p className="learning-error" role="alert">{error}</p>}
        <p className="sr-only" role="status">{completionMessage}</p>

        <section className="learning-modules" aria-labelledby="learning-modules-heading">
          <h2 id="learning-modules-heading">Módulos do curso</h2>
          <nav className="learning-module-shortcuts" aria-label="Ir para um módulo">
            {modules.map((module) => (
              <a
                key={module.number}
                href={'#module-heading-' + module.number}
                aria-label={'Módulo ' + module.number + ' — ' + module.title}
              >
                {String(module.number).padStart(2, '0')}
              </a>
            ))}
          </nav>
          <ol aria-label="Módulos">
            {modules.map((module) => {
              const isCompleted = completedModules.includes(module.number)

              return (
                <CourseModuleCard
                  key={module.number}
                  module={module}
                  isCompleted={isCompleted}
                >
                  <ModuleStudyMaterials
                    courseId={course.id}
                    module={module}
                    isCompleted={isCompleted}
                    completing={completingModule === module.number}
                    completionDisabled={completingModule !== null}
                    completionError={completionError?.moduleNumber === module.number ? completionError.message : undefined}
                    onComplete={completeModule}
                    allowDownload={!hasAssessment}
                  />
                </CourseModuleCard>
              )
            })}
          </ol>
        </section>

        {allModulesCompleted && !hasAssessment && (
          <section className="learning-assessment" aria-labelledby="modules-completion-heading">
            <p className="learning-eyebrow">ESTUDOS CONCLUÍDOS</p>
            <h2 id="modules-completion-heading" tabIndex="-1">Todos os módulos concluídos</h2>
            <p>Seu progresso está salvo na conta. Você pode voltar aos módulos para estudar e revisar quando quiser.</p>
            <a className="learning-back-link" href={appLink('/conta')}>Voltar para minha conta</a>
          </section>
        )}

        {allModulesCompleted && hasAssessment && !certificateAvailable && (
          <section className="learning-assessment" aria-labelledby="assessment-heading">
            <p className="learning-eyebrow">ETAPA FINAL</p>
            <h2 id="assessment-heading" tabIndex="-1">Questionário final</h2>
            <p className="learning-assessment-intro">
              São {data.course.questions.length} questões de múltipla escolha. O curso é concluído quando você
              acerta todas.
              {reviewSources
                ? ' Se errar, indicaremos quais temas revisar antes de uma nova tentativa.'
                : ' Se errar, indicaremos quais módulos revisar antes de uma nova tentativa.'}
              {assessment?.attempts ? ' Tentativas anteriores: ' + assessment.attempts + '.' : ''}
            </p>

            {reviewSources && (
              <details className="learning-review-list learning-topic-review" open={failedGroups.length > 0}>
                <summary>{failedGroups.length ? 'Temas para revisar' : 'Leituras para a avaliação'}</summary>
                <ul>
                  {topicsToReview.map((group) => (
                    <li key={group.number}>
                      <strong>{group.title}</strong>
                      <ul>
                        {reviewSources[group.number]?.map(({ label, url, moduleNumber, page }) => {
                          const pdf = modules.find((module) => module.number === moduleNumber)?.url
                          const href = pdf ? pdf + '#page=' + page : url
                          if (!href) return null
                          return (
                            <li key={label}>
                              <a href={href} target="_blank" rel="noopener noreferrer">
                                {label} <span className="learning-new-tab">(nova aba)</span>
                              </a>
                            </li>
                          )
                        })}
                      </ul>
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {!reviewSources && failedGroups.length > 0 && (
              <div className="learning-review-list" aria-labelledby="review-heading">
                <h3 id="review-heading">Módulos para revisar</h3>
                <p>Revise o conteúdo indicado antes de tentar o questionário novamente.</p>
                <ul>
                  {failedGroups.map((moduleNumber) => {
                    const module = modules.find((item) => item.number === moduleNumber)
                    if (!module) return null
                    return (
                      <li key={moduleNumber}>
                        <a
                          href={'#module-heading-' + moduleNumber}
                          onClick={(event) => {
                            event.preventDefault()
                            setFocusTarget('module-heading-' + moduleNumber)
                          }}
                        >
                          Revisar o módulo {String(moduleNumber).padStart(2, '0')}: {module.title}
                          <span className="learning-new-tab">{module.videoUrl ? '(PDF ou videoaula)' : '(PDF)'}</span>
                        </a>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            {result && !result.passed && (
              <div className="learning-result" id="assessment-result" role="status" tabIndex="-1">
                <p>
                  Você acertou {result.score} de {result.total} questões. Revise os {reviewSources ? 'temas' : 'módulos'} indicados e tente novamente.
                </p>
                <a href="#assessment-form">Ir para uma nova tentativa</a>
              </div>
            )}

            <form id="assessment-form" onSubmit={submitAssessment}>
              {moduleGroups.map((group) => (
                <fieldset className="learning-question-group" key={group.number}>
                  <legend>{reviewSources ? group.title : `Módulo ${String(group.number).padStart(2, '0')} — ${group.title}`}</legend>
                  {group.questions.map((question, questionIndex) => (
                    <fieldset className="learning-question" key={group.number + '-' + questionIndex}>
                      <legend>{questionIndex + 1}. {question.text}</legend>
                      {question.options.map((option) => (
                        <label key={option.key} htmlFor={'question-' + question.index + '-' + option.key}>
                          <input
                            id={'question-' + question.index + '-' + option.key}
                            checked={answers[question.index] === option.key}
                            name={'question-' + question.index}
                            onChange={() => setAnswers((current) => current.map((answer, index) => (
                              index === question.index ? option.key : answer
                            )))}
                            type="radio"
                            value={option.key}
                            aria-required="true"
                          />
                          <span><strong>{option.key})</strong> {option.text}</span>
                        </label>
                      ))}
                    </fieldset>
                  ))}
                </fieldset>
              ))}
              <button className="learning-button learning-submit" disabled={submitting} type="submit">
                {submitting ? 'Corrigindo respostas…' : 'Enviar respostas'}
              </button>
            </form>
          </section>
        )}

        {certificateAvailable && (
          <section className="learning-certificate-section" aria-labelledby="certificate-heading">
            <div className="learning-certificate">
              <p className="learning-certificate-brand">EDIVA · ESCOLA DIGITAL DE CURSOS LIVRES</p>
              <p className="learning-eyebrow">CERTIFICADO DE CONCLUSÃO</p>
              <h2 id="certificate-heading" tabIndex="-1">Parabéns, {data.user.name}!</h2>
              <p>Este certificado reconhece a conclusão do curso</p>
              <h3>{course.title}</h3>
              <p>Concluído em {formatDate(assessment.completedAt)}</p>
              <small>Código de validação: {assessment.certificateId}</small>
            </div>
            <button className="learning-button" onClick={() => window.print()} type="button">
              Baixar certificado em PDF
            </button>
          </section>
        )}
    </CourseStudyLayout>
  )
}
