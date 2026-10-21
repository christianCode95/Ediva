# EDIVA

Site da EDIVA, construído com React e Vite, com API Node.js para cadastro, login e confirmação de e-mail. Os materiais PDF dos cursos ficam em `src/Cursos`.

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

O site fica disponível em `http://localhost:5173`. Para receber e-mails de confirmação localmente, configure as variáveis SMTP no `.env` usando uma senha de app. Esse arquivo e o banco local não devem ser enviados ao GitHub.

## Produção

Gere os arquivos do site e inicie o servidor Node.js:

```bash
npm run build
npm start
```

Configure no ambiente da hospedagem `NODE_ENV=production`, `EDIVA_PUBLIC_URL`, `EDIVA_ALLOWED_ORIGINS` e as variáveis SMTP descritas em `.env.example`. A hospedagem também precisa manter o banco SQLite em armazenamento persistente; defina `EDIVA_DB_PATH` para esse local.

O GitHub guarda o código, mas não executa a API Node.js nem mantém o banco SQLite. Para cadastro e login funcionarem no domínio, publique o app em uma hospedagem que execute Node.js e tenha armazenamento persistente.
