const moduleTitles = [
  'Fundamentos da Psicologia no Trabalho',
  'Comunicação, Empatia e Relacionamentos',
  'Emoções, Conflitos e Inteligência Emocional',
  'Motivação, Estresse e Bem-Estar Profissional',
  'Trabalho em Equipe, Liderança e Desenvolvimento Profissional',
]

const questionGroups = [
  [
    {
      text: 'Segundo o módulo, por que o comportamento de uma pessoa no trabalho não deve ser explicado apenas pelo “jeito dela”?',
      options: [
        'Porque ele resulta da combinação da pessoa (história, emoções, valores) com o ambiente (tarefa, equipe, regras e pressão).',
        'Porque o ambiente de trabalho não tem influência alguma, e o comportamento depende apenas da personalidade de cada um.',
        'Porque o jeito de cada pessoa nunca muda e, por isso, não faz sentido tentar entender o que acontece ao redor dela.',
        'Porque somente o psicólogo da empresa pode explicar o comportamento de qualquer funcionário e dizer o motivo.',
      ],
    },
    {
      text: 'Qual das frases abaixo descreve um fato, e não uma interpretação?',
      options: [
        '“Ele não se importa com o resto da equipe e faz questão de atrasar todo mundo.”',
        '“Ele é folgado e sempre foi assim, não adianta tentar conversar com ele.”',
        '“Ele quer prejudicar o grupo e está fazendo isso de propósito para aparecer.”',
        '“Ele chegou 15 minutos depois do horário combinado nas últimas três reuniões.”',
      ],
    },
    {
      text: 'Como o curso orienta usar teorias como as de Maslow e Herzberg?',
      options: [
        'Como regras exatas que permitem prever o comportamento de qualquer pessoa em qualquer situação de trabalho.',
        'Como ferramentas de diagnóstico, que permitem ao aluno identificar transtornos em colegas e chefias.',
        'Como lentes para observar a situação, lembrando que cada uma tem limites e nenhuma explica tudo sozinha.',
        'Como teorias ultrapassadas, que devem ser ignoradas por quem trabalha diretamente com outras pessoas.',
      ],
    },
  ],
  [
    {
      text: 'Sobre a ideia de que “93% da comunicação é não verbal”, o módulo explica que:',
      options: [
        'É um dado comprovado para qualquer conversa, por isso as palavras escolhidas quase nunca têm importância.',
        'É uma interpretação equivocada de estudos específicos sobre sentimentos e atitudes, e não vale para toda comunicação.',
        'É uma regra que vale apenas para e-mails e mensagens escritas, nas quais não há voz nem expressão do rosto.',
        'É uma estatística oficial da legislação trabalhista, que deve ser aplicada em todas as reuniões da empresa.',
      ],
    },
    {
      text: 'O que caracteriza a escuta ativa?',
      options: [
        'Dar atenção total, perguntar para entender e confirmar o que ouviu, repetindo com as próprias palavras.',
        'Preparar a resposta enquanto o outro fala, para não perder tempo e responder logo que ele terminar.',
        'Concordar com tudo o que a pessoa diz, para evitar qualquer desconforto ou discussão durante a conversa.',
        'Ouvir apenas os pontos que interessam ao próprio trabalho e ignorar o restante da fala do colega.',
      ],
    },
    {
      text: 'No modelo de feedback apresentado (Situação, Comportamento e Impacto), o que deve ser feito?',
      options: [
        'Apontar os defeitos da pessoa e comparar com outros colegas, para que ela entenda o nível esperado.',
        'Falar de forma geral, sem exemplos concretos, para não constranger quem recebe o retorno do trabalho.',
        'Dar o retorno em público, na frente de todos, para que o grupo aprenda com o erro cometido.',
        'Descrever a situação, o comportamento observado e o impacto dele, sem rótulos nem julgamentos sobre a pessoa.',
      ],
    },
  ],
  [
    {
      text: 'Qual é a distinção fundamental entre sentir uma emoção e agir?',
      options: [
        'Sentir raiva é falta de profissionalismo e, por isso, deve ser sempre escondida de todos no trabalho.',
        'Quem sente uma emoção forte não consegue escolher como agir e, portanto, não pode ser responsabilizado.',
        'Sentir raiva é humano; gritar com o colega é uma escolha. Ser profissional é escolher como agir.',
        'Emoções não têm nenhuma relação com decisões e relações de trabalho e devem ser ignoradas por completo.',
      ],
    },
    {
      text: 'O que é a reavaliação cognitiva, estratégia de regulação emocional estudada no módulo?',
      options: [
        'Mudar a forma de interpretar a situação, antes que a emoção se intensifique.',
        'Esconder a emoção depois que ela surgiu, sorrindo mesmo com raiva, para manter as aparências.',
        'Descarregar a emoção no primeiro colega que aparecer, para se sentir aliviado o mais rápido possível.',
        'Evitar qualquer situação que possa causar emoção, afastando-se das pessoas envolvidas para sempre.',
      ],
    },
    {
      text: 'Qual das respostas abaixo é assertiva?',
      options: [
        '“Você não percebe que eu estou trabalhando? Para de me atrapalhar!”',
        '“Estou concentrado em um prazo agora. Podemos conversar às 14h?”',
        '“Tudo bem, eu faço... (sem dizer que está sobrecarregado e sem pedir ajuda).”',
        'Colocar o fone de ouvido, suspirar alto e comentar com os colegas que “tem gente sem o que fazer”.',
      ],
    },
  ],
  [
    {
      text: 'Segundo a definição da OMS apresentada no módulo, o burnout é:',
      options: [
        'O cansaço comum de uma semana puxada, que pode ser diagnosticado por qualquer pessoa sem ajuda de profissionais.',
        'Uma condição que atinge apenas pessoas pouco dedicadas e que não se relaciona com as condições do trabalho.',
        'Um problema que só pode ter causa na vida pessoal, e nunca no ambiente ou na organização do trabalho.',
        'Resultado de estresse crônico no trabalho não administrado com sucesso, tratado como fenômeno ocupacional.',
      ],
    },
    {
      text: 'Beatriz recebeu pedidos que somam 8 h 30 min de trabalho, mas tem apenas 6 h livres no dia. Quanto tempo falta?',
      options: [
        '1 h 30 min.',
        '3 h 30 min.',
        '2 h 30 min.',
        '2 h 00 min.',
      ],
    },
    {
      text: 'Sobre as responsabilidades no cuidado com o bem-estar no trabalho, o módulo afirma que:',
      options: [
        'Cabem apenas à pessoa, que deve aprender sozinha a lidar com qualquer nível de pressão.',
        'São compartilhadas: cabem à pessoa e também à organização, e uma não substitui a outra.',
        'Cabem apenas à empresa, e a pessoa não precisa comunicar dificuldades nem pedir apoio.',
        'Não existem, pois o estresse faz parte do trabalho e não pode ser reduzido por ninguém.',
      ],
    },
  ],
  [
    {
      text: 'Segundo o módulo, como a confiança em uma equipe é construída?',
      options: [
        'Por meio de um discurso bonito do líder no primeiro dia, que dispensa qualquer atitude prática depois.',
        'Pelo controle constante de tudo o que cada pessoa faz, para que ninguém consiga errar ou esconder algo.',
        'Por pequenos comportamentos repetidos ao longo do tempo, como cumprir o prometido e avisar cedo quando não der.',
        'De forma imediata, assim que as pessoas passam a trabalhar no mesmo lugar, sem precisar de tempo.',
      ],
    },
    {
      text: 'O que caracteriza o assédio moral, segundo o módulo?',
      options: [
        'Conduta abusiva repetida que humilha, constrange ou isola a pessoa, ferindo sua dignidade.',
        'Qualquer cobrança de prazo ou de qualidade, mesmo feita com respeito e de modo claro.',
        'Uma discordância isolada entre dois colegas sobre a melhor forma de fazer uma tarefa.',
        'Apenas situações de violência física, já que palavras e atitudes nunca causam dano à pessoa.',
      ],
    },
    {
      text: 'Caio, funcionário novo, errou etiquetas por medo de perguntar. Qual é a resposta adequada da liderança?',
      options: [
        'Chamar a atenção dele na frente de todos, para que a equipe veja que erros não são tolerados.',
        'Conversar em particular, entender o que dificultou, revisar juntos e combinar um horário diário de dúvidas.',
        'Ignorar os erros e não dizer nada, esperando que ele aprenda sozinho com o tempo e a prática.',
        'Dizer que ele “devia ter perguntado” e deixar de explicar o sistema, porque já foi apresentado uma vez.',
      ],
    },
  ],
]

export const psicologiaTrabalhoQuiz = {
  title: 'Psicologia no Trabalho',
  modules: moduleTitles.map((title, index) => ({ number: index + 1, title })),
  questions: questionGroups.flatMap((questions, moduleIndex) => questions.map((question) => ({
    moduleNumber: moduleIndex + 1,
    moduleTitle: moduleTitles[moduleIndex],
    category: 'Questionário do Módulo ' + (moduleIndex + 1),
    text: question.text,
    options: question.options.map((text, index) => ({ key: String.fromCharCode(65 + index), text })),
  }))),
}
