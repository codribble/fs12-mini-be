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

router.post("/", authMiddleware, postProduct);
router.get("/", getProducts);
router.get("/:id", getProduct);
router.patch("/:id", authMiddleware, patchProduct);
router.delete("/:id", authMiddleware, deleteProduct);

export default router;
