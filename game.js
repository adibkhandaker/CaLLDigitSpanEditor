/********************************************
 * Digit Span Studio — game copy
 * Forked from ../digit-span 2/forward-digit-span.js.
 * Settings kids can edit live come from studio-bridge.js (the `studio` object).
 ********************************************/

/********************************************
 * 1. Initialize jsPsych and visual elements *
 ********************************************/

//Initialize jsPsych and define target to display jsPsych content 
var jsPsych = initJsPsych({
  display_element: "jspsych-target"    /*figured this out with ChatGPT*/
});


//Fullscreen wrapper. Necessaray to append elements to body without 
//messing up jsPsych content
var wrapper = document.createElement("div");
wrapper.id = "wrapper";

// Decorative bottom floor plane
var floorPlane = document.createElement("div");
floorPlane.className = "floor-plane";
floorPlane.setAttribute("aria-hidden", "true");



//Container for monster-cookies-score and kitchen
var kitchen_container = document.createElement("div");
kitchen_container.id = "monster-kitchen";

//Kitchen jpg
var kitchen = document.createElement("div");
kitchen.id = "kitchen"

//jsPsych content
var jsPsychContent = document.getElementById("jspsych-target")

//Monster
var monster = document.createElement("div");
monster.id = "monster-container";

//Main container for monster, cookies, and score
var container = document.createElement("div");
  container.id = "monster-cookies-score";

//Monster-cookies-score and kitchen are siblings (horizontal)
kitchen_container.appendChild(container);
kitchen_container.appendChild(kitchen);

//Monster and jsPsych contnent are siblings (vertical)
wrapper.appendChild(jsPsychContent);
wrapper.appendChild(monster);

document.body.appendChild(floorPlane);
document.body.appendChild(kitchen_container);
document.body.appendChild(wrapper);

/********************************************
 * 2. Global variables and task functions  *
 ********************************************/

var useAudio = false; // change to false if you want this to be a visual task!

var currentDigitList; //current digit list
var totalCorrect = 0; //counter for total correct
var totalTrials = 0; //counter for total trials
var totalScore = 0; //counter for total trials
var maxSpan = 0; //value that will reflect a participant's maximum span (e.g., 6)
var folder = "public/audio/"; //folder name for storing the audio files
var fdsTrialNum = 1; //counter for trials
var fdsTotalTrials = 12; //total number of desired trials
var response = []; //for storing partcipants' responses
var fds_correct_ans; //for storing the correct answer on a given trial
var tutorial_correct_ans = [4, 9, 3];
var staircaseChecker = []; //for assessing whether the span should move up/down/stay
var staircaseIndex = 0; //index for the current staircase
var digit_list = [1, 2, 3, 4, 5, 6, 7, 8, 9]; //digits to be used (unlikely you will want to change this)
var responseTimes = []; // Store all response times
var lastResponse = [];
var tutorialScore = 0;
var practice = true;

function showPracticeChip() {
  if (document.getElementById('practice-chip')) return;
  var chip = document.createElement('div');
  chip.id = 'practice-chip';
  chip.className = 'practice-chip';
  chip.textContent = 'Practice';
  document.body.appendChild(chip);
}

function hidePracticeChip() {
  var chip = document.getElementById('practice-chip');
  if (chip) chip.remove();
}
var numsSeen = 0; // for logging how many digits the p sees to report overall accuracy percentage
var numPerfect = 0; // for tracking how many perfect responses the p gives

var startingSpan = 3; //where we begin in terms of span
var currentSpan; //to reference where participants currently are
var spanHistory = []; //easy loging of the participant's trajectory
var stimList; //this is going to house the ordering of the stimuli for each trial
var idx = 0; //for indexing the current letter to be presented
var exitLetters; //for exiting the letter loop

var root = document.documentElement;

var timeline = []; //jsPsych timeline
var subject; //participant ID



const arrSum = (arr) => arr.reduce((a, b) => a + b, 0); //simple variable for calculating sum of an array
var aud_digits = [
  "one.mp3",
  "two.mp3",
  "three.mp3",
  "four.mp3",
  "five.mp3",
  "six.mp3",
  "seven.mp3",
  "eight.mp3",
  "nine.mp3",
]; //the digits

//add to the dataframe whether the FDS was auditory or visual
jsPsych.data.addProperties({
  FDS_modality: useAudio ? "auditory" : "visual",
});

//file map for use in the auditory implementation
var fileMap = {
  1: "one.mp3",
  2: "two.mp3",
  3: "three.mp3",
  4: "four.mp3",
  5: "five.mp3",
  6: "six.mp3",
  7: "seven.mp3",
  8: "eight.mp3",
  9: "nine.mp3",
};

//function to push button responses to array
function recordClick(num) {
  response.push(num);
  document.getElementById("echoed_txt").innerHTML = response.join(", ");
}

// Function to clear the response array
function backspace() {
  let lastRemoved = response.pop(); // Get the last number removed
    document.getElementById("echoed_txt").innerHTML = response.join(", ");
}

//function to map digit names to audio files (for auditory FDS)
var digitToFile = function (digit) {
  return folder + fileMap[digit];
};

//function to shuffle an array (Fisher-Yates)
function shuffle(a) {
  var j, x, i;
  for (i = a.length - 1; i > 0; i--) {
    j = Math.floor(Math.random() * (i + 1));
    x = a[i];
    a[i] = a[j];
    a[j] = x;
  }
  return a;
}

//function to get digit list for a trial
function getDigitList(len) {
  var shuff_final = [];
  //shuffle the digit list
  if (len <= digit_list.length) {
    shuff_final = shuffle(digit_list);
  } else {
    //this is overkill (generating too many digits) but it works and we slice it later anyway
    for (var j = 0; j < len; j++) {
      var interim_digits = shuffle(digit_list);
      shuff_final = [...shuff_final, ...interim_digits];
    }
  }
  var digitList = shuff_final.slice(0, len); //array to hold the final digits
  return digitList;
}

//function to push the stimuli to an array
function getStimuli(numDigits) {
  var digit;
  var stimList = [];
  currentDigitList = getDigitList(numDigits);
  for (var i = 0; i < currentDigitList.length; i += 1) {
    if (useAudio) {
      digit = currentDigitList[i];
      stimList.push(digitToFile(digit));
    } else {
      digit = currentDigitList[i].toString();
      stimList.push(
        '<p class="digits">' + digit + "</p>",
      );
    }
  }
  fds_correct_ans = currentDigitList; //this is the reversed array for assessing performance
  return stimList;
}


//function to update the span as appropriate (using a 1:2 staircase procedure)
function updateSpan() {
  //if they got the last trial correct, increase the span.
  if (arrSum(staircaseChecker) == 1 ) {
    currentSpan += 1; //add to the span if last trial was correct
    staircaseChecker = []; //reset the staircase checker
    staircaseIndex = 0; //reset the staircase index
    totalCorrect += 1;
    //if they got the last two trials incorrect, decrease the span
  } else if (arrSum(staircaseChecker) == 0) {
    if (staircaseChecker.length == 2) {
      currentSpan -= 1; //lower the span if last two trials were incorrect
      if (currentSpan == 0) {
        currentSpan = 1; //make sure the experiment cannot break with exceptionally poor performance (floor of 1 digit)
      }
      staircaseChecker = []; //reset the staircase checker
      staircaseIndex = 0; //reset the staircase index
    }
  } else {
    return false;
  }
}


// Function to load sounds only if useAudio is set to true in fds_adaptive.js
function loadSounds() {
  if (useAudio) {
    return fds_sounds;
  } else {
    return null;
  }
}

//Function to give the option for a local save of the data
var localSave;

function saveData() {
  if (localSave == 1) {
    var identifier = "FDS_" + Math.round(new Date().getTime() / 1000) + ".csv";
    jsPsych.data.get().localSave("csv", identifier);
    alert("You may now close this tab.");
  } else {
    alert("You may now close this tab.");
  }
}


/************************************
* 3. Animations and sound effects *
/************************************/

var nCookie = 1; //define how many cookies should be dropped
var height = -100; //define height of bounce animation 
var lastScale = 1; //store previous size for monster grow animation
var newScale = 1.12; //define what size monster should grow to
var lastMonsterY = 0; //store previous monster position for monster grow animation
var newMonsterY = -30; //define where monster should move to
var dropDistance = 0; //define distance cookies should drop based on screen resolution

//These functions trigger specific audio. 
//If the sound comes from the monster, they also make the monster's mouth move
function sayBoing() {
    const audio = new Audio("public/audio/boing.mp3");
    audio.currentTime = 0;
    audio.play();
}

function growNoise() {
    const audio = new Audio("public/audio/cute_grow.mp3");
    audio.currentTime = 0;
    audio.play();
}

function chomp() {
    const audio = new Audio("public/audio/cartoon_eat.mp3");
    audio.currentTime = 0.8;
    audio.volume = 0.2;
    audio.play();
}

function sayWeehee() {
    const audio = new Audio("public/audio/weehee.mp3");
    triggerSpeak();
    audio.play();
}

function sayHello() {
    const audio = new Audio("public/audio/cute_hello.mp3");
    audio.play();
}

function sayYummy() {
    triggerSpeak();
    const audio = new Audio("public/audio/yummy.mp3");
    audio.play();

}



//Important! This function removes the animation class from the element so a different animation can be added to the same element.
//Should be called at the end of each animation trigger function where you'll want to animate that body part differently later.
//Made with help from Claude.

function resetAnims(anim, element) {
  const duration = parseFloat(getComputedStyle(element).animationDuration) * 1000;
  setTimeout(() => element.classList.remove(anim), duration);
}

//Frequency of blink is defined in CSS. Could be made random to be more lifelike. 
function triggerBlink() {
  const eyes = document.getElementById("all_eyes");
  eyes.classList.add("blink");

}

//Pupils look up and left towards center of screen
function lookUp() { 
  const pupils = document.getElementById("pupils")
  pupils.classList.add("lookUp")
}

//Blinking and swaying to make monster look alive. 
// CSS animations could be improved to look more lifelike.
function triggerAmbientMovement() {
  const mBody = document.getElementById("all_but_legs")
  mBody.classList.add("ambientBodyMovement")
  const RLeg = document.getElementById("monster_R_leg_foot")
  RLeg.classList.add("ambientRLegMovement")
  const LLeg = document.getElementById("monster_L_leg_foot")
  LLeg.classList.add("ambientLLegMovement")
  const RArm = document.getElementById("monster_right_arm")
  RArm.classList.add("ambientRArmMovement")
  const LArm = document.getElementById("monster_left_arm")
  LArm.classList.add("ambientLArmMovement")
  triggerBlink();
}

//Call to stop ambient movement 
function stopAmbientMovement() {
  const body = document.getElementById("all_but_legs")
  body.classList.remove("ambientBodyMovement")
  body.classList.remove("preBounce")
  const RLeg = document.getElementById("monster_R_leg_foot")
  RLeg.classList.remove("ambientRLegMovement")
  const LLeg = document.getElementById("monster_L_leg_foot")
  LLeg.classList.remove("ambientLLegMovement")
  const eyes = document.getElementById("all_eyes");
  eyes.classList.remove("blink");
}

//Bounce includes "boing" sound effect. Height should be negative.
function triggerBounce(height) {
    const no_legs = document.getElementById("all_but_legs")
    const all_body = document.getElementById("monster_full")
    const root = document.documentElement;
    root.style.setProperty('--bounceHeight', height + "px");
    no_legs.classList.add("preBounce")
    all_body.classList.add("bounce")
    sayBoing();
    resetAnims("preBounce", no_legs);
    resetAnims("bounce", all_body);

}

//Moves mouth to look like speech. Could be improved to change length
//dynamically depending on what sound effect is being played. 
function triggerSpeak() {
    const mouth = document.getElementById("all_mouth")
    const tongue = document.getElementById("monster_tongue")
    mouth.classList.add("speakMouth")
    tongue.classList.add("speakTongue")
    resetAnims("speakMouth", mouth);
    resetAnims("speakTongue", tongue);
}

//Wave left arm
function triggerLeftWave() {
  const leftArm = document.getElementById("monster_left_arm")
  leftArm.classList.add("leftWave")
   resetAnims("leftWave", leftArm);
}
//Drop right arm to monster's side 
function triggerRightArmDrop() {
  const rightArm = document.getElementById("monster_right_arm")
  rightArm.classList.add("rightArmDrop")
     resetAnims("rightArmDrop", rightArm);
}

//Drop arm, wave, and say hello
function triggerGreeting() {
  triggerRightArmDrop();
  triggerLeftWave();
  setTimeout(sayHello, 500);
  setTimeout(triggerSpeak, 400);
}


//Drop and make visible cookie 1
function eatCookie1() {
  const cookie1 = document.getElementById("cookie1");
  cookie1.classList.add("cookie1Drop");
  resetAnims("cookie1Drop", cookie1);
}

//Drop and make visible cookie 2
function eatCookie2() {
  const cookie2 = document.getElementById("cookie2")
  cookie2.classList.add("cookie2Drop")
  resetAnims("cookie2Drop", cookie2);
}

//Drop and make visible cookie 3
function eatCookie3() {
  const cookie3 = document.getElementById("cookie3")
  cookie3.classList.add("cookie3Drop")
  resetAnims("cookie3Drop", cookie3);
}

//Open mouth and close mouth. Duration should be an integer which defines how many
//seconds it's open, I.E., how many cookies the monster can eat while it's open.
//Chomp sound effect should be triggered separately.
function triggerEatMouth(duration){ 
  const mouth = document.getElementById("all_mouth")
  const root = document.documentElement;
  root.style.setProperty('--mouthOpen', (200+ duration * 1000)  + "ms");
  mouth.classList.add("eatMouth")
  resetAnims("eatMouth", mouth);
}

//Combines the above functions into a single function based on the number of cookies to be eaten.
//Keeps mouth open and delays chomp to allow all cookies to fall.
function eatCookies(trialScore) {
  if (trialScore >= 1 && trialScore <= 4) {
    eatCookie1();
    triggerEatMouth(1);
    setTimeout(chomp, 200);

  }
  else if (trialScore >= 5 && trialScore <= 7) {
    eatCookie1();
    triggerEatMouth(2);
    setTimeout(eatCookie2, 500);
    setTimeout(chomp, 500);

  }
  else if (trialScore >= 8 && trialScore <= 9) {
    eatCookie1();
    triggerEatMouth(3);
    setTimeout(eatCookie2, 500);
    setTimeout(eatCookie3, 1000);
    setTimeout(chomp, 1000);
  }
 
}
//Makes monster bigger by scale of 1.12 and shifts up so it doesn't cover score. Also plays grow sound effect.
//NEEDS TO BE IMPROVED! 
function triggerGrow() {
  const body = document.getElementById("monster_full");
  root.style.setProperty('--lastScale', lastScale);
  root.style.setProperty('--newScale', newScale);
  body.classList.add("grow");
   growNoise();
   body.style.transform = `scale(${newScale}) translateY(${newMonsterY}px) `;
  lastScale = newScale;
  newScale = lastScale + 0.12;
  lastMonsterY = newMonsterY;
  newMonsterY = lastMonsterY - 30;
  setTimeout(sayWeehee, 1000);
 resetAnims("grow", body);
}

//Make hat flash rainbow
function triggerRainbowHat() {
  const hat = document.getElementById("full_hat");
  hat.classList.add("rainbowFlash");
  resetAnims("rainbowFlash", hat);
}

//Triggers grow effect and rainbow hat when score is a multiple of 20 AND participant has scored points on that trial.
//Can change the 20 if you want grow to happen more or less frquently. 
function maybeGrow(totalScore, trialScore) {
  let lag = trialScore <= 4 ? 500 : trialScore <= 7 ? 1000 : 1500; //Calculate delay based on how many cookies will be dropped.
   if (totalScore % 20  < trialScore) {
    setTimeout(() => {
    triggerGrow();
    triggerRainbowHat();
  }, lag+1000); //Grow happens after all cookies are dropped
}
}

//Celebration for end of game. Sway, wave, rainbow hat, and say "yummy" three times, then transition to ambient movement
function triggerHappyDance() {
  growNoise(); 
  const body = document.getElementById("monster_full");
  body.classList.add("danceBody")
  triggerRainbowHat();
  const Rarm = document.getElementById("monster_right_arm")
  Rarm.classList.add("waveArms")
  const Larm = document.getElementById("monster_left_arm")
  Larm.classList.add("waveArms")
  triggerBlink();


   setTimeout(sayYummy, 500);
   setTimeout(sayYummy, 1800);
   setTimeout(sayYummy, 3100);
   
  setTimeout(triggerAmbientMovement, 6000);

}



// Come back to this later and also see if I can make it random
// which directin it leans in 
// function triggerRandomBlink() {
//   const delay = Math.random() * (1000) + 1000; // blinks happen at a random interval
//   setTimeout(function(){
//     blink();
//     triggerRandomBlink();
//    }, delay);
//   }



/******************/
/** Main Screens **/
/******************/



var get_participant_id = {
  type: jsPsychSurveyText,
  questions: [
    {
      prompt: "Please enter the participant ID:",
      required: true,
      name: "participant_id",
    },
  ],
  on_finish: function (data) {
    jsPsych.data.addProperties({
      participant_id: data.response.participant_id,
    });
    subject = data.response.participant_id;
  },
};

// Fullscreen mode
var fullscreen_trial = {
  type: jsPsychFullscreen,
  fullscreen_mode: true,
};


let keyboardInputHandler = function (event) {
  if (event.repeat) return; // Ignore hold-down repeats
  if (event.key >= "1" && event.key <= "9") {
    response.push(Number(event.key));
    document.getElementById("echoed_txt").innerHTML = response.join(", ");
    let button = document.querySelector(`.num-button:nth-child(${event.key})`);
    if (button) button.classList.add("active-key");
  } else if (event.key === "Backspace" && response.length > 0) {
    let lastRemoved = response.pop(); // Get the last number removed
    document.getElementById("echoed_txt").innerHTML = response.join(", ");
    let clearButton = document.querySelector(".clear_button");
    if (clearButton) clearButton.classList.add("active-key");
  }
  else if (event.key === "Enter") {
    let submitButton = document.querySelector(".submit_button");
    if (submitButton) submitButton.classList.add("active-key");
     jsPsych.finishTrial();
  }
};

let keyupInputHandler = function (event) {
  if (event.key >= "1" && event.key <= "9") {
    let button = document.querySelector(`.num-button:nth-child(${event.key})`);
    if (button) button.classList.remove("active-key");
  } else if (event.key === "Backspace") {
    let clearButton = document.querySelector(".clear_button");
    if (clearButton) clearButton.classList.remove("active-key");
  } else if (event.key === "Enter") {
    let submitButton = document.querySelector(".submit_button");
    if (submitButton) submitButton.classList.remove("active-key");
  }
};

// Creates progress bar + score display, appending directly to body.
// Called from within jsPsych timeline so elements survive.
function createHudElements() {
  if (document.getElementById("progress-group")) return; // already built

  // Segmented progress bar (fixed at top)
  var segments = "";
  for (var i = 0; i < fdsTotalTrials; i++) {
    segments += '<div class="progress-segment"></div>';
  }
  var pg = document.createElement("div");
  pg.id = "progress-group";
  pg.innerHTML =
    '<div id="progress-track">' +
    segments 
  //   // "</div>" +
  //   // '<div id="progress-stats">0% (0/' +
  //   // fdsTotalTrials +
  //   // ")</div>";
  document.body.appendChild(pg);
};


  /*figured this out with ChatGPT. Necessary so we can have the SVGs 
live in a different file and not clutter up the HTML*/

function createGraphics() {
fetch("public/image/cookies.svg")
  .then(res => res.text())
  .then(svg => {
    document.getElementById("cookies-container").innerHTML = svg;
  });

  fetch("public/image/monster.svg")
  .then(res => res.text())
  .then(svg => {
    document.getElementById("monster-container").innerHTML = svg;

  });;

    var sd = document.createElement("div");
  sd.id = "score-display";
  sd.innerHTML = 'Score: <span id="score-value">0</span>';
  sd.classList.add("animatable"); 
  document.body.appendChild(sd);

  // var container = document.createElement("div");
  // container.id = "monster-cookies-score";
  var monster = document.createElement("div");
  monster.id = "monster-container";
  monster.classList.add("slideIn");
  var cookies = document.createElement("div");
  cookies.id = "cookies-container";




  container.appendChild(cookies);
  container.appendChild(monster);
  container.appendChild(sd);

 //Get cookie drop distance here
    let monsterBox = document.getElementById("monster-container").getBoundingClientRect(); 
    console.log(monsterBox);

    let cookiesBox = document.getElementById("cookies-container").getBoundingClientRect(); 
    console.log(cookiesBox);


  dropDistance = (monsterBox.bottom - cookiesBox.bottom) * 0.5 + "px";
  console.log("drop distance:" + dropDistance);


  document.documentElement.style.setProperty("--dropDistance", dropDistance);


};


var create_hud = {
  type: jsPsychCallFunction,
  func: createHudElements,
};

//From the Experiment Factory Repository
var response_grid = `
  <div class="response-container">
    <p class="instruction-text">What were the numbers <b style="color:#e06060;">in order</b>?<br>
      (Use your keyboard or click the buttons. Press Enter or Return to submit.)</p>

    <div class="numbox">
      <button class="num-button" onclick="recordClick(1)">1</button>
      <button class="num-button" onclick="recordClick(2)">2</button>
      <button class="num-button" onclick="recordClick(3)">3</button>
      <button class="num-button" onclick="recordClick(4)">4</button>
      <button class="num-button" onclick="recordClick(5)">5</button>
      <button class="num-button" onclick="recordClick(6)">6</button>
      <button class="num-button" onclick="recordClick(7)">7</button>
      <button class="num-button" onclick="recordClick(8)">8</button>
      <button class="num-button" onclick="recordClick(9)">9</button>
    </div>

    <div style="display: flex; gap: 10px; justify-content: center;">
      <button class="clear_button" onclick="backspace()">Backspace</button>
      <button class="submit_button" onclick="jsPsych.finishTrial()">Submit</button>
    </div>

    <p class="current-answer-label">Current Answer</p>
    <div id="echoed_txt"></div>

  </div>
`;

//preload 
var preload = {
  type: jsPsychPreload,
  audio: ["public/audio/boing.mp3", "public/audio/weehee.mp3", "public/audio/yummy.mp3", "public/audio/eat2.mp3", "public/audio/cute_hello.mp3", "public/audio/cute_grow.mp3"],
  // images: ["public/image/digit_span_kitchen.jpg", "public/image/monster.svg", "public/image/cookies.svg"]
  images: ["public/image/digit_span_kitchen.jpg"]



};


var fds_welcome = {
  type: jsPsychHtmlButtonResponse,
   button_html: '<button class="buttonRise general-btn">%choice%</button>',
  stimulus:
    "<p class='fadeIn'> Let's get started!</b></p>" +
    "<p class='fadeIn'> On each trial, you should type the numbers back in the order you saw them. There will be " +
    fdsTotalTrials +
    " total trials.</p>" +
    "<p class='fadeIn'> The more numbers you get right, the more cookies <span class='monster-name'></span> will eat. </p>" + 
    "<p class='fadeIn' style='color: #a562e7; font-weight:bold'>  Feed him enough cookies, and you just might see him grow! </p>",
  choices: ["Start"],
  on_load: function () {
    triggerAmbientMovement();
  }
};

//set-up screen
var setup_graphics = {
  type: jsPsychCallFunction,
  func: createGraphics,
};

var setup_fds = {
  type: jsPsychHtmlButtonResponse,
  stimulus: function () {
    return "<h1>Trial " + fdsTrialNum + " of " + fdsTotalTrials + "</h1>";
  },
    button_html: '<button class="general-btn">%choice%</button>',
  choices: ["▶ Begin"],
  post_trial_gap: 500,
  on_load: function () {
    triggerAmbientMovement();
  },
  on_start: function () {
    createHudElements(); // safety net
    var pg = document.getElementById("progress-group");
    var sd = document.getElementById("score-display");
    if (pg) pg.style.visibility = "visible";
    if (sd) sd.style.visibility = "visible";
  },
  on_finish: function () {
    if (fdsTrialNum == 1) {
      currentSpan = startingSpan;
    }
    stimList = getStimuli(currentSpan); //get the current stimuli for the trial
    spanHistory[fdsTrialNum - 1] = currentSpan; //log the current span in an array
    fdsTrialNum += 1; //add 1 to the total trial count
    idx = 0; //reset the index prior to the letter presentation
    exitLetters = 0; //reset the exit letter variable
  },
};

//letter presentation
var letter_fds = {
  type: jsPsychAudioKeyboardResponse,
  stimulus: function () {
    return stimList[idx];
  },
  choices: "NO_KEYS",
  post_trial_gap: 250,
  trial_ends_after_audio: true,
  on_load: function () {
    stopAmbientMovement();
  },
  on_finish: function () {
    idx += 1; //update the index
    //check to see if we are at the end of the letter array
    if (idx == stimList.length) {
      exitLetters = 1;
    } else {
      exitLetters = 0;
    }
  },
};

//visual letter presentation
var letter_fds_vis = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: function () {
    return stimList[idx];
  },
  choices: "NO_KEYS",
  trial_duration: function () { return studio.numberSpeed; },
  post_trial_gap: 250,
    on_load: function () {
    stopAmbientMovement();
  },
  on_finish: function () {
    idx += 1; //update the index
    //check to see if we are at the end of the letter array
    if (idx == stimList.length) {
      exitLetters = 1;
    } else {
      exitLetters = 0;
    }
  },
};

// conditional loop of letters for the length of stimList...different procedures for visual and audio
if (useAudio) {
  var letter_proc = {
    timeline: [letter_fds],
    loop_function: function () {
      if (exitLetters == 0) {
        return true;
      } else {
        return false;
      }
    },
  };
} else {
  var letter_proc = {
    timeline: [letter_fds_vis],
    loop_function: function () {
      if (exitLetters == 0) {
        return true;
      } else {
        return false;
      }
    },
  };
}


function triggerScoreEffect() {
  var scoreDisplay = document.getElementById("score-display");
  scoreDisplay.classList.add("score-update-effect");
  resetAnims("score-update-effect", scoreDisplay);
}

function updateScore(totalScore, trialScore) {

  totalScore = totalScore + trialScore

  var scoreDisplay = document.getElementById("score-display");
  var scoreElement = document.getElementById("score-value");

  if (scoreDisplay) {
    scoreDisplay.innerHTML = `Score: ${totalScore}`;
  }
  if (trialScore != 0) {
  triggerScoreEffect();
  maybeGrow(totalScore, trialScore);
  }

  return totalScore;
}

function calcTrialScore(correct, response) {
  var trialScore = 0;

  for (let i in response) {
    if (response[i] == correct[i]) {
      trialScore += 1;
    }
  }

  return trialScore;
}


//response input screen
var fds_response_screen = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: response_grid,
  choices: ["Enter"],

  on_start: function () {
    jsPsych.data.addProperties({ start_time: performance.now() });

    document.addEventListener("keydown", keyboardInputHandler);
    document.addEventListener("keyup", keyupInputHandler);

    if (totalScore === 0) {
      let scoreElement = document.getElementById("score-value");

      if (!scoreElement) {
        console.warn("Score display not found! Trying to create it again...");

        var scoreDisplay = document.createElement("div");
        scoreDisplay.id = "score-display";
        scoreDisplay.innerHTML = `Score: <span id="score-value">${0}</span>`;
        document.body.appendChild(scoreDisplay);

        scoreElement = document.getElementById("score-value");
      }
    }
  },

  on_finish: function (data) {
    document.removeEventListener("keydown", keyboardInputHandler);
    document.removeEventListener("keyup", keyupInputHandler);

    var end_time = performance.now();
    var start_time = jsPsych.data.get().last(1).values()[0].start_time;
    var responseTime = end_time - start_time;
    responseTimes.push(responseTime);

    var curans = response;
    var corans = fds_correct_ans;
    var gotItRight = JSON.stringify(curans) === JSON.stringify(corans) ? 1 : 0;

    var trialScore = calcTrialScore(corans, curans);
    totalScore = updateScore(totalScore, trialScore);
    numsSeen = numsSeen + currentSpan;

    setTimeout(() => {
      eatCookies(trialScore);
    }, 300);

    lastResponse = response;

    if (gotItRight) {
      console.log("✅ Correct! Score updated.");

      if (currentSpan > maxSpan) {
        maxSpan = currentSpan;
      }

      staircaseChecker[staircaseIndex] = 1;
      numPerfect += 1;
    } else {
      console.log("❌ Incorrect.");
      staircaseChecker[staircaseIndex] = 0;
    }

    response = [];
    console.log("response cleared");

    staircaseIndex += 1;
    console.log(staircaseChecker);

    jsPsych.data.addDataToLastTrial({
      designation: "FDS-RESPONSE",
      span: currentSpan,
      answer: curans,
      correct: corans,
      response_time: responseTime,
      was_correct: gotItRight,
      spanHistory: spanHistory,
    });
  },
};

//move this later
function colorDigits(corans, curans) {
    let result = "";
    for (let i = 0; i < corans.length; i++) {
        const color = corans[i] === curans[i] ? "#43a900" : "red";
        const opacity = corans[i] === curans[i] ? "1" : "0.5";
        result += `<span class="digits-feedback" style="color: ${color}; opacity: ${opacity}">${corans[i]} </span>`;
    }
    return result;
}


var fds_feedback_screen = {
type: jsPsychHtmlButtonResponse,
button_html: '<button class="general-btn">%choice%</button>',
stimulus: function () {
        return colorDigits(fds_correct_ans, lastResponse)
  },
  choices: ["Continue"],
  on_load: function() {
    triggerAmbientMovement();
    console.log("ambient movement on");
  }
};

var update_progress = {
  type: jsPsychCallFunction,
  func: function () {
    var completed = fdsTrialNum - 1;
    var pct = Math.round((completed / fdsTotalTrials) * 100);
    var segments = document.querySelectorAll(".progress-segment");
    segments.forEach(function (seg, i) {
      if (i < completed) {
        seg.classList.add("completed");
      } else {
        seg.classList.remove("completed");
      }
    });
    var stats = document.getElementById("progress-stats");
    if (stats)
      stats.textContent = pct + "% (" + completed + "/" + fdsTotalTrials + ")";
  },
};

/*********************/
/** Main Procedures **/
/*********************/

//call function to update the span if necessary
var staircase_assess = {
  type: jsPsychCallFunction,
  func: updateSpan,
};

//the core procedure
var staircase = {
  timeline: [
    setup_fds,
    letter_proc,
    fds_response_screen,
    fds_feedback_screen,
    update_progress,
    staircase_assess,
  ],
};

//main procedure
var fds_mainproc = {
  timeline: [staircase],
  loop_function: function () {
    //if we haev reached the specified total trial amount, exit
    if (fdsTrialNum > fdsTotalTrials) {
      return false;
    } else {
      return true;
    }
  },
};

// **Preset tutorial sequence**
var tutorial_stimuli = ["4", "9", "3"];

// **Tutorial: Show numbers one by one**
var tutorial_presentation = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: function () {
    return `<p class="digits">${tutorial_stimuli[idx]}</p>`;
  },
  on_start: function () {
    showPracticeChip();
  },
  choices: "NO_KEYS",
  trial_duration: function () { return studio.numberSpeed; }, // editable from the studio
  post_trial_gap: 250, // Short gap between numbers
  on_finish: function () {
    idx += 1;
  },
};

// **Loop through tutorial digits (only once)**
var tutorial_sequence_loop = {
  timeline: [tutorial_presentation],
  loop_function: function () {
    return idx < tutorial_stimuli.length; // Stops when all numbers are shown
  },
};

// **Tutorial: Response screen**
var tutorial_response_screen = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: function () {
    return response_grid;
  },
  choices: ["Enter"],
  data: { is_tutorial: true },

  on_start: function () {
    createHudElements();

    var sd = document.getElementById("score-display");
    if (sd) sd.style.visibility = "visible";

    response = [];
    tutorialScore = 0;

    document.addEventListener("keydown", keyboardInputHandler);
    document.addEventListener("keyup", keyupInputHandler);
  },

  on_finish: function (data) {
    var curans = response;
    var isCorrect =
      JSON.stringify(curans) === JSON.stringify(tutorial_correct_ans);

    for (let i in response) {
      if (response[i] == tutorial_correct_ans[i]) {
        tutorialScore += 1;
      }
    }

    jsPsych.data.addDataToLastTrial({
      was_correct: isCorrect,
    });

    data.correct = isCorrect;

    updateScore(0, tutorialScore);
    eatCookies(tutorialScore);
    setTimeout(sayYummy, 1300);
    triggerAmbientMovement();

    lastResponse = response;
    response = [];

    document.removeEventListener("keydown", keyboardInputHandler);
    document.removeEventListener("keyup", keyupInputHandler);
  },
};

// **Tutorial: Feedback screen (only shown once, no retries)**
var tutorial_feedback = {
  type: jsPsychHtmlButtonResponse,
      button_html: '<button class="general-btn">%choice%</button>',

    stimulus: function () {
      let message = tutorialScore == 3
       ? `<p> Great job! Now let's move on to the real trials. </p>`
       :  `<p>That's okay!
        Let's move on to the real trials.</p>`
        return colorDigits(tutorial_correct_ans, lastResponse) + message;
  },
  choices: ["Continue"],
  on_finish: function () {
    console.log("correct: " + tutorial_correct_ans);
    console.log("input: " + response);
    hidePracticeChip();
    practice = false;
    idx = 0; // Reset index when moving to main trials
    response = []; // Reset response for real task
    var scoreDisplay = document.getElementById("score-display");

  if (scoreDisplay) {
    scoreDisplay.innerHTML = `Score: ${totalScore}`; //reset score to 0 for real task without glow effect
  }
  },
};


var welcome_screen_1 = {
  type: jsPsychHtmlButtonResponse,
  stimulus: `
  <div class="welcome-container">
      <h1 class="headerAnim">Feed the Hungry Monster!</h1>
      <p class="fadeIn">
        Meet <span class="monster-name"></span>! <span class="monster-name"></span> is a very hungry monster.
      </p>
    </div>
  `,
  choices: ["👋 Say hello to <span class='monster-name'></span>"],
  button_html: '<button class="buttonRise general-btn">%choice%</button>',
  on_load: function () {
    // eatCookies(1);
    },
    on_finish: function(){
      lookUp(); //this works, but it would be even nice if this was triggered by mousing over the button

    }
  }

  var welcome_screen_2 = {
    type: jsPsychHtmlButtonResponse,
  stimulus: `
  <div class="welcome-container">
      <h1> Feed the Hungry Monster! </h1>
      <p> 
        Meet <span class="monster-name"></span>! <span class="monster-name"></span> is a very hungry monster.
      </p>
    </div>
  `,
   choices: ["👋 Say hello to <span class='monster-name'></span>"],
  button_html: '<button class="general-btn">%choice%</button>',
  response_ends_trial: false,
  trial_duration: 4000,
    on_load: function() {
      triggerBounce(-100);
      setTimeout(triggerGreeting, 600);

    }
};

 var welcome_screen_3 = {
  type: jsPsychHtmlButtonResponse,
  stimulus: `
  <div class="welcome-container">
      <p class="fadeIn"> In this game, your task is to memorize a list of numbers  <b style="color:#a562e7;">in order.</b> </p>
       <p class="fadeIn"> The more numbers you remember correctly, the more cookies <span class="monster-name"></span> will eat! </p>
    </div>
  `,
   choices: ["Next"],
  button_html: '<button class="buttonRise general-btn">%choice%</button>',
  on_start: function () {
       triggerAmbientMovement();
  },
};

 var welcome_screen_4 = {
  type: jsPsychHtmlButtonResponse,
  stimulus: `
  <div class="welcome-container">
      <p class="fadeIn"> Let's start with a practice round. <br> <br> You'll see a sequence of numbers, one at a time. Do your best to remember them! </p>
    </div>
  `,
   choices: ["▶ Begin"],
  button_html: '<button class="buttonRise general-btn">%choice%</button>',
  on_finish: function () {
    stopAmbientMovement();
    response = []; // Ensure response is cleared before starting
    idx = 0; // Reset index so numbers display properly
  },
};


var welcome_sequence = {
  timeline: [
    welcome_screen_1,
    welcome_screen_2,
    welcome_screen_3,
    welcome_screen_4,
   tutorial_sequence_loop,
   tutorial_response_screen,
   tutorial_feedback,
  ]
};

/******/

/////////////////////////
// 1. final procedure //
////////////////////////
/*
Simply push this to your timeline
variable in your main html files -
e.g., timeline.push(fds_adaptive)
*/

var fds_adaptive = {
  timeline: [
     preload,
    create_hud,
    setup_graphics,
    welcome_sequence, //includes tutorial
    fds_welcome,
    fds_mainproc,
    //wrapup now handled by a single wrapup screen pushed later
  ]
};

// Studio version: no participant ID or fullscreen (the game runs inside the studio's preview pane)
timeline.push(fds_adaptive);


//add more stats back in
var wrapup_screen = {
  type: jsPsychHtmlButtonResponse,
    button_html: '<button class="buttonRise general-btn">%choice%</button>',
  stimulus: function() {
   return `
   <p class="fadeIn"> This concludes the game. </p>
   <p class="fadeIn"> Thanks for making <span class="monster-name"></span> a happy monster! </p>
   <div class="scoreboard">
   <h1 style="font-family:monospace; font-size: 1.8rem;"> Results </h1>
    <div class="scoreline">
      <p> Final score:</p>  <span class='stat-score'> ${totalScore} </span> 
      </div>
      <div class="scoreline">
      <p>Overall accuracy:</p> <span class='stat-score'> ${Math.round((totalScore / numsSeen) * 100)}%</span> 
    </div>
    <div class="scoreline">
      <p>Perfect responses:</p> <span class='stat-score'> ${numPerfect}/${fdsTotalTrials} </span> 
    </div>
     <div class="scoreline">
      <p>Longest perfect response:</p> <span class='stat-score'> ${maxSpan} </span>   
  </div>
`;
  
  },

  // The longest string you remembered was <span style="color: #a562e7; font-weight: bold"> ${maxSpan} digits. </span> <br> <br>
  // Cortex says "Thanks for the cookies!" </p>` },
  choices: ["Continue"],
  on_load: function() {
    stopAmbientMovement();
    triggerHappyDance();

  }
}
timeline.push(wrapup_screen);

//Final screen
var save_data = {
  type: jsPsychHtmlButtonResponse,
  stimulus: "<p>This concludes the task. Would you like to save the data?</p>",
  choices: ["No", "Yes"],
  on_finish: function (data) {
    var choice = data.response;
    if (choice === 1) {
      var filename = "data_FDS_" + subject + ".csv";
      jsPsych.data.get().localSave("csv", filename)
      alert("Data has been saved successfully.");
    } else {
      alert("Data not saved.");
    }
    localSave = jsPsych.data.get().last(1).values()[0].response;
  },
};

// Studio version: no data-saving prompt
// timeline.push(save_data);

//Initialize the Experiment

jsPsych.run(timeline);
