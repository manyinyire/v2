-- Helper function to create users with profiles
create or replace function create_user_with_profile(
    p_email text,
    p_password text,
    p_full_name text,
    p_role user_role,
    p_sbu_id uuid
) returns void as $$
declare
    v_user_id uuid;
begin
    -- Check if user already exists
    select id into v_user_id
    from auth.users
    where email = p_email;

    -- Create user if not exists
    if v_user_id is null then
        v_user_id := gen_random_uuid();
        
        insert into auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            role,
            confirmation_token,
            recovery_token,
            email_change_token_new,
            email_change,
            phone,
            phone_confirmed_at,
            phone_change,
            phone_change_token,
            invited_at,
            confirmation_sent_at,
            recovery_sent_at,
            email_change_token_current,
            email_change_confirm_status,
            banned_until,
            reauthentication_token,
            reauthentication_sent_at,
            is_sso_user,
            deleted_at
        ) values (
            v_user_id,
            '00000000-0000-0000-0000-000000000000',
            p_email,
            crypt(p_password, gen_salt('bf')),
            now(),
            '{"provider":"email","providers":["email"]}',
            jsonb_build_object('full_name', p_full_name),
            now(),
            now(),
            'authenticated',
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            now(),
            null,
            null,
            0,
            null,
            null,
            null,
            false,
            null
        );

        -- Create user profile
        insert into public.user_profiles_new (
            user_id,
            full_name,
            email,
            role,
            sbu_id,
            is_active
        ) values (
            v_user_id,
            p_full_name,
            p_email,
            p_role,
            p_sbu_id,
            true
        );
    end if;
end;
$$ language plpgsql security definer;

-- Seed data for testing

-- Insert test SBUs if they don't exist
insert into public.sbus (name, description, status)
select d.name, d.description, 'active'
from (values 
    ('IT Department', 'Information Technology Support Unit'),
    ('HR Department', 'Human Resources Department'),
    ('Sales Department', 'Sales and Marketing Unit'),
    ('Customer Support', 'Customer Service and Support')
) as d(name, description)
where not exists (
    select 1 from public.sbus where name = d.name
);

-- Create test users with different roles
do $$
declare
    v_it_sbu_id uuid;
    v_hr_sbu_id uuid;
    v_sales_sbu_id uuid;
    v_support_sbu_id uuid;
begin
    -- Get SBU IDs
    select id into v_it_sbu_id from public.sbus where name = 'IT Department';
    select id into v_hr_sbu_id from public.sbus where name = 'HR Department';
    select id into v_sales_sbu_id from public.sbus where name = 'Sales Department';
    select id into v_support_sbu_id from public.sbus where name = 'Customer Support';

    -- Create test users if they don't exist
    -- IT Department Users
    perform create_user_with_profile(
        'it.manager@outrisk.co.zw',
        'Manager123!',
        'IT Manager',
        'manager'::user_role,
        v_it_sbu_id
    );

    perform create_user_with_profile(
        'it.agent1@outrisk.co.zw',
        'Agent123!',
        'IT Agent 1',
        'agent'::user_role,
        v_it_sbu_id
    );

    -- HR Department Users
    perform create_user_with_profile(
        'hr.manager@outrisk.co.zw',
        'Manager123!',
        'HR Manager',
        'manager'::user_role,
        v_hr_sbu_id
    );

    perform create_user_with_profile(
        'hr.agent1@outrisk.co.zw',
        'Agent123!',
        'HR Agent 1',
        'agent'::user_role,
        v_hr_sbu_id
    );

    -- Sales Department Users
    perform create_user_with_profile(
        'sales.manager@outrisk.co.zw',
        'Manager123!',
        'Sales Manager',
        'manager'::user_role,
        v_sales_sbu_id
    );

    perform create_user_with_profile(
        'sales.agent1@outrisk.co.zw',
        'Agent123!',
        'Sales Agent 1',
        'agent'::user_role,
        v_sales_sbu_id
    );

    -- Customer Support Users
    perform create_user_with_profile(
        'support.manager@outrisk.co.zw',
        'Manager123!',
        'Support Manager',
        'manager'::user_role,
        v_support_sbu_id
    );

    perform create_user_with_profile(
        'support.agent1@outrisk.co.zw',
        'Agent123!',
        'Support Agent 1',
        'agent'::user_role,
        v_support_sbu_id
    );

    -- Regular Users
    perform create_user_with_profile(
        'user1@outrisk.co.zw',
        'User123!',
        'Regular User 1',
        'user'::user_role,
        v_it_sbu_id
    );

    perform create_user_with_profile(
        'user2@outrisk.co.zw',
        'User123!',
        'Regular User 2',
        'user'::user_role,
        v_hr_sbu_id
    );
end $$;

-- Create SLA configs for each SBU if they don't exist
do $$
declare
    v_sbu record;
begin
    for v_sbu in (select id from public.sbus) loop
        -- Insert SLA configs for each status
        insert into public.sla_configs (sbu_id, ticket_status, sla_time)
        select 
            v_sbu.id,
            status,
            case status::text
                when 'NEW' then 24
                when 'ASSIGNED' then 48
                when 'IN_PROGRESS' then 72
                when 'ESCALATED_TIER1' then 24
                when 'ESCALATED_TIER2' then 24
                when 'ESCALATED_TIER3' then 24
                when 'RESOLVED' then 24
                when 'CLOSED' then 0
            end
        from unnest(enum_range(null::ticket_status)) status
        where not exists (
            select 1 from public.sla_configs 
            where sbu_id = v_sbu.id and ticket_status = status
        );
    end loop;
end $$;
