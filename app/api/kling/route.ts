import { NextRequest, NextResponse } from "next/server";
import { createTextToVideo, getTaskStatus } from "@/lib/kling";
import { getAllProjects, createProject, getProject, addScene, updateScene, deleteScene } from "@/lib/store";

// GET /api/kling - 获取所有项目
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  if (projectId) {
    const project = getProject(projectId);
    if (!project) return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    return NextResponse.json(project);
  }
  return NextResponse.json(getAllProjects());
}

// POST /api/kling - 创建项目 / 添加场景 / 生成视频
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;

  // 创建项目
  if (action === "createProject") {
    const project = createProject(body.name, body.totalDuration);
    return NextResponse.json(project);
  }

  // 添加场景
  if (action === "addScene") {
    const scene = addScene(body.projectId, {
      order: body.order,
      timeStart: body.timeStart,
      timeEnd: body.timeEnd,
      title: body.title,
      prompt: body.prompt,
      negativePrompt: body.negativePrompt || "模糊，低质量，变形",
      duration: body.duration || "5",
    });
    if (!scene) return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    return NextResponse.json(scene);
  }

  // 更新场景
  if (action === "updateScene") {
    const scene = updateScene(body.projectId, body.sceneId, body.updates);
    if (!scene) return NextResponse.json({ error: "场景不存在" }, { status: 404 });
    return NextResponse.json(scene);
  }

  // 删除场景
  if (action === "deleteScene") {
    deleteScene(body.projectId, body.sceneId);
    return NextResponse.json({ ok: true });
  }

  // 生成视频（调用可灵API）
  if (action === "generate") {
    const project = getProject(body.projectId);
    if (!project) return NextResponse.json({ error: "项目不存在" }, { status: 404 });

    const scene = project.scenes.find(s => s.id === body.sceneId);
    if (!scene) return NextResponse.json({ error: "场景不存在" }, { status: 404 });

    try {
      updateScene(body.projectId, body.sceneId, { status: "generating" });

      const result = await createTextToVideo({
        prompt: scene.prompt,
        negative_prompt: scene.negativePrompt,
        duration: scene.duration,
      });

      if (result.code === 0 && result.data?.task_id) {
        updateScene(body.projectId, body.sceneId, {
          taskId: result.data.task_id,
          status: "generating",
        });
        return NextResponse.json({ taskId: result.data.task_id, status: "generating" });
      } else {
        updateScene(body.projectId, body.sceneId, {
          status: "failed",
          errorMsg: result.message || "生成失败",
        });
        return NextResponse.json({ error: result.message || "API调用失败" }, { status: 500 });
      }
    } catch (err: any) {
      updateScene(body.projectId, body.sceneId, {
        status: "failed",
        errorMsg: err.message,
      });
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  // 批量生成所有场景
  if (action === "generateAll") {
    const project = getProject(body.projectId);
    if (!project) return NextResponse.json({ error: "项目不存在" }, { status: 404 });

    const results = [];
    for (const scene of project.scenes) {
      if (scene.status === "done") continue;
      try {
        updateScene(body.projectId, scene.id, { status: "generating" });
        const result = await createTextToVideo({
          prompt: scene.prompt,
          negative_prompt: scene.negativePrompt,
          duration: scene.duration,
        });
        if (result.code === 0 && result.data?.task_id) {
          updateScene(body.projectId, scene.id, { taskId: result.data.task_id, status: "generating" });
          results.push({ sceneId: scene.id, taskId: result.data.task_id, status: "ok" });
        } else {
          updateScene(body.projectId, scene.id, { status: "failed", errorMsg: result.message });
          results.push({ sceneId: scene.id, status: "failed", error: result.message });
        }
      } catch (err: any) {
        updateScene(body.projectId, scene.id, { status: "failed", errorMsg: err.message });
        results.push({ sceneId: scene.id, status: "failed", error: err.message });
      }
    }
    return NextResponse.json({ results });
  }

  // 查询任务状态
  if (action === "checkStatus") {
    const project = getProject(body.projectId);
    if (!project) return NextResponse.json({ error: "项目不存在" }, { status: 404 });

    const scene = project.scenes.find(s => s.id === body.sceneId);
    if (!scene?.taskId) return NextResponse.json({ error: "无任务ID" }, { status: 400 });

    try {
      const result = await getTaskStatus(scene.taskId);
      if (result.code === 0) {
        const taskData = result.data;
        if (taskData.task_status === "succeed" && taskData.task_result?.videos?.[0]?.url) {
          updateScene(body.projectId, body.sceneId, {
            status: "done",
            videoUrl: taskData.task_result.videos[0].url,
          });
          return NextResponse.json({ status: "done", videoUrl: taskData.task_result.videos[0].url });
        } else if (taskData.task_status === "failed") {
          updateScene(body.projectId, body.sceneId, {
            status: "failed",
            errorMsg: taskData.task_status_msg || "生成失败",
          });
          return NextResponse.json({ status: "failed", error: taskData.task_status_msg });
        }
        return NextResponse.json({ status: "generating", taskStatus: taskData.task_status });
      }
      return NextResponse.json({ error: result.message }, { status: 500 });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "未知操作" }, { status: 400 });
}
