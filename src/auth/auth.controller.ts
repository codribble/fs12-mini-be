import { Request, Response } from "express";
import { signupUser, loginUser, refreshAccessToken } from "./auth.service";

// refreshToken 전달 방식을 개발/프로덕션에서 다르게 한다(Notion 스펙 원문 요구사항).
// 프로덕션: httpOnly secure 쿠키로만 전달 — JS(document.cookie)로 읽을 수 없어 XSS로 토큰을 훔쳐가기 어렵다.
//           FE(Vercel)와 BE(EC2/도메인)가 서로 다른 사이트라 sameSite:"none"이 필수 —
//           그러려면 secure:true(HTTPS)가 함께 있어야 브라우저가 쿠키를 전송한다.
// 개발:     localhost:3000(FE) <-> localhost:8080(BE)처럼 서로 다른 포트라 쿠키 설정이 번거롭고,
//           로컬 개발 편의를 위해 body에도 그대로 노출해서 Postman/curl로 바로 꺼내 쓸 수 있게 한다.
const IS_DEV = process.env.NODE_ENV !== "production";

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true, // JS에서 document.cookie로 접근 불가 -> XSS로 토큰 탈취 방지
  secure: true, // HTTPS 연결에서만 쿠키 전송 -> 평문 HTTP 도청으로 탈취 방지
  sameSite: "none" as const, // FE(Vercel)와 BE가 cross-site라 "strict"/"lax"면 쿠키가 아예 안 실림
  maxAge: 7 * 24 * 60 * 60 * 1000, // refreshToken의 JWT 만료(7일)와 쿠키 만료를 맞춤(ms 단위)
};

export const signup = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    const { accessToken, refreshToken } = await signupUser(email, password, name);

    if (!IS_DEV) {
      res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);
    }

    res.status(201).json({
      accessToken,
      ...(IS_DEV && { refreshToken }),
    });
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const { tokens, user } = await loginUser(email, password);
    const { accessToken, refreshToken } = tokens;

    if (!IS_DEV) {
      res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);
    }

    res.json({
      accessToken,
      user,
      ...(IS_DEV && { refreshToken }),
    });
  } catch (e: any) {
    res.status(401).json({ message: e.message });
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    // 개발: body에서, 프로덕션: httpOnly 쿠키에서
    const token = IS_DEV ? req.body.refreshToken : req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ message: "refresh token이 없습니다." });

    const { accessToken } = refreshAccessToken(token);
    res.json({ accessToken });
  } catch {
    res.status(401).json({ message: "유효하지 않은 refresh token입니다." });
  }
};

// authMiddleware를 거치지 않는다 — accessToken이 이미 만료된 상태에서도 "로그아웃 처리(쿠키 삭제)"는
// 되어야 하므로, 로그인 여부를 검증할 필요가 없다. 실패해도 클라이언트가 로컬의 토큰을 지우면 그만이라
// 사실상 항상 성공하는 멱등(idempotent) 액션으로 다뤄도 문제없다.
export const logout = (_req: Request, res: Response) => {
  if (!IS_DEV) {
    // clearCookie는 세팅 시 옵션(sameSite/secure)이 일치해야 브라우저가 쿠키를 정확히 지운다.
    res.clearCookie("refreshToken", {
      httpOnly: REFRESH_COOKIE_OPTIONS.httpOnly,
      secure: REFRESH_COOKIE_OPTIONS.secure,
      sameSite: REFRESH_COOKIE_OPTIONS.sameSite,
    });
  }
  res.json({ message: "로그아웃 되었습니다." });
};
