import { useEffect, useState } from 'react'
import './AccountPage.css'

const supportEmail = 'edivacursos@gmail.com'
const brandImage = '/1792417085611.webp'

function AccountBrand() {
  return (
    <a className="account-brand" href="/" aria-label="EDIVA, página inicial">
      <img src={brandImage} alt="" />
      <span>
        <strong>EDIVA</strong>
        <small>ESCOLA DIGITAL DE CURSOS LIVRES</small>
      </span>
    </a>
  )
}

function AccountFrame({ children }) {
  return (
    <main className="account-page">
      <div className="account-frame">
        <section className="account-promo" aria-label="Conheça a EDIVA">
          <AccountBrand />
          <div className="account-promo-copy">
            <span>EDUCAÇÃO QUE ABRE CAMINHOS</span>
            <h1>Aprenda no seu ritmo. Transforme o seu futuro.</h1>
            <p>Cursos online, práticos e acessíveis para desenvolver novas habilidades.</p>
          </div>
          <img className="account-promo-image" src="/1792417161847.webp" alt="Materiais de estudo da EDIVA" />
          <a className="account-home-link" href="/">← Voltar para o site</a>
        </section>

        <section className="account-card" aria-labelledby="account-title">
          <div className="account-card-mobile-brand"><AccountBrand /></div>
          {children}
          <p className="account-privacy-note">
            Seus dados são usados para manter sua conta. Leia a{' '}
            <a href="/privacidade">Política de Privacidade</a>.
          </p>
          <a className="account-mobile-home-link" href="/">← Voltar para o site</a>
        </section>
      </div>
    </main>
  )
}

export default function AccountPage({ mode }) {
  const isSignup = mode === 'signup'
  const requestedReturnPath = new URLSearchParams(window.location.search).get('redirect')
  const returnPath = ['/estudar/adm', '/estudar/rh', '/estudar/auxiliar-financeiro'].includes(requestedReturnPath)
    ? requestedReturnPath
    : '/conta'
  const authRedirectQuery = returnPath === '/conta' ? '' : `?redirect=${encodeURIComponent(returnPath)}`
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (isSignup && password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`/api/auth/${isSignup ? 'register' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })
      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Não foi possível concluir. Tente novamente.')
        return
      }

      window.location.replace(returnPath)
    } catch {
      setError('Não foi possível conectar ao servidor. Tente novamente em instantes.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AccountFrame>
      <p className="account-eyebrow">{isSignup ? 'COMECE SUA JORNADA' : 'BEM-VINDA(O) DE VOLTA'}</p>
      <h2 id="account-title">{isSignup ? 'Crie sua conta' : 'Entre na sua conta'}</h2>
      <p className="account-description">
        {isSignup
          ? 'Crie seu acesso para acompanhar sua jornada de aprendizagem. Você pode usar um e-mail fictício, como teste@exemplo.com.'
          : 'Acesse sua conta EDIVA para continuar sua jornada de aprendizagem.'}
      </p>

      <form className="account-form" onSubmit={handleSubmit}>
        {isSignup && (
          <label className="account-field">
            <span>Nome completo</span>
            <input
              autoComplete="name"
              maxLength={80}
              minLength={2}
              name="name"
              onChange={(event) => setName(event.target.value)}
              placeholder="Como podemos chamar você?"
              required
              value={name}
            />
          </label>
        )}

        <label className="account-field">
          <span>E-mail</span>
          <input
            autoComplete="email"
            maxLength={254}
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="voce@exemplo.com"
            required
            type="email"
            value={email}
          />
        </label>

        <label className="account-field">
          <span>Senha</span>
          <input
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            maxLength={128}
            minLength={isSignup ? 12 : undefined}
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder={isSignup ? 'Pelo menos 12 caracteres' : 'Digite sua senha'}
            required
            type="password"
            value={password}
          />
        </label>

        {isSignup && (
          <label className="account-field">
            <span>Confirme sua senha</span>
            <input
              autoComplete="new-password"
              maxLength={128}
              name="confirm-password"
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Digite a senha novamente"
              required
              type="password"
              value={confirmPassword}
            />
          </label>
        )}

        {error && <p className="account-error" role="alert">{error}</p>}

        <button className="button button-primary account-submit" disabled={submitting} type="submit">
          {submitting ? 'Aguarde…' : isSignup ? 'Criar conta' : 'Entrar'}
        </button>
      </form>

      {!isSignup && (
        <a className="account-forgot" href={`mailto:${supportEmail}?subject=${encodeURIComponent('Ajuda com acesso à minha conta EDIVA')}`}>
          Esqueceu sua senha? Fale com a EDIVA
        </a>
      )}

      {isSignup ? (
        <p className="account-switch">Já tem uma conta? <a href={`/entrar${authRedirectQuery}`}>Entrar</a></p>
      ) : (
        <p className="account-switch">Ainda não tem conta? <a href={`/cadastro${authRedirectQuery}`}>Criar conta</a></p>
      )}
    </AccountFrame>
  )
}

export function AccountHome() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    let active = true
    fetch('/api/auth/me')
      .then(async (response) => {
        const result = await response.json()
        if (!active) return
        if (!response.ok) throw new Error(result.error || 'Não foi possível abrir sua conta.')
        if (!result.user) {
          window.location.replace('/entrar')
          return
        }
        setUser(result.user)
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Não foi possível conectar ao servidor.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [])

  async function handleSignOut() {
    setSigningOut(true)
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' })
      if (!response.ok) throw new Error('Não foi possível encerrar a sessão.')
      window.location.replace('/')
    } catch {
      setError('Não foi possível encerrar a sessão. Tente novamente.')
      setSigningOut(false)
    }
  }

  return (
    <AccountFrame>
      <p className="account-eyebrow">ÁREA DO ALUNO</p>
      <h2 id="account-title">{loading ? 'Abrindo sua conta…' : `Olá, ${user?.name || 'estudante'}!`}</h2>
      {error && <p className="account-error" role="alert">{error}</p>}
      {user && (
        <>
          <p className="account-description">Sua conta está ativa e pronta para acompanhar seus próximos passos.</p>
          <div className="account-profile">
            <span>Nome</span><strong>{user.name}</strong>
            <span>E-mail</span><strong>{user.email}</strong>
          </div>
          <div className="account-empty-state">
            <strong>Escolha um curso para acompanhar</strong>
            <p>Seu progresso fica salvo na conta. Conclua os módulos, faça a avaliação e obtenha seu certificado.</p>
            <div className="account-course-links">
              <a href="/estudar/adm">
                <strong>Administração</strong>
                <span>10 módulos · questionário final · certificado</span>
              </a>
              <a href="/estudar/rh">
                <strong>Gestão de Recursos Humanos</strong>
                <span>10 módulos · questionário final · certificado</span>
              </a>
              <a href="/estudar/auxiliar-financeiro">
                <strong>Auxiliar Financeiro</strong>
                <span>10 módulos · questionário final · certificado</span>
              </a>
            </div>
            <a className="button button-primary" href="/cursos">Conhecer todos os cursos</a>
          </div>
          <button className="account-signout" disabled={signingOut} onClick={handleSignOut} type="button">
            {signingOut ? 'Saindo…' : 'Sair da conta'}
          </button>
        </>
      )}
      {!loading && !user && !error && <p className="account-description">Redirecionando para a entrada…</p>}
    </AccountFrame>
  )
}

export function PrivacyPage() {
  return (
    <main className="account-page privacy-page">
      <article className="privacy-card">
        <AccountBrand />
        <p className="account-eyebrow">DADOS E PRIVACIDADE</p>
        <h1>Política de Privacidade</h1>
        <p className="account-description">
          Esta página explica quais dados são usados para criar e manter uma conta EDIVA.
        </p>

        <h2>Dados utilizados</h2>
        <p>Ao criar uma conta, você informa seu nome, e-mail e senha. O e-mail é usado como identificador de acesso e não é confirmado nem usado para enviar mensagens; por isso, um endereço fictício pode ser usado. A senha é protegida por uma função de hash e não fica armazenada em texto legível. Para manter você conectado, o sistema usa um cookie de sessão protegido. O servidor também recebe dados técnicos da conexão para entregar o site e limitar tentativas abusivas.</p>

        <h2>Finalidade e armazenamento</h2>
        <p>Esses dados são usados para criar sua conta, autenticar seu acesso, manter sua sessão, registrar o progresso nos módulos, os resultados das avaliações e certificados, e proteger o serviço. As contas e o progresso ficam no banco de dados do servidor EDIVA. O cookie de sessão expira em até 30 dias e é removido quando você encerra a sessão.</p>

        <h2>Compartilhamento e conservação</h2>
        <p>Os dados são mantidos no serviço de hospedagem usado para operar a EDIVA. A EDIVA não envia o endereço informado a um serviço de e-mail nem usa os dados da conta para anúncios. Os dados da conta são mantidos enquanto ela estiver ativa ou até que você solicite a exclusão, ressalvadas obrigações legais aplicáveis.</p>

        <h2>Seus pedidos e contato</h2>
        <p>Para solicitar acesso, correção ou exclusão dos dados da sua conta, escreva para <a href={`mailto:${supportEmail}`}>{supportEmail}</a> usando o e-mail cadastrado. A equipe poderá pedir uma confirmação razoável de identidade antes de atender ao pedido.</p>

        <a className="button button-primary privacy-home-link" href="/">Voltar para a EDIVA</a>
      </article>
    </main>
  )
}
