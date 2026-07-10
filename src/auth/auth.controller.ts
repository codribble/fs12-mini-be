import { Request, Response } from "express";
import { signupUser, loginUser, refreshAccessToken } from "./auth.service";

const IS_DEV = process.env.NODE_ENV !== "production";

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "strict" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
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

export const logout = (_req: Request, res: Response) => {
  if (!IS_DEV) {
    res.clearCookie("refreshToken");
  }
  res.json({ message: "로그아웃 되었습니다." });
};
