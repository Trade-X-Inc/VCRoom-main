insert into users(id,role,full_name) values ('11111111-1111-1111-1111-111111111111','founder','Ava Founder'),('22222222-2222-2222-2222-222222222222','investor','Ian Investor');
insert into organizations(id,name,created_by) values ('33333333-3333-3333-3333-333333333333','Summit Ventures','22222222-2222-2222-2222-222222222222');
insert into organization_members(organization_id,user_id,role) values ('33333333-3333-3333-3333-333333333333','22222222-2222-2222-2222-222222222222','partner');
