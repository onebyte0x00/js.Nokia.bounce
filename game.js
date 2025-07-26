const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const livesElement = document.getElementById('lives');
const levelElement = document.getElementById('level');
const startBtn = document.getElementById('start-btn');

// Game settings
const ballRadius = 15;
const gravity = 0.4;
const friction = 0.99;
const terrainSegments = 20;
const segmentWidth = canvas.width / terrainSegments;

// Game variables
let score = 0;
let lives = 3;
let level = 1;
let gameRunning = false;
let gameLoop;
let leftPressed = false;
let rightPressed = false;
let upPressed = false;

// Game objects
let ball = {
    x: 50,
    y: 100,
    radius: ballRadius,
    dx: 0,
    dy: 0,
    onGround: false
};

let terrain = [];
let gems = [];
let spikes = [];
let enemies = [];
let cameraOffset = 0;

// Initialize terrain
function initTerrain() {
    terrain = [];
    for (let i = 0; i < terrainSegments + 2; i++) {
        // Create wavy terrain
        const heightVariation = Math.sin(i * 0.5) * 30;
        terrain.push({
            x: (i - 1) * segmentWidth,
            y: canvas.height - 100 + heightVariation
        });
    }
}

// Initialize collectibles and obstacles
function initLevel() {
    gems = [];
    spikes = [];
    enemies = [];
    
    // Add gems
    for (let i = 0; i < 5 + level * 2; i++) {
        gems.push({
            x: Math.random() * (canvas.width * 2),
            y: canvas.height - 150 - Math.random() * 200,
            radius: 8,
            collected: false
        });
    }
    
    // Add spikes
    for (let i = 0; i < 3 + level; i++) {
        spikes.push({
            x: Math.random() * (canvas.width * 2),
            y: canvas.height - 80,
            width: 20,
            height: 20
        });
    }
    
    // Add enemies
    for (let i = 0; i < level; i++) {
        enemies.push({
            x: Math.random() * (canvas.width * 2),
            y: canvas.height - 120,
            width: 25,
            height: 25,
            dx: 1 + Math.random() * 1,
            direction: Math.random() > 0.5 ? 1 : -1
        });
    }
}

// Draw terrain
function drawTerrain() {
    ctx.beginPath();
    ctx.moveTo(terrain[0].x - cameraOffset, terrain[0].y);
    
    for (let i = 1; i < terrain.length; i++) {
        ctx.lineTo(terrain[i].x - cameraOffset, terrain[i].y);
    }
    
    ctx.lineTo(canvas.width, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.closePath();
    ctx.fillStyle = '#4CAF50';
    ctx.fill();
}

// Draw ball
function drawBall() {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#FF5722';
    ctx.fill();
    ctx.closePath();
}

// Draw gems
function drawGems() {
    gems.forEach(gem => {
        if (!gem.collected) {
            ctx.beginPath();
            ctx.arc(gem.x - cameraOffset, gem.y, gem.radius, 0, Math.PI * 2);
            ctx.fillStyle = '#FFD700';
            ctx.fill();
            ctx.closePath();
        }
    });
}

// Draw spikes
function drawSpikes() {
    spikes.forEach(spike => {
        ctx.beginPath();
        ctx.moveTo(spike.x - cameraOffset, spike.y);
        ctx.lineTo(spike.x - cameraOffset + spike.width/2, spike.y - spike.height);
        ctx.lineTo(spike.x - cameraOffset + spike.width, spike.y);
        ctx.closePath();
        ctx.fillStyle = '#333';
        ctx.fill();
    });
}

// Draw enemies
function drawEnemies() {
    enemies.forEach(enemy => {
        ctx.fillStyle = '#9C27B0';
        ctx.fillRect(enemy.x - cameraOffset, enemy.y - enemy.height, enemy.width, enemy.height);
        
        // Eyes
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(
            enemy.x - cameraOffset + (enemy.direction > 0 ? 7 : enemy.width - 7), 
            enemy.y - enemy.height + 7, 
            3, 0, Math.PI * 2
        );
        ctx.fill();
    });
}

// Update game info display
function updateGameInfo() {
    scoreElement.textContent = `Score: ${score}`;
    livesElement.textContent = `Lives: ${lives}`;
    levelElement.textContent = `Level: ${level}`;
}

// Check collision between ball and platform
function checkTerrainCollision() {
    ball.onGround = false;
    
    for (let i = 0; i < terrain.length - 1; i++) {
        const segment = terrain[i];
        const nextSegment = terrain[i + 1];
        
        // Check if ball is within this segment's x-range
        if (ball.x + ball.radius > segment.x - cameraOffset && 
            ball.x - ball.radius < nextSegment.x - cameraOffset) {
            
            // Calculate y position of terrain at ball's x position
            const t = (ball.x - (segment.x - cameraOffset)) / (nextSegment.x - segment.x);
            const terrainY = segment.y + t * (nextSegment.y - segment.y);
            
            // Check if ball is touching the terrain
            if (ball.y + ball.radius >= terrainY && 
                ball.y - ball.radius <= terrainY + 10) {
                
                // Place ball on top of terrain
                ball.y = terrainY - ball.radius;
                ball.dy = 0;
                ball.onGround = true;
                
                // Apply friction
                ball.dx *= friction;
            }
        }
    }
}

// Check gem collection
function checkGemCollection() {
    gems.forEach(gem => {
        if (!gem.collected) {
            const dx = ball.x - (gem.x - cameraOffset);
            const dy = ball.y - gem.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < ball.radius + gem.radius) {
                gem.collected = true;
                score += 50;
                updateGameInfo();
            }
        }
    });
}

// Check spike collision
function checkSpikeCollision() {
    spikes.forEach(spike => {
        if (ball.y + ball.radius >= spike.y - 5 &&
            ball.x > spike.x - cameraOffset - ball.radius &&
            ball.x < spike.x - cameraOffset + spike.width + ball.radius) {
            
            loseLife();
        }
    });
}

// Check enemy collision
function checkEnemyCollision() {
    enemies.forEach(enemy => {
        if (ball.x + ball.radius > enemy.x - cameraOffset &&
            ball.x - ball.radius < enemy.x - cameraOffset + enemy.width &&
            ball.y + ball.radius > enemy.y - enemy.height &&
            ball.y - ball.radius < enemy.y) {
            
            // If ball is falling onto enemy
            if (ball.dy > 0 && ball.y - ball.radius < enemy.y - enemy.height + 10) {
                // Bounce off enemy
                ball.dy = -10;
                // Remove enemy
                enemies = enemies.filter(e => e !== enemy);
                score += 100;
                updateGameInfo();
            } else {
                loseLife();
            }
        }
    });
}

// Move enemies
function moveEnemies() {
    enemies.forEach(enemy => {
        enemy.x += enemy.dx * enemy.direction;
        
        // Change direction if at edge of terrain
        let onTerrain = false;
        for (let i = 0; i < terrain.length - 1; i++) {
            if (enemy.x > terrain[i].x && enemy.x < terrain[i+1].x) {
                const t = (enemy.x - terrain[i].x) / (terrain[i+1].x - terrain[i].x);
                const groundY = terrain[i].y + t * (terrain[i+1].y - terrain[i].y);
                
                if (enemy.y < groundY - 5) {
                    enemy.direction *= -1;
                }
                
                onTerrain = true;
                break;
            }
        }
        
        if (!onTerrain) {
            enemy.direction *= -1;
        }
    });
}

// Lose a life
function loseLife() {
    lives--;
    updateGameInfo();
    
    if (lives <= 0) {
        gameOver();
    } else {
        // Reset ball position
        ball.x = 50;
        ball.y = 100;
        ball.dx = 0;
        ball.dy = 0;
        cameraOffset = 0;
    }
}

// Check level completion
function checkLevelComplete() {
    return gems.every(gem => gem.collected) && enemies.length === 0;
}

// Level up
function levelUp() {
    level++;
    updateGameInfo();
    initTerrain();
    initLevel();
    
    // Reset ball position
    ball.x = 50;
    ball.y = 100;
    ball.dx = 0;
    ball.dy = 0;
    cameraOffset = 0;
}

// Game over
function gameOver() {
    clearInterval(gameLoop);
    gameRunning = false;
    startBtn.textContent = 'Play Again';
    
    // Show game over message
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#f44336';
    ctx.font = '30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over!', canvas.width / 2, canvas.height / 2 - 20);
    ctx.font = '20px Arial';
    ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2 + 20);
}

// Game loop
function gameUpdate() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Apply gravity
    ball.dy += gravity;
    
    // Move ball
    if (leftPressed) ball.dx = -5;
    else if (rightPressed) ball.dx = 5;
    else ball.dx *= 0.9;
    
    // Jump if on ground
    if (upPressed && ball.onGround) {
        ball.dy = -12;
        ball.onGround = false;
    }
    
    ball.x += ball.dx;
    ball.y += ball.dy;
    
    // Camera follow
    if (ball.x > canvas.width / 2) {
        cameraOffset = ball.x - canvas.width / 2;
    } else {
        cameraOffset = 0;
    }
    
    // Extend terrain if needed
    const lastSegment = terrain[terrain.length - 1];
    if (lastSegment.x - cameraOffset < canvas.width * 1.5) {
        const heightVariation = Math.sin(terrain.length * 0.5) * 30;
        terrain.push({
            x: lastSegment.x + segmentWidth,
            y: canvas.height - 100 + heightVariation
        });
    }
    
    // Draw game elements
    drawTerrain();
    drawGems();
    drawSpikes();
    drawEnemies();
    drawBall();
    
    // Check collisions
    checkTerrainCollision();
    checkGemCollection();
    checkSpikeCollision();
    checkEnemyCollision();
    moveEnemies();
    
    // Check level completion
    if (checkLevelComplete()) {
        levelUp();
    }
    
    // Check if ball fell off bottom
    if (ball.y > canvas.height + ball.radius) {
        loseLife();
    }
}

// Start game
function startGame() {
    if (gameRunning) return;
    
    // Reset game state
    score = 0;
    lives = 3;
    level = 1;
    updateGameInfo();
    
    // Initialize game objects
    ball = {
        x: 50,
        y: 100,
        radius: ballRadius,
        dx: 0,
        dy: 0,
        onGround: false
    };
    
    cameraOffset = 0;
    initTerrain();
    initLevel();
    gameRunning = true;
    startBtn.textContent = 'Restart Game';
    
    // Clear any existing game loop
    if (gameLoop) {
        clearInterval(gameLoop);
    }
    
    // Start new game loop
    gameLoop = setInterval(gameUpdate, 1000 / 60);
}

// Keyboard controls
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
        leftPressed = true;
    } else if (e.key === 'ArrowRight') {
        rightPressed = true;
    } else if (e.key === 'ArrowUp') {
        upPressed = true;
    } else if (e.key === ' ' && !gameRunning) {
        startGame();
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft') {
        leftPressed = false;
    } else if (e.key === 'ArrowRight') {
        rightPressed = false;
    } else if (e.key === 'ArrowUp') {
        upPressed = false;
    }
});

// Button control
startBtn.addEventListener('click', startGame);

// Initial setup
initTerrain();
updateGameInfo();
