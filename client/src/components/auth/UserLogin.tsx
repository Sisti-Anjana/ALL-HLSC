import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

const UserLogin: React.FC = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const [showClientModal, setShowClientModal] = useState(false)
  const [clientOptions, setClientOptions] = useState<any[]>([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await login({ email, password })

      // Check if response indicates multiple accounts
      if (response && response.multiple && response.accounts) {
        setClientOptions(response.accounts)
        setShowClientModal(true)
        setLoading(false)
        return
      }

      toast.success('Login successful!')
      navigate('/')
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Login failed'
      // If error is "No active accounts found", it's a specific case
      toast.error(errorMessage)
      console.error('Login error details:', error)
      setLoading(false)
    }
  }

  const handleClientSelect = async (tenantId: string) => {
    setLoading(true)
    try {
      await login({ email, password, tenantId })
      toast.success('Login successful!')
      setShowClientModal(false)
      navigate('/')
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Login failed'
      toast.error(errorMessage)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">

      {/* Client Selection Modal */}
      {showClientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b" style={{ backgroundColor: '#76ab3f' }}>
              <h3 className="text-xl font-bold text-white">Select Client</h3>
              <p className="text-white text-sm mt-1 opacity-90">Please choose which dashboard to access</p>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="space-y-3">
                {clientOptions.map((client) => (
                  <button
                    key={client.tenantId}
                    onClick={() => handleClientSelect(client.tenantId)}
                    className="w-full flex items-center justify-between p-4 rounded-lg border border-gray-200 transition-all group text-left"
                    style={{
                      borderColor: '#e5e7eb'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#76ab3f'
                      e.currentTarget.style.backgroundColor = '#f0f7e9'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb'
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }}
                  >
                    <div>
                      <div className="font-bold text-gray-900 group-hover:text-green-700">
                        {client.tenantName}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-semibold">
                        Role: {client.role}
                      </div>
                    </div>
                    <div className="text-gray-400 group-hover:text-green-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => {
                  setShowClientModal(false)
                  setClientOptions([])
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-200 rounded-md transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-3xl bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="flex flex-col md:flex-row min-h-[450px]">
          {/* Left Section - White Background */}
          <div className="w-full md:w-1/2 bg-white flex flex-col justify-center items-center p-6 md:p-8">
            {/* Logo */}
            <div className="mb-4">
              <img
                src="/login.png"
                alt="American Green Solutions Logo"
                className="max-w-full h-auto"
                style={{ maxHeight: '200px' }}
              />
            </div>
            {/* Welcome Text */}
            <h3 className="text-xl font-semibold text-black">
              Welcome to User Login
            </h3>
          </div>

          {/* Right Section - Green Background */}
          <div className="w-full md:w-1/2 flex flex-col justify-center p-6 md:p-8" style={{ backgroundColor: '#76ab3f' }}>
            <h2 className="text-3xl font-bold text-white mb-2">
              User Login
            </h2>
            <p className="text-base text-white mb-6">
              Secure access to your account
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-white font-medium mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-white rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none text-sm"
                  style={{
                    boxShadow: '0 0 0 0px transparent',
                  }}
                  onFocus={(e) => {
                    e.target.style.boxShadow = '0 0 0 2px #76ab3f'
                  }}
                  onBlur={(e) => {
                    e.target.style.boxShadow = '0 0 0 0px transparent'
                  }}
                  placeholder="Type email"
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-white font-medium mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-white rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none text-sm"
                  style={{
                    boxShadow: '0 0 0 0px transparent',
                  }}
                  onFocus={(e) => {
                    e.target.style.boxShadow = '0 0 0 2px #76ab3f'
                  }}
                  onBlur={(e) => {
                    e.target.style.boxShadow = '0 0 0 0px transparent'
                  }}
                  placeholder="Type password"
                />
                <div className="mt-2 text-right">
                  <Link to="/forgot-password" className="text-white hover:opacity-80 text-sm font-medium transition-opacity">
                    Forgot password?
                  </Link>
                </div>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full text-white py-3 rounded-lg font-semibold text-base transition-opacity disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                style={{ backgroundColor: '#5f8a32' }}
              >
                {loading ? 'Signing in...' : 'User Login'}
              </button>
            </form>

            {/* Divider and Admin Link */}
            <div className="mt-6 pt-4 border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.3)' }}>
              <Link
                to="/admin/login"
                className="block w-full text-center text-white hover:opacity-80 font-medium transition-opacity"
              >
                Admin user? Click here
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserLogin
