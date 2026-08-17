// The contract between Will's exported `.riv` file and this app.
//
// Per the 17-08 brief the state machine is named `CoraStates` and exposes two
// number inputs:
//   state  0 = idle · 1 = listening · 2 = scanning/thinking · 3 = score_reveal
//   band   0 = Sipping · 1 = Steady · 2 = Drinking · 3 = Bleeding
//
// Will's rule: "If the delivered .riv uses different input names, the file
// wins." So when the real file arrives, introspect it and adjust the three
// constants below — nothing else in the app names these strings.

export const CORA_STATE_MACHINE = "CoraStates";
export const CORA_INPUT_STATE = "state";
export const CORA_INPUT_BAND = "band";

/** Cora's four animation states, in the .riv's numeric order. */
export const CORA_STATES = ["idle", "listening", "scanning", "score_reveal"] as const;

export type CoraState = (typeof CORA_STATES)[number];

/** Numeric encoding of a state for the Rive `state` input. */
export function riveStateIndex(state: CoraState): number {
  const i = CORA_STATES.indexOf(state);
  return i === -1 ? 0 : i;
}
