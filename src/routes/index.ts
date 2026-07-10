import { Router } from "express";
import sampleRouter from "../sample/sample.router";
import authRouter from "../auth/auth.router";

const router = Router();

router.use("/auth", authRouter);
router.use("/samples", sampleRouter);
// TODO: 새 라우터를 여기에 추가하세요
// router.use("/products", productRouter);

export default router;
