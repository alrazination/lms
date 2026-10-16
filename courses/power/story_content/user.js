window.InitUserScripts = function()
{
var player = GetPlayer();
var object = player.object;
var once = player.once;
var addToTimeline = player.addToTimeline;
var setVar = player.SetVar;
var getVar = player.GetVar;
var update = player.update;
var pointerX = player.pointerX;
var pointerY = player.pointerY;
var showPointer = player.showPointer;
var hidePointer = player.hidePointer;
var slideWidth = player.slideWidth;
var slideHeight = player.slideHeight;
var getKeyDown = player.getKeyDown;
var keydown = player.keydown;
var keyup = player.keyup;
window.Script1 = function()
{
  // 1. Stop the running interval loop if it exists
if (window.courseTimer) {
  clearInterval(window.courseTimer);
  window.courseTimer = null;
}

// 2. Reset the Storyline variables back to initial state
var player = GetPlayer();
player.SetVar("TimerStarted", false);
player.SetVar("TimeUp", false);
player.SetVar("Time", "02:00");
player.SetVar("TimeInSeconds", 120);
player.SetVar("Fscore", 0);
player.SetVar("TotalScore", 0);
player.SetVar("TimeBonus", 0);
}

window.Script2 = function()
{
  var player = GetPlayer();
var isStarted = player.GetVar("TimerStarted");

if (!isStarted) {
  player.SetVar("TimerStarted", true);
  var totalSeconds = 120;

  window.courseTimer = setInterval(function() {
    if (totalSeconds <= 0) {
      player.SetVar("Time", "00:00");
      player.SetVar("TimeInSeconds", 0);
      player.SetVar("TimeUp", true);
      clearInterval(window.courseTimer);
    } else {
      totalSeconds--;
      var minutes = Math.floor(totalSeconds / 60);
      var seconds = totalSeconds % 60;
      
      var formattedTime = 
        (minutes < 10 ? "0" + minutes : minutes) + ":" + 
        (seconds < 10 ? "0" + seconds : seconds);
      
      player.SetVar("Time", formattedTime);
      player.SetVar("TimeInSeconds", totalSeconds); // Sends standard number to Storyline
    }
  }, 1000);
}
}

window.Script3 = function()
{
  var player = GetPlayer();

// 1. Get the current string from the Time variable (e.g., "02:45")
var timeString = player.GetVar("Time") || "00:00";

// 2. Split into minutes and seconds
var timeParts = timeString.split(":");
var mins = parseInt(timeParts[0], 10) || 0;
var secs = parseInt(timeParts[1], 10) || 0;

// 3. Convert to bonus points (e.g., 02:45 -> 2.45)
var timeBonus = mins + (secs / 100);

timeBonus = Math.round(timeBonus * 100) / 100; // clean up rounding errors

// 4. Get Fscore, multiply by 10, and calculate TotalScore
var fScore = player.GetVar("Fscore") || 0;
var totalScore = (fScore) + timeBonus;

// 5. Send values back to Storyline
player.SetVar("TimeBonus", timeBonus);
player.SetVar("TotalScore", totalScore);
}

window.Script4 = function()
{
  var player = GetPlayer();

// 1. Fetch TotalScore from Storyline
var totalScore = player.GetVar("TotalScore") || 0;

// 2. Write raw score directly to LMS
try {
  // SCORM 1.2
  if (typeof SCORM_CallLMSSetValue !== 'undefined') {
    SCORM_CallLMSSetValue("cmi.core.score.raw", totalScore);
    SCORM_CallLMSCommit();
  } 
  // SCORM 2004
  else if (typeof SCORM2004_CallSetValue !== 'undefined') {
    SCORM2004_CallSetValue("cmi.score.raw", totalScore);
    SCORM2004_CallCommit();
  }
} catch (e) {
  console.log("SCORM score submission error: ", e);
}
}

window.Script5 = function()
{
  // Function to dynamically load the confetti library
function loadScript(url, callback) {
  if (window.confetti) {
    callback();
    return;
  }
  var script = document.createElement("script");
  script.src = url;
  script.onload = callback;
  document.head.appendChild(script);
}

// Start continuous, full-screen confetti
loadScript("https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js", function() {
  
  // Clear any existing active timer to prevent stacking
  if (window.continuousConfettiTimer) {
    clearInterval(window.continuousConfettiTimer);
  }

  // Loop confetti cannon across both left and right edges
  window.continuousConfettiTimer = setInterval(function() {
    // Left edge burst
    confetti({
      particleCount: 12,
      angle: 60,
      spread: 70,
      origin: { x: 0, y: 0.7 },
      zIndex: 9999
    });
    
    // Right edge burst
    confetti({
      particleCount: 12,
      angle: 120,
      spread: 70,
      origin: { x: 1, y: 0.7 },
      zIndex: 9999
    });
  }, 250); // Fires every 250ms for a steady continuous flow
});
}

window.Script6 = function()
{
  // Check if the timer exists and clear it
if (window.continuousConfettiTimer) {
  clearInterval(window.continuousConfettiTimer);
  window.continuousConfettiTimer = null;
}
}

window.Script7 = function()
{
  // Check if the timer exists and clear it
if (window.continuousConfettiTimer) {
  clearInterval(window.continuousConfettiTimer);
  window.continuousConfettiTimer = null;
}
}

window.Script8 = function()
{
  // Check if the timer exists and clear it
if (window.continuousConfettiTimer) {
  clearInterval(window.continuousConfettiTimer);
  window.continuousConfettiTimer = null;
}
}

};
