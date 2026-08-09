const mongoose = require("mongoose");

const characterSchema = new mongoose.Schema(
  {
    id: String,
    char: String,
    afterId: { type: String, default: null },
    deleted: Boolean,
  },
  { _id: false }
);

const operationSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ["insert", "delete", "undelete"], required: true },
    character: characterSchema,
    id: String,
  },
  { _id: false }
);

const operationLogSchema = new mongoose.Schema(
  {
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: "Document", required: true },
    operations: { type: [operationSchema], required: true },
  },
  { timestamps: true }
);

const OperationLog = mongoose.model("OperationLog", operationLogSchema);

module.exports = OperationLog;