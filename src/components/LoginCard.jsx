import { useState } from 'react';

export default function LoginCard() {
  const [selectedRole, setSelectedRole] = useState('consumer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const roles = [
    { id: 'consumer', label: 'Consumer', icon: '🛒' },
    { id: 'farmer', label: 'Farmer', icon: '👨‍🌾' },
    { id: 'admin', label: 'Admin', icon: '⚙️' },
  ];

  const handleLogin = (e) => {
    e.preventDefault();
    // No backend integration - just for UI display
    console.log('Login attempt:', { role: selectedRole, email, password });
  };

  return (
    <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8">
      {/* Role Selection */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-gray-700 mb-4 text-center">
          Select Your Role
        </h2>
        <div className="flex gap-3">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => setSelectedRole(role.id)}
              className={`flex-1 py-3 px-3 rounded-xl font-medium text-sm transition-all duration-300 flex flex-col items-center gap-2 ${
                selectedRole === role.id
                  ? 'bg-green-600 text-white shadow-lg scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="text-lg">{role.icon}</span>
              <span>{role.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Login Form */}
      <form onSubmit={handleLogin} className="space-y-5">
        {/* Email Input */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:outline-none transition-colors placeholder-gray-400 text-gray-800"
          />
        </div>

        {/* Password Input */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
            Password
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:outline-none transition-colors placeholder-gray-400 text-gray-800"
          />
        </div>

        {/* Login Button */}
        <button
          type="submit"
          className="w-full py-3 px-4 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg mt-6"
        >
          Login
        </button>
      </form>

      {/* Register Link */}
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Don't have an account?{' '}
          <a href="#" className="font-semibold text-green-600 hover:text-green-700 transition-colors">
            Register here
          </a>
        </p>
      </div>
    </div>
  );
}
