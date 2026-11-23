import { courseCatalog } from '../shared/course-catalog.js'
import { courseQuizzes } from './course-quizzes.js'

export const learningCourses = Object.fromEntries(courseCatalog
  .filter((course) => course.id && course.folder && course.moduleTitles?.length)
  .map((course) => {
    const quiz = Object.hasOwn(courseQuizzes, course.id) ? courseQuizzes[course.id] : null
    const hasAssessment = Boolean(course.hasAssessment && quiz?.questions.length)
    return [course.id, {
      title: course.title,
      modules: course.moduleTitles.map((title, index) => ({ number: index + 1, title })),
      questions: hasAssessment ? quiz.questions : [],
      hasAssessment,
    }]
  }))
