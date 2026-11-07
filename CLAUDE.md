# Briefing — Sistema Administrativo Studio Lilian Santos

Construa uma fase por vez (seção 8). Só passe para a próxima quando a anterior estiver funcionando.

## 1. Contexto

- **Negócio:** Studio Lilian Santos — estúdio de estética.
- **Quem atende:** somente a Lilian Santos, responsável técnica (uma profissional, uma agenda).
- **Quem administra:** Ana Jessica, administradora do studio (financeiro, metas, cadastros, configurações).
- **Quem usa o sistema agora:** Ana Jessica, Lilian e Marilia (dona do sistema) — 3 usuárias internas. Clientes não acessam nesta versão.
- **Futuro** (não construir agora, mas deixar a estrutura preparada): página pública para clientes agendarem online.
- **Objetivo:** substituir caderno/WhatsApp/planilhas por um sistema único com CRM, agenda, receita e metas.

## 2. Stack técnica

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase: banco Postgres, autenticação por e-mail e senha, Row Level Security (RLS)
- Vercel: hospedagem e deploy automático a partir do GitHub
- Idioma pt-BR, moeda R$ (BRL), datas dd/mm/aaaa, fuso America/Fortaleza
- Mobile-first: a Lilian vai usar principalmente pelo celular, entre um atendimento e outro

## 3. Usuários e acesso

- Login com e-mail e senha (Supabase Auth). Sem cadastro público: as contas são criadas pela Ana Jessica.
- Perfis:
  - `admin` — Ana Jessica: acesso total (financeiro, metas, configurações, usuárias, serviços e preços).
  - `profissional` — Lilian: agenda, clientes, anamnese e painel do dia (completo). Financeiro e metas somente leitura; não altera preços, configurações nem usuárias. (Permissões ajustáveis pela admin.)
- O painel inicial se adapta ao perfil: para a Ana Jessica, destaque para faturamento, metas e pendências administrativas; para a Lilian, destaque para os atendimentos do dia e as fichas das clientes.
- RLS ativo em todas as tabelas: só usuários autenticados leem e escrevem.
- Dados de clientes são sensíveis (LGPD): nenhuma rota pública expõe dados de clientes.

## 4. Modelo de dados (tabelas)

- **servicos** — nome, categoria (facial, corporal, depilação, sobrancelha etc.), duração em minutos, preço, intervalo de retorno recomendado em dias (ex.: limpeza de pele = 30), ativo/inativo.
- **clientes** — nome, WhatsApp, e-mail, data de nascimento, origem (Instagram, indicação, Google, passou na frente, outro), indicada por (cliente), status (lead / ativa / inativa), observações, data do cadastro, aceite LGPD (sim/não + data).
- **fichas_anamnese** — cliente, data, alergias, medicamentos em uso, gestante/lactante, condições de pele, contraindicações, observações. (Uma cliente pode ter várias fichas ao longo do tempo.)
- **agendamentos** — cliente, serviço, início, fim (calculado pela duração), status (agendado / confirmado / realizado / faltou / cancelado), valor cobrado (vem do serviço, editável), observações, pacote usado (opcional).
- **pacotes** — cliente, serviço, nº de sessões contratadas, sessões usadas, valor total, data da compra, validade.
- **receitas** — data, cliente, agendamento (opcional), pacote (opcional), descrição, valor bruto, forma de pagamento (Pix, dinheiro, débito, crédito à vista, crédito parcelado), nº de parcelas, taxa da maquininha (%), valor líquido (calculado).
- **despesas** — data, categoria (produtos, aluguel, energia/água, marketing, equipamentos, impostos, outros), descrição, valor, recorrente mensal (sim/não).
- **metas** — mês/ano, meta de faturamento, meta de atendimentos, meta de novas clientes, meta de ticket médio.
- **configuracoes** — horário de funcionamento por dia da semana, intervalo padrão entre atendimentos (minutos), taxas da maquininha por forma de pagamento, dias sem visita para considerar cliente inativa (padrão 60).
- **bloqueios_agenda** — início, fim, motivo (folga, feriado, compromisso).

## 5. Telas

1. **Início (painel do dia)**
   - Agenda de hoje com status de cada horário e botão de WhatsApp da cliente
   - Faturamento do mês x meta (barra de progresso) e projeção até o fim do mês
   - Aniversariantes da semana
   - Clientes que passaram do prazo de retorno do último serviço
   - Agendamentos ainda não confirmados para amanhã
2. **Agenda**
   - Visões de dia e semana; no celular, abrir em "dia"
   - Criar agendamento tocando num horário livre: escolher cliente (busca ou cadastro rápido) e serviço
   - Mudar status com um toque
   - Respeitar horário de funcionamento e bloqueios
3. **Clientes (CRM)**
   - Lista com busca por nome/telefone e filtros por status, origem e última visita
   - Ficha da cliente: dados, anamnese, histórico de atendimentos, total gasto, ticket médio, pacotes ativos, próxima visita, observações
   - Botão de WhatsApp com mensagem pronta (confirmação, aniversário, retorno)
4. **Financeiro**
   - Entradas e saídas do mês, lucro (receita líquida − despesas)
   - Receita por forma de pagamento, por serviço e por categoria
   - Lançamento rápido de despesa
   - Comparativo com o mês anterior
5. **Metas**
   - Definir metas do mês
   - Meta x realizado em cada indicador, com o quanto falta por dia útil restante
   - Histórico dos últimos 12 meses em gráfico
6. **Configurações**
   - Serviços (cadastrar, editar preço/duração, desativar)
   - Horários, bloqueios, taxas da maquininha, usuárias

## 6. Regras de negócio

- **Sem conflito de horário:** não permitir dois agendamentos sobrepostos (considerando o intervalo entre atendimentos).
- **Ao marcar "realizado":** abrir o lançamento de receita já preenchido (valor, cliente, serviço) para confirmar a forma de pagamento. Se o atendimento usar pacote, descontar uma sessão em vez de gerar receita.
- **Valor líquido** = valor bruto − taxa da forma de pagamento (configurável).
- **Status da cliente:** vira "ativa" no primeiro atendimento realizado; vira "inativa" automaticamente após X dias sem visita (configurável).
- **Retorno:** data sugerida de retorno = último atendimento + intervalo de retorno do serviço.
- **Ticket médio** = faturamento do mês ÷ atendimentos realizados no mês.
- **Faltas:** contar faltas por cliente e mostrar na ficha.
- **WhatsApp:** usar links `wa.me` com texto pré-preenchido (sem API paga nesta versão).
- **Excluir é raro:** preferir "desativar/cancelar" para manter o histórico.

## 7. Identidade visual

- Elegante, limpo e acolhedor, coerente com estética e bem-estar.
- Cores e logo: [a preencher — enviar logo e cores do studio]. Sem logo, propor uma paleta suave e uma tipografia refinada.
- Interface rápida de usar com uma mão no celular: botões grandes, poucas etapas por ação.

## 8. Ordem de construção (uma fase por pedido)

1. **Base:** projeto Next.js + Supabase, login, layout com menu, tema visual, deploy na Vercel. ✅ (Fase 1)
2. **Configurações e serviços:** cadastro de serviços, horários, taxas.
3. **Clientes:** lista, cadastro, ficha, anamnese.
4. **Agenda:** visão dia/semana, criar e editar agendamentos, status, bloqueios, regra de conflito.
5. **Financeiro:** receitas (inclusive automáticas a partir do atendimento), despesas, pacotes, relatórios do mês.
6. **Metas e painel inicial:** metas mensais, meta x realizado, painel do dia, aniversariantes, retornos.
7. **Ajustes finais:** testes com dados reais, importação das clientes atuais (planilha CSV), revisão no celular.
8. **Futuro:** página pública de agendamento para clientes.

## 9. Informações a preencher pela Lilian

- [ ] Lista de serviços: nome, preço, duração, intervalo de retorno
- [ ] Dias e horários de atendimento; intervalo entre clientes
- [ ] Formas de pagamento aceitas e taxas da maquininha
- [ ] Metas para o próximo mês
- [ ] Logo e cores (se houver)
- [ ] Lista atual de clientes (planilha ou contatos), se for importar

---

## Notas técnicas do projeto (para o Claude Code)

- Código em `src/`. Rotas autenticadas no grupo `src/app/(app)/`; login em `src/app/login/`.
- Supabase: clientes em `src/lib/supabase/` (`client.ts` navegador, `server.ts` server components/actions, `middleware.ts` refresh de sessão).
- O `middleware.ts` na raiz de `src/` redireciona quem não está logado para `/login`.
- Migrações SQL em `supabase/migrations/` (rodar em ordem no SQL Editor do Supabase ou via `supabase db push`).
- Perfil da usuária vem da tabela `perfis` (`id` = `auth.users.id`, `papel` = `admin` | `profissional`). Helper `getPerfil()` em `src/lib/auth.ts`.
- Formatação pt-BR (moeda, data, fuso America/Fortaleza) em `src/lib/format.ts` — sempre usar esses helpers.
- Componentes shadcn/ui em `src/components/ui/`.
- Variáveis de ambiente: ver `.env.example`.
- Antes de commitar: `npm run lint` e `npm run build`.
