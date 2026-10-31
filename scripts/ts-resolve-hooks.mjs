/** Resolve hook: retry extensionless relative imports as `.ts` files. */
export async function resolve(specifier, context, next) {
  if (/^\.{1,2}\//.test(specifier) && !/\.[cm]?[jt]sx?$/.test(specifier)) {
    try {
      return await next(`${specifier}.ts`, context);
    } catch {
      // Not a TypeScript sibling: fall through to the default resolution.
    }
  }
  return next(specifier, context);
}
