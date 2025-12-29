-- Verify no severity constraints exist (fixed syntax)
SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'issues' 
  AND constraint_type = 'CHECK'
  AND constraint_name::text LIKE '%severity%';

-- Alternative: Just list all CHECK constraints on issues table
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'issues' 
  AND constraint_type = 'CHECK'
ORDER BY constraint_name;

-- If you see any constraint that might be related to severity, drop it:
-- ALTER TABLE issues DROP CONSTRAINT constraint_name_here;


