class MyScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MyScene' });
        this.hasDeviceOrientation = false;
        this.isSecondLineActive = false;  // Track activation state
    }

    preload() {
        // Load assets here
    }

    shutdown() {
        // Clean up physics bodies
        if (this.lineSegment) {
            this.matter.world.remove(this.lineSegment);
        }
        if (this.secondLineSegment) {
            this.matter.world.remove(this.secondLineSegment);
        }
        if (this.ball) {
            this.matter.world.remove(this.ball);
        }
        
        // Reset state variables
        this.isSecondLineActive = false;
        this.currentAngle = 0;
        
        // Clear graphics
        if (this.graphics) {
            this.graphics.clear();
        }
    }

    create() {
        console.log('Create function is called');
        
        // Set up Matter physics
        this.matter.world.setBounds(0, 0, window.innerWidth, window.innerHeight);
        this.matter.world.setGravity(0, 1);  // Light gravity
        
        // Calculate sizes relative to screen width
        this.lineThickness = window.innerWidth * 0.05;  // 5% of screen width
        
        // Create graphics for line visualization with thicker lines
        this.graphics = this.add.graphics({ lineStyle: { width: this.lineThickness, color: 0x00ff00 } });
        
        // Create the dark grey circle (non-physics)
        this.circleRadius = this.lineThickness * 1.5;  // 50% larger than line thickness
        this.circleOffset = this.lineThickness * 2;  // Offset above the line
        this.attachedCircle = this.add.circle(0, 0, this.circleRadius, 0x444444);
        
        // Add debug text
        this.debugText = this.add.text(10, 10, 'Debug Info', {
            fontSize: '16px',
            fill: '#fff',
            backgroundColor: '#000'
        });
        
        // Calculate ball size and position
        this.ballRadius = (window.innerWidth * 0.15) / 2;  // 15% of screen width (diameter)
        this.ballStartX = window.innerWidth * 0.75;  // 85% across screen (15% from right)
        
        // Create ball using Matter.js
        this.createBall();

        // Line properties
        this.lineLength = window.innerWidth * 0.85;  // 85% of screen width
        this.secondLineLength = window.innerWidth * 0.55;  // 75% of screen width
        this.lineCenter = {
            x: window.innerWidth / 2,
            y: window.innerHeight / 2
        };
        this.currentAngle = 0;
        this.secondLineAngle = -Math.PI / 20;

        // Create initial lines collision
        this.createLineCollisions(0);

        // Set up collision callback
        this.matter.world.on('beforeupdate', () => {
            this.checkOneWayCollision();
        });

        // Set up device orientation
        if (window.DeviceOrientationEvent) {
            console.log('Device orientation is supported');
            
            // Request permission for iOS 13+ devices
            if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                console.log('iOS device detected');
                // Create a button for iOS permission
                const button = document.createElement('button');
                button.style.position = 'fixed';
                button.style.top = '10px';
                button.style.left = '10px';
                button.style.zIndex = '1000';
                button.style.padding = '20px';
                button.style.fontSize = '18px';
                button.textContent = 'Enable Tilt Controls';
                document.body.appendChild(button);

                button.addEventListener('click', async () => {
                    try {
                        const permission = await DeviceOrientationEvent.requestPermission();
                        console.log('Permission response:', permission);
                        if (permission === 'granted') {
                            this.setupDeviceOrientation();
                            button.style.display = 'none';
                        }
                    } catch (error) {
                        console.error('Error requesting device orientation permission:', error);
                        this.debugText.setText('Error: ' + error.message);
                    }
                });
            } else {
                console.log('Non-iOS device, setting up orientation directly');
                this.setupDeviceOrientation();
            }
        } else {
            console.log('Device orientation is not supported');
            this.debugText.setText('Device orientation not supported');
        }

        // Keep pointer controls as fallback
        this.input.on('pointermove', (pointer) => {
            if (!this.hasDeviceOrientation) {
                // Map x position from 0 to width to -PI/2 to PI/2 for rotation
                const targetAngle = Phaser.Math.Linear(-Math.PI/2, Math.PI/2, pointer.x / this.sys.game.config.width);
                
                // Smooth rotation
                const rotationSpeed = 0.08;
                const angleDiff = targetAngle - this.currentAngle;
                this.currentAngle += angleDiff * rotationSpeed;
                
                // Update line collisions
                this.createLineCollisions(this.currentAngle);
            }
        });
    }

    createBall() {
        // Create ball using Matter.js
        this.ball = this.matter.add.circle(this.ballStartX, 0, this.ballRadius, {
            restitution: 0,       // No bounce for smoother rolling
            friction: 0.000005,   // Slight friction for controlled sliding
            frictionAir: 0.0005,  // Very slight air resistance
            frictionStatic: 0,    // No static friction
            density: 0.001,       // Keep it light
            render: { fillStyle: '#ff0000' }
        });

        // Set ball's collision filter
        this.ball.collisionFilter = {
            category: 0x0001,
            mask: 0x0003
        };
    }

    setupDeviceOrientation() {
        console.log('Setting up device orientation');
        this.hasDeviceOrientation = true;
        
        const handleOrientation = (event) => {
            // Log orientation values
            const debugInfo = `
                Beta (front/back): ${Math.round(event.beta)}°
                Gamma (left/right): ${Math.round(event.gamma)}°
                Alpha (compass): ${Math.round(event.alpha)}°
            `;
            this.debugText.setText(debugInfo);

            if (event.gamma === null) {
                console.log('No gamma value available');
                return;
            }

            // gamma is the left-to-right tilt in degrees, where right is positive
            const gamma = event.gamma;
            
            // Convert gamma to our angle range (-90 to 90 degrees)
            // Clamp the value between -90 and 90
            const clampedGamma = Phaser.Math.Clamp(gamma, -90, 90);
            
            // Convert to radians and map to our desired range
            const targetAngle = (clampedGamma / 90) * (Math.PI / 2);
            
            // Smooth rotation
            const rotationSpeed = 0.1; // Increased for more responsive rotation
            const angleDiff = targetAngle - this.currentAngle;
            this.currentAngle += angleDiff * rotationSpeed;
            
            // Update line collisions
            this.createLineCollisions(this.currentAngle);
        };

        // Add error handling
        const handleOrientationError = (error) => {
            console.error('Orientation error:', error);
            this.debugText.setText('Orientation error: ' + error.message);
        };

        try {
            window.addEventListener('deviceorientation', handleOrientation, true);
            window.addEventListener('error', handleOrientationError);
            
            // Test if we're getting events
            setTimeout(() => {
                if (!this.hasReceivedOrientationEvent) {
                    console.log('No orientation events received after 1 second');
                    this.debugText.setText('No orientation events received\nFalling back to touch controls');
                    this.hasDeviceOrientation = false;
                }
            }, 1000);
        } catch (error) {
            console.error('Error setting up orientation:', error);
            this.debugText.setText('Setup error: ' + error.message);
        }
    }

    checkOneWayCollision() {
        if (!this.ball || !this.secondLineSegment) return;

        // Access Matter.js bodies directly
        const ballBody = this.ball;
        const lineBody = this.secondLineSegment;

        if (!ballBody || !lineBody) return;

        const ballPos = ballBody.position;
        const lineAngle = lineBody.angle;
        const lineCenter = lineBody.position;

        // Calculate normal vector of the line (perpendicular to line angle)
        const normalX = Math.cos(lineAngle + Math.PI/2);
        const normalY = Math.sin(lineAngle + Math.PI/2);

        // Vector from line to ball
        const dx = ballPos.x - lineCenter.x;
        const dy = ballPos.y - lineCenter.y;

        // Project ball's position onto line normal
        const projection = dx * normalX + dy * normalY;

        // Ball velocity from Matter.js body
        const velocity = {
            x: ballBody.velocity.x,
            y: ballBody.velocity.y
        };
        
        // Project velocity onto normal
        const velocityProjection = velocity.x * normalX + velocity.y * normalY;

        // If ball is on the left side (negative projection) and moving towards the line (positive velocity projection)
        if (projection < 0 && velocityProjection > 0) {
            // Enable collision
            lineBody.collisionFilter.mask = 1;
        } else {
            // Disable collision
            lineBody.collisionFilter.mask = 0;
        }
    }

    createLineCollisions(angle) {
        // Remove old lines if they exist
        if (this.lineSegment) {
            this.matter.world.remove(this.lineSegment);
        }
        if (this.secondLineSegment) {
            this.matter.world.remove(this.secondLineSegment);
        }

        // Calculate intersection point (25% from left of main line)
        const intersectionOffset = -this.lineLength * 0.25;
        const intersectX = this.lineCenter.x + Math.cos(angle) * intersectionOffset;
        const intersectY = this.lineCenter.y + Math.sin(angle) * intersectionOffset;

        // Create the main line segment
        this.lineSegment = this.matter.add.rectangle(
            this.lineCenter.x,
            this.lineCenter.y,
            this.lineLength,
            this.lineThickness,
            {
                isStatic: true,
                angle: angle,
                friction: 0,
                frictionStatic: 0,
                restitution: 0,
                render: { fillStyle: '#00ff00' }
            }
        );

        // Create the second line segment - only add physics body if active
        if (this.isSecondLineActive) {
            // Position the second line to start at intersection point
            const secondLineHalfLength = this.secondLineLength / 2;
            const secondLineCenterX = intersectX + Math.cos(angle + this.secondLineAngle) * secondLineHalfLength;
            const secondLineCenterY = intersectY + Math.sin(angle + this.secondLineAngle) * secondLineHalfLength;
            
            this.secondLineSegment = this.matter.add.rectangle(
                secondLineCenterX,
                secondLineCenterY,
                this.secondLineLength,
                this.lineThickness,
                {
                    isStatic: true,
                    angle: angle + this.secondLineAngle,
                    friction: 0,
                    frictionStatic: 0,
                    restitution: 0,
                    render: { fillStyle: '#00ff00' }
                }
            );
        } else {
            // Store the position and angle for rendering
            this.secondLinePosition = { x: intersectX, y: intersectY };
            this.secondLineAngleTotal = angle + this.secondLineAngle;
        }

        // Set ball's collision filter
        this.ball.collisionFilter = {
            category: 0x0001,
            mask: 0x0003
        };
    }

    checkBallCircleCollision() {
        if (!this.ball || this.isSecondLineActive) return;

        const dx = this.ball.position.x - this.attachedCircle.x;
        const dy = this.ball.position.y - this.attachedCircle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.circleRadius + this.ballRadius) {
            this.isSecondLineActive = true;
            this.createLineCollisions(this.lineSegment.angle);
        }
    }

    update() {
        // Check if ball is in bottom 10% of screen
        if (this.ball && this.ball.position.y > window.innerHeight * 0.9) {
            // Reset state variables and restart the scene
            this.isSecondLineActive = false;  // Reset activation state
            this.scene.restart();
            return;
        }

        // Check for ball-circle collision
        this.checkBallCircleCollision();

        // Draw the lines
        this.graphics.clear();
        
        // Draw main line
        const angle = this.lineSegment.angle;
        const halfLength = this.lineLength / 2;
        const startX = this.lineCenter.x - Math.cos(angle) * halfLength;
        const startY = this.lineCenter.y - Math.sin(angle) * halfLength;
        const endX = this.lineCenter.x + Math.cos(angle) * halfLength;
        const endY = this.lineCenter.y + Math.sin(angle) * halfLength;
        
        // Calculate position above the line using perpendicular vector
        const perpX = Math.sin(angle) * this.circleOffset;
        const perpY = -Math.cos(angle) * this.circleOffset;
        // Adjust for circle radius to align left edge with line end
        const radiusOffsetX = Math.cos(angle) * this.circleRadius;
        const radiusOffsetY = Math.sin(angle) * this.circleRadius;
        this.attachedCircle.setPosition(startX + perpX + radiusOffsetX, startY + perpY + radiusOffsetY);
        
        this.graphics.lineStyle(this.lineThickness, 0x00ff00);
        this.graphics.beginPath();
        this.graphics.moveTo(startX, startY);
        this.graphics.lineTo(endX, endY);
        this.graphics.strokePath();

        // Draw second line
        const intersectionOffset = -this.lineLength * 0.25;
        const intersectX = this.lineCenter.x + Math.cos(angle) * intersectionOffset;
        const intersectY = this.lineCenter.y + Math.sin(angle) * intersectionOffset;
        
        const secondAngle = angle + this.secondLineAngle;
        // Draw the second line starting from intersection point
        const secondEndX = intersectX + Math.cos(secondAngle) * this.secondLineLength;
        const secondEndY = intersectY + Math.sin(secondAngle) * this.secondLineLength;
        
        // Set opacity based on activation state
        this.graphics.lineStyle(this.lineThickness, 0x00ff00, this.isSecondLineActive ? 1 : 0.5);
        this.graphics.beginPath();
        this.graphics.moveTo(intersectX, intersectY);
        this.graphics.lineTo(secondEndX, secondEndY);
        this.graphics.strokePath();
    }
}

const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#000000',
    physics: {
        default: 'matter',
        matter: {
            debug: true,
            gravity: { y: 0.3 }
        }
    },
    scene: MyScene
};

const game = new Phaser.Game(config);