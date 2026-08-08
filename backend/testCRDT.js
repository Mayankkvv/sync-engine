const { insertOperation, deleteOperation, toText } = require("./crdt/crdt");

function testConcurrentInsertConvergence() {
  const charactersA = [];
  const charactersB = [];

  const opH = { id: "A-1", char: "H", afterId: null, deleted: false };
  const opI = { id: "A-2", char: "i", afterId: "A-1", deleted: false };

  insertOperation(charactersA, opH);
  insertOperation(charactersA, opI);
  insertOperation(charactersB, opH);
  insertOperation(charactersB, opI);

  const opBang = { id: "A-3", char: "!", afterId: "A-2", deleted: false };
  const opQuestion = { id: "B-1", char: "?", afterId: "A-2", deleted: false };

  insertOperation(charactersA, opBang);
  insertOperation(charactersA, opQuestion);

  insertOperation(charactersB, opQuestion);
  insertOperation(charactersB, opBang);

  console.log("Replica A (order: !, then ?):", toText(charactersA));
  console.log("Replica B (order: ?, then !):", toText(charactersB));
  console.log("Converged:", toText(charactersA) === toText(charactersB));
}

function testDeleteInsertRace() {
  const charactersA = [];
  const charactersB = [];

  const opH = { id: "A-1", char: "H", afterId: null, deleted: false };
  const opI = { id: "A-2", char: "i", afterId: "A-1", deleted: false };
  const opBang = { id: "A-3", char: "!", afterId: "A-2", deleted: false };

  for (const op of [opH, opI, opBang]) {
    insertOperation(charactersA, op);
    insertOperation(charactersB, op);
  }

  deleteOperation(charactersA, opBang.id);
  const opQuestion = { id: "A-4", char: "?", afterId: opBang.id, deleted: false };
  insertOperation(charactersA, opQuestion);

  insertOperation(charactersB, opQuestion);
  deleteOperation(charactersB, opBang.id);

  console.log("Replica A (delete, then insert):", toText(charactersA));
  console.log("Replica B (insert, then delete):", toText(charactersB));
  console.log("Converged:", toText(charactersA) === toText(charactersB));
}

testConcurrentInsertConvergence();
testDeleteInsertRace();