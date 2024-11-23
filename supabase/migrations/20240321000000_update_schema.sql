/**
 * Migration: Update Schema for Ticket Management System
 * 
 * This migration updates the database schema to support:
 * 1. Enhanced user roles and permissions
 * 2. Comprehensive ticket status tracking
 * 3. SLA (Service Level Agreement) configurations
 * 4. Strategic Business Unit (SBU) management
 * 
 * Changes include:
 * - Recreating enum types for better type safety
 * - Adding new user profile fields
 * - Implementing SLA tracking
 * - Setting up Row Level Security (RLS)
 */

-- Drop existing policies
drop policy if exists "SLA configs are insertable by admins" on public.sla_configs;
drop policy if exists "SLA configs are updatable by admins" on public.sla_configs;
drop policy if exists "SLA configs are deletable by admins" on public.sla_configs;
drop policy if exists "SLA configs are viewable by authenticated users" on public.sla_configs;

-- Drop existing types
drop type if exists user_role cascade;
drop type if exists ticket_status cascade;
drop type if exists ticket_priority cascade;

-- Drop existing SLA configs and ticket_status type
drop table if exists public.sla_configs cascade;

-- Create enum types with comprehensive values
create type user_role as enum ('user', 'agent', 'manager', 'admin');
create type ticket_status as enum ('NEW', 'ASSIGNED', 'IN_PROGRESS', 'ESCALATED_TIER1', 'ESCALATED_TIER2', 'ESCALATED_TIER3', 'RESOLVED', 'CLOSED');
create type ticket_priority as enum ('low', 'medium', 'high', 'urgent');

-- Recreate SLA configs table with proper constraints
create table if not exists public.sla_configs (
    id uuid primary key default gen_random_uuid(),
    sbu_id uuid not null references public.sbus(id) on delete cascade,
    ticket_status ticket_status not null,
    sla_time integer not null,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Create new user profiles table with enhanced fields
create table if not exists public.user_profiles_new (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    user_id uuid references auth.users(id) on delete cascade,
    full_name text not null,
    email text not null unique,
    role user_role not null default 'user',
    sbu_id uuid references public.sbus(id) on delete restrict,
    is_active boolean default true,
    unique(user_id)
);

-- Create SLA configs for each SBU and status
insert into public.sla_configs (sbu_id, ticket_status, sla_time)
select 
    s.id as sbu_id,
    ts.status::ticket_status as ticket_status,
    case ts.status::text
        when 'NEW' then 24
        when 'ASSIGNED' then 48
        when 'IN_PROGRESS' then 72
        when 'ESCALATED_TIER1' then 24
        when 'ESCALATED_TIER2' then 24
        when 'ESCALATED_TIER3' then 24
        when 'RESOLVED' then 24
        when 'CLOSED' then 0
    end as sla_time
from public.sbus s
cross join (
    select unnest(enum_range(null::ticket_status)) as status
) ts
where not exists (
    select 1 from public.sla_configs sc
    where sc.sbu_id = s.id and sc.ticket_status::text = ts.status::text
);

-- Enable Row Level Security
alter table public.user_profiles_new enable row level security;

-- Create RLS policies for user profiles
create policy "Users can view their own profile"
    on public.user_profiles_new
    for select
    to authenticated
    using (
        auth.uid() = user_id
        or exists (
            select 1 from public.user_profiles_new up
            where up.user_id = auth.uid()
            and up.role::text in ('admin', 'manager')
        )
    );

create policy "Admins can insert profiles"
    on public.user_profiles_new
    for insert
    to authenticated
    with check (
        exists (
            select 1 from public.user_profiles_new up
            where up.user_id = auth.uid()
            and up.role::text = 'admin'
        )
    );

create policy "Users can update their own profile"
    on public.user_profiles_new
    for update
    to authenticated
    using (
        auth.uid() = user_id
        or exists (
            select 1 from public.user_profiles_new up
            where up.user_id = auth.uid()
            and up.role::text = 'admin'
        )
    );

-- Create RLS policies for SLA configs
create policy "SLA configs are insertable by admins"
    on public.sla_configs
    for insert
    to authenticated
    with check (
        exists (
            select 1 from public.user_profiles_new
            where user_profiles_new.user_id = auth.uid()
            and user_profiles_new.role::text = 'admin'
        )
    );

create policy "SLA configs are updatable by admins"
    on public.sla_configs
    for update
    to authenticated
    using (
        exists (
            select 1 from public.user_profiles_new
            where user_profiles_new.user_id = auth.uid()
            and user_profiles_new.role::text = 'admin'
        )
    );

create policy "SLA configs are deletable by admins"
    on public.sla_configs
    for delete
    to authenticated
    using (
        exists (
            select 1 from public.user_profiles_new
            where user_profiles_new.user_id = auth.uid()
            and user_profiles_new.role::text = 'admin'
        )
    );

create policy "SLA configs are viewable by authenticated users"
    on public.sla_configs
    for select
    to authenticated
    using (true);

-- Insert seed data
-- Create default SBUs if they don't exist
insert into public.sbus (name, description, status)
select d.name, d.description, 'active'
from (values 
    ('Default SBU', 'Default Strategic Business Unit'),
    ('IT Support', 'Information Technology Support Unit'),
    ('Customer Service', 'Customer Service and Support Unit')
) as d(name, description)
where not exists (
    select 1 from public.sbus where name = d.name
);

-- Create admin user if not exists
do $$
declare
    v_user_id uuid;
    v_sbu_id uuid;
begin
    -- Try to get existing admin user
    select id into v_user_id
    from auth.users
    where email = 'admin@example.com';

    -- Create admin user if not exists
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
            v_user_id,                                    -- id
            '00000000-0000-0000-0000-000000000000',      -- instance_id
            'admin@example.com',                          -- email
            crypt('admin123', gen_salt('bf')),           -- encrypted_password
            now(),                                        -- email_confirmed_at
            '{"provider":"email","providers":["email"]}', -- raw_app_meta_data
            '{"full_name":"Admin User"}',                 -- raw_user_meta_data
            now(),                                        -- created_at
            now(),                                        -- updated_at
            'authenticated',                              -- role
            null,                                         -- confirmation_token
            null,                                         -- recovery_token
            null,                                         -- email_change_token_new
            null,                                         -- email_change
            null,                                         -- phone
            null,                                         -- phone_confirmed_at
            null,                                         -- phone_change
            null,                                         -- phone_change_token
            null,                                         -- invited_at
            now(),                                        -- confirmation_sent_at
            null,                                         -- recovery_sent_at
            null,                                         -- email_change_token_current
            0,                                            -- email_change_confirm_status
            null,                                         -- banned_until
            null,                                         -- reauthentication_token
            null,                                         -- reauthentication_sent_at
            false,                                        -- is_sso_user
            null                                          -- deleted_at
        );
    end if;

    -- Get Default SBU id
    select id into v_sbu_id
    from public.sbus
    where name = 'Default SBU';

    -- Create admin profile if not exists
    if not exists (
        select 1 from public.user_profiles_new
        where user_id = v_user_id
    ) then
        insert into public.user_profiles_new (
            user_id,
            full_name,
            email,
            role,
            sbu_id,
            is_active
        ) values (
            v_user_id,
            'Admin User',
            'admin@example.com',
            'admin'::user_role,
            v_sbu_id,
            true
        );
    end if;
end $$;

-- After verifying the new table works, we can:
-- 1. Backup the old table
-- 2. Drop the old table
-- 3. Rename the new table to remove the _new suffix

-- Example:
-- alter table public.user_profiles rename to user_profiles_old;
-- alter table public.user_profiles_new rename to user_profiles;
