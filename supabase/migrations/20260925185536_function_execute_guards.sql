alter function public.set_updated_at() set search_path = '';

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;

grant execute on function public.handle_new_user() to supabase_auth_admin;
