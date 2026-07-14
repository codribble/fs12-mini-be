import { Request, Response } from "express";
import { createPresignedUploadUrl } from "./upload.service";

export const getPresignedUploadUrl = async (req: Request, res: Response) => {
  try {
    const { filename, contentType } = req.body;
    if (!filename || !contentType) {
      return res
        .status(400)
        .json({ message: "filename과 contentType은 필수입니다." });
    }

    // 여기서 반환하는 uploadUrl은 서버가 아니라 클라이언트가 직접 S3로 PUT할 주소다.
    // key는 업로드가 끝난 뒤 클라이언트가 "상품 등록" 요청 시 s3Key로 함께 보내야
    // DB에 어떤 파일이 연결됐는지 알 수 있다 (서버는 업로드 성공 여부를 직접 확인하지 않는다).
    const { uploadUrl, key } = await createPresignedUploadUrl(
      filename,
      contentType,
    );
    res.json({ uploadUrl, key });
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};
