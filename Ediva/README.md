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

Depois de entrar na conta, escolha qualquer um dos oito cursos com materiais na área do aluno ou no catálogo. Todos usam o mesmo acompanhamento de Administração: os módulos são liberados em sequência e o progresso fica salvo por aluno e curso. O aluno pode estudar pelo PDF e confirmar a conclusão manualmente, sem precisar assistir ao vídeo. As videoaulas são opcionais, com som ativado inicialmente e os controles nativos do player.

Ao escolher vídeo, o sistema verifica internamente os intervalos realmente reproduzidos, sem exibir um indicador de percentual assistido. Quando a videoaula termina, a conclusão é registrada automaticamente e o aluno é levado ao próximo módulo. Pular diretamente para o final não registra a conclusão. A troca para PDF pausa o vídeo. Os módulos concluídos continuam disponíveis para revisão, sem duplicar a conclusão. O progresso fica salvo no banco SQLite associado à conta, inclusive depois de sair ou fechar a página.

Nos cursos com avaliação, o questionário final é liberado somente depois de concluir todos os módulos. Administração usa as 90 questões enviadas para o curso; RH e Auxiliar Financeiro usam 30 questões cada; Inteligência Artificial usa 25 questões, cinco por módulo; Aprender a Aprender usa as 15 questões enviadas no PDF, três por módulo. Os gabaritos ficam apenas no servidor e não são enviados ao aluno. É necessário acertar todas para concluir o curso e liberar o certificado, que pode ser salvo em PDF pela opção de impressão do navegador. Quando houver erros, a página informa os módulos que precisam ser revisados antes de uma nova tentativa.

Auxiliar Financeiro está disponível em `/estudar/auxiliar-financeiro`, pelo catálogo e pela área do aluno, com dez módulos em PDF, dez videoaulas, progresso salvo, questionário final e certificado. Inteligência Artificial e Aprender a Aprender também têm avaliação final e certificado, após os seus cinco módulos. Primeiro Emprego, Política e Cidadania e Psicologia no Trabalho têm cinco módulos em PDF e videoaulas opcionais, com a mesma confirmação de estudo, avanço sequencial e progresso salvo. Ao terminar esses três cursos, a página mostra “Todos os módulos concluídos” e permite revisar os materiais; eles ainda não têm questionário cadastrado.

Aprender a Aprender está em `/estudar/aprender-a-aprender` e usa os arquivos de `src/Cursos/APRENDER`. Psicologia no Trabalho está em `/estudar/psicologia-no-trabalho` e usa `src/Cursos/PSICOLOGIA DO TRABALHO`. Primeiro Emprego usa sua própria pasta `src/Cursos/PRIMEIRO EMPREGO`. Inteligência Artificial está em `/estudar/inteligencia-artificial` e usa `src/Cursos/IA`, com PDFs nomeados `Modulo_01.pdf` a `Modulo_05.pdf`. Os oito cursos com materiais aparecem na página inicial e no catálogo, com acesso em nova aba.

O módulo 3 de IA continua disponível pelo PDF enquanto aguarda a videoaula correta. O arquivo mais recente colocado em `VIDEOS/3.mp4` apresenta “Introdução à Política e à Cidadania” e é idêntico ao vídeo 3 de Política, por isso não foi habilitado como uma aula de IA. Os módulos 1, 2, 4 e 5 têm PDF e vídeo. Quando a videoaula correta chegar, substitua `VIDEOS/3.mp4` e remova o número 3 de `videoPendingModules` em `shared/course-catalog.js`.

O catálogo compartilhado em `shared/course-catalog.js` reúne os nomes, imagens e módulos usados pelo frontend e pela API. Os cursos ainda sem materiais continuam marcados como “Em breve”, sem gerar progresso ou avaliação vazios.

Os arquivos `src/Cursos/<curso>/VIDEOS/1.mp4` a `10.mp4` são associados ao número do módulo dentro do mesmo curso. Um vídeo ausente não gera player nem link inválido, e o PDF continua disponível.

### Gabaritos privados

Os arquivos de questionários do repositório contêm apenas os enunciados e as alternativas. Os gabaritos reais são configuração privada do servidor e não devem ser enviados ao GitHub, incluídos nos testes ou colocados em `public`/`dist`.

Na instalação local existente, os gabaritos ficam em `data/course-answer-keys.json`, dentro da pasta ignorada pelo Git. Para outro ambiente, configure `EDIVA_COURSE_ANSWER_KEYS_PATH` com o caminho de um arquivo privado ou `EDIVA_COURSE_ANSWER_KEYS_JSON` com seu conteúdo em uma variável secreta. A variável JSON, quando definida, tem prioridade sobre o arquivo. O conteúdo é um objeto com os identificadores `adm`, `rh`, `auxiliar-financeiro`, `inteligencia-artificial` e `aprender-a-aprender`; cada valor é uma lista das letras corretas, na ordem das perguntas, com exatamente 90, 30, 30, 25 e 15 itens respectivamente. Somente as letras das alternativas existentes são aceitas.

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
