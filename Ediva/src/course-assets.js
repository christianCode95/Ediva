const coursePdfAssets = import.meta.glob('./Cursos/**/*.pdf', {
  eager: true,
  query: '?url',
  import: 'default',
})
const courseVideoAssets = import.meta.glob('./Cursos/**/VIDEOS/*.mp4', {
  eager: true,
  query: '?url',
  import: 'default',
})

export function modulesInCourse(folder, titles) {
  const modules = new Map(Object.entries(coursePdfAssets)
    .filter(([path]) => path.startsWith(`./Cursos/${folder}/`))
    .map(([path, url], index) => {
      const filename = path.split('/').at(-1)
      const number = Number(filename.match(/Modulo_(\d+)_/i)?.[1]) || index + 1
      const fallbackTitle = filename
        .replace(/^EDIVA.*?Modulo_\d+_/i, '')
        .replace(/\.pdf$/i, '')
        .replace(/-1$/, '')
        .replaceAll('_', ' ')
      return [number, {
        number,
        title: titles[number - 1] || fallbackTitle,
        url,
      }]
    }))

  Object.entries(courseVideoAssets)
    .filter(([path]) => path.startsWith(`./Cursos/${folder}/VIDEOS/`))
    .forEach(([path, videoUrl]) => {
      const number = Number(path.split('/').at(-1).match(/^(\d+)\.mp4$/i)?.[1])
      if (!Number.isInteger(number) || number < 1) return
      const module = modules.get(number) || {
        number,
        title: titles[number - 1] || 'Videoaula do módulo ' + String(number).padStart(2, '0'),
      }
      modules.set(number, { ...module, videoUrl })
    })

  return [...modules.values()].sort((left, right) => left.number - right.number)
}
