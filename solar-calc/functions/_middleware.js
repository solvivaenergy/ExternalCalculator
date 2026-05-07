// Passthrough middleware — overrides the stale _headers-compiled Pages Function
export async function onRequest(context) {
  return context.next();
}
