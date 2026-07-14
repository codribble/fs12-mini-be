import { Router } from "express";
import sampleRouter from "../sample/sample.router";
import authRouter from "../auth/auth.router";
import uploadRouter from "../upload/upload.router";

const router = Router();

router.use("/auth", authRouter);
router.use("/samples", sampleRouter);
router.use("/uploads", uploadRouter);
// TODO: 새 라우터를 여기에 추가하세요
// router.use("/products", productRouter);

export default router;
