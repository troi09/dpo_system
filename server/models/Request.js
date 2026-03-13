const mongoose = require("mongoose");

const predocSchema = new mongoose.Schema(
  {
    origName:         { type: String },
    url:              { type: String },
    path:             { type: String },
    contentType:      { type: String },
    uploadedAt:       { type: String },
    requirementLabel: { type: String, default: "" },
    requestFolder:    { type: String, default: "" },
  },
  { _id: false }
);

const requestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: ["nda", "agreement"],
      required: true,
    },

    status: {
      type: String,
      enum: [
        // NDA statuses
        "nda_pending", "nda_approved", "revision_requested",
        // Agreement multi-phase statuses
        "agr_pending_1", "agr_awaiting_rep_signature", "agr_pending_2",
        "agr_approved", "agr_rep_declined", "agr_rep_revision_requested",
      ],
      default: "nda_pending",
    },

    formData: {
      type: Object,
      required: true,
    },

    predocs: {
      type: [predocSchema],
      default: [],
    },

    postdocs: {
      url:              { type: String, default: "" },
      path:             { type: String, default: "" },
      issuedAt:         { type: String, default: "" },
      verificationUrl:  { type: String, default: "" },
    },

    remarks: {
      type: String,
      default: "",
    },

    serialNo: {
      type: String,
      default: "",
      unique: true,
      sparse: true,
    },

    // Agreement e-signature fields
    signingToken: {
      type: String,
      default: "",
    },

    signingTokenUsed: {
      type: Boolean,
      default: false,
    },

    // Representative info (submitted on signing page)
    repInfo: {
      name: { type: String, default: "" },
      govIdDoc: {
        origName:    { type: String, default: "" },
        url:         { type: String, default: "" },
        path:        { type: String, default: "" },
        contentType: { type: String, default: "" },
        uploadedAt:  { type: String, default: "" },
      },
    },

    // Ephemeral signature storage (deleted after final PDF generation)
    authorizerSigUrl:  { type: String, default: "" },
    authorizerSigPath: { type: String, default: "" },
    repSigUrl:         { type: String, default: "" },
    repSigPath:        { type: String, default: "" },

    // NDA e-signature fields
    studentSigUrl:  { type: String, default: "" },
    studentSigPath: { type: String, default: "" },
    adminSigUrl:    { type: String, default: "" },
    adminSigPath:   { type: String, default: "" },

    // 5-year retention / archiving
    isArchived: { type: Boolean, default: false },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Request", requestSchema);
