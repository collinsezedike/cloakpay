// Browser shim for Node's `https` module.
// @switchboard-xyz/common instantiates `new Agent()` at module load time for
// axios's httpsAgent option — which axios ignores in browser context.
export class Agent {
  constructor(_opts?: unknown) {}
}
export const request = () => {};
export const get = () => {};
const https = { Agent, request, get };
export default https;
