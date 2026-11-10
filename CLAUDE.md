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
2. **Configurações e serviços:** cadastro de serviços, horários, taxas. ✅ (Fase 2)
3. **Clientes:** lista, cadastro, ficha, anamnese.
4. **Agenda:** visão dia/semana, criar e editar agendamentos, status, bloqueios, regra de conflito.
5. **Financeiro:** receitas (inclusive automáticas a partir do atendimento), despesas, pacotes, relatórios do mês.
6. **Metas e painel inicial:** metas mensais, meta x realizado, painel do dia, aniversariantes, retornos.
7. **Ajustes finais:** testes com dados reais, importação das clientes atuais (planilha CSV), revisão no celular.
8. **Futuro:** página pública de agendamento para clientes.

## 6.1 Requisitos levantados com dados reais (inauguração, nov/2026)

A planilha de vendas da inauguração mostrou o que o Financeiro (Fase 5) precisa cobrir:

- **Entradas por dia, mês e ano**: é a visão principal que Ana Jessica e Lilian querem ver.
- **Um atendimento/venda com vários itens**: "Design + Buço" = R$ 55 + R$ 15. Receita e agendamento devem aceitar mais de um serviço (itens), não um só.
- **Venda de produtos** (ex.: brinco R$ 29,90), sozinha ou junto com serviço. Precisa de cadastro simples de produtos (nome, preço, ativo). Cursos, e-book e voucher também entram como produto/venda avulsa.
- **Brinde/cortesia**: atendimento com valor R$ 0 (ex.: spa labial na inauguração). Conta como atendimento e cliente atendida, mas não como faturamento; mostrar total de brindes à parte.
- **Preço cobrado ≠ preço da tabela**: o valor do item é editável (ex.: nanofios cobrado R$ 599, tabela R$ 450).
- **Crédito parcelado** com nº de parcelas (ex.: 3x) → taxa da Ton por parcela; "crédito" sem parcelas = à vista.
- **Observação livre** na venda (ex.: "troco de R$ 15 feito por Pix").
- Mostrar sempre bruto, taxas da maquininha e líquido.
- Importar as vendas da inauguração como primeiros dados reais (Fase 5 ou 7), sem versionar a planilha no Git (dados de clientes).

## 6.2 Vários serviços no mesmo atendimento (regra para a Fase 4)

- Um agendamento pode ter **vários serviços** (ex.: design + buço, design + spa labial). Modelar como itens do agendamento (`agendamento_itens`: serviço, duração, valor), não um serviço só.
- **Slot = soma das durações dos serviços + 1 intervalo entre atendimentos** (o intervalo entra uma vez, no fim). Ex.: design 30 + buço 5 + intervalo 10 = 45 min ocupados.
- **Valor = soma dos preços dos serviços**, editável por item (desconto, cortesia: item com valor 0 = brinde, ex.: "ganhou buço").
- Adicionar/remover serviço num agendamento já marcado recalcula fim e valor e **rechecar conflito** com o próximo horário.
- Ao marcar "realizado", o lançamento no caixa sai com a descrição dos itens ("Design personalizado + Epilação de buço") e o total.

## 6.3 Pacotes/combos conhecidos (Fase 5)

- **Remoção a laser** (sob demanda): sessão avulsa R$ 200; **combo 3 sessões R$ 500** → pacote com 3 sessões, cada atendimento desconta uma sessão.
- Reconstrução — Protocolo LS: pacote de 3 sessões (preço a definir).
- Limpeza de pele: assinatura (formato a definir).

## 6.4 Cursos e agenda (regra para a Fase 4)

- Cursos são produtos **sem estoque** (`produtos.controla_estoque = false`); dependem da **disponibilidade da agenda**.
- Duração em dias em `produtos.duracao_dias`: design de sobrancelha 2 dias, brow lamination 0,5 dia (meio período), micropigmentação 3 dias (dermaplaning: a definir).
- **Na Agenda, marcar uma turma de curso ocupa a agenda da Lilian**: dias inteiros (horário de funcionamento do dia) ou meio período (manhã ou tarde) quando 0,5. Esses horários não são oferecidos para atendimentos — tratar como bloqueio gerado pela turma, respeitando dias fechados (turma de 2 dias que começa sábado continua no próximo dia aberto).
- Preço do curso é à vista; no cartão a cliente paga a taxa da maquininha (o caixa tem o botão "Repassar a taxa": valor = preço ÷ (1 − taxa)).

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
- Componentes shadcn/ui em `src/components/ui/` (escritos à mão: ui.shadcn.com é bloqueado na rede do ambiente de build). `Dialog` vira painel inferior no celular; `NativeSelect` usa o seletor do sistema.
- Configurações (só admin): `src/app/(app)/configuracoes/{servicos,horarios,taxas,usuarias}`. Tipos, rótulos e cálculos (valor líquido, `parseNumeroBR`) em `src/lib/configuracoes.ts`.
- Server actions retornam `AcaoState` (`src/lib/acoes.ts`) e sempre checam `requireAdmin()` além do RLS.
- RLS padrão: usuárias ativas leem (`is_usuaria_ativa()`), só admin altera (`is_admin()`); sem DELETE (desativar em vez de excluir). Trigger impede ficar sem nenhuma admin ativa.
- Bloqueios de agenda ficam para a Fase 4 (Agenda).
- **Caixa (Fase 5 adiantada, pedido da Marilia):** tabela única `lancamentos` (entrada/saída) substitui o Google Forms "LS | Controle Financeiro" e é a base de receitas e despesas da Fase 5 (que vai acrescentar itens, vínculo com cliente/agendamento e pacotes — evoluir esta tabela, não criar outra). A taxa da maquininha é copiada por trigger de `taxas_pagamento`; `valor_liquido` é coluna gerada. Valor 0 = brinde. Cancelar em vez de excluir.
- **Exceção de permissão:** a profissional (Lilian) LANÇA no caixa e corrige/cancela o que ela mesma lançou; admin corrige tudo. O resto do financeiro e as metas seguem só leitura para ela.
- **Produtos e estoque** (`/produtos`, todas veem; só admin cadastra/edita preço): venda no caixa com categoria "Produto" aponta `produto_id` + `quantidade` e um trigger baixa o estoque (corrigir/cancelar devolve). Estoque pode ficar negativo — o inventário corrige.
- **Inventário quinzenal:** `registrar_inventario(jsonb)` (security definer, qualquer usuária ativa) grava a contagem em `inventarios` e ajusta o estoque. Alerta no Início e em Produtos quando passam `configuracoes.inventario_intervalo_dias` (15) desde o último. Funções de servidor em `src/lib/produtos-server.ts` (separadas de `src/lib/produtos.ts`, que é usado por componentes de cliente).
- **Clientes v0** (`/clientes`): view `clientes_resumo` (security_invoker) com última visita, último pagamento, visitas e total gasto a partir de `lancamentos.cliente_id`; telefone e Instagram editáveis na lista (salvam ao sair do campo). Caixa e agenda ligam/cadastram a cliente pelo nome (`acharOuCriarCliente` em `src/lib/clientes-server.ts`).
- **Agenda v0** (`/agenda`): `agendamentos` + `agendamento_itens`; `salvar_agendamento()` calcula fim e `fim_ocupado` (= fim + intervalo) e a constraint `agendamentos_sem_conflito` (exclude gist em tstzrange) impede sobreposição de agendado/confirmado/realizado. Horário de funcionamento/pausa gera aviso com "Marcar mesmo assim". "Realizado" pede a forma de pagamento e cria o lançamento (com `agendamento_id`) uma vez só. Datas/horas sempre em America/Fortaleza (UTC−3 fixo, `src/lib/agenda.ts`). Ainda falta: bloqueios, turmas de curso, pacotes, lembretes no Início.
- **Funil de clientes:** status `lead` · `ativa` (= "lead ganho") · `inativa` · `perdido` (+ `motivo_perda`). Gráfico do funil em `clientes/funil-grafico.tsx` (paleta categórica de referência, slots 1–3, validada). Nascimento editável; aviso e WhatsApp de parabéns nos 7 dias anteriores.
- **Metas v0** (`/metas`, tabela `metas` por mês): meta = (custos fixos + pessoas + lucro) ÷ (1 − taxa média dos últimos 90 dias − % insumos). Mostra por semana, por dia de atendimento (dias abertos do mês), atendimentos pelo ticket (real dos últimos 90 dias ou definido) e quanto falta por dia restante. Só admin edita. Cálculo em `src/lib/metas.ts`.
- **Visual executivo:** grafite + off-white, dourado da logo (`--gold` #ad8f47, `--gold-dark` #7f6630); menu lateral escuro; `font-serif` aponta para a fonte de texto (Inter) e a marca usa `font-brand` (Cinzel). Logo recriada em `components/logo.tsx` — trocar pelo arquivo oficial quando houver.
- Agenda tem visões Dia, Semana e Mês.
- Exportação Excel: `src/app/(app)/financeiro/exportar/route.ts` (exceljs), abas Lançamentos e Resumo.
- Variáveis de ambiente: ver `.env.example`.
- Antes de commitar: `npm run lint` e `npm run build`.
