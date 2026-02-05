import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

interface SubItem {
    label: string
    target: string
}

interface NavItem {
    path: string
    label: string
    icon: React.ReactNode
    subItems?: SubItem[]
}

interface SidebarProps {
    isOpen: boolean
    onClose: () => void
    isCollapsed: boolean
    onToggleCollapse: () => void
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, isCollapsed, onToggleCollapse }) => {
    const { user, logout } = useAuth()
    const location = useLocation()
    const navigate = useNavigate()

    // Base navigation items
    const baseNavItems: NavItem[] = [
        {
            path: '/',
            label: 'Dashboard',
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
            ),
            subItems: [
                { label: 'Quick Portfolio Reference', target: 'quick-portfolio' },
                { label: 'Hourly Coverage Analysis', target: 'hourly-analysis' }
            ]
        },
        {
            path: '/issues',
            label: 'Issue Details',
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
            )
        },
        {
            path: '/issues-by-user',
            label: 'Issues by User',
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
            )
        },
    ]

    // Admin-only navigation items
    const adminNavItems: NavItem[] = [
        {
            path: '/analytics',
            label: 'Analytics',
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
            ),
            subItems: [
                { label: 'Performance Analytics', target: 'performance-analytics' },
                { label: 'User Activity Overview', target: 'user-activity-overview' },
                { label: 'Top Performers', target: 'top-performers' }
            ]
        },
        {
            path: '/coverage-matrix',
            label: 'Coverage Matrix',
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7-4h14M2 20h20a2 2 0 002-2V6a2 2 0 00-2-2H2a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            ),
            subItems: [
                { label: 'Portfolio Coverage Matrix', target: 'portfolio-coverage-matrix' },
                { label: 'User Coverage Performance', target: 'user-coverage-performance' },
                { label: 'Coverage Overview', target: 'coverage-overview' }
            ]
        },
    ]

    const navItems: NavItem[] = [
        ...baseNavItems,
        ...(user?.role === 'super_admin' || user?.role === 'tenant_admin' ? adminNavItems : []),
    ]

    return (
        <>
            {/* Mobile Backdrop */}
            <div
                className={`fixed inset-0 bg-gray-600 bg-opacity-50 z-20 md:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            {/* Sidebar */}
            <div
                className={`fixed md:static inset-y-0 left-0 z-30 bg-sidebar border-r border-subtle transform transition-all duration-300 ease-in-out 
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} 
          ${isCollapsed ? 'w-[88px]' : 'w-64'}
          flex flex-col`}
            >
                {/* Toggle Button (Desktop Only) */}
                <button
                    onClick={onToggleCollapse}
                    className="hidden md:flex absolute -right-3 top-20 bg-sidebar border border-subtle rounded-full p-1 shadow-sm text-secondary hover:text-primary z-50 items-center justify-center w-6 h-6"
                >
                    <svg className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>

                {/* Logo Area */}
                <div className={`h-24 flex items-center justify-center border-b border-subtle ${isCollapsed ? 'px-2' : 'px-4'}`}>
                    <img
                        src="/sidebar.png"
                        alt="AGS"
                        className={`transition-all duration-300 ${isCollapsed ? 'h-12 w-auto' : 'h-20 w-auto'} ${isCollapsed ? '' : 'dark:brightness-110 dark:contrast-110'}`}
                    />
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto md:overflow-visible py-4 scrollbar-thin scrollbar-thumb-subtle">
                    <ul className="space-y-2 px-2">
                        {navItems.map((item) => {
                            const isActive = location.pathname === item.path || (item.path === '/' && location.pathname === '/')
                            const hasSubItems = item.subItems && item.subItems.length > 0

                            return (
                                <li key={item.path} className="group/item relative">
                                    <Link
                                        to={item.path}
                                        onClick={() => {
                                            if (window.innerWidth < 768) onClose()
                                        }}
                                        title={isCollapsed ? item.label : ''}
                                        className={`flex transition-all duration-200 rounded-lg group relative
                      ${isCollapsed
                                                ? 'flex-col items-center justify-center py-3 px-1 gap-1'
                                                : 'flex-row items-center gap-3 px-3 py-3'
                                            }
                      ${isActive
                                                ? 'bg-sidebar-active text-green-600 dark:text-[#87bb44]'
                                                : 'text-secondary hover:bg-main hover:text-primary'
                                            }
                    `}
                                    >
                                        <div className={`${isCollapsed ? 'p-1' : ''}`}>
                                            {item.icon}
                                        </div>

                                        <span className={`font-medium transition-all duration-200
                      ${isCollapsed
                                                ? 'text-[10px] text-center leading-tight whitespace-normal break-words w-full'
                                                : 'text-sm whitespace-nowrap'
                                            }
                    `}>
                                            {item.label}
                                        </span>

                                        {/* Professional Side Arrow - Always visible for sub-items */}
                                        {hasSubItems && (
                                            <div className={`text-secondary group-hover/item:text-green-600 dark:group-hover/item:text-[#87bb44] transition-all duration-300 transform 
                                                ${isCollapsed
                                                    ? 'absolute top-1/2 right-1 -translate-y-1/2'
                                                    : 'ml-auto group-hover/item:translate-x-0.5'
                                                }`}>
                                                {isCollapsed ? (
                                                    // Subtle dot/arrow for collapsed state
                                                    <svg className="w-2.5 h-2.5 opacity-70" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                                    </svg>
                                                ) : (
                                                    // Professional chevron for expanded state
                                                    <svg className="w-3.5 h-3.5 opacity-60 group-hover/item:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                                    </svg>
                                                )}
                                            </div>
                                        )}

                                        {/* Active Indicator Strip */}
                                        {isActive && (
                                            <div className={`absolute left-0 bg-[#87bb44] rounded-r
                        ${isCollapsed ? 'w-1 h-8 top-1/2 -translate-y-1/2' : 'w-1 h-8 top-1/2 -translate-y-1/2'}
                      `} />
                                        )}
                                    </Link>

                                    {/* Hover Sub-menu - Refined with wider hover-bridge and snappier transition */}
                                    {hasSubItems && (
                                        <div className={`absolute left-full top-[-8px] pt-2 pb-2 pl-4 -ml-1 z-50 transition-all duration-200 ease-out
                                            opacity-0 pointer-events-none group-hover/item:opacity-100 group-hover/item:pointer-events-auto
                                        `}>
                                            <div className="bg-card/95 backdrop-blur-md border border-subtle rounded-lg shadow-2xl min-w-[220px] py-1.5 ring-1 ring-black/5 dark:ring-white/5 animate-in fade-in zoom-in duration-200">
                                                {item.subItems?.map((sub) => (
                                                    <button
                                                        key={sub.target}
                                                        onClick={() => {
                                                            const element = document.getElementById(sub.target)
                                                            if (element) {
                                                                element.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                                            } else {
                                                                // If not on the right page, navigate there first
                                                                navigate(`${item.path}#${sub.target}`)
                                                            }
                                                            if (window.innerWidth < 768) onClose()
                                                        }}
                                                        className="w-full text-left px-4 py-2.5 text-sm text-secondary hover:bg-main hover:text-green-600 dark:hover:text-[#87bb44] transition-all duration-200 flex items-center justify-between group/sub hover:scale-[1.02] transform-gpu"
                                                    >
                                                        <span className="font-medium">{sub.label}</span>
                                                        <svg className="w-3.5 h-3.5 opacity-0 -translate-x-2 group-hover/sub:opacity-100 group-hover/sub:translate-x-0 transition-all duration-300 text-[#87bb44]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                                        </svg>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </li>
                            )
                        })}
                    </ul>
                </nav>

                {/* Footer - Logout */}
                <div className={`border-t border-subtle ${isCollapsed ? 'p-1' : 'p-2'}`}>
                    <button
                        onClick={logout}
                        title={isCollapsed ? "Logout" : ''}
                        className={`flex transition-all duration-200 rounded-lg group w-full
                            ${isCollapsed
                                ? 'flex-col items-center justify-center py-3 px-1 gap-1'
                                : 'flex-row items-center gap-3 px-3 py-3'
                            }
                            text-secondary hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600
                        `}
                    >
                        <div className={`${isCollapsed ? 'p-1' : ''}`}>
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </div>

                        <span className={`font-medium transition-all duration-200
                            ${isCollapsed
                                ? 'text-[10px] text-center leading-tight whitespace-normal break-words w-full'
                                : 'text-sm whitespace-nowrap'
                            }
                        `}>
                            Logout
                        </span>
                    </button>
                </div>
            </div >
        </>
    )
}

export default Sidebar
