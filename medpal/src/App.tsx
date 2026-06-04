import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AppShell } from './components/AppShell'
import { LoginPage } from './pages/LoginPage'
import { HomePage } from './pages/HomePage'
import { PrescriptionsPage } from './pages/PrescriptionsPage'
import { UploadPrescriptionPage } from './pages/UploadPrescriptionPage'
import { ConfirmPrescriptionPage } from './pages/ConfirmPrescriptionPage'
import { MedicationsPage } from './pages/MedicationsPage'
import { AddMedicationPage } from './pages/AddMedicationPage'
import { CheckinPage } from './pages/CheckinPage'
import { ChatPage } from './pages/ChatPage'

function AppRoutes() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-svh">
        <p className="text-sm text-gray-400">A carregar...</p>
      </div>
    )
  }

  if (!session) {
    return (
      <Routes>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/prescriptions" element={<PrescriptionsPage />} />
        <Route path="/prescriptions/upload" element={<UploadPrescriptionPage />} />
        <Route path="/prescriptions/:id/confirm" element={<ConfirmPrescriptionPage />} />
        <Route path="/medications" element={<MedicationsPage />} />
        <Route path="/medications/add" element={<AddMedicationPage />} />
        <Route path="/checkin" element={<CheckinPage />} />
        <Route path="/assistant" element={<ChatPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
