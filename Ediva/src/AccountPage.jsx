import { useEffect, useState } from 'react'
import './AccountPage.css'

const supportEmail = 'ediva.oficial@gmail.com'
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
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [needsVerification, setNeedsVerification] = useState(false)
  const [pendingEmail, setPendingEmail] = useState('')
  const [verificationEmailSent, setVerificationEmailSent] = useState(false)
  const [resendFeedback, setResendFeedback] = useState('')
  const [resending, setResending] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function resendVerification(address = email) {
    setResending(true)
    setResendFeedback('')
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: address }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Não foi possível solicitar outro link.')
      setResendFeedback(result.message || 'Se houver uma conta aguardando confirmação, enviaremos um novo link.')
    } catch (requestError) {
      setResendFeedback(requestError.message || 'Não foi possível conectar ao servidor. Tente novamente.')
    } finally {
      setResending(false)
    }
  }

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
        if (result.code === 'EMAIL_NOT_VERIFIED') {
          setNeedsVerification(true)
          setEmail(result.email || email)
        }
        setError(result.error || 'Não foi possível concluir. Tente novamente.')
        return
      }

      if (isSignup) {
        setPendingEmail(result.email || email)
        setVerificationEmailSent(Boolean(result.emailSent))
        return
      }

      window.location.replace('/conta')
    } catch {
      setError('Não foi possível conectar ao servidor. Tente novamente em instantes.')
    } finally {
      setSubmitting(false)
    }
  }

  if (pendingEmail) {
    return (
      <AccountFrame>
        <p className="account-eyebrow">FALTA SÓ CONFIRMAR</p>
        <h2 id="account-title">Confirme seu e-mail</h2>
        <p className="account-description">
          {verificationEmailSent
            ? 'Enviamos um link de confirmação para:'
            : 'Seu cadastro está salvo, mas não foi possível enviar o e-mail de confirmação agora.'}
        </p>
        <p className="account-pending-email">{pendingEmail}</p>
        <p className="account-description">
          {verificationEmailSent
            ? 'Abra a mensagem e clique no link. Ele expira em 24 horas. Depois da confirmação, sua conta será aberta automaticamente.'
            : 'A conta só será ativada após a confirmação. Tente reenviar o link; se o problema continuar, o envio de e-mail precisa ser configurado.'}
        </p>
        <button
          className="button button-outline account-submit"
          disabled={resending}
          onClick={() => resendVerification(pendingEmail)}
          type="button"
        >
          {resending ? 'Enviando…' : 'Reenviar link de confirmação'}
        </button>
        {resendFeedback && <p className="account-feedback" role="status">{resendFeedback}</p>}
        <p className="account-switch">Já confirmou? <a href="/entrar">Entrar na conta</a></p>
      </AccountFrame>
    )
  }

  return (
    <AccountFrame>
      <p className="account-eyebrow">{isSignup ? 'COMECE SUA JORNADA' : 'BEM-VINDA(O) DE VOLTA'}</p>
      <h2 id="account-title">{isSignup ? 'Crie sua conta' : 'Entre na sua conta'}</h2>
      <p className="account-description">
        {isSignup
          ? 'Crie seu acesso para acompanhar sua jornada de aprendizagem na EDIVA.'
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
        {needsVerification && (
          <button
            className="account-resend-link"
            disabled={resending}
            onClick={() => resendVerification(email)}
            type="button"
          >
            {resending ? 'Enviando…' : 'Reenviar e-mail de confirmação'}
          </button>
        )}
        {resendFeedback && <p className="account-feedback" role="status">{resendFeedback}</p>}

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
        <p className="account-switch">Já tem uma conta? <a href="/entrar">Entrar</a></p>
      ) : (
        <p className="account-switch">Ainda não tem conta? <a href="/cadastro">Criar conta</a></p>
      )}
    </AccountFrame>
  )
}

export function EmailVerificationPage() {
  const [token] = useState(() => new URLSearchParams(window.location.search).get('token') || '')
  const [verificationState, setVerificationState] = useState(() => {
    return {
      error: !token,
      message: token ? 'Para ativar sua conta, confirme que este endereço de e-mail é seu.' : 'Este link de confirmação é inválido ou expirou. Solicite um novo link.',
    }
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (token) window.history.replaceState(null, '', '/confirmar-email')
  }, [token])

  async function confirmEmail() {
    if (!token) return
    setSubmitting(true)
    setVerificationState({ error: false, message: 'Confirmando seu e-mail…' })
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Não foi possível confirmar seu e-mail.')
      setVerificationState({ error: false, message: 'E-mail confirmado! Abrindo sua conta…' })
      window.location.replace('/conta')
    } catch (requestError) {
      setVerificationState({
        error: true,
        message: requestError.message || 'Não foi possível conectar ao servidor.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AccountFrame>
      <p className="account-eyebrow">CONFIRMAÇÃO DE E-MAIL</p>
      <h2 id="account-title">{verificationState.error ? 'Não foi possível confirmar' : 'Confirme seu e-mail'}</h2>
      <p className={verificationState.error ? 'account-error' : 'account-description'} role={verificationState.error ? 'alert' : 'status'}>{verificationState.message}</p>
      {token && !verificationState.error && (
        <button className="button button-primary account-submit" disabled={submitting} onClick={confirmEmail} type="button">
          {submitting ? 'Confirmando…' : 'Confirmar meu e-mail'}
        </button>
      )}
      {verificationState.error && <p className="account-switch"><a href="/entrar">Ir para entrar</a> · <a href="/cadastro">Criar conta</a></p>}
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
            <strong>Seus cursos aparecerão aqui.</strong>
            <p>Ainda não há cursos vinculados a esta conta. Explore as opções e fale com a equipe sobre matrículas.</p>
            <a className="button button-primary" href="/#cursos">Conhecer cursos</a>
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
        <p>Ao criar uma conta, você informa seu nome, e-mail e senha. O e-mail só é ativado depois que você confirma um link enviado para esse endereço; o link é individual, pode ser usado uma vez e expira em 24 horas. A senha é protegida por uma função de hash e não fica armazenada em texto legível. Para manter você conectado, o sistema usa um cookie de sessão protegido. O servidor também recebe dados técnicos da conexão para entregar o site e limitar tentativas abusivas.</p>

        <h2>Finalidade e armazenamento</h2>
        <p>Esses dados são usados para criar sua conta, autenticar seu acesso, manter sua sessão e proteger o serviço. As contas ficam no banco de dados do servidor EDIVA. O cookie de sessão expira em até 30 dias e é removido quando você encerra a sessão.</p>

        <h2>Compartilhamento e conservação</h2>
        <p>Os dados são mantidos no serviço de hospedagem usado para operar a EDIVA. O endereço de e-mail informado é enviado pelo Gmail da EDIVA para entregar a confirmação da conta. A Google pode tratar dados técnicos necessários para entregar e proteger o serviço. A EDIVA não usa os dados da conta para anúncios. Os dados da conta são mantidos enquanto ela estiver ativa ou até que você solicite a exclusão, ressalvadas obrigações legais aplicáveis.</p>

        <h2>Seus pedidos e contato</h2>
        <p>Para solicitar acesso, correção ou exclusão dos dados da sua conta, escreva para <a href={`mailto:${supportEmail}`}>{supportEmail}</a> usando o e-mail cadastrado. A equipe poderá pedir uma confirmação razoável de identidade antes de atender ao pedido.</p>

        <a className="button button-primary privacy-home-link" href="/">Voltar para a EDIVA</a>
      </article>
    </main>
  )
}
