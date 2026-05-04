import type { InputSnapshot } from "../game/types";

export type Action =
  | "left"
  | "right"
  | "accelerate"
  | "brake"
  | "confirm"
  | "back";

const KEYMAP = new Map<string, Action>([
  ["arrowleft", "left"],
  ["a", "left"],
  ["arrowright", "right"],
  ["d", "right"],
  ["arrowup", "accelerate"],
  ["w", "accelerate"],
  ["arrowdown", "brake"],
  ["s", "brake"],
  ["enter", "confirm"],
  [" ", "confirm"],
  ["escape", "back"],
]);

const GAMEPAD_BUTTON_MAP: Array<{ index: number; action: Action }> = [
  { index: 0, action: "confirm" },
  { index: 1, action: "back" },
  { index: 6, action: "brake" },
  { index: 7, action: "accelerate" },
  { index: 12, action: "accelerate" },
  { index: 13, action: "brake" },
];

export class InputController {
  private readonly held = new Set<Action>();
  private readonly pressed = new Set<Action>();
  private readonly gamepadPressed = new Set<Action>();
  private readonly gamepadHeld = new Set<Action>();
  private readonly previousButtons = new Map<number, boolean>();

  constructor(container: HTMLElement) {
    window.addEventListener("keydown", (event) => {
      const action = KEYMAP.get(event.key.toLowerCase());
      if (!action) {
        return;
      }

      if (!event.repeat) {
        this.pressed.add(action);
      }

      this.held.add(action);
    });

    window.addEventListener("keyup", (event) => {
      const action = KEYMAP.get(event.key.toLowerCase());
      if (!action) {
        return;
      }

      this.held.delete(action);
    });

    for (const element of container.querySelectorAll<HTMLElement>("[data-touch]")) {
      const action = element.dataset.touch as Action | undefined;
      if (!action) {
        continue;
      }

      const release = () => this.held.delete(action);
      element.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        this.held.add(action);
      });
      element.addEventListener("pointerup", release);
      element.addEventListener("pointercancel", release);
      element.addEventListener("pointerleave", release);
    }
  }

  snapshot(): InputSnapshot {
    this.pollGamepad();
    return {
      accelerate: this.held.has("accelerate") || this.gamepadHeld.has("accelerate"),
      brake: this.held.has("brake") || this.gamepadHeld.has("brake"),
      left: this.held.has("left") || this.gamepadHeld.has("left"),
      right: this.held.has("right") || this.gamepadHeld.has("right"),
    };
  }

  consume(action: Action) {
    this.pollGamepad();
    const isPressed = this.pressed.has(action) || this.gamepadPressed.has(action);
    this.pressed.delete(action);
    this.gamepadPressed.delete(action);
    return isPressed;
  }

  private pollGamepad() {
    const gamepads = navigator.getGamepads?.() ?? [];
    const gamepad = gamepads.find((entry): entry is Gamepad => Boolean(entry));
    this.gamepadHeld.clear();

    if (!gamepad) {
      this.previousButtons.clear();
      return;
    }

    const axis = gamepad.axes[0] ?? 0;
    if (axis < -0.35) {
      this.gamepadHeld.add("left");
    } else if (axis > 0.35) {
      this.gamepadHeld.add("right");
    }

    for (const mapping of GAMEPAD_BUTTON_MAP) {
      const pressed = Boolean(gamepad.buttons[mapping.index]?.pressed);
      const wasPressed = this.previousButtons.get(mapping.index) ?? false;
      if (pressed) {
        this.gamepadHeld.add(mapping.action);
      }
      if (pressed && !wasPressed) {
        this.gamepadPressed.add(mapping.action);
      }
      this.previousButtons.set(mapping.index, pressed);
    }
  }
}
