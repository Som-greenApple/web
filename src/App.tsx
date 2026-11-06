import { Route, Routes } from 'react-router-dom'
import CrosswalkPage from './pages/CrosswalkPage'
import MainPage from './pages/MainPage'
import OnboardingPage from './pages/OnboardingPage'
import ResultPage from './pages/ResultPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<OnboardingPage />} />
      <Route path="/main" element={<MainPage />} />
      <Route path="/crosswalk/:id" element={<CrosswalkPage />} />
      <Route path="/result" element={<ResultPage />} />
    </Routes>
  )
}

export default App
