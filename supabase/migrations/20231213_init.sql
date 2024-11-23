-- Create SBUs table
CREATE TABLE IF NOT EXISTS sbus (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    role TEXT DEFAULT 'user',
    sbu_id UUID REFERENCES sbus(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id)
);

-- Create tickets table
CREATE TABLE IF NOT EXISTS tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'new',
    priority TEXT DEFAULT 'medium',
    sla_time INTEGER DEFAULT 24,
    created_by UUID REFERENCES auth.users(id),
    assigned_to UUID REFERENCES auth.users(id),
    sbu_id UUID REFERENCES sbus(id),
    resolution TEXT,
    card_number TEXT,
    system_module TEXT,
    account_number TEXT,
    query_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create RLS policies
ALTER TABLE sbus ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- SBUs policies
CREATE POLICY "Allow read access to all authenticated users"
    ON sbus FOR SELECT
    TO authenticated
    USING (true);

-- User profiles policies
CREATE POLICY "Allow users to read all profiles"
    ON user_profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow users to update their own profile"
    ON user_profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Tickets policies
CREATE POLICY "Allow users to read tickets in their SBU"
    ON tickets FOR SELECT
    TO authenticated
    USING (
        sbu_id IN (
            SELECT sbu_id FROM user_profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Allow users to create tickets"
    ON tickets FOR INSERT
    TO authenticated
    WITH CHECK (
        created_by = auth.uid() AND
        sbu_id IN (
            SELECT sbu_id FROM user_profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Allow agents and managers to update tickets"
    ON tickets FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_id = auth.uid()
            AND role IN ('agent', 'manager')
            AND sbu_id = tickets.sbu_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_id = auth.uid()
            AND role IN ('agent', 'manager')
            AND sbu_id = tickets.sbu_id
        )
    );

-- Create functions for ticket status changes
CREATE OR REPLACE FUNCTION notify_ticket_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status != OLD.status THEN
        PERFORM pg_notify(
            'ticket_status_change',
            json_build_object(
                'ticket_id', NEW.id,
                'old_status', OLD.status,
                'new_status', NEW.status,
                'assigned_to', NEW.assigned_to
            )::text
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ticket_status_change_trigger
    AFTER UPDATE ON tickets
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION notify_ticket_status_change();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updating timestamps
CREATE TRIGGER update_sbus_updated_at
    BEFORE UPDATE ON sbus
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at
    BEFORE UPDATE ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
