
import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ConfettiService {
  private renderer: Renderer2;

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
  }

  launch(count: number = 50) {
    for (let i = 0; i < count; i++) {
      this.createParticle();
    }
  }

  private createParticle() {
    const particle = this.renderer.createElement('div');
    const size = Math.random() * 8 + 4;
    const colors = ['#4B5842', '#9D8BB1', '#EBE5D9', '#B45309', '#15803D'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const startLeft = Math.random() * 100;
    
    this.renderer.setStyle(particle, 'position', 'fixed');
    this.renderer.setStyle(particle, 'top', '-10px');
    this.renderer.setStyle(particle, 'left', `${startLeft}vw`);
    this.renderer.setStyle(particle, 'width', `${size}px`);
    this.renderer.setStyle(particle, 'height', `${size}px`);
    this.renderer.setStyle(particle, 'background-color', color);
    this.renderer.setStyle(particle, 'border-radius', '50%');
    this.renderer.setStyle(particle, 'z-index', '9999');
    this.renderer.setStyle(particle, 'pointer-events', 'none');

    // Animation vars
    const duration = Math.random() * 2000 + 1500;
    const sway = Math.random() * 100 - 50;
    
    // Web Animation API
    const animation = particle.animate([
      { transform: `translate(0, 0) rotate(0deg)`, opacity: 1 },
      { transform: `translate(${sway}px, 100vh) rotate(${Math.random() * 720}deg)`, opacity: 0 }
    ], {
      duration: duration,
      easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
    });

    document.body.appendChild(particle);

    animation.onfinish = () => {
      particle.remove();
    };
  }
}
