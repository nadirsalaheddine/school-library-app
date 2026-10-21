-- شغّل هذا الملف مرة واحدة في Supabase > SQL Editor (بعد schema.sql)

-- 1) عدد المنتظرين لكل كتاب (يكشف الأرقام فقط، دون أسماء الطلاب)
create or replace function public.waitlist_counts()
returns table(book_id uuid, n bigint)
language sql stable security definer set search_path = public as $$
  select book_id, count(*) from public.waitlist group by book_id
$$;
grant execute on function public.waitlist_counts() to anon, authenticated;

-- 2) رفع أغلفة الكتب (bucket عام للقراءة، والرفع للإدارة فقط)
insert into storage.buckets (id, name, public) values ('covers', 'covers', true) on conflict (id) do nothing;
create policy "read covers" on storage.objects for select using (bucket_id = 'covers');
create policy "admin upload covers" on storage.objects for insert to authenticated with check (bucket_id = 'covers');
create policy "admin update covers" on storage.objects for update to authenticated using (bucket_id = 'covers');
create policy "admin delete covers" on storage.objects for delete to authenticated using (bucket_id = 'covers');
