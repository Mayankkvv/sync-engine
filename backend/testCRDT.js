const { createState, insertOperation, localInsert, deleteOperation, toText } = require("./crdt/crdt");

function testConcurrentInsertConvergence() {
  const replicaA = createState("A");
  const replicaB = createState("B");

  const opH = localInsert(replicaA, null, "H");
  const opI = localInsert(replicaA, opH.id, "i");

  insertOperation(replicaB, opH);
  insertOperation(replicaB, opI);

  const opBang = localInsert(replicaA, opI.id, "!");
  const opQuestion = { id: "B-1", char: "?", afterId: opI.id, deleted: false };

  insertOperation(replicaA, opQuestion);

  insertOperation(replicaB, opQuestion);
  insertOperation(replicaB, opBang);

  console.log("Replica A (order: !, then ?):", toText(replicaA));
  console.log("Replica B (order: ?, then !):", toText(replicaB));
  console.log("Converged:", toText(replicaA) === toText(replicaB));
}

function testDeleteInsertRace() {
  const replicaA = createState("A");
  const replicaB = createState("B");

  const opH = localInsert(replicaA, null, "H");
  const opI = localInsert(replicaA, opH.id, "i");
  const opBang = localInsert(replicaA, opI.id, "!");

  for (const op of [opH, opI, opBang]) {
    insertOperation(replicaB, op);
  }

  deleteOperation(replicaA, opBang.id);
  const opQuestion = localInsert(replicaA, opBang.id, "?");

  insertOperation(replicaB, opQuestion);
  deleteOperation(replicaB, opBang.id);

  console.log("Replica A (delete, then insert):", toText(replicaA));
  console.log("Replica B (insert, then delete):", toText(replicaB));
  console.log("Converged:", toText(replicaA) === toText(replicaB));
}

testConcurrentInsertConvergence();
testDeleteInsertRace();