function compareIds(idA, idB) {
  if (idA > idB) return 1;
  if (idA < idB) return -1;
  return 0;
}

function insertOperation(characters, operation) {
  const { id, afterId } = operation;

  let insertIndex;

  if (afterId === null) {
    insertIndex = 0;
  } else {
    const anchorIndex = characters.findIndex((c) => c.id === afterId);
    insertIndex = anchorIndex === -1 ? characters.length : anchorIndex + 1;
  }

  while (
    insertIndex < characters.length &&
    characters[insertIndex].afterId === afterId &&
    compareIds(characters[insertIndex].id, id) > 0
  ) {
    insertIndex++;
  }

  characters.splice(insertIndex, 0, operation);
}

function deleteOperation(characters, id) {
  const target = characters.find((c) => c.id === id);
  if (target) {
    target.deleted = true;
  }
}

function undeleteOperation(characters, id) {
  const target = characters.find((c) => c.id === id);
  if (target) {
    target.deleted = false;
  }
}

function toText(characters) {
  return characters
    .filter((c) => !c.deleted)
    .map((c) => c.char)
    .join("");
}

function replayOperations(operationBatches) {
  const characters = [];

  for (const batch of operationBatches) {
    for (const op of batch) {
      if (op.kind === "insert") {
        insertOperation(characters, op.character);
      } else if (op.kind === "delete") {
        deleteOperation(characters, op.id);
      } else if (op.kind === "undelete") {
        undeleteOperation(characters, op.id);
      }
    }
  }

  return characters;
}

module.exports = {
  insertOperation,
  deleteOperation,
  undeleteOperation,
  toText,
  replayOperations,
};