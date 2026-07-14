import { User } from "@prisma/client";
import { prisma } from "../lib/prisma";

export const authRepository = {
  // 로그인/중복 이메일 체크에 사용 — 순수 조회만 하고 존재 여부 판단은 service에서 처리
  findByEmail: (email: User["email"]) =>
    prisma.user.findUnique({ where: { email } }),

  // data 타입을 별도 DTO 인터페이스로 만들지 않고 Prisma가 생성한 User 타입에서
  // Pick으로 필요한 필드만 뽑아 쓴다 — schema.prisma가 바뀌면 이 타입도 자동으로 같이 바뀌므로
  // "User 모델은 고쳤는데 DTO는 안 고쳐서 어긋나는" 이중 관리 문제가 없다. id/createdAt처럼
  // DB가 자동으로 채우는 필드는 Pick에서 제외해 실수로 넘기지 못하게 막는다.
  createUser: (data: Pick<User, "email" | "password" | "name">) =>
    prisma.user.create({ data }),
};
