const { insertOperation, deleteOperation, undeleteOperation, toText } = require("./crdt");

describe("CRDT basic operations", () => {
  test("inserts a single character", () => {
    const characters = [];
    insertOperation(characters, { id: "A-1", char: "H", afterId: null, deleted: false });
    expect(toText(characters)).toBe("H");
  });

  test("inserts characters in order when chained with afterId", () => {
    const characters = [];
    insertOperation(characters, { id: "A-1", char: "H", afterId: null, deleted: false });
    insertOperation(characters, { id: "A-2", char: "i", afterId: "A-1", deleted: false });
    expect(toText(characters)).toBe("Hi");
  });

  test("deleteOperation hides a character without removing it from the array", () => {
    const characters = [{ id: "A-1", char: "H", afterId: null, deleted: false }];
    deleteOperation(characters, "A-1");
    expect(toText(characters)).toBe("");
    expect(characters).toHaveLength(1);
    expect(characters[0].deleted).toBe(true);
  });

  test("undeleteOperation brings a deleted character back", () => {
    const characters = [{ id: "A-1", char: "H", afterId: null, deleted: true }];
    undeleteOperation(characters, "A-1");
    expect(toText(characters)).toBe("H");
  });
});

describe("CRDT convergence under concurrent operations", () => {
  test("two replicas converge when concurrent inserts at the same spot arrive in different orders", () => {
    const replicaA = [];
    const replicaB = [];

    const opH = { id: "A-1", char: "H", afterId: null, deleted: false };
    const opI = { id: "A-2", char: "i", afterId: "A-1", deleted: false };

    insertOperation(replicaA, opH);
    insertOperation(replicaA, opI);
    insertOperation(replicaB, opH);
    insertOperation(replicaB, opI);

    const opBang = { id: "A-3", char: "!", afterId: "A-2", deleted: false };
    const opQuestion = { id: "B-1", char: "?", afterId: "A-2", deleted: false };

    insertOperation(replicaA, opBang);
    insertOperation(replicaA, opQuestion);

    insertOperation(replicaB, opQuestion);
    insertOperation(replicaB, opBang);

    expect(toText(replicaA)).toBe(toText(replicaB));
  });

  test("two replicas converge when a delete and an insert-after-it race in different orders", () => {
    const replicaA = [];
    const replicaB = [];

    const opH = { id: "A-1", char: "H", afterId: null, deleted: false };
    const opI = { id: "A-2", char: "i", afterId: "A-1", deleted: false };
    const opBang = { id: "A-3", char: "!", afterId: "A-2", deleted: false };

    for (const op of [opH, opI, opBang]) {
      insertOperation(replicaA, op);
      insertOperation(replicaB, op);
    }

    deleteOperation(replicaA, opBang.id);
    const opQuestion = { id: "A-4", char: "?", afterId: opBang.id, deleted: false };
    insertOperation(replicaA, opQuestion);

    insertOperation(replicaB, opQuestion);
    deleteOperation(replicaB, opBang.id);

    expect(toText(replicaA)).toBe(toText(replicaB));
  });

  test("three concurrent siblings at the same anchor converge to the same order regardless of arrival order", () => {
    const opH = { id: "A-1", char: "H", afterId: null, deleted: false };
    const opI = { id: "A-2", char: "i", afterId: "A-1", deleted: false };

    const siblings = [
      { id: "A-3", char: "1", afterId: "A-2", deleted: false },
      { id: "B-1", char: "2", afterId: "A-2", deleted: false },
      { id: "C-1", char: "3", afterId: "A-2", deleted: false },
    ];

    function applyWithSiblingOrder(order) {
      const characters = [];
      insertOperation(characters, opH);
      insertOperation(characters, opI);
      for (const sibling of order) {
        insertOperation(characters, sibling);
      }
      return toText(characters);
    }

    const orderOne = applyWithSiblingOrder(siblings);
    const orderTwo = applyWithSiblingOrder([...siblings].reverse());
    const orderThree = applyWithSiblingOrder([siblings[1], siblings[2], siblings[0]]);

    expect(orderTwo).toBe(orderOne);
    expect(orderThree).toBe(orderOne);
  });
});