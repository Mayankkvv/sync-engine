export function compareIds(idA, idB) {
  if (idA > idB) return 1;
  if (idA < idB) return -1;
  return 0;
}

export function insertOperation(characters, operation) {
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

export function deleteOperation(characters, id) {
  const target = characters.find((c) => c.id === id);
  if (target) {
    target.deleted = true;
  }
}

export function toText(characters) {
  return characters
    .filter((c) => !c.deleted)
    .map((c) => c.char)
    .join("");
}

export function visibleIdAt(characters, index) {
  const visible = characters.filter((c) => !c.deleted);
  if (index < 0 || index >= visible.length) return null;
  return visible[index].id;
}