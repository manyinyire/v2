begin;

-- Create tier_assignments table if it doesn't exist
create table if not exists tier_assignments (
    id uuid default gen_random_uuid() primary key,
    user_id uuid not null,
    sbu_id uuid not null,
    tier varchar not null,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Add foreign key constraint
do $$ 
begin 
    if not exists (
        select 1 
        from information_schema.table_constraints 
        where constraint_name = 'tier_assignments_user_id_fkey'
    ) then
        alter table tier_assignments
        add constraint tier_assignments_user_id_fkey
        foreign key (user_id)
        references user_profiles(id)
        on delete cascade;
    end if;
end $$;

-- Add indexes for better query performance
create index if not exists idx_tier_assignments_user_id on tier_assignments(user_id);
create index if not exists idx_tier_assignments_sbu_id on tier_assignments(sbu_id);

commit; 