const OperationLog = require("../models/OperationLog");
const { replayOperations } = require("../crdt/crdt");

async function reconstructAsOf(documentId, upToDate) {
  const logs = await OperationLog.find({
    documentId,
    createdAt: { $lte: upToDate },
  }).sort({ createdAt: 1 });

  const batches = logs.map((log) => log.operations);

  return replayOperations(batches);
}

module.exports = reconstructAsOf;