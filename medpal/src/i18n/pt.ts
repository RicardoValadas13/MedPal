export const pt = {
  // Auth
  auth: {
    title: 'MedPal',
    subtitle: 'Your medication, organised.',
    emailLabel: 'Email',
    emailPlaceholder: 'your@email.com',
    magicLinkButton: 'Sign in with magic link',
    magicLinkSent: 'Check your email — we sent you a sign-in link.',
    signOut: 'Sign out',
  },
  // Nav
  nav: {
    home: 'Home',
    prescriptions: 'Prescriptions',
    medications: 'Medications',
    checkin: 'Check-in',
  },
  // Upload prescription
  upload: {
    title: 'Add prescription',
    dropzone: 'Drop the PDF or photo of your prescription here',
    orDivider: 'or',
    takePhoto: 'Take photo',
    uploadPdf: 'Upload PDF',
    pdfNote: 'A digital PDF is read directly — no AI vision needed.',
    continue: 'Continue',
    uploading: 'Uploading...',
    processing: 'Processing prescription...',
    errorUpload: 'Error uploading file. Please try again.',
    errorExtract: 'Could not extract prescription. Please check the image.',
  },
  // Confirmation gate
  confirm: {
    title: 'Confirm your medication',
    subtitle: 'We read your prescription. Please review before saving.',
    matchedChip: 'Identified',
    reviewChip: 'Review',
    unmatchedChip: 'Not found',
    dosageLabel: 'Dosage',
    quantityLabel: 'Quantity',
    leafletLink: 'View patient leaflet',
    drugSelectPlaceholder: 'Select the correct medication',
    confirmButton: 'Confirm and save',
    confirmingButton: 'Saving...',
    errorConfirm: 'Error saving. Please try again.',
  },
  // Add medication manually
  addMedication: {
    title: 'Add medication',
    searchPlaceholder: 'Search Infomed...',
    doseLabel: 'Dose per intake',
    hoursLabel: 'Times',
    daysLabel: 'Days',
    withFoodLabel: 'Take with food',
    saveButton: 'Save',
    days: {
      Mon: 'Mon',
      Tue: 'Tue',
      Wed: 'Wed',
      Thu: 'Thu',
      Fri: 'Fri',
      Sat: 'Sat',
      Sun: 'Sun',
    },
  },
  // Daily check-in
  checkin: {
    title: 'How are you feeling today?',
    moods: ['Very bad', 'Bad', 'OK', 'Good', 'Very good'],
    medicationQuestion: 'Did you take your medication today?',
    takenButton: 'Taken',
    markButton: 'Mark',
    sideEffectsQuestion: 'Any side effects?',
    sideEffects: ['None', 'Nausea', 'Dizziness', 'Drowsiness'],
    notesPlaceholder: 'Optional notes...',
    submitButton: 'Submit',
    submittingButton: 'Submitting...',
    successMessage: 'Check-in recorded!',
  },
  // Home
  home: {
    greeting: 'Hello',
    todayMedications: "Today's medications",
    noMedications: 'No medications for today.',
    addPrescription: 'Add prescription',
    addManual: 'Add manually',
  },
  // Common
  common: {
    back: 'Back',
    cancel: 'Cancel',
    error: 'An error occurred.',
    loading: 'Loading...',
  },
}

export type Translations = typeof pt
