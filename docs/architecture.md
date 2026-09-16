# MB Nexus — Work OS Corporativo — Arquitetura

> Entregável obrigatório antes da implementação (ver `docs/master-prompt.md`, seção 59).
> Este documento cobre: arquitetura geral, mapa de módulos, estrutura de páginas, fluxo de
> permissões, modelo de banco, relacionamento das tabelas, estratégia de RLS, arquitetura de
> integração Microsoft, arquitetura de e-mail, estrutura de pastas e roadmap de implementação.

## 1. Visão geral

MB Nexus é um Work OS corporativo: uma única base de dados e uma única definição de cada
entidade (organização, usuário, projeto, tarefa, evento, nota...) consumida por múltiplas
visualizações (Home, Lista, Kanban, Calendário, Gantt, Dashboards, Relatórios). Nenhuma view
duplica dados — todas leem/escrevem a mesma linha através de repositórios compartilhados.

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (SPA)                        │
│   React + TypeScript + Vite + Tailwind + shadcn/ui            │
│   - features/* (tarefas, projetos, kanban, calendário...)     │
│   - permissions/* (RBAC client-side, apenas para UX)           │
│   - services/* + repositories/* (acesso a dados via Supabase)  │
└───────────────┬─────────────────────────────────────────────┘
                │ supabase-js (PostgREST + Realtime + Auth + Storage)
┌───────────────▼─────────────────────────────────────────────┐
│                          Supabase                             │
│  Postgres (schema relacional + RLS)                           │
│  Auth (email/senha + OAuth Microsoft Entra ID)                 │
│  Storage (anexos, avatares)                                    │
│  Edge Functions (integrações Microsoft Graph, envio de e-mail, │
│  automações agendadas — nunca segredos no frontend)             │
└───────────────┬─────────────────────────────────────────────┘
                │
        ┌───────┴────────┐
        ▼                ▼
  Microsoft Graph    SMTP Locaweb
  (Teams/Outlook)    (EmailProvider)
```

Princípios (seção 60): simplicidade > esperteza, segurança em camadas (RLS + validação
server-side + client-side apenas para UX), baixo acoplamento entre integrações e regras de
negócio, performance desde o início (paginação, índices, queries seletivas).

## 2. Mapa de módulos (por fase — ver seção 11 Roadmap)

| Módulo | Fase | Descrição |
|---|---|---|
| Auth & Sessão | 1 | Login, sessão, perfil, primeiro login por papel |
| Hierarquia & Organização | 1 | Empresa → Gerência → Coordenação → Equipe → Funcionário |
| RBAC / Permissões | 1 | Papéis, permissões, escopo hierárquico |
| Layout / Shell | 1 | Sidebar retrátil, Topbar, Command Palette |
| Home | 1 (básica) → 6 (avançada) | Home adaptativa por papel |
| Tarefas | 2 | CRUD, subtarefas, comentários, checklist, tags |
| Projetos | 3 | CRUD, fases, membros, progresso |
| Views (Lista/Kanban/Calendário/Gantt) | 4 | Múltiplas visualizações da mesma entidade |
| Notas | 5 | Páginas, blocos, rich text |
| Gestão (Workload/Dashboards/Relatórios) | 6 | Indicadores de equipe/coordenação/gerência |
| Automação/Notificações/E-mail | 7 | Regras, fila de e-mail, recorrência |
| Integrações Microsoft | 8 | Teams/Outlook via Graph |
| Ideias / Melhoria contínua | 9 | Central de ideias → projeto |

## 3. Estrutura de páginas (rotas)

```
/login
/onboarding

/home                         Home adaptativa (funcionário | gestão | executiva)
/tasks                        Minhas tarefas (lista + filtros salvos)
/projects                     Lista de projetos
/projects/:id                 Detalhe do projeto (abas: overview, tarefas, gantt, docs, membros)
/kanban/:projectId?
/calendar
/notes/:pageId?
/ideas
/dashboards/:id?
/team                         Minha equipe (líder/coordenador/gerente)
/workload
/reports
/settings/*                   perfil, notificações, e-mail, integrações,
                               organização, usuários, hierarquia, permissões,
                               status, tags, automação, templates, auditoria
```

Cada rota é protegida por um `RequirePermission`/`RequireRole` no roteador; itens de menu e
ações são renderizados condicionalmente a partir do mesmo mapa de permissões (fonte única).

## 4. Fluxo de permissões (RBAC + escopo hierárquico)

```
Usuário autenticado
  └─ possui 1..N user_roles (role em um escopo: global | management_unit | department | team)
       └─ role possui N role_permissions (permission: recurso.ação)
            └─ permission é avaliada em runtime contra:
                 1) o papel (o que a ação permite),
                 2) o escopo do papel (sobre qual fatia da hierarquia),
                 3) a relação hierárquica do alvo com o escopo do usuário
                    (o alvo está dentro da subárvore gerência→coordenação→equipe do usuário?)

SUPER ADMIN  → escopo global, todas as permissões.
GERENTE      → escopo = sua(s) management_unit(s); enxerga toda a subárvore
               (coordenações → equipes → funcionários) abaixo dela.
COORDENADOR  → escopo = seu(s) department(s) (coordenação); enxerga equipes/funcionários abaixo.
LÍDER        → escopo = sua(s) team(s).
FUNCIONÁRIO  → escopo = si mesmo (+ o que for atribuído/compartilhado explicitamente).
```

Decisão de acesso = `tem_permissão(papel, ação)` **E** `alvo ∈ subárvore(escopo_do_usuário)`.
Isso é implementado duas vezes por design (defesa em profundidade):
- **Client-side** (`permissions/`): decide o que renderizar (menus, botões) — UX apenas.
- **Server-side** (Postgres RLS + funções `SECURITY DEFINER`): decisão real de acesso a dados.
  O client nunca é a fonte de verdade.

## 5. Modelo de dados — relacionamento das tabelas

```
organizations 1─* management_units 1─* departments 1─* teams 1─* team_members *─1 profiles
organizations 1─* profiles
profiles 1─1 auth.users (Supabase Auth)

roles *─* permissions          (via role_permissions)
profiles *─* roles             (via user_roles, com scope_type + scope_id)

projects *─1 management_units / departments / teams (área responsável)
projects 1─* project_phases
projects 1─* project_members (*─1 profiles)
projects 1─* tasks

tasks 1─* task_assignees (*─1 profiles)     -- múltiplos responsáveis
tasks 1─* task_subtasks (auto-referência: parent_task_id)
tasks 1─* task_dependencies (self *─*, tipo FS/SS/FF)
tasks 1─* task_comments
tasks 1─* task_attachments
tasks 1─* task_checklists
tasks *─* tags (via task_tags)

events 1─* event_attendees (*─1 profiles)
notes 1─* note_blocks (+ self-referência para subpáginas: parent_note_id)
dashboards 1─* dashboard_widgets

notifications *─1 profiles
notification_preferences 1─1 profiles

automations 1─* automation_runs

ideas 1─* idea_comments; idea pode originar 1 project (converted_project_id)

audit_logs *─1 profiles (actor), entidade genérica (entity_type + entity_id)

email_templates
email_queue *─1 email_templates

integrations 1─* integration_tokens (tokens nunca expostos ao frontend)
```

Todas as tabelas usam `id uuid default gen_random_uuid()`, `created_at`/`updated_at`
(`updated_at` via trigger), e `organization_id` para isolamento multi-tenant (mesmo operando
como single-tenant hoje — mantém o desenho pronto para multi-empresa).

Ver DDL completo em `supabase/migrations/`.

## 6. Estratégia de RLS (Row Level Security)

Regras gerais aplicadas em **todas** as tabelas de dados de negócio:

1. **RLS habilitado em 100% das tabelas** desde a primeira migration — nenhuma tabela fica
   aberta "temporariamente".
2. **Funções auxiliares `SECURITY DEFINER`** em `public` (não em `auth`) calculam, para o
   usuário autenticado (`auth.uid()`):
   - `current_profile_id()`
   - `is_super_admin()`
   - `managed_management_unit_ids()` / `managed_department_ids()` / `managed_team_ids()`
     (subárvore sob o escopo dos papéis do usuário)
   - `is_in_scope(target_profile_id)` (o alvo está sob a hierarquia do usuário?)
   Essas funções evitam recursão de RLS e centralizam a lógica de escopo em um único lugar
   testável, em vez de repetir subqueries em cada policy.
3. **Policies por tabela**, no padrão:
   - `select`: linha pertence ao próprio usuário **OU** ao seu escopo hierárquico **OU**
     `is_super_admin()`.
   - `insert`/`update`: mesma regra + validação de papel (ex.: só COORDENADOR+ cria projeto).
   - `delete`: restrito a criador + papéis de gestão dentro do escopo, nunca a FUNCIONÁRIO.
4. **Exemplo (seção 29)**: Funcionário A não enxerga tarefas privadas de B — policy de `tasks`
   exige que o usuário seja o criador, esteja em `task_assignees`, ou esteja em
   `is_in_scope(task.owner)`. Gerente só enxerga sua estrutura — `is_in_scope` usa
   `managed_*_ids()`, nunca a organização inteira.
5. Toda escrita sensível também é revalidada em funções Postgres (`security definer`) chamadas
   via RPC quando a lógica é complexa demais para uma policy declarativa (ex.: transferir
   funcionário de equipe, aprovar ideia → criar projeto).
6. Uploads (Storage) usam policies equivalentes por bucket, path prefixado por
   `organization_id/entity_type/entity_id`.

## 7. Arquitetura de integração Microsoft (Graph / Teams / Outlook)

```
Frontend                Edge Function (Deno)              Microsoft Graph
"Criar reunião Teams" ─▶ POST /functions/v1/ms-meetings ─▶ POST /users/{id}/onlineMeetings
                                │                                   │
                          lê integration_tokens                     │
                          (server-side, criptografado)  ◀───────────┘
                          grava events + link da reunião
                          retorna { joinUrl } ao frontend
```

- **OAuth**: Microsoft Entra ID (OAuth2 Auth Code + PKCE) via Supabase Auth como provider
  adicional (login) **e**, separadamente, um fluxo de consentimento de aplicação (client
  credentials ou on-behalf-of) para a integração Graph (criar reunião, ler calendário),
  armazenado em `integration_tokens` — nunca no localStorage/frontend.
- **Camadas separadas** (seção 12): `integrations/microsoft/graphClient.ts` (chamadas Graph),
  regra de negócio em `services/meetings.ts` (Edge Function), UI em `features/meetings/*`
  apenas consome um endpoint próprio (`POST /ms-meetings`), nunca fala com Graph diretamente.
- Refresh token e client secret ficam em variáveis de ambiente da Edge Function / secret
  manager do Supabase, nunca em `.env` do frontend (que só tem `VITE_*` públicas).

## 8. Arquitetura de e-mail

```
EmailProvider (interface)
  ├─ MicrosoftGraphEmailProvider   (sendMail via Graph — mesma credencial de app)
  └─ LocawebSMTPProvider           (nodemailer/SMTP, credenciais em secret manager)

email_queue (tabela) ──▶ Edge Function "process-email-queue" (cron) ──▶ EmailProvider ativo
  - status: pending | sending | sent | failed
  - tentativas, último erro, destinatário, template usado
email_templates (tabela) — variáveis interpoladas server-side
```

- Nenhuma credencial SMTP/Graph no frontend; o frontend apenas grava uma linha em
  `email_queue` (via RPC) ou reage a triggers de automação.
- Fila evita bloquear requisições da aplicação e permite retry com backoff.
- Provider é escolhido por configuração de organização (`integrations` table), permitindo
  trocar Locaweb ⇄ Graph sem tocar em regra de negócio.

## 9. Estrutura de pastas (frontend)

```
src/
  app/                 bootstrap, router, providers globais
  components/          UI genérica (design system, shadcn wrappers)
  features/            um módulo por pasta (tasks, projects, kanban, calendar, gantt,
                       notes, ideas, dashboards, workload, reports, hierarchy, settings)
    <feature>/
      components/
      hooks/
      api.ts           chamadas via repositories, tipadas
  hooks/               hooks compartilhados (useAuth, usePermission, useDebounce...)
  services/            regra de negócio de mais alto nível, orquestra repositories
  repositories/        acesso direto a dados (Supabase queries), 1 por entidade
  integrations/         microsoft/ (graphClient, teams, outlook), email/ (providers)
  permissions/         mapa de permissões, hooks RequirePermission/RequireRole
  types/               tipos gerados do schema + tipos de domínio
  utils/               funções puras
  lib/                 clientes de infra (supabase client, query client)
  pages/               componentes de rota (finos, montam features)
supabase/
  migrations/          DDL versionado
  functions/           Edge Functions (ms-meetings, process-email-queue, automations)
  seed.sql             dados de desenvolvimento
docs/                  este documento + demais docs operacionais
```

## 10. Design system & UX (resumo — seções 32/51/52)

Tailwind + shadcn/ui como base de componentes; tokens próprios de cor/tipografia/espaçamento
em `src/index.css` (CSS variables), suportando `light`/`dark`/`system`. Tipografia: Inter.
Estados obrigatórios em todo componente de dado assíncrono: loading (skeleton), empty state,
erro tratado (nunca `console.log` como tratamento — seção 56).

## 11. Roadmap de implementação

| Fase | Entregável | Status |
|---|---|---|
| 1 | Fundação: projeto, auth, schema completo (DDL), hierarquia, RBAC, sidebar/topbar, Home básica | **concluída** |
| 2 | Tarefas (CRUD, subtarefas, comentários, responsáveis, prioridade/status, filtros) | **concluída (TDD)** |
| 3 | Projetos (CRUD, fases, membros, progresso calculado a partir das tarefas) | **concluída (TDD)** |
| 4 | Views: Lista, **Kanban** (concluídos, TDD) · Calendário, Gantt | em andamento |
| 5 | Notas (páginas, blocos, rich text) | planejado |
| 6 | Gestão: workload, dashboards, relatórios | planejado |
| 7 | Automação: regras, notificações, e-mail, recorrência | planejado |
| 8 | Integrações Microsoft (Graph/Teams/Outlook) + SMTP Locaweb | planejado |
| 9 | Central de Ideias / melhoria contínua | planejado |

Cada fase só inicia com a anterior estável (build limpo, RLS testado, sem dados mockados como
solução definitiva — seção 54).
