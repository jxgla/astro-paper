export type SymbolPickerEntry = {
  symbol: string;
  label: {
    en: string;
    zh: string;
  };
};

export type SymbolPickerCategory = {
  id: string;
  icon: string;
  title: {
    en: string;
    zh: string;
  };
  hint: {
    en: string;
    zh: string;
  };
  items: SymbolPickerEntry[];
};

export const SYMBOL_PICKER_SOURCE = {
  label: "royswift2007/icon_share",
  href: "https://github.com/royswift2007/icon_share",
  note: {
    en: "Curated Unicode-only subset inspired by the public icon_share collection. This tool keeps only browsable characters and does not copy upstream site prose.",
    zh: "参考公开的 icon_share 做了 Unicode 精简整理，这里只保留可浏览复制的字符，不直接照搬原站文案。",
  },
} as const;

export const SYMBOL_PICKER_CATEGORIES: SymbolPickerCategory[] = [
  {
    id: "hearts",
    icon: "❤",
    title: {
      en: "Hearts",
      zh: "爱心符号",
    },
    hint: {
      en: "Love, affection, confessions, and soft vibes.",
      zh: "适合表白、撒娇、氛围感和偏软的语气。",
    },
    items: [
      { symbol: "❤", label: { en: "red heart", zh: "红心" } },
      { symbol: "♡", label: { en: "outline heart", zh: "空心爱心" } },
      { symbol: "♥", label: { en: "heart suit", zh: "扑克牌爱心" } },
      { symbol: "❥", label: { en: "winged heart", zh: "手写爱心" } },
      { symbol: "❣", label: { en: "heart exclamation", zh: "感叹爱心" } },
      { symbol: "💘", label: { en: "heart with arrow", zh: "丘比特爱心" } },
      { symbol: "💖", label: { en: "sparkling heart", zh: "闪亮爱心" } },
      { symbol: "🫶", label: { en: "heart hands", zh: "比心手势" } },
    ],
  },
  {
    id: "stars",
    icon: "★",
    title: {
      en: "Stars & sparkles",
      zh: "星星 / 闪光",
    },
    hint: {
      en: "Decorative stars, glow, and dreamy highlights.",
      zh: "适合标题装饰、发光感和梦幻气质。",
    },
    items: [
      { symbol: "★", label: { en: "black star", zh: "实心星" } },
      { symbol: "☆", label: { en: "white star", zh: "空心星" } },
      { symbol: "✦", label: { en: "sparkle star", zh: "星芒" } },
      { symbol: "✧", label: { en: "tiny sparkle", zh: "细闪" } },
      { symbol: "✨", label: { en: "sparkles", zh: "闪光" } },
      { symbol: "✪", label: { en: "circled star", zh: "圆圈星" } },
      { symbol: "✯", label: { en: "pinwheel star", zh: "装饰星" } },
      { symbol: "❂", label: { en: "sun star", zh: "花纹星" } },
    ],
  },
  {
    id: "checks",
    icon: "✓",
    title: {
      en: "Checks & marks",
      zh: "对错符号",
    },
    hint: {
      en: "Approval, checklists, mistakes, and status tags.",
      zh: "适合清单、通过状态、错误提醒和标注。",
    },
    items: [
      { symbol: "✓", label: { en: "check", zh: "对勾" } },
      { symbol: "✔", label: { en: "heavy check", zh: "粗对勾" } },
      { symbol: "✅", label: { en: "check button", zh: "选中按钮" } },
      { symbol: "✕", label: { en: "thin cross", zh: "细叉" } },
      { symbol: "✖", label: { en: "heavy cross", zh: "粗叉" } },
      { symbol: "❌", label: { en: "cross mark", zh: "红叉" } },
      { symbol: "☑", label: { en: "checked box", zh: "带勾方框" } },
      { symbol: "☒", label: { en: "crossed box", zh: "带叉方框" } },
    ],
  },
  {
    id: "arrows",
    icon: "➜",
    title: {
      en: "Arrows",
      zh: "箭头符号",
    },
    hint: {
      en: "Flow, navigation, emphasis, and progression.",
      zh: "适合流程图、强调方向和步骤推进。",
    },
    items: [
      { symbol: "→", label: { en: "right arrow", zh: "右箭头" } },
      { symbol: "←", label: { en: "left arrow", zh: "左箭头" } },
      { symbol: "↑", label: { en: "up arrow", zh: "上箭头" } },
      { symbol: "↓", label: { en: "down arrow", zh: "下箭头" } },
      { symbol: "↔", label: { en: "left-right arrow", zh: "左右箭头" } },
      { symbol: "↕", label: { en: "up-down arrow", zh: "上下箭头" } },
      { symbol: "➜", label: { en: "heavy right arrow", zh: "粗右箭头" } },
      { symbol: "➤", label: { en: "arrowhead", zh: "箭头尖" } },
    ],
  },
  {
    id: "shapes",
    icon: "◉",
    title: {
      en: "Circles & shapes",
      zh: "圆形 / 图形",
    },
    hint: {
      en: "Bullets, badges, geometry, and UI decoration.",
      zh: "适合项目符号、徽标感和几何装饰。",
    },
    items: [
      { symbol: "●", label: { en: "black circle", zh: "实心圆" } },
      { symbol: "○", label: { en: "white circle", zh: "空心圆" } },
      { symbol: "◎", label: { en: "bullseye", zh: "靶心圆" } },
      { symbol: "◉", label: { en: "fisheye", zh: "鱼眼圆" } },
      { symbol: "■", label: { en: "black square", zh: "实心方块" } },
      { symbol: "□", label: { en: "white square", zh: "空心方块" } },
      { symbol: "◆", label: { en: "black diamond", zh: "实心菱形" } },
      { symbol: "◇", label: { en: "white diamond", zh: "空心菱形" } },
    ],
  },
  {
    id: "zodiac",
    icon: "♈",
    title: {
      en: "Zodiac",
      zh: "星座符号",
    },
    hint: {
      en: "Classic zodiac signs for bios, cards, and profile flair.",
      zh: "适合简介、卡片和星座相关的小装饰。",
    },
    items: [
      { symbol: "♈", label: { en: "Aries", zh: "白羊座" } },
      { symbol: "♉", label: { en: "Taurus", zh: "金牛座" } },
      { symbol: "♊", label: { en: "Gemini", zh: "双子座" } },
      { symbol: "♋", label: { en: "Cancer", zh: "巨蟹座" } },
      { symbol: "♌", label: { en: "Leo", zh: "狮子座" } },
      { symbol: "♍", label: { en: "Virgo", zh: "处女座" } },
      { symbol: "♎", label: { en: "Libra", zh: "天秤座" } },
      { symbol: "♏", label: { en: "Scorpio", zh: "天蝎座" } },
      { symbol: "♐", label: { en: "Sagittarius", zh: "射手座" } },
      { symbol: "♑", label: { en: "Capricorn", zh: "摩羯座" } },
      { symbol: "♒", label: { en: "Aquarius", zh: "水瓶座" } },
      { symbol: "♓", label: { en: "Pisces", zh: "双鱼座" } },
    ],
  },
  {
    id: "weather",
    icon: "☀",
    title: {
      en: "Sky & weather",
      zh: "天空 / 天气",
    },
    hint: {
      en: "Sun, moon, cloud, storm, and quiet-night symbols.",
      zh: "适合天气、昼夜、晴雨和轻氛围表达。",
    },
    items: [
      { symbol: "☀", label: { en: "sun", zh: "太阳" } },
      { symbol: "☁", label: { en: "cloud", zh: "云" } },
      { symbol: "☂", label: { en: "umbrella", zh: "雨伞" } },
      { symbol: "☃", label: { en: "snowman", zh: "雪人" } },
      { symbol: "☄", label: { en: "comet", zh: "彗星" } },
      { symbol: "⛅", label: { en: "sun behind cloud", zh: "云后太阳" } },
      { symbol: "⚡", label: { en: "lightning", zh: "闪电" } },
      { symbol: "🌙", label: { en: "crescent moon", zh: "月亮" } },
    ],
  },
  {
    id: "music",
    icon: "♫",
    title: {
      en: "Music",
      zh: "音乐符号",
    },
    hint: {
      en: "Melody, playlists, rhythm, and listening mood.",
      zh: "适合歌曲分享、歌单标记和节奏感表达。",
    },
    items: [
      { symbol: "♪", label: { en: "eighth note", zh: "八分音符" } },
      { symbol: "♫", label: { en: "beamed notes", zh: "连音符" } },
      { symbol: "♬", label: { en: "beamed sixteenth notes", zh: "双连音符" } },
      { symbol: "♩", label: { en: "quarter note", zh: "四分音符" } },
      { symbol: "♭", label: { en: "flat", zh: "降记号" } },
      { symbol: "♮", label: { en: "natural", zh: "还原记号" } },
      { symbol: "♯", label: { en: "sharp", zh: "升记号" } },
      { symbol: "🎵", label: { en: "music note", zh: "音乐音符" } },
    ],
  },
  {
    id: "faces",
    icon: "😀",
    title: {
      en: "Common emoji",
      zh: "常用表情",
    },
    hint: {
      en: "Reaction faces for chat, captions, and quick mood shifts.",
      zh: "适合聊天、配文和快速表达情绪变化。",
    },
    items: [
      { symbol: "😀", label: { en: "grinning face", zh: "笑脸" } },
      { symbol: "😂", label: { en: "tears of joy", zh: "笑哭" } },
      { symbol: "🥹", label: { en: "teary eyes", zh: "含泪眼" } },
      { symbol: "🥺", label: { en: "pleading face", zh: "委屈脸" } },
      { symbol: "😎", label: { en: "cool face", zh: "墨镜脸" } },
      { symbol: "🤔", label: { en: "thinking face", zh: "思考脸" } },
      { symbol: "🫠", label: { en: "melting face", zh: "融化脸" } },
      { symbol: "🤡", label: { en: "clown face", zh: "小丑脸" } },
    ],
  },
  {
    id: "hands",
    icon: "🙌",
    title: {
      en: "Hands & gestures",
      zh: "人物与手势",
    },
    hint: {
      en: "Approval, thanks, celebration, and quick reactions.",
      zh: "适合点赞、感谢、庆祝和快速互动反馈。",
    },
    items: [
      { symbol: "👍", label: { en: "thumbs up", zh: "点赞" } },
      { symbol: "👎", label: { en: "thumbs down", zh: "踩" } },
      { symbol: "👌", label: { en: "OK hand", zh: "OK 手势" } },
      { symbol: "✌️", label: { en: "victory hand", zh: "胜利手势" } },
      { symbol: "🤞", label: { en: "crossed fingers", zh: "交叉手指" } },
      { symbol: "🙏", label: { en: "folded hands", zh: "双手合十" } },
      { symbol: "🙌", label: { en: "raising hands", zh: "举手庆祝" } },
      { symbol: "👏", label: { en: "clapping hands", zh: "鼓掌" } },
    ],
  },
  {
    id: "animals",
    icon: "🐲",
    title: {
      en: "Animals",
      zh: "生肖 / 动物",
    },
    hint: {
      en: "Zodiac animals, mascots, and playful profile accents.",
      zh: "适合生肖梗、吉祥物和偏 playful 的展示。",
    },
    items: [
      { symbol: "🐭", label: { en: "rat", zh: "鼠" } },
      { symbol: "🐯", label: { en: "tiger", zh: "虎" } },
      { symbol: "🐰", label: { en: "rabbit", zh: "兔" } },
      { symbol: "🐲", label: { en: "dragon", zh: "龙" } },
      { symbol: "🐍", label: { en: "snake", zh: "蛇" } },
      { symbol: "🐴", label: { en: "horse", zh: "马" } },
      { symbol: "🐵", label: { en: "monkey", zh: "猴" } },
      { symbol: "🐷", label: { en: "pig", zh: "猪" } },
    ],
  },
];
