-- Option 1: Remove the severity constraint entirely (if severity is not required)
ALTER TABLE issues DROP CONSTRAINT IF EXISTS issues_severity_check;

-- Option 2: Make severity nullable and allow any value (if you want to keep the column but remove restrictions)
-- ALTER TABLE issues ALTER COLUMN severity DROP NOT NULL;
-- ALTER TABLE issues DROP CONSTRAINT IF EXISTS issues_severity_check;


