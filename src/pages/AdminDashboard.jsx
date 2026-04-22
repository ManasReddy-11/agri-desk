import { useState } from 'react';
import Header from '../components/Header';

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState('overview');

  // Sample data
  const stats = [
    {
      id: 1,
      label: 'Total Products',
      value: 248,
      icon: '📦',
      bgColor: 'from-green-500 to-emerald-500',
      change: '+12% from last month',
    },
    {
      id: 2,
      label: 'Total Farmers',
      value: 42,
      icon: '👨‍🌾',
      bgColor: 'from-blue-500 to-cyan-500',
      change: '+3 new farmers',
    },
    {
      id: 3,
      label: 'Total Orders',
      value: 156,
      icon: '📋',
      bgColor: 'from-orange-500 to-amber-500',
      change: '+28 this week',
    },
    {
      id: 4,
      label: 'Revenue',
      value: '₹45,320',
      icon: '💰',
      bgColor: 'from-purple-500 to-pink-500',
      change: '+18% growth',
    },
  ];

  const recentUsers = [
    {
      id: 1,
      name: 'Rajesh Sharma',
      role: 'Farmer',
      joinDate: '18 Mar 2026',
      status: 'Active',
    },
    {
      id: 2,
      name: 'Priya Patel',
      role: 'Consumer',
      joinDate: '17 Mar 2026',
      status: 'Active',
    },
    {
      id: 3,
      name: 'Arjun Kumar',
      role: 'Farmer',
      joinDate: '16 Mar 2026',
      status: 'Pending',
    },
    {
      id: 4,
      name: 'Neha Singh',
      role: 'Consumer',
      joinDate: '15 Mar 2026',
      status: 'Active',
    },
  ];

  const systemHealth = [
    { name: 'Server Status', status: 'Healthy', value: 99.9 },
    { name: 'Database', status: 'Optimal', value: 98.5 },
    { name: 'API Response', status: 'Fast', value: 145 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-green-100">
      {/* Header */}
      <Header showLogout={true} />

      {/* Main Content */}
      <div className="max-w-lg mx-auto px-4 py-6 pb-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl shadow-lg p-6 text-white mb-6">
          <h2 className="text-2xl font-bold mb-2">Admin Dashboard</h2>
          <p className="text-green-100">System overview and management</p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'users', label: 'Users' },
            { id: 'system', label: 'System' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                activeSection === tab.id
                  ? 'bg-green-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-green-500'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Section */}
        {activeSection === 'overview' && (
          <div>
            {/* Stats Grid */}
            <div className="space-y-4 mb-8">
              {stats.map((stat) => (
                <div
                  key={stat.id}
                  className={`bg-gradient-to-r ${stat.bgColor} rounded-2xl shadow-lg p-6 text-white overflow-hidden relative`}
                >
                  {/* Background decoration */}
                  <div className="absolute -right-8 -top-8 opacity-10 text-6xl">
                    {stat.icon}
                  </div>

                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium opacity-90">{stat.label}</p>
                      <span className="text-2xl">{stat.icon}</span>
                    </div>
                    <h3 className="text-3xl font-bold mb-2">{stat.value}</h3>
                    <p className="text-xs opacity-75">{stat.change}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <h3 className="text-lg font-bold text-gray-800 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              {['View Logs', 'Manage Roles', 'Settings', 'Reports'].map(
                (action) => (
                  <button
                    key={action}
                    className="py-3 px-4 rounded-xl bg-white border-2 border-gray-200 hover:border-green-500 hover:text-green-600 font-semibold text-gray-800 transition-all"
                  >
                    {action}
                  </button>
                )
              )}
            </div>
          </div>
        )}

        {/* Users Section */}
        {activeSection === 'users' && (
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-4">Recent Users</h3>
            <div className="space-y-3">
              {recentUsers.map((user) => (
                <div
                  key={user.id}
                  className="bg-white rounded-2xl shadow-md p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-bold text-gray-800">{user.name}</h4>
                      <p className="text-xs text-gray-600">{user.role}</p>
                    </div>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        user.status === 'Active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {user.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">Joined: {user.joinDate}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* System Section */}
        {activeSection === 'system' && (
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-4">System Health</h3>
            <div className="space-y-3">
              {systemHealth.map((item, index) => (
                <div key={index} className="bg-white rounded-2xl shadow-md p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-800">{item.name}</span>
                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-100 text-green-700">
                      {item.status}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full"
                      style={{ width: `${item.value}%` }}
                    ></div>
                  </div>

                  <p className="text-xs text-gray-600 mt-2">
                    {typeof item.value === 'number'
                      ? item.value > 100
                        ? `${item.value}ms`
                        : `${item.value}%`
                      : item.value}
                  </p>
                </div>
              ))}
            </div>

            {/* System Settings */}
            <h3 className="text-lg font-bold text-gray-800 mt-6 mb-4">
              Settings
            </h3>
            <div className="bg-white rounded-2xl shadow-md p-4 space-y-3">
              {['Maintenance Mode', 'Email Notifications', 'Auto Backups'].map(
                (setting) => (
                  <div
                    key={setting}
                    className="flex items-center justify-between pb-3 border-b border-gray-200 last:border-b-0"
                  >
                    <span className="font-medium text-gray-800">{setting}</span>
                    <div className="w-10 h-6 bg-green-500 rounded-full cursor-pointer relative">
                      <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
