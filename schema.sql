-- Run in Supabase: SQL Editor. Then create the admin user in Authentication > Users
-- and DISABLE public sign-ups (any signed-in user is treated as admin by these policies).
create extension if not exists pgcrypto;
create table public.books(id uuid primary key default gen_random_uuid(), title text not null, author text, language text default 'العربية', category text, season text default 'all' check (season in ('all','autumn','winter','spring')), status text not null default 'available' check (status in ('available','borrowed','coming_soon')), is_pinned boolean not null default false, cover_url text, created_at timestamptz default now());
create table public.waitlist(id uuid primary key default gen_random_uuid(), book_id uuid references public.books(id) on delete cascade, student_name text not null, student_class text not null, request_date date default current_date);
create table public.reviews(id uuid primary key default gen_random_uuid(), book_id uuid references public.books(id) on delete cascade, student_name text not null, rating int not null check (rating between 1 and 5), comment text, created_at timestamptz default now());
create table public.notices(id uuid primary key default gen_random_uuid(), marquee_text text, status_note text, is_active boolean not null default true);

alter table public.books enable row level security;
alter table public.waitlist enable row level security;
alter table public.reviews enable row level security;
alter table public.notices enable row level security;

create policy "read books" on public.books for select using (true);
create policy "admin books" on public.books for all to authenticated using (true) with check (true);
create policy "students request" on public.waitlist for insert to anon, authenticated with check (true);
create policy "admin waitlist" on public.waitlist for all to authenticated using (true) with check (true);
create policy "read reviews" on public.reviews for select using (true);
create policy "students review" on public.reviews for insert to anon, authenticated with check (rating between 1 and 5);
create policy "admin reviews" on public.reviews for delete to authenticated using (true);
create policy "read notices" on public.notices for select using (true);
create policy "admin notices" on public.notices for all to authenticated using (true) with check (true);

insert into public.notices(marquee_text, status_note) values ('المكتبة مفتوحة من الاثنين إلى الجمعة، من 8:00 إلى 16:00 - مغلقة يومي السبت والأحد', 'مرحباً بكم في مكتبتنا');
alter publication supabase_realtime add table public.books, public.notices;