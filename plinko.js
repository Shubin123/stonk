import { app, BrowserWindow } from 'electron';

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false, // Disable context isolation for simplicity
        }
    });

    // Inline HTML content
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Plinko Game</title>
        <style>
            canvas {
                display: block;
                margin: 0 auto;
                background: #282c34;
            }


        </style>
    </head>
    <body>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js"></script>
        <script>
        const { Engine, Render, Runner, Bodies, Composite, World, Events, Body } = Matter;

// Create engine and world
const engine = Engine.create();
const { world } = engine;

// Create the renderer
const render = Render.create({
    element: document.body,
    engine: engine,
    options: {
        width: 800,
        height: 600,
        wireframes: false,
    }
});

Render.run(render);
const runner = Runner.create();
Runner.run(runner, engine);

// Ground and walls
const ground = Bodies.rectangle(400, 590, 810, 40, { isStatic: true });
const leftWall = Bodies.rectangle(10, 300, 20, 600, { isStatic: true });
const rightWall = Bodies.rectangle(790, 300, 20, 600, { isStatic: true });
World.add(world, [ground, leftWall, rightWall]);

// Collision filtering categories
const ballCategory = 0x0001;
const pegCategory = 0x0002;

// Create pegs
const rows = 8;
const cols = 12;
const pegRadius = 15;

const pegs = [];
for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
        const x = 100 + col * 60 + (row % 2 === 0 ? 30 : 0);
        const y = 100 + row * 60;
        const peg = Bodies.circle(x, y, pegRadius, {
            isStatic: true,
            collisionFilter: {
                category: pegCategory,
            }
        });
        pegs.push(peg);
        World.add(world, peg);
    }
}

// Add a ball and prevent ball-to-ball collisions
function addBall() {
    const ball = Bodies.circle(400, 0, 15, {
        restitution: 0.5,   
        friction: 0,
        frictionAir: 0.001,
        collisionFilter: {
            category: ballCategory, // Ball category
            mask: pegCategory | 0x0004, // Collide with pegs and static objects only
        }
    });

    // Add collision handling to nudge ball left or right on peg collision
    Events.on(engine, "collisionStart", (event) => {
        event.pairs.forEach(({ bodyA, bodyB }) => {
            const isBall = bodyA === ball || bodyB === ball;
            const isPeg = pegs.includes(bodyA) || pegs.includes(bodyB);

            if (isBall && isPeg) {
                const nudge = Math.random() > 0.5 ? 1 : -1;
                const nudgeForce = 0.05 * nudge;
                Body.setVelocity(ball, {
                    x: ball.velocity.x + nudgeForce,
                    y: ball.velocity.y
                });
            }
        });
    });

    // Delete the ball when it reaches the bottom
    Events.on(engine, "afterUpdate", () => {
        if (ball.position.y > 600) {
            World.remove(world, ball); // Remove the ball from the world
        }
    });

    World.add(world, ball);
}

// Add a ball every second
setInterval(addBall, 10);


        </script>
    </body>
    </html>
    `;

    // Load the HTML content directly
    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
