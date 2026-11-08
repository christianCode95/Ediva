import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import AccountPage, { AccountHome, PrivacyPage } from './AccountPage.jsx'
import CourseLearningPage from './CourseLearningPage.jsx'
import CourseMaterialsPage from './CourseMaterialsPage.jsx'
import AboutPage from './AboutPage.jsx'
import './App.css'

const logoImage = '/1792417085611.webp'
const contactEmail = 'edivacursos@gmail.com'
const pageTitles = {
  '/': 'Aprenda, pratique e transforme',
  '/cursos': 'Cursos',
  '/sobre-a-ediva': 'Sobre a EDIVA',
  '/como-funciona': 'Como funciona',
  '/blog': 'Blog',
  '/contato': 'Contato',
  '/entrar': 'Entrar na conta',
  '/cadastro': 'Criar conta',
  '/conta': 'Minha conta',
  '/estudar/adm': 'Estudar Administração',
  '/estudar/rh': 'Estudar Gestão de Recursos Humanos',
  '/estudar/auxiliar-financeiro': 'Estudar Auxiliar Financeiro',
  '/estudar/primeiro-emprego': 'Estudar Primeiro Emprego',
  '/estudar/politica': 'Estudar Política e Cidadania',
  '/privacidade': 'Privacidade',
}
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

function modulesInCourse(folder, titles) {
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

const courses = [
  {
    id: 'adm',
    hasAssessment: true,
    title: 'Administração',
    description: 'Organização, rotinas e primeiros passos no mercado de trabalho.',
    image: '/1792417108805.webp',
    category: 'administração',
    modules: modulesInCourse('ADM', [
      'Fundamentos da Administração',
      'Organização e Rotinas Administrativas',
      'Comunicação Profissional',
      'Informática para o Administrativo',
      'Noções Financeiras para o Administrativo',
      'Compras, Estoque e Processos',
      'Recursos Humanos para o Administrativo',
      'Atendimento ao Cliente e Recepção',
      'Preparação para o Primeiro Emprego',
      'Desafio Final: Simulação Administrativa',
    ]),
  },
  {
    id: 'rh',
    hasAssessment: true,
    title: 'Gestão de Recursos Humanos',
    description: 'Recrutamento, desenvolvimento de equipes e rotinas de RH.',
    image: '/1792417107155.webp',
    category: 'recursos humanos rh',
    modules: modulesInCourse('RH', [
      'Fundamentos da Gestão de Recursos Humanos',
      'Recrutamento e Seleção de Pessoas',
      'Currículo, Entrevistas e Primeiro Emprego',
      'Admissão e Documentação de Funcionários',
      'Departamento Pessoal: Rotinas Básicas',
      'Treinamento, Integração e Desenvolvimento',
      'Comunicação, Ética e Relações de Trabalho',
      'Clima Organizacional e Gestão de Conflitos',
      'Informática e Organização Administrativa em RH',
      'Prática Profissional e Preparação para o Mercado',
    ]),
  },
  {
    id: 'auxiliar-financeiro',
    hasAssessment: true,
    title: 'Auxiliar Financeiro',
    description: 'Contas a pagar e receber, fluxo de caixa e rotinas da área financeira.',
    image: '/auxiliar-financeiro.svg',
    category: 'auxiliar financeiro finanças contas fluxo de caixa cobrança bancos orçamento',
    modules: modulesInCourse('AUXILIAR FINANCEIRO', [
      'Fundamentos da Área Financeira',
      'Contas a Pagar',
      'Contas a Receber e Cobrança',
      'Fluxo de Caixa',
      'Bancos, Pagamentos e Conciliação',
      'Planilhas e Informática Financeira',
      'Documentos Fiscais e Controles Financeiros',
      'Despesas, Orçamento e Indicadores',
      'Ética, Segurança e Sigilo Financeiro',
      'Rotina Profissional e Primeiro Emprego',
    ]),
  },
  {
    id: 'primeiro-emprego',
    title: 'Primeiro Emprego',
    description: 'Prepare seu currículo, entrevistas e próximos passos profissionais.',
    image: '/1792417101189.webp',
    category: 'primeiro emprego carreira currículo',
    modules: modulesInCourse('APRENDER', [
      'Conhecendo o Mercado de Trabalho',
      'Currículo Profissional do Zero',
      'Entrevistas e Processos Seletivos',
      'Comportamento e Comunicação no Trabalho',
      'Busca de Vagas e Plano de Carreira',
    ]),
  },
  {
    id: 'politica',
    title: 'Política e Cidadania',
    description: 'Conceitos políticos, pensamento crítico e participação cidadã.',
    image: '/1792417099268.webp',
    category: 'política cidadania sociedade',
    modules: modulesInCourse('POLÍTICA', [
      'Fundamentos da Política',
      'Esquerda, Direita e Centro',
      'Ideologias e Sistemas Políticos',
      'Como Funciona a Política Brasileira',
      'Pensamento Crítico e Participação Cidadã',
    ]),
  },
  {
    title: 'Atendimento ao Cliente',
    description: 'Do primeiro contato à fidelização.',
    image: '/1792417107155.webp',
    category: 'atendimento cliente',
    modules: [],
  },
  {
    title: 'Marketing Digital',
    description: 'Estratégias para atrair clientes e construir sua marca.',
    image: '/1792417104080.webp',
    category: 'marketing digital',
    modules: [],
  },
  {
    title: 'Informática Básica',
    description: 'Para o dia a dia e o mercado de trabalho.',
    image: '/1792417099268.webp',
    category: 'informática tecnologia',
    modules: [],
  },
  {
    title: 'Desenvolvimento Pessoal',
    description: 'Autoconhecimento, produtividade e novas possibilidades.',
    image: '/1792417101189.webp',
    category: 'desenvolvimento pessoal',
    modules: [],
  },
]
const homeCourseTitles = new Set([
  'Administração',
  'Atendimento ao Cliente',
  'Marketing Digital',
  'Informática Básica',
  'Desenvolvimento Pessoal',
])
const homeCourses = courses.filter((course) => homeCourseTitles.has(course.title))

const benefits = [
  {
    title: '100% online',
    description: 'Estude no seu ritmo.',
    image: '/1792417122513.webp',
    tone: 'benefit-purple',
  },
  {
    title: 'Conteúdo prático',
    description: 'Aplicação na vida real.',
    image: '/1792417136168.webp',
    tone: 'benefit-pink',
  },
  {
    title: 'Certificado EDIVA',
    description: 'Reconheça suas conquistas.',
    image: '/1792417097000.webp',
    tone: 'benefit-orange',
  },
  {
    title: 'Para todos',
    description: 'Cursos acessíveis e inclusivos.',
    image: '/1792417095393.webp',
    tone: 'benefit-violet',
  },
]

function normalizeForSearch(value) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('pt-BR')
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.8" cy="10.8" r="6.6" />
      <path d="m16 16 4.4 4.4" />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 12h15M13 5l7 7-7 7" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6.8v5.6l3.7 2.2" />
    </svg>
  )
}

function ModulesIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 3.5h8l4.5 4.6v12.4H6z" />
      <path d="M14 3.8v4.5h4.2M9 14l1.6-3 1.6 3M9.6 13h2M14.2 11h2.6M14.2 14h2.6" />
    </svg>
  )
}

function App() {
  const routePath = window.location.pathname.replace(/\/+$/, '') || '/'
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [modal, setModal] = useState(null)
  const [signedInUser, setSignedInUser] = useState(null)
  const [accountChecked, setAccountChecked] = useState(false)
  const menuRef = useRef(null)
  const menuToggleRef = useRef(null)
  const searchInputRef = useRef(null)
  const searchToggleRef = useRef(null)
  const modalRef = useRef(null)
  const modalCloseRef = useRef(null)
  const modalOpenerRef = useRef(null)
  const visibleCourses = routePath === '/' ? homeCourses : courses

  const filteredCourses = useMemo(() => {
    const queryTerms = normalizeForSearch(query.trim()).split(/\s+/).filter(Boolean)
    if (!queryTerms.length) return visibleCourses

    return visibleCourses.filter((course) => {
      const searchableText = normalizeForSearch(
        `${course.title} ${course.description} ${course.category} ${course.modules.map((module) => module.title).join(' ')}`,
      )
      return queryTerms.every((term) => searchableText.includes(term))
    })
  }, [query, visibleCourses])

  const closeMenu = () => setMenuOpen(false)

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus()
  }, [searchOpen])

  useEffect(() => {
    if (!searchOpen) return undefined

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setSearchOpen(false)
        searchToggleRef.current?.focus()
      }
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [searchOpen])

  useEffect(() => {
    let active = true
    fetch('/api/auth/me')
      .then((response) => response.json())
      .then((result) => {
        if (active) setSignedInUser(result.user || null)
      })
      .catch(() => {})
      .finally(() => {
        if (active) setAccountChecked(true)
      })

    return () => { active = false }
  }, [])

  const openModal = (event, content) => {
    modalOpenerRef.current = event.currentTarget
    setModal(content)
    closeMenu()
  }

  const closeModal = () => setModal(null)

  useEffect(() => {
    if (!menuOpen) return undefined

    const closeOnOutsideClick = (event) => {
      if (!menuRef.current?.contains(event.target) && !menuToggleRef.current?.contains(event.target)) {
        setMenuOpen(false)
      }
    }
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    document.addEventListener('pointerdown', closeOnOutsideClick)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [menuOpen])

  useEffect(() => {
    if (!modal) return undefined

    const previousOverflow = document.body.style.overflow
    const opener = modalOpenerRef.current
    document.body.style.overflow = 'hidden'
    const animationFrame = window.requestAnimationFrame(() => modalCloseRef.current?.focus())

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setModal(null)
        return
      }

      if (event.key !== 'Tab') return
      const focusableElements = modalRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (!focusableElements?.length) {
        event.preventDefault()
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.cancelAnimationFrame(animationFrame)
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      if (opener instanceof HTMLElement) opener.focus()
    }
  }, [modal])

  useEffect(() => {
    document.title = `${pageTitles[routePath] || 'Página não encontrada'} | EDIVA`
  }, [routePath])

  if (routePath === '/entrar') return <AccountPage mode="login" />
  if (routePath === '/cadastro') return <AccountPage mode="signup" />
  if (routePath === '/conta') return <AccountHome />
  const studyingCourse = courses.find((course) => course.id && `/estudar/${course.id}` === routePath)
  if (studyingCourse) {
    return studyingCourse.hasAssessment
      ? <CourseLearningPage course={studyingCourse} />
      : <CourseMaterialsPage course={studyingCourse} />
  }
  if (routePath === '/privacidade') return <PrivacyPage />

  const firstName = signedInUser?.name.trim().split(/\s+/)[0]

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="/" aria-label="EDIVA, início" onClick={closeMenu}>
          <span className="brand-symbol" aria-hidden="true">
            <img src={logoImage} alt="" />
          </span>
          <span className="brand-copy">
            <strong>EDIVA</strong>
            <span>ESCOLA DIGITAL<br />DE CURSOS LIVRES</span>
          </span>
        </a>

        <button
          ref={menuToggleRef}
          className={`menu-toggle${menuOpen ? ' is-open' : ''}`}
          type="button"
          aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={menuOpen}
          aria-controls="main-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>

        <nav
          ref={menuRef}
          id="main-navigation"
          className={`main-nav${menuOpen ? ' is-open' : ''}`}
          aria-label="Navegação principal"
        >
          <a className={routePath === '/' ? 'active' : undefined} aria-current={routePath === '/' ? 'page' : undefined} href="/" onClick={closeMenu}>Início</a>
          <a className={routePath === '/cursos' ? 'active' : undefined} aria-current={routePath === '/cursos' ? 'page' : undefined} href="/cursos" onClick={closeMenu}>Cursos</a>
          <a className={routePath === '/sobre-a-ediva' ? 'active' : undefined} aria-current={routePath === '/sobre-a-ediva' ? 'page' : undefined} href="/sobre-a-ediva" onClick={closeMenu}>Sobre a EDIVA</a>
          <a className={routePath === '/como-funciona' ? 'active' : undefined} aria-current={routePath === '/como-funciona' ? 'page' : undefined} href="/como-funciona" onClick={closeMenu}>Como funciona</a>
          <a className={routePath === '/blog' ? 'active' : undefined} aria-current={routePath === '/blog' ? 'page' : undefined} href="/blog" onClick={closeMenu}>Blog</a>
          <a className={routePath === '/contato' ? 'active' : undefined} aria-current={routePath === '/contato' ? 'page' : undefined} href="/contato" onClick={closeMenu}>Contato</a>
          <div className="mobile-account-actions">
            {accountChecked && (signedInUser ? (
              <a
                className="button button-outline account-greeting"
                href="/conta"
                onClick={closeMenu}
                aria-label={`Olá, ${firstName}. Abrir minha conta`}
              >Olá, {firstName}</a>
            ) : (
              <>
                <a className="button button-outline" href="/entrar" onClick={closeMenu}>Entrar</a>
                <a className="button button-primary" href="/cadastro" onClick={closeMenu}>Criar conta</a>
              </>
            ))}
          </div>
        </nav>

        {(routePath === '/' || routePath === '/cursos') && (
          <div className={`search-box${searchOpen ? ' is-open' : ''}`}>
            <input
              ref={searchInputRef}
              type="search"
              aria-label="Buscar cursos, temas ou habilidades"
              placeholder="Buscar cursos, temas ou habilidades..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <SearchIcon />
            <button
              ref={searchToggleRef}
              className="search-toggle"
              type="button"
              aria-label={searchOpen ? 'Fechar busca' : 'Abrir busca'}
              aria-expanded={searchOpen}
              onClick={() => setSearchOpen((open) => !open)}
            >
              <SearchIcon />
            </button>
          </div>
        )}

        <div className="account-actions">
          {accountChecked && (signedInUser ? (
            <a
              className="button button-outline account-greeting"
              href="/conta"
              aria-label={`Olá, ${firstName}. Abrir minha conta`}
            >Olá, {firstName}</a>
          ) : (
            <>
              <a className="button button-outline" href="/entrar">Entrar</a>
              <a className="button button-primary" href="/cadastro">Criar conta</a>
            </>
          ))}
        </div>
      </header>

      {routePath === '/' && (
      <section className="hero" id="inicio" aria-label="Aprenda, pratique e transforme">
        <h1 className="sr-only">Aprenda. Pratique. Transforme.</h1>
        <img
          className="hero-image"
          src="/1792417090917.webp"
          alt="Materiais de estudo ao lado de um computador com a identidade visual da EDIVA."
          fetchPriority="high"
        />
        <div className="hero-mobile-copy">
          <div className="hero-mobile-title" aria-hidden="true"><span>Aprenda.</span><span>Pratique.</span><em>Transforme.</em></div>
          <p>Cursos 100% online, práticos e acessíveis para você desenvolver novas habilidades.</p>
        </div>
        <div className="hero-actions">
          <a className="button button-primary hero-primary" href="/cursos">
            <span className="desktop-label">Conheça nossos cursos</span>
            <span className="mobile-label">Ver cursos</span>
            <ArrowIcon />
          </a>
          <a className="button button-outline hero-secondary" href="#como-funciona">
            <span className="desktop-label">Saiba como funciona</span>
            <span className="mobile-label">Como funciona</span>
            <span className="play-dot" aria-hidden="true">▶</span>
          </a>
        </div>
      </section>
      )}

      {(routePath === '/' || routePath === '/cursos') && (
      <section className={`courses-section${routePath === '/cursos' ? ' page-courses' : ''}`} id="cursos">
        <div className="section-heading">
          <div>
            {routePath === '/cursos' && <p className="section-eyebrow">ESTUDE NO SEU RITMO</p>}
            <h1>Nossos <span>cursos</span></h1>
            <p>Escolha a área que mais combina com os seus objetivos.</p>
          </div>
          <a href="#lista-de-cursos" className="all-courses">
            Ver todos os cursos <ArrowIcon />
          </a>
        </div>

        <div className="course-grid" id="lista-de-cursos">
          {filteredCourses.map((course) => (
            <article className="course-card" key={course.title}>
              <div className="course-overview">
                <img className="course-icon" src={course.image} alt="" loading="lazy" decoding="async" />
                <div className="course-copy">
                  <h2>{course.title}</h2>
                  <p>{course.description}</p>
                </div>
              </div>
              <div className="course-meta">
                <span><ClockIcon />{routePath === '/' ? '40 horas' : 'No seu ritmo'}</span>
                <span><ModulesIcon />{routePath === '/' ? '10 módulos' : course.modules.length ? `${course.modules.length} módulos` : 'Em breve'}</span>
              </div>
              {course.id && course.modules.length ? (
                <a
                  className="course-link"
                  href={`/estudar/${course.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${routePath === '/' ? 'Ver' : 'Acessar'} curso ${course.title} (abre em nova aba)`}
                >
                  {routePath === '/' ? 'Ver curso' : 'Acessar curso'} <ArrowIcon />
                </a>
              ) : (
                <button
                  className="course-link"
                  type="button"
                  onClick={(event) => openModal(event, { type: 'course', course })}
                  aria-label={`${routePath === '/' ? 'Ver' : course.modules.length ? 'Acessar' : 'Ver detalhes de'} curso ${course.title}`}
                >
                  {routePath === '/' ? 'Ver curso' : course.modules.length ? 'Acessar curso' : 'Em breve'} <ArrowIcon />
                </button>
              )}
            </article>
          ))}
          {filteredCourses.length === 0 && (
            <div className="empty-results">
              <strong>Nenhum curso encontrado</strong>
              <p>Não encontramos resultados para “{query}”. Tente outro termo, como marketing ou informática.</p>
              <button className="text-button" type="button" onClick={() => setQuery('')}>Limpar busca</button>
            </div>
          )}
        </div>
        {query.trim() && (
          <p className="sr-only" role="status" aria-live="polite">
            {filteredCourses.length === 0
              ? 'Nenhum curso encontrado.'
              : `${filteredCourses.length} ${filteredCourses.length === 1 ? 'curso encontrado' : 'cursos encontrados'}.`}
          </p>
        )}

        {routePath === '/' && (
          <section className="benefits-strip" id="como-funciona" aria-labelledby="how-it-works-title">
            <h2 className="sr-only" id="how-it-works-title">Como funciona estudar na EDIVA</h2>
            {benefits.map((benefit) => (
              <div className={`benefit-item ${benefit.tone}`} key={benefit.title}>
                <span className="benefit-symbol" aria-hidden="true">
                  <img src={benefit.image} alt="" loading="lazy" decoding="async" />
                </span>
                <div>
                  <h3>{benefit.title}</h3>
                  <p>{benefit.description}</p>
                </div>
              </div>
            ))}
          </section>
        )}

      </section>
      )}

      {routePath === '/sobre-a-ediva' && <AboutPage />}

      {routePath === '/' && (
      <section className="about-section" id="sobre" aria-labelledby="about-title">
        <div className="about-copy">
          <p className="section-eyebrow">SOBRE A EDIVA</p>
          <h1 id="about-title">Aprender pode abrir novos caminhos.</h1>
          <p>
            A EDIVA é uma escola digital de cursos livres. Reunimos áreas de estudo
            para quem quer desenvolver habilidades pessoais e profissionais com
            conteúdo online, prático e acessível.
          </p>
          <a className="button button-primary" href="#cursos">Conheça os cursos <ArrowIcon /></a>
        </div>
        <div className="about-highlight">
          <img src="/1792417161847.webp" alt="" loading="lazy" decoding="async" />
          <p>Aprenda no seu ritmo,<br /><strong>de onde estiver.</strong></p>
        </div>
      </section>
      )}

      {routePath === '/como-funciona' && (
      <section className="how-page" aria-labelledby="how-title">
        <div className="how-page-heading">
          <p className="section-eyebrow">APRENDIZADO DIGITAL</p>
          <h1 id="how-title">Como funciona estudar na EDIVA?</h1>
          <p>Escolha um curso, abra os módulos em PDF e estude no seu ritmo, pelo dispositivo que preferir.</p>
        </div>
        <section className="benefits-strip how-benefits" aria-label="Vantagens de estudar na EDIVA">
          {benefits.map((benefit) => (
            <div className={`benefit-item ${benefit.tone}`} key={benefit.title}>
              <span className="benefit-symbol" aria-hidden="true">
                <img src={benefit.image} alt="" loading="lazy" decoding="async" />
              </span>
              <div>
                <h2>{benefit.title}</h2>
                <p>{benefit.description}</p>
              </div>
            </div>
          ))}
        </section>
        <div className="how-steps">
          <article>
            <span>01</span>
            <h2>Escolha seu curso</h2>
            <p>Veja as opções disponíveis e selecione a área que combina com seus objetivos.</p>
          </article>
          <article>
            <span>02</span>
            <h2>Acesse os módulos</h2>
            <p>Abra os PDFs no navegador ou baixe os materiais para consultar depois.</p>
          </article>
          <article>
            <span>03</span>
            <h2>Aprenda no seu ritmo</h2>
            <p>Estude pelos módulos do curso usando computador, tablet ou celular.</p>
          </article>
        </div>
        <a className="button button-primary how-courses-link" href="/cursos">Explorar cursos <ArrowIcon /></a>
      </section>
      )}

      {routePath === '/blog' && (
      <section className="how-page blog-page" aria-labelledby="blog-title">
        <div className="how-page-heading">
          <p className="section-eyebrow">BLOG EDIVA</p>
          <h1 id="blog-title">Conteúdos para aprender e crescer.</h1>
          <p>Em breve, você encontrará aqui dicas, ideias e novidades para apoiar seus próximos passos.</p>
        </div>
        <article className="blog-coming-soon">
          <span aria-hidden="true">✦</span>
          <div>
            <h2>Estamos preparando novidades</h2>
            <p>Enquanto isso, explore nossos cursos e comece a desenvolver novas habilidades no seu ritmo.</p>
          </div>
          <a className="button button-primary" href="/cursos">Explorar cursos <ArrowIcon /></a>
        </article>
      </section>
      )}

      {(routePath === '/' || routePath === '/contato') && (
      <section className={`contact-section${routePath === '/contato' ? ' page-contact' : ''}`} id="contato" aria-labelledby="contact-title">
        <div>
          <p className="section-eyebrow">FALE COM A EDIVA</p>
          <h1 id="contact-title">Fale com a nossa equipe.</h1>
          <p>Envie sua dúvida sobre os cursos para o e-mail oficial da EDIVA.</p>
        </div>
        <a className="button button-primary contact-link" href={`mailto:${contactEmail}`}>
          {contactEmail}
        </a>
      </section>
      )}

      {!['/', '/cursos', '/sobre-a-ediva', '/como-funciona', '/blog', '/contato'].includes(routePath) && (
        <section className="route-not-found">
          <p className="section-eyebrow">PÁGINA NÃO ENCONTRADA</p>
          <h1>Não encontramos essa página.</h1>
          <a className="button button-primary" href="/">Voltar ao início</a>
        </section>
      )}

      <footer className="site-footer">
        <a className="footer-brand" href="/" aria-label="EDIVA, voltar ao início">
          <img src={logoImage} alt="" />
          <span>EDIVA</span>
        </a>
        <nav aria-label="Navegação do rodapé">
          <a href="/cursos">Cursos</a>
          <a href="/sobre-a-ediva">Sobre a EDIVA</a>
          <a href="/como-funciona">Como funciona</a>
          <a href="/blog">Blog</a>
          <a href="/privacidade">Privacidade</a>
          <a href="/contato">Contato</a>
        </nav>
        <p>© {new Date().getFullYear()} EDIVA. Escola Digital de Cursos Livres.</p>
      </footer>

      {modal && createPortal((
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal()
          }}
        >
          <section
            ref={modalRef}
            className="site-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            tabIndex={-1}
          >
            <button
              ref={modalCloseRef}
              className="modal-close"
              type="button"
              aria-label="Fechar janela"
              onClick={closeModal}
            >×</button>
            <a className="modal-brand" href="/" onClick={closeModal}>
              <img src={logoImage} alt="" />
              <span>EDIVA</span>
            </a>
            <p className="modal-eyebrow">DETALHES DO CURSO</p>
            <h2 id="modal-title">{modal.course.title}</h2>
            <p className="modal-intro">{modal.course.description}</p>
            <div className="modal-course-meta">
              <span><ClockIcon />No seu ritmo</span>
              <span><ModulesIcon />{modal.course.modules.length ? `${modal.course.modules.length} PDFs` : 'Em breve'}</span>
              <span>100% online</span>
            </div>
            {modal.course.modules.length ? (
              <>
                <div className="course-module-section">
                  <h3>Materiais do curso</h3>
                  <ol className="course-module-list">
                    {modal.course.modules.map((module) => (
                      <li key={module.url}>
                        <span className="course-module-title">
                          <small>Módulo {String(module.number).padStart(2, '0')}</small>
                          <strong>{module.title}</strong>
                        </span>
                        <span className="course-module-actions">
                          <a href={module.url} target="_blank" rel="noreferrer">Abrir PDF</a>
                          <a href={module.url} download>Baixar</a>
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
                <p className="modal-note">Os PDFs estão organizados por curso e módulo. Você pode abrir ou baixar cada material.</p>
                {modal.course.id && (
                  <a
                    className="button button-primary modal-action"
                    href={`/estudar/${modal.course.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={closeModal}
                  >{modal.course.hasAssessment ? 'Estudar e acompanhar progresso' : 'Acessar materiais do curso'} (nova aba)</a>
                )}
              </>
            ) : (
              <p className="modal-note">Os materiais em PDF deste curso ainda estão sendo preparados.</p>
            )}
            <a
              className="button button-primary modal-action"
              href={`mailto:${contactEmail}?subject=${encodeURIComponent(`Informações sobre o curso ${modal.course.title}`)}`}
              onClick={closeModal}
            >Falar com a EDIVA</a>
          </section>
        </div>
      ), document.body)}
    </main>
  )
}

export default App
