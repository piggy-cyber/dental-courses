-- Access request fields on profiles.
alter table public.profiles
  add column if not exists access_note text,
  add column if not exists approved_by uuid references public.profiles (id);
