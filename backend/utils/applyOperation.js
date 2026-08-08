function applyOperation(content, operation) {
  const { position, deleteCount, insertText } = operation;
  return content.slice(0, position) + insertText + content.slice(position + deleteCount);
}

module.exports = applyOperation;