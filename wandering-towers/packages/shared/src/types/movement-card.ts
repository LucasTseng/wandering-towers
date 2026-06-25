import type { CardID } from './ids';
import type { MovementCardType } from '../enums/movement-card-type';

/**
 * 移动牌定义（模板层，V3 数据字典 §12.1）
 * - moveValueMode = FIXED：固定步数牌
 * - moveValueMode = DICE：骰子牌，maxRerolls 表示最多掷几次
 */
export interface MovementCardDefinition {
  templateId: string;
  type: MovementCardType;
  moveValueMode: 'FIXED' | 'DICE';
  fixedValue?: number;
  maxRerolls?: number;
}

/** 牌实例（V3 数据字典 §12.3）— 洗牌/抽牌/弃牌只操作实例 ID */
export interface MovementCardInstance {
  id: CardID;
  templateId: string;
}
