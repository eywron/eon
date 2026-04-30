create extension if not exists "vector";
create extension if not exists "pgcrypto";

create table if not exists users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  created_at timestamptz default now()
);

create table if not exists structured_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  type text not null,
  content text not null,
  importance int not null default 5,
  created_at timestamptz default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  role text not null,
  content text not null,
  created_at timestamptz default now()
);

create table if not exists embeddings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  message_id uuid references messages(id) on delete cascade,
  embedding vector(768) not null,
  created_at timestamptz default now()
);

create index if not exists embeddings_user_id_idx on embeddings(user_id);
create index if not exists messages_user_id_idx on messages(user_id);
create index if not exists structured_memory_user_id_idx on structured_memory(user_id);

create index if not exists embeddings_vector_idx
  on embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create or replace function match_messages(
  query_embedding vector(768),
  match_count int,
  match_user_id uuid
)
returns table (message_id uuid, content text, similarity float)
language sql stable as $$
  select
    m.id as message_id,
    m.content,
    1 - (e.embedding <=> query_embedding) as similarity
  from embeddings e
  join messages m on m.id = e.message_id
  where m.user_id = match_user_id
  order by e.embedding <=> query_embedding
  limit match_count;
$$;

create or replace function handle_new_user()
returns trigger language plpgsql as $$
begin
  insert into users (user_id, email)
  values (new.id, new.email)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
