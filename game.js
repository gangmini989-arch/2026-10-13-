/**
 * 🔥 슈퍼 미니 사커 2026 - Super Mini Soccer
 * 순수 HTML5 Canvas + Web Audio API 기반 2D 아케이드 축구 게임
 */

// -------------------------------------------------------------
// 1. 사운드 시스템 (Web Audio API - 외부 파일 없이 100% 자체 합성)
// -------------------------------------------------------------
class SoundManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  // 공 차는 소리 (킥)
  playKick(power = 0.5) {
    if (!this.enabled || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140 + power * 80, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.12);

      gain.gain.setValueAtTime(0.6 * Math.min(1, power + 0.3), now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.13);
    } catch(e) {}
  }

  // 골대 강타 소리 (골대 팅~!)
  playPostHit() {
    if (!this.enabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      [520, 840, 1320].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.4 / (idx + 1), now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.46);
      });
    } catch(e) {}
  }

  // 심판 휘슬 소리 (삐이익-!)
  playWhistle(isGoal = false) {
    if (!this.enabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const count = isGoal ? 3 : 1;
      for (let i = 0; i < count; i++) {
        const startTime = now + i * 0.18;
        const dur = isGoal ? 0.14 : 0.3;

        [2400, 2750].forEach(f => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, startTime);
          osc.frequency.linearRampToValueAtTime(f + 80, startTime + dur);

          gain.gain.setValueAtTime(0.25, startTime);
          gain.gain.exponentialRampToValueAtTime(0.01, startTime + dur);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(startTime);
          osc.stop(startTime + dur + 0.02);
        });
      }
    } catch(e) {}
  }

  // 환호성 & 관중 함성 (골 터졌을 때)
  playCheer() {
    if (!this.enabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const bufferSize = this.ctx.sampleRate * 1.5;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.2;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(700, now);
      filter.Q.setValueAtTime(1.2, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.5, now + 0.25);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1.4);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(now);
      noise.stop(now + 1.5);
    } catch(e) {}
  }

  // 부스터 / 대시 바람 소리
  playDash() {
    if (!this.enabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.16);
    } catch(e) {}
  }
}

// -------------------------------------------------------------
// 2. 국가 팀 데이터베이스
// -------------------------------------------------------------
const TEAMS = {
  korea: {
    name: '대한민국',
    flag: '🇰🇷',
    primary: '#e11d48',    // 붉은 악마 레드
    secondary: '#1e3a8a',  // 블루
    number: '#ffffff'
  },
  brazil: {
    name: '브라질',
    flag: '🇧🇷',
    primary: '#facc15',    // 삼바 옐로우
    secondary: '#15803d',  // 그린
    number: '#1e3a8a'
  },
  argentina: {
    name: '아르헨티나',
    flag: '🇦🇷',
    primary: '#38bdf8',    // 하늘색
    secondary: '#f8fafc',  // 화이트
    number: '#0f172a'
  },
  france: {
    name: '프랑스',
    flag: '🇫🇷',
    primary: '#1d4ed8',    // 레블뢰 블루
    secondary: '#ef4444',  // 레드
    number: '#ffffff'
  },
  england: {
    name: '잉글랜드',
    flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    primary: '#f8fafc',    // 화이트
    secondary: '#1e293b',  // 네이비
    number: '#dc2626'
  }
};

// -------------------------------------------------------------
// 3. 파티클 시스템 (불꽃 슛, 잔디 파편, 승리 컨페티)
// -------------------------------------------------------------
class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  // 잔디 파편 생성
  addTurf(x, y, vx, vy) {
    for (let i = 0; i < 4; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 8,
        vx: -vx * 0.3 + (Math.random() - 0.5) * 2,
        vy: -vy * 0.3 + (Math.random() - 0.5) * 2,
        size: Math.random() * 3 + 2,
        color: Math.random() > 0.5 ? '#15803d' : '#84cc16',
        alpha: 1,
        decay: 0.04
      });
    }
  }

  // 슈퍼 슛 불꽃 잔상
  addFire(x, y) {
    for (let i = 0; i < 3; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        size: Math.random() * 7 + 4,
        color: ['#f97316', '#ef4444', '#fbbf24'][Math.floor(Math.random() * 3)],
        alpha: 0.9,
        decay: 0.06
      });
    }
  }

  // 골 축하 폭죽/컨페티
  addConfetti(w, h) {
    const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ffffff'];
    for (let i = 0; i < 90; i++) {
      this.particles.push({
        x: Math.random() * w,
        y: -10 - Math.random() * 100,
        vx: (Math.random() - 0.5) * 6,
        vy: Math.random() * 5 + 3,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2,
        decay: 0.007
      });
    }
  }

  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;
      if (p.rotation !== undefined) {
        p.rotation += p.rotSpeed;
      }
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    ctx.save();
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      if (p.rotation !== undefined) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  clear() {
    this.particles = [];
  }
}

// -------------------------------------------------------------
// 4. 축구공 물리 모델
// -------------------------------------------------------------
class Ball {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = 12;
    this.friction = 0.984;
    this.rotation = 0;
    this.lastKicker = null;
    this.superShot = false;
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.rotation = 0;
    this.lastKicker = null;
    this.superShot = false;
  }

  update(field, sound, particles) {
    // 이동 & 회전
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= this.friction;
    this.vy *= this.friction;

    const speed = Math.hypot(this.vx, this.vy);
    this.rotation += speed * 0.08;

    // 슈퍼 슛 이펙트
    if (this.superShot) {
      particles.addFire(this.x, this.y);
      if (speed < 7) {
        this.superShot = false;
      }
    }

    // 경기장 상하 외곽선 반사
    if (this.y - this.radius < field.top) {
      this.y = field.top + this.radius;
      this.vy = -this.vy * 0.75;
      sound.playKick(0.2);
    } else if (this.y + this.radius > field.bottom) {
      this.y = field.bottom - this.radius;
      this.vy = -this.vy * 0.75;
      sound.playKick(0.2);
    }

    // 좌우 골대 라인 및 골 판정 물리
    const inGoalYRange = (this.y >= field.goalTop && this.y <= field.goalBottom);

    // 좌측 (홈 골문)
    if (this.x - this.radius < field.left) {
      if (inGoalYRange) {
        // 골망 안쪽 진입 감속
        this.vx *= 0.85;
        this.vy *= 0.85;
        // 골망 뒤쪽 막힘
        if (this.x - this.radius < field.left - field.goalDepth) {
          this.x = field.left - field.goalDepth + this.radius;
          this.vx = 0;
        }
      } else {
        // 골대 바깥 벽 반사
        this.x = field.left + this.radius;
        this.vx = -this.vx * 0.75;
        sound.playKick(0.3);
      }
    }

    // 우측 (어웨이 골문)
    if (this.x + this.radius > field.right) {
      if (inGoalYRange) {
        // 골망 안쪽 진입 감속
        this.vx *= 0.85;
        this.vy *= 0.85;
        // 골망 뒤쪽 막힘
        if (this.x + this.radius > field.right + field.goalDepth) {
          this.x = field.right + field.goalDepth - this.radius;
          this.vx = 0;
        }
      } else {
        // 골대 바깥 벽 반사
        this.x = field.right - this.radius;
        this.vx = -this.vx * 0.75;
        sound.playKick(0.3);
      }
    }

    // 골대 기둥(포스트) 충돌 판정
    const posts = [
      { x: field.left, y: field.goalTop },
      { x: field.left, y: field.goalBottom },
      { x: field.right, y: field.goalTop },
      { x: field.right, y: field.goalBottom }
    ];

    for (const post of posts) {
      const dx = this.x - post.x;
      const dy = this.y - post.y;
      const dist = Math.hypot(dx, dy);
      const postRadius = 6;
      if (dist < this.radius + postRadius) {
        const nx = dx / (dist || 1);
        const ny = dy / (dist || 1);
        this.x = post.x + nx * (this.radius + postRadius);
        this.y = post.y + ny * (this.radius + postRadius);

        // 반사 속도 계산
        const dot = this.vx * nx + this.vy * ny;
        this.vx = (this.vx - 2 * dot * nx) * 0.85;
        this.vy = (this.vy - 2 * dot * ny) * 0.85;
        sound.playPostHit();
      }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // 그림자
    ctx.beginPath();
    ctx.ellipse(0, this.radius * 0.7, this.radius * 0.9, this.radius * 0.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fill();

    // 공 본체 (흰색)
    ctx.rotate(this.rotation);
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(-3, -3, 2, 0, 0, this.radius);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.7, '#e2e8f0');
    grad.addColorStop(1, '#94a3b8');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = '#334155';
    ctx.stroke();

    // 클래식 오각형/육각형 무늬 (회전 연출)
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.35, 0, Math.PI * 2);
    ctx.fill();

    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5;
      const px = Math.cos(angle) * (this.radius * 0.75);
      const py = Math.sin(angle) * (this.radius * 0.75);
      ctx.beginPath();
      ctx.arc(px, py, this.radius * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

// -------------------------------------------------------------
// 5. 선수(Player) & 골키퍼(GK) 객체 모델
// -------------------------------------------------------------
class Player {
  constructor(x, y, teamSide, teamData, isGK = false, isAI = false) {
    this.startX = x;
    this.startY = y;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = isGK ? 21 : 19;
    this.teamSide = teamSide; // 'home' (왼쪽->오른쪽 공격) or 'away'
    this.teamData = teamData;
    this.isGK = isGK;
    this.isAI = isAI;

    this.baseSpeed = isGK ? 3.8 : 4.4;
    this.stamina = 100;
    this.maxStamina = 100;
    this.isDashing = false;
    this.kickPower = 0;
    this.isChargingKick = false;
    this.faceAngle = teamSide === 'home' ? 0 : Math.PI;

    // AI 속성
    this.aiReactionTimer = 0;
    this.aiTargetY = y;
  }

  reset() {
    this.x = this.startX;
    this.y = this.startY;
    this.vx = 0;
    this.vy = 0;
    this.stamina = this.maxStamina;
    this.kickPower = 0;
    this.isChargingKick = false;
    this.faceAngle = this.teamSide === 'home' ? 0 : Math.PI;
  }

  update(field, ball, sound, particles, controls) {
    let moveX = 0;
    let moveY = 0;
    let sprint = false;
    let shoot = false;

    // 1) 컨트롤 입력 결정 (인간 vs AI)
    if (!this.isAI) {
      if (controls.up) moveY -= 1;
      if (controls.down) moveY += 1;
      if (controls.left) moveX -= 1;
      if (controls.right) moveX += 1;
      sprint = controls.sprint && this.stamina > 10;
      shoot = controls.shoot;
    } else {
      // AI 로직 실행
      const aiAction = this.updateAI(field, ball);
      moveX = aiAction.moveX;
      moveY = aiAction.moveY;
      sprint = aiAction.sprint && this.stamina > 15;
      shoot = aiAction.shoot;
    }

    // 2) 대시 & 스태미나 계산
    this.isDashing = sprint;
    let currentSpeed = this.baseSpeed;
    if (this.isDashing && (moveX !== 0 || moveY !== 0)) {
      currentSpeed *= 1.45;
      this.stamina = Math.max(0, this.stamina - 0.7);
      if (Math.random() < 0.3) {
        sound.playDash();
        particles.addTurf(this.x, this.y, moveX, moveY);
      }
    } else {
      this.stamina = Math.min(this.maxStamina, this.stamina + 0.35);
    }

    // 3) 이동 가속도 적용
    const len = Math.hypot(moveX, moveY);
    if (len > 0) {
      this.vx = (moveX / len) * currentSpeed;
      this.vy = (moveY / len) * currentSpeed;
      this.faceAngle = Math.atan2(moveY, moveX);
    } else {
      this.vx *= 0.65;
      this.vy *= 0.65;
    }

    this.x += this.vx;
    this.y += this.vy;

    // 4) 필드 및 활동 영역 제약
    this.constrainPosition(field);

    // 5) 슛 파워 충전 및 발사 처리
    this.handleShooting(ball, shoot, sound, particles);

    // 6) 공과의 물리적 접촉 및 드리블
    this.handleBallCollision(ball, sound);
  }

  constrainPosition(field) {
    if (this.isGK) {
      // 골키퍼 전용 페널티 박스 구역 제한
      const boxW = 120;
      if (this.teamSide === 'home') {
        this.x = Math.max(field.left + this.radius, Math.min(field.left + boxW, this.x));
      } else {
        this.x = Math.max(field.right - boxW, Math.min(field.right - this.radius, this.x));
      }
      this.y = Math.max(field.goalTop - 40, Math.min(field.goalBottom + 40, this.y));
    } else {
      // 일반 필드 플레이어 구역
      this.x = Math.max(field.left + this.radius, Math.min(field.right - this.radius, this.x));
      this.y = Math.max(field.top + this.radius, Math.min(field.bottom - this.radius, this.y));
    }
  }

  handleShooting(ball, shootInput, sound, particles) {
    const distToBall = Math.hypot(this.x - ball.x, this.y - ball.y);
    const canTouch = distToBall < this.radius + ball.radius + 14;

    if (shootInput) {
      this.isChargingKick = true;
      this.kickPower = Math.min(100, this.kickPower + 4.5);
    } else if (this.isChargingKick) {
      // 키를 뗐을 때 슛 방출!
      if (canTouch) {
        // 골대를 향하거나 플레이어가 바라보는 방향으로 슛
        let targetX = this.teamSide === 'home' ? 1050 : 0;
        let targetY = 325 + (Math.random() - 0.5) * 60; // 살짝 구석 조준

        let kickAngle = Math.atan2(targetY - this.y, targetX - this.x);
        // 이동 중이면 조작 방향도 가미
        if (Math.hypot(this.vx, this.vy) > 1) {
          kickAngle = this.faceAngle * 0.4 + kickAngle * 0.6;
        }

        const powerRatio = this.kickPower / 100;
        const shootSpeed = 10 + powerRatio * 16; // 최대 26 속도

        ball.vx = Math.cos(kickAngle) * shootSpeed;
        ball.vy = Math.sin(kickAngle) * shootSpeed;
        ball.lastKicker = this;

        if (powerRatio > 0.75) {
          ball.superShot = true;
          sound.playKick(1.0);
          particles.addFire(ball.x, ball.y);
        } else {
          sound.playKick(0.5 + powerRatio * 0.4);
        }
      }
      this.kickPower = 0;
      this.isChargingKick = false;
    }
  }

  handleBallCollision(ball, sound) {
    const dx = ball.x - this.x;
    const dy = ball.y - this.y;
    const dist = Math.hypot(dx, dy);
    const minDist = this.radius + ball.radius;

    if (dist < minDist) {
      // 겹침 해결
      const overlap = minDist - dist;
      const nx = dx / (dist || 1);
      const ny = dy / (dist || 1);

      ball.x += nx * overlap;
      ball.y += ny * overlap;

      // 드리블/밀어내기 탄성 충돌
      const pSpeed = Math.hypot(this.vx, this.vy);
      const pushForce = Math.max(3.5, pSpeed * 1.2);

      ball.vx = this.vx * 0.8 + nx * pushForce;
      ball.vy = this.vy * 0.8 + ny * pushForce;
      ball.lastKicker = this;

      if (pSpeed > 2) {
        sound.playKick(0.25);
      }
    }
  }

  // 인공지능 의사결정
  updateAI(field, ball) {
    let moveX = 0;
    let moveY = 0;
    let sprint = false;
    let shoot = false;

    if (this.isGK) {
      // [골키퍼 AI] 골대 중앙을 지키며 공의 Y축을 방어
      const targetY = Math.max(field.goalTop + 15, Math.min(field.goalBottom - 15, ball.y));
      const dy = targetY - this.y;
      if (Math.abs(dy) > 6) {
        moveY = Math.sign(dy);
      }

      // 공이 골문 바로 앞으로 오면 전진해서 펀칭/클리어!
      const isBallDangerous = this.teamSide === 'away' 
        ? (ball.x > field.right - 130) 
        : (ball.x < field.left + 130);

      if (isBallDangerous) {
        moveX = Math.sign(ball.x - this.x);
        sprint = true;
        const dist = Math.hypot(ball.x - this.x, ball.y - this.y);
        if (dist < 50) shoot = true; // 걷어내기
      }
    } else {
      // [필드 공격수 AI]
      const distToBall = Math.hypot(ball.x - this.x, ball.y - this.y);
      const goalX = this.teamSide === 'home' ? field.right : field.left;
      const goalY = (field.top + field.bottom) / 2;

      // 공 뒤쪽으로 돌아 들어가 슈팅 각도를 잡음
      let desiredX = ball.x;
      let desiredY = ball.y;

      if (this.teamSide === 'away') {
        // 왼쪽 골대로 슛을 넣어야 하므로 공의 오른쪽 뒤에 위치해야 함
        desiredX = ball.x + (ball.x > this.x ? 25 : -10);
      } else {
        desiredX = ball.x - (ball.x < this.x ? 25 : -10);
      }

      const dx = desiredX - this.x;
      const dy = desiredY - this.y;

      if (Math.abs(dx) > 10) moveX = Math.sign(dx);
      if (Math.abs(dy) > 10) moveY = Math.sign(dy);

      // 공과 가까우면 질주 & 슛 기회 탐색
      if (distToBall < 180) {
        sprint = true;
      }

      if (distToBall < 45) {
        // 골대와의 거리 및 각도에 따른 슈팅 시도
        const distToGoal = Math.hypot(goalX - this.x, goalY - this.y);
        if (distToGoal < 420 || Math.random() < 0.2) {
          shoot = true;
        }
      }
    }

    return { moveX, moveY, sprint, shoot };
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // 1) 그림자
    ctx.beginPath();
    ctx.ellipse(0, this.radius * 0.7, this.radius * 0.9, this.radius * 0.45, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fill();

    // 2) 발 / 신발 (이동 방향에 맞춰 가볍게 표현)
    const shoeDist = this.radius * 0.8;
    const legAngle1 = this.faceAngle + 0.55;
    const legAngle2 = this.faceAngle - 0.55;
    [legAngle1, legAngle2].forEach(ang => {
      const sx = Math.cos(ang) * shoeDist;
      const sy = Math.sin(ang) * shoeDist;
      ctx.beginPath();
      ctx.arc(sx, sy, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#1e293b';
      ctx.fill();
    });

    // 3) 선수 몸체 (유니폼 컬러)
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.isGK ? '#0284c7' : this.teamData.primary;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = this.isGK ? '#38bdf8' : this.teamData.secondary;
    ctx.stroke();

    // 4) 등번호 또는 텍스트
    ctx.fillStyle = this.teamData.number;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.isGK ? 'GK' : (this.teamSide === 'home' ? '7' : '10'), 0, 0);

    // 5) 시선 방향 인디케이터
    const eyeX = Math.cos(this.faceAngle) * (this.radius * 0.6);
    const eyeY = Math.sin(this.faceAngle) * (this.radius * 0.6);
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // 6) 슛 파워 충전 게이지 링
    if (this.isChargingKick && this.kickPower > 0) {
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 6, 0, (Math.PI * 2) * (this.kickPower / 100));
      ctx.lineWidth = 4;
      ctx.strokeStyle = this.kickPower > 70 ? '#ef4444' : '#facc15';
      ctx.stroke();
    }

    // 7) 스태미나 게이지 바 (머리 위)
    if (this.stamina < this.maxStamina) {
      const barW = 28;
      const barH = 4;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(-barW / 2, -this.radius - 10, barW, barH);
      ctx.fillStyle = this.stamina > 30 ? '#10b981' : '#ef4444';
      ctx.fillRect(-barW / 2, -this.radius - 10, barW * (this.stamina / this.maxStamina), barH);
    }

    ctx.restore();
  }
}

// -------------------------------------------------------------
// 6. 메인 게임 컨트롤러
// -------------------------------------------------------------
class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');

    // 필드 좌표 정의 (1050 x 650)
    this.field = {
      width: 1050,
      height: 650,
      top: 45,
      bottom: 605,
      left: 70,
      right: 980,
      goalDepth: 45,
      goalTop: 235,
      goalBottom: 415
    };

    this.sound = new SoundManager();
    this.particles = new ParticleSystem();
    this.ball = new Ball(525, 325);

    // 키 입력 버퍼
    this.keys = {};

    // 게임 설정 상태
    this.mode = '1p'; // '1p' or '2p'
    this.aiDiff = 'normal'; // 'easy', 'normal', 'hard'
    this.matchRule = '90'; // '90', '180', 'first3'
    this.homeTeamKey = 'korea';
    this.awayTeamKey = 'brazil';

    // 매치 진행 상태
    this.state = 'menu'; // 'menu', 'playing', 'goalPause', 'ended'
    this.scoreHome = 0;
    this.scoreAway = 0;
    this.timeLeft = 90;
    this.lastTime = 0;
    this.goalPauseTimer = 0;

    // 선수 배열
    this.players = [];

    this.initDOM();
    this.initControls();
    this.gameLoop = this.gameLoop.bind(this);
    requestAnimationFrame(this.gameLoop);
  }

  initDOM() {
    // 팀 선택 셀렉트 박스
    const homeSel = document.getElementById('home-team-select');
    const awaySel = document.getElementById('away-team-select');
    homeSel.addEventListener('change', (e) => this.homeTeamKey = e.target.value);
    awaySel.addEventListener('change', (e) => this.awayTeamKey = e.target.value);

    // 모드 선택 버튼
    document.querySelectorAll('#mode-selector .select-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('#mode-selector .select-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.mode = e.target.dataset.mode;
        document.getElementById('ai-diff-section').style.display = (this.mode === '1p') ? 'block' : 'none';
        document.getElementById('hint-2p').style.display = (this.mode === '2p') ? 'block' : 'none';
      });
    });

    // 난이도 선택 버튼
    document.querySelectorAll('#diff-selector .select-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('#diff-selector .select-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.aiDiff = e.target.dataset.diff;
      });
    });

    // 경기 규칙 버튼
    document.querySelectorAll('#rule-selector .select-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('#rule-selector .select-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.matchRule = e.target.dataset.time;
      });
    });

    // 시작 및 재시작 버튼
    document.getElementById('start-game-btn').addEventListener('click', () => {
      this.sound.init();
      this.startMatch();
    });

    document.getElementById('restart-game-btn').addEventListener('click', () => {
      this.startMatch();
    });

    document.getElementById('back-to-menu-btn').addEventListener('click', () => {
      document.getElementById('result-overlay').classList.add('hidden');
      document.getElementById('menu-overlay').classList.remove('hidden');
      this.state = 'menu';
    });

    // 사운드 토글
    const sndBtn = document.getElementById('sound-toggle-btn');
    sndBtn.addEventListener('click', () => {
      this.sound.init();
      const enabled = this.sound.toggle();
      sndBtn.textContent = enabled ? '🔊 사운드: 켜짐' : '🔇 사운드: 꺼짐';
    });
  }

  initControls() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      // 스페이스바 브라우저 스크롤 방지
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    // 모바일 터치 지원
    document.querySelectorAll('.dpad-btn, .act-btn').forEach(btn => {
      const code = btn.dataset.key;
      btn.addEventListener('touchstart', (e) => { e.preventDefault(); this.keys[code] = true; });
      btn.addEventListener('touchend', (e) => { e.preventDefault(); this.keys[code] = false; });
    });
  }

  startMatch() {
    // UI 업데이트
    document.getElementById('menu-overlay').classList.add('hidden');
    document.getElementById('result-overlay').classList.add('hidden');
    document.getElementById('goal-banner').classList.add('hidden');

    const homeTeam = TEAMS[this.homeTeamKey];
    const awayTeam = TEAMS[this.awayTeamKey];

    document.getElementById('name-home').textContent = homeTeam.name;
    document.getElementById('flag-home').textContent = homeTeam.flag;
    document.getElementById('name-away').textContent = awayTeam.name;
    document.getElementById('flag-away').textContent = awayTeam.flag;

    this.scoreHome = 0;
    this.scoreAway = 0;
    this.updateScoreboardUI();

    if (this.matchRule === 'first3') {
      this.timeLeft = 999;
      document.getElementById('match-timer').textContent = '3골 선취';
    } else {
      this.timeLeft = parseInt(this.matchRule, 10);
    }

    // 선수 생성 (각 팀당 필드 플레이어 1명 + 골키퍼 1명)
    const is2P = (this.mode === '2p');
    this.players = [
      // 홈팀 (1P)
      new Player(340, 325, 'home', homeTeam, false, false),
      new Player(105, 325, 'home', homeTeam, true, true), // 홈 골키퍼 (AI)
      // 원정팀 (2P 또는 AI)
      new Player(710, 325, 'away', awayTeam, false, !is2P),
      new Player(945, 325, 'away', awayTeam, true, true)  // 원정 골키퍼 (AI)
    ];

    // 난이도에 따른 원정 AI 조정
    if (!is2P) {
      const aiFieldPlayer = this.players[2];
      if (this.aiDiff === 'easy') {
        aiFieldPlayer.baseSpeed = 3.6;
      } else if (this.aiDiff === 'hard') {
        aiFieldPlayer.baseSpeed = 4.8;
      }
    }

    this.ball.reset(525, 325);
    this.state = 'playing';
    this.sound.playWhistle();
  }

  resetPositions() {
    this.players.forEach(p => p.reset());
    this.ball.reset(525, 325);
  }

  updateScoreboardUI() {
    document.getElementById('score-home').textContent = this.scoreHome;
    document.getElementById('score-away').textContent = this.scoreAway;
  }

  handleGoal(scoringTeam) {
    this.state = 'goalPause';
    this.goalPauseTimer = 2.2; // 2.2초 축하 연출

    if (scoringTeam === 'home') {
      this.scoreHome++;
      document.getElementById('goal-scorer-text').textContent = `${TEAMS[this.homeTeamKey].name} 환상적인 골! ⚽🔥`;
    } else {
      this.scoreAway++;
      document.getElementById('goal-scorer-text').textContent = `${TEAMS[this.awayTeamKey].name} 벼락같은 득점! ⚽⚡`;
    }

    this.updateScoreboardUI();
    this.sound.playWhistle(true);
    this.sound.playCheer();
    this.particles.addConfetti(this.canvas.width, this.canvas.height);

    const banner = document.getElementById('goal-banner');
    banner.classList.remove('hidden');

    // 승리 조건 체크 (3골 선취승)
    if (this.matchRule === 'first3') {
      if (this.scoreHome >= 3 || this.scoreAway >= 3) {
        setTimeout(() => this.endGame(), 2000);
      }
    }
  }

  endGame() {
    this.state = 'ended';
    this.sound.playWhistle(true);
    const resultOverlay = document.getElementById('result-overlay');
    const resultTitle = document.getElementById('result-title');
    const resultMsg = document.getElementById('result-message');
    document.getElementById('final-home-score').textContent = this.scoreHome;
    document.getElementById('final-away-score').textContent = this.scoreAway;

    if (this.scoreHome > this.scoreAway) {
      resultTitle.textContent = '🏆 대한민국 승리! 🏆';
      resultMsg.textContent = '눈부신 플레이로 승리의 트로피를 차지했습니다!';
      this.particles.addConfetti(this.canvas.width, this.canvas.height);
    } else if (this.scoreHome < this.scoreAway) {
      resultTitle.textContent = '😢 아쉬운 패배...';
      resultMsg.textContent = '다음 경기에서 복수전을 노려보세요! 원모어 찬스?!';
    } else {
      resultTitle.textContent = '🤝 무승부! 팽팽한 명승부!';
      resultMsg.textContent = '끝까지 손에 땀을 쥐게 한 승부였습니다!';
    }

    resultOverlay.classList.remove('hidden');
  }

  update(dt) {
    if (this.state === 'playing') {
      // 1) 타이머 진행
      if (this.matchRule !== 'first3') {
        this.timeLeft -= dt;
        if (this.timeLeft <= 0) {
          this.timeLeft = 0;
          this.endGame();
          return;
        }
        const min = Math.floor(this.timeLeft / 60).toString().padStart(2, '0');
        const sec = Math.floor(this.timeLeft % 60).toString().padStart(2, '0');
        document.getElementById('match-timer').textContent = `${min}:${sec}`;
      }

      // 2) 컨트롤 수집 (1P: WASD + Space + Shift)
      const p1Controls = {
        up: this.keys['KeyW'],
        down: this.keys['KeyS'],
        left: this.keys['KeyA'],
        right: this.keys['KeyD'],
        shoot: this.keys['Space'] || this.keys['KeyJ'],
        sprint: this.keys['ShiftLeft'] || this.keys['KeyK']
      };

      // 2P 컨트롤 (방향키 + Enter/Numpad0 + Ctrl)
      const p2Controls = {
        up: this.keys['ArrowUp'],
        down: this.keys['ArrowDown'],
        left: this.keys['ArrowLeft'],
        right: this.keys['ArrowRight'],
        shoot: this.keys['Enter'] || this.keys['Numpad0'] || this.keys['KeyL'],
        sprint: this.keys['ControlRight'] || this.keys['KeyP']
      };

      // 선수 업데이트
      this.players[0].update(this.field, this.ball, this.sound, this.particles, p1Controls);
      this.players[1].update(this.field, this.ball, this.sound, this.particles, {}); // 홈 GK
      this.players[2].update(this.field, this.ball, this.sound, this.particles, p2Controls);
      this.players[3].update(this.field, this.ball, this.sound, this.particles, {}); // 원정 GK

      // 선수들 간 충돌(몸싸움)
      for (let i = 0; i < this.players.length; i++) {
        for (let j = i + 1; j < this.players.length; j++) {
          const p1 = this.players[i];
          const p2 = this.players[j];
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const dist = Math.hypot(dx, dy);
          const minDist = p1.radius + p2.radius;
          if (dist < minDist && dist > 0) {
            const overlap = (minDist - dist) / 2;
            const nx = dx / dist;
            const ny = dy / dist;
            p1.x -= nx * overlap;
            p1.y -= ny * overlap;
            p2.x += nx * overlap;
            p2.y += ny * overlap;
          }
        }
      }

      // 공 업데이트
      this.ball.update(this.field, this.sound, this.particles);

      // 골 득점 여부 판정
      // 원정팀 골대(오른쪽) 안으로 공이 통과 -> 홈팀 득점!
      if (this.ball.x > this.field.right + 10 && (this.ball.y >= this.field.goalTop && this.ball.y <= this.field.goalBottom)) {
        this.handleGoal('home');
      }
      // 홈팀 골대(왼쪽) 안으로 공이 통과 -> 원정팀 득점!
      else if (this.ball.x < this.field.left - 10 && (this.ball.y >= this.field.goalTop && this.ball.y <= this.field.goalBottom)) {
        this.handleGoal('away');
      }
    } else if (this.state === 'goalPause') {
      // 골 세레머니 대기
      this.ball.update(this.field, this.sound, this.particles);
      this.goalPauseTimer -= dt;
      if (this.goalPauseTimer <= 0) {
        document.getElementById('goal-banner').classList.add('hidden');
        this.resetPositions();
        this.state = 'playing';
      }
    }

    this.particles.update();
  }

  drawField() {
    const ctx = this.ctx;
    const f = this.field;

    // 1) 잔디 바탕 & 줄무늬 패턴
    const stripeWidth = 65;
    for (let x = 0; x < this.canvas.width; x += stripeWidth) {
      ctx.fillStyle = (Math.floor(x / stripeWidth) % 2 === 0) ? '#2e7d32' : '#27672a';
      ctx.fillRect(x, 0, stripeWidth, this.canvas.height);
    }

    // 경기장 바깥 어두운 마진
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, this.canvas.width, f.top);
    ctx.fillRect(0, f.bottom, this.canvas.width, this.canvas.height - f.bottom);
    ctx.fillRect(0, 0, f.left, this.canvas.height);
    ctx.fillRect(f.right, 0, this.canvas.width - f.right, this.canvas.height);

    // 2) 피치 흰색 라인
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 3;

    // 외곽 테두리
    ctx.strokeRect(f.left, f.top, f.right - f.left, f.bottom - f.top);

    // 중앙선
    const midX = (f.left + f.right) / 2;
    const midY = (f.top + f.bottom) / 2;
    ctx.beginPath();
    ctx.moveTo(midX, f.top);
    ctx.lineTo(midX, f.bottom);
    ctx.stroke();

    // 중앙 원 및 센터 스팟
    ctx.beginPath();
    ctx.arc(midX, midY, 80, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(midX, midY, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // 페널티 박스 (홈 & 어웨이)
    const boxW = 140;
    const boxH = 260;
    const boxY = midY - boxH / 2;

    // 좌측 페널티 박스
    ctx.strokeRect(f.left, boxY, boxW, boxH);
    ctx.beginPath();
    ctx.arc(f.left + boxW * 0.75, midY, 40, -Math.PI * 0.35, Math.PI * 0.35);
    ctx.stroke();

    // 우측 페널티 박스
    ctx.strokeRect(f.right - boxW, boxY, boxW, boxH);
    ctx.beginPath();
    ctx.arc(f.right - boxW * 0.75, midY, 40, Math.PI * 0.65, Math.PI * 1.35);
    ctx.stroke();

    // 코너 아크 (4곳)
    const cornerR = 20;
    [[f.left, f.top, 0, Math.PI * 0.5],
     [f.right, f.top, Math.PI * 0.5, Math.PI],
     [f.right, f.bottom, Math.PI, Math.PI * 1.5],
     [f.left, f.bottom, Math.PI * 1.5, Math.PI * 2]
    ].forEach(([cx, cy, sAng, eAng]) => {
      ctx.beginPath();
      ctx.arc(cx, cy, cornerR, sAng, eAng);
      ctx.stroke();
    });

    // 3) 골대 및 골망 그리기
    this.drawGoal(f.left - f.goalDepth, f.goalTop, f.goalDepth, f.goalBottom - f.goalTop, 'left');
    this.drawGoal(f.right, f.goalTop, f.goalDepth, f.goalBottom - f.goalTop, 'right');
  }

  drawGoal(x, y, w, h, side) {
    const ctx = this.ctx;

    // 골망 격자
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(x, y, w, h);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    for (let gx = x; gx <= x + w; gx += 8) {
      ctx.beginPath();
      ctx.moveTo(gx, y);
      ctx.lineTo(gx, y + h);
      ctx.stroke();
    }
    for (let gy = y; gy <= y + h; gy += 8) {
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.lineTo(x + w, gy);
      ctx.stroke();
    }

    // 흰색 골대 포스트 (기둥)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.strokeRect(x, y, w, h);

    // 골대 기둥 끝 원형 캡
    ctx.fillStyle = '#ffffff';
    const postX = side === 'left' ? x + w : x;
    [y, y + h].forEach(py => {
      ctx.beginPath();
      ctx.arc(postX, py, 5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 1) 필드
    this.drawField();

    // 2) 파티클
    this.particles.draw(this.ctx);

    // 3) 선수들
    for (const player of this.players) {
      player.draw(this.ctx);
    }

    // 4) 축구공
    this.ball.draw(this.ctx);
  }

  gameLoop(timestamp) {
    if (!this.lastTime) this.lastTime = timestamp;
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    this.update(dt);
    this.render();

    requestAnimationFrame(this.gameLoop);
  }
}

// 창 로드 시 게임 초기화
window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
