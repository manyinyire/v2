-- Enable RLS (Row Level Security)
alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;

-- Create enum types for better type safety
create type user_role as enum ('user', 'agent', 'manager', 'admin');
create type ticket_status as enum ('new', 'assigned', 'in_progress', 'escalated', 'resolved', 'closed');
create type ticket_priority as enum ('low', 'medium', 'high', 'urgent');

-- Create SBUs (Strategic Business Units) table
create table public.sbus (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    name text not null,
    description text,
    is_active boolean default true
);

-- Create user profiles table
create table public.user_profiles (
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

-- Create SLA configurations table
create table public.sla_configs (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    sbu_id uuid references public.sbus(id) on delete restrict,
    priority ticket_priority not null,
    response_time_hours int not null default 24,
    resolution_time_hours int not null default 72,
    is_active boolean default true,
    unique(sbu_id, priority)
);

-- Create tickets table
create table public.tickets (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    title text not null,
    description text not null,
    status ticket_status not null default 'new',
    priority ticket_priority not null default 'medium',
    sla_time int not null default 24,
    created_by uuid not null references auth.users(id) on delete restrict,
    assigned_to uuid references auth.users(id) on delete restrict,
    sbu_id uuid not null references public.sbus(id) on delete restrict,
    resolution text,
    card_number text,
    system_module text,
    account_number text,
    query_type text,
    is_active boolean default true
);

-- Create ticket history table for audit trail
create table public.ticket_history (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz default now(),
    ticket_id uuid references public.tickets(id) on delete cascade,
    changed_by uuid references auth.users(id) on delete restrict,
    field_name text not null,
    old_value text,
    new_value text not null
);

-- Create ticket comments table
create table public.ticket_comments (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    ticket_id uuid references public.tickets(id) on delete cascade,
    user_id uuid references auth.users(id) on delete restrict,
    content text not null,
    is_internal boolean default false
);

-- Create indexes for better query performance
create index idx_tickets_created_by on public.tickets(created_by);
create index idx_tickets_assigned_to on public.tickets(assigned_to);
create index idx_tickets_sbu_id on public.tickets(sbu_id);
create index idx_tickets_status on public.tickets(status);
create index idx_user_profiles_sbu_id on public.user_profiles(sbu_id);
create index idx_ticket_history_ticket_id on public.ticket_history(ticket_id);
create index idx_ticket_comments_ticket_id on public.ticket_comments(ticket_id);

-- Create updated_at trigger function
create or replace function update_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Apply updated_at trigger to relevant tables
create trigger update_sbus_updated_at
    before update on public.sbus
    for each row execute function update_updated_at();

create trigger update_user_profiles_updated_at
    before update on public.user_profiles
    for each row execute function update_updated_at();

create trigger update_tickets_updated_at
    before update on public.tickets
    for each row execute function update_updated_at();

create trigger update_ticket_comments_updated_at
    before update on public.ticket_comments
    for each row execute function update_updated_at();

-- Enable Row Level Security
alter table public.sbus enable row level security;
alter table public.user_profiles enable row level security;
alter table public.sla_configs enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_history enable row level security;
alter table public.ticket_comments enable row level security;

-- Create RLS policies
-- SBUs: Viewable by all authenticated users, manageable by admins
create policy "SBUs are viewable by authenticated users"
    on public.sbus for select
    to authenticated
    using (true);

create policy "SBUs are manageable by admins"
    on public.sbus for all
    to authenticated
    using (
        exists (
            select 1 from public.user_profiles
            where user_id = auth.uid()
            and role = 'admin'
        )
    );

-- User Profiles: Users can view all profiles but only edit their own
create policy "User profiles are viewable by authenticated users"
    on public.user_profiles for select
    to authenticated
    using (true);

create policy "Users can update their own profile"
    on public.user_profiles for update
    to authenticated
    using (user_id = auth.uid());

-- Tickets: Complex policies based on user roles
create policy "Users can view tickets they created or are assigned to"
    on public.tickets for select
    to authenticated
    using (
        created_by = auth.uid()
        or assigned_to = auth.uid()
        or exists (
            select 1 from public.user_profiles up
            where up.user_id = auth.uid()
            and (
                up.role in ('admin', 'manager')
                or (up.role = 'agent' and up.sbu_id = tickets.sbu_id)
            )
        )
    );

create policy "Users can create tickets"
    on public.tickets for insert
    to authenticated
    with check (
        exists (
            select 1 from public.user_profiles
            where user_id = auth.uid()
            and is_active = true
        )
    );

create policy "Agents and above can update tickets"
    on public.tickets for update
    to authenticated
    using (
        exists (
            select 1 from public.user_profiles up
            where up.user_id = auth.uid()
            and (
                up.role in ('admin', 'manager', 'agent')
                and up.is_active = true
            )
        )
    );

-- Ticket History: Viewable by those who can view the ticket
create policy "Users can view ticket history if they can view the ticket"
    on public.ticket_history for select
    to authenticated
    using (
        exists (
            select 1 from public.tickets t
            where t.id = ticket_id
            and (
                t.created_by = auth.uid()
                or t.assigned_to = auth.uid()
                or exists (
                    select 1 from public.user_profiles up
                    where up.user_id = auth.uid()
                    and (
                        up.role in ('admin', 'manager')
                        or (up.role = 'agent' and up.sbu_id = t.sbu_id)
                    )
                )
            )
        )
    );

-- Ticket Comments: Similar to tickets
create policy "Users can view comments if they can view the ticket"
    on public.ticket_comments for select
    to authenticated
    using (
        exists (
            select 1 from public.tickets t
            where t.id = ticket_id
            and (
                t.created_by = auth.uid()
                or t.assigned_to = auth.uid()
                or exists (
                    select 1 from public.user_profiles up
                    where up.user_id = auth.uid()
                    and (
                        up.role in ('admin', 'manager')
                        or (up.role = 'agent' and up.sbu_id = t.sbu_id)
                    )
                )
            )
        )
    );

create policy "Users can create comments on viewable tickets"
    on public.ticket_comments for insert
    to authenticated
    with check (
        exists (
            select 1 from public.tickets t
            where t.id = ticket_id
            and (
                t.created_by = auth.uid()
                or t.assigned_to = auth.uid()
                or exists (
                    select 1 from public.user_profiles up
                    where up.user_id = auth.uid()
                    and (
                        up.role in ('admin', 'manager')
                        or (up.role = 'agent' and up.sbu_id = t.sbu_id)
                    )
                )
            )
        )
    );
