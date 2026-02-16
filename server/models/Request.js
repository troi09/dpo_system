const mongoose = require("mongoose");

const requestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    requestType: {
      type: String,
      enum: ["nda", "agreement"],
      required: true,
    },

    // store request fields here
    formData: {
      type: Object,
      required: true,
    },

    requirements: {
      type: [
        {
          originalName: String,
          url: String,
          path: String,
          contentType: String,
          size: Number,
          uploadedAt: String,
        },
      ],
      default: [],
    },

    status: {
      type: String,
      enum: ["pending", "approved", "revision_required"],
      default: "pending",
    },

    adminRemarks: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Request", requestSchema);
