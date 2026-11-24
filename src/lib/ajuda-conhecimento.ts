// Base de conhecimento do Tira-dúvidas (IA para a Ana Jessica).
// Só regras, definições e "como fazer" do sistema — NUNCA dados de clientes (LGPD).
// Ao mudar uma regra do sistema, atualize aqui também.

export const CONHECIMENTO_SISTEMA = `
# Sistema do Studio Lilian Santos — guia de regras e uso

## Quem usa
- Ana Jessica: administradora (financeiro, metas, cadastros, configurações, usuárias, preços).
- Lilian Santos: profissional que atende (agenda, clientes, caixa). No financeiro e nas metas só vê; não muda preços, configurações nem usuárias. Ela pode LANÇAR vendas e corrigir/cancelar o que ela mesma lançou, e pode cadastrar serviço novo (sem mexer no preço dos existentes).
- Marilia: dona do sistema (administradora). Mudanças no sistema em si (telas novas, regras novas) são pedidas a ela.
- Contas são criadas em Configurações › Usuárias. Não existe cadastro público. Clientes não acessam o sistema.

## Menu
Início · Agenda · Clientes · Financeiro (Caixa, Contas a pagar, Contas a receber) · Checklist · Produtos e serviços · Resultados (antiga Metas) · Configurações.

## Início
- Botões: "Registrar nova venda", "Agendar novo atendimento" (abre o agendamento ali mesmo) e "Lançar despesa".
- Agenda de hoje (toque abre o atendimento), mensagens para mandar (pós-atendimento), checklist do dia, alerta de inventário e, só para a administradora, o lembrete do extrato da Ton.
- Lembrete do extrato da Ton: todo dia 15 e 30 (ou último dia do mês) aparece "Subir o extrato da Ton" até importar o extrato; depois do prazo fica vermelho com os dias de atraso. Embaixo aparecem as pendências (entradas do banco sem lançamento no caixa) com o botão "Resolver".

## Agenda
- Visões Dia, Semana e Mês; abre sempre na Semana.
- Agenda aberta todos os dias das 08:00 às 20:00, sem pausa fixa. Para fechar um dia ou turno: botão "Fechar horário" (folga, feriado, compromisso). Reabrir apaga o bloqueio. Agendar num horário fechado mostra aviso com "Marcar mesmo assim".
- Um agendamento pode ter vários serviços. Tempo ocupado = soma das durações + 1 intervalo entre atendimentos (no fim). Valor = soma dos preços, editável (desconto, cortesia).
- Campo Horário: lista só os horários livres de 15 em 15 min. Hoje também mostra os que já passaram, marcados "(já passou)", para registrar quem já está sendo atendida. "Outro horário (digitar)" aceita qualquer hora.
- Sobreposição NÃO trava: se o horário bater com outra cliente aparece um aviso vermelho "⚠ Horário sobreposto com…", e a Lilian decide. Na visão Dia os atendimentos sobrepostos aparecem lado a lado.
- Cliente nova no agendamento: o WhatsApp é pedido; se faltar, aparece aviso em vermelho, mas dá para salvar sem número. Número digitado errado (sem DDD) é recusado.
- Campo Origem (de onde a cliente veio: Instagram, WhatsApp, Indicação, Google, Passou na frente, Já é cliente, Outro); preenche a origem da cliente se estiver vazia.
- Status: Agendado → Confirmado → Concluído (ou Faltou / Cancelado). Cancelar em vez de excluir.
- Ao marcar "Concluído": pede o valor e a forma de pagamento e lança no caixa automaticamente, uma vez só. Valor 0 = brinde. Por isso serviço NÃO se lança em "Registrar venda" (evita lançar duas vezes).
- Depois de agendar (ou remarcar), aparece a mensagem pronta "Olá, Fulana! Seu agendamento … foi marcado para…" com o botão "Mandar no WhatsApp".
- Etiquetas: "Nova" (primeira visita) ou "Ativa".
- Aviso fixo no topo: reservar 30 min do dia para as tarefas (mensagens, checklist, mensagens diretas). É só lembrete, não bloqueia horário.

## Cursos
- Cursos são produtos da categoria Cursos, sem estoque, e aparecem numa seção "Cursos" no campo "Agendamento".
- Meio dia = 4h; dia inteiro = 8h. Turma de vários dias: a tela sugere os dias seguintes com data, início e término editáveis ("confira e edite"). A venda fica no 1º dia; os dias seguintes entram com valor 0 ("Curso X — dia 2 de 3").
- Concluir o 1º dia lança no caixa como categoria Curso; os outros dias só marcam concluído.
- Preço do curso é à vista; no cartão a cliente paga a taxa (botão "Repassar a taxa": valor = preço ÷ (1 − taxa)).
- Sinal (ex.: pagamento antecipado do curso): em Contas a receber, na pendência do extrato, use "É sinal" e ligue ao agendamento. No Concluído a tela mostra o sinal e cobra só o que falta.

## Serviço de modelo
- Botão "Serviço de modelo" (administradora; Configurações › Serviços ou Produtos e serviços): marca os tipos gerais feitos em modelo (Micro labial, Micro sobrancelha, Lash, Design de sobrancelha, Limpeza de pele… ou "Outro").
- Cada tipo vira "Modelo — <tipo>", com valor "a combinar": o valor é digitado no agendamento ou ao concluir. Se ficar 0, conta como brinde.
- Retorno de micro faz parte do pacote (R$ 0). Retoque e Avaliação valem R$ 0.

## Clientes
- Lista com busca (sem acento, acha nome parecido), filtros: Mensagens a enviar, Com desconto, Todas, Leads (Todos / Com agendamento / Sem agendamento), Ganhos, Perdidos, Aniversário no mês.
- Ordem: Quem mais gasta · Veio por último · Sem vir há mais tempo — sempre pela data do ÚLTIMO atendimento (nunca pela data do cadastro; quem nunca veio fica no fim).
- Funil: Lead (contato que ainda não fez atendimento) → Ganho/"Lead ganho" (status ativa, já foi atendida) → Inativa (sem vir há muito tempo) ou Perdido (com o motivo da perda). A cliente vira ativa no primeiro atendimento.
- Na ficha: telefone/WhatsApp e Instagram editáveis (salvam ao sair do campo), status, aniversário (dia + mês, ano opcional), descontos, mensagens de pós-atendimento.
- Nome editável no lápis ao lado do nome. Não aceita o nome de outra cliente (sugere Juntar).
- Sem cadastro repetido: ao digitar um nome parecido com alguém já cadastrado ("Jade" × "Jade Lima"), o sistema pergunta "É ela?" e só cadastra outra com "É outra pessoa".
- Quadro "Possíveis cadastros repetidos": "Juntar" (escolhe qual nome fica; vendas, agendamentos, descontos e mensagens passam para ele), "Ver e corrigir" (mostra só as duas fichas) ou "São pessoas diferentes".
- Aniversário: aviso e WhatsApp de parabéns nos 7 dias anteriores.
- "Baixar Excel" exporta todas as clientes (contato, status, origem, visitas, total gasto, ticket, última visita, último pagamento, próximo agendamento).
- Dados de clientes são sensíveis (LGPD): não compartilhar fora do sistema sem necessidade.

## Pós-atendimento (mensagens para mandar)
Regras por tipo de serviço, com mensagem pronta para WhatsApp e botão "Mensagem enviada":
- Design: mensagem com 15 dias; retorno sugerido em 20 dias.
- Micropigmentação (sobrancelha e boca): 3 dias depois "como está a pele / tem dúvidas?"; feedback com 20 dias; retorno em 40 dias.
- Limpeza de pele: 3 dias depois "como está a pele?"; limpeza/dermaplaning: 25 dias → indicação de 1x por mês.
- Nanofios: convite com 180 dias.
- Curso: relacionamento com 30 dias.
Os textos e prazos das regras são ajustados pela Marilia (pedido de alteração).

## Descontos (cupons)
- Descontos da ação do balão na inauguração, válidos até 30/11/2026. Aparecem na ficha com lembrete pelo WhatsApp e o botão "Usou o desconto".
- Desconto pontual numa venda de produto: em "Registrar venda", marcar "Valor diferenciado" e digitar o valor; o motivo pode ir na descrição.

## Financeiro
### Caixa (/financeiro)
- Períodos Dia, Semana, Mês, Ano e Total; em Ano e Total aparece o "Balanço mês a mês". Exportar Excel (abas Lançamentos e Resumo).
- Entradas e saídas numa tabela só. Cancelar em vez de excluir (o cancelado não entra nos totais).
- Sempre mostra bruto, taxa da maquininha e líquido. Valor líquido = valor bruto − taxa da forma de pagamento.
- Brinde = entrada com valor 0: conta como atendimento, não como faturamento.
- Saídas por natureza: dia a dia (operacional), investimento de abertura (Equipamentos e móveis, Reforma e estrutura, Inauguração e divulgação, Compras diversas) e caução (volta no fim do contrato).
### Registrar venda
- Só para vendas: Produto, Curso, Brinde, Outro (abre em Produto). Serviço entra pelo "Concluído" na Agenda.
- O seletor "Venda" separa Serviços, Produtos e Cursos; escolher preenche categoria e valor.
- Valor de produto vem travado; "Valor diferenciado" libera para digitar (mostra o preço de tabela).
- "+ Nova cliente" pede nome e WhatsApp.
- Crédito parcelado: escolher o número de parcelas; a taxa da Ton depende das parcelas. "Crédito" sem parcelas = à vista.
### Contas a pagar (/financeiro/pagar)
- Contas fixas com dias de vencimento: aluguel R$ 1.750 (dia 5), luz R$ 400 (10), Lilian R$ 1.000 (15 e 30), Jocélia R$ 650 (30), internet R$ 79,90 (5), IPTU R$ 23,36 (5), DAS R$ 87,05 (20). Contador R$ 200 dia 10 (a confirmar).
- "Pagar" cria a saída no caixa ligada àquele vencimento (uma por vencimento). Quadrinhos filtram: todas, pagas, falta pagar, atrasadas.
- A administradora cadastra, edita ou desativa contas fixas ali.
### Contas a receber (/financeiro/receber)
- Previsão pelos agendamentos marcados (desconta o sinal já pago).
- Upload do PDF do extrato da Ton: o sistema lê os movimentos e concilia sozinho com o caixa (mesmo valor, até 3 dias de diferença).
- Pendências do extrato: "Lançar no caixa" (antes procura venda da mesma cliente e valor em ±3 dias para não lançar repetido), "É sinal" ou "Ignorar".

## Produtos e serviços
- Produtos: todas veem; só a administradora cadastra e edita preço. Venda de produto baixa o estoque sozinha (cancelar devolve). Estoque pode ficar negativo — o inventário corrige.
- Inventário quinzenal (a cada 15 dias): contar e registrar; o sistema ajusta o estoque. Alerta no Início e em Produtos quando passa do prazo.
- Serviços: qualquer usuária cadastra serviço novo ("Novo serviço"); editar preço/duração/desativar um existente é só a administradora (Configurações › Serviços). Preferir desativar a excluir.

## Checklist
- Ana Jessica pede tarefas para a Lilian e vice-versa (padrão = a outra pessoa). Etiquetas: Clientes ativos, Novos clientes, Studio (geral). Repetição: única (com prazo), diária ou semanal.
- Mini painel no topo (feitas/total, pendentes, atrasadas, por pessoa, por etiqueta) e card "Checklist do dia" no Início. "Tirar da lista" desativa.

## Resultados (antiga Metas)
- Período "Desde / Até" (padrão: desde o primeiro lançamento até hoje).
- Quadros clicáveis: arrecadado (bruto e líquido), gasto (inclui investimento), saldo (líquido − gasto), atendimentos, ticket médio, clientes novas, taxas da maquininha, vendas pagas.
- Gráficos: entradas × saídas por mês; formas de pagamento; entradas por categoria; para onde foi o dinheiro; atendimentos por mês e por semana × esperado na meta; dias da semana mais movimentados; clientes que mais gastaram; serviços mais procurados; produtos mais vendidos; cursos mais realizados; leads (ganhos, possíveis, perdidos, por origem); prioridade de abordagem do mês.
- Atendimento (nos Resultados) = lançamento de Serviço ou Brinde (sinal não conta).
- Ticket médio = faturamento de serviços pagos ÷ número desses atendimentos.
- Prioridade de abordagem: leads e clientes sumidas sem agendamento marcado, ordenadas por: desconto para usar (mais peso se vence em até 7 dias), lead parado há mais tempo, cliente inativa, aniversário no mês; sem WhatsApp desce na lista.
### Meta do mês (fim da página Resultados)
- Meta = (custos fixos + pessoas + lucro desejado) ÷ (1 − taxa média da maquininha dos últimos 90 dias − % de insumos).
- Os custos fixos vêm de Contas a pagar automaticamente (mudou lá, muda aqui). Em "Ajustar números" (só administradora) ficam os extras (ex.: insumos R$ 300), o lucro desejado e o ticket alvo.
- Até o fim de 2026 a meta é "se pagar" (lucro 0); rever para 2027.
- Dias de atendimento: botões "Terça a sábado" (padrão) ou "Terça a domingo"; a meta por dia, os dias restantes e o ritmo usam só esses dias.
- Mostra meta por semana, por dia de atendimento, atendimentos necessários (meta ÷ ticket) e quanto falta por dia restante.

## Configurações (só administradora)
- Serviços (cadastrar, editar preço/duração, desativar, Serviço de modelo), Horários de funcionamento e intervalo entre atendimentos, Taxas da maquininha por forma de pagamento e parcelas, Usuárias (criar, mudar papel Administradora/Profissional, desativar). Sempre tem que existir pelo menos uma administradora ativa.

## Padrões
- Português do Brasil, R$, datas dd/mm/aaaa, horário de Fortaleza, 24h.
- Excluir é raro: preferir desativar ou cancelar para manter o histórico.
- WhatsApp por links com mensagem pronta (sem envio automático).

## O que a Ana Jessica ajusta sozinha (sem pedir à Marilia)
Preços, durações e retorno dos serviços; serviços de modelo; produtos e estoque; taxas da maquininha; horários de funcionamento e intervalo; fechar horários/dias; contas fixas; números da meta (extras, lucro, ticket alvo); usuárias e papéis; tarefas do checklist; status, origem, contatos e aniversário das clientes; juntar cadastros repetidos; corrigir ou cancelar lançamentos do caixa.

## O que precisa pedir à Marilia (mudança no sistema)
Regras novas ou diferentes (ex.: mudar como a meta é calculada, travar ou não sobreposição, novos filtros, novos gráficos), textos e prazos das mensagens de pós-atendimento, novos tipos de relatório, importações de planilhas, pacotes/assinaturas (ainda não existem), ficha de anamnese (ainda não existe), página para clientes agendarem online (futuro).

## Ainda não existe no sistema
Pacotes com sessões (ex.: remoção a laser 3 sessões R$ 500), assinatura de limpeza de pele, ficha de anamnese completa, contagem de faltas na ficha, agendamento online pelas clientes.
`;
