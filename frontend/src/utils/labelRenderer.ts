/**
 * Label Renderer 智能标签渲染系统
 * 
 * 功能：为地图上的几何要素提供智能标签定位和渲染
 * - 计算最佳标签锚点（特别针对MultiPolygon如Polynesia）
 * - 防止标签重叠的碰撞检测
 * - 带白色光晕的文本渲染，确保可读性
 * - 支持缩放和平移变换
 * 
 * 使用场景：地图可视化中的标签系统
 */

import { calculateOptimalLabelAnchor } from './geometry';

export interface LabelInfo {
  text: string;
  subText?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  priority: number; // 用于碰撞检测优先级
}

export interface RenderOptions {
  fontSize: number;
  fontWeight: string;
  textColor: string;
  haloColor: string;
  haloWidth: number;
  padding: number;
  maxCollisionOffset: number;
  lineGap: number; // 主副标题之间的额外间距（像素）
}

const DEFAULT_OPTIONS: RenderOptions = {
  fontSize: 12,
  fontWeight: '600',
  textColor: '#1e293b',
  haloColor: '#ffffff',
  haloWidth: 3,
  padding: 8,
  maxCollisionOffset: 30,
  lineGap: 8
};

export class LabelRenderer {
  private placedLabels: LabelInfo[] = [];
  private ctx: CanvasRenderingContext2D;
  private options: RenderOptions;

  constructor(ctx: CanvasRenderingContext2D, options: Partial<RenderOptions> = {}) {
    this.ctx = ctx;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  // 清空已放置的标签
  reset(): void {
    this.placedLabels = [];
  }

  // 检查标签是否与已放置的标签碰撞
  private checkCollision(newLabel: LabelInfo): boolean {
    return this.placedLabels.some(existing => {
      return !(newLabel.x + newLabel.width < existing.x ||
               newLabel.x > existing.x + existing.width ||
               newLabel.y + newLabel.height < existing.y ||
               newLabel.y > existing.y + existing.height);
    });
  }

  // 寻找无碰撞的标签位置
  private findNonCollidingPosition(baseLabel: LabelInfo): LabelInfo | null {
    // 首先尝试原始位置
    if (!this.checkCollision(baseLabel)) {
      return baseLabel;
    }

    // 尝试向上和向下偏移
    const offsets = [10, 20, 30];
    for (const offset of offsets) {
      // 向上偏移
      const upLabel = { ...baseLabel, y: baseLabel.y - offset };
      if (!this.checkCollision(upLabel)) {
        return upLabel;
      }

      // 向下偏移
      const downLabel = { ...baseLabel, y: baseLabel.y + offset };
      if (!this.checkCollision(downLabel)) {
        return downLabel;
      }
    }

    // 如果仍有碰撞，返回null（不渲染此标签）
    return null;
  }

  // 测量文本尺寸
  private measureText(text: string, subText?: string): { width: number; height: number } {
    this.ctx.font = `${this.options.fontWeight} ${this.options.fontSize}px system-ui`;
    const mainMetrics = this.ctx.measureText(text);
    let width = mainMetrics.width;
    let height = this.options.fontSize;

    if (subText) {
      const subFontSize = Math.floor(this.options.fontSize * 0.8);
      this.ctx.font = `400 ${subFontSize}px system-ui`;
      const subMetrics = this.ctx.measureText(subText);
      width = Math.max(width, subMetrics.width);
      // 主文字高度 + 额外行距 + 子文字高度
      height += this.options.lineGap + subFontSize;
    }

    return {
      width: width + this.options.padding * 2,
      height: height + this.options.padding * 2
    };
  }

  // 渲染带光晕的文本
  private renderTextWithHalo(text: string, x: number, y: number, isSubText = false): void {
    const fontSize = isSubText ? Math.floor(this.options.fontSize * 0.8) : this.options.fontSize;
    const fontWeight = isSubText ? '400' : this.options.fontWeight;
    
    this.ctx.font = `${fontWeight} ${fontSize}px system-ui`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    // 绘制光晕（白色描边）
    this.ctx.strokeStyle = this.options.haloColor;
    this.ctx.lineWidth = this.options.haloWidth;
    this.ctx.strokeText(text, x, y);

    // 绘制文本
    this.ctx.fillStyle = this.options.textColor;
    this.ctx.fillText(text, x, y);
  }

  // 为几何要素渲染标签
  renderGeometryLabel(
    geometry: any,
    text: string,
    subText: string | undefined,
    canvasWidth: number,
    canvasHeight: number,
    priority = 1
  ): boolean {
    // 计算最佳标签锚点
    const anchor = calculateOptimalLabelAnchor(geometry);
    if (!anchor) return false;

    const [lat, lon] = anchor;

    // 转换为Canvas坐标（等矩形投影）
    const x = ((lon + 180) / 360) * canvasWidth;
    const y = ((90 - lat) / 180) * canvasHeight;

    // 检查是否在Canvas范围内
    if (x < 0 || x > canvasWidth || y < 0 || y > canvasHeight) {
      return false;
    }

    // 测量文本尺寸
    const dimensions = this.measureText(text, subText);

    // 创建标签信息
    const label: LabelInfo = {
      text,
      subText,
      x: x - dimensions.width / 2,
      y: y - dimensions.height / 2,
      width: dimensions.width,
      height: dimensions.height,
      priority
    };

    // 寻找无碰撞位置
    const finalLabel = this.findNonCollidingPosition(label);
    if (!finalLabel) return false;

    // 渲染标签
    const centerX = finalLabel.x + finalLabel.width / 2;
    let centerY = finalLabel.y + finalLabel.height / 2;

    // 渲染主文本
    this.renderTextWithHalo(text, centerX, centerY);

    // 渲染子文本（与主文本间距：lineGap + 子字号的一半，避免重叠）
    if (subText) {
      const subFontSize = Math.floor(this.options.fontSize * 0.8);
      const offset = this.options.lineGap + Math.ceil(subFontSize * 0.6) + Math.ceil(this.options.haloWidth / 2);
      centerY += offset;
      this.renderTextWithHalo(subText, centerY === centerY ? centerX : centerX, centerY, true);
    }

    // 记录已放置的标签
    this.placedLabels.push(finalLabel);
    return true;
  }

  // 为点坐标渲染标签（回退方案）
  renderPointLabel(
    lat: number,
    lon: number,
    text: string,
    subText: string | undefined,
    canvasWidth: number,
    canvasHeight: number,
    priority = 1
  ): boolean {
    // 转换为Canvas坐标
    const x = ((lon + 180) / 360) * canvasWidth;
    const y = ((90 - lat) / 180) * canvasHeight;

    // 检查是否在Canvas范围内
    if (x < 0 || x > canvasWidth || y < 0 || y > canvasHeight) {
      return false;
    }

    // 测量文本尺寸
    const dimensions = this.measureText(text, subText);

    // 创建标签信息
    const label: LabelInfo = {
      text,
      subText,
      x: x - dimensions.width / 2,
      y: y - dimensions.height / 2,
      width: dimensions.width,
      height: dimensions.height,
      priority
    };

    // 寻找无碰撞位置
    const finalLabel = this.findNonCollidingPosition(label);
    if (!finalLabel) return false;

    // 渲染标签
    const centerX = finalLabel.x + finalLabel.width / 2;
    let centerY = finalLabel.y + finalLabel.height / 2;

    // 渲染主文本
    this.renderTextWithHalo(text, centerX, centerY);

    // 渲染子文本（与主文本间距：lineGap + 子字号的一半，避免重叠）
    if (subText) {
      const subFontSize = Math.floor(this.options.fontSize * 0.8);
      const offset = this.options.lineGap + Math.ceil(subFontSize * 0.6) + Math.ceil(this.options.haloWidth / 2);
      centerY += offset;
      this.renderTextWithHalo(subText, centerY === centerY ? centerX : centerX, centerY, true);
    }

    // 记录已放置的标签
    this.placedLabels.push(finalLabel);
    return true;
  }

  // 获取已放置标签的统计信息
  getStats(): { totalLabels: number; placedLabels: number } {
    return {
      totalLabels: this.placedLabels.length,
      placedLabels: this.placedLabels.length
    };
  }
}
