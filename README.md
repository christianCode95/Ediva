# EDIVA

Site da EDIVA com cadastro e autenticação de alunos, cursos, progresso, questionários e certificados. O frontend usa React e Vite; a API Node.js usa SQLite para persistir as contas e o progresso.

## Rodar localmente

Requer Node.js `^20.19.0` ou `>=22.12.0`.

```bash
npm install
npm run dev
```

O comando inicia o frontend e a API. Abra o endereço que o Vite mostrar, normalmente `http://localhost:5173`. As requisições `/api` são encaminhadas à API local na porta `8787`.

O banco é criado em `Ediva/data/ediva.sqlite`. Para configurar outro caminho, copie `Ediva/.env.example` para `Ediva/.env` e altere `EDIVA_DB_PATH`.

## Rotas de conta

- `/cadastro`: cria uma conta e inicia a sessão sem enviar ou pedir confirmação de e-mail. E-mails fictícios, como `teste@exemplo.com`, são aceitos.
- `/entrar`: autentica uma conta existente.
- `/conta`: mostra os dados do aluno, oferece os cursos de Administração, RH e Auxiliar Financeiro e permite encerrar a sessão.
- `/privacidade`: explica os dados tratados pela área de contas.

As senhas são armazenadas com Argon2id. A sessão usa cookie `HttpOnly`, `SameSite=Lax` e, em produção, `Secure`. O banco guarda o hash do token de sessão, não o token original.

Após cadastro ou login, o cabeçalho do site mostra “Olá, [primeiro nome]”. O link de recuperação de acesso orienta o aluno a entrar em contato com `edivacursos@gmail.com`; como não há confirmação de e-mail, a equipe precisa atender essas solicitações manualmente.

## Preparar publicação

O site completo usa dois endereços: o GitHub Pages publica as páginas de apresentação e o catálogo; uma hospedagem Node publica toda a área do aluno, os PDFs, os vídeos e a API no mesmo domínio. Os links de entrar, criar conta e acessar os cursos encaminham o aluno ao servidor. Assim, login, progresso, avaliações e certificados usam a mesma origem e mantêm os cookies atuais.

### Área do aluno no Render

O `render.yaml` prepara um serviço Node no plano `0.5c-512mb`, com um disco persistente de 1 GB para o SQLite. Essa configuração exige um plano pago compatível com disco; confira e aprove os custos na conta do Render antes de criar o serviço. O arquivo não configura um domínio comprado: a instalação inicial usa o endereço HTTPS `onrender.com` fornecido pelo Render.

1. Conecte o repositório ao Render e revise o Blueprint `render.yaml`.
2. Forneça o conteúdo do arquivo privado `Ediva/data/course-answer-keys.json` na variável secreta `EDIVA_COURSE_ANSWER_KEYS_JSON` solicitada durante a configuração. Não envie o arquivo ao GitHub. Como alternativa, forneça um arquivo privado no servidor e configure `EDIVA_COURSE_ANSWER_KEYS_PATH`.
3. O serviço usa `npm ci --include=dev && npm run build` para compilar e `npm start` para iniciar. O banco fica em `/var/data/ediva.sqlite` no disco persistente.
4. A API usa `RENDER_EXTERNAL_URL`, fornecida pelo Render, como origem permitida. `EDIVA_ALLOWED_ORIGINS`, quando definida, tem prioridade e aceita origens separadas por vírgula. Para outra hospedagem, configure essa variável com o endereço HTTPS da própria área do aluno, além de `NODE_ENV=production` e `EDIVA_DB_PATH` em armazenamento persistente.
5. `VITE_PUBLIC_SITE_URL=https://christiancode95.github.io/Ediva/` faz os links públicos da área do aluno voltarem ao Pages. Esse valor é público e faz parte do build. Gabaritos e segredos nunca devem usar nomes começando com `VITE_`.

O servidor usa `PORT` fornecida pela hospedagem e escuta em `0.0.0.0`. Faça cópias de segurança do volume. O `render.yaml` mantém a leitura do IP encaminhado pelo proxy Cloudflare do Render; em outra hospedagem, configure confiança em proxy somente conforme a infraestrutura usada.

### Páginas públicas no GitHub Pages

Depois de confirmar que a área do aluno está online, crie a variável de repositório `STUDENT_APP_URL` em Settings → Secrets and variables → Actions → Variables, com o endereço HTTPS real do servidor, sem credenciais. Ela é usada no build como `VITE_STUDENT_APP_URL` para gerar os links de acesso aos cursos.

Em Settings → Pages, escolha GitHub Actions como origem. O workflow `Publicar EDIVA no GitHub Pages` começa com execução manual: em Actions, execute-o após configurar `STUDENT_APP_URL`. Ele confere se a API da área do aluno está disponível antes de compilar. Sem essa variável válida e um servidor disponível, o workflow não publica uma versão com links incompletos. O build público usa a base `/Ediva/`, gera as rotas conhecidas e não inclui o banco, os gabaritos nem os arquivos de aulas; esses materiais são servidos pela área do aluno.

Para validar o servidor localmente com a API ativa, use `npm run preview` após `npm run build`. A preparação dos arquivos e do workflow não cria serviços nem confirma uma publicação.

## Conferir o código

```bash
npm run lint
npm run build
```
