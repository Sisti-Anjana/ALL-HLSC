-- Make site_name nullable (remove NOT NULL constraint)
ALTER TABLE issues ALTER COLUMN site_name DROP NOT NULL;

-- Or if that doesn't work, set a default empty string
-- ALTER TABLE issues ALTER COLUMN site_name SET DEFAULT '';


