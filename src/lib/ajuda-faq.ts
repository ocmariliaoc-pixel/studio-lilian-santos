// Lis: perguntas e respostas prontas sobre o sistema (GRÁTIS: sem IA, busca direto no navegador).
// Ao mudar uma regra do sistema, atualize a resposta aqui.

export type Faq = { pergunta: string; termos: string[]; resposta: string };

export const FAQ: Faq[] = [
  // ---------------- Agenda
  {
    pergunta: "Como fecho um dia ou um turno na agenda?",
    termos: ["fechar", "folga", "feriado", "bloquear", "bloqueio", "compromisso", "turno", "fechado", "reabrir"],
    resposta:
      "Na **Agenda**, toque em **Fechar horário**.\n1. Escolha a data.\n2. Escolha Dia inteiro, Manhã, Tarde ou um horário.\n3. Informe o motivo (folga, feriado, compromisso) e salve.\n\nPara **reabrir**, na visão **Dia** toque em **Reabrir** na faixa do horário fechado. Se alguém tentar agendar num horário fechado, aparece um aviso com \"Marcar mesmo assim\".",
  },
  {
    pergunta: "Qual o horário de funcionamento da agenda?",
    termos: ["horario", "funcionamento", "abre", "fecha", "aberta", "expediente", "pausa"],
    resposta:
      "A agenda está aberta **todos os dias, das 08:00 às 20:00**, sem pausa fixa. Para não atender num dia ou turno, use **Agenda › Fechar horário**. A administradora muda os horários em **Configurações › Horários**.",
  },
  {
    pergunta: "Posso marcar duas clientes no mesmo horário?",
    termos: ["sobreposto", "sobreposicao", "mesmo", "horario", "conflito", "duas", "encaixe", "choque"],
    resposta:
      "Pode. O sistema **não trava**: se o horário bater com outra cliente, aparece em vermelho \"⚠ Horário sobreposto com…\" e a Lilian decide. Na visão **Dia** os atendimentos sobrepostos aparecem lado a lado.",
  },
  {
    pergunta: "Como registro um atendimento que já começou (não foi agendado)?",
    termos: ["ja", "comecou", "esqueci", "registrar", "passado", "atrasado", "encaixe", "passou"],
    resposta:
      "Toque em **Agendar novo atendimento**, escolha a cliente e o serviço. No **Horário**, a lista de hoje mostra também os horários que já passaram, marcados \"(já passou)\". Escolha e salve. No fim, marque **Concluído**.",
  },
  {
    pergunta: "Como funciona o tempo de cada agendamento?",
    termos: ["duracao", "tempo", "intervalo", "termina", "quanto", "tempo", "slot", "varios", "servicos"],
    resposta:
      "O tempo ocupado é a **soma das durações dos serviços + 1 intervalo** entre atendimentos, que entra uma vez só, no fim. Exemplo: design 30 + buço 5 + intervalo 10 = 45 min. O valor é a soma dos preços e pode ser editado.",
  },
  {
    pergunta: "O que acontece quando marco Concluído?",
    termos: ["concluido", "realizado", "finalizar", "pagamento", "caixa", "lancar", "atendimento"],
    resposta:
      "Ao marcar **Concluído**, o sistema pede o **valor** e a **forma de pagamento** e lança no caixa sozinho, uma vez só. Valor 0 vira **brinde**. Se houve **sinal**, ele aparece e só cobra o que falta. Por isso serviço **não** se lança em \"Registrar venda\".",
  },
  {
    pergunta: "Como mando a mensagem de agendamento pelo WhatsApp?",
    termos: ["whatsapp", "mensagem", "agendamento", "confirmar", "confirmacao", "avisar", "mandar"],
    resposta:
      "Depois de salvar um agendamento (novo ou remarcado), aparece a mensagem pronta com o botão **Mandar no WhatsApp**. Para pedir confirmação depois, abra o agendamento e toque em **Pedir confirmação no WhatsApp**. Sem número no cadastro, o WhatsApp abre para escolher o contato.",
  },
  {
    pergunta: "O WhatsApp da cliente nova é obrigatório no agendamento?",
    termos: ["whatsapp", "obrigatorio", "numero", "telefone", "cliente", "nova", "sem"],
    resposta:
      "Não trava: se faltar, aparece um **aviso em vermelho**, mas dá para salvar sem número. Só um número digitado errado (sem DDD) é recusado. Na venda o WhatsApp é opcional.",
  },
  {
    pergunta: "Como marco um curso na agenda?",
    termos: ["curso", "turma", "aluna", "dias", "meio", "dia"],
    resposta:
      "No campo **Agendamento**, escolha o curso na seção **Cursos**. Meio dia ocupa 4h e dia inteiro, 8h. Em turma de vários dias, a tela sugere os dias seguintes, com **data, início e término editáveis** (confira!). A venda fica no 1º dia e os outros entram com valor 0.",
  },
  {
    pergunta: "O que é o sinal e como lanço?",
    termos: ["sinal", "antecipado", "adiantado", "entrada", "reserva"],
    resposta:
      "Sinal é um pagamento antecipado (ex.: curso). Em **Financeiro › Contas a receber**, na pendência do extrato, toque em **É sinal** e ligue ao agendamento. No **Concluído** a tela mostra o sinal e cobra só o que falta.",
  },
  {
    pergunta: "Como funciona o serviço de modelo?",
    termos: ["modelo", "combinar", "valor", "aberto"],
    resposta:
      "Em **Configurações › Serviços**, toque em **Serviço de modelo** e marque os tipos (Micro labial, Lash, Design etc.). Cada um vira \"Modelo — tipo\" com valor **a combinar**: você digita o valor no agendamento ou ao concluir. Se ficar 0, conta como brinde.",
  },
  // ---------------- Clientes
  {
    pergunta: "Qual a diferença entre lead, ganho, inativa e perdido?",
    termos: ["lead", "ganho", "ganha", "inativa", "perdido", "perdida", "status", "funil", "ativa"],
    resposta:
      "- **Lead**: contato que ainda não fez atendimento.\n- **Ganho** (ativa): já foi atendida. Vira ativa no 1º atendimento.\n- **Inativa**: está há muito tempo sem vir.\n- **Perdido**: desistiu; anote o motivo.\n\nVocê muda o status na ficha, em **Clientes**.",
  },
  {
    pergunta: "Como junto cadastros repetidos?",
    termos: ["repetido", "duplicado", "juntar", "dois", "cadastros", "mesma", "pessoa", "duplicada"],
    resposta:
      "Em **Clientes**, no quadro **Possíveis cadastros repetidos**:\n1. **Juntar**: escolha qual nome fica. Vendas, agendamentos, descontos e mensagens passam para ele.\n2. **Ver e corrigir**: mostra só as duas fichas.\n3. **São pessoas diferentes**: tira o aviso.",
  },
  {
    pergunta: "Como mudo o nome de uma cliente?",
    termos: ["nome", "mudar", "corrigir", "editar", "renomear", "errado"],
    resposta:
      "Em **Clientes**, toque no **lápis** ao lado do nome. O sistema troca também nas vendas. Se o nome já for de outra cliente, ele sugere **Juntar**.",
  },
  {
    pergunta: "Como coloco o aniversário da cliente?",
    termos: ["aniversario", "nascimento", "parabens", "data"],
    resposta:
      "Na ficha em **Clientes**, campo **Aniversário**: escolha **dia** e **mês**; o **ano é opcional**. Salva sozinho. Nos 7 dias antes, aparece o aviso com o WhatsApp de parabéns pronto.",
  },
  {
    pergunta: "Em que ordem fica a lista de clientes?",
    termos: ["ordem", "ordenar", "lista", "ultima", "visita", "mais", "gasta", "sumida"],
    resposta:
      "Você escolhe: **Quem mais gasta**, **Veio por último** ou **Sem vir há mais tempo**. Sempre pela data do **último atendimento**, nunca pela data do cadastro. Quem nunca veio fica no fim.",
  },
  {
    pergunta: "Como baixo as clientes em Excel?",
    termos: ["excel", "planilha", "baixar", "exportar", "clientes", "lista"],
    resposta:
      "Em **Clientes**, toque em **Baixar Excel**. Vem uma linha por cliente com contato, status, origem, visitas, total gasto, ticket, última visita e próximo agendamento. São dados sensíveis (LGPD): não compartilhe sem necessidade.",
  },
  {
    pergunta: "Como funcionam as mensagens de pós-atendimento?",
    termos: ["pos", "atendimento", "mensagem", "retorno", "acompanhamento", "mandar", "lembrete", "feedback"],
    resposta:
      "O sistema avisa quem precisa receber mensagem, já com o texto pronto para o WhatsApp:\n- Design: com 15 dias (retorno em 20).\n- Micro (sobrancelha e boca): com 3 dias (\"como está a pele?\"), 20 dias (feedback) e retorno em 40.\n- Limpeza de pele: com 3 dias; limpeza/dermaplaning: com 25 dias.\n- Nanofios: convite com 180 dias.\n- Curso: com 30 dias.\n\nAparece no **Início** e na ficha. Toque em **Mensagem enviada** depois de mandar.",
  },
  {
    pergunta: "Como funcionam os descontos (cupons) da inauguração?",
    termos: ["desconto", "cupom", "balao", "inauguracao", "usou"],
    resposta:
      "São os descontos da ação do balão, **válidos até 30/11/2026**. Aparecem na ficha da cliente, com lembrete pelo WhatsApp e o botão **Usou o desconto**. No filtro **Com desconto**, em Clientes, aparecem todas que têm desconto valendo.",
  },
  // ---------------- Financeiro
  {
    pergunta: "O que é o valor líquido?",
    termos: ["liquido", "bruto", "taxa", "maquininha", "ton", "diferenca"],
    resposta:
      "**Líquido = valor bruto − taxa da maquininha** (a taxa depende da forma de pagamento e das parcelas). Pix e dinheiro não têm taxa. O caixa sempre mostra bruto, taxa e líquido. As taxas ficam em **Configurações › Taxas**.",
  },
  {
    pergunta: "Como lanço uma venda de produto (ou com desconto)?",
    termos: ["venda", "produto", "desconto", "vender", "registrar", "diferenciado", "brinco"],
    resposta:
      "No Início, toque em **Registrar nova venda**:\n1. Em **Venda**, escolha o produto (o valor já vem).\n2. Para dar desconto, marque **Valor diferenciado** e digite o valor.\n3. Escolha a cliente (opcional) e a forma de pagamento.\n\nServiço **não** se lança aqui: ele entra no caixa ao marcar **Concluído** na Agenda.",
  },
  {
    pergunta: "Como lanço uma despesa?",
    termos: ["despesa", "saida", "gasto", "pagar", "comprei", "compra", "lancar"],
    resposta:
      "No **Início**, toque em **Lançar despesa**, preencha valor, data, descrição e categoria. Contas fixas (aluguel, luz etc.) se pagam em **Financeiro › Contas a pagar** com o botão **Pagar**.",
  },
  {
    pergunta: "Como corrijo ou cancelo um lançamento do caixa?",
    termos: ["corrigir", "cancelar", "errado", "lancamento", "apagar", "excluir", "editar", "estornar"],
    resposta:
      "Em **Financeiro**, toque no lançamento para corrigir ou **cancelar**. Não se exclui: o cancelado fica no histórico e sai dos totais. A Lilian corrige e cancela o que ela mesma lançou; a administradora corrige tudo.",
  },
  {
    pergunta: "Como funciona o brinde?",
    termos: ["brinde", "cortesia", "gratis", "zero", "presente"],
    resposta:
      "Brinde é uma entrada com **valor R$ 0**. Conta como atendimento e cliente atendida, mas **não** como faturamento. O total de brindes aparece à parte.",
  },
  {
    pergunta: "Como funcionam as Contas a pagar?",
    termos: ["contas", "pagar", "fixas", "aluguel", "luz", "vencimento", "atrasada", "boleto"],
    resposta:
      "Em **Financeiro › Contas a pagar** ficam as contas fixas com o dia de vencimento. Toque em **Pagar**: o sistema lança a saída no caixa para aquele vencimento. Os quadrinhos filtram entre todas, pagas, falta pagar e atrasadas. A administradora cadastra, edita e desativa contas ali.",
  },
  {
    pergunta: "Como subo o extrato da Ton e resolvo as pendências?",
    termos: ["extrato", "ton", "pendencia", "pendencias", "conciliar", "conciliacao", "banco", "pdf", "subir", "receber"],
    resposta:
      "Todo **dia 15 e 30**:\n1. Baixe o PDF do extrato na Ton.\n2. Em **Financeiro › Contas a receber**, suba o PDF. O sistema confere sozinho com o caixa.\n3. Nas pendências (entradas do banco sem venda no caixa), toque em **Lançar no caixa**, **É sinal** ou **Ignorar**.\n\nO Início lembra no prazo e fica vermelho se atrasar.",
  },
  {
    pergunta: "Crédito parcelado: como funciona a taxa?",
    termos: ["parcelado", "parcelas", "credito", "3x", "vezes", "parcela"],
    resposta:
      "Escolha **Parcelado** e o número de parcelas: a taxa da Ton depende das parcelas. \"Crédito\" sem parcelas é à vista. Para curso no cartão, marque **Repassar a taxa para a cliente** (valor = preço ÷ (1 − taxa)).",
  },
  {
    pergunta: "Como exporto o financeiro para o Excel?",
    termos: ["excel", "exportar", "planilha", "financeiro", "caixa", "baixar"],
    resposta:
      "Em **Financeiro**, escolha o período (Dia, Semana, Mês, Ano ou Total) e toque em **Exportar Excel**. Vêm duas abas: **Lançamentos** e **Resumo**.",
  },
  // ---------------- Produtos e serviços
  {
    pergunta: "Como mudo o preço ou a duração de um serviço?",
    termos: ["preco", "precos", "servico", "servicos", "mudar", "mudo", "muda", "alterar", "altero", "troco", "trocar", "aumentar", "diminuir", "duracao", "valor", "tabela", "reajuste"],
    resposta:
      "Em **Configurações › Serviços** (só administradora), toque no serviço, altere preço, duração ou retorno e salve. Para tirar da agenda, **desative** em vez de excluir. Serviço novo qualquer usuária cadastra em **Produtos e serviços › Novo serviço**.",
  },
  {
    pergunta: "Como funciona o estoque e o inventário?",
    termos: ["estoque", "inventario", "contagem", "produto", "acabou", "repor", "quinzenal"],
    resposta:
      "Cada venda de produto **baixa o estoque sozinha** (cancelar devolve). A cada **15 dias**, toque em **Fazer inventário** em Produtos: conte e registre, e o sistema ajusta. O Início avisa quando passa do prazo. O estoque pode ficar negativo até o inventário corrigir.",
  },
  // ---------------- Metas e resultados
  {
    pergunta: "Como a meta do mês é calculada?",
    termos: ["meta", "calculada", "calculo", "formula", "como", "funciona", "faturamento"],
    resposta:
      "**Meta = (custos fixos + pessoas + lucro desejado) ÷ (1 − taxa média da maquininha − % de insumos).**\n- Os custos fixos vêm de **Contas a pagar** sozinhos.\n- Extras (ex.: insumos), lucro e ticket ficam em **Resultados › Ajustar números** (só administradora).\n- Até o fim de 2026 a meta é \"se pagar\" (lucro 0).\n- Os dias de atendimento podem ser **terça a sábado** ou **terça a domingo**.",
  },
  {
    pergunta: "O que é ticket médio?",
    termos: ["ticket", "medio", "media", "por", "atendimento"],
    resposta:
      "**Ticket médio = faturamento dos serviços pagos ÷ número desses atendimentos.** Mostra quanto, em média, cada atendimento rende. Aparece em **Resultados**.",
  },
  {
    pergunta: "O que mostra a tela Resultados?",
    termos: ["resultados", "graficos", "painel", "dashboard", "indicadores", "relatorio"],
    resposta:
      "Em **Resultados** você escolhe o período (Desde/Até) e vê:\n- Arrecadado, gasto e saldo.\n- Atendimentos, ticket, clientes novas e taxas.\n- Entradas × saídas por mês e formas de pagamento.\n- Atendimentos × esperado na meta.\n- O que mais sai (serviços, produtos, cursos).\n- Leads e a **prioridade de abordagem**.\n\nQuase tudo é clicável. A **Meta do mês** fica no fim da página.",
  },
  {
    pergunta: "O que é a prioridade de abordagem?",
    termos: ["prioridade", "abordar", "abordagem", "quem", "procurar", "contatar", "ligar"],
    resposta:
      "Em **Resultados › Leads**: lista quem procurar primeiro. Entram leads e clientes sumidas **sem agendamento marcado**. Sobem na lista quem tem **desconto para usar** (mais ainda se vence em até 7 dias), lead parado há mais tempo, cliente inativa e aniversário no mês. Toque no nome para abrir a ficha e no botão para o WhatsApp.",
  },
  // ---------------- Checklist, usuárias, geral
  {
    pergunta: "Como funciona o checklist?",
    termos: ["checklist", "tarefa", "tarefas", "pedir", "lista", "fazer"],
    resposta:
      "Em **Checklist**, a Ana pede tarefas para a Lilian e vice-versa. Etiquetas: Clientes ativos, Novos clientes e Studio. A repetição pode ser única (com prazo), diária ou semanal. O mini painel mostra feitas, pendentes e atrasadas. **Tirar da lista** desativa a tarefa.",
  },
  {
    pergunta: "Como crio uma usuária ou mudo o acesso de alguém?",
    termos: ["usuaria", "usuario", "acesso", "conta", "senha", "login", "papel", "administradora", "profissional", "criar"],
    resposta:
      "Em **Configurações › Usuárias** (só administradora): crie a conta com e-mail e senha e escolha **Administradora** (acesso total) ou **Profissional** (agenda e clientes; financeiro e metas só leitura). Também dá para desativar. Sempre fica pelo menos uma administradora ativa.",
  },
  {
    pergunta: "O que eu posso ajustar sozinha e o que preciso pedir à Marilia?",
    termos: ["ajustar", "sozinha", "pedir", "marilia", "mudar", "sistema", "posso"],
    resposta:
      "**Você ajusta sozinha:** preços, durações e retorno dos serviços; serviços de modelo; produtos e estoque; taxas; horários e bloqueios; contas fixas; números da meta; usuárias; checklist; dados e status das clientes; juntar cadastros; corrigir ou cancelar lançamentos.\n\n**Pede à Marilia:** regras novas, telas, filtros ou relatórios novos, textos e prazos das mensagens de pós-atendimento, importações, pacotes/assinaturas, anamnese e agendamento online.",
  },
  {
    pergunta: "Quais são os serviços e preços da Black LS?",
    termos: ["black", "combo", "promocao", "friday", "novembro"],
    resposta:
      "**Black LS — 28, 29 e 30/11** (combo = 2 procedimentos por um valor):\n- **Combo 1** (sem retoque): Nanofios + Micro labial — R$ 689,90\n- **Combo 2**: Nanofios + Dermaplaning **ou** Lash lifting — R$ 599,90\n- **Combo 3**: Brow lamination + Dermaplaning **ou** Lash lifting — R$ 199,90\n- **Nanofios** — R$ 489,90 · **Shadow** — R$ 349,90\n\nPagamento: Pix, débito ou crédito; a partir de R$ 150,00 em até 3x. Na agenda, escolha o serviço \"Black LS · …\" certo.",
  },
];

// ---------------------------------------------------------------------------
// Busca grátis (sem IA)
// ---------------------------------------------------------------------------
const PARADAS = new Set(
  "a o e de da do das dos um uma uns umas que como para por com no na nos nas em eu ela ele se sao ser esta isso esse essa qual quais quando onde porque pq meu minha tem ter vou vai faz fazer funciona the ou mais muito".split(" ")
);

export function palavras(t: string) {
  return t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((p) => p.length > 1 && !PARADAS.has(p));
}

const raiz = (p: string) => (p.length > 5 ? p.slice(0, 5) : p);

/** Pergunta sobre os NÚMEROS do studio ou pedido de opinião/decisão → precisa da Lis com IA. */
export function precisaDosDados(pergunta: string) {
  const bruto = pergunta
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  const t = ` ${palavras(pergunta).join(" ")} `;
  if (/\b(quanto|quantos|quantas)\b/.test(t)) return true;
  // "Como faço…", "O que é…", "Onde…" são dúvidas do sistema (menos "como estamos")
  if (/^(como|o que|oque|onde|qual|quais|pra que|para que)\b/.test(bruto) && !/\bestamos\b/.test(t)) return false;
  return /\b(estamos|faturamos|faturei|vendemos|vendi|ganhamos|lucro|lucramos|prejuizo|sugere|sugestao|sugestoes|devo|deveria|vale pena|compensa|melhor|pior|analise|analisa|compare|comparar|esse mes|este mes|essa semana|esta semana|mes passado|proxima semana|batemos|bater|batendo|crescer|aumentar|vazio|vazios|cheio|ranking|top)\b/.test(
    t
  );
}

/** Melhor resposta pronta para a pergunta (ou null se nenhuma bate o suficiente). */
export function buscarFaq(pergunta: string): { faq: Faq; nota: number } | null {
  const ps = palavras(pergunta).map(raiz);
  if (!ps.length) return null;
  let melhor: { faq: Faq; nota: number } | null = null;
  for (const f of FAQ) {
    const daPergunta = new Set(palavras(f.pergunta).map(raiz));
    const dosTermos = new Set(f.termos.map(raiz));
    let pontos = 0;
    for (const p of new Set(ps)) {
      if (dosTermos.has(p)) pontos += 2;
      else if (daPergunta.has(p)) pontos += 1.5;
    }
    const nota = pontos / Math.max(2, Math.min(ps.length, 6));
    if (!melhor || nota > melhor.nota) melhor = { faq: f, nota };
  }
  return melhor && melhor.nota >= 0.9 ? melhor : null;
}

/** Perguntas parecidas (para sugerir quando a IA não está ligada). */
export function parecidas(pergunta: string, limite = 3) {
  const ps = new Set(palavras(pergunta).map(raiz));
  return FAQ.map((f) => ({
    f,
    n: [...new Set([...f.termos.map(raiz), ...palavras(f.pergunta).map(raiz)])].filter((p) => ps.has(p)).length,
  }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, limite)
    .map((x) => x.f);
}
