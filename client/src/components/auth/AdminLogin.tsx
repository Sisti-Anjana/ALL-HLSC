import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

const AdminLogin: React.FC = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login({ email, password })
      toast.success('Admin login successful!')
      navigate('/') // Redirect to Dashboard & Log Issues page
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Login failed'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
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
              Welcome to Admin Login
            </h3>
          </div>

          {/* Right Section - Green Background */}
          <div className="w-full md:w-1/2 flex flex-col justify-center p-6 md:p-8" style={{ backgroundColor: '#76ab3f' }}>
            <h2 className="text-3xl font-bold text-white mb-2">
              Admin Login
            </h2>
            <p className="text-base text-white mb-6">
              Secure access to admin tools
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Admin Email */}
              <div>
                <label htmlFor="email" className="block text-white font-medium mb-2">
                  Admin Email
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
                  placeholder="Type admin email"
                />
              </div>

              {/* Admin Password */}
              <div>
                <label htmlFor="password" className="block text-white font-medium mb-2">
                  Admin Password
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
                  placeholder="Type admin password"
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
                {loading ? 'Signing in...' : 'Admin Login'}
              </button>
            </form>

            {/* Divider and Regular User Link */}
            <div className="mt-6 pt-4 border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.3)' }}>
              <Link
                to="/login"
                className="block w-full text-center text-white hover:opacity-80 font-medium transition-opacity"
              >
                Regular user? Click here
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminLogin
