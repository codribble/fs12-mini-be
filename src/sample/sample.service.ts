import { prisma } from "../lib/prisma";

export const findAllSamples = async () => {
  return prisma.sample.findMany({ orderBy: { createdAt: "desc" } });
};

export const findSampleById = async (id: number) => {
  return prisma.sample.findUnique({ where: { id } });
};
