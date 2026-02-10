-- Create the historical_files table
CREATE TABLE IF NOT EXISTS historical_files (
  file_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  uploaded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE historical_files ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see files for their own tenant
CREATE POLICY "Users can only access their tenant files" ON historical_files
  FOR ALL
  USING (tenant_id::text = current_setting('app.current_tenant_id', true));

-- Policy: Super Admins can see everything
CREATE POLICY "Super Admins can access all files" ON historical_files
  FOR ALL
  USING (current_setting('app.current_user_role', true) = 'super_admin');
