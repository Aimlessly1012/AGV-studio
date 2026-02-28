"use client";

import { useState, useEffect, useCallback, useRef } from "react";

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

export default function Home() {
  const [project, setProject] = useState<Project | null>(null);
  const [projectName, setProjectName] = useState("生物质能动画");
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 导入Excel
  const importExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("projectName", projectName || "导入项目");

      const res = await fetch("/api/kling/import", { method: "POST", body: formData });
      const result = await res.json();

      if (result.error) {
        alert("导入失败: " + result.error);
      } else {
        setProject(result.project);
        alert(`✅ 导入成功！${result.stats.totalScenes} 个场景，总时长 ${result.stats.totalDuration}`);
      }
    } catch (err) {
      alert("导入失败: " + (err as Error).message);
    }
    setImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 创建空项目
  const createProject = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/kling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "createProject", name: projectName, totalDuration: "3:30" }),
      });
      const proj = await res.json();
      setProject(proj);
    } catch (e) {
      alert("创建失败: " + (e as Error).message);
    }
    setLoading(false);
  };

  // 更新场景
  const updateSceneField = async (sceneId: string, field: string, value: string) => {
    if (!project) return;
    await fetch("/api/kling", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "updateScene", projectId: project.id, sceneId, updates: { [field]: value } }),
    });
    refreshProject();
  };

  // 刷新项目
  const refreshProject = useCallback(async () => {
    if (!project) return;
    const updated = await fetch(`/api/kling?projectId=${project.id}`).then(r => r.json());
    setProject(updated);
  }, [project]);

  // 生成单个场景
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

  // 批量生成
  const generateAll = async () => {
    if (!project) return;
    if (!confirm(`确认生成全部 ${project.scenes.length} 个场景？将消耗可灵API额度。`)) return;
    setLoading(true);
    try {
      await fetch("/api/kling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generateAll", projectId: project.id }),
      });
      refreshProject();
    } catch (e) {
      alert("批量生成失败: " + (e as Error).message);
    }
    setLoading(false);
  };

  // 查询状态
  const checkStatus = async (sceneId: string) => {
    if (!project) return;
    await fetch("/api/kling", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "checkStatus", projectId: project.id, sceneId }),
    });
    refreshProject();
  };

  // 轮询
  useEffect(() => {
    if (!project) return;
    const generatingScenes = project.scenes.filter(s => s.status === "generating");
    if (generatingScenes.length === 0) return;
    const interval = setInterval(() => {
      generatingScenes.forEach(s => checkStatus(s.id));
    }, 10000);
    return () => clearInterval(interval);
  }, [project]);

  // 添加场景
  const addNewScene = async () => {
    if (!project) return;
    const order = project.scenes.length + 1;
    const startSec = (order - 1) * 10;
    const endSec = order * 10;
    await fetch("/api/kling", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "addScene",
        projectId: project.id,
        order,
        timeStart: `${Math.floor(startSec / 60)}:${String(startSec % 60).padStart(2, '0')}`,
        timeEnd: `${Math.floor(endSec / 60)}:${String(endSec % 60).padStart(2, '0')}`,
        title: `场景 ${order}`,
        prompt: "",
        negativePrompt: "模糊，低质量，变形",
        duration: "10",
      }),
    });
    refreshProject();
  };

  // 删除场景
  const removeScene = async (sceneId: string) => {
    if (!project || !confirm("确认删除？")) return;
    await fetch("/api/kling", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "deleteScene", projectId: project.id, sceneId }),
    });
    refreshProject();
  };

  // 返回首页
  const goHome = () => setProject(null);

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

  // ========== 首页：创建/导入 ==========
  if (!project) {
    return (
      <div className="container">
        <div className="header">
          <h1>🎬 可灵AI视频工作室</h1>
          <p>基于可灵AI的动画视频制作平台 · 分镜驱动 · 一键生成</p>
        </div>

        {/* 项目名称 */}
        <div className="create-form">
          <input
            type="text"
            value={projectName}
            onChange={e => setProjectName(e.target.value)}
            placeholder="项目名称"
            style={{ flex: 2 }}
          />
        </div>

        {/* 两种方式 */}
        <div style={{ display: "flex", gap: 24, marginTop: 24 }}>
          {/* 导入Excel */}
          <div style={{
            flex: 1,
            background: "#1e293b",
            borderRadius: 16,
            padding: 32,
            textAlign: "center",
            border: "2px solid #334155",
            cursor: "pointer",
            transition: "border-color 0.2s",
          }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "#4ade80")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "#334155")}
            onClick={() => fileInputRef.current?.click()}
          >
            <div style={{ fontSize: 64, marginBottom: 16 }}>📊</div>
            <h2 style={{ color: "#4ade80", margin: "0 0 12px" }}>导入 Excel</h2>
            <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.8 }}>
              上传包含分镜提示词的 Excel 文件<br />
              每行一个场景（10秒），自动解析时间轴<br />
              <span style={{ color: "#4ade80" }}>支持格式：.xlsx .xls</span>
            </p>
            <div style={{ marginTop: 16, padding: "12px 24px", background: "#4ade80", color: "#0f172a", borderRadius: 8, fontWeight: "bold", display: "inline-block" }}>
              {importing ? "导入中..." : "📁 选择文件上传"}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={importExcel}
              style={{ display: "none" }}
            />
          </div>

          {/* 手动创建 */}
          <div style={{
            flex: 1,
            background: "#1e293b",
            borderRadius: 16,
            padding: 32,
            textAlign: "center",
            border: "2px solid #334155",
            cursor: "pointer",
            transition: "border-color 0.2s",
          }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "#3b82f6")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "#334155")}
            onClick={createProject}
          >
            <div style={{ fontSize: 64, marginBottom: 16 }}>✏️</div>
            <h2 style={{ color: "#3b82f6", margin: "0 0 12px" }}>手动创建</h2>
            <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.8 }}>
              创建空项目，手动添加场景<br />
              逐个编辑提示词和时间<br />
              <span style={{ color: "#3b82f6" }}>适合从零开始设计</span>
            </p>
            <div style={{ marginTop: 16, padding: "12px 24px", background: "#3b82f6", color: "#fff", borderRadius: 8, fontWeight: "bold", display: "inline-block" }}>
              {loading ? "创建中..." : "🚀 创建空项目"}
            </div>
          </div>
        </div>

        {/* Excel格式说明 */}
        <div style={{ marginTop: 32, background: "#1e293b", borderRadius: 12, padding: 24 }}>
          <h3 style={{ color: "#fbbf24", margin: "0 0 16px" }}>📝 Excel 格式说明</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #334155" }}>
                <th style={{ padding: 8, textAlign: "left", color: "#94a3b8" }}>列名</th>
                <th style={{ padding: 8, textAlign: "left", color: "#94a3b8" }}>说明</th>
                <th style={{ padding: 8, textAlign: "left", color: "#94a3b8" }}>示例</th>
                <th style={{ padding: 8, textAlign: "left", color: "#94a3b8" }}>必填</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid #1e293b" }}>
                <td style={{ padding: 8, color: "#e2e8f0" }}>序号</td>
                <td style={{ padding: 8, color: "#94a3b8" }}>场景序号</td>
                <td style={{ padding: 8, color: "#64748b" }}>1, 2, 3...</td>
                <td style={{ padding: 8, color: "#94a3b8" }}>否</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #1e293b" }}>
                <td style={{ padding: 8, color: "#e2e8f0" }}>时间段</td>
                <td style={{ padding: 8, color: "#94a3b8" }}>起止时间</td>
                <td style={{ padding: 8, color: "#64748b" }}>0:00-0:10</td>
                <td style={{ padding: 8, color: "#94a3b8" }}>否（自动按10秒生成）</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #1e293b" }}>
                <td style={{ padding: 8, color: "#e2e8f0" }}>场景标题</td>
                <td style={{ padding: 8, color: "#94a3b8" }}>场景名称</td>
                <td style={{ padding: 8, color: "#64748b" }}>引子：时代之问</td>
                <td style={{ padding: 8, color: "#94a3b8" }}>否</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #1e293b" }}>
                <td style={{ padding: 8, color: "#4ade80" }}>提示词</td>
                <td style={{ padding: 8, color: "#94a3b8" }}>AI生成视频的描述</td>
                <td style={{ padding: 8, color: "#64748b" }}>电影质感，城市夜景...</td>
                <td style={{ padding: 8, color: "#4ade80" }}>✅ 是</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #1e293b" }}>
                <td style={{ padding: 8, color: "#e2e8f0" }}>反向提示词</td>
                <td style={{ padding: 8, color: "#94a3b8" }}>不想出现的内容</td>
                <td style={{ padding: 8, color: "#64748b" }}>模糊，低质量</td>
                <td style={{ padding: 8, color: "#94a3b8" }}>否</td>
              </tr>
              <tr>
                <td style={{ padding: 8, color: "#e2e8f0" }}>时长</td>
                <td style={{ padding: 8, color: "#94a3b8" }}>5或10秒</td>
                <td style={{ padding: 8, color: "#64748b" }}>10</td>
                <td style={{ padding: 8, color: "#94a3b8" }}>否（默认10秒）</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ========== 项目详情页 ==========
  const total = project.scenes.length;
  const done = project.scenes.filter(s => s.status === "done").length;
  const generating = project.scenes.filter(s => s.status === "generating").length;
  const failed = project.scenes.filter(s => s.status === "failed").length;

  return (
    <div className="container">
      <div className="header">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
          <span onClick={goHome} style={{ cursor: "pointer", fontSize: 24 }}>← </span>
          <h1>🎬 {project.name}</h1>
        </div>
        <p>总时长 {project.totalDuration} · {total} 个场景 · 每段10秒</p>
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
          <div className="stat">
            <div className="stat-value" style={{ color: "#ef4444" }}>{failed}</div>
            <div className="stat-label">失败</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-primary" onClick={generateAll} disabled={loading || generating > 0}>
            {loading ? "处理中..." : `🚀 一键生成全部 (${total - done})`}
          </button>
          <button className="btn btn-blue" onClick={refreshProject}>🔄 刷新</button>
        </div>
      </div>

      {/* 时间轴 */}
      <div className="timeline">
        {project.scenes
          .sort((a, b) => a.order - b.order)
          .map(scene => (
            <div key={scene.id} className={`scene-card ${scene.status}`}>
              <div className="scene-header">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="scene-time">{scene.timeStart} - {scene.timeEnd}</span>
                  <StatusTag status={scene.status} />
                  <span style={{ color: "#64748b", fontSize: 12 }}>#{scene.order}</span>
                </div>
                <button className="btn btn-danger btn-sm" onClick={() => removeScene(scene.id)}>🗑️</button>
              </div>

              {/* 标题 */}
              <input
                style={{ width: "100%", fontSize: 18, fontWeight: "bold", border: "none", background: "transparent", color: "#fff", padding: "4px 0", outline: "none", fontFamily: "inherit" }}
                defaultValue={scene.title}
                onBlur={e => updateSceneField(scene.id, "title", e.target.value)}
              />

              {/* 提示词 */}
              <div style={{ marginTop: 12 }}>
                <label style={{ fontSize: 13, color: "#4ade80" }}>✨ 提示词</label>
                <textarea
                  className="scene-prompt"
                  defaultValue={scene.prompt}
                  onBlur={e => updateSceneField(scene.id, "prompt", e.target.value)}
                />
              </div>

              {/* 反向提示词 */}
              <div style={{ marginTop: 8 }}>
                <label style={{ fontSize: 13, color: "#ef4444" }}>🚫 反向提示词</label>
                <textarea
                  className="scene-prompt"
                  style={{ minHeight: 36 }}
                  defaultValue={scene.negativePrompt}
                  onBlur={e => updateSceneField(scene.id, "negativePrompt", e.target.value)}
                />
              </div>

              {/* 元数据 */}
              <div className="scene-meta">
                <label>时长:</label>
                <select
                  defaultValue={scene.duration}
                  onChange={e => updateSceneField(scene.id, "duration", e.target.value)}
                >
                  <option value="5">5秒</option>
                  <option value="10">10秒</option>
                </select>
              </div>

              {/* 操作按钮 */}
              <div className="scene-actions">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => generateScene(scene.id)}
                  disabled={scene.status === "generating"}
                >
                  {scene.status === "generating" ? "⏳ 生成中..." : "🎬 生成视频"}
                </button>
                {scene.status === "generating" && (
                  <button className="btn btn-blue btn-sm" onClick={() => checkStatus(scene.id)}>🔍 查询</button>
                )}
                {scene.status === "failed" && (
                  <button className="btn btn-orange btn-sm" onClick={() => generateScene(scene.id)}>🔄 重试</button>
                )}
              </div>

              {/* 错误信息 */}
              {scene.errorMsg && (
                <div style={{ marginTop: 8, fontSize: 13, color: "#ef4444", background: "rgba(239,68,68,0.1)", padding: 8, borderRadius: 6 }}>
                  ❌ {scene.errorMsg}
                </div>
              )}

              {/* 视频预览 */}
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
        ➕ 添加新场景（10秒）
      </div>
    </div>
  );
}
