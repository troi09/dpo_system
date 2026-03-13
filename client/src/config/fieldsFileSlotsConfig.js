export const FIELDS_FILE_SLOTS_CONFIG = {
  nda: {
    orgactivities: {
      label: "Student Organization Activities",
      fields: [
        { name: "title", label: "Title", required: true },
        { name: "details", label: "Details (optional)", required: false},
      ],
      fileSlots: [
        { label: "Letter of Intent", required: true },
        { label: "School ID", required: false },
        { label: "Registration Form", required: false },
        { label: "Sample Forms or Collaterals", required: false },
      ],
    },

    research: {
      label: "Conduct of Research", 
      fields: [
        { name: "1dataField", label: "Data Field 1", required: true },
        { name: "2dataField", label: "Data Field 2", required: false },
        { name: "3dataField", label: "Data Field 3", required: false },
      ],
      fileSlots: [
        { label: "Requirement 1", required: true },
        { label: "Requirement 2", required: false },
        { label: "Requirement 3", required: false },
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
