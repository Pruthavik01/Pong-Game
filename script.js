const canvas = document.querySelector("#canvas");
const ctx = canvas.getContext("2d");

const rect = canvas.getBoundingClientRect();

let cw = rect.width;
let ch = rect.height;
let lives = 3;
let gameOver = false;

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
    coordY = e.clientY;
});

function vec2(x, y) {
    return { x: x, y: y };
}

function Ball(pos, velocity, radius) {
    this.pos = pos;
    this.velocity = velocity;
    this.radius = radius;

    this.update = function () {
        this.pos.x += this.velocity.x;
        this.pos.y += this.velocity.y;
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
        this.pos.y = coordY - 200;
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
    let dx = Math.abs(ball.pos.x - paddle.getCenter().x);
    let dy = Math.abs(ball.pos.y - paddle.getCenter().y);

    if (dx <= (ball.radius + paddle.getHalfWidth()) && dy <= (ball.radius + paddle.getHalfHeight())) {
        ball.velocity.x *= -1;

        if (ball.velocity.x > 0) {
            updateScore(paddle);

            if (paddle.score % 5 == 0) {
                // Normalize direction
                let dirX = ball.velocity.x > 0 ? 1 : -1;
                let dirY = ball.velocity.y > 0 ? 1 : -1;

                // Increase magnitude
                ball.velocity.x = dirX * (Math.abs(ball.velocity.x) + 2);
                ball.velocity.y = dirY * (Math.abs(ball.velocity.y) + 2);

                updateLevel(paddle);
            }

        }
    }

}

function player2Ai(ball, paddle) {
    // paddle.pos.y = ball.pos.y;
    paddle.velocity.y = Math.abs(ball.velocity.y)*2;
    if (ball.velocity.x > 0) {
        if (ball.pos.y > paddle.getCenter().y) {
            paddle.pos.y += paddle.velocity.y;

            if (paddle.pos.y + paddle.height > ch) {
                paddle.pos.y = ch - paddle.height;
            }

        }

        if (ball.pos.y < paddle.getCenter().y) {
            paddle.pos.y -= paddle.velocity.y;
            if (paddle.pos.y <= 0) {
                paddle.pos.y = 0;
            }
        }
    }
}

function resetBall() {
    ball.pos.x = 100;
    ball.pos.y = Math.random()*(ch-200) + 100;
    // keep the SAME velocity direction but reset speed if needed
    ball.velocity.x *= -1;
    ball.velocity.y *= -1;
}


const ball = new Ball(vec2(100, 100), vec2(5, 5), 7);
const paddle1 = new Paddle(vec2(0, 100), vec2(5, 5), 10, 110, "#3498DB");
const paddle2 = new Paddle(vec2(cw - 10, 220), vec2(10, 10), 10, 110, "#E74C3C");



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

    paddle1.update();
    paddleCollisionWithWall(paddle1);
    ballCollisionWithWalls(ball);
    ballPaddleCollision(ball, paddle1);
    player2Ai(ball, paddle2);
    ballPaddleCollision(ball, paddle2);
}

function gameDraw() {
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



