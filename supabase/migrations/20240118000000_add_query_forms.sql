-- Create query forms table
create table public.query_forms (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    name text not null,
    description text,
    sbu_id uuid references public.sbus(id) on delete restrict,
    fields jsonb not null default '[]'::jsonb,
    is_active boolean default true
);

-- Add indexes
create index idx_query_forms_sbu_id on public.query_forms(sbu_id);

-- Add updated_at trigger
create trigger update_query_forms_updated_at
    before update on public.query_forms
    for each row execute function update_updated_at();

-- Enable RLS
alter table public.query_forms enable row level security;

-- RLS policies
create policy "Query forms are viewable by authenticated users"
    on public.query_forms for select
    to authenticated
    using (
        exists (
            select 1 from public.user_profiles up
            where up.user_id = auth.uid()
            and (
                up.sbu_id = query_forms.sbu_id
                or up.role in ('admin', 'manager')
            )
        )
    );

create policy "Managers and admins can manage query forms"
    on public.query_forms for all
    to authenticated
    using (
        exists (
            select 1 from public.user_profiles up
            where up.user_id = auth.uid()
            and up.role in ('admin', 'manager')
            and up.is_active = true
        )
    );

-- Add seed data
insert into public.query_forms (name, description, fields) values
(
    'General Query Form',
    'Default query form template',
    '[
        {
            "field_name": "query_type",
            "field_type": "select",
            "label": "Query Type",
            "required": true,
            "options": ["Account Issue", "Technical Support", "Feature Request", "Bug Report", "Other"],
            "order": 0
        },
        {
            "field_name": "description",
            "field_type": "textarea",
            "label": "Description",
            "placeholder": "Please describe your query in detail",
            "required": true,
            "order": 1
        },
        {
            "field_name": "priority",
            "field_type": "radio",
            "label": "Priority",
            "required": true,
            "options": ["Low", "Medium", "High", "Urgent"],
            "order": 2
        }
    ]'::jsonb
);