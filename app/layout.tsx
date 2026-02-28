import './globals.css';

export const metadata = {
  title: '可灵AI视频工作室',
  description: '基于可灵AI的动画视频制作平台',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
