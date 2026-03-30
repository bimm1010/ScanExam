import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { MobileScanView } from './pages/MobileScanView'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/scan/:sessionId" element={<MobileScanView />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
