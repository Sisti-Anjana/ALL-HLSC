-- First, check what constraints exist on the issues table
-- Run this to see all constraints (simpler version):
SELECT 
    constraint_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'issues' 
  AND constraint_type = 'CHECK'
ORDER BY constraint_name;

-- Remove ALL severity-related constraints (try different possible names)
ALTER TABLE issues DROP CONSTRAINT IF EXISTS issues_severity_check;
ALTER TABLE issues DROP CONSTRAINT IF EXISTS issues_severity_check1;
ALTER TABLE issues DROP CONSTRAINT IF EXISTS issues_severity_check2;
ALTER TABLE issues DROP CONSTRAINT IF EXISTS check_severity;
ALTER TABLE issues DROP CONSTRAINT IF EXISTS severity_check;

-- Alternative: Drop and recreate the column without constraint
-- WARNING: This will lose data in the severity column if you have any
-- ALTER TABLE issues DROP COLUMN IF EXISTS severity;
-- ALTER TABLE issues ADD COLUMN severity VARCHAR(20);

-- Make severity nullable and remove any check constraints
ALTER TABLE issues ALTER COLUMN severity DROP NOT NULL;

