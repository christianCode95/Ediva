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

O backend serve o build do site e a API no mesmo domínio. Não publique apenas `Ediva/dist` no GitHub Pages: ele publica arquivos estáticos e não executa este servidor Node nem mantém o banco SQLite. O GitHub pode continuar sendo o repositório do código, conectado a uma hospedagem que rode Node.

Este projeto inclui `render.yaml` como configuração inicial para publicar pelo Render conectado ao repositório GitHub. Ela configura o domínio `ediva.com.br`, o serviço Node, HTTPS e um disco persistente para as contas. O plano precisa aceitar disco persistente; o plano gratuito do Render não aceita esse disco.

1. Envie o projeto para um repositório GitHub e, no Render, crie um Blueprint a partir desse repositório e do arquivo `render.yaml`.

2. No painel do Render, confira o domínio personalizado e siga os registros DNS indicados para `ediva.com.br`. O Render provisiona o HTTPS depois que o DNS apontar corretamente.

3. Para uma execução manual, as dependências e o build são:

   ```bash
   npm ci --include=dev
   npm run build
   ```

4. Para outra hospedagem Node, configure as variáveis abaixo no painel do serviço e monte armazenamento persistente para o SQLite:

   ```text
   NODE_ENV=production
   EDIVA_ALLOWED_ORIGINS=https://ediva.com.br,https://www.ediva.com.br
   EDIVA_DB_PATH=/caminho/do/volume/ediva.sqlite
   ```

   `EDIVA_ALLOWED_ORIGINS` aceita mais de uma origem separada por vírgula e não deve conter barras no final. A API exige origens permitidas em produção.

5. Inicie o servidor:

   ```bash
   npm start
   ```

   O servidor usa a porta fornecida pela hospedagem em `PORT` e escuta em `0.0.0.0`.

O `render.yaml` ativa `EDIVA_TRUST_CLOUDFLARE` para usar o IP enviado pelo proxy Cloudflare do Render nos limites de tentativas. Em outra hospedagem, configure a leitura do IP encaminhado apenas quando o serviço estiver atrás de um proxy controlado pela plataforma.

O SQLite precisa ficar em armazenamento persistente; o disco temporário de contêineres pode ser apagado em uma nova publicação. Faça cópias de segurança do volume. Configure no DNS apenas os registros que a hospedagem indicar para conectar `ediva.com.br` ao site. Para validar o build localmente com a API ativa, use `npm run preview` após `npm run build`.

## Conferir o código

```bash
npm run lint
npm run build
```
