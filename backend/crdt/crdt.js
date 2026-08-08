function createState(siteId) {
  return {
    siteId,
    counter: 0,
    characters: [],
  };
}

function nextId(state) {
  state.counter++;
  return `${state.siteId}-${state.counter}`;
}

function compareIds(idA, idB) {
  if (idA > idB) return 1;
  if (idA < idB) return -1;
  return 0;
}

function insertOperation(state, operation) {
  const { id, afterId } = operation;

  let insertIndex;

  if (afterId === null) {
    insertIndex = 0;
  } else {
    const anchorIndex = state.characters.findIndex((c) => c.id === afterId);
    insertIndex = anchorIndex === -1 ? state.characters.length : anchorIndex + 1;
  }

  while (
    insertIndex < state.characters.length &&
    state.characters[insertIndex].afterId === afterId &&
    compareIds(state.characters[insertIndex].id, id) > 0
  ) {
    insertIndex++;
  }

  state.characters.splice(insertIndex, 0, operation);
}

function localInsert(state, afterId, char) {
  const operation = {
    id: nextId(state),
    char,
    afterId,
    deleted: false,
  };

  insertOperation(state, operation);
  return operation;
}

function deleteOperation(state, id) {
  const target = state.characters.find((c) => c.id === id);
  if (target) {
    target.deleted = true;
  }
}

function toText(state) {
  return state.characters
    .filter((c) => !c.deleted)
    .map((c) => c.char)
    .join("");
}

module.exports = {
  createState,
  insertOperation,
  localInsert,
  deleteOperation,
  toText,
};