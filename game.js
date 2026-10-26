
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const W = canvas.width;
const H = canvas.height;
const groundY = 365;

// ==============================
// 画像の読み込み
// ==============================

const runImages = [];

const backgroundImage = new Image();
backgroundImage.src = "images/hawaii-bg.png";

for (let i = 1; i <= 8; i++) {
    const img = new Image();

    img.onload = () => {
        console.log(`run${i}.png 読み込み成功`);
    };

    img.onerror = () => {
        console.error(`run${i}.png 読み込み失敗`);
    };

    img.src = `images/run${i}.png`;
    runImages.push(img);
}

// ==============================
// ゲームの状態
// ==============================

let started = false;
let jumpCount = 0;
let gameOver = false;
let frame = 0;

let score = 0;
let distance = 0;
let finalScore = 0;

let speed = 5;
let level = 1;

let flyingObstacles = [];
let flyingObstacleTimer = 180;

let coins = [];
let coinCount = 0;
let coinTimer = 80;

let starTimer = 0;
const STAR_DURATION = 60 * 10;

// 走るアニメーション
let runFrame = 0;
let runFrameTimer = 0;
const runFrameSpeed = 5;

// 背景スクロール
let backgroundOffset = 0;
let groundOffset = 0;

// ==============================
// プレイヤー
// ==============================

const runner = {
    x: 145,
    y: groundY - 86,
    width: 62,
    height: 86,
    vy: 0,
    grounded: true
};

// ==============================
// 足場・砂埃
// ==============================

let platforms = [];
let dustParticles = [];

// ==============================
// 足場を作る
// ==============================

function createPlatform(x, y, width) {
    return {
        x,
        y,
        width,
        height: 18,

        // 島の見た目を足場ごとに変える
        islandDepth: 22 + Math.random() * 17,
        islandSeed: Math.random() * 1000,
        islandColor: Math.floor(Math.random() * 3)
    };
}

// ==============================
// 足場を初期配置
// ==============================

function resetPlatforms() {
    platforms = [];

    // 最初の地面
    platforms.push(
        createPlatform(0, groundY, 600)
    );

    // 右側に浮かぶ島
    platforms.push(
        createPlatform(690, 330, 230)
    );

    platforms.push(
        createPlatform(1020, 285, 230)
    );
}

// ==============================
// 島の足場を描画
// ==============================

function drawIsland(p) {
    const x = p.x;
    const y = p.y;
    const w = p.width;
    const d = p.islandDepth;

    const grassColors = [
        "#55a84f",
        "#68b957",
        "#479b4c"
    ];

    const grass = grassColors[p.islandColor];

    // 島の土部分
    ctx.beginPath();
    ctx.moveTo(x + 4, y + 5);

    // 左側から下に向かって細くする
    ctx.bezierCurveTo(
        x + w * 0.12, y + d * 0.55,
        x + w * 0.22, y + d * 0.85,
        x + w * 0.36, y + d
    );

    // 島の下側
    ctx.bezierCurveTo(
        x + w * 0.52, y + d + 4,
        x + w * 0.67, y + d * 0.78,
        x + w * 0.77, y + d * 0.65
    );

    // 右側から上へ
    ctx.bezierCurveTo(
        x + w * 0.90, y + d * 0.48,
        x + w * 0.97, y + d * 0.25,
        x + w - 4, y + 5
    );

    ctx.closePath();

    const soilGradient = ctx.createLinearGradient(
        0, y, 0, y + d
    );

    soilGradient.addColorStop(0, "#b9854f");
    soilGradient.addColorStop(0.6, "#94603b");
    soilGradient.addColorStop(1, "#70462f");

    ctx.fillStyle = soilGradient;
    ctx.fill();

    // 土の輪郭
    ctx.strokeStyle = "#70462f";
    ctx.lineWidth = 2;
    ctx.stroke();

    // 島の草地
    // 上面は水平にして着地判定と合わせる
    ctx.fillStyle = grass;
    ctx.fillRect(x, y, w, 7);

    // 草の明るい縁
    ctx.fillStyle = "#91d76b";
    ctx.fillRect(x, y, w, 2);

    // 草の縁の濃い部分
    ctx.fillStyle = "#347b3d";
    ctx.fillRect(x, y + 6, w, 2);

    // 土の模様
    ctx.fillStyle = "#d0a16b";

    const markGap = 28;

    for (
        let mx = x + 15;
        mx < x + w - 12;
        mx += markGap
    ) {
        const offset =
            Math.sin((mx + p.islandSeed) * 0.08) * 3;

        ctx.fillRect(
            mx,
            y + 13 + offset,
            8,
            3
        );
    }

    // 島の下に小さな岩
    ctx.fillStyle = "#796653";

    ctx.beginPath();
    ctx.ellipse(
        x + w * 0.35,
        y + d * 0.78,
        7,
        4,
        -0.3,
        0,
        Math.PI * 2
    );
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(
        x + w * 0.70,
        y + d * 0.62,
        5,
        3,
        0.3,
        0,
        Math.PI * 2
    );
    ctx.fill();

    // 小さな草
    ctx.strokeStyle = "#367e3b";
    ctx.lineWidth = 2;

    const grassX = x + w * 0.72;

    ctx.beginPath();
    ctx.moveTo(grassX, y + 2);
    ctx.lineTo(grassX - 3, y - 3);
    ctx.moveTo(grassX, y + 2);
    ctx.lineTo(grassX + 3, y - 2);
    ctx.stroke();
}

// ==============================
// 足場を描画
// ==============================

function drawPlatforms() {
    for (const p of platforms) {

        // 幅の広い最初の地面
        if (p.width > 500) {
            ctx.fillStyle = "#b9854f";
            ctx.fillRect(
                p.x,
                p.y,
                p.width,
                p.height
            );

            ctx.fillStyle = "#4b9860";
            ctx.fillRect(
                p.x,
                p.y,
                p.width,
                7
            );

            ctx.fillStyle = "#91d76b";
            ctx.fillRect(
                p.x,
                p.y,
                p.width,
                2
            );

            continue;
        }

        // 浮かぶ島
        drawIsland(p);
    }
}

// ==============================
// キャラクター描画
// ==============================

function drawRunner() {
    const img = runImages[runFrame];

    // スター状態中は点滅
    if (
        starTimer > 0 &&
        Math.floor(frame / 5) % 2 === 0
    ) {
        ctx.globalAlpha = 0.4;
    } else {
        ctx.globalAlpha = 1;
    }

    if (img && img.complete && img.naturalWidth > 0) {
        ctx.drawImage(
            img,
            runner.x,
            runner.y,
            runner.width,
            runner.height
        );
    } else {
        ctx.fillStyle = "#ffcc66";
        ctx.fillRect(
            runner.x,
            runner.y,
            runner.width,
            runner.height
        );
    }

    ctx.globalAlpha = 1;
}

// ==============================
// 背景描画
// ==============================

function drawBackground() {
    if (
        !backgroundImage.complete ||
        backgroundImage.naturalWidth === 0
    ) {
        ctx.fillStyle = "#75c9f5";
        ctx.fillRect(0, 0, W, H);
        return;
    }

    const bgHeight = H;

    const bgWidth =
        backgroundImage.width *
        (bgHeight / backgroundImage.height);

    const offset = backgroundOffset % bgWidth;

    ctx.drawImage(
        backgroundImage,
        0, 0,
        backgroundImage.width,
        backgroundImage.height,
        -offset, 0,
        bgWidth, bgHeight
    );

    ctx.drawImage(
        backgroundImage,
        0, 0,
        backgroundImage.width,
        backgroundImage.height,
        bgWidth - offset, 0,
        bgWidth, bgHeight
    );
}

// ==============================
// コインを生成
// ==============================

function spawnCoin() {
    const candidates = platforms.filter(
        p => p.x + p.width > 100 &&
             p.x < W + 250
    );

    if (candidates.length === 0) return;

    const p = candidates[
        Math.floor(Math.random() * candidates.length)
    ];

    const minX = p.x + 15;
    const maxX = Math.max(
        minX,
        p.x + p.width - 15
    );

    coins.push({
        x: minX + Math.random() * (maxX - minX),
        y: p.y - 35 - Math.random() * 35,
        radius: 11
    });
}

// ==============================
// コイン描画
// ==============================

function drawCoins() {
    for (const c of coins) {
        ctx.fillStyle = "#d99116";
        ctx.beginPath();
        ctx.arc(
            c.x,
            c.y,
            c.radius + 2,
            0,
            Math.PI * 2
        );
        ctx.fill();

        ctx.fillStyle = "#ffd84d";
        ctx.beginPath();
        ctx.arc(
            c.x,
            c.y,
            c.radius - 1,
            0,
            Math.PI * 2
        );
        ctx.fill();

        ctx.fillStyle = "#fff1a3";
        ctx.fillRect(
            c.x - 2,
            c.y - 5,
            4,
            10
        );
    }
}

// ==============================
// コイン更新・取得判定
// ==============================

function updateCoins() {
    for (const c of coins) {
        c.x -= speed;
    }

    coinTimer--;

    if (coinTimer <= 0) {
        spawnCoin();
        coinTimer = 150 + Math.random() * 30;
    }

    const px = runner.x + 8;
    const py = runner.y + 8;
    const pw = runner.width - 16;
    const ph = runner.height - 12;

    for (let i = coins.length - 1; i >= 0; i--) {
        const c = coins[i];

        const hit =
            px < c.x + c.radius &&
            px + pw > c.x - c.radius &&
            py < c.y + c.radius &&
            py + ph > c.y - c.radius;

        if (hit) {
            coins.splice(i, 1);
            coinCount++;

            if (coinCount >= 10) {
                coinCount -= 10;
                starTimer = STAR_DURATION;
            }
        }
    }

    coins = coins.filter(
        c => c.x + c.radius > 0
    );

    if (starTimer > 0) {
        starTimer--;
    }
}

// ==============================
// 飛行障害物を生成
// ==============================

function spawnFlyingObstacle() {
    const y = 205 + Math.random() * 100;

    flyingObstacles.push({
        x: W + 30,
        y,
        width: 42,
        height: 28,
        phase: Math.random() * Math.PI * 2,
        falling: false,
        vy: 0
    });
}

// ==============================
// 飛行障害物を描画
// ==============================

function drawFlyingObstacles() {
    for (const o of flyingObstacles) {
        // 体
        ctx.fillStyle = "#3c4858";
        ctx.beginPath();
        ctx.ellipse(
            o.x + 21,
            o.y + 14,
            17,
            9,
            0,
            0,
            Math.PI * 2
        );
        ctx.fill();

        // 翼
        const wingY =
            Math.sin(frame * 0.35 + o.phase) * 7;

        ctx.fillStyle = "#596c82";
        ctx.beginPath();
        ctx.ellipse(
            o.x + 20,
            o.y + 8 + wingY,
            13,
            5,
            -0.2,
            0,
            Math.PI * 2
        );
        ctx.fill();

        // くちばし
        ctx.fillStyle = "#f2b84b";
        ctx.beginPath();
        ctx.moveTo(o.x + 35, o.y + 11);
        ctx.lineTo(o.x + 43, o.y + 14);
        ctx.lineTo(o.x + 35, o.y + 17);
        ctx.closePath();
        ctx.fill();
    }
}

// ==============================
// 飛行障害物との衝突判定
// ==============================

function checkFlyingCollision() {
    const px = runner.x + 8;
    const py = runner.y + 8;
    const pw = runner.width - 16;
    const ph = runner.height - 12;

    for (const o of flyingObstacles) {
        if (o.falling) continue;

        const hit =
            px < o.x + o.width &&
            px + pw > o.x &&
            py < o.y + o.height &&
            py + ph > o.y;

        if (hit) {
            if (starTimer > 0) {
                o.falling = true;
                o.vy = -4;
            } else {
                gameOver = true;
                finalScore = score + coinCount * 50;
            }

            return;
        }
    }
}

// ==============================
// 砂埃
// ==============================

function addDust() {
    if (!runner.grounded || frame % 3 !== 0) {
        return;
    }

    dustParticles.push({
        x: runner.x + 8 + Math.random() * 12,
        y: runner.y + runner.height - 2,
        vx: -1 - Math.random() * 2,
        vy: -Math.random() * 1.5,
        size: 3 + Math.random() * 5,
        life: 15 + Math.random() * 10
    });
}

function drawDust() {
    for (
        let i = dustParticles.length - 1;
        i >= 0;
        i--
    ) {
        const p = dustParticles[i];

        p.x += p.vx;
        p.y += p.vy;
        p.life--;

        ctx.globalAlpha = Math.max(
            0,
            p.life / 25
        );

        ctx.fillStyle = "#f3dfbd";

        ctx.beginPath();
        ctx.arc(
            p.x,
            p.y,
            p.size * (1 - p.life / 50),
            0,
            Math.PI * 2
        );
        ctx.fill();

        if (p.life <= 0) {
            dustParticles.splice(i, 1);
        }
    }

    ctx.globalAlpha = 1;
}

// ==============================
// 足場との衝突判定
// ==============================

function checkCollision(previousBottom) {
    runner.grounded = false;

    if (runner.vy >= 0) {
        for (const p of platforms) {
            const currentBottom =
                runner.y + runner.height;

            const overlapsX =
                runner.x + runner.width > p.x &&
                runner.x < p.x + p.width;

            const crossedTop =
                previousBottom <= p.y &&
                currentBottom >= p.y;

            if (overlapsX && crossedTop) {
                runner.y = p.y - runner.height;
                runner.vy = 0;
                runner.grounded = true;
                jumpCount = 0;
                return;
            }
        }
    }

    if (runner.y > H) {
        gameOver = true;
        finalScore = score + coinCount * 50;
    }
}

// ==============================
// スコア表示
// ==============================

function drawUI() {
    ctx.fillStyle = "#17324d";
    ctx.font = "bold 22px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`SCORE: ${score} m`, 20, 35);

    ctx.fillStyle = "#9a6500";
    ctx.font = "bold 18px sans-serif";
    ctx.fillText(`COINS: ${coinCount}/10`, 20, 65);

    if (starTimer > 0) {
        ctx.fillStyle = "#d99116";
        ctx.font = "bold 20px sans-serif";
        ctx.fillText(
            `STAR! ${Math.ceil(starTimer / 60)}s`,
            20,
            95
        );
    }
}

// ==============================
// メッセージ表示
// ==============================

function drawMessage(title, subtitle) {
    ctx.fillStyle = "rgba(15, 30, 50, 0.65)";
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 42px sans-serif";
    ctx.fillText(title, W / 2, H / 2 - 15);

    ctx.font = "18px sans-serif";
    ctx.fillText(subtitle, W / 2, H / 2 + 25);

    ctx.textAlign = "left";
}

// ==============================
// ゲームの更新
// ==============================

function update() {
    frame++;

    if (!started || gameOver) return;

    // 走るアニメーション
    runFrameTimer++;

    if (runFrameTimer >= runFrameSpeed) {
        runFrameTimer = 0;
        runFrame = (runFrame + 1) % runImages.length;
    }

    // スコアと難易度
    distance += speed / 60;
    score = Math.floor(distance);

    level = Math.min(
        1 + Math.floor(score / 100),
        8
    );

    speed = Math.min(
        5 + (level - 1) * 0.6,
        9
    );

    // 背景スクロール
    backgroundOffset += speed * 0.4;
    groundOffset += speed;

    // 足場を左へ移動
    for (const p of platforms) {
        p.x -= speed;
    }

    // 飛行障害物の出現
    flyingObstacleTimer--;

    if (flyingObstacleTimer <= 0) {
        spawnFlyingObstacle();

        flyingObstacleTimer =
            Math.max(65, 180 - level * 12) +
            Math.random() * 60;
    }

    // 飛行障害物を移動
    for (const o of flyingObstacles) {
        if (o.falling) {
            o.vy += 0.35;
            o.y += o.vy;
            o.x -= speed * 0.3;
        } else {
            o.x -= speed + 1.5;
        }
    }

    flyingObstacles = flyingObstacles.filter(
        o => o.x + o.width > 0 &&
             o.y < H + 100
    );

    // 画面外の足場を削除
    platforms = platforms.filter(
        p => p.x + p.width > -50
    );

    // 右側に新しい島を生成
    const last = platforms[platforms.length - 1];

    if (last && last.x + last.width < W + 150) {
        const difficulty = Math.min(level - 1, 6);

        const gap =
            65 + Math.random() * 45 + difficulty * 5;

        const width = Math.max(
            100,
            290 - difficulty * 25 +
            Math.random() * 60
        );

        const change = (Math.random() - 0.5) * 100;

        const y = Math.max(
            270,
            Math.min(groundY, last.y + change)
        );

        platforms.push(
            createPlatform(
                last.x + last.width + gap,
                y,
                width
            )
        );
    }

    // 重力と移動
    const previousBottom =
        runner.y + runner.height;

    runner.vy += 0.7;
    runner.y += runner.vy;

    // 島への着地判定
    checkCollision(previousBottom);

    // コイン
    updateCoins();

    // 飛行障害物との衝突
    checkFlyingCollision();

    // 砂埃
    addDust();
}

// ==============================
// ジャンプ
// ==============================

function jump() {
    if (gameOver) {
        resetGame();
        return;
    }

    if (!started) {
        started = true;
    }

    // 3回までジャンプ可能
    if (jumpCount < 3) {
        runner.vy = -12;
        runner.grounded = false;
        jumpCount++;
    }
}

// ==============================
// ゲームをリセット
// ==============================

function resetGame() {
    started = true;
    gameOver = false;
    frame = 0;

    score = 0;
    distance = 0;
    finalScore = 0;

    speed = 5;
    level = 1;

    flyingObstacles = [];
    flyingObstacleTimer = 180;

    coins = [];
    coinCount = 0;
    coinTimer = 80;
    starTimer = 0;

    runFrame = 0;
    runFrameTimer = 0;

    backgroundOffset = 0;
    groundOffset = 0;

    runner.y = groundY - runner.height;
    runner.vy = 0;
    runner.grounded = true;

    jumpCount = 0;

    resetPlatforms();
    dustParticles = [];
}

// ==============================
// キーボード操作
// ==============================

document.addEventListener("keydown", (event) => {
    if (
        event.code === "Space" ||
        event.code === "ArrowUp"
    ) {
        event.preventDefault();

        if (!event.repeat) {
            jump();
        }
    }
});

// ==============================
// クリック・タッチ操作
// ==============================

canvas.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    jump();
});

const jumpButton = document.getElementById("jumpButton");

if (jumpButton) {
    jumpButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        jump();
    });
}

const restartButton = document.getElementById("restartButton");

if (restartButton) {
    restartButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        resetGame();
    });
}

// ==============================
// メインループ
// ==============================

function draw() {
    update();

    drawBackground();
    drawPlatforms();
    drawFlyingObstacles();
    drawCoins();
    drawDust();
    drawRunner();
    drawUI();

    if (gameOver) {
        drawMessage(
            "GAME OVER",
            `距離 ${score} m`
        );

        ctx.textAlign = "center";
        ctx.fillStyle = "#ffd84d";
        ctx.font = "bold 24px sans-serif";

        ctx.fillText(
            `FINAL SCORE: ${finalScore}`,
            W / 2,
            H / 2 + 65
        );

        ctx.textAlign = "left";
    }

    requestAnimationFrame(draw);
}

console.log("ゲームのJavaScriptが動いています");
console.log("キャンバス:", canvas);
console.log("画像の枚数:", runImages.length);

resetPlatforms();
draw();
