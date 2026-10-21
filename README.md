# EDIVA

Site da EDIVA com cadastro e autenticação de alunos. O frontend usa React e Vite; a API Node.js usa SQLite para persistir as contas.

## Rodar localmente

Requer Node.js `^20.19.0` ou `>=22.12.0`.

```bash
npm install
npm run dev
```

O comando inicia o frontend e a API. Abra o endereço que o Vite mostrar, normalmente `http://localhost:5173`. As requisições `/api` são encaminhadas à API local na porta `8787`.

O banco é criado em `Ediva/data/ediva.sqlite`. Para configurar outro caminho, copie `Ediva/.env.example` para `Ediva/.env` e altere `EDIVA_DB_PATH`.

## Rotas de conta

- `/cadastro`: cria uma conta pendente e envia um link para o e-mail informado.
- `/confirmar-email`: pede a confirmação do link de uso único (válido por 24 horas), ativa a conta e inicia uma sessão.
- `/entrar`: autentica uma conta existente.
- `/conta`: mostra os dados do aluno e permite encerrar a sessão.
- `/privacidade`: explica os dados tratados pela área de contas.

As senhas são armazenadas com Argon2id. A sessão usa cookie `HttpOnly`, `SameSite=Lax` e, em produção, `Secure`. O banco guarda o hash do token de sessão e do link de confirmação, não os tokens originais.

A conta só pode entrar depois que o usuário confirma o endereço de e-mail que informou. Após entrar ou confirmar o endereço, o cabeçalho do site mostra “Olá, [primeiro nome]”. O link de recuperação de senha ainda orienta o aluno a entrar em contato com `ediva.oficial@gmail.com`; a equipe precisa atender essas solicitações manualmente. A área da conta ainda não possui matrículas ou conteúdo de cursos para exibir.

## Preparar publicação

O backend serve o build do site e a API no mesmo domínio. Não publique apenas `Ediva/dist` no GitHub Pages: ele publica arquivos estáticos e não executa este servidor Node nem mantém o banco SQLite. O GitHub pode continuar sendo o repositório do código, conectado a uma hospedagem que rode Node.

Este projeto inclui `render.yaml` como configuração inicial para publicar pelo Render conectado ao repositório GitHub. Ela configura o domínio `ediva.com.br`, o serviço Node, HTTPS, um disco persistente para as contas e o envio SMTP pela conta Gmail oficial da EDIVA. O plano precisa aceitar disco persistente; o plano gratuito do Render não aceita esse disco.

1. Envie o projeto para um repositório GitHub e, no Render, crie um Blueprint a partir desse repositório e do arquivo `render.yaml`.

2. Na conta Google `ediva.oficial@gmail.com`, ative a Verificação em duas etapas e crie uma senha de app. O Google só permite criar senhas de app com a Verificação em duas etapas ativa. Use `smtp.gmail.com`, porta `465` com SSL, autenticando com o endereço completo e essa senha de app.

3. No Render, configure a senha de app como segredo `EDIVA_SMTP_PASSWORD`. Localmente, coloque-a em `Ediva/.env`. Não use a senha normal do Gmail nem a envie ao GitHub. O remetente configurado é `EDIVA <ediva.oficial@gmail.com>`.

4. No painel do Render, confira o domínio personalizado e siga os registros DNS indicados para `ediva.com.br`. O Render provisiona o HTTPS depois que o DNS apontar corretamente.

5. Para uma execução manual, as dependências e o build são:

   ```bash
   npm ci --include=dev
   npm run build
   ```

6. Para outra hospedagem Node, configure as variáveis abaixo no painel do serviço e monte armazenamento persistente para o SQLite:

   ```text
   NODE_ENV=production
   EDIVA_PUBLIC_URL=https://ediva.com.br
   EDIVA_ALLOWED_ORIGINS=https://ediva.com.br,https://www.ediva.com.br
   EDIVA_DB_PATH=/caminho/do/volume/ediva.sqlite
   EDIVA_SMTP_HOST=smtp.gmail.com
   EDIVA_SMTP_PORT=465
   EDIVA_SMTP_SECURE=true
   EDIVA_SMTP_USER=ediva.oficial@gmail.com
   EDIVA_SMTP_PASSWORD=<segredo-configurado-na-hospedagem>
   EDIVA_MAIL_FROM="EDIVA <ediva.oficial@gmail.com>"
   EDIVA_MAIL_REPLY_TO=ediva.oficial@gmail.com
   ```

   `EDIVA_ALLOWED_ORIGINS` aceita mais de uma origem separada por vírgula e não deve conter barras no final. `EDIVA_PUBLIC_URL` deve corresponder ao site publicado; o remetente deve ser a conta Gmail autenticada no SMTP. A API não inicia em produção sem HTTPS, origem permitida e SMTP válidos.

7. Inicie o servidor:

   ```bash
   npm start
   ```

   O servidor usa a porta fornecida pela hospedagem em `PORT` e escuta em `0.0.0.0`.

O `render.yaml` ativa `EDIVA_TRUST_CLOUDFLARE` para usar o IP enviado pelo proxy Cloudflare do Render nos limites de tentativas. Em outra hospedagem, configure a leitura do IP encaminhado apenas quando o serviço estiver atrás de um proxy controlado pela plataforma.

O SQLite precisa ficar em armazenamento persistente; o disco temporário de contêineres pode ser apagado em uma nova publicação. Faça cópias de segurança do volume. O envio pelo Gmail não exige criar `email.ediva.com.br` nem adicionar registros DNS de e-mail. Configure no DNS apenas os registros que a hospedagem indicar para conectar `ediva.com.br` ao site. Para validar o build localmente com a API ativa, use `npm run preview` após `npm run build`.

## Conferir o código

```bash
npm run lint
npm run build
```
