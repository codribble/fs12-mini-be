import { Product } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { productRepository } from "./product.repository";

const DEFAULT_LIMIT = 10;

export const createProduct = (
  userId: number,
  data: { name: string; price: number; category: string; s3Key: string; link?: string },
) => productRepository.create({ ...data, userId });

export const getProductList = async (
  cursor?: number,
  limit = DEFAULT_LIMIT,
  category?: string,
) => {
  // "다음 페이지가 있는지"를 알려면 limit개보다 하나 더 가져와봐야 한다.
  // 예: limit=10인데 11개가 나오면 -> 최소 1개는 더 있다는 뜻이므로 hasNext=true,
  // 실제 응답에는 마지막 1개(11번째)는 버리고 10개만 data로 내려주고,
  // 그 10개 중 마지막 항목의 id를 nextCursor로 알려줘서 다음 요청 때 그 지점부터 이어가게 한다.
  const rows = await productRepository.findAll(cursor, limit + 1, category);
  const hasNext = rows.length > limit;
  const data = hasNext ? rows.slice(0, limit) : rows;
  const nextCursor = hasNext ? data[data.length - 1].id : null;
  return { data, nextCursor };
};

export const getProductById = (id: number) => productRepository.findById(id);

export const updateProductById = (
  id: number,
  // link만 Product["link"](= string | null)로 파생: 나머지 필드와 달리 link는
  // "명시적으로 null을 보내 지우는" 시나리오가 있어서(product.repository.ts update 참고),
  // string으로 좁혀두면 null을 거부하는 타입 오류가 난다.
  data: Partial<{
    name: string;
    price: number;
    category: string;
    s3Key: string;
    link: Product["link"];
  }>,
) => productRepository.update(id, data);

// 리뷰 전체 삭제 + 상품 삭제를 하나의 트랜잭션으로 묶는다(Notion 체크리스트 요구사항).
// 개념적으로 메인 액션은 "상품 삭제"고 리뷰 삭제는 그에 딸린 뒤처리지만,
// 코드 실행 순서는 반대로 "리뷰 먼저 -> 상품 나중"이다.
// 이유: Review.productId가 Product.id를 참조하는 외래키(FK)인데 ON DELETE CASCADE가
// 설정돼 있지 않아서, 리뷰가 남아있는 채로 상품을 먼저 지우려 하면 Postgres가
// 참조 무결성 위반으로 거부한다. 그래서 자식(리뷰)을 먼저 치워야 부모(상품)를 지울 수 있다.
// 콜백이 주는 tx를 review/product 양쪽 모두에 넘겨야 진짜로 하나의 트랜잭션이 된다 —
// 둘 중 하나라도 실패하면 BEGIN 이후 실행된 것들이 전부 자동 롤백되어,
// "리뷰는 지워졌는데 상품은 남아있는" 반쪽짜리 상태가 생기지 않는다.
// Review 모듈이 아직 없어서(Phase 7에서 추가 예정) review.repository 없이 tx.review로 직접 호출했다.
export const deleteProductWithReviews = (id: number) =>
  prisma.$transaction(async (tx) => {
    await tx.review.deleteMany({ where: { productId: id } });
    await productRepository.deleteById(id, tx);
  });
