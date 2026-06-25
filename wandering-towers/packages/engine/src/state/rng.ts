/**
 * 可种子化伪随机数生成器（用于回放可复现 / 服务端权威掷骰与洗牌）
 *
 * 采用 mulberry32：体积小、速度够、跨平台一致。
 * 所有引擎随机必须经此 Rng 接口，禁止直接用 Math.random()，
 * 否则回放无法复现（V3 后端协议 §23.2 方案 A：服务端掷骰）。
 */
export interface Rng {
  /** 返回 [0, 1) 区间浮点数 */
  next(): number;
  /** 返回 [min, max] 闭区间整数 */
  nextInt(min: number, max: number): number;
  /** 就地洗牌（Fisher–Yates），返回同数组引用 */
  shuffle<T>(arr: T[]): T[];
  /** 当前的种子/状态快照（用于回放记录） */
  readonly seed: number;
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  function next(): number {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function nextInt(min: number, max: number): number {
    if (max < min) {
      throw new Error(`nextInt: max(${max}) < min(${min})`);
    }
    return min + Math.floor(next() * (max - min + 1));
  }

  function shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      const tmp = arr[i]!;
      arr[i] = arr[j]!;
      arr[j] = tmp;
    }
    return arr;
  }

  return {
    next,
    nextInt,
    shuffle,
    get seed() {
      return seed;
    },
  };
}

/** 掷一颗六面骰，返回 1~6 */
export function rollDie(rng: Rng): number {
  return rng.nextInt(1, 6);
}
