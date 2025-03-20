let bodyPose;
let video;
let poses = [];
let connections;
let balls = [];
let score = 0;
let containerWidth, containerHeight;
let isModelReady = false;
let lastBallCreationTime = 0;

function preload() {
  // Load the bodyPose model - but don't block other setup
  console.log("Loading bodyPose model...");
}

function setup() {
  // Get container dimensions from TouchDesigner
  containerWidth = windowWidth;
  containerHeight = windowHeight;
  
  // Create canvas that fills the TouchDesigner container
  createCanvas(containerWidth, containerHeight);
  
  // Initialize bodyPose separately to avoid blocking
  bodyPose = ml5.bodyPose({
    architecture: 'MobileNetV1', // Use lightweight model for better performance
    imageScaleFactor: 0.5,      // Scale down image for faster processing
    outputStride: 16,           // Larger stride = faster but less accurate
    flipHorizontal: true,       // Mirror the camera for more intuitive interaction
    minConfidence: 0.1,        // Lower threshold for keypoints
    maxPoseDetections: 1,      // Only detect one person for performance
    scoreThreshold: 0.5,
    nmsRadius: 20,
    detectionType: 'single',   // Only detect a single pose
  }, modelReady);
  
  // Create the video and scale it to match canvas size
  video = createCapture(VIDEO);
  video.size(containerWidth, containerHeight);
  video.hide();
  
  // Create initial balls
  createInitialBalls();
  
  // Use a frame rate that balances smoothness and performance
  frameRate(30);
}

function modelReady() {
  console.log("Model is ready!");
  isModelReady = true;
  bodyPose.detectStart(video, gotPoses);
  
  // Get skeleton connections
  connections = bodyPose.getSkeleton();
}

// Handle window resizing in TouchDesigner
function windowResized() {
  containerWidth = windowWidth;
  containerHeight = windowHeight;
  resizeCanvas(containerWidth, containerHeight);
  video.size(containerWidth, containerHeight);
}

// Create initial set of balls
function createInitialBalls() {
  for (let i = 0; i < 5; i++) {
    balls.push({
      x: random(20, containerWidth - 20),
      y: random(-100, -20), // Stagger the starting positions
      size: random(30, 50),
      speed: random(1, 4),
      touched: false,
      color: color(0, 0, 139, 220) // Add transparency for a nicer look
    });
  }
  lastBallCreationTime = millis();
}

// Callback function for when the model returns pose data
function gotPoses(results) {
  poses = results;
}

function draw() {
  // Clear the background first
  background(0, 10); // Semi-transparent background for motion trails
  
  // Display the video with a slight opacity for better visibility of game elements
  tint(255, 200);
  image(video, 0, 0, width, height);
  noTint();
  
  // Update and draw balls
  updateBalls();
  
  // Only process poses if the model is ready
  if (isModelReady && poses.length > 0) {
    // Draw the skeleton connections
    for (let i = 0; i < poses.length; i++) {
      let pose = poses[i];
      drawSkeleton(pose);
      drawKeypoints(pose);
    }
  } else if (!isModelReady) {
    // Show loading indicator
    drawLoadingIndicator();
  }
  
  // Draw score
  drawScore();
  
  // Draw FPS counter for debugging
  drawFPS();
}

function drawLoadingIndicator() {
  fill(255);
  textSize(32);
  textAlign(CENTER, CENTER);
  text("Loading pose detection model...", width/2, height/2);
  
  // Draw animated loading circle
  push();
  translate(width/2, height/2 + 50);
  rotate(frameCount * 0.1);
  noFill();
  stroke(255);
  strokeWeight(4);
  arc(0, 0, 50, 50, 0, PI + HALF_PI);
  pop();
}

function drawSkeleton(pose) {
  // Only draw skeleton if connections are available
  if (!connections) return;
  
  for (let j = 0; j < connections.length; j++) {
    let pointAIndex = connections[j][0];
    let pointBIndex = connections[j][1];
    
    // Make sure indices are valid
    if (pointAIndex >= pose.keypoints.length || pointBIndex >= pose.keypoints.length) continue;
    
    let pointA = pose.keypoints[pointAIndex];
    let pointB = pose.keypoints[pointBIndex];
    
    // Only draw a line if we have confidence in both points
    if (pointA.confidence > 0.1 && pointB.confidence > 0.1) {
      stroke(255, 0, 0, 180); // Semi-transparent red
      strokeWeight(2);
      line(pointA.x, pointA.y, pointB.x, pointB.y);
    }
  }
}

function drawKeypoints(pose) {
  // Iterate through all the keypoints for the pose
  for (let j = 0; j < pose.keypoints.length; j++) {
    let keypoint = pose.keypoints[j];
    
    // Only draw a circle if the keypoint's confidence is greater than 0.1
    if (keypoint.confidence > 0.1) {
      // Highlight wrist points differently
      if (j === 9 || j === 10) {
        fill(255, 255, 0); // Yellow for wrists
        noStroke();
        circle(keypoint.x, keypoint.y, 15);
        
        // Draw a glow effect
        drawGlow(keypoint.x, keypoint.y, 25, color(255, 255, 0, 100));
        
        // Check for collision with balls
        checkBallCollision(keypoint.x, keypoint.y);
      } else {
        // Regular keypoints
        fill(0, 255, 0);
        noStroke();
        circle(keypoint.x, keypoint.y, 8);
      }
    }
  }
}

function drawGlow(x, y, size, glowColor) {
  noStroke();
  
  // Create a gradient glow effect
  for (let i = size; i > 0; i -= 2) {
    let alpha = map(i, 0, size, 0, 100);
    fill(red(glowColor), green(glowColor), blue(glowColor), alpha);
    circle(x, y, i);
  }
}

// Create a new ball at a random x position at the top of the screen
function createNewBall() {
  balls.push({
    x: random(20, width - 20),
    y: -20,
    size: random(30, 50),
    speed: random(1, 4),
    touched: false,
    color: color(0, 0, 139, 220) // Original color with alpha
  });
  lastBallCreationTime = millis();
}

function updateBalls() {
  // Remove balls that have fallen off the bottom
  balls = balls.filter(ball => ball.y < height + ball.size);
  
  // Add new balls at a controlled rate
  const currentTime = millis();
  if ((currentTime - lastBallCreationTime > 2000 || balls.length < 3) && balls.length < 15) {
    createNewBall();
  }
  
  // Update and draw each ball
  for (let i = 0; i < balls.length; i++) {
    let ball = balls[i];
    
    // Update position with a small amount of randomness for natural movement
    ball.y += ball.speed;
    ball.x += random(-0.5, 0.5); // Slight horizontal drift
    
    // Draw the ball with a glow effect
    if (ball.touched) {
      // Draw the glow first
      drawGlow(ball.x, ball.y, ball.size * 1.5, color(255, 0, 0, 60));
      
      // Then draw the ball
      fill(139, 0, 0, 220); // Dark red for touched balls
    } else {
      // Draw slight glow for untouched balls too
      drawGlow(ball.x, ball.y, ball.size * 1.2, color(0, 0, 255, 40));
      
      // Then draw the ball
      fill(0, 0, 139, 220); // Dark blue for untouched balls
    }
    
    noStroke();
    circle(ball.x, ball.y, ball.size);
  }
}

function checkBallCollision(x, y) {
  for (let i = 0; i < balls.length; i++) {
    let ball = balls[i];
    
    // Calculate distance between keypoint and ball
    let d = dist(x, y, ball.x, ball.y);
    
    // If the distance is less than the ball's radius and the ball hasn't been touched yet
    if (d < ball.size / 2 && !ball.touched) {
      ball.touched = true;
      score++;
      
      // Add visual feedback
      // Increase the ball's size briefly for visual feedback
      ball.size *= 1.5;
      
      // Speed up the ball as it falls
      ball.speed *= 1.5;
    }
  }
}

function drawScore() {
  // Draw a semi-transparent background for better readability
  noStroke();
  fill(0, 0, 0, 150);
  rect(10, 10, 150, 50, 10);
  
  // Draw score with size relative to canvas
  const fontSize = width / 20;
  fill(255);
  noStroke();
  textSize(fontSize);
  textAlign(LEFT, TOP);
  text("Score: " + score, 20, 20);
}

function drawFPS() {
  // Draw FPS counter
  fill(255);
  noStroke();
  textSize(12);
  textAlign(RIGHT, TOP);
  text("FPS: " + floor(frameRate()), width - 20, 20);
}
