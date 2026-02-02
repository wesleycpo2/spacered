# 📘 BASE DO SISTEMA – SaaS DE ACESSO PÓS-PAGAMENTO

Este documento serve como **fonte de verdade** para a IA no VSCode (Claude / Copilot / GPT), mantendo uma base clara, consistente e permanente do funcionamento do sistema.

---

## 🧠 VISÃO GERAL

O sistema é um **SaaS baseado em assinatura**, onde:

* Não existe login antes do pagamento
* O acesso é liberado somente após confirmação de pagamento
* O controle é feito via **token seguro**
* Todo acesso é validado no backend

Objetivo principal:

> Garantir que **ninguém acesse funcionalidades sem pagar**, mantendo o fluxo simples para o usuário final.

---

## 🧩 FLUXO DO USUÁRIO (END-TO-END)

1. Usuário acessa a **Landing Page (pública)**
2. Visualiza **plano único (Premium)**
3. (Fase atual) Sem cadastro/login na landing
4. Realiza o pagamento
5. Pagamento é confirmado via **webhook**
6. Backend gera **token único de acesso**
7. Usuário é redirecionado para página restrita com token
8. Usuário utiliza as funcionalidades permitidas pelo plano

---

## 🌐 LANDING PAGE (PÚBLICA)

### Características:

* Livre acesso
* Não exige login
* Foco em conversão

### Conteúdo:

* Apresentação do serviço
* Benefícios
* Plano único e preço
* CTA: **Ver plano** / **Assinar**

---

## 📝 FORMULÁRIO DE ASSINATURA

Campos mínimos (quando habilitado):

* Nome
* Email

Função:

* Criar um registro temporário do cliente
* Associar o cliente ao pagamento

⚠️ O formulário **NÃO libera acesso**.

> Observação: no momento, a landing é **apenas informativa** e o cadastro não está exposto.

---

## 💳 PAGAMENTO

Pode ser integrado com:

* Stripe
* Mercado Pago
* Hotmart
* Outro gateway compatível com webhook

Regra absoluta:

> Nenhum acesso é liberado sem confirmação do webhook.

---

## 🔔 WEBHOOK DE PAGAMENTO (CRÍTICO)

Quando o pagamento é confirmado:

O backend deve:

1. Validar se o pagamento é legítimo
2. Identificar o cliente pelo email
3. Gerar um **token único e seguro (UUID ou JWT)**
4. Associar:

   * Plano
   * Data de início
   * Data de expiração
   * Status: ATIVO
5. Registrar o pagamento no banco

---

## 🔐 TOKEN DE ACESSO

Características do token:

* Único
* Difícil de adivinhar
* Pode expirar
* Associado a um plano

Exemplo:

```
a9f3d8c1-2e4b-9f77-x91a-secure
```

Uso:

* Todas as rotas protegidas exigem token
* Token é validado no backend

---

## 🚪 REDIRECIONAMENTO PÓS-PAGAMENTO

Após pagamento aprovado:

URL exemplo:

```
https://app.seusite.com/acesso?token=XXXX
```

A página:

* Valida o token via API
* Se válido → libera acesso
* Se inválido → redireciona para landing

---

## 🔒 ÁREA RESTRITA (PÓS-PAGAMENTO)

Acesso somente com token válido.

Funcionalidades típicas:

* Botão WhatsApp
* Botão Telegram
* Campo para inserir:

  * Número
  * Link
  * ID

Toda ação:

* Valida token
* Verifica plano
* Verifica expiração

---

## 🚫 PROTEÇÃO CONTRA ACESSO INDEVIDO

### O que NÃO é aceitável:

* Proteção apenas no frontend
* Rotas abertas sem validação

### O que é obrigatório:

* Validação no backend
* Token obrigatório em todas as rotas privadas
* Retorno 401 / 403 quando inválido

---

## 🗄️ ESTRUTURA DE BANCO DE DADOS (RESUMO)

Tabelas principais:

* customers
* payments
* plans
* access_tokens
* action_logs

Relacionamentos:

* Cliente → Pagamentos
* Cliente → Token
* Token → Plano

---

## 🧱 STACK TECNOLÓGICA (REFERÊNCIA)

* Backend: Node.js (Express ou NestJS)
* ORM: Prisma
* Banco: PostgreSQL
* Frontend: Next.js / Vite / HTML + Tailwind
* Deploy: Railway / Vercel

---

## 📌 REGRAS DE OURO DO SISTEMA

1. Sem pagamento = sem acesso
2. Toda rota privada valida token
3. Token expira conforme plano
4. Frontend nunca decide sozinho
5. Backend é a autoridade final

---

## 🎯 OBJETIVO FINAL

Criar um sistema:

* Seguro
* Simples para o usuário
* Fácil de escalar
* Fácil de manter

Este documento deve ser usado como **base fixa de conhecimento** pela IA no desenvolvimento do projeto.
