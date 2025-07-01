class UltimateSnakeGame {
    constructor() {
        // Wait for DOM to be fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeGame());
        } else {
            this.initializeGame();
        }
    }
    
    initializeGame() {
        try {
            // Canvas and context
            this.canvas = document.getElementById('gameCanvas');
            this.ctx = this.canvas.getContext('2d');
            
            if (!this.canvas || !this.ctx) {
                console.error('Canvas not found or context not available');
                return;
            }
            
            // UI elements
            this.scoreElement = document.getElementById('score');
            this.highScoreElement = document.getElementById('high-score');
            this.levelElement = document.getElementById('level');
            this.gameOverOverlay = document.getElementById('gameOverOverlay');
            this.pauseOverlay = document.getElementById('pauseOverlay');
            this.finalScoreElement = document.getElementById('finalScore');
            this.finalLevelElement = document.getElementById('finalLevel');
            this.newHighScoreElement = document.getElementById('newHighScore');
            this.foodEatenElement = document.getElementById('foodEaten');
            this.timePlayedElement = document.getElementById('timePlayed');
            this.gamesPlayedElement = document.getElementById('gamesPlayed');
            this.difficultySelect = document.getElementById('difficulty');
            
            // Buttons
            this.startBtn = document.getElementById('startBtn');
            this.pauseBtn = document.getElementById('pauseBtn');
            this.restartBtn = document.getElementById('restartBtn');
            this.playAgainBtn = document.getElementById('playAgainBtn');
            
            // Game settings
            this.gridSize = 20;
            this.tileCount = this.canvas.width / this.gridSize;
            
            // Difficulty settings
            this.difficulties = {
                easy: { speed: 200, speedIncrease: 8, barrierFreq: 15000, bonusFreq: 8000 },
                medium: { speed: 150, speedIncrease: 12, barrierFreq: 12000, bonusFreq: 6000 },
                hard: { speed: 100, speedIncrease: 18, barrierFreq: 10000, bonusFreq: 5000 },
                insane: { speed: 80, speedIncrease: 25, barrierFreq: 8000, bonusFreq: 4000 }
            };
            
            // Movement queue to prevent rapid direction changes
            this.moveQueue = [];
            this.maxQueueSize = 2;
            
            // Animation time for effects
            this.animationTime = 0;
            
            // Dynamic obstacles and bonuses
            this.barriers = [];
            this.bonusItems = [];
            this.warningBarriers = [];
            this.lastBarrierTime = 0;
            this.lastBonusTime = 0;
            
            // Particle systems
            this.particles = [];
            this.explosionParticles = [];
            this.ambientParticles = [];
            
            // Initialize ambient particles
            this.initAmbientParticles();
            
            // Game state
            this.resetGameState();
            
            // Statistics
            this.loadStatistics();
            
            this.init();
            
        } catch (error) {
            console.error('Error initializing game:', error);
        }
    }
    
    initAmbientParticles() {
        for (let i = 0; i < 15; i++) {
            this.ambientParticles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                size: Math.random() * 2 + 1,
                opacity: Math.random() * 0.3 + 0.1,
                hue: Math.random() * 60 + 180 // Blue to cyan range
            });
        }
    }
    
    resetGameState() {
        this.snake = [{ x: 10, y: 10 }];
        this.food = this.generateFood();
        this.dx = 0;
        this.dy = 0;
        this.score = 0;
        this.level = 1;
        this.foodEaten = 0;
        this.gameRunning = false;
        this.gamePaused = false;
        this.gameStarted = false;
        this.gameSpeed = this.difficulties[this.difficultySelect?.value || 'medium'].speed;
        this.speedIncrease = this.difficulties[this.difficultySelect?.value || 'medium'].speedIncrease;
        this.gameStartTime = null;
        this.gameInterval = null;
        this.moveQueue = [];
        this.animationTime = 0;
        
        // Reset dynamic elements
        this.barriers = [];
        this.bonusItems = [];
        this.warningBarriers = [];
        this.particles = [];
        this.explosionParticles = [];
        this.lastBarrierTime = 0;
        this.lastBonusTime = 0;
        
        // Load high score
        this.highScore = parseInt(localStorage.getItem('snakeHighScore')) || 0;
    }
    
    init() {
        try {
            this.highScoreElement.textContent = this.highScore;
            this.updateUI();
            this.setupEventListeners();
            // Force initial draw
            this.forceInitialDraw();
        } catch (error) {
            console.error('Error in init:', error);
        }
    }
    
    forceInitialDraw() {
        try {
            // Clear canvas
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Draw a simple test background to ensure canvas is working
            this.drawBackground();
            this.drawGrid();
            this.drawSnake();
            this.drawFood();
            
            console.log('Initial draw completed');
        } catch (error) {
            console.error('Error in force initial draw:', error);
        }
    }
    
    setupEventListeners() {
        try {
            // Keyboard controls
            document.addEventListener('keydown', (e) => this.handleKeyPress(e));
            
            // Button controls
            this.startBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.startGame();
            });
            
            this.pauseBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.togglePause();
            });
            
            this.restartBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.restartGame();
            });
            
            if (this.playAgainBtn) {
                this.playAgainBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.playAgain();
                });
            }
            
            // Difficulty change
            if (this.difficultySelect) {
                this.difficultySelect.addEventListener('change', () => {
                    if (!this.gameRunning) {
                        const difficulty = this.difficultySelect.value;
                        this.gameSpeed = this.difficulties[difficulty].speed;
                        this.speedIncrease = this.difficulties[difficulty].speedIncrease;
                    }
                });
            }
            
            // Prevent arrow keys from scrolling the page
            window.addEventListener('keydown', (e) => {
                if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].indexOf(e.code) > -1) {
                    e.preventDefault();
                }
            }, false);
            
        } catch (error) {
            console.error('Error setting up event listeners:', error);
        }
    }
    
    handleKeyPress(e) {
        const key = e.key;
        
        // Start game on first key press
        if (!this.gameStarted && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
            this.startGame();
        }
        
        // Pause/Resume
        if (key === ' ' || key === 'Spacebar') {
            e.preventDefault();
            if (this.gameStarted) {
                this.togglePause();
            }
            return;
        }
        
        // Restart
        if (key === 'r' || key === 'R') {
            this.restartGame();
            return;
        }
        
        // Movement (only if game is running and not paused)
        if (!this.gameRunning || this.gamePaused) return;
        
        this.queueDirection(key);
    }
    
    queueDirection(key) {
        // Add direction to queue to prevent rapid changes
        if (this.moveQueue.length < this.maxQueueSize) {
            const direction = this.getDirectionFromKey(key);
            if (direction && this.isValidDirectionChange(direction)) {
                this.moveQueue.push(direction);
            }
        }
    }
    
    getDirectionFromKey(key) {
        switch(key) {
            case 'ArrowLeft': return { dx: -1, dy: 0 };
            case 'ArrowUp': return { dx: 0, dy: -1 };
            case 'ArrowRight': return { dx: 1, dy: 0 };
            case 'ArrowDown': return { dx: 0, dy: 1 };
            default: return null;
        }
    }
    
    isValidDirectionChange(newDirection) {
        // Get current direction
        const currentDx = this.dx;
        const currentDy = this.dy;
        
        // Check if the new direction is opposite to current direction
        if (currentDx === -newDirection.dx && currentDy === -newDirection.dy) {
            return false; // Can't go backwards
        }
        
        // Check if it's the same direction
        if (currentDx === newDirection.dx && currentDy === newDirection.dy) {
            return false; // Already going this way
        }
        
        // Check against the last item in queue
        if (this.moveQueue.length > 0) {
            const lastMove = this.moveQueue[this.moveQueue.length - 1];
            if (lastMove.dx === newDirection.dx && lastMove.dy === newDirection.dy) {
                return false; // Already queued
            }
            if (lastMove.dx === -newDirection.dx && lastMove.dy === -newDirection.dy) {
                return false; // Opposite to queued direction
            }
        }
        
        return true;
    }
    
    processMovementQueue() {
        if (this.moveQueue.length > 0) {
            const nextMove = this.moveQueue.shift();
            if (this.isValidDirectionChange(nextMove)) {
                this.dx = nextMove.dx;
                this.dy = nextMove.dy;
            }
        }
    }
    
    startGame() {
        try {
            if (!this.gameStarted) {
                this.gameStarted = true;
                this.gameStartTime = Date.now();
                this.dx = 1; // Start moving right
                this.dy = 0;
                this.lastBarrierTime = Date.now();
                this.lastBonusTime = Date.now();
            }
            
            this.gameRunning = true;
            this.gamePaused = false;
            this.startBtn.disabled = true;
            this.pauseBtn.disabled = false;
            
            if (this.gameInterval) {
                clearInterval(this.gameInterval);
            }
            
            this.gameLoop();
            this.updateUI();
            
        } catch (error) {
            console.error('Error starting game:', error);
        }
    }
    
    togglePause() {
        try {
            if (!this.gameStarted) return;
            
            this.gamePaused = !this.gamePaused;
            
            if (this.gamePaused) {
                this.gameRunning = false;
                if (this.pauseOverlay) {
                    this.pauseOverlay.style.display = 'flex';
                }
                this.pauseBtn.textContent = '▶️ Resume';
                if (this.gameInterval) {
                    clearInterval(this.gameInterval);
                }
            } else {
                this.gameRunning = true;
                if (this.pauseOverlay) {
                    this.pauseOverlay.style.display = 'none';
                }
                this.pauseBtn.textContent = '⏸️ Pause';
                this.gameLoop();
            }
        } catch (error) {
            console.error('Error toggling pause:', error);
        }
    }
    
    restartGame() {
        try {
            if (this.gameInterval) {
                clearInterval(this.gameInterval);
            }
            
            if (this.gameOverOverlay) {
                this.gameOverOverlay.style.display = 'none';
            }
            if (this.pauseOverlay) {
                this.pauseOverlay.style.display = 'none';
            }
            
            this.resetGameState();
            this.updateUI();
            this.forceInitialDraw();
            
            this.startBtn.disabled = false;
            this.pauseBtn.disabled = true;
            this.pauseBtn.textContent = '⏸️ Pause';
            
        } catch (error) {
            console.error('Error restarting game:', error);
        }
    }
    
    playAgain() {
        this.restartGame();
        setTimeout(() => this.startGame(), 100);
    }
    
    gameLoop() {
        try {
            this.gameInterval = setInterval(() => {
                if (this.gameRunning && !this.gamePaused) {
                    this.animationTime += this.gameSpeed / 1000;
                    this.processMovementQueue();
                    this.update();
                    this.updateDynamicElements();
                    this.updateParticles();
                    this.updateAmbientParticles();
                    this.draw();
                    this.updateTimeDisplay();
                }
            }, this.gameSpeed);
        } catch (error) {
            console.error('Error in game loop:', error);
        }
    }
    
    updateAmbientParticles() {
        this.ambientParticles.forEach(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // Wrap around screen
            if (particle.x < 0) particle.x = this.canvas.width;
            if (particle.x > this.canvas.width) particle.x = 0;
            if (particle.y < 0) particle.y = this.canvas.height;
            if (particle.y > this.canvas.height) particle.y = 0;
            
            // Vary opacity
            particle.opacity += (Math.random() - 0.5) * 0.01;
            particle.opacity = Math.max(0.05, Math.min(0.4, particle.opacity));
        });
    }
    
    updateDynamicElements() {
        try {
            const currentTime = Date.now();
            const difficulty = this.difficulties[this.difficultySelect?.value || 'medium'];
            
            // Only spawn after level 2
            if (this.level >= 2) {
                // Spawn warning barriers
                if (currentTime - this.lastBarrierTime > difficulty.barrierFreq) {
                    this.spawnWarningBarrier();
                    this.lastBarrierTime = currentTime;
                }
                
                // Spawn bonus items
                if (currentTime - this.lastBonusTime > difficulty.bonusFreq) {
                    this.spawnBonusItem();
                    this.lastBonusTime = currentTime;
                }
            }
            
            // Update warning barriers to active barriers
            this.warningBarriers = this.warningBarriers.filter(warning => {
                warning.timeLeft -= this.gameSpeed;
                if (warning.timeLeft <= 0) {
                    this.barriers.push({
                        pattern: warning.pattern,
                        cells: warning.cells,
                        timeLeft: 5000, // 5 seconds active
                        spawnTime: currentTime
                    });
                    return false;
                }
                return true;
            });
            
            // Update active barriers
            this.barriers = this.barriers.filter(barrier => {
                barrier.timeLeft -= this.gameSpeed;
                return barrier.timeLeft > 0;
            });
            
            // Update bonus items
            this.bonusItems = this.bonusItems.filter(bonus => {
                bonus.timeLeft -= this.gameSpeed;
                bonus.rotation += 0.08;
                return bonus.timeLeft > 0;
            });
            
        } catch (error) {
            console.error('Error updating dynamic elements:', error);
        }
    }
    
    spawnWarningBarrier() {
        try {
            const patterns = [
                'single',    // 1 cell
                'line',      // 3 cells in a line
                'L_shape',   // L-shaped pattern
                'square',    // 2x2 square
                'cross'      // Cross pattern
            ];
            
            const pattern = patterns[Math.floor(Math.random() * patterns.length)];
            const cells = this.generateBarrierPattern(pattern);
            
            if (cells.length > 0) {
                this.warningBarriers.push({
                    pattern: pattern,
                    cells: cells,
                    timeLeft: 2500, // 2.5 seconds warning
                    alpha: 0.4
                });
            }
        } catch (error) {
            console.error('Error spawning warning barrier:', error);
        }
    }
    
    generateBarrierPattern(pattern) {
        const cells = [];
        let attempts = 0;
        const maxAttempts = 50;
        
        while (attempts < maxAttempts) {
            const baseX = Math.floor(Math.random() * (this.tileCount - 3)) + 1;
            const baseY = Math.floor(Math.random() * (this.tileCount - 3)) + 1;
            
            let patternCells = [];
            
            switch (pattern) {
                case 'single':
                    patternCells = [{ x: baseX, y: baseY }];
                    break;
                case 'line':
                    const horizontal = Math.random() > 0.5;
                    if (horizontal) {
                        patternCells = [
                            { x: baseX, y: baseY },
                            { x: baseX + 1, y: baseY },
                            { x: baseX + 2, y: baseY }
                        ];
                    } else {
                        patternCells = [
                            { x: baseX, y: baseY },
                            { x: baseX, y: baseY + 1 },
                            { x: baseX, y: baseY + 2 }
                        ];
                    }
                    break;
                case 'L_shape':
                    patternCells = [
                        { x: baseX, y: baseY },
                        { x: baseX + 1, y: baseY },
                        { x: baseX, y: baseY + 1 }
                    ];
                    break;
                case 'square':
                    patternCells = [
                        { x: baseX, y: baseY },
                        { x: baseX + 1, y: baseY },
                        { x: baseX, y: baseY + 1 },
                        { x: baseX + 1, y: baseY + 1 }
                    ];
                    break;
                case 'cross':
                    patternCells = [
                        { x: baseX, y: baseY },
                        { x: baseX - 1, y: baseY },
                        { x: baseX + 1, y: baseY },
                        { x: baseX, y: baseY - 1 },
                        { x: baseX, y: baseY + 1 }
                    ];
                    break;
            }
            
            // Check if all cells are valid
            const allValid = patternCells.every(cell => 
                cell.x >= 0 && cell.x < this.tileCount && 
                cell.y >= 0 && cell.y < this.tileCount &&
                this.isPositionFree(cell.x, cell.y)
            );
            
            if (allValid) {
                return patternCells;
            }
            
            attempts++;
        }
        
        return [];
    }
    
    spawnBonusItem() {
        try {
            const types = [
                { type: 'bonus3', value: 3, color: '#78dbff', timeLeft: 8000, size: 1 },
                { type: 'bonus5', value: 5, color: '#ff77c6', timeLeft: 6000, size: 2 }
            ];
            
            const bonusType = types[Math.floor(Math.random() * types.length)];
            const cells = this.generateBonusPattern(bonusType.size);
            
            if (cells.length > 0) {
                this.bonusItems.push({
                    cells: cells,
                    type: bonusType.type,
                    value: bonusType.value,
                    color: bonusType.color,
                    timeLeft: bonusType.timeLeft,
                    rotation: 0,
                    size: bonusType.size
                });
            }
        } catch (error) {
            console.error('Error spawning bonus item:', error);
        }
    }
    
    generateBonusPattern(size) {
        const cells = [];
        let attempts = 0;
        const maxAttempts = 50;
        
        while (attempts < maxAttempts) {
            const baseX = Math.floor(Math.random() * (this.tileCount - size)) + 1;
            const baseY = Math.floor(Math.random() * (this.tileCount - size)) + 1;
            
            let patternCells = [];
            
            if (size === 1) {
                patternCells = [{ x: baseX, y: baseY }];
            } else if (size === 2) {
                // 2x2 pattern for 5-point bonus
                patternCells = [
                    { x: baseX, y: baseY },
                    { x: baseX + 1, y: baseY },
                    { x: baseX, y: baseY + 1 },
                    { x: baseX + 1, y: baseY + 1 }
                ];
            }
            
            // Check if all cells are valid
            const allValid = patternCells.every(cell => 
                cell.x >= 0 && cell.x < this.tileCount && 
                cell.y >= 0 && cell.y < this.tileCount &&
                this.isPositionFree(cell.x, cell.y)
            );
            
            if (allValid) {
                return patternCells;
            }
            
            attempts++;
        }
        
        return [];
    }
    
    isPositionFree(x, y) {
        try {
            // Check snake
            for (let segment of this.snake) {
                if (segment.x === x && segment.y === y) return false;
            }
            
            // Check food
            if (this.food && this.food.x === x && this.food.y === y) return false;
            
            // Check barriers
            for (let barrier of this.barriers) {
                for (let cell of barrier.cells) {
                    if (cell.x === x && cell.y === y) return false;
                }
            }
            
            // Check warning barriers
            for (let warning of this.warningBarriers) {
                for (let cell of warning.cells) {
                    if (cell.x === x && cell.y === y) return false;
                }
            }
            
            // Check bonus items
            for (let bonus of this.bonusItems) {
                for (let cell of bonus.cells) {
                    if (cell.x === x && cell.y === y) return false;
                }
            }
            
            return true;
        } catch (error) {
            console.error('Error checking position:', error);
            return false;
        }
    }
    
    update() {
        try {
            // Calculate new head position
            const head = { 
                x: this.snake[0].x + this.dx, 
                y: this.snake[0].y + this.dy 
            };
            
            // Check wall collision
            if (head.x < 0 || head.x >= this.tileCount || 
                head.y < 0 || head.y >= this.tileCount) {
                this.gameOver();
                return;
            }
            
            // Check self collision
            for (let i = 0; i < this.snake.length; i++) {
                const segment = this.snake[i];
                if (head.x === segment.x && head.y === segment.y) {
                    this.gameOver();
                    return;
                }
            }
            
            // Check barrier collision
            for (let barrier of this.barriers) {
                for (let cell of barrier.cells) {
                    if (head.x === cell.x && head.y === cell.y) {
                        this.createExplosion(head.x * this.gridSize, head.y * this.gridSize);
                        this.gameOver();
                        return;
                    }
                }
            }
            
            // Add new head
            this.snake.unshift(head);
            
            // Check food collision
            if (this.food && head.x === this.food.x && head.y === this.food.y) {
                this.score++;
                this.foodEaten++;
                this.food = this.generateFood();
                this.createFoodParticles(head.x * this.gridSize, head.y * this.gridSize);
                
                // Increase level every 5 points
                if (this.score % 5 === 0) {
                    this.level++;
                    this.increaseSpeed();
                }
                
                this.updateUI();
            } else {
                // Check bonus collision
                let bonusEaten = false;
                this.bonusItems = this.bonusItems.filter(bonus => {
                    for (let cell of bonus.cells) {
                        if (head.x === cell.x && head.y === cell.y) {
                            this.score += bonus.value;
                            this.createBonusParticles(head.x * this.gridSize, head.y * this.gridSize, bonus.color);
                            bonusEaten = true;
                            this.updateUI();
                            return false;
                        }
                    }
                    return true;
                });
                
                if (!bonusEaten) {
                    // Remove tail if no food/bonus eaten
                    this.snake.pop();
                }
            }
        } catch (error) {
            console.error('Error in update:', error);
        }
    }
    
    createExplosion(x, y) {
        try {
            for (let i = 0; i < 25; i++) {
                this.explosionParticles.push({
                    x: x + this.gridSize/2,
                    y: y + this.gridSize/2,
                    vx: (Math.random() - 0.5) * 12,
                    vy: (Math.random() - 0.5) * 12,
                    life: 1,
                    decay: 0.015,
                    size: Math.random() * 5 + 2,
                    hue: Math.random() * 60 + 340 // Red to orange range
                });
            }
        } catch (error) {
            console.error('Error creating explosion:', error);
        }
    }
    
    createFoodParticles(x, y) {
        try {
            for (let i = 0; i < 12; i++) {
                this.particles.push({
                    x: x + this.gridSize/2,
                    y: y + this.gridSize/2,
                    vx: (Math.random() - 0.5) * 8,
                    vy: (Math.random() - 0.5) * 8,
                    life: 1,
                    decay: 0.025,
                    size: Math.random() * 4 + 1,
                    hue: 120 // Green
                });
            }
        } catch (error) {
            console.error('Error creating food particles:', error);
        }
    }
    
    createBonusParticles(x, y, color) {
        try {
            for (let i = 0; i < 18; i++) {
                this.particles.push({
                    x: x + this.gridSize/2,
                    y: y + this.gridSize/2,
                    vx: (Math.random() - 0.5) * 10,
                    vy: (Math.random() - 0.5) * 10,
                    life: 1,
                    decay: 0.02,
                    size: Math.random() * 5 + 2,
                    color: color
                });
            }
        } catch (error) {
            console.error('Error creating bonus particles:', error);
        }
    }
    
    updateParticles() {
        try {
            this.particles = this.particles.filter(particle => {
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.vx *= 0.97;
                particle.vy *= 0.97;
                particle.life -= particle.decay;
                return particle.life > 0;
            });
            
            this.explosionParticles = this.explosionParticles.filter(particle => {
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.vx *= 0.94;
                particle.vy *= 0.94;
                particle.life -= particle.decay;
                return particle.life > 0;
            });
        } catch (error) {
            console.error('Error updating particles:', error);
        }
    }
    
    increaseSpeed() {
        try {
            // Increase speed (decrease interval)
            this.gameSpeed = Math.max(60, this.gameSpeed - this.speedIncrease);
            
            // Restart game loop with new speed
            if (this.gameInterval) {
                clearInterval(this.gameInterval);
                this.gameLoop();
            }
        } catch (error) {
            console.error('Error increasing speed:', error);
        }
    }
    
    generateFood() {
        let food = { x: 5, y: 5 }; // Default position
        try {
            let attempts = 0;
            const maxAttempts = 100;
            
            do {
                food = {
                    x: Math.floor(Math.random() * this.tileCount),
                    y: Math.floor(Math.random() * this.tileCount)
                };
                attempts++;
            } while (attempts < maxAttempts && !this.isPositionFree(food.x, food.y));
            
        } catch (error) {
            console.error('Error generating food:', error);
        }
        return food;
    }
    
    draw() {
        try {
            // Clear canvas
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Draw background
            this.drawBackground();
            
            // Draw grid
            this.drawGrid();
            
            // Draw snake
            this.drawSnake();
            
            // Draw food
            this.drawFood();
            
            // Draw warning barriers first (behind everything)
            this.drawWarningBarriers();
            
            // Draw active barriers
            this.drawBarriers();
            
            // Draw bonus items
            this.drawBonusItems();
            
            // Draw ambient particles
            this.drawAmbientParticles();
            
            // Draw particle effects
            this.drawParticles();
            
        } catch (error) {
            console.error('Error in draw:', error);
        }
    }
    
    drawBackground() {
        try {
            // Simple visible background first
            this.ctx.fillStyle = '#161b22';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Add gradient overlay
            const gradient = this.ctx.createRadialGradient(
                this.canvas.width/2, this.canvas.height/2, 0,
                this.canvas.width/2, this.canvas.height/2, this.canvas.width/2
            );
            gradient.addColorStop(0, 'rgba(13, 17, 23, 0.8)');
            gradient.addColorStop(0.7, 'rgba(22, 27, 34, 0.9)');
            gradient.addColorStop(1, 'rgba(13, 17, 23, 1)');
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
        } catch (error) {
            console.error('Error drawing background:', error);
        }
    }
    
    drawAmbientParticles() {
        try {
            this.ambientParticles.forEach(particle => {
                this.ctx.save();
                this.ctx.globalAlpha = particle.opacity;
                this.ctx.fillStyle = `hsl(${particle.hue}, 70%, 60%)`;
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.restore();
            });
        } catch (error) {
            console.error('Error drawing ambient particles:', error);
        }
    }
    
    drawGrid() {
        try {
            this.ctx.strokeStyle = 'rgba(120, 219, 255, 0.1)';
            this.ctx.lineWidth = 0.5;
            
            for (let i = 0; i <= this.tileCount; i++) {
                // Vertical lines
                this.ctx.beginPath();
                this.ctx.moveTo(i * this.gridSize, 0);
                this.ctx.lineTo(i * this.gridSize, this.canvas.height);
                this.ctx.stroke();
                
                // Horizontal lines
                this.ctx.beginPath();
                this.ctx.moveTo(0, i * this.gridSize);
                this.ctx.lineTo(this.canvas.width, i * this.gridSize);
                this.ctx.stroke();
            }
        } catch (error) {
            console.error('Error drawing grid:', error);
        }
    }
    
    drawWarningBarriers() {
        try {
            this.warningBarriers.forEach(warning => {
                warning.cells.forEach(cell => {
                    const x = cell.x * this.gridSize;
                    const y = cell.y * this.gridSize;
                    
                    // Pulsing warning effect
                    const pulse = Math.sin(this.animationTime * 0.015) * 0.4 + 0.6;
                    const alpha = warning.alpha * pulse;
                    
                    this.ctx.save();
                    this.ctx.globalAlpha = alpha;
                    
                    // Warning outline
                    this.ctx.strokeStyle = '#ff6b6b';
                    this.ctx.lineWidth = 3;
                    this.ctx.setLineDash([8, 8]);
                    this.ctx.strokeRect(x + 2, y + 2, this.gridSize - 4, this.gridSize - 4);
                    
                    // Warning fill
                    this.ctx.fillStyle = 'rgba(255, 107, 107, 0.2)';
                    this.ctx.fillRect(x + 2, y + 2, this.gridSize - 4, this.gridSize - 4);
                    
                    this.ctx.restore();
                    this.ctx.setLineDash([]);
                });
            });
        } catch (error) {
            console.error('Error drawing warning barriers:', error);
        }
    }
    
    drawBarriers() {
        try {
            this.barriers.forEach(barrier => {
                barrier.cells.forEach((cell, index) => {
                    const x = cell.x * this.gridSize;
                    const y = cell.y * this.gridSize;
                    
                    // Simple red barrier
                    this.ctx.fillStyle = '#ff6b6b';
                    this.ctx.fillRect(x + 2, y + 2, this.gridSize - 4, this.gridSize - 4);
                    
                    // Border
                    this.ctx.strokeStyle = '#ff4757';
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeRect(x + 2, y + 2, this.gridSize - 4, this.gridSize - 4);
                });
            });
        } catch (error) {
            console.error('Error drawing barriers:', error);
        }
    }
    
    drawBonusItems() {
        try {
            this.bonusItems.forEach(bonus => {
                if (bonus.type === 'bonus3') {
                    // Single cell diamond for 3-point bonus
                    const cell = bonus.cells[0];
                    const centerX = (cell.x + 0.5) * this.gridSize;
                    const centerY = (cell.y + 0.5) * this.gridSize;
                    
                    this.ctx.save();
                    this.ctx.translate(centerX, centerY);
                    this.ctx.rotate(bonus.rotation);
                    
                    const size = 8;
                    this.ctx.fillStyle = bonus.color;
                    this.ctx.beginPath();
                    this.ctx.moveTo(0, -size);
                    this.ctx.lineTo(size, 0);
                    this.ctx.lineTo(0, size);
                    this.ctx.lineTo(-size, 0);
                    this.ctx.closePath();
                    this.ctx.fill();
                    
                    // Value text
                    this.ctx.fillStyle = '#000';
                    this.ctx.font = 'bold 8px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText('3', 0, 2);
                    
                    this.ctx.restore();
                    
                } else if (bonus.type === 'bonus5') {
                    // 2x2 star pattern for 5-point bonus
                    bonus.cells.forEach((cell, index) => {
                        const x = cell.x * this.gridSize;
                        const y = cell.y * this.gridSize;
                        const centerX = x + this.gridSize / 2;
                        const centerY = y + this.gridSize / 2;
                        
                        this.ctx.save();
                        this.ctx.translate(centerX, centerY);
                        this.ctx.rotate(bonus.rotation + index * Math.PI / 4);
                        
                        // Star shape
                        this.ctx.fillStyle = bonus.color;
                        this.ctx.beginPath();
                        for (let i = 0; i < 10; i++) {
                            const angle = (i * Math.PI) / 5;
                            const radius = i % 2 === 0 ? 6 : 3;
                            const px = Math.cos(angle) * radius;
                            const py = Math.sin(angle) * radius;
                            if (i === 0) this.ctx.moveTo(px, py);
                            else this.ctx.lineTo(px, py);
                        }
                        this.ctx.closePath();
                        this.ctx.fill();
                        
                        // Value text only on first cell
                        if (index === 0) {
                            this.ctx.fillStyle = '#000';
                            this.ctx.font = 'bold 6px Arial';
                            this.ctx.textAlign = 'center';
                            this.ctx.fillText('5', 0, 2);
                        }
                        
                        this.ctx.restore();
                    });
                }
            });
        } catch (error) {
            console.error('Error drawing bonus items:', error);
        }
    }
    
    drawSnake() {
        try {
            this.snake.forEach((segment, index) => {
                const x = segment.x * this.gridSize;
                const y = segment.y * this.gridSize;
                
                if (index === 0) {
                    // Head with enhanced design
                    this.drawSnakeHead(x, y);
                } else {
                    // Body with fade effect
                    this.drawSnakeBody(x, y, index);
                }
            });
        } catch (error) {
            console.error('Error drawing snake:', error);
        }
    }
    
    drawSnakeHead(x, y) {
        const centerX = x + this.gridSize / 2;
        const centerY = y + this.gridSize / 2;
        const radius = this.gridSize / 2 - 2;
        
        // Main head gradient
        const headGradient = this.ctx.createRadialGradient(
            centerX - 3, centerY - 3, 0,
            centerX, centerY, radius
        );
        headGradient.addColorStop(0, '#9bff9b');
        headGradient.addColorStop(0.4, '#78dbff');
        headGradient.addColorStop(1, '#4a9bc7');
        
        // Draw head
        this.ctx.fillStyle = headGradient;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Head border
        this.ctx.strokeStyle = '#78dbff';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        // Eyes
        this.drawSnakeEyes(centerX, centerY);
        
        // Highlight
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        this.ctx.beginPath();
        this.ctx.arc(centerX - 4, centerY - 4, radius * 0.4, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    drawSnakeEyes(centerX, centerY) {
        let eye1X, eye1Y, eye2X, eye2Y;
        
        // Position eyes based on movement direction
        if (this.dx === 1) { // Moving right
            eye1X = centerX + 3; eye1Y = centerY - 3;
            eye2X = centerX + 3; eye2Y = centerY + 3;
        } else if (this.dx === -1) { // Moving left
            eye1X = centerX - 3; eye1Y = centerY - 3;
            eye2X = centerX - 3; eye2Y = centerY + 3;
        } else if (this.dy === -1) { // Moving up
            eye1X = centerX - 3; eye1Y = centerY - 3;
            eye2X = centerX + 3; eye2Y = centerY - 3;
        } else { // Moving down or stationary
            eye1X = centerX - 3; eye1Y = centerY + 3;
            eye2X = centerX + 3; eye2Y = centerY + 3;
        }
        
        // Draw eyes
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(eye1X, eye1Y, 2.5, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(eye2X, eye2Y, 2.5, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Pupils
        this.ctx.fillStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.arc(eye1X, eye1Y, 1.2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(eye2X, eye2Y, 1.2, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Eye highlights
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.beginPath();
        this.ctx.arc(eye1X - 0.5, eye1Y - 0.5, 0.8, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(eye2X - 0.5, eye2Y - 0.5, 0.8, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    drawSnakeBody(x, y, index) {
        const centerX = x + this.gridSize / 2;
        const centerY = y + this.gridSize / 2;
        const alpha = Math.max(0.6, 1 - (index * 0.02));
        const radius = (this.gridSize / 2 - 3) * (1 - index * 0.01);
        
        // Body gradient with fade
        const bodyGradient = this.ctx.createRadialGradient(
            centerX - 2, centerY - 2, 0,
            centerX, centerY, radius
        );
        bodyGradient.addColorStop(0, `rgba(155, 255, 155, ${alpha})`);
        bodyGradient.addColorStop(0.5, `rgba(120, 219, 255, ${alpha * 0.8})`);
        bodyGradient.addColorStop(1, `rgba(74, 156, 199, ${alpha * 0.6})`);
        
        // Draw body segment
        this.ctx.fillStyle = bodyGradient;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Body border
        this.ctx.strokeStyle = `rgba(120, 219, 255, ${alpha * 0.6})`;
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        
        // Scale pattern on every other segment
        if (index % 2 === 0) {
            this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.15})`;
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, radius * 0.6, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    drawFood() {
        try {
            if (!this.food) return;
            
            const x = this.food.x * this.gridSize;
            const y = this.food.y * this.gridSize;
            const centerX = x + this.gridSize / 2;
            const centerY = y + this.gridSize / 2;
            
            // Pulsing effect
            const time = this.animationTime * 0.008;
            const pulse = Math.sin(time * 4) * 0.2 + 0.8;
            const radius = (this.gridSize / 2 - 2) * pulse;
            
            // Main food body
            const foodGradient = this.ctx.createRadialGradient(
                centerX - 3, centerY - 3, 0,
                centerX, centerY, radius
            );
            foodGradient.addColorStop(0, '#ff9bd6');
            foodGradient.addColorStop(0.5, '#ff77c6');
            foodGradient.addColorStop(1, '#d147a0');
            
            this.ctx.fillStyle = foodGradient;
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Highlight
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            this.ctx.beginPath();
            this.ctx.arc(centerX - 3, centerY - 3, radius * 0.4, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Sparkles
            const sparkleAngle = time * 3;
            for (let i = 0; i < 6; i++) {
                const angle = sparkleAngle + (i * Math.PI / 3);
                const distance = radius + 8;
                const sparkleX = centerX + Math.cos(angle) * distance;
                const sparkleY = centerY + Math.sin(angle) * distance;
                
                this.ctx.fillStyle = `rgba(255, 255, 255, ${pulse * 0.8})`;
                this.ctx.beginPath();
                this.ctx.arc(sparkleX, sparkleY, 1.5, 0, Math.PI * 2);
                this.ctx.fill();
            }
        } catch (error) {
            console.error('Error drawing food:', error);
        }
    }
    
    drawParticles() {
        try {
            // Draw regular particles
            this.particles.forEach(particle => {
                this.ctx.save();
                this.ctx.globalAlpha = particle.life;
                if (particle.hue !== undefined) {
                    this.ctx.fillStyle = `hsl(${particle.hue}, 100%, 60%)`;
                } else {
                    this.ctx.fillStyle = particle.color;
                }
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.restore();
            });
            
            // Draw explosion particles
            this.explosionParticles.forEach(particle => {
                this.ctx.save();
                this.ctx.globalAlpha = particle.life;
                this.ctx.fillStyle = `hsl(${particle.hue}, 100%, 60%)`;
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.restore();
            });
        } catch (error) {
            console.error('Error drawing particles:', error);
        }
    }
    
    gameOver() {
        try {
            this.gameRunning = false;
            this.gameStarted = false;
            
            if (this.gameInterval) {
                clearInterval(this.gameInterval);
            }
            
            // Create dramatic explosion at snake head
            if (this.snake.length > 0) {
                const headX = this.snake[0].x * this.gridSize;
                const headY = this.snake[0].y * this.gridSize;
                this.createExplosion(headX, headY);
            }
            
            // Update statistics
            this.updateStatistics();
            
            // Check for new high score
            const isNewHighScore = this.score > this.highScore;
            if (isNewHighScore) {
                this.highScore = this.score;
                this.highScoreElement.textContent = this.highScore;
                localStorage.setItem('snakeHighScore', this.highScore);
                if (this.newHighScoreElement) {
                    this.newHighScoreElement.style.display = 'block';
                }
            } else {
                if (this.newHighScoreElement) {
                    this.newHighScoreElement.style.display = 'none';
                }
            }
            
            // Show game over screen
            if (this.finalScoreElement) {
                this.finalScoreElement.textContent = this.score;
            }
            if (this.finalLevelElement) {
                this.finalLevelElement.textContent = this.level;
            }
            if (this.gameOverOverlay) {
                this.gameOverOverlay.style.display = 'flex';
            }
            
            // Reset button states
            this.startBtn.disabled = false;
            this.pauseBtn.disabled = true;
            this.pauseBtn.textContent = '⏸️ Pause';
            
        } catch (error) {
            console.error('Error in game over:', error);
        }
    }
    
    updateUI() {
        try {
            if (this.scoreElement) this.scoreElement.textContent = this.score;
            if (this.levelElement) this.levelElement.textContent = this.level;
            if (this.foodEatenElement) this.foodEatenElement.textContent = this.foodEaten;
        } catch (error) {
            console.error('Error updating UI:', error);
        }
    }
    
    updateTimeDisplay() {
        try {
            if (this.gameStartTime && this.timePlayedElement) {
                const elapsed = Date.now() - this.gameStartTime;
                const minutes = Math.floor(elapsed / 60000);
                const seconds = Math.floor((elapsed % 60000) / 1000);
                this.timePlayedElement.textContent = 
                    `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        } catch (error) {
            console.error('Error updating time display:', error);
        }
    }
    
    loadStatistics() {
        try {
            const gamesPlayed = parseInt(localStorage.getItem('snakeGamesPlayed')) || 0;
            if (this.gamesPlayedElement) {
                this.gamesPlayedElement.textContent = gamesPlayed;
            }
        } catch (error) {
            console.error('Error loading statistics:', error);
        }
    }
    
    updateStatistics() {
        try {
            const gamesPlayed = parseInt(localStorage.getItem('snakeGamesPlayed')) || 0;
            localStorage.setItem('snakeGamesPlayed', gamesPlayed + 1);
            if (this.gamesPlayedElement) {
                this.gamesPlayedElement.textContent = gamesPlayed + 1;
            }
            
            // Save other statistics if needed
            const totalFood = parseInt(localStorage.getItem('snakeTotalFood')) || 0;
            localStorage.setItem('snakeTotalFood', totalFood + this.foodEaten);
        } catch (error) {
            console.error('Error updating statistics:', error);
        }
    }
}

// Initialize game
new UltimateSnakeGame();