// 可灵API 工具函数
import jwt from "jsonwebtoken";

const KLING_AK = process.env.KLING_AK || "";
const KLING_SK = process.env.KLING_SK || "";
const KLING_API_BASE = "https://api.klingai.com/v1";

// 生成JWT Token
export function generateToken(): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: KLING_AK,
    exp: now + 1800, // 30分钟过期
    nbf: now - 5,
  };
  return jwt.sign(payload, KLING_SK, {
    algorithm: "HS256",
    header: { alg: "HS256", typ: "JWT" },
  });
}

// 通用请求函数
async function klingRequest(path: string, method = "GET", body?: any) {
  const token = generateToken();
  const res = await fetch(`${KLING_API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

// 文生视频
export async function createTextToVideo(params: {
  prompt: string;
  negative_prompt?: string;
  duration?: "5" | "10"; // 5秒或10秒
  aspect_ratio?: "16:9" | "9:16" | "1:1";
  model_name?: string;
  cfg_scale?: number;
}) {
  return klingRequest("/videos/text2video", "POST", {
    model_name: params.model_name || "kling-v1-5",
    prompt: params.prompt,
    negative_prompt: params.negative_prompt || "模糊，低质量，变形",
    duration: params.duration || "5",
    aspect_ratio: params.aspect_ratio || "16:9",
    cfg_scale: params.cfg_scale || 0.5,
  });
}

// 图生视频
export async function createImageToVideo(params: {
  prompt: string;
  image_url: string;
  negative_prompt?: string;
  duration?: "5" | "10";
}) {
  return klingRequest("/videos/image2video", "POST", {
    model_name: "kling-v1-5",
    prompt: params.prompt,
    negative_prompt: params.negative_prompt || "模糊，低质量，变形",
    image: params.image_url,
    duration: params.duration || "5",
  });
}

// 查询任务状态
export async function getTaskStatus(taskId: string) {
  return klingRequest(`/videos/text2video/${taskId}`);
}

// 查询图生视频任务状态
export async function getImg2VideoStatus(taskId: string) {
  return klingRequest(`/videos/image2video/${taskId}`);
}
