import { Request, Response } from "express";
import { AuthRequest } from "../middlewares/auth";
import {
  createProduct,
  getProductList,
  getProductById,
  updateProductById,
  deleteProductWithReviews,
} from "./product.service";

export const postProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { name, price, category, s3Key, link } = req.body;
    if (!name || !category || !s3Key) {
      return res
        .status(400)
        .json({ message: "name, category, s3Key는 필수입니다." });
    }
    if (typeof price !== "number" || price <= 0) {
      return res
        .status(400)
        .json({ message: "price는 0보다 큰 숫자여야 합니다." });
    }

    // req.userId!: authMiddleware를 통과해야 이 핸들러에 도달하므로(라우터에서 강제),
    // 이 시점엔 반드시 값이 채워져 있다고 보장된다 -> non-null assertion.
    const product = await createProduct(req.userId!, {
      name,
      price,
      category,
      s3Key,
      link,
    });
    res.status(201).json(product);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const getProducts = async (req: Request, res: Response) => {
  try {
    // limit을 undefined로 넘기면 product.service.getProductList의 기본값(DEFAULT_LIMIT)이 적용된다
    // -> 쿼리스트링이 아예 없는 최초 요청(첫 페이지)도 별도 분기 없이 자연스럽게 처리된다.
    const cursor = req.query.cursor ? Number(req.query.cursor) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const category = req.query.category as string | undefined;

    const result = await getProductList(cursor, limit, category);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const getProduct = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "유효하지 않은 id입니다." });
    }

    const product = await getProductById(id);
    if (!product) return res.status(404).json({ message: "Not found" });

    res.json(product);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const patchProduct = async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "유효하지 않은 id입니다." });
    }

    // 소유권 검증(403)은 service가 아니라 여기 controller에서 처리한다.
    // 이유: 이 프로젝트는 커스텀 에러 클래스 없이 컨트롤러의 try/catch + 고정 상태코드로
    // 에러를 처리하는 관례라(auth 모듈 참고), 한 라우트 안에서 404/403/400을 다 구분하려면
    // "먼저 조회해서 없으면 404, userId 다르면 403, 그 다음에만 실제 수정"처럼
    // 컨트롤러가 직접 순서대로 체크하는 게 기존 스타일과 가장 잘 맞는다.
    const product = await getProductById(id);
    if (!product) return res.status(404).json({ message: "Not found" });
    if (product.userId !== req.userId) {
      return res
        .status(403)
        .json({ message: "본인이 등록한 상품만 수정할 수 있습니다." });
    }

    const { name, price, category, s3Key, link } = req.body;
    if (price !== undefined && (typeof price !== "number" || price <= 0)) {
      return res
        .status(400)
        .json({ message: "price는 0보다 큰 숫자여야 합니다." });
    }

    const updated = await updateProductById(id, {
      name,
      price,
      category,
      s3Key,
      link,
    });
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const deleteProduct = async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "유효하지 않은 id입니다." });
    }

    // patchProduct와 동일한 이유로 컨트롤러에서 404 -> 403 순서로 체크한다.
    const product = await getProductById(id);
    if (!product) return res.status(404).json({ message: "Not found" });
    if (product.userId !== req.userId) {
      return res
        .status(403)
        .json({ message: "본인이 등록한 상품만 삭제할 수 있습니다." });
    }

    await deleteProductWithReviews(id);
    res.json({ message: "상품이 삭제되었습니다." });
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};
