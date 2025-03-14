let logicPath = []; // Stores path followed by function e so loops can be identified . Each element of array is a branch formed by connecting two connection lines to outpin of a gate .

function connect(fromPin, toPin){
    connectionPath.pop();
    toPin.connectedTo.push(fromPin);
    fromPin.connectedTo.push(toPin);
    if(toPin.type != "main_output_pin"){
        toPin.gate.inConnections.push(new connection(fromPin, toPin, fromPin.state, connectionPath));
    }
    else{
        outpinConnections.push(new connection(fromPin, toPin, fromPin.state, connectionPath));
    }
    connectionPath = [];
    selectedPin = undefined;
    constructLogic();
}

function integrateCircuit(){

}



function constructLogic(){
    logic = [];

    for(let i=0; i<outpins.length; i++){
        if(outpins[i].connectedTo != undefined){

            logicPath = [];
            let logicString = "(";

            for(let j=0; j<outpins[i].connectedTo.length-1; j++){
                logicString += "("+e(outpins[i].connectedTo[j])+")|";
            }

            logicString += "("+e(outpins[i].connectedTo[outpins[i].connectedTo.length-1])+"))";
            logic.push(logicString);
        }
        else{
            logic.push(undefined);
        }
        
    }
}


function e(pin){
    //console.log(pin.gate, pin)
    if(pin.gate == undefined){
        return "inpin["+inpins.indexOf(pin)+"]";
    }

    let i = pin.gate.outpins.indexOf(pin);
    let gateLogic = "("+pin.gate.type.logic[i]+")";
    
    
        for(let j=0; j<pin.gate.inpins.length;j++){
            if(pin.gate.inpins[j].connectedTo.type != "main_input_pin"){
                let pinLogic = gateLogic;
                for(let k=0; k<pin.gate.inpins[j].connectedTo.length-1;k++){
                    pinLogic = gateLogic.replace("pin"+j, "("+e(pin.gate.inpins[j].connectedTo[k]+")|"));
                }

                gateLogic = gateLogic.replace("pin"+j, e(pin.gate.inpins[j].connectedTo.at(-1)));
                console.log("gateLogic = "+gateLogic, j)
            }
            else{
            //    str += "("+pin.gate.type.logic[i].replaceAll(""+j, pin.gate.inpins[j].connectedTo.state+")");
            }
        }


    return gateLogic;
}



// Simulating the logic

function evaluate(){
    for(let i=0; i<gates.length; i++){
        for(let j=0;j<gates[i].inConnections.length;j++){
            gates[i].inConnections[j].state =  gates[i].inConnections[j].from.state;
            
            gates[i].inConnections[j].to.state =  gates[i].inConnections[j].from.state;
            const func = ()=>{
                for(let x=0; x<gates[i].outpins.length;x++){
                    
                    let logicString = gates[i].type.logic[x];
                    for(let y=0; y<gates[i].inpins.length; y++){
                        logicString = logicString.replaceAll(`pin${y}`, gates[i].inpins[y].state);
                    }
                    gates[i].outpins[x].state = eval(logicString)?1:2;
                }
            };
            setTimeout(func, 200);
        }
    }
}

setInterval(evaluate, 200);