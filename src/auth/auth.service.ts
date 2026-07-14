import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { authRepository } from "./auth.repository";

// accessToken은 짧게(15분) — 탈취돼도 피해 시간이 제한적이도록.
// refreshToken은 길게(7일) — 매번 로그인하지 않고도 accessToken을 계속 재발급받을 수 있도록.
// 이 프로젝트는 두 토큰을 서로 다른 secret(JWT_SECRET / JWT_REFRESH_SECRET)으로 서명한다 —
// 한쪽 secret이 유출돼도 다른 쪽 토큰까지 위조할 수 없게 분리한 것.
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
  // 비밀번호를 평문으로 저장하지 않고 bcrypt로 해싱한다. 10은 salt round(해싱 반복 횟수) —
  // 숫자가 클수록 무차별 대입 공격에 강해지지만 해싱 자체도 느려진다. 10은 흔히 쓰이는 균형점.
  const hashed = await bcrypt.hash(password, 10);
  const user = await authRepository.createUser({ email, password: hashed, name });
  return generateTokens(user.id);
};

export const loginUser = async (email: string, password: string) => {
  const user = await authRepository.findByEmail(email);
  // "이메일이 존재하지 않음"과 "비밀번호가 틀림"을 서로 다른 메시지로 알려주면, 공격자가 그 차이만으로
  // 어떤 이메일이 실제 가입돼 있는지 하나씩 확인(계정 존재 여부 스캐닝)할 수 있게 된다.
  // 그래서 두 경우 모두 똑같은 문구("이메일 또는 비밀번호가 올바르지 않습니다")로 응답한다.
  if (!user) throw new Error("이메일 또는 비밀번호가 올바르지 않습니다.");
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new Error("이메일 또는 비밀번호가 올바르지 않습니다.");
  return { tokens: generateTokens(user.id), user: { id: user.id, email: user.email, name: user.name } };
};

export const refreshAccessToken = (refreshToken: string) => {
  // jwt.verify는 서명(JWT_REFRESH_SECRET)과 만료 시각을 함께 검증한다 — 서명이 안 맞거나
  // 만료됐으면 여기서 예외를 던지고, 그 예외는 auth.controller.refresh의 catch에서 401로 처리된다.
  const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { userId: number };
  // 여기서는 accessToken만 새로 발급하고 refreshToken은 재발급하지 않는다(=refreshToken은 7일간 고정).
  // 그래서 사용자는 7일 동안은 재로그인 없이 계속 accessToken만 갱신받다가, 7일이 지나면 refreshToken도
  // 만료되어 다시 로그인해야 한다.
  const accessToken = jwt.sign({ userId: payload.userId }, process.env.JWT_SECRET!, {
    expiresIn: ACCESS_TOKEN_EXPIRES,
  });
  return { accessToken };
};
