import './CourseLearningPage.css'

export default function CourseStudyLayout({ course, intro, children }) {
  return (
    <main className="learning-page">
      <a className="learning-skip-link" href="#learning-main">Pular para o conteúdo do curso</a>
      <header className="learning-header">
        <a className="learning-brand" href="/" aria-label="EDIVA, página inicial">EDIVA</a>
        <nav aria-label="Navegação da área de estudos">
          <a href="/conta">Minha conta</a>
          <a href="/cursos">Todos os cursos</a>
        </nav>
      </header>

      <section className="learning-content" id="learning-main" aria-labelledby="course-title" tabIndex="-1">
        <p className="learning-eyebrow">ÁREA DE ESTUDOS</p>
        <h1 id="course-title">{course.title}</h1>
        <p className="learning-intro">{intro}</p>
        {children}
      </section>
    </main>
  )
}
