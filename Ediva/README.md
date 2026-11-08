# EDIVA

Site da EDIVA, construído com React e Vite, com API Node.js para cadastro e login. Os materiais PDF dos cursos ficam em `src/Cursos`.

## Requisitos

- Node.js 20.19 ou superior
- npm

## Rodar localmente

```bash
npm install
cp .env.example .env
```

Em um terminal, inicie a API:

```bash
npm run dev:api
```

Em outro terminal, inicie o site:

```bash
npm run dev:web
```

O site fica disponível em `http://localhost:5173`. Cadastros aceitam e-mails fictícios (por exemplo, `teste@exemplo.com`) e entram na conta imediatamente, sem enviar nem exigir confirmação. Esse comportamento vale tanto no ambiente local quanto em produção. O e-mail informado é apenas o identificador da conta; recuperação de acesso deve ser solicitada à equipe da EDIVA. O arquivo `.env` e o banco local não devem ser enviados ao GitHub.

## Acompanhamento dos cursos

Depois de entrar na conta, escolha Administração, Gestão de Recursos Humanos ou Auxiliar Financeiro na área do aluno ou nos detalhes do curso. Os módulos são liberados em sequência. O aluno pode estudar pelo PDF e confirmar a conclusão manualmente, sem precisar assistir ao vídeo. Os três cursos oferecem uma videoaula opcional em cada um dos dez módulos. Os vídeos usam som ativado inicialmente e os controles nativos do player.

Ao escolher vídeo, o sistema verifica internamente os intervalos realmente reproduzidos, sem exibir um indicador de percentual assistido. Quando a videoaula termina, a conclusão é registrada automaticamente e o aluno é levado ao próximo módulo; ao terminar a última aula, o questionário final é liberado. Pular diretamente para o final não registra a conclusão. A troca para PDF pausa o vídeo. O progresso concluído e as tentativas ficam salvos no banco SQLite associado à conta.

Ao concluir os dez módulos, o aluno pode responder à avaliação final. Administração usa as 90 questões enviadas para o curso; RH e Auxiliar Financeiro usam 30 questões cada, conforme os respectivos questionários enviados. O questionário de Auxiliar Financeiro é organizado em dez grupos de três questões, correspondentes aos módulos. Os gabaritos ficam apenas no servidor e não são enviados ao aluno. É necessário acertar todas para concluir o curso e liberar o certificado, que pode ser salvo em PDF pela opção de impressão do navegador. Quando houver erros, a página informa os módulos que precisam ser revisados antes de uma nova tentativa.

Auxiliar Financeiro está disponível em `/estudar/auxiliar-financeiro`, pelo catálogo e pela área do aluno, com dez módulos em PDF, dez videoaulas, progresso salvo, questionário final e certificado. Primeiro Emprego e Política e Cidadania usam a área de materiais; esses dois cursos ainda não têm questionário ou acompanhamento de conclusão cadastrado.

Os arquivos `src/Cursos/<curso>/VIDEOS/1.mp4` a `10.mp4` são associados ao número do módulo dentro do mesmo curso. Um vídeo ausente não gera player nem link inválido, e o PDF continua disponível.

### Gabaritos privados

Os arquivos de questionários do repositório contêm apenas os enunciados e as alternativas. Os gabaritos reais são configuração privada do servidor e não devem ser enviados ao GitHub, incluídos nos testes ou colocados em `public`/`dist`.

Na instalação local existente, os gabaritos ficam em `data/course-answer-keys.json`, dentro da pasta ignorada pelo Git. Para outro ambiente, configure `EDIVA_COURSE_ANSWER_KEYS_PATH` com o caminho de um arquivo privado ou `EDIVA_COURSE_ANSWER_KEYS_JSON` com seu conteúdo em uma variável secreta. A variável JSON, quando definida, tem prioridade sobre o arquivo. O conteúdo é um objeto com os identificadores `adm`, `rh` e `auxiliar-financeiro`; cada valor é uma lista das letras corretas, na ordem das perguntas, com exatamente 90, 30 e 30 itens respectivamente. Somente as letras das alternativas existentes são aceitas.

Forneça esse arquivo separadamente ao servidor, com acesso restrito. Após alterar a configuração, reinicie a API. Sem um gabarito válido para o curso, cadastro, materiais, progresso e certificados já obtidos continuam disponíveis, mas novas correções retornam indisponibilidade temporária e não geram aprovação. Os testes usam respostas sintéticas e nunca os gabaritos reais.

## Produção

O GitHub Pages publica as páginas públicas e o catálogo. A área do aluno fica em um servidor Node separado, que serve o frontend dos cursos, os materiais e a API no mesmo domínio. Entrar, cadastrar e estudar levam a esse servidor, mantendo login, progresso e avaliações com os cookies atuais.

No servidor Node, gere os arquivos e inicie a aplicação:

```bash
npm run build
npm start
```

Configure `NODE_ENV=production`, um caminho persistente em `EDIVA_DB_PATH` e os gabaritos privados descritos acima. No Render, `RENDER_EXTERNAL_URL` define automaticamente a origem permitida da área do aluno. Em outra hospedagem, defina `EDIVA_ALLOWED_ORIGINS` com a origem HTTPS do próprio servidor; um valor explícito sempre tem prioridade sobre o endereço automático do Render.

O Blueprint da raiz usa um plano pago `0.5c-512mb` e disco persistente de 1 GB, sem depender da compra de domínio. Revise os custos antes de criar o serviço. `VITE_PUBLIC_SITE_URL=https://christiancode95.github.io/Ediva/` configura os links públicos do servidor para voltarem ao Pages e precisa estar disponível durante o build.

Depois que o servidor estiver publicado, configure no repositório GitHub a variável `STUDENT_APP_URL` com sua URL HTTPS real e execute manualmente o workflow `Publicar EDIVA no GitHub Pages`. O workflow confere a disponibilidade da API antes do build. A variável é exposta ao build como `VITE_STUDENT_APP_URL`; ela contém apenas um endereço público. O build de Pages usa `/Ediva/` como base e omite os arquivos PDF e de vídeo, que continuam na área do aluno. Gabaritos, senhas e outros segredos nunca devem ser colocados em variáveis `VITE_` nem no repositório.

Consulte o README da raiz para o passo a passo das duas publicações. Preparar essa configuração não cria um serviço no Render nem confirma que os endereços já estejam online.
