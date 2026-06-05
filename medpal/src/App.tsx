import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { AppShell } from './components/AppShell'
import { HomePage } from './pages/HomePage'
import { PrescriptionsPage } from './pages/PrescriptionsPage'
import { UploadPrescriptionPage } from './pages/UploadPrescriptionPage'
import { ConfirmPrescriptionPage } from './pages/ConfirmPrescriptionPage'
import { MedicationsPage } from './pages/MedicationsPage'
import { AddMedicationPage } from './pages/AddMedicationPage'
import { EditMedicationPage } from './pages/EditMedicationPage'
import { CheckinPage } from './pages/CheckinPage'
import { SettingsPage } from './pages/SettingsPage'
import { ChatPage } from './pages/ChatPage'
import { CaregiverSettingsPage } from './pages/CaregiverSettingsPage'
import { AnalyticsPage } from './pages/AnalyticsPage'

function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/prescriptions" element={<PrescriptionsPage />} />
        <Route path="/prescriptions/upload" element={<UploadPrescriptionPage />} />
        <Route path="/prescriptions/:id/confirm" element={<ConfirmPrescriptionPage />} />
        <Route path="/medications" element={<MedicationsPage />} />
        <Route path="/medications/add" element={<AddMedicationPage />} />
        <Route path="/medications/:id/edit" element={<EditMedicationPage />} />
        <Route path="/checkin" element={<CheckinPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/assistant" element={<ChatPage />} />
        <Route path="/caregiver" element={<CaregiverSettingsPage />} />
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
