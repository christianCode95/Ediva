// The public catalog needs module names and counts. Student materials are
// served by the separate application, so Pages does not copy PDFs or videos.
export function modulesInCourse(_folder, titles) {
  return titles.map((title, index) => ({ number: index + 1, title }))
}
