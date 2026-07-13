import { User } from "@prisma/client";
import { prisma } from "../lib/prisma";

export const authRepository = {
  // 로그인/중복 이메일 체크에 사용 — 순수 조회만 하고 존재 여부 판단은 service에서 처리
  findByEmail: (email: User["email"]) =>
    prisma.user.findUnique({ where: { email } }),

  createUser: (data: Pick<User, "email" | "password" | "name">) =>
    prisma.user.create({ data }),
};
