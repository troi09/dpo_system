export const FIELDS_FILE_SLOTS_CONFIG = {
  nda: {
    orgactivities: {
      label: "Student Organization Activities",
      fields: [
        { name: "projectTitle", label: "Project Title", required: true },
      ],
      fileSlots: [
        { label: "Letter of Intent", required: true },
        { label: "School ID", required: true },
        { label: "Registration Form", required: true },
        { label: "Sample Forms or Collaterals (if applicable)", required: false },
      ],
    },

    research: {
      label: "Conduct of Research",
      fields: [
        { name: "researchTitle", label: "Research Title", required: true },
      ],
      fileSlots: [
        { label: "Letter of Intent", required: true },
        { label: "Questionnaire with Data Privacy Consent Form", required: true },
        { label: "School Id", required: true },
        { label: "Registration Form", required: true },
      ],
    },
  },

  agreement: {
    label: "Agreement",
    fields: [
      { name: "repFirstName", label: "First Name", required: true },
      { name: "repMiddleInitial", label: "Middle Name", required: false },
      { name: "repLastName", label: "Last Name", required: true },
      { name: "repEmail", label: "Email", required: true, type: "email" },
    ],
    // Note: Representative's Government Issued Valid ID is now collected directly
    // from the representative on the signing page, not from the student.
    fileSlots: [
      { label: "Notarized Authorization Letter", required: true },
      { label: "Requestor's Government Issued Valid ID", required: true },
    ],
  },
};
