export interface User {
  id: string
  tenant_id: string
  email: string
  full_name: string
  role: 'user' | 'tenant_admin' | 'super_admin'
  is_active: boolean
  last_login?: string
  created_at: string
}

export interface CreateUserData {
  email: string
  password: string
  fullName: string
  role?: 'user' | 'tenant_admin' | 'super_admin'
}

export interface UpdateUserData {
  fullName?: string
  role?: 'user' | 'tenant_admin' | 'super_admin'
  is_active?: boolean
  password?: string
}

