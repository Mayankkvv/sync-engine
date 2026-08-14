const express = require("express");
const Document = require("../models/Document");
const User = require("../models/User");
const OperationLog = require("../models/OperationLog");
const reconstructAsOf = require("../services/reconstructDocument");
const { toText, deleteOperation, undeleteOperation } = require("../crdt/crdt");
const { queueForDocument, broadcastToRoom } = require("../websocket/socketServer");
const requireAuth = require("../middleware/auth");
const { findUserByEmail, normalizeEmail } = require("../utils/email");

const router = express.Router();

router.use(requireAuth);

async function getOwnedDocument(id, userId) {
  const document = await Document.findById(id);
  if (!document || document.owner.toString() !== userId) {
    return null;
  }
  return document;
}

async function getAccessibleDocument(id, userId) {
  const document = await Document.findById(id);
  if (!document) return null;

  const isOwner = document.owner.toString() === userId;
  const isCollaborator = document.collaborators.some((c) => c.toString() === userId);

  if (!isOwner && !isCollaborator) return null;

  return document;
}

function getOwnerId(document) {
  const owner = document.owner;
  if (!owner) return "";
  return (owner._id || owner.id || owner).toString();
}

function withAccessMetadata(document, userId) {
  const data = typeof document.toObject === "function" ? document.toObject() : document;
  return {
    ...data,
    isOwner: getOwnerId(document) === userId,
  };
}

router.post("/", async (req, res) => {
  try {
    const { title, content } = req.body;
    const document = await Document.create({ title, content, owner: req.userId });
    res.status(201).json(withAccessMetadata(document, req.userId));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const documents = await Document.find({
      $or: [{ owner: req.userId }, { collaborators: req.userId }],
    }).sort({ updatedAt: -1 });
    res.json(documents.map((document) => withAccessMetadata(document, req.userId)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const document = await getAccessibleDocument(req.params.id, req.userId);
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    const populated = await Document.findById(req.params.id)
      .populate("owner", "name email")
      .populate("collaborators", "name email");

    res.json(withAccessMetadata(populated, req.userId));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id/history", async (req, res) => {
  try {
    const document = await getAccessibleDocument(req.params.id, req.userId);
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    const logs = await OperationLog.find({ documentId: req.params.id }).sort({ createdAt: 1 });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id/version/:logId", async (req, res) => {
  try {
    const document = await getAccessibleDocument(req.params.id, req.userId);
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    const log = await OperationLog.findById(req.params.logId);
    if (!log || log.documentId.toString() !== req.params.id) {
      return res.status(404).json({ error: "Version not found" });
    }

    const characters = await reconstructAsOf(req.params.id, log.createdAt);

    res.json({ content: toText(characters), createdAt: log.createdAt });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/:id/restore/:logId", async (req, res) => {
  try {
    const accessible = await getAccessibleDocument(req.params.id, req.userId);
    if (!accessible) {
      return res.status(404).json({ error: "Document not found" });
    }

    const log = await OperationLog.findById(req.params.logId);
    if (!log || log.documentId.toString() !== req.params.id) {
      return res.status(404).json({ error: "Version not found" });
    }

    const documentId = req.params.id;

    const result = await queueForDocument(documentId, async () => {
      const targetCharacters = await reconstructAsOf(documentId, log.createdAt);
      const targetDeletedMap = new Map(targetCharacters.map((c) => [c.id, c.deleted]));

      const document = await Document.findById(documentId);
      if (!document) return null;

      const restoreOps = [];

      for (const character of document.characters) {
        const targetDeleted = targetDeletedMap.has(character.id)
          ? targetDeletedMap.get(character.id)
          : true;

        if (character.deleted !== targetDeleted) {
          if (targetDeleted) {
            deleteOperation(document.characters, character.id);
            restoreOps.push({ kind: "delete", id: character.id });
          } else {
            undeleteOperation(document.characters, character.id);
            restoreOps.push({ kind: "undelete", id: character.id });
          }
        }
      }

      if (restoreOps.length > 0) {
        document.content = toText(document.characters);
        document.markModified("characters");
        await document.save();

        await OperationLog.create({ documentId, operations: restoreOps });

        broadcastToRoom(documentId, { type: "crdtOps", documentId, operations: restoreOps }, null);
      }

      return document;
    });

    if (!result) {
      return res.status(404).json({ error: "Document not found" });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const accessible = await getAccessibleDocument(req.params.id, req.userId);
    if (!accessible) {
      return res.status(404).json({ error: "Document not found" });
    }

    const updates = {};
    if (req.body.title !== undefined) updates.title = req.body.title;
    if (req.body.content !== undefined) updates.content = req.body.content;

    const document = await Document.findByIdAndUpdate(req.params.id, updates, { new: true });
    res.json(withAccessMetadata(document, req.userId));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const owned = await getOwnedDocument(req.params.id, req.userId);
    if (!owned) {
      return res.status(404).json({ error: "Document not found" });
    }

    await Document.findByIdAndDelete(req.params.id);
    res.json({ message: "Document deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/:id/collaborators", async (req, res) => {
  try {
    const document = await getOwnedDocument(req.params.id, req.userId);
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    const email = normalizeEmail(req.body.email);
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const invitedUser = await findUserByEmail(User, email);
    if (!invitedUser) {
      return res.status(404).json({ error: "No account found with that email" });
    }

    if (invitedUser._id.toString() === req.userId) {
      return res.status(400).json({ error: "You already own this document" });
    }

    const alreadyCollaborator = document.collaborators.some(
      (id) => id.toString() === invitedUser._id.toString()
    );
    if (alreadyCollaborator) {
      return res.status(400).json({ error: "This person already has access" });
    }

    document.collaborators.push(invitedUser._id);
    await document.save();

    const populated = await Document.findById(document._id).populate("collaborators", "name email");

    res.json({ collaborators: populated.collaborators });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:id/collaborators/:collaboratorId", async (req, res) => {
  try {
    const document = await getOwnedDocument(req.params.id, req.userId);
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    document.collaborators = document.collaborators.filter(
      (id) => id.toString() !== req.params.collaboratorId
    );
    await document.save();

    res.json({ message: "Collaborator removed" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
