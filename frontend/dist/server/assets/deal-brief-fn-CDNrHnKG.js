import { c as createSsrRpc } from "./router-BRauOI85.js";
import { c as createServerFn } from "../server.js";
const generateDealBrief = createServerFn({
  method: "POST"
}).inputValidator((data) => data).handler(createSsrRpc("56f68b50d6d653ae4f4287eb005bbb35fecea7fa7ce69a4b2a6cc974383a502e"));
export {
  generateDealBrief as g
};
