-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables
CREATE TABLE IF NOT EXISTS public.sbus (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY,
    full_name VARCHAR(255),
    avatar_url TEXT,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.tier_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sbu_id UUID NOT NULL,
    user_id UUID NOT NULL,
    tier VARCHAR(1) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tier_assignments_sbu FOREIGN KEY (sbu_id) REFERENCES sbus(id) ON DELETE CASCADE,
    CONSTRAINT fk_tier_assignments_user FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE
);

CREATE TYPE ticket_status AS ENUM (
  'NEW',
  'ASSIGNED',
  'IN_PROGRESS', 
  'ESCALATED_TIER1',
  'ESCALATED_TIER2',
  'ESCALATED_TIER3',
  'RESOLVED',
  'CLOSED'
);

CREATE TABLE IF NOT EXISTS public.sla_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sbu_id UUID NOT NULL,
    ticket_status ticket_status NOT NULL,
    sla_time INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sla_configs_sbu FOREIGN KEY (sbu_id) REFERENCES sbus(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_tier_assignments_sbu_id ON tier_assignments(sbu_id);
CREATE INDEX idx_tier_assignments_user_id ON tier_assignments(user_id);
CREATE INDEX idx_sla_configs_sbu_id ON sla_configs(sbu_id);

-- Create update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add update timestamp triggers
CREATE TRIGGER update_sbus_updated_at
    BEFORE UPDATE ON sbus
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tier_assignments_updated_at
    BEFORE UPDATE ON tier_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sla_configs_updated_at
    BEFORE UPDATE ON sla_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();