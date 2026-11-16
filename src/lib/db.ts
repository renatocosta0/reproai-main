import { PrismaClient } from "@prisma/client";
import { encryptData, decryptDeep } from "@/lib/encryption";

function createPrismaClient() {
  const base = new PrismaClient();
  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // Transparently encrypt sensitive clinical & personal fields before writing to DB
          if (args) {
            if (operation === "create" || operation === "update") {
              if (args.data) encryptData(args.data, model);
            } else if (operation === "upsert") {
              if (args.create) encryptData(args.create, model);
              if (args.update) encryptData(args.update, model);
            } else if (operation === "createMany" || operation === "updateMany") {
              if (Array.isArray(args.data)) {
                for (const item of args.data) {
                  encryptData(item, model);
                }
              } else if (args.data) {
                encryptData(args.data, model);
              }
            }
          }

          // Execute query
          const result = await query(args);

          // Transparently decrypt sensitive fields when reading from DB
          if (result) {
            decryptDeep(result);
          }

          return result;
        }
      }
    }
  });
}

export type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as { prisma?: ExtendedPrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
