-- =====================================================================
-- Progresso dos alunos dos preparatórios (piloto: CCNA) · 08/10/2026
-- Rode tudo isto UMA vez no SQL Editor do Supabase (projeto do StelaCore).
-- Não mexe nas tabelas do StelaCore (players e scores): tudo aqui começa com prep_.
-- Pode rodar de novo sem medo: os comandos só criam o que ainda não existe.
-- =====================================================================

-- 1. Professoras: quem vê o painel com todos os alunos.
--    A professora é reconhecida pela CONTA (id do login), e não só pelo e-mail:
--    assim ninguém ganha acesso criando uma conta com o e-mail dela.
--    ANTES de rodar este arquivo, crie a sua conta pelo botão Entrar do site.
create table if not exists prep_professoras (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null
);
insert into prep_professoras (id, email)
  select id, email from auth.users
  where lower(email) = lower('maristela33781197@edu.df.senac.br')
  on conflict do nothing;

-- responde "sim" se quem está logado é professora (usada nas regras abaixo)
create or replace function prep_eh_professora()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from prep_professoras where id = auth.uid());
$$;

-- 2. Alunos: um cadastro por conta (o id é o mesmo do login do Supabase)
create table if not exists prep_alunos (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null check (char_length(nome) between 2 and 120),
  email text not null,
  criado_em timestamptz not null default now()
);

-- 3. Acessos: em quais preparatórios o aluno entrou, e quando foi a última vez
create table if not exists prep_acessos (
  aluno_id uuid not null references prep_alunos (id) on delete cascade,
  preparatorio text not null,
  ultimo_acesso timestamptz not null default now(),
  primary key (aluno_id, preparatorio)
);

-- 4. Progresso: cada módulo marcado (ex.: preparatorio 'ccna', item 'ITN-3')
create table if not exists prep_progresso (
  aluno_id uuid not null references prep_alunos (id) on delete cascade,
  preparatorio text not null,
  item text not null,
  feito boolean not null default true,
  atualizado_em timestamptz not null default now(),
  primary key (aluno_id, preparatorio, item)
);

-- 5. Treinos: a nota de cada simulado terminado
create table if not exists prep_treinos (
  id bigint generated always as identity primary key,
  aluno_id uuid not null references prep_alunos (id) on delete cascade,
  preparatorio text not null,
  treino text not null,
  modo text,
  acertos integer not null,
  total integer not null check (total > 0 and acertos between 0 and total),
  feito_em timestamptz not null default now()
);

-- =====================================================================
-- Regras de segurança (RLS): cada aluno só mexe no que é dele;
-- a professora lê tudo. Sem regra = ninguém acessa pela internet.
-- =====================================================================
alter table prep_professoras enable row level security;
alter table prep_alunos enable row level security;
alter table prep_acessos enable row level security;
alter table prep_progresso enable row level security;
alter table prep_treinos enable row level security;

drop policy if exists "aluno vê o próprio cadastro" on prep_alunos;
create policy "aluno vê o próprio cadastro" on prep_alunos
  for select using (id = auth.uid() or prep_eh_professora());
drop policy if exists "aluno cria o próprio cadastro" on prep_alunos;
create policy "aluno cria o próprio cadastro" on prep_alunos
  for insert with check (id = auth.uid());
drop policy if exists "aluno atualiza o próprio cadastro" on prep_alunos;
create policy "aluno atualiza o próprio cadastro" on prep_alunos
  for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "aluno vê os próprios acessos" on prep_acessos;
create policy "aluno vê os próprios acessos" on prep_acessos
  for select using (aluno_id = auth.uid() or prep_eh_professora());
drop policy if exists "aluno registra o próprio acesso" on prep_acessos;
create policy "aluno registra o próprio acesso" on prep_acessos
  for insert with check (aluno_id = auth.uid());
drop policy if exists "aluno atualiza o próprio acesso" on prep_acessos;
create policy "aluno atualiza o próprio acesso" on prep_acessos
  for update using (aluno_id = auth.uid()) with check (aluno_id = auth.uid());

drop policy if exists "aluno vê o próprio progresso" on prep_progresso;
create policy "aluno vê o próprio progresso" on prep_progresso
  for select using (aluno_id = auth.uid() or prep_eh_professora());
drop policy if exists "aluno grava o próprio progresso" on prep_progresso;
create policy "aluno grava o próprio progresso" on prep_progresso
  for insert with check (aluno_id = auth.uid());
drop policy if exists "aluno muda o próprio progresso" on prep_progresso;
create policy "aluno muda o próprio progresso" on prep_progresso
  for update using (aluno_id = auth.uid()) with check (aluno_id = auth.uid());

drop policy if exists "aluno vê os próprios treinos" on prep_treinos;
create policy "aluno vê os próprios treinos" on prep_treinos
  for select using (aluno_id = auth.uid() or prep_eh_professora());
drop policy if exists "aluno grava os próprios treinos" on prep_treinos;
create policy "aluno grava os próprios treinos" on prep_treinos
  for insert with check (aluno_id = auth.uid());
-- prep_professoras fica sem regra de propósito: ninguém lê pela internet
-- (só a função prep_eh_professora, que roda por dentro do banco).

-- Confira: esta consulta deve mostrar a sua conta de professora.
-- Se vier vazia, crie a conta pelo botão Entrar do site e rode este arquivo de novo.
select id, email from prep_professoras;
