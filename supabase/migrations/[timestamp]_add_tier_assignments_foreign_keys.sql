-- Add foreign key constraints
ALTER TABLE tier_assignments
ADD CONSTRAINT fk_tier_assignments_user
FOREIGN KEY (user_id)
REFERENCES user_profiles(id)
ON DELETE CASCADE;

ALTER TABLE tier_assignments
ADD CONSTRAINT fk_tier_assignments_sbu
FOREIGN KEY (sbu_id)
REFERENCES sbus(id)
ON DELETE CASCADE;

-- Add indexes for better performance
CREATE INDEX idx_tier_assignments_user_id ON tier_assignments(user_id);
CREATE INDEX idx_tier_assignments_sbu_id ON tier_assignments(sbu_id); 