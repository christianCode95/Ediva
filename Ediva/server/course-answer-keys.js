import { readFile } from 'node:fs/promises'

// Real answer keys are private runtime configuration, never repository content.
export async function loadCourseAnswerKeys(courses, { json, filePath } = {}) {
  let configured
  try {
    configured = JSON.parse(json === undefined ? await readFile(filePath, 'utf8') : json)
  } catch {
    return new Map()
  }
  if (!configured || typeof configured !== 'object' || Array.isArray(configured)) return new Map()

  const validated = new Map()
  for (const [courseId, course] of Object.entries(courses)) {
    const answers = Object.hasOwn(configured, courseId) ? configured[courseId] : undefined
    if (!Array.isArray(answers) || answers.length !== course.questions.length || answers.length === 0) continue
    if (!answers.every((answer, index) => course.questions[index].options.some(option => option.key === answer))) continue
    validated.set(courseId, Object.freeze([...answers]))
  }
  return validated
}
