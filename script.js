const canvas = document.querySelector("#canvas");
const ctx = canvas.getContext("2d");

const rect = canvas.getBoundingClientRect();

// Flame trail
const trail = [];
const TRAIL_MAX = 12;   // how long the trail is

let cw = rect.width;
let ch = rect.height;
let lives = 3;
let gameOver = false;

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }


function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    // CSS pixel size

    canvas.width = cw * dpr;
    canvas.height = ch * dpr;


    // reset scale before re-scaling
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // scale drawing so 1 unit = 1 CSS pixel
    ctx.scale(dpr, dpr);
}

resizeCanvas();

window.addEventListener("resize", resizeCanvas);
let coordY = 0;
window.addEventListener("mousemove", function (e) {
    coordY = e.clientY - canvas.getBoundingClientRect().top;
});

function vec2(x, y) {
    return { x: x, y: y };
}

function Ball(pos, velocity, radius) {
    this.pos = pos;
    this.velocity = velocity;
    this.radius = radius;

    this.update = function () {
        const vx = this.velocity.x;
        const vy = this.velocity.y;
        const steps = Math.ceil(Math.hypot(vx, vy) / (this.radius));
        for (let i = 0; i < steps; i++) {
            this.pos.x += vx / steps;
            this.pos.y += vy / steps;
        }
    }

    this.draw = function () {
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }

}

function ballCollisionWithWalls(ball) {
    if (ball.pos.y + ball.radius >= ch) {
        ball.velocity.y *= -1;
        ball.pos.y = ch - ball.radius;
    }

    if (ball.pos.y - ball.radius <= 0) {
        ball.velocity.y *= -1;
        ball.pos.y = ball.radius;
    }
}

function paddleCollisionWithWall(paddle) {
    if (paddle.pos.y <= 0) {
        paddle.pos.y = 0;
    }
    if (paddle.pos.y + paddle.height >= ch) {
        paddle.pos.y = ch - paddle.height;
    }
}

function Paddle(pos, velocity, width, height, color) {
    this.pos = pos;
    this.velocity = velocity;
    this.width = width;
    this.height = height;
    this.color = color;
    this.score = 0;
    this.level = 1;

    this.update = function () {
        // center the paddle on mouse Y and clamp inside canvas
        this.pos.y = coordY - this.height / 2;
        if (this.pos.y < 0) this.pos.y = 0;
        if (this.pos.y + this.height > ch) this.pos.y = ch - this.height;
    }

    this.draw = function () {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.pos.x, this.pos.y, this.width, this.height);
    }


    this.getHalfWidth = function () {
        return this.width / 2;
    }
    this.getHalfHeight = function () {
        return this.height / 2;
    }
    this.getCenter = function () {
        return vec2(
            this.pos.x + this.getHalfWidth(),
            this.pos.y + this.getHalfHeight()
        );
    }
}

function updateScore(paddle) {
    paddle.score += 1;
    document.getElementById("score").innerHTML = paddle.score;

}

function updateLevel(paddle) {
    paddle.level += 1;
    document.getElementById("level").innerHTML = paddle.level;

}

function ballPaddleCollision(ball, paddle) {
    const nearestX = clamp(ball.pos.x, paddle.pos.x, paddle.pos.x + paddle.width);
    const nearestY = clamp(ball.pos.y, paddle.pos.y, paddle.pos.y + paddle.height);

    const dx = ball.pos.x - nearestX;
    const dy = ball.pos.y - nearestY;
    const dist2 = dx * dx + dy * dy;
    const r2 = ball.radius * ball.radius;

    const isColliding = dist2 <= r2;

    if (isColliding) {
        if (ball.lastHit === paddle) return;
        ball.lastHit = paddle;

        const paddleOnLeft = paddle.pos.x < cw / 2;

        const relativeY = (ball.pos.y - (paddle.pos.y + paddle.height / 2)) / (paddle.height / 2);
        const maxBounce = Math.PI / 3;
        const bounceAngle = clamp(relativeY, -1, 1) * maxBounce;

        const speed = Math.hypot(ball.velocity.x, ball.velocity.y) || 5;
        const dirX = paddleOnLeft ? 1 : -1;

        ball.velocity.x = dirX * Math.cos(bounceAngle) * speed;
        ball.velocity.y = Math.sin(bounceAngle) * speed;

        if (paddleOnLeft) {
            ball.pos.x = paddle.pos.x + paddle.width + ball.radius + 0.5;
        } else {
            ball.pos.x = paddle.pos.x - ball.radius - 0.5;
        }

        // SCORE ONLY FOR PADDLE 1
        if (paddle === paddle1) {
            updateScore(paddle);

            if (paddle.score % 5 === 0) {
                const signX = ball.velocity.x > 0 ? 1 : -1;
                const signY = ball.velocity.y > 0 ? 1 : -1;

                ball.velocity.x = signX * (Math.abs(ball.velocity.x) + 2);
                ball.velocity.y = signY * (Math.abs(ball.velocity.y) + 2);

                updateLevel(paddle);
            }
        }

    } else {
        if (ball.lastHit === paddle) {
            ball.lastHit = null;
        }
    }
}


// Predict where the ball will cross targetX and how many frames it will take.
// Returns { y: predictedY, steps: frames }.
function predictBallHit(ball, targetX, maxSteps = 5000) {
    // clone state
    let simX = ball.pos.x;
    let simY = ball.pos.y;
    let velX = ball.velocity.x;
    let velY = ball.velocity.y;

    // If velocity is zero on x, just return current y quickly
    if (velX === 0) return { y: simY, steps: 1 };

    // decide direction of crossing relative to start
    const wantToTheRight = targetX >= simX;

    for (let step = 0; step < maxSteps; step++) {
        simX += velX;
        simY += velY;

        // bounce top
        if (simY - ball.radius <= 0) {
            simY = ball.radius;
            velY *= -1;
        }
        // bounce bottom (ch is your CSS canvas height)
        if (simY + ball.radius >= ch) {
            simY = ch - ball.radius;
            velY *= -1;
        }

        // Have we crossed targetX? Handle both directions.
        if ((wantToTheRight && simX >= targetX) || (!wantToTheRight && simX <= targetX)) {
            return { y: simY, steps: step + 1 };
        }
    }

    // fallback: return current Y if we didn't reach in maxSteps
    return { y: simY, steps: maxSteps };
}

// Predictive AI - near-impossible to miss when tuned.
// Replace your current player2Ai with this.
function player2Ai(ball, paddle) {
    // targetX: the X coordinate where we want to intercept the ball.
    // use a small offset so the ball doesn't overlap the paddle when detected
    const interceptX = paddle.pos.x - 1 - ball.radius;

    // Get prediction
    const pred = predictBallHit(ball, interceptX, 2000); // 2000 steps max (tunable)
    const predictedY = pred.y;
    const steps = Math.max(1, pred.steps); // avoid div by zero

    // Where should paddle center be to catch predictedY?
    const targetY = predictedY - paddle.height / 2;

    // Compute required speed (pixels per frame) to reach target in time
    const distance = targetY - paddle.pos.y;
    const requiredSpeed = Math.abs(distance) / steps;

    // Tuning: give some margin and clamp speed to reasonable range
    const marginFactor = 1.15;            // slight speed boost to ensure arrival
    const minSpeed = 3;                   // don't be too slow
    const maxSpeed = 30;                  // safety cap so it won't teleport
    const speed = Math.min(maxSpeed, Math.max(minSpeed, requiredSpeed * marginFactor));

    // Move smoothly towards the target, but not faster than `speed` per frame
    const dy = targetY - paddle.pos.y;
    if (Math.abs(dy) > speed) {
        paddle.pos.y += Math.sign(dy) * speed;
    } else {
        paddle.pos.y = targetY;
    }

    // Clamp inside CSS canvas height (ch)
    if (paddle.pos.y < 0) paddle.pos.y = 0;
    if (paddle.pos.y + paddle.height > ch) paddle.pos.y = ch - paddle.height;
}



function resetBall() {
    ball.pos.x = 100;
    ball.pos.y = Math.random() * 10 + 100;
    // keep the SAME velocity direction but reset speed if needed
    ball.velocity.x *= -1;
    ball.velocity.y *= -1;
    trail.length = 0;
}

function drawTrail() {
    ctx.save();
    ctx.globalCompositeOperation = "lighter"; // additive glow

    for (let i = 0; i < trail.length; i++) {
        const p = trail[i];
        const t = i / TRAIL_MAX;     // 0 = newest, 1 = oldest
        const size = ball.radius * (1 - t * 0.9);
        const alpha = 1 - t;

        // white fading flame
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;

        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}


const ball = new Ball(vec2(100, 100), vec2(5, 5), 9);
const paddle1 = new Paddle(vec2(5, 100), vec2(10, 10), cw * 0.02, ch * 0.2, "#3498DB");
const paddle2 = new Paddle(vec2(cw * 0.97, 220), vec2(10, 10), cw * 0.02, ch * 0.2, "#E74C3C");



function gameUpdate() {
    ball.update();
    // Ball goes out on left (paddle1 missed)
    if (ball.pos.x - ball.radius <= 0) {
        lives--;

        if (lives <= 0) {
            gameOver = true;
        } else {
            resetBall();
        }
    }

    // Ball goes out on RIGHT (paddle2 AI misses)
    if (ball.pos.x + ball.radius >= cw) {
        resetBall();
    }

    // add a new trail sample (place right after ball.update())
    // Add new flame trail point
    trail.unshift({ x: ball.pos.x, y: ball.pos.y });
    if (trail.length > TRAIL_MAX) trail.pop();



    paddle1.update();
    paddleCollisionWithWall(paddle1);
    ballCollisionWithWalls(ball);
    ballPaddleCollision(ball, paddle1);
    player2Ai(ball, paddle2);
    // player2Ai(ball, paddle1);
    ballPaddleCollision(ball, paddle2);
}

function gameDraw() {
    drawTrail();
    ball.draw();
    paddle1.draw();
    paddle2.draw();
}


function gameLoop() {
    ctx.clearRect(0, 0, cw, ch);

    if (gameOver) {
        ctx.fillStyle = "#fff";
        ctx.font = "40px Arial";
        ctx.fillText("GAME OVER", cw / 2 - 120, ch / 2);
        return; // stop the loop
    }

    requestAnimationFrame(gameLoop);
    gameUpdate();
    gameDraw();
}

gameLoop();






sound.addEventListener("click", () => {
    sound.classList.toggle("fa-volume-high")
    sound.classList.toggle("fa-volume-xmark")
});



