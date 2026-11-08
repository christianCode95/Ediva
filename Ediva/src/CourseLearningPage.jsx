import { useEffect, useMemo, useState } from 'react'
import CourseModuleCard from './CourseModuleCard.jsx'
import CourseStudyLayout from './CourseStudyLayout.jsx'
import ModuleStudyMaterials from './ModuleStudyMaterials.jsx'
import './CourseLearningPage.css'

function formatDate(timestamp) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(timestamp))
}

export default function CourseLearningPage({ course }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [authRequired, setAuthRequired] = useState(false)
  const [learningMessage, setLearningMessage] = useState('')
  const [completionMessage, setCompletionMessage] = useState('')
  const [focusTarget, setFocusTarget] = useState('')
  const [answers, setAnswers] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [completingModule, setCompletingModule] = useState(false)
  const [nextStudyMethod, setNextStudyMethod] = useState('pdf')
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
          setAnswers(Array(responseData.course.questions.length).fill(''))
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
  const allModulesCompleted = modules.length > 0
    && modules.every((module) => completedModules.includes(module.number))
  const moduleGroups = useMemo(() => {
    if (!data) return []
    return data.course.questions.reduce((groups, question, index) => {
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

  function markModuleOpened(moduleNumber) {
    setLearningMessage(
      'O material do módulo ' + String(moduleNumber).padStart(2, '0')
      + ' foi aberto em outra aba. Quando terminar, volte a esta página.',
    )
  }

  async function completeModule(moduleNumber, studyMethod = 'pdf') {
    setCompletingModule(true)
    setError('')
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

      const nextModule = modules.find((module) => (
        module.number > moduleNumber && !responseData.completedModules.includes(module.number)
      ))
      setNextStudyMethod(studyMethod)
      setData((current) => ({
        ...current,
        progress: { ...current.progress, completedModules: responseData.completedModules },
      }))
      setLearningMessage('')
      setCompletionMessage(nextModule
        ? 'Módulo ' + String(moduleNumber).padStart(2, '0') + ' concluído. O próximo módulo já está liberado.'
        : 'Todos os módulos foram concluídos. O questionário final já está liberado.')
      setFocusTarget(nextModule ? 'module-heading-' + nextModule.number : 'assessment-heading')
      return true
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível conectar ao servidor.')
      return false
    } finally {
      setCompletingModule(false)
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
          <a className="learning-brand" href="/">EDIVA</a>
          <h1>{authRequired ? 'Entre para acompanhar seu curso' : 'Não foi possível abrir o curso'}</h1>
          <p role="alert">{error}</p>
          {authRequired && (
            <a className="learning-button" href={'/entrar?redirect=' + encodeURIComponent('/estudar/' + course.id)}>
              Entrar na conta
            </a>
          )}
          <a className="learning-back-link" href="/cursos">Voltar aos cursos</a>
        </section>
      </main>
    )
  }

  const assessment = data.progress.assessment
  const certificateAvailable = Boolean(assessment?.completedAt && assessment?.certificateId)
  const activeModuleNumber = modules.find((module) => !completedModules.includes(module.number))?.number
  const progressPercent = modules.length ? Math.round((completedModules.length / modules.length) * 100) : 0

  return (
    <CourseStudyLayout
      course={course}
      intro={
        <>
          Estude os módulos em ordem pelo PDF ou pela videoaula opcional. Pelo PDF, confirme quando terminar de estudar.
          Pelo vídeo, a conclusão é automática ao terminar a aula. Ao concluir todos os módulos, responda ao questionário final.
          Você pode voltar aos conteúdos para revisar quando quiser.
        </>
      }
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
        </section>

        {error && <p className="learning-error" role="alert">{error}</p>}
        {completionMessage && <p className="learning-success" role="status">{completionMessage}</p>}
        {learningMessage && <p className="learning-reminder" role="status">{learningMessage}</p>}

        <section className="learning-modules" aria-labelledby="learning-modules-heading">
          <h2 id="learning-modules-heading">Módulos do curso</h2>
          <p className="learning-section-help">
            Escolha o formato que preferir em cada módulo. Você pode concluir pelo PDF sem assistir à videoaula.
          </p>
          <ol aria-label="Etapas do curso">
            {modules.map((module) => {
              const isCompleted = completedModules.includes(module.number)
              const isActive = module.number === activeModuleNumber
              const isUnlocked = module.number === 1 || completedModules.includes(module.number - 1)
              const moduleStatus = isCompleted
                ? 'Concluído · disponível para estudar novamente'
                : isActive
                  ? 'Disponível para estudar'
                  : 'Bloqueado · conclua o módulo anterior para liberar'

              return (
                <CourseModuleCard
                  key={module.number}
                  module={module}
                  isCompleted={isCompleted}
                  isUnlocked={isUnlocked}
                  isActive={isActive}
                  status={moduleStatus}
                >
                  {isUnlocked && (
                    <ModuleStudyMaterials
                      courseId={course.id}
                      module={module}
                      isActive={isActive}
                      isCompleted={isCompleted}
                      isLastModule={module.number === modules.at(-1).number}
                      initialMethod={nextStudyMethod}
                      completing={completingModule}
                      onComplete={completeModule}
                      onPdfOpen={markModuleOpened}
                    />
                  )}
                </CourseModuleCard>
              )
            })}
          </ol>
        </section>

        {allModulesCompleted && !certificateAvailable && (
          <section className="learning-assessment" aria-labelledby="assessment-heading">
            <p className="learning-eyebrow">ETAPA FINAL</p>
            <h2 id="assessment-heading" tabIndex="-1">Questionário final</h2>
            <p className="learning-assessment-intro">
              São {data.course.questions.length} questões de múltipla escolha. O curso é concluído quando você
              acerta todas. Se errar, indicaremos quais módulos revisar. Você pode estudar esses módulos novamente
              e refazer a avaliação.
              {assessment?.attempts ? ' Tentativas anteriores: ' + assessment.attempts + '.' : ''}
            </p>

            {assessment?.failedModules?.length > 0 && (
              <div className="learning-review-list" aria-labelledby="review-heading">
                <h3 id="review-heading">Módulos para revisar</h3>
                <p>Revise o conteúdo indicado antes de tentar o questionário novamente.</p>
                <ul>
                  {assessment.failedModules.map((moduleNumber) => {
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
                  Você acertou {result.score} de {result.total} questões. Revise os módulos indicados e tente novamente.
                </p>
                <a href="#assessment-form">Ir para uma nova tentativa</a>
              </div>
            )}

            <form id="assessment-form" onSubmit={submitAssessment}>
              {moduleGroups.map((group) => (
                <fieldset className="learning-question-group" key={group.number}>
                  <legend>Módulo {String(group.number).padStart(2, '0')} — {group.title}</legend>
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
