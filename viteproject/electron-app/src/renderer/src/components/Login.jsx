const Login = ({ onLogin, onBack }) => {
  const handleSubmit = (e) => {
    e.preventDefault()
    // Simulate login process
    if (onLogin) {
      onLogin()
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800">
      <div className="bg-gray-800/50 backdrop-blur-sm shadow-xl rounded-2xl p-8 w-96 border border-gray-700/50">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">Welcome Back ✍️</h1>
          <p className="text-gray-400">Sign in to your WinSign account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your email"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your password"
              required
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-600">Remember me</span>
            </label>
            <a href="#" className="text-sm text-blue-600 hover:text-blue-500">
              Forgot password?
            </a>
          </div>

          <button
            type="submit"
            className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            Sign In
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <button className="text-blue-600 hover:text-blue-500 font-medium">Sign up</button>
          </p>
        </div>

        {onBack && (
          <div className="mt-4 text-center">
            <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700">
              ← Back to home
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Login
