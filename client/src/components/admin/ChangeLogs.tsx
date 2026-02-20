import React from 'react'
import Badge from '../common/Badge'

const ChangeLogs: React.FC = () => {
    const versions = [
        {
            version: 'v2.1.0',
            date: 'Feb 20, 2026',
            status: 'Current',
            changes: [
                {
                    type: 'New',
                    title: 'Smart User Creation',
                    description: [
                        'Implemented credential reuse flow: the system now automatically detects existing users across all tenants.',
                        'Password field is hidden for existing users, and Full Name is auto-populated for efficiency.',
                        'Streamlined tenant association for existing team members.'
                    ]
                },
                {
                    type: 'Update',
                    title: 'Admin Activity Logs',
                    description: [
                        'Added "Today" filter to the Admin Logs tab to focus on current activity.',
                        'Implemented "New Today" activity badge and counter.',
                        'Added quick-toggle between daily activity and full history.'
                    ]
                },
                {
                    type: 'Fix',
                    title: 'User Creation Validation',
                    description: [
                        'Fixed a bug where a password was incorrectly required when adding an existing global user.',
                        'Improved form state management to ensure clean fields when opening/closing modals.'
                    ]
                },
                {
                    type: 'Update',
                    title: 'Direct Access Change Logs',
                    description: [
                        'Added a dedicated Change Logs page with versioning and categorized updates.',
                        'Integrated quick-access link in the User Profile menu for better transparency.'
                    ]
                },
                {
                    type: 'Update',
                    title: 'Header Branding Refinement',
                    description: [
                        'Simplified the application header Branding for a cleaner, unified look.',
                        'Updated main title to "HLSC" and subheading to "High Level System Check".',
                        'Removed client-specific name logic from the primary header area.'
                    ]
                }
            ]
        }
    ]

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-primary">Change Logs</h1>
                <p className="mt-2 text-secondary">Stay updated with the latest improvements and features.</p>
            </div>

            <div className="space-y-12">
                {versions.map((v) => (
                    <div key={v.version} className="relative">
                        {/* Version Header */}
                        <div className="flex items-baseline gap-4 mb-6">
                            <h2 className="text-2xl font-bold text-primary">{v.version}</h2>
                            <span className="text-sm text-secondary font-medium">{v.date}</span>
                            {v.status && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 uppercase tracking-wider">
                                    {v.status}
                                </span>
                            )}
                        </div>

                        {/* Changes Cards */}
                        <div className="space-y-6">
                            {v.changes.map((change, idx) => (
                                <div
                                    key={`${v.version}-change-${idx}`}
                                    className="bg-card border border-subtle rounded-xl shadow-sm overflow-hidden"
                                >
                                    <div className="p-6">
                                        <div className="flex items-center gap-3 mb-4">
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${change.type === 'New' ? 'bg-green-100 text-green-700' :
                                                change.type === 'Update' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-orange-100 text-orange-700'
                                                }`}>
                                                {change.type}
                                            </span>
                                            <h3 className="text-lg font-bold text-primary">{change.title}</h3>
                                        </div>

                                        <ul className="space-y-2 ml-4">
                                            {change.description.map((item, i) => (
                                                <li key={i} className="text-secondary text-sm flex gap-3">
                                                    <span className="text-[#87bb44] font-bold">•</span>
                                                    <span className="leading-relaxed">{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-12 pt-8 border-t border-subtle text-center">
                <p className="text-xs text-secondary italic">
                    Application Version: v2.1.0 • Built with precision for AGS
                </p>
            </div>
        </div>
    )
}

export default ChangeLogs
