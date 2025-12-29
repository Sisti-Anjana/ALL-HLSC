import React from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../common/Card'

const QuickActions: React.FC = () => {
  const navigate = useNavigate()
  
  const actions = [
    {
      icon: '➕',
      title: 'Log New Issue',
      description: 'Report a new portfolio issue',
      onClick: () => navigate('/issues'),
      color: 'bg-blue-50 hover:bg-blue-100 text-blue-600',
    },
    {
      icon: '📋',
      title: 'View All Issues',
      description: 'Browse and manage issues',
      onClick: () => navigate('/issues'),
      color: 'bg-green-50 hover:bg-green-100 text-green-600',
    },
    {
      icon: '📊',
      title: 'View Analytics',
      description: 'Coverage and performance',
      onClick: () => navigate('/'),
      color: 'bg-purple-50 hover:bg-purple-100 text-purple-600',
    },
  ]
  
  return (
    <Card>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">🚀 Quick Actions</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            className={`p-4 rounded-lg border-2 border-transparent hover:border-gray-200 transition-all text-left ${action.color}`}
          >
            <div className="text-3xl mb-2">{action.icon}</div>
            <h3 className="font-semibold mb-1">{action.title}</h3>
            <p className="text-sm opacity-75">{action.description}</p>
          </button>
        ))}
      </div>
    </Card>
  )
}

export default QuickActions

