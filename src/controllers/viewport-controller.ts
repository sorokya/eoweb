import type { Client } from '@/client';
import { isMobile } from '@/utils';

export class ViewportController {
  private width = 800;
  private height = 600;
  private halfWidth = 400;
  private halfHeight = 300;
  private zoom = 1;
  private userOverride = false;
  private mobile = false;

  constructor(private client: Client) {
    let resizeRaf = 0;
    window.addEventListener('resize', () => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => this.resizeCanvases());
    });

    this.resizeCanvases();
  }

  setGameSize(w: number, h: number) {
    this.width = w;
    this.height = h;
    this.halfWidth = w >> 1;
    this.halfHeight = h >> 1;
  }

  getGameWidth() {
    return this.width;
  }

  getGameHeight() {
    return this.height;
  }

  getHalfGameWidth() {
    return this.halfWidth;
  }

  getHalfGameHeight() {
    return this.halfHeight;
  }

  isMobile() {
    return this.mobile;
  }

  setZoom(z: number) {
    this.zoom = z;
  }

  zoomReset() {
    this.userOverride = false;
    this.resizeCanvases();
  }

  zoomIn() {
    this.userOverride = true;
    this.setZoom(Math.min(4, this.zoom + 1));
    this.resizeCanvases();
  }

  zoomOut() {
    this.userOverride = true;
    this.setZoom(Math.max(1, this.zoom - 1));
    this.resizeCanvases();
  }

  resizeCanvases() {
    const viewportWidth = Math.max(
      document.documentElement.clientWidth || 0,
      window.innerWidth || 0,
    );
    const viewportHeight = Math.max(
      document.documentElement.clientHeight || 0,
      window.innerHeight || 0,
    );

    if (!this.userOverride) this.setZoom(viewportWidth >= 1280 ? 2 : 1);
    const w = Math.floor(viewportWidth / this.zoom);
    const h = Math.floor(viewportHeight / this.zoom);

    // Resize the PixiJS renderer canvas if it's been initialised
    if (this.client.app) {
      const canvas = this.client.app.renderer.canvas;
      canvas.style.width = `${w * this.zoom}px`;
      canvas.style.height = `${h * this.zoom}px`;
      this.client.app.renderer.resize(w, h);
    }

    this.setGameSize(w, h);
    this.mobile = isMobile();
  }
}
