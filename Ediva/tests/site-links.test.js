import assert from 'node:assert/strict'
import test from 'node:test'
import { createSiteLinks, isStudentRoute } from '../src/site-links.js'

test('Pages routes public navigation and assets under the project prefix', () => {
  const links = createSiteLinks({ base: '/Ediva/', pages: true, studentAppURL: 'https://alunos.ediva.example/' })
  assert.equal(links.appLink('/'), '/Ediva/')
  assert.equal(links.appLink('/cursos'), '/Ediva/cursos')
  assert.equal(links.appLink('/sobre-a-ediva?origem=menu#missao'), '/Ediva/sobre-a-ediva?origem=menu#missao')
  assert.equal(links.assetLink('/favicon.png'), '/Ediva/favicon.png')
  assert.equal(links.assetLink('/Ediva/assets/video.mp4'), '/Ediva/assets/video.mp4')
})

test('Pages sends all student paths and their query strings to the full student app', () => {
  const links = createSiteLinks({ base: '/Ediva/', pages: true, studentAppURL: 'https://alunos.ediva.example/app/' })
  for (const pathname of ['/entrar', '/cadastro', '/conta', '/estudar/adm', '/estudar/rh', '/estudar/auxiliar-financeiro', '/estudar/politica']) {
    assert.equal(links.appLink(pathname), 'https://alunos.ediva.example/app' + pathname)
  }
  assert.equal(links.appLink('/entrar?redirect=%2Festudar%2Frh#form'), 'https://alunos.ediva.example/app/entrar?redirect=%2Festudar%2Frh#form')
})

test('backend build keeps student navigation local and returns public navigation to Pages', () => {
  const links = createSiteLinks({ base: '/', publicSiteURL: 'https://christiancode95.github.io/Ediva/' })
  assert.equal(links.appLink('/cursos'), 'https://christiancode95.github.io/Ediva/cursos')
  assert.equal(links.appLink('/privacidade'), 'https://christiancode95.github.io/Ediva/privacidade')
  assert.equal(links.appLink('/'), 'https://christiancode95.github.io/Ediva/')
  assert.equal(links.appLink('/conta'), '/conta')
  assert.equal(links.appLink('/entrar?redirect=%2Festudar%2Frh'), '/entrar?redirect=%2Festudar%2Frh')
  assert.equal(links.assetLink('/1792417085611.webp'), '/1792417085611.webp')
})

test('standalone local build retains existing root links and optional subpath assets', () => {
  const root = createSiteLinks()
  assert.equal(root.appLink('/cursos'), '/cursos')
  assert.equal(root.appLink('/estudar/adm'), '/estudar/adm')
  const nested = createSiteLinks({ base: '/ediva-alunos/' })
  assert.equal(nested.appLink('/conta'), '/ediva-alunos/conta')
  assert.equal(nested.assetLink('/icon.svg'), '/ediva-alunos/icon.svg')
})

test('external links, email links, anchors, queries and relative document references are preserved', () => {
  const links = createSiteLinks({ base: '/Ediva/', pages: true, studentAppURL: 'https://alunos.ediva.example/' })
  for (const value of ['https://example.com/cursos?q=1#video', 'http://localhost:8787/conta', '//cdn.example.com/video.mp4', 'mailto:edivacursos@gmail.com?subject=Ajuda', '#module-heading-2', '?redirect=%2Festudar%2Frh', 'document.pdf']) {
    assert.equal(links.appLink(value), value)
    assert.equal(links.assetLink(value), value)
  }
})

test('route parsing strips only the exact project prefix and preserves encoded characters', () => {
  const links = createSiteLinks({ base: '/Ediva/' })
  assert.equal(links.currentRoutePath('/Ediva/'), '/')
  assert.equal(links.currentRoutePath('/Ediva'), '/')
  assert.equal(links.currentRoutePath('/Ediva/cursos/'), '/cursos')
  assert.equal(links.currentRoutePath('/Ediva/estudar/rh?from=menu#top'), '/estudar/rh')
  assert.equal(links.currentRoutePath('/Ediva-outra/cursos/'), '/Ediva-outra/cursos')
  assert.equal(links.currentRoutePath('/Outra/Ediva/cursos'), '/Outra/Ediva/cursos')
  assert.equal(links.currentRoutePath('/Ediva/pol%C3%ADtica'), '/pol%C3%ADtica')
})

test('student route recognition ignores query and hash without matching unrelated public paths', () => {
  for (const route of ['/entrar?redirect=%2Fconta', '/cadastro/', '/conta#perfil', '/estudar/rh', '/estudar']) {
    assert.equal(isStudentRoute(route), true)
  }
  for (const route of ['/contato', '/conta-publica', '/estudar-direito', '/Ediva/conta', '#conta', 'https://example.com/conta']) {
    assert.equal(isStudentRoute(route), false)
  }
})

test('configured destination URLs accept only HTTP(S) bases without embedded credentials or query', () => {
  for (const studentAppURL of ['javascript:alert(1)', 'https://user:password@example.com/', 'https://example.com/?redirect=other', 'https://example.com/#conta']) {
    assert.throws(() => createSiteLinks({ pages: true, studentAppURL }))
  }
})
