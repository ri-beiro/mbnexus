-- Development seed data (docs de referência: prompt mestre secao 55).
-- Roda automaticamente com `supabase db reset` (aplica as migrations e este
-- arquivo). NUNCA rodar contra um ambiente de produção.
--
-- Estrutura gerada:
--   1 organização, 3 gerências, 4 coordenações, 6 equipes, 20 funcionários
--   (6 deles também líderes de equipe), + 1 super admin, 3 gerentes,
--   4 coordenadores, 10 projetos, ~100 tarefas.
--
-- Senha de todos os usuários seedados: Senha123!

begin;

-- Helper: cria um usuário em auth.users (+ auth.identities) e devolve o id.
-- O trigger handle_new_auth_user (migration 0002) cria a linha em
-- public.profiles automaticamente a partir de raw_user_meta_data.
create or replace function pg_temp.seed_user(p_email text, p_name text, p_org uuid, p_job_title text default null)
returns uuid
language plpgsql
as $fn$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, confirmation_token, recovery_token,
    email_change_token_new, email_change,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
    p_email, crypt('Senha123!', gen_salt('bf')),
    now(), '', '', '', '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', p_name, 'organization_id', p_org::text),
    now(), now()
  );

  -- auth.identities columns vary slightly across GoTrue versions; this insert
  -- targets the current Supabase CLI schema. Kept non-fatal so the rest of
  -- the seed still runs (with auth.users created) on an older schema.
  begin
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), v_id, v_id::text,
      jsonb_build_object('sub', v_id::text, 'email', p_email),
      'email', now(), now(), now()
    );
  exception when others then
    raise notice 'seed_user: could not insert auth.identities for %, skipping (%).', p_email, sqlerrm;
  end;

  if p_job_title is not null then
    update public.profiles set job_title = p_job_title where id = v_id;
  end if;

  return v_id;
end;
$fn$;

do $$
declare
  v_org_id uuid;

  -- hierarchy
  v_mu_tech uuid; v_mu_ops uuid; v_mu_sales uuid;
  v_dept_sys uuid; v_dept_data uuid; v_dept_ops_a uuid; v_dept_sales uuid;
  v_team_dev uuid; v_team_support uuid; v_team_bi uuid;
  v_team_logistics uuid; v_team_sales uuid; v_team_aftersales uuid;

  -- people
  v_admin uuid;
  v_mgr_tech uuid; v_mgr_ops uuid; v_mgr_sales uuid;
  v_coord_sys uuid; v_coord_data uuid; v_coord_ops_a uuid; v_coord_sales uuid;

  v_employees uuid[] := array[]::uuid[];
  v_employee_names text[] := array[
    'João Pedro Silva', 'Maria Fernanda Alves', 'Pedro Henrique Dias', 'Lucas Gabriel Barros',
    'Ana Beatriz Souza', 'Ana Paula Cardoso', 'Beatriz Nunes',
    'Carlos Eduardo Lima', 'Rafael Moreira', 'Camila Teixeira',
    'Mariana Costa', 'Gustavo Pires', 'Isabela Correia', 'Thiago Batista',
    'Felipe Rocha', 'Amanda Freitas', 'Bruno Cavalcanti',
    'Juliana Ramos', 'Letícia Andrade', 'Vinícius Monteiro'
  ];
  v_uid uuid;
  i int;

  -- roles
  v_role_super_admin uuid; v_role_gerente uuid; v_role_coordenador uuid;
  v_role_lider uuid; v_role_funcionario uuid;

  -- teams roster (indices into v_employees, 1-based) per team. Team sizes
  -- differ (4/3/3/4/3/3), so this is stored as jsonb rather than a native
  -- Postgres array (which requires every sub-array to have equal length).
  v_team_ids uuid[6];
  v_team_rosters jsonb := '[[1,2,3,4],[5,6,7],[8,9,10],[11,12,13,14],[15,16,17],[18,19,20]]'::jsonb;
  v_roster_arr jsonb;
  v_member_idx int;
  v_leader_idx int[6] := array[1,5,8,11,15,18];

  -- task title templates, cycled per project
  v_task_templates text[] := array[
    'Levantar requisitos', 'Elaborar cronograma', 'Desenvolver funcionalidade',
    'Revisar com stakeholders', 'Testar em homologação', 'Corrigir bugs reportados',
    'Documentar processo', 'Treinar equipe', 'Validar indicadores', 'Entregar versão final'
  ];
  v_task_statuses public.task_status[] := array[
    'backlog', 'a_fazer', 'em_andamento', 'em_revisao', 'bloqueado', 'concluido'
  ]::public.task_status[];
  v_task_priorities public.task_priority[] := array[
    'baixa', 'normal', 'alta', 'urgente', 'critica'
  ]::public.task_priority[];

  v_project_id uuid;
  v_project_team uuid;
  v_project_owner uuid;
  v_project_roster uuid[];
  j int;
  v_status public.task_status;
  v_priority public.task_priority;
  v_due date;

  -- (name, department, team, owner-role-placeholder resolved below, status)
  v_project_defs text[][] := array[
    array['Implantação de novo BI', 'data', 'bi', 'em_andamento'],
    array['Automação de Relatórios Operacionais', 'sys', 'dev', 'em_andamento'],
    array['Portal de Atendimento ao Cliente', 'sys', 'support', 'planejamento'],
    array['Reestruturação Logística Regional', 'ops_a', 'logistics', 'em_risco'],
    array['Expansão Comercial Sul', 'sales', 'sales', 'em_andamento'],
    array['Programa de Pós-venda Digital', 'sales', 'aftersales', 'nao_iniciado'],
    array['Migração de Infraestrutura Cloud', 'sys', 'dev', 'bloqueado'],
    array['Dashboard Executivo Corporativo', 'data', 'bi', 'concluido'],
    array['Otimização de Rotas de Entrega', 'ops_a', 'logistics', 'em_andamento'],
    array['Revisão de Processos Comerciais', 'sales', 'sales', 'cancelado']
  ];
  v_def text[];
begin
  select id into v_role_super_admin from public.roles where key = 'super_admin';
  select id into v_role_gerente from public.roles where key = 'gerente';
  select id into v_role_coordenador from public.roles where key = 'coordenador';
  select id into v_role_lider from public.roles where key = 'lider';
  select id into v_role_funcionario from public.roles where key = 'funcionario';

  insert into public.organizations (name, slug) values ('MB Nexus (Demo)', 'mbnexus-demo')
  returning id into v_org_id;

  -- Super admin: usa o e-mail real do usuário para que ele possa logar
  -- imediatamente no ambiente de desenvolvimento seedado.
  v_admin := pg_temp.seed_user('lucas.riceirao11@gmail.com', 'Lucas Riceirão', v_org_id, 'Super Admin');
  insert into public.user_roles (profile_id, role_id, scope_type, scope_id)
  values (v_admin, v_role_super_admin, 'global', null);

  -- Gerentes
  v_mgr_tech := pg_temp.seed_user('fernanda.alencar@mbnexus.dev', 'Fernanda Alencar', v_org_id, 'Gerente de Tecnologia');
  v_mgr_ops := pg_temp.seed_user('rodrigo.peixoto@mbnexus.dev', 'Rodrigo Peixoto', v_org_id, 'Gerente de Operações');
  v_mgr_sales := pg_temp.seed_user('camila.duarte@mbnexus.dev', 'Camila Duarte', v_org_id, 'Gerente Comercial');

  insert into public.management_units (organization_id, name, manager_profile_id) values
    (v_org_id, 'Gerência de Tecnologia', v_mgr_tech) returning id into v_mu_tech;
  insert into public.management_units (organization_id, name, manager_profile_id) values
    (v_org_id, 'Gerência de Operações', v_mgr_ops) returning id into v_mu_ops;
  insert into public.management_units (organization_id, name, manager_profile_id) values
    (v_org_id, 'Gerência Comercial', v_mgr_sales) returning id into v_mu_sales;

  insert into public.user_roles (profile_id, role_id, scope_type, scope_id) values
    (v_mgr_tech, v_role_gerente, 'management_unit', v_mu_tech),
    (v_mgr_ops, v_role_gerente, 'management_unit', v_mu_ops),
    (v_mgr_sales, v_role_gerente, 'management_unit', v_mu_sales);

  -- Coordenadores
  v_coord_sys := pg_temp.seed_user('bruno.tavares@mbnexus.dev', 'Bruno Tavares', v_org_id, 'Coordenador de Sistemas');
  v_coord_data := pg_temp.seed_user('larissa.mendonca@mbnexus.dev', 'Larissa Mendonça', v_org_id, 'Coordenadora de Dados');
  v_coord_ops_a := pg_temp.seed_user('diego.farias@mbnexus.dev', 'Diego Farias', v_org_id, 'Coordenador de Operações');
  v_coord_sales := pg_temp.seed_user('patricia.nogueira@mbnexus.dev', 'Patrícia Nogueira', v_org_id, 'Coordenadora Comercial');

  insert into public.departments (organization_id, management_unit_id, name, coordinator_profile_id) values
    (v_org_id, v_mu_tech, 'Coordenação de Sistemas', v_coord_sys) returning id into v_dept_sys;
  insert into public.departments (organization_id, management_unit_id, name, coordinator_profile_id) values
    (v_org_id, v_mu_tech, 'Coordenação de Dados', v_coord_data) returning id into v_dept_data;
  insert into public.departments (organization_id, management_unit_id, name, coordinator_profile_id) values
    (v_org_id, v_mu_ops, 'Coordenação de Operações A', v_coord_ops_a) returning id into v_dept_ops_a;
  insert into public.departments (organization_id, management_unit_id, name, coordinator_profile_id) values
    (v_org_id, v_mu_sales, 'Coordenação Comercial', v_coord_sales) returning id into v_dept_sales;

  insert into public.user_roles (profile_id, role_id, scope_type, scope_id) values
    (v_coord_sys, v_role_coordenador, 'department', v_dept_sys),
    (v_coord_data, v_role_coordenador, 'department', v_dept_data),
    (v_coord_ops_a, v_role_coordenador, 'department', v_dept_ops_a),
    (v_coord_sales, v_role_coordenador, 'department', v_dept_sales);

  -- Equipes
  insert into public.teams (organization_id, department_id, name) values
    (v_org_id, v_dept_sys, 'Equipe Desenvolvimento') returning id into v_team_dev;
  insert into public.teams (organization_id, department_id, name) values
    (v_org_id, v_dept_sys, 'Equipe Suporte') returning id into v_team_support;
  insert into public.teams (organization_id, department_id, name) values
    (v_org_id, v_dept_data, 'Equipe BI') returning id into v_team_bi;
  insert into public.teams (organization_id, department_id, name) values
    (v_org_id, v_dept_ops_a, 'Equipe Logística') returning id into v_team_logistics;
  insert into public.teams (organization_id, department_id, name) values
    (v_org_id, v_dept_sales, 'Equipe Vendas') returning id into v_team_sales;
  insert into public.teams (organization_id, department_id, name) values
    (v_org_id, v_dept_sales, 'Equipe Pós-venda') returning id into v_team_aftersales;

  v_team_ids := array[v_team_dev, v_team_support, v_team_bi, v_team_logistics, v_team_sales, v_team_aftersales];

  -- 20 funcionários fictícios
  for i in 1 .. array_length(v_employee_names, 1) loop
    v_uid := pg_temp.seed_user(
      lower(regexp_replace(unaccent(v_employee_names[i]), '\s+', '.', 'g')) || '@mbnexus.dev',
      v_employee_names[i],
      v_org_id,
      'Analista'
    );
    v_employees := array_append(v_employees, v_uid);
  end loop;

  -- team_members + papel (líder nos índices marcados, funcionário nos demais)
  for i in 1 .. 6 loop
    v_roster_arr := v_team_rosters -> (i - 1);
    for j in 0 .. jsonb_array_length(v_roster_arr) - 1 loop
      v_member_idx := (v_roster_arr ->> j)::int;
      v_uid := v_employees[v_member_idx];

      insert into public.team_members (team_id, profile_id, is_primary)
      values (v_team_ids[i], v_uid, true);

      update public.profiles set primary_team_id = v_team_ids[i] where id = v_uid;

      if v_member_idx = v_leader_idx[i] then
        update public.teams set leader_profile_id = v_uid where id = v_team_ids[i];
        insert into public.user_roles (profile_id, role_id, scope_type, scope_id)
        values (v_uid, v_role_lider, 'team', v_team_ids[i]);
      end if;

      insert into public.user_roles (profile_id, role_id, scope_type, scope_id)
      values (v_uid, v_role_funcionario, 'team', v_team_ids[i]);
    end loop;
  end loop;

  -- 10 projetos + ~100 tarefas
  foreach v_def slice 1 in array v_project_defs loop
    v_project_team := case v_def[3]
      when 'dev' then v_team_dev
      when 'support' then v_team_support
      when 'bi' then v_team_bi
      when 'logistics' then v_team_logistics
      when 'sales' then v_team_sales
      when 'aftersales' then v_team_aftersales
    end;

    v_project_owner := case v_def[2]
      when 'sys' then v_coord_sys
      when 'data' then v_coord_data
      when 'ops_a' then v_coord_ops_a
      when 'sales' then v_coord_sales
    end;

    insert into public.projects (
      organization_id, name, description, owner_profile_id,
      management_unit_id, department_id, team_id, status, priority,
      start_date, due_date, progress, created_by
    ) values (
      v_org_id, v_def[1], 'Projeto de demonstração gerado pelo seed de desenvolvimento.',
      v_project_owner,
      (select management_unit_id from public.departments where id = (case v_def[2]
        when 'sys' then v_dept_sys when 'data' then v_dept_data
        when 'ops_a' then v_dept_ops_a when 'sales' then v_dept_sales end)),
      (case v_def[2] when 'sys' then v_dept_sys when 'data' then v_dept_data
        when 'ops_a' then v_dept_ops_a when 'sales' then v_dept_sales end),
      v_project_team,
      v_def[4]::public.project_status,
      'normal',
      current_date - interval '60 days',
      current_date + interval '45 days',
      case v_def[4] when 'concluido' then 100 when 'cancelado' then 20 else 45 end,
      v_project_owner
    ) returning id into v_project_id;

    -- roster do projeto = membros da equipe responsável
    select array_agg(tm.profile_id) into v_project_roster
    from public.team_members tm where tm.team_id = v_project_team;

    insert into public.project_members (project_id, profile_id, role)
    select v_project_id, unnest(v_project_roster), 'member';

    for j in 1 .. 10 loop
      v_status := v_task_statuses[1 + (j % 6)];
      v_priority := v_task_priorities[1 + (j % 5)];
      v_due := current_date + ((j * 3) - 15);

      insert into public.tasks (
        organization_id, project_id, team_id, title, description,
        status, priority, start_date, due_date, estimate_minutes, progress, created_by
      ) values (
        v_org_id, v_project_id, v_project_team,
        v_task_templates[j] || ' — ' || v_def[1],
        'Tarefa de demonstração gerada pelo seed de desenvolvimento.',
        v_status, v_priority,
        v_due - 5, v_due,
        60 * (1 + (j % 8)),
        case v_status when 'concluido' then 100 when 'backlog' then 0 else 30 + (j * 5) % 60 end,
        v_project_owner
      ) returning id into v_uid;

      insert into public.task_assignees (task_id, profile_id)
      values (v_uid, v_project_roster[1 + (j % array_length(v_project_roster, 1))]);
    end loop;
  end loop;
end $$;

drop function pg_temp.seed_user(text, text, uuid, text);

commit;
