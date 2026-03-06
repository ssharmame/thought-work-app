import { prisma } from "@/lib/prisma"

export async function createThought(data: any) {

  return prisma.thoughtEntry.create({
    data
  })
}

export async function getThoughts() {

  return prisma.thoughtEntry.findMany({
    orderBy: {
      createdAt: "desc"
    }
  })
}