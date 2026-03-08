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
        "pending", "approved", "revision_requested",
        // Agreement multi-phase statuses
        "submitted", "awaiting_signature", "pending_approval", "completed",
        "declined", "rep_revision_requested",
      ],
      default: "pending",
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

    // 5-year retention / archiving
    isArchived: { type: Boolean, default: false },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Request", requestSchema);
