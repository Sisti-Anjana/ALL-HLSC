import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { adminService } from '../services/adminService'
import { useQuery } from '@tanstack/react-query'

interface Tenant {
  tenant_id: string
  name: string
  subdomain: string
  contact_email: string
  status: 'active' | 'inactive' | 'suspended'
}

interface TenantContextType {
  selectedTenantId: string | null
  selectedTenant: Tenant | null
  setSelectedTenantId: (tenantId: string | null) => void
  tenants: Tenant[]
  isLoading: boolean
}

const TenantContext = createContext<TenantContextType | undefined>(undefined)

export const useTenant = () => {
  const context = useContext(TenantContext)
  if (!context) {
    throw new Error('useTenant must be used within TenantProvider')
  }
  return context
}

export const TenantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'super_admin'
  
  // Fetch all tenants for super admin
  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: adminService.getTenants,
    enabled: isSuperAdmin, // Only fetch if super admin
  })

  // Initialize selected tenant from localStorage or use user's tenant
  const [selectedTenantId, setSelectedTenantIdState] = useState<string | null>(() => {
    if (!isSuperAdmin) {
      // Regular users use their own tenant_id
      return user?.tenantId || null
    }
    
    // Super admin: try to load from localStorage
    try {
      const stored = localStorage.getItem('selectedTenantId')
      return stored || null
    } catch {
      return null
    }
  })

  // Update localStorage when selected tenant changes
  useEffect(() => {
    if (isSuperAdmin) {
      if (selectedTenantId && selectedTenantId.trim() !== '') {
        localStorage.setItem('selectedTenantId', selectedTenantId)
      } else {
        localStorage.removeItem('selectedTenantId')
      }
    }
  }, [selectedTenantId, isSuperAdmin])

  // Set selected tenant function
  const setSelectedTenantId = (tenantId: string | null) => {
    setSelectedTenantIdState(tenantId)
  }

  // Find selected tenant object
  const selectedTenant = tenants.find(t => t.tenant_id === selectedTenantId) || null

  // Don't auto-select - require user to explicitly choose a client

  return (
    <TenantContext.Provider
      value={{
        selectedTenantId,
        selectedTenant,
        setSelectedTenantId,
        tenants,
        isLoading,
      }}
    >
      {children}
    </TenantContext.Provider>
  )
}
