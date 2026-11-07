# Studio Lilian Santos — Sistema Administrativo

CRM, agenda, financeiro e metas do Studio Lilian Santos.
Next.js (App Router) + TypeScript + Tailwind + shadcn/ui + Supabase, hospedado na Vercel.

O briefing completo e a ordem das fases estão em [`CLAUDE.md`](./CLAUDE.md).

## Status

- [x] **Fase 1 — Base:** projeto, login, layout com menu, tema visual, preparo para deploy
- [x] **Fase 2 — Configurações e serviços:** serviços, horários, regras, taxas da maquininha, usuárias
- [ ] Fase 3 — Clientes
- [ ] Fase 4 — Agenda
- [ ] Fase 5 — Financeiro (adiantado: caixa com lançamentos, resumo dia/mês/ano e exportação Excel)
- [ ] Fase 6 — Metas e painel inicial
- [ ] Fase 7 — Ajustes finais

## 1. Criar o projeto no Supabase

1. Crie um projeto em [supabase.com](https://supabase.com) (região: **South America (São Paulo)**).
2. Em **SQL Editor**, rode **em ordem** cada arquivo de `supabase/migrations/` (`0001_...`, `0002_...`). Todos podem ser rodados de novo sem duplicar nada.
3. Em **Authentication → Sign In / Providers**, deixe **Email** ativo e **desligue "Allow new users to sign up"** (sem cadastro público).
4. Em **Authentication → Users → Add user → Create new user**, crie as três contas (marque *Auto Confirm User*):
   - Ana Jessica, Lilian e Marilia.
5. Defina nomes e papéis no **SQL Editor** (troque os e-mails):

   ```sql
   update public.perfis p set nome = 'Ana Jessica', papel = 'admin'
     from auth.users u where u.id = p.id and u.email = 'ana@exemplo.com';

   update public.perfis p set nome = 'Marilia', papel = 'admin'
     from auth.users u where u.id = p.id and u.email = 'marilia@exemplo.com';

   update public.perfis p set nome = 'Lilian Santos', papel = 'profissional'
     from auth.users u where u.id = p.id and u.email = 'lilian@exemplo.com';
   ```

6. Em **Project Settings → API**, copie a **Project URL** e a **anon public key**.

## 2. Rodar localmente

```bash
cp .env.example .env.local   # preencha com a URL e a anon key
npm install
npm run dev
```

Abra http://localhost:3000 e entre com uma das contas.

## 3. Deploy na Vercel

1. Em [vercel.com/new](https://vercel.com/new), importe o repositório do GitHub.
2. Em **Environment Variables**, adicione `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Clique em **Deploy**. A cada push na branch principal a Vercel publica automaticamente.
4. No Supabase, em **Authentication → URL Configuration**:
   - **Site URL:** a URL da Vercel (ex.: `https://studio-lilian-santos.vercel.app`)
   - **Redirect URLs:** adicione `https://studio-lilian-santos.vercel.app/**`

## Senhas

- Na tela de login, **Esqueci minha senha** envia um link por e-mail; o link abre a tela **Nova senha**.
- A administração também pode enviar o link pelo Supabase (**Authentication → Users → ⋯ → Send password recovery**).
- O link deve ser aberto no mesmo aparelho e navegador em que foi pedido, e vale uma única vez.

## Perfis de acesso

| Perfil | Quem | Acesso |
| --- | --- | --- |
| `admin` | Ana Jessica, Marilia | Tudo |
| `profissional` | Lilian | Agenda, clientes, anamnese, painel. Financeiro e metas só leitura. Sem configurações. |

Toda tabela tem RLS ativo; somente usuárias autenticadas e ativas acessam dados. Nenhuma rota pública expõe dados de clientes.

## Scripts

- `npm run dev` — servidor de desenvolvimento
- `npm run build` — build de produção
- `npm run lint` — ESLint
