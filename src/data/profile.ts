export type ProjectItem = {
  title: string;
  description: string;
  href: string;
  tags: string[];
};

export type TimelineItem = {
  date: string;
  title: string;
  description: string;
};

export const profile = {
  siteName: '明心的像素工坊',
  name: '明心',
  handle: 'mixijixi',
  title: '前端开发者 / 像素玩家',
  description: '我喜欢把复杂的前端问题拆成清晰的模块，也喜欢用复古像素语言记录技术与生活。',
  status: '正在构建个人主页与小游戏合集',
  location: '中国 · 远程协作',
  email: '2189827829@qq.com',
  github: 'https://github.com/mixijixi',
  socialLinks: [
    { label: 'GitHub', href: 'https://github.com/mixijixi' }
  ],
  skills: [
    'Astro',
    'TypeScript',
    'JavaScript',
    'HTML / CSS',
    'Canvas',
    'GitHub Pages',
    '响应式设计'
  ],
  projects: [
    {
      title: '个人主页与技术博客',
      description: '使用 Astro 构建的静态个人主页，包含 Markdown 博客、像素风视觉和响应式布局。',
      href: '/blog/',
      tags: ['Astro', '静态站点']
    },
    {
      title: '经典街机小游戏合集',
      description: '六个原创实现的网页小游戏，使用 TypeScript、Canvas 和浏览器本地存储。',
      href: '/games/',
      tags: ['TypeScript', 'Canvas']
    }
  ] satisfies ProjectItem[],
  timeline: [
    {
      date: '现在',
      title: '记录与构建',
      description: '持续整理前端实践，并把灵感做成可以运行的小作品。'
    },
    {
      date: '下一步',
      title: '补齐真实资料',
      description: '替换占位头像、联系方式和项目经历，让首页更像真正的个人名片。'
    }
  ] satisfies TimelineItem[]
};
