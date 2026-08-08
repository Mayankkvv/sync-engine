export function computeOperation(oldStr, newStr) {
  let prefixLength = 0;
  while (
    prefixLength < oldStr.length &&
    prefixLength < newStr.length &&
    oldStr[prefixLength] === newStr[prefixLength]
  ) {
    prefixLength++;
  }

  let oldEnd = oldStr.length;
  let newEnd = newStr.length;

  while (
    oldEnd > prefixLength &&
    newEnd > prefixLength &&
    oldStr[oldEnd - 1] === newStr[newEnd - 1]
  ) {
    oldEnd--;
    newEnd--;
  }

  return {
    position: prefixLength,
    deleteCount: oldEnd - prefixLength,
    insertText: newStr.slice(prefixLength, newEnd),
  };
}

export function applyOperation(str, operation) {
  const { position, deleteCount, insertText } = operation;
  return str.slice(0, position) + insertText + str.slice(position + deleteCount);
}