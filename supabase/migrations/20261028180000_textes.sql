-- Textes du site modifiables depuis l'administration (page « Textes du site »).
alter table public.reglages add column if not exists textes jsonb not null default '{}'::jsonb;
