import { Product, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

export const productRepository = {
  // cursor: 이전 페이지 마지막 상품의 id. 있으면 그 id "다음"부터 조회한다
  // (skip: 1로 cursor 자신은 건너뛰고, id desc 정렬이라 cursor보다 작은 id들이 다음 페이지).
  // take는 서비스에서 "실제 limit + 1"을 넘겨준다 — 다음 페이지 존재 여부를 판단하기 위함(아래 service 주석 참고).
  findAll: (cursor: number | undefined, take: number, category?: string) =>
    prisma.product.findMany({
      where: category ? { category } : undefined,
      orderBy: { id: "desc" },
      take,
      ...(cursor !== undefined && { skip: 1, cursor: { id: cursor } }),
    }),

  findById: (id: Product["id"]) =>
    prisma.product.findUnique({ where: { id } }),

  create: (
    data: Pick<Product, "name" | "price" | "category" | "s3Key" | "userId"> & {
      link?: Product["link"];
    },
  ) => prisma.product.create({ data }),

  update: (
    id: Product["id"],
    data: Partial<Pick<Product, "name" | "price" | "category" | "s3Key" | "link">>,
  ) => prisma.product.update({ where: { id }, data }),

  // 두 번째 인자로 트랜잭션 클라이언트(tx)를 선택적으로 받는다.
  // 이유: 상품 삭제는 "리뷰 전체 삭제 + 상품 삭제"를 하나의 트랜잭션으로 묶어야 하는데,
  // 트랜잭션 안에서는 반드시 콜백이 주는 tx로 호출해야 원자성이 보장된다(싱글턴 prisma로 호출하면
  // 트랜잭션 밖에서 따로 실행돼버려서 all-or-nothing이 깨진다).
  // 그렇다고 삭제 로직을 서비스에 직접 prisma.product.delete(...)로 새로 쓰면
  // "Prisma 호출은 repository만 담당한다"는 이 프로젝트 규칙이 삭제 흐름에서만 깨지므로,
  // 여기서 client를 인자로 받아 단독 호출(prisma.product.delete)과 트랜잭션 호출(tx.product.delete)
  // 양쪽 다 이 함수 하나로 처리할 수 있게 했다. 기본값은 싱글턴 prisma.
  deleteById: (
    id: Product["id"],
    client: Prisma.TransactionClient | typeof prisma = prisma,
  ) => client.product.delete({ where: { id } }),
};
