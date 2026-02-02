import React from 'react'
import { useAuth } from '../../context/AuthContext'
import { Link } from 'react-router-dom'

interface UserProfileDrawerProps {
    isOpen: boolean
    onClose: () => void
    onLogout: () => void
}

const UserProfileDrawer: React.FC<UserProfileDrawerProps> = ({ isOpen, onClose, onLogout }) => {
    const { user } = useAuth()

    // Design details
    const appVersion = "v2.0.15"

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-gray-600 bg-opacity-50 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            {/* Drawer */}
            <div className={`fixed inset-y-0 right-0 z-50 w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>

                {/* Header - Close Button */}
                <div className="p-4 flex justify-start">
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* User Info Section */}
                <div className="flex flex-col items-center px-6 pb-8 border-b border-gray-100">
                    {/* Logo/Avatar Circle */}
                    <div className="w-24 h-24 rounded-full border-2 border-[#87bb44] p-1 mb-4 flex items-center justify-center">
                        <div className="w-full h-full rounded-full bg-gray-50 flex items-center justify-center overflow-hidden">
                            <img
                                src="/sidebar.png"
                                alt="User Avatar"
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </div>

                    <h2 className="text-xl font-bold text-gray-900">{user?.fullName || 'User Name'}</h2>
                    <p className="text-sm text-gray-500 mt-1">{user?.email || 'user@example.com'}</p>
                    <p className="text-xs font-semibold text-[#87bb44] mt-1 uppercase tracking-wide">
                        {user?.role?.replace('_', ' ') || 'Role'}
                    </p>
                </div>

                {/* Menu Options */}
                <div className="flex-1 px-6 py-8 space-y-6">

                    {/* Admin Panel Link (if admin) */}
                    {(user?.role === 'super_admin' || user?.role === 'tenant_admin') && (
                        <Link to="/admin" onClick={onClose} className="flex items-center text-gray-600 hover:text-gray-900 cursor-pointer group">
                            <svg className="w-5 h-5 mr-3 text-gray-400 group-hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="text-sm font-medium">Admin Panel</span>
                        </Link>
                    )}

                </div>

                {/* Footer - Logout */}
                <div className="p-6 mt-auto">
                    <button
                        onClick={onLogout}
                        className="w-full bg-red-600 text-white rounded-lg py-3 text-sm font-bold shadow-md hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Logout
                    </button>
                </div>

            </div>
        </>
    )
}

export default UserProfileDrawer
