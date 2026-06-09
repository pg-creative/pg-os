import { MorningView } from "../_components/views/MorningView";

/** Standalone full-screen /morning route. Same surface that powers the
 *  Morning tab — this version owns the whole viewport (no shell chrome). */
export default function MorningRoute() {
  return <MorningView />;
}
