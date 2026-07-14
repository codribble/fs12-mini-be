import { Router } from "express";
import sampleRouter from "../sample/sample.router";
import authRouter from "../auth/auth.router";
import uploadRouter from "../upload/upload.router";
import productRouter from "../product/product.router";
import reviewRouter from "../review/review.router";

const router = Router();

router.use("/auth", authRouter);
router.use("/samples", sampleRouter);
router.use("/uploads", uploadRouter);
router.use("/products", productRouter);
router.use("/products/:productId/reviews", reviewRouter);

export default router;
