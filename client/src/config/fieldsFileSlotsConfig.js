export const FIELDS_FILE_SLOTS_CONFIG = {
  nda: {
    orgactivities: {
      label: "Student Organization Activities",
      fields: [
        { name: "projectTitle", label: "Project Title", required: true },
      ],
      fileSlots: [
        { label: "Letter of Intent", required: true },
        { label: "School ID", required: false },
        { label: "Registration Form", required: false },
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
        { label: "Copy of Questionnaire with Data Privacy Consent Form", required: false },
        { label: "School Id", required: false },
        { label: "Registration Form", required: false },
      ],
    },
  },

  agreement: {
    label: "Agreement",
    fields: [
      { name: "repName", label: "Name of Representative", required: true },
      { name: "repEmail", label: "Email of Representative", required: false},
    ],
    // Note: Representative's Government Issued Valid ID is now collected directly
    // from the representative on the signing page, not from the student.
    fileSlots: [
      { label: "Notarized Authorization Letter", required: true },
      { label: "Requestor's Government Issued Valid ID", required: false },
    ],
  },
};
