// Public entry — Next.js singleton replaces the upstream Express+WS server.
// The Express bootstrap from the upstream `server/index.ts` is intentionally
// dropped; see `instance.ts` for the new runtime model.

export { getInstance } from "./instance";
export type { PixelAgentsInstance } from "./instance";
