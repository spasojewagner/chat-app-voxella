/**
 * Uses MONGO_TEST_URI when it is set (CI starts a MongoDB service), otherwise starts a
 * throwaway in-memory MongoDB, so `npm test` works on a fresh machine with no setup.
 */
export default async function setup({ provide }) {
  if (process.env.MONGO_TEST_URI) {
    provide("mongoUri", process.env.MONGO_TEST_URI);
    return;
  }
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  const server = await MongoMemoryServer.create();
  provide("mongoUri", server.getUri("voxella_test"));
  return () => server.stop();
}
