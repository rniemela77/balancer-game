class MyScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MyScene' });
    }

    preload() {
        // Load assets here
    }

    create() {
        console.log('Create function is called');
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

    update() {
        this.graphics.clear();
        const points = this.curve.getPoints(32);
        for (let i = 1; i < points.length; i++) {
            this.graphics.lineBetween(points[i-1].x, points[i-1].y, points[i].x, points[i].y);
        }
    }
}

const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: MyScene
};

const game = new Phaser.Game(config);