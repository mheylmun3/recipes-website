document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("fairy-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  let width = window.innerWidth;
  let height = window.innerHeight;
  let fireflies = [];

  const colors = [
    "255, 239, 176", // warm gold
    "255, 230, 199", // cream peach
    "244, 214, 236", // blush pink
    "230, 221, 255"  // pale lavender
  ];

  function resizeCanvas() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    initFireflies();
  }

  function random(min, max) {
    return Math.random() * (max - min) + min;
  }

  class Firefly {
    constructor() {
      this.reset(true);
    }

    reset(initial = false) {
      this.x = random(0, width);
      this.y = random(0, height);
      this.radius = random(1.2, 3.2);
      this.baseAlpha = random(0.18, 0.55);
      this.alpha = this.baseAlpha;
      this.color = colors[Math.floor(Math.random() * colors.length)];
      this.dx = random(-0.12, 0.12);
      this.dy = random(-0.08, 0.08);
      this.twinkleSpeed = random(0.008, 0.022);
      this.twinkleOffset = random(0, Math.PI * 2);
      this.glowSize = random(10, 24);
      if (!initial) {
        this.y = height + 20;
      }
    }

    update(time) {
      this.x += this.dx;
      this.y += this.dy;

      if (this.x < -20) this.x = width + 20;
      if (this.x > width + 20) this.x = -20;
      if (this.y < -20) this.y = height + 20;
      if (this.y > height + 20) this.y = -20;

      const twinkle = (Math.sin(time * this.twinkleSpeed + this.twinkleOffset) + 1) / 2;
      this.alpha = this.baseAlpha * (0.55 + twinkle * 0.95);
    }

    draw() {
      ctx.save();

      const glow = ctx.createRadialGradient(
        this.x, this.y, 0,
        this.x, this.y, this.glowSize
      );
      glow.addColorStop(0, `rgba(${this.color}, ${this.alpha})`);
      glow.addColorStop(0.28, `rgba(${this.color}, ${this.alpha * 0.45})`);
      glow.addColorStop(1, `rgba(${this.color}, 0)`);

      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.glowSize, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(${this.color}, ${Math.min(this.alpha + 0.2, 1)})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  function initFireflies() {
    fireflies = [];
    const count = Math.max(24, Math.floor((width * height) / 22000));

    for (let i = 0; i < count; i++) {
      fireflies.push(new Firefly());
    }
  }

  function animate(time = 0) {
    ctx.clearRect(0, 0, width, height);

    for (const firefly of fireflies) {
      firefly.update(time);
      firefly.draw();
    }

    requestAnimationFrame(animate);
  }

  resizeCanvas();
  animate();

  let resizeTimeout;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(resizeCanvas, 120);
  });
});