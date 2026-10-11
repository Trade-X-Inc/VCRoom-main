-- R6 good fixture: ALTER DEFAULT PRIVILEGES REVOKING from client roles, granting only to service_role
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
alter default privileges in schema public grant execute on functions to service_role;
