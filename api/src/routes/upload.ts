import { Elysia, t } from "elysia";
import { mkdir, writeFile, unlink } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { success, error } from "../lib/utils";

// 上传目录
const UPLOAD_DIR = join(process.cwd(), "uploads");
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

// 确保上传目录存在
async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

// 生成唯一文件名
function generateFileName(originalName: string): string {
  const ext = originalName.split(".").pop() || "jpg";
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}.${ext}`;
}

export const uploadRoutes = new Elysia({ prefix: "/api/upload" })
  // 上传图片
  .post(
    "/image",
    async ({ body }) => {
      const { file } = body;

      if (!file) {
        return error("请选择文件", 400);
      }

      // 检查文件类型
      if (!ALLOWED_TYPES.includes(file.type)) {
        return error("只支持 JPG、PNG、GIF、WEBP 格式", 400);
      }

      // 检查文件大小
      if (file.size > MAX_SIZE) {
        return error("文件大小不能超过 5MB", 400);
      }

      try {
        await ensureUploadDir();

        const fileName = generateFileName(file.name);
        const filePath = join(UPLOAD_DIR, fileName);

        // 将文件写入磁盘
        const arrayBuffer = await file.arrayBuffer();
        await writeFile(filePath, Buffer.from(arrayBuffer));

        // 返回相对路径
        const url = `/uploads/${fileName}`;

        return success({ url, fileName }, "上传成功");
      } catch (e) {
        console.error("Upload error:", e);
        return error("上传失败", 500);
      }
    },
    {
      body: t.Object({
        file: t.File(),
      }),
      detail: { tags: ["Upload"], summary: "上传图片" },
    }
  )

  // 批量上传图片
  .post(
    "/images",
    async ({ body }) => {
      const { files } = body;

      if (!files || files.length === 0) {
        return error("请选择文件", 400);
      }

      try {
        await ensureUploadDir();

        const results = [];

        for (const file of files) {
          // 检查文件类型
          if (!ALLOWED_TYPES.includes(file.type)) {
            results.push({ name: file.name, error: "不支持的格式" });
            continue;
          }

          // 检查文件大小
          if (file.size > MAX_SIZE) {
            results.push({ name: file.name, error: "文件过大" });
            continue;
          }

          const fileName = generateFileName(file.name);
          const filePath = join(UPLOAD_DIR, fileName);

          const arrayBuffer = await file.arrayBuffer();
          await writeFile(filePath, Buffer.from(arrayBuffer));

          results.push({
            name: file.name,
            url: `/uploads/${fileName}`,
            fileName,
          });
        }

        return success(results, "上传完成");
      } catch (e) {
        console.error("Upload error:", e);
        return error("上传失败", 500);
      }
    },
    {
      body: t.Object({
        files: t.Files(),
      }),
      detail: { tags: ["Upload"], summary: "批量上传图片" },
    }
  )

  // 删除图片
  .delete(
    "/:fileName",
    async ({ params }) => {
      const filePath = join(UPLOAD_DIR, params.fileName);

      if (!existsSync(filePath)) {
        return error("文件不存在", 404);
      }

      try {
        await unlink(filePath);
        return success(null, "删除成功");
      } catch (e) {
        console.error("Delete error:", e);
        return error("删除失败", 500);
      }
    },
    {
      params: t.Object({ fileName: t.String() }),
      detail: { tags: ["Upload"], summary: "删除图片" },
    }
  );
