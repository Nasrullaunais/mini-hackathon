// Importing this module from a Client Component is a build error. That is
// deliberate: a connection string must never reach the browser bundle.
// Node scripts that legitimately need the DB import "@/db/client" instead.
import "server-only";

export { db, schema } from "./client";
