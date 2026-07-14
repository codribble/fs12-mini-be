import { Request, Response } from "express";
import { AuthRequest } from "../middlewares/auth";
import { getProductById } from "../product/product.service";
import {
  createReview,
  getReviewList,
  getReviewById,
  updateReviewById,
  deleteReviewById,
} from "./review.service";

// rating은 1~5 사이의 "정수"여야 한다(Notion 스펙 원문: 별점 1~5). 등록 시 필수, 수정 시 선택이라
// 두 군데서 재사용하려고 함수로 뺐다.
const isValidRating = (rating: unknown): rating is number =>
  typeof rating === "number" &&
  Number.isInteger(rating) &&
  rating >= 1 &&
  rating <= 5;

export const postReview = async (req: AuthRequest, res: Response) => {
  try {
    const productId = Number(req.params.productId);
    if (Number.isNaN(productId)) {
      return res.status(400).json({ message: "유효하지 않은 productId입니다." });
    }

    // 상품이 실제로 존재하는지 먼저 확인한다 — 존재하지 않는 상품에 리뷰를 달 수는 없으므로.
    // product.controller.getProduct와 동일하게 없으면 404 "Not found"로 응답.
    const product = await getProductById(productId);
    if (!product) return res.status(404).json({ message: "Not found" });

    const { content, rating } = req.body;
    if (!content) {
      return res.status(400).json({ message: "content는 필수입니다." });
    }
    if (!isValidRating(rating)) {
      return res
        .status(400)
        .json({ message: "rating은 1~5 사이의 정수여야 합니다." });
    }

    // req.userId!: authMiddleware를 통과해야 이 핸들러에 도달하므로(라우터에서 강제),
    // 이 시점엔 반드시 값이 채워져 있다고 보장된다 -> non-null assertion. (product.controller.postProduct와 동일)
    const review = await createReview(req.userId!, productId, {
      content,
      rating,
    });
    res.status(201).json(review);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const getReviews = async (req: Request, res: Response) => {
  try {
    const productId = Number(req.params.productId);
    if (Number.isNaN(productId)) {
      return res.status(400).json({ message: "유효하지 않은 productId입니다." });
    }

    // 목록 조회도 마찬가지로 상품 존재 여부를 먼저 확인한다(없는 상품의 리뷰 목록을 빈 배열로 조용히
    // 돌려주는 대신, "그런 상품 자체가 없다"는 걸 404로 명확히 알려주는 쪽을 택함).
    const product = await getProductById(productId);
    if (!product) return res.status(404).json({ message: "Not found" });

    const reviews = await getReviewList(productId);
    res.json(reviews);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const patchReview = async (req: AuthRequest, res: Response) => {
  try {
    const productId = Number(req.params.productId);
    const reviewId = Number(req.params.reviewId);
    if (Number.isNaN(productId) || Number.isNaN(reviewId)) {
      return res.status(400).json({ message: "유효하지 않은 id입니다." });
    }

    // 소유권 검증(403)은 service가 아니라 여기 controller에서 처리한다 — product.controller와 동일한 이유
    // (커스텀 에러 클래스 없이 컨트롤러 try/catch + 고정 상태코드로 에러를 나누는 이 프로젝트 관례).
    //
    // review.productId !== productId 체크 하나로 "리뷰 없음"과 "다른 상품의 리뷰" 두 케이스를 한꺼번에 404로
    // 처리한다. 이게 가능한 이유: Review.productId -> Product.id 외래키가 ON DELETE RESTRICT라서
    // (마이그레이션 SQL로 확인) 리뷰 row가 존재하는 한 그 리뷰가 가리키는 상품은 반드시 존재한다.
    // 그래서 상품을 따로 재조회할 필요 없이 productId 일치 여부만 보면 된다.
    const review = await getReviewById(reviewId);
    if (!review || review.productId !== productId) {
      return res.status(404).json({ message: "Not found" });
    }
    if (review.userId !== req.userId) {
      return res
        .status(403)
        .json({ message: "본인이 작성한 리뷰만 수정할 수 있습니다." });
    }

    const { content, rating } = req.body;
    // rating은 "제공된 경우에만" 검증한다(patchProduct의 price 검증과 동일 스타일) — PATCH는 부분 수정이라
    // content만 고치고 rating은 그대로 둘 수도 있어야 하기 때문.
    if (rating !== undefined && !isValidRating(rating)) {
      return res
        .status(400)
        .json({ message: "rating은 1~5 사이의 정수여야 합니다." });
    }

    const updated = await updateReviewById(reviewId, { content, rating });
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const deleteReview = async (req: AuthRequest, res: Response) => {
  try {
    const productId = Number(req.params.productId);
    const reviewId = Number(req.params.reviewId);
    if (Number.isNaN(productId) || Number.isNaN(reviewId)) {
      return res.status(400).json({ message: "유효하지 않은 id입니다." });
    }

    // patchReview와 동일한 이유로 404 -> 403 순서로 체크한다.
    const review = await getReviewById(reviewId);
    if (!review || review.productId !== productId) {
      return res.status(404).json({ message: "Not found" });
    }
    if (review.userId !== req.userId) {
      return res
        .status(403)
        .json({ message: "본인이 작성한 리뷰만 삭제할 수 있습니다." });
    }

    await deleteReviewById(reviewId);
    res.json({ message: "리뷰가 삭제되었습니다." });
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};
