# MB Nexus — Work OS Corporativo

Plataforma corporativa de gestão de trabalho, projetos, tarefas, produtividade,
documentação e melhoria contínua. Ver `docs/architecture.md` para a arquitetura
completa (módulos, modelo de dados, RLS, integrações) e o roadmap de fases.

**Status atual: Fases 1–6 concluídas.** Autenticação, hierarquia
organizacional, RBAC, layout (sidebar/topbar/command palette) e uma Home
adaptativa por papel (Fase 1); o módulo de Tarefas — CRUD, subtarefas,
comentários, múltiplos responsáveis, prioridade/status editáveis inline e
filtros (Fase 2); o módulo de Projetos — CRUD, fases, membros e progresso
calculado automaticamente a partir das tarefas vinculadas (Fase 3); as
quatro views sobre essa mesma tarefa — **Lista, Kanban, Calendário e
Gantt** (Fase 4); o módulo de **Notas** — páginas e subpáginas em árvore,
blocos (parágrafo, título, código, checklist com itens marcáveis), e
salvamento automático com indicador "Salvo"/"Salvando..."/"Alterações não
salvas" (Fase 5); e a camada de **Gestão** — Minha Equipe com carga de
trabalho calculada e classificada (baixa/normal/elevada/sobrecarga),
Dashboards com indicadores e gráficos (Recharts) em tempo real, e
Relatórios de produtividade com exportação CSV (Fase 6) — estão prontos.
Nenhuma view duplica dados: todas leem e escrevem através dos mesmos
`src/repositories/taskRepository.ts` / `projectRepository.ts` /
`eventRepository.ts` / `noteRepository.ts`. O Gantt lê o progresso e as
dependências (`task_dependencies`) de cada tarefa e permite editar
início/fim por um campo de data acessível em cada linha (arrastar-e-soltar
para redimensionar a barra fica para uma iteração futura — documentado como
tal, não fingido). Toda a lógica de negócio e a maior parte da UI foram
desenvolvidas com TDD (`npm run test`). As demais fases (automação,
integrações Microsoft, ideias) têm o **schema de banco e RLS já definidos**
(`supabase/migrations/`), mas a UI ainda não foi construída — as rotas
existem como placeholders honestos que dizem em qual fase serão
implementadas, em vez de simular funcionalidade.

## Stack

- Frontend: React + TypeScript + Vite + Tailwind CSS + componentes no estilo shadcn/ui
- Backend: Supabase (Postgres + Auth + Storage + Edge Functions)
- Autorização: RBAC com escopo hierárquico, aplicado via Row Level Security

## Instalação

Pré-requisitos: Node 20+, e um projeto Supabase (local via CLI ou hospedado).

```bash
npm install
cp .env.example .env
# preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em .env
npm run dev
```

### Banco de dados

As migrations em `supabase/migrations/` criam o schema completo (organizações,
hierarquia, RBAC, projetos, tarefas, notas, eventos, dashboards, notificações,
ideias, automações/e-mail, integrações, auditoria) com RLS habilitado em toda
tabela de dados de negócio.

Com o [Supabase CLI](https://supabase.com/docs/guides/cli) instalado:

```bash
supabase login
supabase link --project-ref <seu-project-ref>
supabase db push          # aplica as migrations num projeto remoto
# ou, para desenvolvimento local com Docker:
supabase start
supabase db reset         # aplica migrations + supabase/seed.sql
```

`supabase/seed.sql` popula um ambiente de desenvolvimento com 1 organização,
3 gerências, 4 coordenações, 6 equipes, 20 funcionários, 10 projetos e ~100
tarefas (nomes fictícios). O usuário Super Admin do seed usa o e-mail
configurado no `.env`/ambiente de quem gerou o seed; todos os usuários seedados
têm a senha `Senha123!`. **Nunca rode o seed contra produção.**

As migrations e o seed foram validados executando-os ponta a ponta contra um
Postgres real nesta sessão (com um schema `auth` mínimo simulando o do
Supabase) — não apenas revisados por leitura. Esse processo encontrou e
corrigiu duas recursões infinitas reais em políticas de RLS (profiles↔profiles
e projects↔project_members/tasks↔task_assignees), documentadas como
comentários nas migrations 0004/0007/0009.

### Variáveis de ambiente

Ver `.env.example`. Resumo:

| Variável | Onde é usada | Segredo? |
|---|---|---|
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Frontend | Não (chave pública, protegida por RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_DB_URL` | CLI / Edge Functions | **Sim** — nunca no frontend |
| `MS_TENANT_ID` / `MS_CLIENT_ID` / `MS_CLIENT_SECRET` | Edge Functions (Fase 8, Microsoft Graph) | **Sim** |
| `LOCAWEB_SMTP_*` | Edge Functions (Fase 7, e-mail) | **Sim** |

## Scripts

```bash
npm run dev        # servidor de desenvolvimento
npm run build       # typecheck + build de produção
npm run typecheck   # apenas typecheck
npm run lint         # eslint
npm run test         # roda a suíte de testes (Vitest) uma vez
npm run test:watch   # Vitest em modo watch, para desenvolvimento TDD
npm run preview     # servir o build de produção localmente
```

## Estrutura de pastas

Ver `docs/architecture.md` seção 9. Resumo:

```
src/app/          shell (rotas, layout, sidebar, topbar, command palette)
src/features/     um módulo por domínio (auth, hierarchy, home, notifications...)
src/pages/        componentes de rota
src/repositories/ acesso a dados (Supabase), 1 arquivo por entidade
src/permissions/  RBAC client-side (apenas UX — a decisão real é RLS)
src/components/ui/ design system (estilo shadcn/ui)
src/types/        tipos de domínio (espelham supabase/migrations/*.sql)
src/test/         infraestrutura de teste (setup do Vitest, mock do Supabase)
supabase/migrations/  DDL versionado + RLS
supabase/seed.sql      dados de desenvolvimento
```

## Permissões e segurança

O acesso é decidido duas vezes por desenho (defesa em profundidade):

1. **Client-side** (`src/permissions/`): decide o que renderizar. Apenas UX.
2. **Server-side** (RLS no Postgres): a decisão real. Toda tabela de negócio
   tem RLS habilitado desde a migration que a cria; nenhuma fica aberta
   "temporariamente".

Detalhes da estratégia de escopo hierárquico (gerência → coordenação → equipe)
e os helpers `SECURITY DEFINER` usados para evitar recursão de política estão
em `docs/architecture.md` seção 6.

## Testes

Os módulos de Tarefas (Fase 2) e Projetos (Fase 3) foram desenvolvidos com
TDD: para cada função de negócio ou componente, primeiro o teste foi escrito
e confirmado vermelho (rodando de verdade, não só lido), depois a
implementação mínima para ficar verde, com refatoração ao final de cada
ciclo — por exemplo, `src/lib/progress.ts` nasceu de extrair a lógica de
"progresso calculado a partir dos itens concluídos", antes duplicada em
tarefas e projetos, para um único helper testado uma vez e reusado nos dois.
Cobertura atual (199 testes):

- `src/lib/progress.test.ts` — a regra genérica de progresso.
- `src/features/tasks/taskLogic.test.ts` e `src/features/projects/projectLogic.test.ts`
  — regras puras (agrupamento por prazo, progresso a partir de
  subtarefas/tarefas vinculadas, ordenação, filtros).
- `src/repositories/taskRepository.test.ts` e `src/repositories/projectRepository.test.ts`
  — CRUD, responsáveis/membros, comentários, subtarefas/fases, contra um
  mock fiel do query builder do Supabase (`src/test/supabaseMock.ts`), sem
  tocar rede.
- `src/pages/Tasks.test.tsx`, `src/features/tasks/TaskDetailPanel.test.tsx`,
  `src/pages/Projects.test.tsx` e `src/features/projects/ProjectDetailPanel.test.tsx`
  — comportamento de UI (filtros, criação rápida, edição inline de status,
  subtarefas/fases, comentários, responsáveis/membros) com Testing Library.
- `src/features/tasks/kanbanLogic.test.ts`, `src/features/tasks/KanbanBoard.test.tsx`
  e `src/pages/Kanban.test.tsx` — agrupamento por coluna e mudança de status
  testados via um `<select>` acessível em cada card (o arrastar-e-soltar em
  si com dnd-kit é um teste manual/visual — simular a física real de um
  drag por ponteiro no jsdom não tem valor de sinal).
- `src/features/calendar/calendarLogic.test.ts`, `src/repositories/eventRepository.test.ts`,
  `src/features/calendar/CalendarGrid.test.tsx` e `src/pages/Calendar.test.tsx`
  — grade mensal, mistura de tarefas/eventos por dia, e o deslocamento de
  data (preservando horário e duração de um evento) testado via um
  `<input type="date">` acessível por item, incluindo o roteamento correto
  entre `updateTask` (para uma tarefa) e `updateEvent` (para um evento).
- `src/features/gantt/ganttLogic.test.ts`, `src/features/gantt/GanttChart.test.tsx`
  e `src/pages/Gantt.test.tsx` — cálculo da linha do tempo (intervalo,
  posição/largura de cada barra em dias), exibição de dependências
  (`task_dependencies`), seleção de projeto e edição de início/fim por
  tarefa.
- `src/features/notes/noteLogic.test.ts` — montagem da árvore de páginas
  (aninhamento por `parent_note_id`, notas arquivadas excluídas mas nunca
  "perdidas" quando o pai é arquivado).
- `src/features/notes/useAutosave.test.ts` — o hook de salvamento
  automático debounced com timers falsos (`vi.useFakeTimers`), incluindo o
  caso de falha (o indicador volta para "não salvo", nunca mente dizendo
  "salvo" quando a escrita falhou).
- `src/repositories/noteRepository.test.ts`, `src/features/notes/NoteTree.test.tsx`,
  `src/features/notes/NoteEditor.test.tsx` e `src/pages/Notes.test.tsx` —
  CRUD de páginas/blocos, navegação na árvore, edição de blocos (salva ao
  perder o foco) e do checklist (salva ao marcar um item).
- `src/features/workload/workloadLogic.test.ts` e `src/pages/Team.test.tsx`
  — cálculo de carga de trabalho (minutos estimados de tarefas abertas
  contra a capacidade semanal) e sua classificação em quatro níveis.
- `src/features/dashboards/dashboardLogic.test.ts` e `src/pages/Dashboards.test.tsx`
  — distribuição de tarefas/projetos por status e prioridade; os gráficos
  Recharts trazem uma legenda em texto ao lado (também a alternativa
  acessível) porque o jsdom não posiciona SVG de forma significativa, então
  é a legenda que os testes leem.
- `src/features/reports/reportLogic.test.ts` e `src/pages/Reports.test.tsx`
  — taxa de conclusão e de cumprimento de prazo por pessoa, e o conteúdo
  exato do CSV exportado (escapando vírgulas/aspas).

Rode `npm run test` antes de cada commit; `npm run test:watch` durante o
desenvolvimento de uma nova fase.

## Login de desenvolvimento

Após rodar o seed, entre com o e-mail usado como Super Admin no seed e a senha
`Senha123!`. Os demais usuários seedados (gerentes, coordenadores, líderes e
funcionários) usam e-mails no padrão `nome.sobrenome@mbnexus.dev`, mesma senha.

## Roadmap

Ver `docs/architecture.md` seção 11. Cada fase só inicia com a anterior
estável — sem monólito, sem dados mockados como solução definitiva, sem tela
que parece funcionar mas não persiste.
