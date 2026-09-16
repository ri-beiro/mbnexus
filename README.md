# MB Nexus — Work OS Corporativo

Plataforma corporativa de gestão de trabalho, projetos, tarefas, produtividade,
documentação e melhoria contínua. Ver `docs/architecture.md` para a arquitetura
completa (módulos, modelo de dados, RLS, integrações) e o roadmap de fases.

**Status atual: todas as 9 fases do roadmap concluídas** (com uma ressalva
importante sobre as Edge Functions, detalhada abaixo). Autenticação,
hierarquia organizacional, RBAC, layout (sidebar/topbar/command palette) e
uma Home adaptativa por papel (Fase 1); o módulo de Tarefas — CRUD,
subtarefas, comentários, múltiplos responsáveis, prioridade/status
editáveis inline e filtros (Fase 2); o módulo de Projetos — CRUD, fases,
membros e progresso calculado automaticamente a partir das tarefas
vinculadas (Fase 3); as quatro views sobre essa mesma tarefa — **Lista,
Kanban, Calendário e Gantt** (Fase 4); o módulo de **Notas** — páginas e
subpáginas em árvore, blocos (parágrafo, título, código, checklist com
itens marcáveis), e salvamento automático com indicador "Salvo"/"Salvando..."/
"Alterações não salvas" (Fase 5); a camada de **Gestão** — Minha Equipe com
carga de trabalho calculada e classificada (baixa/normal/elevada/sobrecarga),
Dashboards com indicadores e gráficos (Recharts) em tempo real, e Relatórios
de produtividade com exportação CSV (Fase 6); e a **Central de Ideias** —
pipeline de 7 etapas (seção 20), registro rápido, avanço de etapa e
transformação de uma ideia aprovada em projeto de verdade (Fase 9); e a
**Automação/E-mail** — recorrência de tarefas (`recurrence_rule`, com um
seletor de presets no detalhe da tarefa), central de notificações no topbar
com preferências por usuário, e as telas de Automações/Templates de e-mail em
Configurações, que gravam de verdade em `automations`/`email_templates`
(Fase 7) — estão prontos. Nenhuma view duplica dados: todas leem e escrevem
através dos mesmos `src/repositories/taskRepository.ts` / `projectRepository.ts` /
`eventRepository.ts` / `noteRepository.ts` / `ideaRepository.ts` /
`notificationRepository.ts` / `automationRepository.ts` /
`emailTemplateRepository.ts`. O Gantt lê o progresso e as dependências
(`task_dependencies`) de cada tarefa e permite editar início/fim por um campo
de data acessível em cada linha (arrastar-e-soltar para redimensionar a
barra fica para uma iteração futura — documentado como tal, não fingido).
E a **integração Microsoft 365/Teams** (Fase 8) — uma aba "Integrações" em
Configurações onde um Super Admin ativa a integração e configura o e-mail
organizador, e um seletor de tipo de evento no Calendário que, para uma
reunião, oferece "Criar link do Teams" e grava o link retornado de volta no
evento (`teams_meeting_id`/`teams_join_url`) — está pronta do lado que dá
para testar sem depender de credenciais reais. Nenhuma view duplica dados:
todas leem e escrevem através dos mesmos `src/repositories/taskRepository.ts` /
`projectRepository.ts` / `eventRepository.ts` / `noteRepository.ts` /
`ideaRepository.ts` / `notificationRepository.ts` / `automationRepository.ts` /
`emailTemplateRepository.ts` / `integrationRepository.ts`. O Gantt lê o
progresso e as dependências (`task_dependencies`) de cada tarefa e permite
editar início/fim por um campo de data acessível em cada linha
(arrastar-e-soltar para redimensionar a barra fica para uma iteração futura
— documentado como tal, não fingido). Toda a lógica de negócio e a maior
parte da UI foram desenvolvidas com TDD (`npm run test`).

**Ressalva real, não escondida:** as três Edge Functions em
`supabase/functions/` (`automations`, `process-email-queue` — Fase 7 — e
`ms-meetings` — Fase 8, que de fato disparam e-mails via Microsoft
Graph/SMTP Locaweb e criam reuniões reais no Teams) foram escritas com
cuidado, seguindo as mesmas convenções do resto do repositório, mas **não
puderam ser executadas nem verificadas nesta sessão**: o sandbox não tem
runtime Deno, não tem Docker (logo, sem Edge Runtime local do Supabase) e
não tem nenhum dos segredos reais (SMTP, app registration do Microsoft
Entra ID) — a instalação do Deno via `curl` foi tentada e bloqueada pelo
proxy de rede do sandbox. Ver `supabase/functions/README.md` para o que
falta verificar (com um passo a passo de deploy e secrets) antes de confiar
nelas em produção. Tudo o mais nesta seção — repositórios, lógica de
negócio, UI — foi de fato testado e roda.

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
| `MS_TENANT_ID` / `MS_CLIENT_ID` / `MS_CLIENT_SECRET` / `MS_SENDER_UPN` | Edge Functions (Fase 8 `ms-meetings`; Fase 7 `process-email-queue` quando `EMAIL_PROVIDER=microsoft_graph`) | **Sim** |
| `LOCAWEB_SMTP_*` / `EMAIL_PROVIDER` | Edge Functions (Fase 7, e-mail) | **Sim** (exceto `EMAIL_PROVIDER`) |

Ver `supabase/functions/README.md` para a lista completa (por função) e o passo a passo de deploy/agendamento.

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
supabase/functions/    Edge Functions (automação, fila de e-mail, reuniões Teams — ver README próprio)
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
Cobertura atual (305 testes):

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
- `src/features/ideas/ideaLogic.test.ts`, `src/repositories/ideaRepository.test.ts`
  e `src/pages/Ideas.test.tsx` — avanço pelas 7 etapas do pipeline, filtros,
  e a conversão de uma ideia aprovada em projeto real (dois inserts
  sequenciais: cria o projeto, depois vincula `converted_project_id` na
  ideia).
- `src/features/automation/recurrenceLogic.test.ts` — cálculo da próxima
  ocorrência para cada formato de regra de recorrência (diária, por
  intervalo de N dias, semanal por dia(s) da semana com virada de semana,
  mensal e anual com virada de mês/ano quando o dia já passou).
- `src/features/automation/conditionLogic.test.ts` — avaliação de
  `automations.condition` contra uma tarefa para os três gatilhos hoje
  suportados (prazo próximo, atrasada, todas as subtarefas concluídas),
  incluindo os filtros comuns de status/prioridade.
- `src/repositories/notificationRepository.test.ts`,
  `src/repositories/automationRepository.test.ts` e
  `src/repositories/emailTemplateRepository.test.ts` — CRUD de
  notificações/preferências, automações e modelos de e-mail contra o mesmo
  mock do query builder do Supabase.
- `src/features/notifications/NotificationCenter.test.tsx` e
  `src/features/notifications/NotificationPreferencesPanel.test.tsx` — o
  painel de notificações no topbar (contagem de não lidas, marcar uma/todas
  como lida, navegar ao clicar) e as preferências por usuário em
  Configurações.
- `src/features/automation/AutomationsPanel.test.tsx` e
  `src/features/automation/EmailTemplatesPanel.test.tsx` — as telas de
  Automação e Templates em Configurações (criar, ativar/desativar, editar
  inline, excluir).
- `src/features/tasks/TaskDetailPanel.test.tsx` (casos de repetição) —
  o seletor de recorrência no detalhe da tarefa, incluindo limpar a regra.
- `src/repositories/integrationRepository.test.ts` — leitura/upsert da
  configuração (não secreta) da integração Microsoft 365.
- `src/features/integrations/teamsMeetingLogic.test.ts` — montagem do corpo
  da requisição `onlineMeetings` do Graph a partir de um evento, e extração
  de id/link de entrada da resposta (incluindo o campo legado `joinUrl`
  quando `joinWebUrl` está ausente).
- `src/features/integrations/MicrosoftIntegrationPanel.test.tsx` — a aba
  Integrações em Configurações (ativar/desativar, configurar o e-mail
  organizador).
- `src/repositories/eventRepository.test.ts` (caso `createTeamsMeeting`) e
  `src/pages/Calendar.test.tsx` (casos de reunião) — o seletor de tipo de
  evento e o botão "Criar link do Teams" no Calendário, incluindo o evento
  criado normalmente mesmo quando a chamada à Edge Function falha.

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
