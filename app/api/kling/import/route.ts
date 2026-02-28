import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createProject, addScene, getProject } from "@/lib/store";

// POST /api/kling/import - 导入Excel
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const projectName = (formData.get("projectName") as string) || "导入项目";

    if (!file) {
      return NextResponse.json({ error: "请上传文件" }, { status: 400 });
    }

    // 读取Excel
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    if (rows.length < 2) {
      return NextResponse.json({ error: "Excel为空或格式不正确" }, { status: 400 });
    }

    // 解析表头，智能匹配列
    const headerRow = rows[0].map((h: any) => String(h || "").trim().toLowerCase());
    
    // 尝试匹配列索引
    let colMap = {
      order: -1,
      time: -1,
      title: -1,
      prompt: -1,
      negativePrompt: -1,
      duration: -1,
    };

    headerRow.forEach((h: string, i: number) => {
      if (h.includes("序号") || h.includes("序") || h.includes("order") || h.includes("#")) colMap.order = i;
      if (h.includes("时间") || h.includes("time")) colMap.time = i;
      if (h.includes("标题") || h.includes("场景") || h.includes("title") || h.includes("scene")) colMap.title = i;
      if (h.includes("提示词") || h.includes("prompt")) {
        if (h.includes("反向") || h.includes("negative") || h.includes("neg")) {
          colMap.negativePrompt = i;
        } else {
          colMap.prompt = i;
        }
      }
      if (h.includes("时长") || h.includes("duration") || h.includes("秒")) colMap.duration = i;
    });

    // 如果没有匹配到列，使用默认顺序: 序号|时间|标题|提示词|反向提示词|时长
    if (colMap.prompt === -1) {
      colMap = { order: 0, time: 1, title: 2, prompt: 3, negativePrompt: 4, duration: 5 };
    }

    // 计算总时长
    const dataRows = rows.slice(1).filter((r: any[]) => r.length > 0 && r[colMap.prompt]);
    const totalSeconds = dataRows.length * 10;
    const totalMin = Math.floor(totalSeconds / 60);
    const totalSec = totalSeconds % 60;
    const totalDuration = `${totalMin}:${String(totalSec).padStart(2, '0')}`;

    // 创建项目
    const project = createProject(projectName, totalDuration);

    // 解析每行数据
    let sceneCount = 0;
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      
      const prompt = String(row[colMap.prompt] || "").trim();
      if (!prompt) continue;

      // 解析时间段
      let timeStart = "0:00";
      let timeEnd = "0:10";
      if (colMap.time >= 0 && row[colMap.time]) {
        const timeStr = String(row[colMap.time]).trim();
        const parts = timeStr.split(/[-–—~]/);
        if (parts.length === 2) {
          timeStart = parts[0].trim();
          timeEnd = parts[1].trim();
        }
      } else {
        // 自动生成时间段
        const startSec = i * 10;
        const endSec = (i + 1) * 10;
        timeStart = `${Math.floor(startSec / 60)}:${String(startSec % 60).padStart(2, '0')}`;
        timeEnd = `${Math.floor(endSec / 60)}:${String(endSec % 60).padStart(2, '0')}`;
      }

      const title = colMap.title >= 0 ? String(row[colMap.title] || `场景 ${i + 1}`).trim() : `场景 ${i + 1}`;
      const negativePrompt = colMap.negativePrompt >= 0 ? String(row[colMap.negativePrompt] || "模糊，低质量，变形").trim() : "模糊，低质量，变形";
      const duration = colMap.duration >= 0 ? (String(row[colMap.duration] || "10").trim() === "5" ? "5" : "10") : "10";

      addScene(project.id, {
        order: i + 1,
        timeStart,
        timeEnd,
        title,
        prompt,
        negativePrompt,
        duration: duration as "5" | "10",
      });
      sceneCount++;
    }

    const updated = getProject(project.id);
    return NextResponse.json({
      project: updated,
      stats: {
        totalScenes: sceneCount,
        totalDuration,
        totalSeconds,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: "解析失败: " + err.message }, { status: 500 });
  }
}
