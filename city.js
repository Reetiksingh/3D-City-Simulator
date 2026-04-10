let gridSize = 10;
let cellSize = 50;
let chatInput = '';
let botResponses = {
    "how can i reset my device?": "To reset your device, hold the power button for 10 seconds.",
    "what is the battery status?": "Battery is currently at 87%.",
    "how to connect to wifi?": "Go to Settings > WiFi and select your network.",
    "is the factory emitting smoke?": "Yes, Factory 3 reported excess emissions.",
    "how can i contact support?": "Call 1800-ROBOT or email support@smartcity.ai"
};

let showChatBot = false;
let chatMessages = [
    { sender: "bot", text: "Hi! I'm your Smart City Assistant 🤖. Ask me anything!" }
];

let grid = [];
let buildingTypes = ['empty', 'road', 'school', 'factory', 'home', 'hospital', 'park', 'temple', 'police', 'mall'];
let buildingSymbols = {
    'empty': '', 'road': '🛣', 'school': '🏫', 'factory': '🏭', 'home': '🏠',
    'hospital': '🏥', 'park': '🌳', 'temple': '🛕', 'police': '👮', 'mall': '🛍', 'fire': '🔥'
};
let currentBuilding = 'school';
let undoStack = [];
let redoStack = [];
let score = 0;
let weather = 'sunny';
let weatherOptions = ['sunny', 'rainy', 'snowy', 'stormy'];
let botX = 0, botY = 0;
let aiMessages = [];
let robotEnabled = false;

let saveLoadMessage = '';  // For subtle save/load UI feedback
let saveLoadTimer = 0;     // Timer for message display

function setup() {
    createCanvas(gridSize * cellSize + 220, gridSize * cellSize + 360); // add more vertical space
    textAlign(CENTER, CENTER);
    textSize(12);
    for (let i = 0; i < gridSize; i++) grid[i] = Array(gridSize).fill('empty');
    frameRate(4);
}

function draw() {
    background(getWeatherColor());
    displayWeather(); // show weather on top-right
    drawGrid();
    drawButtons();
    drawScore();
    drawBot();
    drawTooltip();
    drawAIHints();
    drawSaveLoadMessage();
    animateFires();
    if (showChatBot) drawChatBot();
}

function drawChatBot() {
    fill(255);
    stroke(0);
    rect(10, height - 180, width - 20, 160, 10);

    fill(0);
    textSize(14);
    textAlign(LEFT, TOP);
    text("🤖 IoT Robot Assistant", 20, height - 170);

    let y = height - 150;
    for (let msg of chatMessages.slice(-5)) {
        fill(msg.sender === "bot" ? "#e0f7fa" : "#c8e6c9");
        noStroke();
        rect(20, y - 2, width - 40, 22, 4);
        fill(0);
        text(`${msg.sender === "bot" ? "🤖" : "You"}: ${msg.text}`, 25, y);
        y += 25;
    }

    // Input box
    fill(255);
    stroke(0);
    rect(20, height - 35, width - 120, 25, 5);
    fill(0);
    noStroke();
    text(chatInput, 25, height - 22);

    // Send button
    fill('#90caf9');
    stroke(0);
    rect(width - 90, height - 35, 60, 25, 5);
    fill(0);
    noStroke();
    text("Send", width - 60, height - 22);
}

function keyTyped() {
    if (showChatBot && key !== 'Enter') {
        chatInput += key;
    }
}

function keyPressed() {
    if (showChatBot && keyCode === BACKSPACE) {
        chatInput = chatInput.slice(0, -1);
    }
    if (showChatBot && keyCode === ENTER) {
        handleChatMessage();
    }
}
function handleChatMessage() {
    if (chatInput.trim() === '') return;
    let question = chatInput.toLowerCase().trim();
    chatMessages.push({ sender: "user", text: chatInput });

    let reply = botResponses[question] || "I'm not sure about that. Try asking something else!";
    chatMessages.push({ sender: "bot", text: reply });
    chatInput = '';
}

function displayWeather() {
    textSize(24);
    textAlign(RIGHT, TOP);
    fill("#333");

    let emoji = {
        sunny: "☀️",
        rainy: "🌧️",
        stormy: "⛈️",
        snowy: "❄️"
    };

    text(`Weather: ${emoji[weather] || "❓"}`, width - 10, 10);

    // Reset alignment for other UI elements
    textAlign(CENTER, CENTER);
}

function getWeatherColor() {
    switch (weather) {
        case 'rainy': return '#ccf';
        case 'snowy': return '#eef';
        case 'stormy': return '#444';
        default: return 255;
    }
}

function drawGrid() {
    for (let x = 0; x < gridSize; x++) {
        for (let y = 0; y < gridSize; y++) {
            let posX = x * cellSize, posY = y * cellSize;

            // Flicker effect for fires
            if (grid[x][y] === 'fire') {
                if (frameCount % 30 < 15) fill('#ff3300');
                else fill('#ff6600');
            } else {
                fill(getColor(grid[x][y]));
            }

            stroke(0);
            rect(posX, posY, cellSize, cellSize);
            fill(0);
            textSize(24);
            text(buildingSymbols[grid[x][y]], posX + cellSize / 2, posY + cellSize / 2);
        }
    }
}

function drawButtons() {
    // Building buttons (unchanged)
    for (let i = 0; i < buildingTypes.length; i++) {
        let bx = i % 5 * 70;
        let by = gridSize * cellSize + 10 + floor(i / 5) * 40;
        let type = buildingTypes[i];
        let symbol = buildingSymbols[type] || '';

        fill(getColor(type));
        stroke(currentBuilding === type ? 'blue' : 'black');
        strokeWeight(currentBuilding === type ? 3 : 1);
        rect(bx, by, 65, 30, 5);

        fill(0);
        textSize(12);
        noStroke();
        text(`${symbol} ${type}`, bx + 32, by + 15);
    }

    // First row - same fixed layout
    let y1 = gridSize * cellSize + 90;
    drawControlButton(0, y1, 'Undo', 'orange');
    drawControlButton(70, y1, 'Redo', 'lightgreen');
    drawControlButton(150, y1, 'Play ▶️', 'skyblue');
    drawControlButton(250, y1, 'Advisor', 'pink');
    drawControlButton(340, y1, 'Weather', '#aaaaff');

    // Second row - dynamic width layout
    let y2 = gridSize * cellSize + 130;
    let x = 10;
    x += drawControlButton(x, y2, 'Save', 'gold') + 10;
    x += drawControlButton(x, y2, 'Load', 'lightyellow') + 10;
    x += drawControlButton(x, y2, 'Disaster', '#ff9999') + 10;
    x += drawControlButton(x, y2, 'Generate', '#99ccff') + 10;
    x += drawControlButton(x, y2, robotEnabled ? 'Robot On' : 'Robot Off', robotEnabled ? 'lightgreen' : 'lightgray') + 10;
    x += drawControlButton(x, y2, 'Add IoT Robot', 'plum');
}

function drawControlButton(x, y, label, color) {
    textSize(14);
    let padding = 20;
    let w = textWidth(label) + padding;
    fill(color);
    stroke(0);
    strokeWeight(1);
    rect(x, y, w, 30, 5);
    fill(0);
    noStroke();
    textAlign(LEFT, CENTER);
    text(label, x + padding / 2, y + 15);
    return w; // return width so next button can be placed accordingly
}


function drawScore() {
    fill(0); textSize(18); textStyle(BOLD);
    text("Score: " + score, width - 90, gridSize * cellSize + 50);
    textStyle(NORMAL);
}

function getColor(type) {
    const colors = {
        school: 'yellow', factory: 'gray', home: 'lightblue',
        hospital: 'red', park: 'green', temple: '#d9b38c', police: '#0000ff',
        mall: '#ff66cc', fire: '#ff3300', road: '#aaaaaa', empty: 'white'
    };
    return colors[type] || 'white';
}


function mousePressed() {
    // Place building on grid
    if (mouseY < gridSize * cellSize) {
        let x = floor(mouseX / cellSize), y = floor(mouseY / cellSize);
        if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
            let before = grid[x][y];
            if (before !== currentBuilding) {
                undoStack.push({ x, y, before, after: currentBuilding });
                grid[x][y] = currentBuilding;
                redoStack = [];
            }
        }
    }

    // Select building
    for (let i = 0; i < buildingTypes.length; i++) {
        let bx = i % 5 * 70;
        let by = gridSize * cellSize + 10 + floor(i / 5) * 40;
        if (mouseX > bx && mouseX < bx + 65 && mouseY > by && mouseY < by + 30) {
            currentBuilding = buildingTypes[i];
        }
    }

    // First row of fixed buttons
    let y1 = gridSize * cellSize + 90;
    if (mouseY > y1 && mouseY < y1 + 30) {
        if (mouseX > 0 && mouseX < 65) undo();
        else if (mouseX > 70 && mouseX < 135) redo();
        else if (mouseX > 150 && mouseX < 230) score = calculateScore();
        else if (mouseX > 250 && mouseX < 315) giveAdvice();
        else if (mouseX > 340 && mouseX < 405) weather = random(weatherOptions);
    }

    // ✅ Dynamic buttons (second row)
    let y2 = gridSize * cellSize + 130;
    if (mouseY > y2 && mouseY < y2 + 30) {
        textSize(14);
        let x = 10;
        let padding = 20;

        const buttons = [
            { label: 'Save', action: saveCity },
            { label: 'Load', action: loadCity },
            { label: 'Disaster', action: simulateDisaster },
            { label: 'Generate', action: generatePerfectCity },
            {
                label: robotEnabled ? 'Robot On' : 'Robot Off',
                action: () => robotEnabled = !robotEnabled
            },
            {
                label: 'Add IoT Robot',
                action: () => showChatBot = !showChatBot
            }
        ];

        for (let btn of buttons) {
            let w = textWidth(btn.label) + padding;
            if (mouseX > x && mouseX < x + w) {
                btn.action();
                break;
            }
            x += w + 10;
        }
    }

    // Chatbot send button
    if (showChatBot && mouseX > width - 90 && mouseX < width - 30 && mouseY > height - 35 && mouseY < height - 10) {
        handleChatMessage();
    }
}


function undo() {
    if (undoStack.length > 0) {
        let last = undoStack.pop();
        redoStack.push({ x: last.x, y: last.y, before: grid[last.x][last.y], after: last.after });
        grid[last.x][last.y] = last.before;
    }
}

function redo() {
    if (redoStack.length > 0) {
        let next = redoStack.pop();
        undoStack.push({ x: next.x, y: next.y, before: grid[next.x][next.y], after: next.after });
        grid[next.x][next.y] = next.after;
    }
}

// Scoring with adjacency rules
function calculateScore() {
    let score = 0;
    for (let x = 0; x < gridSize; x++) {
        for (let y = 0; y < gridSize; y++) {
            let type = grid[x][y];
            let n = getNeighbors(x, y);
            if (type === 'home') {
                if (weather === 'rainy' && n.includes('hospital')) score += 5;
                if (n.includes('factory')) score -= 5;
                if (n.includes('school')) score += 3;
                if (n.includes('park')) score += 5;
                if (n.includes('mall')) score += 2;
                if (n.includes('temple')) score += 1;
                if (n.includes('police')) score += 2;
                if (n.includes('fire')) score += 2;
                if (n.includes('road')) score += 1;
            }
            if (type === 'factory') {
                if (n.includes('hospital')) score -= 7;  // Factory next to hospital penalty
            }
            if (type === 'school') {
                if (n.includes('park')) score += 3;  // Parks near schools bonus
            }
            if (type === 'fire') {
                if (n.includes('hospital') || n.includes('police') || n.includes('fire')) score -= 5;  // Disaster penalties
                if (n.includes('road')) score += 1;
            }
            if (type === 'road') {
                // Roads connecting important buildings boost score
                let connections = 0;
                for (let b of ['home', 'school', 'hospital', 'mall', 'police', 'factory']) {
                    if (n.includes(b)) connections++;
                }
                score += connections;
            }
        }
    }
    return score;
}

function getNeighbors(x, y) {
    let neighbors = [];
    let dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (let [dx, dy] of dirs) {
        let nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize) {
            neighbors.push(grid[nx][ny]);
        }
    }
    return neighbors;
}

// AI advisor for city improvement hints
function giveAdvice() {
    aiMessages = [];
    let factoryCount = 0;
    for (let x = 0; x < gridSize; x++) {
        for (let y = 0; y < gridSize; y++) {
            let cell = grid[x][y];
            let n = getNeighbors(x, y);
            if (cell === 'factory') {
                factoryCount++;
                if (n.includes('school')) aiMessages.push(`Move factory away from school at (${x},${y})`);
                if (n.includes('hospital')) aiMessages.push(`Factory near hospital at (${x},${y}) decreases health.`);
            }
            if (cell === 'home') {
                if (!n.includes('park')) aiMessages.push('Add a park near home at (${x},${y})');
                if (!n.includes('hospital')) aiMessages.push(`Consider building hospital near home at (${x},${y})`);
            }
            if (cell === 'road') {
                if (n.filter(v => ['home', 'school', 'hospital', 'mall', 'police', 'factory'].includes(v)).length < 2) {
                    aiMessages.push(`Improve road connectivity near (${x},${y})`);
                }
            }
        }
    }
    if (factoryCount > 15) {
        aiMessages.push('Too many factories! Consider spreading them out.');
    }
}

// Show AI advice (max 3 messages)
function drawAIHints() {
    fill('rgba(255,255,255,0.9)');
    rect(0, gridSize * cellSize + 160, width, 60);
    fill('black');
    textSize(12);
    for (let i = 0; i < aiMessages.length && i < 3; i++) {
        text(aiMessages[i], width / 2, gridSize * cellSize + 170 + i * 15);
    }
}

// Save/load city to localStorage
function saveCity() {
    localStorage.setItem('cityLayout', JSON.stringify(grid));
    saveLoadMessage = 'City layout saved!';
    saveLoadTimer = millis();
}

function loadCity() {
    let saved = localStorage.getItem('cityLayout');
    if (saved) {
        grid = JSON.parse(saved);
        saveLoadMessage = 'City layout loaded!';
        saveLoadTimer = millis();
    }
}

// Show save/load messages briefly
function drawSaveLoadMessage() {
    if (saveLoadMessage && millis() - saveLoadTimer < 2000) {
        let boxX = width / 2 - 80;
        let boxY = gridSize * cellSize + 30;
        let boxW = 160;
        let boxH = 30;

        fill('black');
        rect(boxX, boxY, boxW, boxH, 5);

        fill('white');
        textSize(14);
        textAlign(CENTER, CENTER);  // <-- center horizontally & vertically
        text(saveLoadMessage, boxX + boxW / 2, boxY + boxH / 2);

        // Reset text alignment if you want (optional)
        textAlign(LEFT, BASELINE);
    }
}


// Disaster simulation: randomly place fires
function simulateDisaster() {
    let fires = [];
    for (let i = 0; i < 3; i++) {
        let x = floor(random(gridSize)), y = floor(random(gridSize));
        grid[x][y] = 'fire';
        fires.push([x, y]);
    }
    for (let [fx, fy] of fires) {
        let n = getNeighbors(fx, fy);
        if (!n.includes('fire')) aiMessages.push(`Fire alert at (${fx},${fy})! Need fire station nearby.`);
    }
}

// Animate fires flickering - currently handled in drawGrid()

function animateFires() {
    // Placeholder for potential extra animation logic
}

// Draw robot emoji moving across the grid if enabled
function drawBot() {
    if (!robotEnabled) return;
    fill(botX % 2 === 0 ? 'red' : 'black');
    textSize(24);
    text('🤖', botX * cellSize + 25, botY * cellSize + 25);
    botX = (botX + 1) % gridSize;
    if (botX === 0) botY = (botY + 1) % gridSize;
}

function getNeighbors(x, y) {
    let neighbors = [];
    let dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (let [dx, dy] of dirs) {
        let nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize) {
            neighbors.push(grid[nx][ny]);
        }
    }
    return neighbors;
}
function drawTooltip() {
    let x = floor(mouseX / cellSize), y = floor(mouseY / cellSize);
    if (x >= 0 && x < gridSize && y >= 0 && y < gridSize && grid[x][y] !== 'empty') {
        let b = grid[x][y];
        let n = getNeighbors(x, y);
        let symbol = buildingSymbols[b] || '';
        let neighborNames = n.map(nType => buildingSymbols[nType] + ' ' + nType).join(", ");

        // Tooltip box at the bottom
        let tooltipHeight = 60;
        let tooltipY = height - tooltipHeight - 20; // instead of -10


        fill(255, 255, 255, 240);
        stroke(120);
        rect(10, tooltipY, width - 20, tooltipHeight, 10);

        fill(0);
        textSize(14);
        textAlign(LEFT, TOP);
        text(`📍 (${x}, ${y}) - ${symbol} ${b}`, 20, tooltipY + 10);
        text(`👥 Neighbors: ${neighborNames}`, 20, tooltipY + 30);
    }
}
function draw() {
    background(getWeatherColor());
    displayWeather();
    drawGrid();
    drawButtons();
    drawScore();
    drawBot();
    if (!showChatBot) drawTooltip(); // Don't show tooltip if chatbot is open
    drawAIHints();
    drawSaveLoadMessage();
    animateFires();
    if (showChatBot) drawChatBot();
}


// Generates a balanced "perfect city" layout

function generatePerfectCity() {
    let center = floor(gridSize / 2);
    grid = Array.from({ length: gridSize }, () => Array(gridSize).fill('empty'));

    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            let dx = abs(x - center);
            let dy = abs(y - center);
            let distance = dx + dy;

            if (distance < 3) {
                grid[x][y] = 'hospital';
            } else if (distance < 4) {
                grid[x][y] = 'home';
            } else if (distance < 5) {
                grid[x][y] = 'school';
            } else if (distance < 6) {
                grid[x][y] = 'park';
            } else if (distance < 7) {
                grid[x][y] = 'mall';
            } else {
                grid[x][y] = random(['temple', 'police', 'road', 'factory']);
            }
        }
    }
}
