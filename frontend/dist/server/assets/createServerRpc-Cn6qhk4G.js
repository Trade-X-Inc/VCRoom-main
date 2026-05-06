import { a0 as TSS_SERVER_FUNCTION } from "./worker-entry-Cmmw-2kk.js";
var createServerRpc = (serverFnMeta, splitImportFn) => {
  const url = "/_serverFn/" + serverFnMeta.id;
  return Object.assign(splitImportFn, {
    url,
    serverFnMeta,
    [TSS_SERVER_FUNCTION]: true
  });
};
export {
  createServerRpc as c
};
