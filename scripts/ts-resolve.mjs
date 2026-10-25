/**
 * Lets Node run the TypeScript sources directly: the app imports siblings
 * without an extension (bundler resolution), Node needs the file name.
 * Usage: node --import ./scripts/ts-resolve.mjs <script>
 */
import { register } from "node:module";

register("./ts-resolve-hooks.mjs", import.meta.url);
