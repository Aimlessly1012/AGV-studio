"use client";

import { useState, useEffect, useCallback } from "react";

interface Scene {
  id: string;
  order: number;
  timeStart: string;
  timeEnd: string;
  title: string;
  prompt: string;
  negativePrompt: string;
  duration: "5" | "10";
  status: "pending" | "generating" | "done" | "failed";
  taskId?: string;
  videoUrl?: string;
  errorMsg?: string;
}

interface Project {
  id: string;
  name: string;
  totalDuration: string;
  scenes: Scene[];
}

// 默认场景数据（生物质能动画）
const defaultScenes = [
  {
    order: 1,
    timeStart: "0:00",
    timeEnd: "0:25",
    title: "引子：时代之问",
    prompt: "电影质感，俯瞰城市夜景，灯火辉煌，能源消耗场景，镜头快速拉升到森林，阳光穿透树冠，绿色粒子汇聚成虚拟数字人形象，身穿绿色科技风服装，现代科技风格，4K高清",
    negativePrompt: "模糊，低质量，变形",
    duration: "5" as const,
  },
  {
    order: 2,
    timeStart: "0:26",
    timeEnd: "1:15",
    title: "什么是生物质能",
    prompt: "微观特写，叶片气孔微观摄影，阳光照射，光合作用动画，CO2分子被吸收的粒子效果，绿色有机物合成动画，新生植物生长，碳循环闭环动画，生物学可视化，绿色科技风格，4K",
    negativePrompt: "模糊，低质量，变形",
    duration: "10" as const,
  },
  {
    order: 3,
    timeStart: "1:16",
    timeEnd: "2:10",
    title: "中国生物质资源",
    prompt: "中国3D地图可视化，数据可视化大屏，稻草麦田场景，林业森林，畜禽养殖，有机废弃物，四类资源图标从中国地图各省份依次亮起，金色数据柱状图增长动画，科技感数据展示，现代科技风格，4K",
    negativePrompt: "模糊，低质量，变形",
    duration: "10" as const,
  },
  {
    order: 4,
    timeStart: "2:11",
    timeEnd: "3:10",
    title: "产业全景：化腐朽为神奇",
    prompt: "3D树模型从种子发芽生长动画，树干分出三大技术路径，物理热化学生物化学图标，能量流动画，电厂发电，燃气管道，生物油提炼，发酵罐动画，能源网络流动，电网油气管网交通系统互联，绿色产业全景，宏大叙事风格，4K",
    negativePrompt: "模糊，低质量，变形",
    duration: "10" as const,
  },
  {
    order: 5,
    timeStart: "3:11",
    timeEnd: "3:30",
    title: "结尾：开启探索之旅",
    prompt: "虚拟数字人主持人侧身站立，7个专题图标预览，生物质成型气化热解液化发酵干燥炭化，画面滑过转场特效，能源产业未来展望，绿色科技风格，4K",
    negativePrompt: "模糊，低质量，变形",
    duration: "5" as const,
  },
];

export default function Home() {
  const [project, setProject] = useState<Project | null>(null);
  const [projectName, setProjectName] = useState("生物质能动画");
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);

  // 创建项目
  const createProject = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/kling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "createProject", name: projectName, totalDuration: "3:30" }),
      });
      const proj = await res.json();

      // 添加默认场景
      for (const scene of defaultScenes) {
        await fetch("/api/kling", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "addScene", projectId: proj.id, ...scene }),
        });
      }

      // 刷新项目
      const updated = await fetch(`/api/kling?projectId=${proj.id}`).then(r => r.json());
      setProject(updated);
    } catch (e) {
      alert("创建失败: " + (e as Error).message);
    }
    setLoading(false);
  };

  // 更新场景提示词
  const updateScenePrompt = async (sceneId: string, field: string, value: string) => {
    if (!project) return;
    await fetch("/api/kling", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "updateScene",
        projectId: project.id,
        sceneId,
        updates: { [field]: value },
      }),
    });
    refreshProject();
  };

  // 刷新项目数据
  const refreshProject = useCallback(async () => {
    if (!project) return;
    const updated = await fetch(`/api/kling?projectId=${project.id}`).then(r => r.json());
    setProject(updated);
  }, [project]);

  // 生成单个场景视频
  const generateScene = async (sceneId: string) => {
    if (!project) return;
    try {
      const res = await fetch("/api/kling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", projectId: project.id, sceneId }),
      });
      const result = await res.json();
      if (result.error) alert("生成失败: " + result.error);
      refreshProject();
    } catch (e) {
      alert("请求失败: " + (e as Error).message);
    }
  };

  // 批量生成所有
  const generateAll = async () => {
    if (!project) return;
    setLoading(true);
    try {
      const res = await fetch("/api/kling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generateAll", projectId: project.id }),
      });
      const result = await res.json();
      refreshProject();
    } catch (e) {
      alert("批量生成失败: " + (e as Error).message);
    }
    setLoading(false);
  };

  // 查询任务状态
  const checkStatus = async (sceneId: string) => {
    if (!project) return;
    try {
      const res = await fetch("/api/kling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "checkStatus", projectId: project.id, sceneId }),
      });
      const result = await res.json();
      refreshProject();
    } catch (e) {
      console.error(e);
    }
  };

  // 轮询生成中的任务
  useEffect(() => {
    if (!project) return;
    const generatingScenes = project.scenes.filter(s => s.status === "generating");
    if (generatingScenes.length === 0) return;

    const interval = setInterval(() => {
      generatingScenes.forEach(s => checkStatus(s.id));
    }, 10000); // 每10秒查一次

    return () => clearInterval(interval);
  }, [project]);

  // 添加新场景
  const addNewScene = async () => {
    if (!project) return;
    const order = project.scenes.length + 1;
    await fetch("/api/kling", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "addScene",
        projectId: project.id,
        order,
        timeStart: "0:00",
        timeEnd: "0:05",
        title: `场景 ${order}`,
        prompt: "",
        negativePrompt: "模糊，低质量，变形",
        duration: "5",
      }),
    });
    refreshProject();
  };

  // 删除场景
  const removeScene = async (sceneId: string) => {
    if (!project) return;
    if (!confirm("确认删除此场景？")) return;
    await fetch("/api/kling", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "deleteScene", projectId: project.id, sceneId }),
    });
    refreshProject();
  };

  // 状态标签
  const StatusTag = ({ status }: { status: string }) => {
    const map: Record<string, { text: string; cls: string }> = {
      pending: { text: "待生成", cls: "status-pending" },
      generating: { text: "生成中...", cls: "status-generating" },
      done: { text: "已完成", cls: "status-done" },
      failed: { text: "失败", cls: "status-failed" },
    };
    const s = map[status] || map.pending;
    return <span className={`status-tag ${s.cls}`}>{s.text}</span>;
  };

  // 未创建项目
  if (!project) {
    return (
      <div className="container">
        <div className="header">
          <h1>🎬 可灵AI视频工作室</h1>
          <p>基于可灵AI的动画视频制作平台 · 分镜驱动 · 一键生成</p>
        </div>

        <div className="create-form">
          <input
            type="text"
            value={projectName}
            onChange={e => setProjectName(e.target.value)}
            placeholder="项目名称"
          />
          <input type="text" defaultValue="3:30" placeholder="总时长" style={{ maxWidth: 120 }} />
          <button className="btn btn-primary" onClick={createProject} disabled={loading}>
            {loading ? "创建中..." : "🚀 创建项目"}
          </button>
        </div>

        <div className="empty">
          <div className="empty-icon">🎥</div>
          <p>创建项目后，自动载入《生物质能》动画分镜</p>
          <p style={{ fontSize: 14 }}>你可以修改提示词，然后一键调用可灵AI生成视频片段</p>
        </div>
      </div>
    );
  }

  // 统计
  const total = project.scenes.length;
  const done = project.scenes.filter(s => s.status === "done").length;
  const generating = project.scenes.filter(s => s.status === "generating").length;

  return (
    <div className="container">
      <div className="header">
        <h1>🎬 {project.name}</h1>
        <p>总时长 {project.totalDuration} · {total} 个场景</p>
      </div>

      {/* 工具栏 */}
      <div className="toolbar">
        <div className="toolbar-stats">
          <div className="stat">
            <div className="stat-value">{total}</div>
            <div className="stat-label">总场景</div>
          </div>
          <div className="stat">
            <div className="stat-value" style={{ color: "#22c55e" }}>{done}</div>
            <div className="stat-label">已完成</div>
          </div>
          <div className="stat">
            <div className="stat-value" style={{ color: "#f97316" }}>{generating}</div>
            <div className="stat-label">生成中</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-primary" onClick={generateAll} disabled={loading}>
            {loading ? "处理中..." : "🚀 一键生成全部"}
          </button>
          <button className="btn btn-blue" onClick={refreshProject}>🔄 刷新状态</button>
        </div>
      </div>

      {/* 场景时间轴 */}
      <div className="timeline">
        {project.scenes
          .sort((a, b) => a.order - b.order)
          .map(scene => (
            <div key={scene.id} className={`scene-card ${scene.status}`}>
              <div className="scene-header">
                <div>
                  <span className="scene-time">{scene.timeStart} - {scene.timeEnd}</span>
                  <StatusTag status={scene.status} />
                </div>
                <button className="btn btn-danger btn-sm" onClick={() => removeScene(scene.id)}>删除</button>
              </div>

              <input
                className="scene-prompt"
                style={{ minHeight: 30, fontSize: 18, fontWeight: "bold", border: "none", background: "transparent", color: "#fff", width: "100%", padding: 0 }}
                defaultValue={scene.title}
                onBlur={e => updateScenePrompt(scene.id, "title", e.target.value)}
              />

              <div style={{ marginTop: 12 }}>
                <label style={{ fontSize: 13, color: "#94a3b8" }}>提示词 (Prompt)</label>
                <textarea
                  className="scene-prompt"
                  defaultValue={scene.prompt}
                  onBlur={e => updateScenePrompt(scene.id, "prompt", e.target.value)}
                />
              </div>

              <div style={{ marginTop: 8 }}>
                <label style={{ fontSize: 13, color: "#94a3b8" }}>反向提示词</label>
                <textarea
                  className="scene-prompt"
                  style={{ minHeight: 40 }}
                  defaultValue={scene.negativePrompt}
                  onBlur={e => updateScenePrompt(scene.id, "negativePrompt", e.target.value)}
                />
              </div>

              <div className="scene-meta">
                <label>时长:</label>
                <select
                  defaultValue={scene.duration}
                  onChange={e => updateScenePrompt(scene.id, "duration", e.target.value)}
                >
                  <option value="5">5秒</option>
                  <option value="10">10秒</option>
                </select>
              </div>

              <div className="scene-actions">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => generateScene(scene.id)}
                  disabled={scene.status === "generating"}
                >
                  {scene.status === "generating" ? "⏳ 生成中..." : "🎬 生成视频"}
                </button>
                {scene.status === "generating" && (
                  <button className="btn btn-blue btn-sm" onClick={() => checkStatus(scene.id)}>
                    🔍 查询状态
                  </button>
                )}
                {scene.status === "failed" && (
                  <button className="btn btn-orange btn-sm" onClick={() => generateScene(scene.id)}>
                    🔄 重试
                  </button>
                )}
              </div>

              {scene.errorMsg && (
                <div style={{ marginTop: 8, fontSize: 13, color: "#ef4444" }}>
                  ❌ {scene.errorMsg}
                </div>
              )}

              {scene.videoUrl && (
                <div className="video-preview">
                  <video src={scene.videoUrl} controls />
                </div>
              )}
            </div>
          ))}
      </div>

      {/* 添加场景 */}
      <div className="add-scene" onClick={addNewScene}>
        ➕ 添加新场景
      </div>
    </div>
  );
}
