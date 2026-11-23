-- Server-only access required by the deployed account provisioning handler.
-- No new permissions for browser roles (anon/authenticated).
begin;
grant select on public.crm_members to service_role;
grant update(must_change_password) on public.crm_members to service_role;
commit;
