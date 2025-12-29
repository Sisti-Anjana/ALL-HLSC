import React from 'react'
import Card from '../common/Card'
import { formatDistanceToNow } from 'date-fns'

interface Activity {
  id: string
  type: 'issue' | 'check' | 'unlock' | 'user' | 'lock'
  message: string
  user: string
  timestamp: string
}

const RecentActivity: React.FC = () => {
  const activities: Activity[] = [
    {
      id: '1',
      type: 'issue',
      message: 'Issue logged - Port A1, Hour 14: Inverter fault',
      user: 'John Smith',
      timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    },
    {
      id: '2',
      type: 'check',
      message: 'Sites checked - Port B2, All sites OK',
      user: 'Jane Doe',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    },
    {
      id: '3',
      type: 'unlock',
      message: 'Portfolio unlocked - Admin override',
      user: 'Admin',
      timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    },
  ]
  
  const getIcon = (type: string) => {
    switch (type) {
      case 'issue': return '🔴'
      case 'check': return '✅'
      case 'unlock': return '🔓'
      case 'lock': return '🔒'
      case 'user': return '👤'
      default: return '📝'
    }
  }
  
  return (
    <Card>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">🔔 Recent Activity</h2>
      <div className="space-y-3">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
            <span className="text-2xl">{getIcon(activity.type)}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900">{activity.message}</p>
              <p className="text-xs text-gray-500 mt-1">
                {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })} - {activity.user}
              </p>
            </div>
          </div>
        ))}
      </div>
      <button className="mt-4 w-full text-sm text-blue-600 hover:text-blue-700 font-medium">
        View All Activity →
      </button>
    </Card>
  )
}

export default RecentActivity

