import { Router } from "express";
import { authMiddleware } from "../middlewares/auth";
import {
  postReview,
  getReviews,
  patchReview,
  deleteReview,
} from "./review.controller";

// mergeParams: true가 없으면 이 라우터 안에서는 req.params에 :productId가 안 잡힌다.
// 이 라우터는 routes/index.ts에서 "/products/:productId/reviews" 경로에 마운트되는데,
// Express 라우터는 기본적으로 부모 라우트의 파라미터를 자식 라우터에 자동으로 넘겨주지 않기 때문에
// mergeParams 옵션으로 명시적으로 켜줘야 review.controller에서 req.params.productId를 읽을 수 있다.
const router = Router({ mergeParams: true });

// 등록/수정/삭제는 인증 필요(로그인한 사용자만) -> authMiddleware, 목록 조회는 누구나 볼 수 있어야 하므로 공개.
// product.router.ts와 동일한 인증 적용 패턴(쓰기 계열만 라우트별로 authMiddleware를 끼워넣음).
router.post("/", authMiddleware, postReview);
router.get("/", getReviews);
router.patch("/:reviewId", authMiddleware, patchReview);
router.delete("/:reviewId", authMiddleware, deleteReview);

export default router;
