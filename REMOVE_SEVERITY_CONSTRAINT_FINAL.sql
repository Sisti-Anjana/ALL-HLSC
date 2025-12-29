-- Step 1: Find the severity constraint specifically
-- This will show the constraint definition so we can identify it
SELECT 
    constraint_name,
    constraint_type,
    check_clause
FROM information_schema.check_constraints
WHERE constraint_schema = 'public'
  AND check_clause LIKE '%severity%'
ORDER BY constraint_name;

-- Step 2: Also check table constraints
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'issues'
  AND tc.constraint_type = 'CHECK'
  AND (cc.check_clause LIKE '%severity%' OR tc.constraint_name LIKE '%severity%')
ORDER BY tc.constraint_name;

-- Step 3: If you find a constraint name, remove it (replace CONSTRAINT_NAME with actual name)
-- ALTER TABLE issues DROP CONSTRAINT CONSTRAINT_NAME;

-- Step 4: Alternative - Modify the column to remove the constraint
-- This changes the column type which removes any check constraints
ALTER TABLE issues ALTER COLUMN severity TYPE VARCHAR(20);

-- Step 5: Make sure severity is nullable
ALTER TABLE issues ALTER COLUMN severity DROP NOT NULL;


