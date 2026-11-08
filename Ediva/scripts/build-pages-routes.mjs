import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const outputDirectory = fileURLToPath(new URL('../dist-pages/', import.meta.url))
const html = await readFile(join(outputDirectory, 'index.html'), 'utf8')
const routes = [
  'cursos',
  'sobre-a-ediva',
  'como-funciona',
  'blog',
  'contato',
  'privacidade',
  'entrar',
  'cadastro',
  'conta',
  'estudar/adm',
  'estudar/rh',
  'estudar/auxiliar-financeiro',
  'estudar/primeiro-emprego',
  'estudar/politica',
]

for (const route of routes) {
  const directory = join(outputDirectory, route)
  await mkdir(directory, { recursive: true })
  await writeFile(join(directory, 'index.html'), html)
}
await writeFile(join(outputDirectory, '.nojekyll'), '')
await writeFile(join(outputDirectory, '404.html'), html)
console.log(`GitHub Pages preparado com ${routes.length + 1} rotas e acesso à área do aluno no servidor configurado.`)
