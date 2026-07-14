import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { reviewRepository } from "./review.repository";

// 리뷰 등록/수정/삭제 셋 다 마지막에 "Product.avgRating/reviewCount를 다시 계산해서 갱신"하는 동일한 작업이
// 필요해서 공통 함수로 뺐다. 반드시 트랜잭션의 tx를 넘겨받아야 한다 — 리뷰 변경과 Product 갱신이 하나의
// all-or-nothing 단위로 묶여야 "리뷰는 등록됐는데 평점은 갱신 안 됨" 같은 반쪽짜리 상태가 안 생긴다.
// _avg.rating은 리뷰가 0건이 되면 null이 나오므로(집계할 값 자체가 없음) 0으로 폴백한다.
const updateProductRatingStats = async (
  productId: number,
  tx: Prisma.TransactionClient,
) => {
  const { _avg, _count } = await reviewRepository.getAvgRating(productId, tx);
  await tx.product.update({
    where: { id: productId },
    data: { avgRating: _avg.rating ?? 0, reviewCount: _count },
  });
};

// 트랜잭션은 콜백 방식(prisma.$transaction(async (tx) => {...}))을 쓴다 — product.service.ts의
// deleteProductWithReviews와 동일한 관례. 콜백 안에서 실행된 쿼리들은 하나라도 실패하면 전부 롤백된다.
export const createReview = (
  userId: number,
  productId: number,
  data: { content: string; rating: number },
) =>
  prisma.$transaction(async (tx) => {
    // 아직 리뷰 row가 없는 시점이라 productId를 파생시킬 대상이 없다 -> 컨트롤러가 넘겨준 값을 그대로 쓴다.
    // (반면 update/delete는 이미 존재하는 리뷰에서 productId를 꺼내 쓴다 — 아래 참고)
    const review = await reviewRepository.create(
      { ...data, productId, userId },
      tx,
    );
    await updateProductRatingStats(productId, tx);
    return review;
  });

export const updateReviewById = (
  id: number,
  data: Partial<{ content: string; rating: number }>,
) =>
  prisma.$transaction(async (tx) => {
    // Prisma의 update()는 변경된 row 전체를 반환하므로, 그 안에 이미 productId가 들어있다.
    // 컨트롤러가 getReviewById로 조회할 때 이미 productId를 확인했지만, 여기서 또 인자로 넘기게 하면
    // "컨트롤러가 준 값 vs DB에 실제로 있는 값"이 어긋날 여지가 생기므로 반환값에서 다시 꺼내 쓰는 쪽이 더 안전하다.
    const review = await reviewRepository.update(id, data, tx);
    await updateProductRatingStats(review.productId, tx);
    return review;
  });

export const deleteReviewById = (id: number) =>
  prisma.$transaction(async (tx) => {
    // delete()도 마찬가지로 삭제된 row를 반환하므로 거기서 productId를 꺼내 평점 재계산 대상을 알아낸다.
    const deleted = await reviewRepository.deleteById(id, tx);
    await updateProductRatingStats(deleted.productId, tx);
  });

export const getReviewById = (id: number) => reviewRepository.findById(id);

export const getReviewList = (productId: number) =>
  reviewRepository.findAllByProductId(productId);
