// Re-export from the TSX file so routeTree.gen.ts can resolve Route.
// The .ts file is resolved first by TypeScript module resolution over .tsx.
export { Route } from "./api.email-test.tsx";
