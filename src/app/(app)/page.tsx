import { CalendarDays, Cake, Target, TrendingUp, UserRoundCheck, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { getPerfil, isAdmin } from "@/lib/auth";
import { formatDataExtenso, saudacao } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Atalho = { href: string; titulo: string; descricao: string; icon: typeof Wallet };

const ATALHOS_ADMIN: Atalho[] = [
  { href: "/financeiro", titulo: "Faturamento do mês", descricao: "Receita x meta e projeção", icon: Wallet },
  { href: "/metas", titulo: "Metas", descricao: "Meta x realizado por indicador", icon: Target },
  { href: "/agenda", titulo: "Agenda de hoje", descricao: "Horários e confirmações", icon: CalendarDays },
  { href: "/clientes", titulo: "Clientes", descricao: "Retornos e aniversariantes", icon: Users },
];

const ATALHOS_PROFISSIONAL: Atalho[] = [
  { href: "/agenda", titulo: "Atendimentos de hoje", descricao: "Status e WhatsApp da cliente", icon: CalendarDays },
  { href: "/clientes", titulo: "Fichas das clientes", descricao: "Dados, anamnese e histórico", icon: UserRoundCheck },
  { href: "/clientes", titulo: "Aniversariantes", descricao: "Clientes que fazem aniversário na semana", icon: Cake },
  { href: "/financeiro", titulo: "Faturamento", descricao: "Acompanhar o mês (leitura)", icon: TrendingUp },
];

export default async function InicioPage() {
  const perfil = await getPerfil();
  const admin = isAdmin(perfil);
  const atalhos = admin ? ATALHOS_ADMIN : ATALHOS_PROFISSIONAL;
  const primeiroNome = perfil.nome.split(" ")[0];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-muted-foreground text-sm first-letter:uppercase">{formatDataExtenso(new Date())}</p>
        <h1 className="mt-1 text-4xl font-semibold">
          {saudacao()}, {primeiroNome}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {admin
            ? "Aqui você acompanha faturamento, metas e pendências do studio."
            : "Aqui ficam seus atendimentos do dia e as fichas das clientes."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {atalhos.map(({ href, titulo, descricao, icon: Icon }) => (
          <Link key={titulo} href={href} className="group">
            <Card className="group-hover:border-primary/40 h-full gap-3 py-5 transition-colors">
              <CardHeader className="flex items-center gap-4 px-5">
                <span className="bg-secondary text-primary flex size-11 shrink-0 items-center justify-center rounded-full">
                  <Icon className="size-5" />
                </span>
                <div>
                  <CardTitle className="text-base">{titulo}</CardTitle>
                  <CardDescription>{descricao}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="bg-secondary/50 border-dashed">
        <CardContent className="text-muted-foreground text-sm">
          O painel completo do dia (agenda de hoje, faturamento x meta, aniversariantes, retornos e
          confirmações de amanhã) chega na fase 6, depois que agenda, clientes e financeiro
          estiverem prontos.
        </CardContent>
      </Card>
    </div>
  );
}
