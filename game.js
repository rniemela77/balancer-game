const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

function preload() {
    // Load assets here
}

function create() {
    // Initialize game objects here
    this.graphics = this.add.graphics({ lineStyle: { width: 4, color: 0x00ff00 } });
    this.curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(100, 300), new Phaser.Math.Vector2(400, 500), new Phaser.Math.Vector2(700, 300));
    this.ball = this.add.circle(400, 0, 10, 0xff0000);
    this.physics.add.existing(this.ball);
    this.ball.body.setGravityY(300);

    this.input.on('pointermove', (pointer) => {
        const angle = Phaser.Math.Linear(0, Math.PI / 4, pointer.x / this.sys.game.config.width);
        this.curve.p0.set(100, 300);
        this.curve.p1.set(400, 500 + Math.sin(angle) * 100);
        this.curve.p2.set(700, 300);
    });
}

function update() {
    // Clear previous graphics
    this.graphics.clear();
    // Draw the curve
    this.graphics.strokeCurve(this.curve);
}