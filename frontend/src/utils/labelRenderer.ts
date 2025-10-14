/**
 * Label Renderer - Intelligent label rendering system
 * 
 * Purpose: Provide smart label positioning and rendering for map geometries
 * - Compute optimal label anchor (especially for MultiPolygon, e.g., Polynesia)
 * - Collision detection to prevent label overlaps
 * - Text rendering with white halo to ensure readability
 * - Supports zoom and pan transforms
 * 
 * Use case: Labeling system in map visualizations
 */

import { calculateOptimalLabelAnchor } from './geometry';

export interface LabelInfo {
  text: string;
  subText?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  priority: number; // Used for collision detection priority
}

export interface RenderOptions {
  fontSize: number;
  fontWeight: string;
  textColor: string;
  haloColor: string;
  haloWidth: number;
  padding: number;
  maxCollisionOffset: number;
  lineGap: number; // Extra spacing (px) between title and subtitle
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

  // Clear all placed labels
  reset(): void {
    this.placedLabels = [];
  }

  // Check if the new label collides with any placed label
  private checkCollision(newLabel: LabelInfo): boolean {
    return this.placedLabels.some(existing => {
      return !(newLabel.x + newLabel.width < existing.x ||
               newLabel.x > existing.x + existing.width ||
               newLabel.y + newLabel.height < existing.y ||
               newLabel.y > existing.y + existing.height);
    });
  }

  // Find a collision-free position for a label
  private findNonCollidingPosition(baseLabel: LabelInfo): LabelInfo | null {
    // Try original position first
    if (!this.checkCollision(baseLabel)) {
      return baseLabel;
    }

    // Try offsetting up and down
    const offsets = [10, 20, 30];
    for (const offset of offsets) {
      // Offset upward
      const upLabel = { ...baseLabel, y: baseLabel.y - offset };
      if (!this.checkCollision(upLabel)) {
        return upLabel;
      }

      // Offset downward
      const downLabel = { ...baseLabel, y: baseLabel.y + offset };
      if (!this.checkCollision(downLabel)) {
        return downLabel;
      }
    }

    // Still colliding — give up (do not render this label)
    return null;
  }

  // Measure text dimensions
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
      // Main text height + extra line gap + sub text height
      height += this.options.lineGap + subFontSize;
    }

    return {
      width: width + this.options.padding * 2,
      height: height + this.options.padding * 2
    };
  }

  // Render text with a halo (stroke) for readability
  private renderTextWithHalo(text: string, x: number, y: number, isSubText = false): void {
    const fontSize = isSubText ? Math.floor(this.options.fontSize * 0.8) : this.options.fontSize;
    const fontWeight = isSubText ? '400' : this.options.fontWeight;
    
    this.ctx.font = `${fontWeight} ${fontSize}px system-ui`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    // Halo (white stroke)
    this.ctx.strokeStyle = this.options.haloColor;
    this.ctx.lineWidth = this.options.haloWidth;
    this.ctx.strokeText(text, x, y);

    // Fill text
    this.ctx.fillStyle = this.options.textColor;
    this.ctx.fillText(text, x, y);
  }

  // Render a label for a geometry
  renderGeometryLabel(
    geometry: any,
    text: string,
    subText: string | undefined,
    canvasWidth: number,
    canvasHeight: number,
    priority = 1
  ): boolean {
    // Compute optimal label anchor
    const anchor = calculateOptimalLabelAnchor(geometry);
    if (!anchor) return false;

    const [lat, lon] = anchor;

    // Convert to canvas coordinates (equirectangular projection)
    const x = ((lon + 180) / 360) * canvasWidth;
    const y = ((90 - lat) / 180) * canvasHeight;

    // Check within canvas bounds
    if (x < 0 || x > canvasWidth || y < 0 || y > canvasHeight) {
      return false;
    }

    // Measure text
    const dimensions = this.measureText(text, subText);

    // Create label info
    const label: LabelInfo = {
      text,
      subText,
      x: x - dimensions.width / 2,
      y: y - dimensions.height / 2,
      width: dimensions.width,
      height: dimensions.height,
      priority
    };

    // Find non-colliding position
    const finalLabel = this.findNonCollidingPosition(label);
    if (!finalLabel) return false;

    // Render label
    const centerX = finalLabel.x + finalLabel.width / 2;
    let centerY = finalLabel.y + finalLabel.height / 2;

    // Render main text
    this.renderTextWithHalo(text, centerX, centerY);

    // Render subtitle (spacing: lineGap + half of sub font size, to avoid overlap)
    if (subText) {
      const subFontSize = Math.floor(this.options.fontSize * 0.8);
      const offset = this.options.lineGap + Math.ceil(subFontSize * 0.6) + Math.ceil(this.options.haloWidth / 2);
      centerY += offset;
      this.renderTextWithHalo(subText, centerX, centerY, true);
    }

    // Record placed label
    this.placedLabels.push(finalLabel);
    return true;
  }

  // Render a label for a point coordinate (fallback)
  renderPointLabel(
    lat: number,
    lon: number,
    text: string,
    subText: string | undefined,
    canvasWidth: number,
    canvasHeight: number,
    priority = 1
  ): boolean {
    // Convert to canvas coordinates
    const x = ((lon + 180) / 360) * canvasWidth;
    const y = ((90 - lat) / 180) * canvasHeight;

    // Check within canvas bounds
    if (x < 0 || x > canvasWidth || y < 0 || y > canvasHeight) {
      return false;
    }

    // Measure text
    const dimensions = this.measureText(text, subText);

    // Create label info
    const label: LabelInfo = {
      text,
      subText,
      x: x - dimensions.width / 2,
      y: y - dimensions.height / 2,
      width: dimensions.width,
      height: dimensions.height,
      priority
    };

    // Find non-colliding position
    const finalLabel = this.findNonCollidingPosition(label);
    if (!finalLabel) return false;

    // Render label
    const centerX = finalLabel.x + finalLabel.width / 2;
    let centerY = finalLabel.y + finalLabel.height / 2;

    // Render main text
    this.renderTextWithHalo(text, centerX, centerY);

    // Render subtitle (spacing: lineGap + half of sub font size, to avoid overlap)
    if (subText) {
      const subFontSize = Math.floor(this.options.fontSize * 0.8);
      const offset = this.options.lineGap + Math.ceil(subFontSize * 0.6) + Math.ceil(this.options.haloWidth / 2);
      centerY += offset;
      this.renderTextWithHalo(subText, centerX, centerY, true);
    }

    // Record placed label
    this.placedLabels.push(finalLabel);
    return true;
  }

  // Get statistics for placed labels
  getStats(): { totalLabels: number; placedLabels: number } {
    return {
      totalLabels: this.placedLabels.length,
      placedLabels: this.placedLabels.length
    };
  }
}
