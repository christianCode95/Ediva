import { useState } from 'react'
import CourseStudyLayout from './CourseStudyLayout.jsx'
import CourseModuleCard from './CourseModuleCard.jsx'
import ModuleStudyMaterials from './ModuleStudyMaterials.jsx'

export default function CourseMaterialsPage({ course }) {
  const [learningMessage, setLearningMessage] = useState('')
  const hasVideos = course.modules.some((module) => module.videoUrl)

  return (
    <CourseStudyLayout
      course={course}
      intro={hasVideos
        ? 'Estude pelo PDF ou pela videoaula disponível em cada módulo, no seu ritmo. Você pode escolher o formato que preferir e voltar aos conteúdos para revisar quando quiser.'
        : 'Estude os módulos em ordem pelo PDF, no seu ritmo. Abra o material em uma nova aba ou baixe para estudar quando preferir. Você pode voltar aos conteúdos para revisar quando quiser.'}
    >
      <section className="learning-progress" aria-labelledby="course-materials-heading">
        <div className="learning-progress-heading">
          <strong id="course-materials-heading">Materiais de estudo</strong>
          <span>{course.modules.length} módulos{hasVideos ? ' · videoaulas e PDFs' : ' em PDF'}</span>
        </div>
        <p className="learning-section-help">Todos os módulos estão disponíveis para estudar e revisar.</p>
      </section>

      {learningMessage && <p className="learning-reminder" role="status">{learningMessage}</p>}

      <section className="learning-modules" aria-labelledby="learning-modules-heading">
        <h2 id="learning-modules-heading">Módulos do curso</h2>
        <p className="learning-section-help">Acesse o material de cada módulo abaixo para começar seus estudos.</p>
        <ol aria-label="Módulos do curso">
          {course.modules.map((module) => (
            <CourseModuleCard module={module} status="Disponível para estudar" key={module.number}>
              <ModuleStudyMaterials
                courseId={course.id}
                module={module}
                allowDownload
                onPdfOpen={(moduleNumber) => setLearningMessage(
                  'O material do módulo ' + String(moduleNumber).padStart(2, '0')
                  + ' foi aberto em outra aba. Quando terminar, volte a esta página.',
                )}
              />
            </CourseModuleCard>
          ))}
        </ol>
      </section>
    </CourseStudyLayout>
  )
}
