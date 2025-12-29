import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

interface AdminRouteProps {
  children: React.ReactNode
  allowedRoles?: ('super_admin' | 'tenant_admin')[]
}

const AdminRoute: React.FC<AdminRouteProps> = ({ 
  children, 
  allowedRoles = ['super_admin', 'tenant_admin'] 
}) => {
  const { isAuthenticated, user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Check if user has required role
  if (user?.role && allowedRoles.includes(user.role as 'super_admin' | 'tenant_admin')) {
    return <>{children}</>
  }

  // User doesn't have required role, redirect to dashboard
  return <Navigate to="/" replace />
}

export default AdminRoute

