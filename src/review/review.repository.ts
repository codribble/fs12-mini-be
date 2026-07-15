import { Review, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

export const reviewRepository = {
  // 특정 상품의 리뷰 목록. 최신 리뷰가 먼저 보이도록 id desc로 정렬한다(별도 페이지네이션 요구사항은 없어서 전체 반환).
  //
  // [Phase 9(리뷰 FE) 수정, 사용자 승인] 원래 Phase 7에선 include 없이 Review row만 반환했는데,
  // Review 모델엔 userId(숫자)만 있고 작성자 이름이 없어서 FE 리뷰 목록에 "누가 썼는지"를 표시할 방법이
  // 없었다. 리뷰 작성 폼은 로그인한 본인 정보라 문제없지만, 목록은 여러 사용자의 리뷰가 섞여 있어
  // 이름이 필요했다. 그래서 Phase 9 작업 중 사용자에게 확인받고 이 함수에만 user.name을 include했다.
  // create/update(아래)는 응답이 "방금 로그인한 내가 쓴/고친 리뷰"라 이름이 필요 없어 일부러 그대로 뒀다.
  findAllByProductId: (productId: Review["productId"]) =>
    prisma.review.findMany({
      where: { productId },
      orderBy: { id: "desc" },
      include: { user: { select: { name: true } } },
    }),

  // 체크리스트엔 findAllByProductId만 있었지만, PATCH/DELETE 진입 시 "이 리뷰가 존재하는가 + 내가 쓴 리뷰가 맞는가(403)"를
  // 확인하려면 리뷰 하나만 콕 집어 조회하는 함수가 필요하다. product.repository.findById와 product.controller가
  // 이미 이 패턴(먼저 findById로 조회 -> 없으면 404 -> 소유자 아니면 403)을 쓰고 있어서 그 선례를 그대로 따랐다.
  findById: (id: Review["id"]) => prisma.review.findUnique({ where: { id } }),

  // 두 번째 인자로 트랜잭션 클라이언트(tx)를 선택적으로 받는다 — product.repository.deleteById와 동일한 이유.
  // create/update/deleteById는 review.service.ts에서 "리뷰 변경 + Product.avgRating/reviewCount 갱신"을
  // 하나의 트랜잭션으로 묶어 호출되므로, 트랜잭션 안에서는 반드시 콜백이 주는 tx로 실행해야 원자성이 보장된다
  // (싱글턴 prisma로 호출하면 트랜잭션 밖에서 따로 실행되어버려 all-or-nothing이 깨진다). 기본값은 싱글턴 prisma라
  // 트랜잭션이 필요 없는 곳(예: 이 프로젝트엔 아직 없지만 단독 조회성 mutate)에서도 그대로 쓸 수 있다.
  create: (
    data: Pick<Review, "content" | "rating" | "productId" | "userId">,
    client: Prisma.TransactionClient | typeof prisma = prisma,
  ) => client.review.create({ data }),

  update: (
    id: Review["id"],
    data: Partial<Pick<Review, "content" | "rating">>,
    client: Prisma.TransactionClient | typeof prisma = prisma,
  ) => client.review.update({ where: { id }, data }),

  deleteById: (
    id: Review["id"],
    client: Prisma.TransactionClient | typeof prisma = prisma,
  ) => client.review.delete({ where: { id } }),

  // 리뷰 등록/수정/삭제 직후 Product.avgRating/reviewCount를 다시 계산하기 위한 집계 쿼리.
  // _avg.rating: 남은 리뷰들의 평균 별점 (리뷰가 0건이면 null이 나오므로 호출부에서 ?? 0으로 폴백해야 함)
  // _count: 남은 리뷰 개수 (reviewCount에 그대로 대입)
  // 이 함수도 트랜잭션 안에서 tx로 호출돼야 "방금 커밋 전 상태"가 아니라 "이번 트랜잭션에서 방금 반영된 상태" 기준으로
  // 정확히 집계된다.
  getAvgRating: (
    productId: Review["productId"],
    client: Prisma.TransactionClient | typeof prisma = prisma,
  ) =>
    client.review.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: true,
    }),
};
