import { Router } from "express";
import { authMiddleware } from "../middlewares/auth";
import { getPresignedUploadUrl } from "./upload.controller";

const router = Router();

// 상품 이미지 업로드용 presigned URL 발급 — 로그인한 사용자만 발급받을 수 있게 보호
router.post("/presigned-url", authMiddleware, getPresignedUploadUrl);

export default router;
