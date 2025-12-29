-- Remove status constraint (if status is not critical)
ALTER TABLE issues DROP CONSTRAINT IF EXISTS issues_status_check;

-- Or make status nullable
ALTER TABLE issues ALTER COLUMN status DROP NOT NULL;

-- Or modify the column to remove constraint
ALTER TABLE issues ALTER COLUMN status TYPE VARCHAR(20);


