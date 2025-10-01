import { useState } from 'react'
import Login from './components/Login'
import SignUp from './components/SignUp'
import Dashboard from './components/Dashboard'
import LandingPage from './components/LandingPage'

function App() {
  const [currentView, setCurrentView] = useState('landing') // 'landing', 'login', 'signup', 'dashboard'

  const handleLogin = () => {
    setCurrentView('dashboard')
  }

  const handleSignUp = () => {
    setCurrentView('dashboard')
  }

  const handleBackToLanding = () => {
    setCurrentView('landing')
  }

  const handleShowLogin = () => {
    setCurrentView('login')
  }

  const handleShowSignUp = () => {
    setCurrentView('signup')
  }

  const handleTryDashboard = () => {
    setCurrentView('dashboard')
  }

  // Render different views based on current state
  if (currentView === 'dashboard') {
    return <Dashboard onBack={handleBackToLanding} />
  }

  if (currentView === 'login') {
    return <Login onLogin={handleLogin} onBack={handleBackToLanding} />
  }

  if (currentView === 'signup') {
    return <SignUp onSignUp={handleSignUp} onBack={handleBackToLanding} />
  }

  return (
    <LandingPage
      onLogin={handleShowLogin}
      onSignUp={handleShowSignUp}
      onTryDashboard={handleTryDashboard}
    />
  )
}

export default App
