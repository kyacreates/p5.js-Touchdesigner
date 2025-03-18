let bodyPose;
let video;
let poses = [];
let connections;
let balls = [];
let score = 0;

function preload() {
  // Load the bodyPose model
  bodyPose = ml5.bodyPose();
}

function setup() {
  // Get the skeleton connection information
  connections = bodyPose.getSkeleton();
  createCanvas(640, 480);
  // Create the video and hide it
  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();
  bodyPose.detectStart(video, gotPoses);
  // Create initial balls
  for (let i = 0; i < 5; i++) {
    createNewBall();
  }
}

// Callback function for when the model returns pose data
function gotPoses(results) {
  // Store the model's results in a global variable
  poses = results;
}

function draw() {
  // Display the video
  image(video, 0, 0, width, height);
  
  // Draw the skeleton connections
  for (let i = 0; i < poses.length; i++) {
    let pose = poses[i];
    for (let j = 0; j < connections.length; j++) {
      let pointAIndex = connections[j][0];
      let pointBIndex = connections[j][1];
      let pointA = pose.keypoints[pointAIndex];
      let pointB = pose.keypoints[pointBIndex];
      // Only draw a line if we have confidence in both points
      if (pointA.confidence > 0.1 && pointB.confidence > 0.1) {
        stroke(255, 0, 0);
        strokeWeight(2);
        line(pointA.x, pointA.y, pointB.x, pointB.y);
      }
    }
  }
  
  // Update and draw balls first (so they appear behind the keypoints)
  updateBalls();
  
  // Iterate through all the poses
  for (let i = 0; i < poses.length; i++) {
    let pose = poses[i];
    // Iterate through all the keypoints for each pose
    for (let j = 0; j < pose.keypoints.length; j++) {
      let keypoint = pose.keypoints[j];
      // Only draw a circle if the keypoint's confidence is greater than 0.1
      if (keypoint.confidence > 0.1) {
        fill(0, 255, 0);
        noStroke();
        circle(keypoint.x, keypoint.y, 10);
        
        // Check for collision with balls only for wrist keypoints (9 and 10 are wrist indices in most pose models)
        if (j === 9 || j === 10) {
          checkBallCollision(keypoint.x, keypoint.y);
        }
      }
    }
  }
  
  // Draw score
  drawScore();
}

// Create a new ball at a random x position at the top of the screen
function createNewBall() {
  balls.push({
    x: random(20, width - 20),
    y: -20,
    size: random(30, 50),
    speed: random(1, 4),
    touched: false
  });
}

function updateBalls() {
  // Remove balls that have fallen off the bottom
  balls = balls.filter(ball => ball.y < height + ball.size);
  
  // Add new balls occasionally
  if (frameCount % 60 === 0 || balls.length < 3) {
    createNewBall();
  }
  
  // Update and draw each ball
  for (let i = 0; i < balls.length; i++) {
    let ball = balls[i];
    // Update position
    ball.y += ball.speed;
    
    // Draw the ball
    noStroke();
    if (ball.touched) {
      fill(139, 0, 0); // Dark red for touched balls
    } else {
      fill(0, 0, 139); // Dark blue for untouched balls
    }
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
      // Optional: Play a sound or add other feedback here
    }
  }
}

function drawScore() {
  // Draw score in the top-left corner
  fill(255);
  stroke(0);
  strokeWeight(2);
  textSize(32);
  textAlign(LEFT, TOP);
  text("Score: " + score, 20, 20);
}