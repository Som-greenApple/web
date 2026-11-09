import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import LocationProvider from './context/LocationProvider'
import AppProvider from './context/AppProvider'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AppProvider>
        <LocationProvider>
          <App />
        </LocationProvider>
      </AppProvider>
    </BrowserRouter>
  </StrictMode>,
)