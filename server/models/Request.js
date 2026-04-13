const mongoose = require("mongoose");

const predocSchema = new mongoose.Schema(
  {
    origName:         { type: String },
    url:              { type: String },
    path:             { type: String },
    contentType:      { type: String },
    uploadedAt:       { type: String },
    requirementLabel:   { type: String, default: "" },
    requestFolder:      { type: String, default: "" },
    isResubmission:     { type: Boolean, default: false },
    resubmissionRound:  { type: Number, default: 0 },
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
        // NDA workflow
        "nda_pending", "nda_approved",
        // Shared NDA & Agreement revision
        "stud_revision_requested",
        // Agreement workflow
        "agr_pending_1", "agr_awaiting_rep_signature", "agr_pending_2", "agr_approved",
        // Agreement exception statuses
        "agr_declined", "agr_rep_revision_requested",
      ],
      default: "nda_pending",
    },

    proxyRequestee: {
      isProxy: { type: Boolean, default: false },
      staffUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      // Structured name fields for proxy requestee
      firstName: { type: String, default: "" },
      middleInitial: { type: String, default: "" },
      lastName: { type: String, default: "" },
      // Legacy single fullName field kept for backward compatibility
      fullName: { type: String, default: "" },
      email: { type: String, default: "" },
      idNumber: { type: String, default: "" },
      departmentOrOrganization: { type: String, default: "" },
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

    resubmissionCount: {
      type: Number,
      default: 0,
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

    signingTokenExpiresAt: {
      type: Date,
      default: null,
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

    // Signature timestamps
    studentSignedAt: { type: Date, default: null },
    adminSignedAt:   { type: Date, default: null },
    repSignedAt:     { type: Date, default: null },

    // 5-year retention / archiving
    isArchived: { type: Boolean, default: false },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Query-path indexes used by dashboard/report and owner-specific views.
requestSchema.index({ userId: 1, createdAt: -1 });
requestSchema.index({ status: 1, createdAt: -1 });
requestSchema.index({ isArchived: 1, createdAt: -1 });
requestSchema.index({ isArchived: 1, status: 1, createdAt: -1 });
requestSchema.index({ type: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("Request", requestSchema);
