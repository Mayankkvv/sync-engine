import { StateField, StateEffect } from "@codemirror/state";
import { EditorView, Decoration, WidgetType } from "@codemirror/view";

const CURSOR_COLORS = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

export function colorForUserId(userId) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) % CURSOR_COLORS.length;
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

export const setCursorsEffect = StateEffect.define();

class CursorWidget extends WidgetType {
  constructor(name, color) {
    super();
    this.name = name;
    this.color = color;
  }

  toDOM() {
    const wrap = document.createElement("span");
    wrap.style.borderLeft = `2px solid ${this.color}`;
    wrap.style.marginLeft = "-1px";
    wrap.style.position = "relative";

    const label = document.createElement("span");
    label.textContent = this.name;
    label.style.position = "absolute";
    label.style.top = "-1.1em";
    label.style.left = "0";
    label.style.fontSize = "10px";
    label.style.background = this.color;
    label.style.color = "white";
    label.style.padding = "0 4px";
    label.style.borderRadius = "3px";
    label.style.whiteSpace = "nowrap";

    wrap.appendChild(label);
    return wrap;
  }

  eq(other) {
    return other.name === this.name && other.color === this.color;
  }
}

function buildDecorations(cursors) {
  const widgets = cursors.map((cursor) =>
    Decoration.widget({ widget: new CursorWidget(cursor.name, cursor.color), side: 1 }).range(
      cursor.position
    )
  );
  return Decoration.set(widgets, true);
}

export const cursorField = StateField.define({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    decorations = decorations.map(tr.changes);

    for (const effect of tr.effects) {
      if (effect.is(setCursorsEffect)) {
        decorations = buildDecorations(effect.value);
      }
    }

    return decorations;
  },
  provide: (field) => EditorView.decorations.from(field),
});