const mongoose = require("mongoose");

const characterSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    char: { type: String, required: true },
    afterId: { type: String, default: null },
    deleted: { type: Boolean, default: false },
  },
  { _id: false }
);

const documentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: "Untitled Document",
    },
    content: {
      type: String,
      default: "",
    },
    characters: {
      type: [characterSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const Document = mongoose.model("Document", documentSchema);

module.exports = Document;