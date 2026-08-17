import { useEffect } from "react";
import { useRive, useStateMachineInput } from "@rive-app/react-canvas";
import {
  CORA_INPUT_BAND,
  CORA_INPUT_STATE,
  CORA_STATE_MACHINE,
  riveStateIndex,
  type CoraState,
} from "./cora-states";
import { riveBandIndex, type GuzzlerBand } from "@/lib/guzzler-band";

// The animated Cora. Default-exported and loaded ONLY through React.lazy from
// CoraMascot, so the Rive runtime + WASM payload never enters the main bundle —
// most scans come from phones on cell data.
//
// This component assumes the .riv loaded. Every failure path (missing file,
// network error, WASM refusal, wrong state-machine name) is handled one level
// up in CoraMascot, which swaps in the static fallback.

interface CoraRiveCanvasProps {
  src: string;
  state: CoraState;
  band?: GuzzlerBand | null;
  /** True while the host element is off-screen — pauses the state machine. */
  paused: boolean;
  className?: string;
  onLoadError: () => void;
}

export default function CoraRiveCanvas({
  src,
  state,
  band,
  paused,
  className,
  onLoadError,
}: CoraRiveCanvasProps) {
  const { rive, RiveComponent } = useRive({
    src,
    stateMachines: CORA_STATE_MACHINE,
    autoplay: true,
    onLoadError,
  });

  const stateInput = useStateMachineInput(rive, CORA_STATE_MACHINE, CORA_INPUT_STATE);
  const bandInput = useStateMachineInput(rive, CORA_STATE_MACHINE, CORA_INPUT_BAND);

  useEffect(() => {
    if (stateInput) stateInput.value = riveStateIndex(state);
  }, [stateInput, state]);

  useEffect(() => {
    if (bandInput) bandInput.value = riveBandIndex(band);
  }, [bandInput, band]);

  // Off-screen instances stop burning frames. Cheap on desktop, meaningful on a
  // mid-range Android scrolling a long results page.
  useEffect(() => {
    if (!rive) return;
    if (paused) rive.pause();
    else rive.play(CORA_STATE_MACHINE);
  }, [rive, paused]);

  return <RiveComponent className={className} />;
}
