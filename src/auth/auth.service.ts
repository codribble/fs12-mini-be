import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { authRepository } from "./auth.repository";

const ACCESS_TOKEN_EXPIRES = "15m";
const REFRESH_TOKEN_EXPIRES = "7d";

export const generateTokens = (userId: number) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET!, {
    expiresIn: ACCESS_TOKEN_EXPIRES,
  });
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: REFRESH_TOKEN_EXPIRES,
  });
  return { accessToken, refreshToken };
};

export const signupUser = async (email: string, password: string, name: string) => {
  const hashed = await bcrypt.hash(password, 10);
  const user = await authRepository.createUser({ email, password: hashed, name });
  return generateTokens(user.id);
};

export const loginUser = async (email: string, password: string) => {
  const user = await authRepository.findByEmail(email);
  if (!user) throw new Error("이메일 또는 비밀번호가 올바르지 않습니다.");
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new Error("이메일 또는 비밀번호가 올바르지 않습니다.");
  return { tokens: generateTokens(user.id), user: { id: user.id, email: user.email, name: user.name } };
};

export const refreshAccessToken = (refreshToken: string) => {
  const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { userId: number };
  const accessToken = jwt.sign({ userId: payload.userId }, process.env.JWT_SECRET!, {
    expiresIn: ACCESS_TOKEN_EXPIRES,
  });
  return { accessToken };
};
