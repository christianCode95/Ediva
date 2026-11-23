// Public course metadata shared by the catalog, student area and server.
// Questions and private answer keys stay in the server configuration.
export const courseCatalog = [
  {
    "id": "adm",
    "hasAssessment": true,
    "title": "Administração",
    "description": "Organização, rotinas e primeiros passos no mercado de trabalho.",
    "image": "/administracao.jpeg",
    "category": "administração",
    "folder": "ADM",
    "moduleTitles": [
      "Fundamentos da Administração",
      "Organização e Rotinas Administrativas",
      "Comunicação Profissional",
      "Informática para o Administrativo",
      "Noções Financeiras para o Administrativo",
      "Compras, Estoque e Processos",
      "Recursos Humanos para o Administrativo",
      "Atendimento ao Cliente e Recepção",
      "Preparação para o Primeiro Emprego",
      "Desafio Final: Simulação Administrativa"
    ]
  },
  {
    "id": "rh",
    "hasAssessment": true,
    "title": "Gestão de Recursos Humanos",
    "description": "Recrutamento, desenvolvimento de equipes e rotinas de RH.",
    "image": "/rh.jpeg",
    "category": "recursos humanos rh",
    "folder": "RH",
    "moduleTitles": [
      "Fundamentos da Gestão de Recursos Humanos",
      "Recrutamento e Seleção de Pessoas",
      "Currículo, Entrevistas e Primeiro Emprego",
      "Admissão e Documentação de Funcionários",
      "Departamento Pessoal: Rotinas Básicas",
      "Treinamento, Integração e Desenvolvimento",
      "Comunicação, Ética e Relações de Trabalho",
      "Clima Organizacional e Gestão de Conflitos",
      "Informática e Organização Administrativa em RH",
      "Prática Profissional e Preparação para o Mercado"
    ]
  },
  {
    "id": "auxiliar-financeiro",
    "hasAssessment": true,
    "title": "Auxiliar Financeiro",
    "description": "Contas a pagar e receber, fluxo de caixa e rotinas da área financeira.",
    "image": "/auxiliar-financeiro.jpeg",
    "category": "auxiliar financeiro finanças contas fluxo de caixa cobrança bancos orçamento",
    "folder": "AUXILIAR FINANCEIRO",
    "moduleTitles": [
      "Fundamentos da Área Financeira",
      "Contas a Pagar",
      "Contas a Receber e Cobrança",
      "Fluxo de Caixa",
      "Bancos, Pagamentos e Conciliação",
      "Planilhas e Informática Financeira",
      "Documentos Fiscais e Controles Financeiros",
      "Despesas, Orçamento e Indicadores",
      "Ética, Segurança e Sigilo Financeiro",
      "Rotina Profissional e Primeiro Emprego"
    ]
  },
  {
    "id": "primeiro-emprego",
    "title": "Primeiro Emprego",
    "description": "Prepare seu currículo, entrevistas e próximos passos profissionais.",
    "image": "/primeiro-emprego.jpeg",
    "category": "primeiro emprego carreira currículo",
    "folder": "PRIMEIRO EMPREGO",
    "moduleTitles": [
      "Conhecendo o Mercado de Trabalho",
      "Currículo Profissional do Zero",
      "Entrevistas e Processos Seletivos",
      "Comportamento e Comunicação no Trabalho",
      "Busca de Vagas e Plano de Carreira"
    ]
  },
  {
    "id": "politica",
    "title": "Política e Cidadania",
    "description": "Conceitos políticos, pensamento crítico e participação cidadã.",
    "image": "/politica.jpeg",
    "category": "política cidadania sociedade",
    "folder": "POLÍTICA",
    "moduleTitles": [
      "Fundamentos da Política",
      "Esquerda, Direita e Centro",
      "Ideologias e Sistemas Políticos",
      "Como Funciona a Política Brasileira",
      "Pensamento Crítico e Participação Cidadã"
    ]
  },
  {
    "id": "aprender-a-aprender",
    "hasAssessment": true,
    "title": "Aprender a Aprender",
    "description": "Memória, concentração e estratégias para organizar seus estudos com autonomia.",
    "image": "/aprender-a-aprender.jpeg",
    "category": "aprender aprendizagem estudos memória concentração hábitos organização autonomia",
    "folder": "APRENDER",
    "moduleTitles": [
      "Como Aprendemos",
      "Diferentes Formas de Aprender e Estudar",
      "Memória, Concentração e Fixação",
      "Organização, Hábitos e Autonomia nos Estudos",
      "Estratégias Práticas e Plano Pessoal"
    ]
  },
  {
    "id": "psicologia-no-trabalho",
    "hasAssessment": true,
    "title": "Psicologia no Trabalho",
    "description": "Comunicação, inteligência emocional e bem-estar nas relações profissionais.",
    "image": "/psicologia-no-trabalho.jpeg",
    "category": "psicologia trabalho comunicação empatia emoções conflitos inteligência emocional motivação estresse bem-estar equipe liderança",
    "folder": "PSICOLOGIA DO TRABALHO",
    "moduleTitles": [
      "Fundamentos da Psicologia no Trabalho",
      "Comunicação, Empatia e Relacionamentos",
      "Emoções, Conflitos e Inteligência Emocional",
      "Motivação, Estresse e Bem-Estar Profissional",
      "Trabalho em Equipe, Liderança e Desenvolvimento Profissional"
    ]
  },
  {
    "id": "inteligencia-artificial",
    "hasAssessment": true,
    "title": "Inteligência Artificial",
    "description": "Use a IA nos estudos e no trabalho, conhecendo seus limites, riscos e cuidados éticos.",
    "image": "/inteligencia-artificial.jpeg",
    "category": "inteligência artificial ia ferramentas prompts tecnologia estudos trabalho segurança ética",
    "folder": "IA",
    "moduleTitles": [
      "O que é Inteligência Artificial",
      "Ferramentas de IA e Como Fazer Bons Pedidos",
      "IA no Trabalho e nos Estudos",
      "Limites, Riscos, Golpes e Checagem",
      "Ética, Regras e o Futuro do Trabalho"
    ],
    "videoPendingModules": [
      3
    ]
  },
  {
    "title": "Atendimento ao Cliente",
    "description": "Do primeiro contato à fidelização.",
    "image": "/atendimento-ao-cliente.jpeg",
    "category": "atendimento cliente",
    "moduleTitles": []
  },
  {
    "title": "Marketing Digital",
    "description": "Estratégias para atrair clientes e construir sua marca.",
    "image": "/marketing-digital.jpeg",
    "category": "marketing digital",
    "moduleTitles": []
  },
  {
    "title": "Informática Básica",
    "description": "Para o dia a dia e o mercado de trabalho.",
    "image": "/informatica-basica.jpeg",
    "category": "informática tecnologia",
    "moduleTitles": []
  },
  {
    "title": "Desenvolvimento Pessoal",
    "description": "Autoconhecimento, produtividade e novas possibilidades.",
    "image": "/desenvolvimento-pessoal.jpeg",
    "category": "desenvolvimento pessoal",
    "moduleTitles": []
  }
]
