//templates
const fuelTank = new Part("fuel tank", "white", 0.08, 8, 8, 0, 0);
const smallEngine = new Part("small engine", "yellow", 0.1, 2, 0, 1.4, 0.0005);
const mediumEngine = new Part("medium engine", "orange", 0.14, 3, 0, 2.1, 0.0009);
const largeEngine = new Part("large engine", "red", 0.16, 5, 0, 2.7, 0.0014);
const separator = new Part("separator", "blue", 0.02, 0.5, 0, 0, 0);
const capsule = new Part("capsule", "gray", 0.04, 1, 0, 0, 0);

const canvas = document.getElementById("main");
const rocket = [];
let speed = 0;
let mass = 0;
let gravity = 0.08;
let position = 0;
let usableFuelTanks = [];
let height = 0;
let enginePowerScale = 1;
const context = canvas.getContext("2d");
const engineCanvas = document.getElementById("engineControl");
const engineContext = engineCanvas.getContext("2d");
let time = 0;
let previousTime = 0;
let previousPosition = 0;
let bestHeight = getCookie("bestHeight") === undefined ? 0 : getCookie("bestHeight");
let screenTime = getCookie("screenTime") === undefined ? 0 : getCookie("screenTime");

//template for a part
function Part(type, color, height, mass, fuel, thrust, fuelUsage) {
    this.type = type;
    this.color = color;
    this.height = height;
    this.mass = mass;
    this.fuel = fuel;
    this.thrust = thrust;
    this.fuelUsage = fuelUsage;
}

function start() {    
    if(!rocketIsValid()) {
        return;
    }
    
    document.getElementById("error").style.display = "none"    
    document.getElementById("start").style.display = "none";
    document.getElementById("height").style.display = "inline";
    document.getElementById("fuel").style.display = "inline";
    document.getElementById("speed").style.display = "inline";
    document.getElementById("separate").style.display = "inline";
    document.getElementById("engineControl").style.display = "inline";
    document.getElementById("enginePowerText").style.display = "inline";
    for(element of document.getElementsByClassName("part")) {
        element.style.display = "none";
    }
        
    //ignore the first item, since it is an engine  
    for(let index = 1; index < rocket.length; index++) {        
        if(rocket[index].fuel > 0) {
            usableFuelTanks.push(index);      
        } else {
            break;
        }
    }
    
    //calculate the mass
    updateMass();        
    
    //start the game loop
    gameLoop();
}

function gameLoop() {
    //if the engine has fuel(since fuel usage is equal among all tanks, we can just get first one)
    if(rocket[usableFuelTanks[0]].fuel > 0) {
        speed += rocket[0].thrust / mass * enginePowerScale;
        useFuel();
    }        
    
    if(position < 0) {
        if(speed < -10) {
            document.getElementById("height").innerText = "height: 0m";
            document.getElementById("fuel").innerText = "remaining fuel: 0%";
            document.getElementById("speed").innerText = "speed: 0m/s";
            warn("youre dead m8");
            return;
        } else {            
            position = 0;
            speed = 0;
            warn("You have landed.");
            return;
        }                    
    }
    
    //gravity in 1d doesn't depend on distance
    //because like it doesn't have anywhere to go other than a straight line    
    speed -= gravity;
    previousPosition = position;
    position += speed;
    
    //update the best height
    if(position > parseInt(bestHeight)) {
        bestHeight = Math.round(position / 80);
        setCookie("bestHeight", bestHeight);
    }
    
    screenTime = parseInt(screenTime);
    screenTime += Math.round((time - previousTime) / 10);
    setCookie("screenTime", screenTime);
    
    //show the stats on the site
    document.getElementById("height").innerText = "height: " + Math.round(position / 80) + "m";
    document.getElementById("fuel").innerText = "remaining fuel: " + Math.round(rocket[usableFuelTanks[0]].fuel * 12.5) + "%";
    document.getElementById("speed").innerText = "speed: " + Math.round(((position - previousPosition) / 80) / ((time - previousTime) / 100)) + "m/s";
    
    previousTime = time;
    if(position < canvas.height - height * canvas.height + 100) {
        drawRocket();
    }
    requestAnimationFrame(gameLoop);
}

function useFuel() {
    for(index of usableFuelTanks) {
        //distribute the fuel usage between all the accessible fuel tanks
        rocket[index].fuel -= rocket[0].fuelUsage * enginePowerScale / usableFuelTanks.length;
        rocket[index].mass -= rocket[0].fuelUsage * enginePowerScale / usableFuelTanks.length;
        //making sure we don't get negative mass or fuel
        if(rocket[index].fuel < 0) {
            rocket[index].fuel = 0;
            rocket[index].mass = 0;
        }
    }
}

function updateMass() {
    mass = 0;
    for(part of rocket) {
        mass += part.mass;
    }
}

function addPart(part) {
    rocket.push(part);
    drawRocket();
    height += part.height;
}

function separate() {
    //if the rocket has a separator
    const separatorIndex = rocket.findIndex(obj => obj.type === "separator");
    if(separatorIndex !== -1) {
        //cut out the parts while storing them in a variable 
        const cutOffParts = rocket.splice(0, separatorIndex + 1);
        let cutOffHeight = 0;
        for(part of cutOffParts) {
            cutOffHeight += part.height;
        }
        //so the rocket doesn't mysteriously go down
        position += cutOffHeight;
        //so the rocket can center itself properly
        height -= cutOffHeight;
        
        //redo some rocket shit again
        if(!rocketIsValid()) {
            return;
        }
        
        updateMass();
        
        usableFuelTanks = [];
        
        for(let index = 1; index < rocket.length; index++) {        
            if(rocket[index].fuel > 0) {
                usableFuelTanks.push(index);      
            } else {
                break;
            }
        }
    } else {
        warn("There are no separators.");        
    }
}

function warn(text) {
    const error = document.getElementById("error");
    error.style.display = "inline";
    error.innerText = text;
    const startingTime = time;    
}

//when clicked, the error will dissapear
document.getElementById("error").addEventListener("mousedown", function(){
    document.getElementById("error").style.display = "none";
});

function drawRocket() {
    //important: for some reason, 0, 0 is the top left corner
    
    //clear the canvas before starting
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    let currentHeight;
    //if the position is less than the canvas height(accounting for the height of the rocket itself yada yada yada), draw it where it is, if not then draw it at the middle
    if(position < canvas.height - height * canvas.height) {
        currentHeight = canvas.height - position;
    } else {
        currentHeight = canvas.height / 2 + height * canvas.height / 2;
    }
    
    //loop over the parts of the rocket and draw them individually 
    for(part of rocket) {
        context.beginPath();
        context.fillStyle = part.color;
        context.fillRect(0, currentHeight - part.height * canvas.height, canvas.width, part.height * canvas.height);
        currentHeight -= part.height * canvas.height - 0.5;
    }
}

//thank you stack overflow for these 2, this is for the engine control thing
function handleClick(event) {
    const rect = engineCanvas.getBoundingClientRect();
    let y = event.clientY - rect.top;
    engineContext.clearRect(0, 0, engineCanvas.width, engineCanvas.height);
    if(y < engineCanvas.height * 0.05) {
        y = 0;
    } else if(y > engineCanvas.height * 0.95) {
        y = engineCanvas.height;
    }
    enginePowerScale = (engineCanvas.height  - y) / engineCanvas.height;
    engineContext.beginPath();
    engineContext.fillStyle = "white";
    engineContext.fillRect(0, y, engineCanvas.width, engineCanvas.height);
}

engineCanvas.addEventListener("mousedown", function(event) {
    handleClick(event);
});

//undistort the canvases because setting the height width in css causes distortion but you also can't set those in html as percentages so
function resizeCanvas(canvas) {
    const computedStyle = getComputedStyle(canvas);
    canvas.width = parseInt(computedStyle.width);
    canvas.height = parseInt(computedStyle.height);
}

resizeCanvas(canvas);
resizeCanvas(engineCanvas);
//it thinks the height is 40 pixels idk why
engineCanvas.height = window.innerHeight * 0.4;
//fill it at first
engineContext.fillStyle = "white";
engineContext.fillRect(0, 0, engineCanvas.width, engineCanvas.height);

function rocketIsValid() {
    //if the rocket has no parts
    if(rocket.length === 0) {
        warn("The rocket must have at least one part.");
        return false;
    }
    
    //if the bottommost part isn't an engine
    if(rocket[0].thrust === 0) {
        warn("The bottommost part must be an engine.");
        return false;
    }
    
    //if the rocket doesn't have a capsule
    if(!rocket.some(part => part.type === "capsule")) {
        warn("The rocket must include a probe.");
        return false;
    }
    
    //if it got past all those checks, it means it is valid
    return true;
}

//self explanatory 
function countTime() {
    time++;
    requestAnimationFrame(countTime, 1);
}

countTime();

//thanks javascript.info/cookie

function setCookie(name, value) {

  attributes = {
    path: '/',
    expires: new Date(Date.now() + 1e10)
  };
  
  let updatedCookie = encodeURIComponent(name) + "=" + encodeURIComponent(value);

  for (let attributeKey in attributes) {
    updatedCookie += "; " + attributeKey;
    let attributeValue = attributes[attributeKey];
    if (attributeValue !== true) {
      updatedCookie += "=" + attributeValue;
    }
  }

  document.cookie = updatedCookie;
}

function getCookie(name) {
  let matches = document.cookie.match(new RegExp(
    "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
  ));
  return matches ? decodeURIComponent(matches[1]) : undefined;
}