import { appLink, assetLink } from './site-links.js'
import './AboutPage.css'

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

export default function AboutPage() {
  return (
    <div className="ediva-about" id="sobre">
      <section className="ediva-about-hero" aria-labelledby="about-title">
        <div className="ediva-about-intro">
          <p className="section-eyebrow">SOBRE A EDIVA</p>
          <h1 id="about-title">Aprenda hoje. <span>Comece melhor.</span></h1>
          <p>
            A EDIVA — Escola Digital de Cursos Livres nasceu com o propósito de tornar o aprendizado mais
            acessível, simples e prático para quem deseja se preparar para o mercado de trabalho.
          </p>
          <div className="ediva-about-actions">
            <a className="button button-primary" href={appLink('/cursos')}>Conheça os cursos <ArrowIcon /></a>
            <a className="button button-outline" href={appLink('/como-funciona')}>Como funciona</a>
          </div>
        </div>

        <div className="ediva-about-visual">
          <p className="ediva-about-visual-kicker">ESCOLA DIGITAL DE CURSOS LIVRES</p>
          <img src={assetLink('/1792417122513.webp')} alt="" width="400" height="400" decoding="async" />
          <p className="ediva-about-visual-title">Conhecimento para dar o próximo passo.</p>
          <ul>
            <li>Linguagem clara</li>
            <li>Exemplos do dia a dia</li>
            <li>No seu ritmo</li>
          </ul>
        </div>
      </section>

      <section className="ediva-about-mission" aria-labelledby="about-mission-title">
        <div>
          <p className="section-eyebrow">NOSSA MISSÃO</p>
          <h2 id="about-mission-title">Mais acesso ao conhecimento. Mais possibilidades.</h2>
          <p>
            Democratizar o acesso ao conhecimento por meio de cursos livres acessíveis, oferecendo conteúdos
            que contribuam para o desenvolvimento pessoal e profissional de nossos alunos.
          </p>
        </div>
        <div className="ediva-about-story">
          <p>
            Acreditamos que todo começo fica mais fácil quando existe orientação, conhecimento e confiança.
            Por isso, desenvolvemos cursos livres com linguagem clara, exemplos do dia a dia e conteúdos
            organizados para ajudar nossos alunos a compreender diferentes áreas profissionais e dar os
            primeiros passos em sua jornada.
          </p>
        </div>
      </section>

      <section className="ediva-about-method" aria-labelledby="about-method-title">
        <header className="ediva-about-section-heading">
          <p className="section-eyebrow">COMO ENSINAMOS</p>
          <h2 id="about-method-title">Aprendizado que faz sentido no dia a dia.</h2>
          <p>
            Na EDIVA, aprender vai além de ler e memorizar informações. Nosso método combina explicações
            objetivas, exemplos práticos, exercícios, questionários e atividades que aproximam o aluno de
            situações comuns do ambiente profissional.
          </p>
        </header>
        <ol className="ediva-about-method-list">
          <li>
            <span aria-hidden="true">01</span>
            <h3>Entenda o conteúdo</h3>
            <p>Explicações objetivas e linguagem clara para compreender o que está estudando.</p>
          </li>
          <li>
            <span aria-hidden="true">02</span>
            <h3>Conecte com a prática</h3>
            <p>Exemplos, exercícios e atividades ligados a situações comuns do ambiente profissional.</p>
          </li>
          <li>
            <span aria-hidden="true">03</span>
            <h3>Desenvolva sua autonomia</h3>
            <p>Estude no seu ritmo e desenvolva confiança para enfrentar novos desafios.</p>
          </li>
        </ol>
        <p className="ediva-about-method-note">
          Queremos que cada pessoa compreenda o que está estudando, desenvolva sua autonomia e se sinta
          mais preparada para enfrentar novos desafios.
        </p>
      </section>

      <div className="ediva-about-details">
        <section className="ediva-about-detail" aria-labelledby="about-audience-title">
          <p className="section-eyebrow">DIFERENTES COMEÇOS</p>
          <h2 id="about-audience-title">Para quem é a EDIVA?</h2>
          <p>
            Nossos cursos são destinados a jovens e adultos que desejam conquistar o primeiro emprego,
            fortalecer o currículo, desenvolver novas habilidades ou se preparar para uma transição de carreira.
          </p>
          <p>
            Se você está começando, retomando seus estudos ou buscando novos conhecimentos, a EDIVA quer
            fazer parte dessa caminhada.
          </p>
        </section>
        <section className="ediva-about-detail" aria-labelledby="about-commitment-title">
          <p className="section-eyebrow">O QUE NOS GUIA</p>
          <h2 id="about-commitment-title">Nosso compromisso</h2>
          <p>
            Trabalhamos para oferecer materiais didáticos organizados, conteúdos claros e uma experiência de
            aprendizagem que respeite o ritmo de cada aluno.
          </p>
          <p>
            Nossos cursos livres contribuem para a formação complementar e o desenvolvimento de conhecimentos,
            sem substituir formações regulares ou garantir emprego.
          </p>
        </section>
      </div>

      <section className="ediva-about-cta" aria-labelledby="about-cta-title">
        <div>
          <p className="section-eyebrow">SEU PRÓXIMO PASSO</p>
          <h2 id="about-cta-title">Comece a construir novas possibilidades.</h2>
        </div>
        <a className="button button-primary" href={appLink('/cursos')}>Conheça os cursos <ArrowIcon /></a>
      </section>
    </div>
  )
}
