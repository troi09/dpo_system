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
      enum: ["pending", "approved", "revision_required"],
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
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Request", requestSchema);