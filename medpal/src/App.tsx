import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { WalkthroughProvider } from './contexts/WalkthroughContext'
import { AppShell } from './components/AppShell'
import { HomePage } from './pages/HomePage'
import { PrescriptionsPage } from './pages/PrescriptionsPage'
import { UploadPrescriptionPage } from './pages/UploadPrescriptionPage'
import { ConfirmPrescriptionPage } from './pages/ConfirmPrescriptionPage'
import { MedicationsPage } from './pages/MedicationsPage'
import { AddMedicationPage } from './pages/AddMedicationPage'
import { EditMedicationPage } from './pages/EditMedicationPage'
import { MedicationGuidePage } from './pages/MedicationGuidePage'
import { CheckinPage } from './pages/CheckinPage'
import { SettingsPage } from './pages/SettingsPage'
import { ChatPage } from './pages/ChatPage'
import { CaregiverSettingsPage } from './pages/CaregiverSettingsPage'
import { MessagesPage } from './pages/MessagesPage'
import { AdminPage } from './pages/AdminPage'
import { AuthPage } from './pages/AuthPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { YourBoxPage } from './pages/YourBoxPage'
import { LogAdHocDosePage } from './pages/LogAdHocDosePage'

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route element={<AppShell />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/prescriptions" element={<PrescriptionsPage />} />
        <Route path="/prescriptions/upload" element={<UploadPrescriptionPage />} />
        <Route path="/prescriptions/:id/confirm" element={<ConfirmPrescriptionPage />} />
        <Route path="/medications" element={<MedicationsPage />} />
        <Route path="/medications/add" element={<AddMedicationPage />} />
        <Route path="/medications/:id/edit" element={<EditMedicationPage />} />
        <Route path="/medications/:id/guide" element={<MedicationGuidePage />} />
        <Route path="/checkin" element={<CheckinPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/assistant" element={<ChatPage />} />
        <Route path="/caregiver" element={<CaregiverSettingsPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/box" element={<YourBoxPage />} />
        <Route path="/box/log" element={<LogAdHocDosePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WalkthroughProvider>
          <AppRoutes />
        </WalkthroughProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
