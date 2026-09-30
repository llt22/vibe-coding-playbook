export type RawItem = {
  key: string;
  source: string;
  title: string;
  url: string;
  summary?: string;
  author?: string | null;
  published_at?: string | null;
  metrics?: Record<string, number>;
};

export type Collector = {
  name: string;
  intervalHours: number;
  /** 返回本次抓到的全部条目；任何一个请求失败都应抛错，让运行记录显示失败。 */
  collect: () => Promise<RawItem[]>;
};
