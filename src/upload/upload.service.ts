import { randomUUID } from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "../lib/s3";

/**
 * [왜 presigned URL인가]
 * 파일 업로드를 구현하는 방법은 크게 두 가지다.
 *
 * (A) 서버 경유 업로드 (multer, multer-s3 등)
 *     클라이언트 → 우리 서버 → S3 순으로 파일 바이트가 두 번 전송된다.
 *     서버가 업로드 트래픽/메모리를 그대로 떠안기 때문에, 이미지가 많거나
 *     동시 업로드가 몰리면 서버가 병목이 되고 비용도 이중으로 든다.
 *
 * (B) presigned URL 업로드 (지금 이 방식)
 *     서버는 "이 경로에 이 파일을 올려도 좋다"는 서명(signature)이 담긴
 *     임시 URL만 발급하고, 실제 파일 바이트는 클라이언트가 S3로 직접 PUT한다.
 *     서버는 파일 자체를 만지지 않으므로 트래픽/메모리 부담이 없고,
 *     업로드 완료 후 클라이언트가 돌려주는 key만 DB에 저장하면 된다.
 *
 * 이번 프로젝트처럼 상품 이미지 업로드가 잦고, 서버가 파일 내용을 가공할
 * 필요가 없는 경우엔 (B)가 표준적인 선택이다. 반대로 "업로드된 이미지를
 * 리사이징/워터마크 처리해야 한다"처럼 서버가 바이트를 직접 봐야 하는
 * 요구사항이 있다면 (A)나, presigned 업로드 후 Lambda/서버가 후처리하는
 * 하이브리드 방식을 써야 한다.
 */

// presigned URL의 유효시간(초). 발급 즉시 업로드를 시작한다는 전제이므로 짧게 잡아도 충분하다.
// 너무 길게 잡으면 URL이 새어나갔을 때 악용 가능한 시간도 그만큼 늘어난다.
const UPLOAD_URL_EXPIRES_IN = 10;

// 서버는 파일의 실제 내용을 검사하지 않으므로(그게 presigned 방식의 핵심),
// 최소한 "어떤 Content-Type으로 업로드할 것인지"는 화이트리스트로 막아둔다.
// 이게 없으면 클라이언트가 이미지가 아닌 임의의 파일(실행파일 등)도
// 이미지 업로드용 경로에 밀어넣을 수 있다.
const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

export const createPresignedUploadUrl = async (
  filename: string,
  contentType: string,
) => {
  if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
    throw new Error(`허용되지 않는 파일 형식입니다: ${contentType}`);
  }

  // 원본 파일명을 그대로 S3 key로 쓰지 않는 이유:
  // 1) 같은 이름의 파일이 동시에 올라오면 서로 덮어쓴다 (예: "1.jpg" 두 명이 동시 업로드).
  // 2) 파일명에 한글/공백/특수문자가 섞이면 URL 인코딩 이슈가 생기기 쉽다.
  // 그래서 UUID로 새 식별자를 만들고, 확장자만 원본에서 그대로 가져와 붙인다.
  const ext = filename.includes(".")
    ? filename.slice(filename.lastIndexOf("."))
    : "";
  const key = `products/${randomUUID()}${ext}`;

  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: key,
    // ContentType은 서명에 포함된다. 즉 클라이언트가 실제 PUT 요청을 보낼 때
    // 헤더의 Content-Type이 여기서 지정한 값과 정확히 일치하지 않으면
    // S3가 "SignatureDoesNotMatch"로 거부한다 — 서명 위조 방지의 일부다.
    ContentType: contentType,
  });

  // getSignedUrl은 네트워크 요청을 보내지 않는다. 순수하게 로컬에서
  // AWS Signature V4 알고리즘을 계산해, "이 요청은 어떤 자격증명으로,
  // 언제까지 유효하게 서명되었는지"를 나타내는 쿼리스트링
  // (X-Amz-Credential, X-Amz-Signature, X-Amz-Expires ...)을 URL에 붙여줄 뿐이다.
  // 이 URL 자체가 곧 "임시 인증서" 역할을 하기 때문에, 만료 전까지는
  // AWS 로그인/자격증명 없이 누구나 이 URL로 PUT 요청 한 번을 보낼 수 있다.
  const uploadUrl = await getSignedUrl(s3, command, {
    expiresIn: UPLOAD_URL_EXPIRES_IN,
  });

  return { uploadUrl, key };
};
