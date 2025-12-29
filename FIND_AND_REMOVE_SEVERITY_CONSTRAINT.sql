-- Step 1: Find the constraint name (simpler query)
SELECT 
    constraint_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'issues' 
  AND constraint_type = 'CHECK'
ORDER BY constraint_name;

-- Step 2: Once you see the constraint name, run this (replace 'CONSTRAINT_NAME' with actual name):
-- ALTER TABLE issues DROP CONSTRAINT CONSTRAINT_NAME;

-- Step 3: Or try removing all possible constraint names:
ALTER TABLE issues DROP CONSTRAINT IF EXISTS issues_severity_check;
ALTER TABLE issues DROP CONSTRAINT IF EXISTS check_severity;
ALTER TABLE issues DROP CONSTRAINT IF EXISTS severity_check;
ALTER TABLE issues DROP CONSTRAINT IF EXISTS issues_check_severity;

-- Step 4: Make severity nullable (remove NOT NULL if it exists)
ALTER TABLE issues ALTER COLUMN severity DROP NOT NULL;

-- Step 5: If you want to completely remove the constraint, you can also modify the column
-- This will allow any value or NULL:
-- ALTER TABLE issues ALTER COLUMN severity TYPE VARCHAR(20);


