let tutorialText = `This app can simulate logic circiuts. Logic gates can be added to
the screen from to button labeled "Gate >". This will open a drop
down menu. Select any gate from here. Multiple gates can be added.
To connect pins of gates, click on the ouput pin of a gate to select 
it (selected pin will appear blue coloured). Once selected click on
the input pin of desired gate. This will connect them via a connection
line. The path of connection line can also be change. To do so, click
on the blank area of screen to add multiple points. 

You can move a gate by selecting(click on the gate to select it. Selected
gate has a blue border) and then drag it to desired position. To provide
input to the circiut, you need main input pins. To add them click on the
rectangle shaped bar at the left side. These pins appear different from  
other pins. To select them click on the larger side of the pin. To change
their state, click on the smaller part. When in ON state these pins appear 
green coloured (colour can be changed in settings). Output pins can be
added by clicking on the bar at right side. To delete a pin, connecting
wire or gate, select it and click on delete icon(Top right corner). 

Once you complete the circiut you can save them as an IC by clicking on
save gate. A pop up will ask you the name of the circiut, it's colour (can
be changed later from the saved circiuts tab in menu) and if you want to
consider the output delay caused by every element of circiut or you can 
add custom delay to each input. The circuit of these gates can be viewed
from menu > saved gates.  
\n\n__END__
This line stores the page number that user is currently reading, it is not the part of tutorial - 0`;
const aboutText = `I am an computer and electronics enthusiast . This app was made to 
simulate a computer that I would build to learn in depth about 
how low level operations are actually carried out by computers . 

Features :-
    1. Can simulate logic gates with output delays .
    2. Saves can be made .
    3. Highly customisable .
    4. Interactive UI .
    
Project details :-
    Author     : Parth Shendge
    Started    : 26 / 02 / 2025
    Completed  : 00 / 02 / 2025
    Version    : 1.00 `;
window.onload = main;


const canvas  = document.querySelector("canvas");
const ctx     = canvas.getContext("2d");
canvas.width  = window.innerWidth;
canvas.height = window.innerHeight;

window.onresize = configureDimensions;

canvas.addEventListener("click", handleClick);

canvas.addEventListener("mouseup", handleEnd);
canvas.addEventListener("mousedown", handleStart);
canvas.addEventListener("mousemove", handleMove);

canvas.addEventListener("touchstart", handleStart);
canvas.addEventListener("touchend", handleEnd);
canvas.addEventListener("touchmove", handleMove);

let gates    = [];
let circuits = []; // Including ICs

let buttons = [];
let inpins  = [];
let outpins = [];
let outpinConnections = [];
let connectionPath = []; // 2D array , stores path of a connection line before connecting pins

let selectedGate;
let lastSelectedGate;
let selectedPin;
let cursorCoordinates;
let selectedElementInfoMenuOpen = false;

let UIupdateInterval;
let clickedOnBlankScreen = true;

let settings = {
    gridSize          : 25,
    gridOpacity       : 30,
    gateDelay         : 20,
    topBarColor       : "rgb(30 30 45 / 60%)",
    topBarHeight      : 40,
    pinContainerColor : "rgb(25 25 35 / 100%)",
    pinContainerWidth : 40,
    activePinColor    : "rgba(25 255 40 / 100%)",
    selectedPinColor  : "#00afff",
    connectionLineColor: "rgba(100 100 100 / 50%)",
    connectionLineWidth: 3,
    gateFontSize      : 15,
    UIrefreshRate     : 30,
    // logicUIrefreshRate: 1000/gateDelay,
    sound             : false
}
let menu = {
    open        : false,
    gateMenuOpen: false,
    currentTab  : 1, // 1-Main Menu, 2-Settings, 3-Tutorial, 4-About
    tabX        : canvas.width*25/100,
    tabY        : canvas.height*25/100,
    tabWidth    : canvas.width/10,
    tabHeight   : canvas.height/20,
    tabFontSize : 15,
    closeBtnY   : canvas.height*0.75,
    closebtnFontSize : 20,

}
let toast = {
    requested : false,
    text      : ""
}

const pinSize = 10;
const gatePadding = 10;


class circuit{
    constructor(name, logic, inpins, outpins, color){
        this.name    = name;
        this.logic   = logic;
        this.inpins  = inpins;
        this.outpins = outpins;
        this.color   = color;
    }
}

class gate{
    constructor(id, x, y, type, inConnections){
        this.id   = id;
        this.x    = x;
        this.y    = y;
        this.type = type;
        this.inConnections  = inConnections;
        this.outConnections = [];
        this.connectionLevel = 0;
        this.outputColour = settings.activePinColor;

        this.beingDragged = false; // Set to true while changing the position of gate
        
        this.width  = type.name.length*canvas.width/100;           // Width depends on the length of name of the gate 
        this.height = Math.max(type.inpins, type.outpins)*pinSize; // Height of the gate depends on no of gate pins 

        this.inpins  = []; // Stores the states of input pins
        this.outpins = []; // Stores the states of output pins

        this.scaleFactorX = canvas.width; // To change coordinates of gates when window resizes
        this.scaleFactorY = canvas.height;

        this.Rx = 0;
        this.Ry = 0;
        this.Rwidth = 0;
        this.Rheight= 0;

        for(let i=0; i<type.inpins; i++){
            this.inpins.push(new pin(this.x-pinSize-gatePadding, y + gatePadding/2 + pinSize*i, 0, "inpin", this));
        }
        for(let i=0; i<type.outpins; i++){
            this.outpins.push(new pin(this.x+this.width+pinSize+gatePadding, y + gatePadding/2 + pinSize*i, 0, "outpin", this));
        }
    }
}
function adjustRelativeValuesOfGate(gate){
            gate.Rx = gate.x*canvas.width/gate.scaleFactorX;// rx - relative x
            gate.Ry = gate.y*canvas.height/gate.scaleFactorY;
            gate.Rwidth = gate.width*canvas.width/gate.scaleFactorX;
            gate.Rheight = gate.height*canvas.height/gate.scaleFactorY;
            for(let i=0; i<gate.inpins.length; i++){
                gate.inpins[i].x = gate.Rx - pinSize - gatePadding;
                gate.inpins[i].y = gate.Ry + pinSize*i + gatePadding/2;
            }
            for(let i=0; i<gate.outpins.length; i++){
                gate.outpins[i].x = gate.Rx + gate.Rwidth + pinSize + gatePadding;
                gate.outpins[i].y = gate.Ry + pinSize*i + gatePadding/2;
            }
}

class connection{
    constructor(from, to, state, path){
        this.from = from;
        this.to   = to;
        this.state= state;
        this.path = path;
        this.scaleFactorX = canvas.width;
        this.scaleFactorY = canvas.height;
        this.activeColor  = settings.activePinColor.replace("100%", "40%");
    }
}
class pin{
    constructor(x, y, state, type, gate){
        this.state = state;
        this.x = x;
        this.y = y;
        this.type = type; // Input pin / output pin
        this.gate = gate; // connected to this gate
        this.connectedTo = [];
    }
}
class button{
    constructor(x, y, width, height, eventListener, className){
        this.x = x;
        this.y = y;
        this.width  = width;
        this.height = height;
        this.eventListener = eventListener;
        this.className = className;
    }
}

function main(){
    // canvas.requestFullscreen();
    loadSavedFiles();
    configureDimensions();
    UIupdateInterval = setInterval(updateUI, 1000/settings.UIrefreshRate);

    
    
    notify("Load Successful", 2000);

    setUIlayout();
}

function handleClick(e){
    // scanning ui elements 
    const cx = e.clientX*canvas.width/window.innerWidth;
    const cy = e.clientY*canvas.height/window.innerHeight;

    clickedOnBlankScreen = true;
    
    for(let i=0; i<buttons.length; i++){
        if(cx > buttons[i].x && cx<(buttons[i].x+buttons[i].width) && cy > buttons[i].y && cy<(buttons[i].y+buttons[i].height)){
            clickedOnBlankScreen = false;
            buttons[i].eventListener();
        }
    }

       
    // This handles clicks in input pins container (adds input pin, selects them or toggles them)
    if(cx<settings.pinContainerWidth && cy>settings.topBarHeight){
        clickedOnBlankScreen = false;
        const width = 25;   // This is the width if pin (width and height are same)
        const x = settings.pinContainerWidth/2;
        const y = (Math.round(cy/width))*width;

        let pinExists = false; // if pin does not exist new pin will be added
        for(let i=0; i<inpins.length; i++){
            if(inpins[i].y == y){
                pinExists = true; // Found an already existing pin
                if(cx>settings.pinContainerWidth/2){
                    
                    if(selectedPin == inpins[i]){ // Deselecting Pins
                        selectedPin = undefined;
                        inpins[i].state = 0;
                        connectionPath = [];
                    }
                    else{  // If another pin is selected , then deselecting it and selecting the clicked pin
                        selectedPin = inpins[i];
                        inpins[i].state = 0;
                        connectionPath = [];
                    }
                }
                else if(cx < y+6){ // changing the state of pin , detects click on smaller part of the pin
                    if(inpins[i].state == 0){
                        inpins[i].state = 1;
                        selectedPin = undefined;
                        connectionPath = [];
                    }
                    else{
                        inpins[i].state = 0;
                        selectedPin = undefined;
                        connectionPath = [];
                    }
                }
            }
        }
        if(!pinExists){
            inpins.push(new pin(x, y, 0, "main_input_pin", undefined));
        } 
    }
    // Detecting clicks in output container area
    if(cx>canvas.width-settings.pinContainerWidth && cy>settings.topBarHeight){
        clickedOnBlankScreen = false;
        const width = 25;   // This is the width if pin (width and height are same)
        const x = canvas.width-settings.pinContainerWidth/2;
        const y = (Math.round(cy/width))*width;
        let pinExists = false; // if pin does not exist new pin will be added

        for(let i=0; i<outpins.length; i++){
            if(outpins[i].y == y){
                if(selectedPin.type != "main_input_pin"){
                    connect(selectedPin, outpins[i]);
                }
                pinExists = true;
                break;
            }
        }
        if(!pinExists){
            outpins.push(new pin(x, y, 0, "main_output_pin", undefined));
        }
    }

    // Checking if user clicked on element info menu and closing it if user clicked anywhere else
    if(selectedElementInfoMenuOpen){
        const width = 240;
        const height = (selectedPin!=undefined) ? 100 + selectedPin.connectedTo.length*20 : 120;
        const x = canvas.width-settings.pinContainerWidth - width - 10;
        const y = 10+settings.topBarHeight;
        if(cx>x && cx<x+width && cy>y && cy<y+height){
            console.log("area clicked")
            clickedOnBlankScreen = false;
        }
        else if(cy>settings.topBarHeight){
            selectedElementInfoMenuOpen = false;
            console.log("closing info menu")
        }
    }
}

function handleStart(e){
    let cx = Math.round(e.clientX*canvas.width/window.innerWidth);
    let cy = Math.round(e.clientY*canvas.height/window.innerHeight);
    clickedOnBlankScreen = true;
    
    try{
        cx = Math.round(e.touches[0].clientX*canvas.width/window.innerWidth);
        cy = Math.round(e.touches[0].clientY*canvas.height/window.innerHeight);
    }
    catch(exception){}
    // Checking if the user clicked on any gate (Scanning in reverse because the later added gate will have greater index and will have higher z-index)
    for(let i=gates.length-1; i>=0; i--){
        if(cx > gates[i].Rx-gatePadding && cx<(gates[i].Rx+gates[i].Rwidth + gatePadding) && cy > gates[i].Ry-gatePadding && cy<(gates[i].Ry+gates[i].Rheight+gatePadding)){
            selectedGate = gates[i];
            selectedGate.beingDragged = true;
            clickedOnBlankScreen = false;
            break;
        }
        // Checking if user clicked on any input pin
        else if(selectedPin != undefined && cx>gates[i].Rx-2*pinSize-gatePadding && cx<gates[i].Rx-gatePadding){ // Detects click in input pins area
            for(let j=0; j<gates[i].type.inpins; j++){
                if(cy>gates[i].Ry + pinSize*j && cy<gates[i].Ry + pinSize*(j+1)){
                    connect(selectedPin, gates[i].inpins[j]);
                    clickedOnBlankScreen = false;
                    break;
                }
            }
        }
        // Checking if user clicked on any output pin
        else if(cx>gates[i].Rx+gates[i].Rwidth+2*gatePadding-pinSize/2 && cx<gates[i].Rx+gates[i].Rwidth+2*gatePadding+pinSize/2){ // Detecting click in outout oins area
            for(let j=0; j<gates[i].type.outpins; j++){
                if(cy>gates[i].Ry + pinSize*j && cy<gates[i].Ry + pinSize*(j+1)){
                    if(gates[i].outpins[j] == selectedPin){
                        selectedPin = undefined;
                        connectionPath = [];
                    }
                    else{
                        selectedPin = gates[i].outpins[j];
                    }
                    clickedOnBlankScreen = false;
                    connectionPath = [];
                    break;
                }
            }
        }
    }
    if(clickedOnBlankScreen && selectedPin != undefined && cy>settings.topBarHeight && cx>settings.pinContainerWidth && cx < canvas.width - settings.pinContainerWidth){
        connectionPath.push([cx, cy]);
    }
}
function handleMove(e){
    let px = Math.round(e.pageX*canvas.width/window.innerWidth);
    let py = Math.round(e.pageY*canvas.height/window.innerHeight);
    
    try{
        px = Math.round(e.touches[0].clientX*canvas.width/window.innerWidth);
        py = Math.round(e.touches[0].clientY*canvas.height/window.innerHeight);
    }
    catch(exception){}
    cursorCoordinates = [px, py];

    if(py < settings.topBarHeight){
        return;
    }

    if(selectedGate != undefined && px>settings.pinContainerWidth+selectedGate.width && px<canvas.width-settings.pinContainerWidth-2*selectedGate.width && py>settings.topBarHeight+selectedGate.height){
        selectedGate.scaleFactorX = canvas.width;
        selectedGate.scaleFactorY = canvas.height;
        selectedGate.x = px;
        selectedGate.y = py;
        adjustRelativeValuesOfGate(selectedGate);
    }
    if(selectedPin != undefined){
        connectionPath.pop();
        connectionPath.push([px, py]);
    }
}
function handleEnd(e){
    const cx = Math.round(e.clientX*canvas.width/window.innerWidth);
    const cY = Math.round(e.clientY*canvas.height/window.innerHeight);

    if(selectedGate != undefined){
        selectedGate.beingDragged = false;
        lastSelectedGate = selectedGate;
        selectedGate = undefined;
    }
    
}

// This function draws buttons and other interactive elements 
function updateUI(){
    ctx.beginPath();
    ctx.strokeStyle = "rgba(100 100 100 / "+settings.gridOpacity+"%)";
    ctx.lineWidth = 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Drawing Grid
    for(let i=settings.pinContainerWidth + settings.gridSize; i<(canvas.width-settings.pinContainerWidth); i+=settings.gridSize){
        ctx.moveTo(i, settings.topBarHeight);
        ctx.lineTo(i, canvas.height); 
        
    }
    for(let j=settings.topBarHeight + settings.gridSize; j<canvas.height; j+= settings.gridSize){
        ctx.moveTo(settings.pinContainerWidth, j);
        ctx.lineTo(canvas.width-settings.pinContainerWidth, j);
        
    }
    ctx.stroke();
    ctx.closePath();

    drawGates();
    drawConnections();
    
    // Drawing Menu
    if(menu.open){
        drawMenu();
    }
    // Drawing gate menu
    if(menu.gateMenuOpen){
        drawGateMenu();
    }
    // Drawing toast
    if(toast.requested){
        drawRoundRect(canvas.width*0.40, canvas.height*0.9, canvas.width*0.2, canvas.height*0.08, 5, "White", "White", 0);
        ctx.font = "15px monospace";
        ctx.fillStyle = "#333333";
        ctx.fillText(toast.text, canvas.width*0.42, canvas.height*0.945, canvas.width*0.16);
    }
    if(selectedElementInfoMenuOpen){
        drawElementInfoMenu();
    }

    drawUI();
}

function drawGates(){
    // Drawing gates 
    for(let i=0; i<gates.length; i++){
        const x = gates[i].Rx;
        const y = gates[i].Ry;
        const width = gates[i].Rwidth;
        const height = gates[i].Rheight;
        drawRoundRect(x-gatePadding, y-gatePadding, width + 2*gatePadding, height + 2*gatePadding, 5, gates[i].type.color.replace("100%", "20%"), gates[i].type.color, 1);

        // Drawing input Pins
        ctx.lineWidth = 2;
        let j = 0;
        gates[i].inpins.forEach((pin)=>{
            if(pin.state == 0){
                ctx.strokeStyle = "#888888";
            }
            else if(pin.state == 1){
                ctx.strokeStyle = "rgba(50 255 50 / 100%)";
            }
            ctx.beginPath();
            ctx.arc(x-pinSize-gatePadding, y + gatePadding/2 + pinSize*j, pinSize/2, 0, 6.18);
            ctx.closePath();
            ctx.stroke();
            j++;
        });

        //Drawing output pins
        j = 0;
        gates[i].outpins.forEach((pin)=>{
            if(pin.state == 0){
                ctx.strokeStyle = "#888888";
            }
            else if(pin.state == 1){
                ctx.strokeStyle = "rgba(50 255 50 / 100%)";
            }
            if(pin == selectedPin){
                ctx.strokeStyle = "#00afff";
            }
            ctx.beginPath();
            ctx.arc(x+width+pinSize+gatePadding, y + gatePadding/2 + pinSize*j, pinSize/2, 0, 6.18);
            ctx.closePath();
            ctx.stroke();
            j++;
        });

        ctx.fillStyle = gates[i].type.color;
        ctx.font = settings.gateFontSize+"px monospace";
        // Hightlighting selected gate 
        if(gates[i] == selectedGate){
            drawRoundRect(x-gatePadding, y-gatePadding, width + 2*gatePadding, height + 2*gatePadding, 5, "rgba(50 50 255 / 80%)", "White", 1);
            ctx.fillStyle = "Black";
        }
        
        ctx.fillText(gates[i].type.name, x, y+(height+width/3)/2, width);
    
    }
}
function drawConnections(){
    // Drawing a line that is not yet connected (User must be deciding the path of connection line)
    ctx.lineWidth = settings.connectionLineWidth;
    ctx.strokeStyle = "rgba(200 0 0 / 100%)";
    if(connectionPath.length != 0 && selectedPin != undefined){
        ctx.beginPath();
        ctx.moveTo(selectedPin.x, selectedPin.y);

        for(let i=0; i<connectionPath.length; i++){
            ctx.lineTo(connectionPath[i][0], connectionPath[i][1]);
        }
        ctx.stroke();
        ctx.closePath();
    }
    
    // Drawings connection lines that are connected to a pin
    ctx.lineWidth = settings.connectionLineWidth;
    
    for(let i=0; i<gates.length; i++){
        for(let j=0; j<gates[i].inConnections.length; j++){
            const line = gates[i].inConnections[j];
            ctx.strokeStyle = settings.connectionLineColor;

            if(line.state == 1){
                ctx.strokeStyle = line.activeColor;
            }

            ctx.beginPath();
            ctx.moveTo(line.from.x, line.from.y);

            for(let k=0; k<line.path.length; k++){
                ctx.lineTo(line.path[k][0], line.path[k][1]);
            }
            ctx.lineTo(line.to.x, line.to.y);
            ctx.stroke();
            ctx.closePath();
        }
    }
    // Drawing main output connections separately since they do not belong to any gate
    for(let j=0; j<outpinConnections.length; j++){
        const line = outpinConnections[j];
        if(line.state == 1){
            ctx.strokeStyle = line.activeColor;
        }

        ctx.beginPath();
        ctx.moveTo(line.from.x, line.from.y);

        for(let k=0; k<line.path.length; k++){
            ctx.lineTo(line.path[k][0], line.path[k][1]);
        }
        ctx.lineTo(line.to.x, line.to.y);
        ctx.stroke();
        ctx.closePath();
    }
}

function drawUI(){
    
    ctx.fillStyle = settings.topBarColor;
    ctx.fillRect(0, 0, canvas.width, settings.topBarHeight);

    ctx.fillStyle = settings.pinContainerColor;
    ctx.fillRect(0, settings.topBarHeight, settings.pinContainerWidth, canvas.height);
    ctx.fillRect(canvas.width - settings.pinContainerWidth, settings.topBarHeight, settings.pinContainerWidth, canvas.height);

    drawRoundRect(5, 5, 40, 35, "Black", "#555555", 1);
    ctx.strokeStyle = "rgb(100 100 125 / 100%)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(10, 10);
    ctx.lineTo(35, 10);
    ctx.moveTo(10, 20);
    ctx.lineTo(35, 20);
    ctx.moveTo(10, 30);
    ctx.lineTo(35, 30);
    ctx.stroke();
    ctx.closePath();

    drawRoundRect(canvas.width*0.09, 5, canvas.width*0.09, 30, 5, "rgba(0 0 0 / 50%)", "rgba(100 100 100 / 100%)", 1);
    drawRoundRect(canvas.width*0.19, 5, canvas.width*0.09, 30, 5, "rgba(0 0 0 / 50%)", "rgba(100 100 100 / 100%)", 1);
    drawRoundRect(canvas.width*0.29, 5, canvas.width*0.09, 30, 5, "rgba(0 0 0 / 50%)", "rgba(100 100 100 / 100%)", 1);
    drawRoundRect(canvas.width*0.39, 5, canvas.width*0.09, 30, 5, "rgba(0 0 0 / 50%)", "rgba(100 100 100 / 100%)", 1);
    
    ctx.font = "16px monospace";
    ctx.fillStyle = "#aaaaaa";
    ctx.fillText("Gate >",canvas.width*0.1, 25, canvas.width*0.08);
    ctx.fillText("Clear",canvas.width*0.2, 25, canvas.width*0.08);
    ctx.fillText("Fullscreen",canvas.width*0.3, 25, canvas.width*0.08);
    ctx.fillText("Save Gate",canvas.width*0.4, 25, canvas.width*0.08);

    // Drawing coordinate display
    ctx.fillStyle = "#00afff"
    ctx.fillText("("+cursorCoordinates+")", canvas.width-150, 25, 100);

    //Drawing input pins
    for(let i=0; i<inpins.length; i++){
        if(selectedPin == inpins[i]){
            setctx("transparent", settings.selectedPinColor, 2);
        }
        else if(inpins[i].state == 1){
            setctx(settings.activePinColor.replace("100%", "20%"), settings.activePinColor, 2);
        }
        else{
            setctx("transparent", "#888888", 2);
        }
        ctx.beginPath();
        ctx.arc(inpins[i].x-10, inpins[i].y, 3, 0, 2*3.1416);
        ctx.lineTo(inpins[i].x, inpins[i].y);
        ctx.arc(inpins[i].x+8, inpins[i].y, 8, 3.14, 3.13);
        ctx.stroke();
        ctx.fill();
        ctx.closePath();
    }
    // Drawing output pins
    for(let i=0; i<outpins.length; i++){
        if(selectedPin == outpins[i]){
            setctx("transparent", settings.selectedPinColor, 2);
        }
        else if(outpins[i].state == 1){
            setctx(settings.activePinColor.replace("100%", "20%"), settings.activePinColor, 2);
        }
        else{
            setctx("transparent", "#888888", 2);
        }

        ctx.beginPath();
        ctx.arc(outpins[i].x, outpins[i].y, 8, 0, 6.18);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    // Drawing elment info toggle button
    ctx.strokeStyle = "#888888";
    ctx.strokeWidth = 2;
    if(selectedElementInfoMenuOpen){
        ctx.moveTo(canvas.width-40, 25);
        ctx.lineTo(canvas.width-30, 15);
        ctx.lineTo(canvas.width-20, 25);
    }
    else{
        ctx.moveTo(canvas.width-40, 15);
        ctx.lineTo(canvas.width-30, 25);
        ctx.lineTo(canvas.width-20, 15);
    }
    ctx.stroke();
}
function setUIlayout(){
    
    buttons.push(new button(10, 10, 30, 25, ()=>{menu.open = true, setMenuButtonsLayout()}, "open_menu_btn")); // Menu Button

    buttons.push(new button(canvas.width*0.09, 5, canvas.width*0.09, 30, ()=>{menu.gateMenuOpen = true; setGateMenuButtonsLayout()}, "topBarbtn")); // Gates Button
    
    buttons.push(new button(canvas.width*0.19, 5, canvas.width*0.09, 30, clearScreen, "topBarbtn"));                  // Clear Button

    buttons.push(new button(canvas.width*0.29, 5, canvas.width*0.09, 30, ()=>{canvas.requestFullscreen()}, "topBarbtn"));  // Fullscreen Button
    buttons.push(new button(canvas.width*0.39, 5, canvas.width*0.09, 30, integrateCircuit, "topBarbtn"));                        // Ctreate Gate Button

    buttons.push(new button(canvas.width-40, 15, 20, 10, ()=>{
        selectedElementInfoMenuOpen = (selectedElementInfoMenuOpen)?false:true;
        if(selectedElementInfoMenuOpen){
            setSelectedElementInfoMenuLayout();
        }
        else{
            resetSelectedElementInfoMenuLayout();
        }
    }, "topbarbtn"));
}

function drawMenu(){
    const unitX = canvas.width/100;
    const unitY = canvas.height/100;
    const tabFontX = menu.tabX + menu.tabWidth/10;
    const tabFontY = menu.tabY + (menu.tabFontSize + menu.tabHeight)/2;

    setctx("rgba(0 0 0 / 0.3)");
    ctx.fillRect(settings.pinContainerWidth, settings.topBarHeight, canvas.width-2*settings.pinContainerWidth, canvas.height);
    drawRoundRect(unitX*20, unitY*15, unitX*60, unitY*70, 5, "rgba(10 10 15 / 100%)",  "rgba(65 50 75 / 100%)", 2);

    ctx.beginPath();

    setctx("rgba(0 0 0 / 100%)", "rgba(100 100 100 / 100%)", 1);
    ctx.fillRect(unitX*20, unitY*15, unitX*20, unitY*70);
    ctx.stroke();
    ctx.closePath();
    

    // Menu tabs and close button
    setctx("#00afff", "#00afff", 1);
    ctx.font = menu.tabFontSize+"px monospace";
    ctx.fillText("Save", tabFontX, tabFontY);
    ctx.fillText("Main Menu", tabFontX, tabFontY + menu.tabHeight*1);
    ctx.fillText("Settings", tabFontX, tabFontY + menu.tabHeight*2);
    ctx.fillText("Tutorial", tabFontX, tabFontY + menu.tabHeight*3);
    ctx.fillText("About", tabFontX, tabFontY + menu.tabHeight*4);

    ctx.font = menu.closebtnFontSize+"px monospace";
    ctx.fillStyle = "Red";
    ctx.fillText("CLOSE", tabFontX, menu.closeBtnY + (menu.tabHeight + menu.closebtnFontSize)/2);

    ctx.fillStyle = "#aaaaaa";
    ctx.font = Math.round(unitX)+"px monospace";
    
    const linesPerPage = Math.round(canvas.height/40);
    switch(menu.currentTab){
        case 1:
            
            break;
        case 2:

            ctx.fillText("Grid Size", unitX*45, unitY*20, unitX*20);
            ctx.fillText("Grid Opacity", unitX*45, unitY*25, unitX*20);
            ctx.fillText("Gate Delay", unitX*45, unitY*30, unitX*20);
            ctx.fill();
            break;

        case 3: 
        
            const text = tutorialText.split("\n");
            const page = Number(tutorialText.charAt(tutorialText.length-1));
            
            
            for(let i=page*linesPerPage; i<(page+1)*linesPerPage; i++){
                if(text[i] == "__END__"){
                    break;
                }
                else if(text[i] == undefined){
                    tutorialText += 1;
                }
                ctx.fillText(text[i], unitX*45, unitY*(20 + 3*(i-page*linesPerPage)), unitX*30);
            }

            drawRoundRect(unitX*45, unitY*75, 5*unitX, 30, 5, "rgba(100 100 100 / 30%)", "transparent", 1);
            drawRoundRect(unitX*70, unitY*75, 5*unitX, 30, 5, "rgba(100 100 100 / 30%)", "transparent", 1);
            ctx.fillStyle = "White";
            ctx.fillText("Previous", unitX*45+5, unitY*75+(unitX+30)/2, 4*unitX);
            ctx.fillText("Next", unitX*70+15, unitY*75+(unitX+30)/2, 4*unitX);

            ctx.fillText(page+1, 60*unitX, 80*unitY);
            break;
        case 4:
            const abtText = aboutText.split("\n");
            for(let i=0; i<abtText.length; i++){
                ctx.fillText(abtText[i], unitX*45, unitY*(20 + 3*i), unitX*30);
            }
    }
    // Highlighting selected tab
    drawRoundRect(menu.tabX, menu.tabY + menu.tabHeight*menu.currentTab, menu.tabWidth, menu.tabHeight, 5, "rgba(0 100 255 / 30%)", "transparent", 1);
    setctx("#00afff", "#00afff", 1);
    drawLine(menu.tabX+5, menu.tabY + menu.tabHeight*(menu.currentTab + 1) + 2, menu.tabX+menu.tabWidth-5, menu.tabY + menu.tabHeight*(menu.currentTab + 1) + 2); 
    ctx.stroke();

    drawRoundRect(menu.tabX, menu.closeBtnY, menu.tabWidth, menu.tabHeight, 5, "rgba(255 50 50 / 20%)", "Red", 1); // Highlighting CLOSE button
}
function setMenuButtonsLayout(){
    resetMenuButtonsLayout();
    const unitX = canvas.width/100;
    const unitY = canvas.height/100;
    const tabWidth = menu.tabWidth;
    const tabHeight = menu.tabHeight; 
    const x = menu.tabX;
    const y = menu.tabY;

    buttons.push(new button(x, y, tabWidth, tabHeight, save, "menu_tab")); // Save button
    buttons.push(new button(x, y + tabHeight, tabWidth, tabHeight, ()=>{
        menu.currentTab = 1; 
        notify("Feature Unavailable", 2000); 
        setMenuButtonsLayout();}, "menu_tab")); // Main Menu button

    buttons.push(new button(x, y + 2*tabHeight, tabWidth, tabHeight, ()=>{menu.currentTab = 2; setMenuButtonsLayout();}, "menu_tab")); // Settings button
    buttons.push(new button(x, y + 3*tabHeight, tabWidth, tabHeight, ()=>{menu.currentTab = 3; setMenuButtonsLayout();}, "menu_tab")); // Tutorial button
    buttons.push(new button(x, y + 4*tabHeight, tabWidth, tabHeight,()=>{menu.currentTab = 4; setMenuButtonsLayout();}, "menu_tab")); // About button
    buttons.push(new button(x, menu.closeBtnY, tabWidth, tabHeight, ()=>{ // close button
        menu.open = false;
        resetMenuButtonsLayout();
    }, "menu_tab")); // Close button
    if(menu.currentTab == 2){
        setctx();
    }
    else if(menu.currentTab == 3){
        // drawRoundRect(unitX*45, unitY*75, 5*unitX, 30, 5, "rgba(100 100 100 / 30%)", "transparent", 1);
        // drawRoundRect(unitX*70, unitY*75, 5*unitX, 30, 5, "rgba(100 100 100 / 30%)", "transparent", 1);
        buttons.push(new button(unitX*70, unitY*75, 5*unitX, 30, ()=>{ // Tutorial Next page button
            page = Number(tutorialText.charAt(tutorialText.length-1));
            if(page < 10){
                tutorialText += (page+1);
            }
         }));

         buttons.push(new button(unitX*45, unitY*75, 5*unitX, 30, ()=>{ // Tutorial Prvious page button
            page = Number(tutorialText.charAt(tutorialText.length-1));
            if(page == 0) {return}
            tutorialText += (page-1);
         }));
    }
}
function resetMenuButtonsLayout(){
    for(let i=0; i<buttons.length; i++){
        if(buttons[i].className == "menu_tab"){
            buttons.splice(i, 6);
        }
        else if(buttons[i].className == "menu_settings_apply_btn" || buttons[i].className == "menu_tutorial_prev/next_btn" ){
            buttons.splice(i, 1);
        }
        else if(buttons[i].className == "menu_settings_setter"){

        }
    }
}

function drawGateMenu(){
    const unitX = Math.round(canvas.width/100);
    const unitY = Math.round(canvas.height/100);

    ctx.font = "15px monospace";
    ctx.fillStyle = "rgba(100 100 100 / 40%)";
    for(let i=0; i<circuits.length; i++){
        ctx.fillRect(unitX*9, 40+unitY*5*i, unitX*12, unitY*5);
    }
    let i;
    for(i=0; i<circuits.length; i++){
        drawRoundRect(unitX*10, 45+unitY*5*i, unitX*10, unitY*4, 5, "Black", "Grey", 1);
        ctx.fillStyle = circuits[i].color;
        ctx.fillText(circuits[i].name, unitX*10+10, 62.5+unitY*5*i, unitX*10);
    }
    
    drawRoundRect(unitX*10, 45+unitY*5*i, unitX*10, unitY*4, 5, "rgba(255 50 50 / 20%)", "Red", 1);
    ctx.fillStyle = "Red";
    ctx.fillText("CLOSE", unitX*10+10, 62.5+unitY*5*i, unitX*10);
}
function setGateMenuButtonsLayout(){ // Reset function is written inline in close button
    const unitX = Math.round(canvas.width/100);
    const unitY = Math.round(canvas.height/100);
    let closeButtonPositionIndex;

    for(let i=0; i<circuits.length; i++){

        buttons.push(new button(unitX*10, 45+unitY*5*i, unitX*10, unitY*4, ()=>{ // These are the buttons that add gate to the screen 
            const id = (gates.length == 0) ? 1:gates[gates.length-1].id+1;
            gates.push(new gate(id, canvas.width/2, canvas.height/2, circuits[i], []));
            adjustRelativeValuesOfGate(gates[gates.length-1]);
        }, "gateMenubtn"));

        closeButtonPositionIndex = i;
    }

    closeButtonPositionIndex++;

    buttons.push(new button(unitX*10, 45+unitY*5*closeButtonPositionIndex, unitX*10, unitY*4, ()=>{ // Gate menu close button
        menu.gateMenuOpen = false;
        for(let i=0; i<buttons.length; i++){
            if(buttons[i].className == "gateMenubtn"){
                buttons.splice(i, circuits.length+1);
                break;
            }
        }
    }, "gateMenu_gatePlate")); // Gate menu close button
}

function drawElementInfoMenu(){
    
    const width = 240;
    const height = (selectedPin!=undefined) ? 100 + selectedPin.connectedTo.length*20 : 120;
    const x = canvas.width-settings.pinContainerWidth - width - 10;
    const y = 10+settings.topBarHeight;

    drawRoundRect(x, y, width, height, 5, "Black", "#222222", 2);
    ctx.font = "12px monospace";
    ctx.fillStyle = "#00afff";
    if (lastSelectedGate != undefined){
        ctx.fillText("Selected gate id : "+lastSelectedGate.id, x+10, y+15, 150);
        ctx.fillText("Selected gate type : "+lastSelectedGate.type.name, x+10, y+30, 150);
        ctx.fillText("Select Output Colour : ", x+10, y+45, 150);
        // Drawing Output Colour Preview (This also acts as a button to change output coulor)
        drawRoundRect(x+width-65, y+30, 60, 20, 5, lastSelectedGate.outputColour.replace("100%", "30%"), lastSelectedGate.outputColour, 1);
        //Drawing Delete Button
        ctx.fillStyle = "Red";
        ctx.fillText("DELETE", x+width-65, y+16, 50);
        setctx("rgba(255 50 50 / 20%)", "rgba(255 0 0 / 100%)", 2);
    }
    else{
        ctx.fillText("No Gate Selected", x+20, y+20, 200);
        setctx("rgba(50 50 50 / 20%)", "rgba(50 50 50 / 100%)", 2);
    }
    
    drawRoundRect(x+width-72, y+2, 70, 20, 4, ctx.fillStyle, ctx.strokeStyle, 1);
    ctx.lineWidth = 1;
    ctx.moveTo(x+width-20, y+6);
    ctx.lineTo(x+width-8, y+16);
    ctx.moveTo(x+width-8, y+6);
    ctx.lineTo(x+width-20, y+16);
    ctx.stroke();


    ctx.strokeStyle = "#555555";
    ctx.moveTo(x, y+60);
    ctx.lineTo(x+width, y+60);
    ctx.stroke();
    if(selectedPin == "main_input_pin" || selectedPin == "main_output_pin"){
        setctx("rgba(255 50 50 / 20%)", "rgba(255 0 0 / 100%)", 2);
    }
    else{
        setctx("rgba(50 50 50 / 20%)", "rgba(50 50 50 / 100%)", 2);
    }
}
function setSelectedElementInfoMenuLayout(){
    const width = 240;
    const height = (selectedPin!=undefined) ? 100 + selectedPin.connectedTo.length*20 : 120;
    const x = canvas.width-settings.pinContainerWidth - width - 10;
    const y = 10+settings.topBarHeight;

    if(lastSelectedGate != undefined){
        buttons.push(new button(x+width-72, y+2, 70, 20, ()=>{deleteGate(lastSelectedGate); lastSelectedGate = undefined; console.log("Deleting Gate")}), "element_info_menu_btn") // Delete gate button
        buttons.push(new button(x+width-65, y+30, 60, 20, ()=>{lastSelectedGate.outputColour = pickColour()}), "element_info_menu_btn") // Delete gate button
    }
    
}
function resetSelectedElementInfoMenuLayout(){

}
function clearScreen(){
    while(gates.length != 0){
        deleteGate(gates.at(-1));
    }
    while(inpins.length != 0){
        delete inpins.at(-1);
        inpins.splice(inpins.length-1, 1);
    }
    while(outpins.length != 0){
        delete outpins.at(-1);
        outpins.splice(outpins.length-1, 1);
    }
    lastSelectedGate = undefined;
    selectedGate = undefined; 
    selectedPin = undefined; 
    connectionPath = [];
    outpinConnections = [];
    outpins = [];
    inpins = [];
}
function deleteGate(gate){
   
    for(let i=0; i<gate.inpins.length; i++){
        for(let j=0; j<gate.inpins[i].connectedTo.length; j++){
            gate.inpins[i].connectedTo[j].connectedTo.splice(gate.inpins[i].connectedTo[j].connectedTo.indexOf(gate.inpins[i]), 1);
        }
        delete gate.inConnections[i];
        delete gate.inpins[i];    
    }
    for(let i=0; i<gate.outpins.length; i++){   
        for(let j=0; j<gate.outpins[i].connectedTo.length; j++){
            gate.outpins[i].connectedTo[j].connectedTo.splice(gate.outpins[i].connectedTo[j].connectedTo.indexOf(gate.outpins[i]), 1);
        }
        delete gate.outConnections[i];
        delete gate.outpins[i];    
    }
    gates.splice(gates.indexOf(gate), 1);
    delete gate;
}
function deleteConnection(line){
    if(line.from.type == "main_input_pin"){

    }
    else if(line.to.type == "main_output_pin"){

    }
    else{

    }
}
function deletePin(pin){
    if(pin.type == "main_input_pin"){
        
    }
    else if(pin.type == "main_output_pin"){
        
    }
}
function save(){
    notify("Save Successful", 3000);
}
function loadSavedFiles(){
    let gateData = localStorage.getItem("gateData");
    
    if(gateData == null || gateData == ""){
        circuits.push(new circuit("AND", ["pin0&pin1"], 2, 1, "rgba(0 255 0 / 100%)"));
        circuits.push(new circuit("NOT", ["!pin0"], 1, 1, "rgba(255 0 0 / 100%)"));
        circuits.push(new circuit("OR", ["pin0|pin1"], 2, 1, "rgba(50 50 255 / 100%)"));
    }
    
}
function pickColour(){
    console.log("Picking Colour");
    return lastSelectedGate.outputColour;
}
function configureDimensions(){
    canvas.width=window.innerWidth; 
    canvas.height=window.innerHeight; 

    if(window.innerHeight < 500){
        canvas.height = 500;
        canvas.width = 500*window.innerWidth/window.innerHeight;
    }

    const unitX = Math.round(canvas.width/100);
    const unitY = Math.round(canvas.height/100);

    menu.tabX        = unitX*25;
    menu.tabY        = unitY*25;
    menu.tabWidth    = unitX*10;
    menu.tabHeight   = unitY*5;
    menu.tabFontSize = unitX;
    menu.closeBtnY   = unitY*75;
    menu.closebtnFontSize = unitX*1.25;

    for(let i=0; i<gates.length; i++){
        adjustRelativeValuesOfGate(gates[i]);
    }

}
function setctx(fillStyle, strokeStyle, strokeWidth){
    ctx.fillStyle   = fillStyle;
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth   = strokeWidth;
}
function notify(text, duration){
    toast.requested = true;
    toast.text = text;
    setTimeout(()=>{toast.requested = false;}, duration);
}
function drawLine(x1, y1, x2, y2){
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
}
function drawRoundRect(x, y, width, height, radius, fill, stroke, strokeWidth){
    setctx(fill, stroke, strokeWidth);
    ctx.beginPath();
    ctx.arc(x+radius,y+radius, radius, Math.PI, 3*Math.PI/2);
    ctx.lineTo(x+width-radius,y);
    ctx.arc(x+width-radius, y+radius, radius, 3*Math.PI/2, 0);
    ctx.lineTo(x+width,y+height-radius);
    ctx.arc(x+width-radius,y+height-radius, radius, 0, Math.PI/2);
    ctx.lineTo(x+radius, y+height);
    ctx.arc(x+radius,y+height-radius, radius, Math.PI/2, Math.PI);
    
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}
