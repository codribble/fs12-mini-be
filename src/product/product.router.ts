import { Router } from "express";
import { authMiddleware } from "../middlewares/auth";
import {
  postProduct,
  getProducts,
  getProduct,
  patchProduct,
  deleteProduct,
} from "./product.controller";

const router = Router();

// 등록/수정/삭제는 로그인 필요 -> authMiddleware, 목록/상세 조회는 누구나 볼 수 있어야 하므로 공개.
// (review.router.ts도 동일한 패턴 — 쓰기 계열 라우트에만 authMiddleware를 끼워넣는다)
router.post("/", authMiddleware, postProduct);
router.get("/", getProducts);
router.get("/:id", getProduct);
router.patch("/:id", authMiddleware, patchProduct);
router.delete("/:id", authMiddleware, deleteProduct);

export default router;
