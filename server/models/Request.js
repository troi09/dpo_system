const mongoose = require("mongoose");

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

    // store request fields here
    formData: {
      type: Object,
      required: true,
    },

    predocs: {
      type: [
        {
          origName: String,
          url: String,
          path: String,
          contentType: String,
          uploadedAt: String,
        },
      ],
      default: [],
    },

    postdocs: {
      url: { type: String, default: "" },
      path: { type: String, default: "" },
      issuedAt: { type: String, default: "" },
      verificationUrl: { type: String, default: "" },
    },

    remarks: {
      type: String,
      default: "",
    },

    serialNo: {
      type: String,
      default: "",
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Request", requestSchema);