const canvas = document.getElementById("hero-canvas");
const ctx = canvas.getContext("2d");

const points = [];
const palette = ["#f4c77a", "#7cc7c9", "#89a36b", "#ffffff"];
let pulse = 0;

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(canvas.offsetWidth * dpr);
  canvas.height = Math.floor(canvas.offsetHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function seedPoints() {
  points.length = 0;
  const count = Math.max(44, Math.floor(window.innerWidth / 22));
  for (let i = 0; i < count; i += 1) {
    points.push({
      x: Math.random() * canvas.offsetWidth,
      y: Math.random() * canvas.offsetHeight,
      vx: (Math.random() - 0.5) * 0.34,
      vy: (Math.random() - 0.5) * 0.34,
      r: 1.4 + Math.random() * 3.6,
      color: palette[i % palette.length],
    });
  }
}

function drawContours() {
  const width = canvas.offsetWidth;
  const height = canvas.offsetHeight;
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.lineWidth = 1;
  for (let i = 0; i < 10; i += 1) {
    ctx.beginPath();
    const y = height * (0.1 + i * 0.09);
    for (let x = -40; x <= width + 40; x += 24) {
      const wave = Math.sin(x * 0.012 + i * 0.8) * 22 + Math.cos(x * 0.006 + i) * 16;
      if (x === -40) ctx.moveTo(x, y + wave);
      else ctx.lineTo(x, y + wave);
    }
    ctx.strokeStyle = i % 2 ? "#f4c77a" : "#7cc7c9";
    ctx.stroke();
  }
  ctx.restore();
}

function drawNetwork() {
  ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
  drawContours();
  pulse += 0.008;

  for (const point of points) {
    point.x += point.vx;
    point.y += point.vy;

    if (point.x < -20) point.x = canvas.offsetWidth + 20;
    if (point.x > canvas.offsetWidth + 20) point.x = -20;
    if (point.y < -20) point.y = canvas.offsetHeight + 20;
    if (point.y > canvas.offsetHeight + 20) point.y = -20;
  }

  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      const a = points[i];
      const b = points[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 132) {
        ctx.globalAlpha = (132 - dist) / 500;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();

        if ((i + j) % 9 === 0) {
          const t = (Math.sin(pulse * 8 + i + j) + 1) / 2;
          ctx.globalAlpha = 0.38;
          ctx.fillStyle = "#f4c77a";
          ctx.beginPath();
          ctx.arc(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  for (const point of points) {
    ctx.globalAlpha = 0.68;
    ctx.fillStyle = point.color;
    ctx.beginPath();
    ctx.arc(point.x, point.y, point.r, 0, Math.PI * 2);
    ctx.fill();
  }

  requestAnimationFrame(drawNetwork);
}

window.addEventListener("resize", () => {
  resizeCanvas();
  seedPoints();
});

resizeCanvas();
seedPoints();
drawNetwork();
