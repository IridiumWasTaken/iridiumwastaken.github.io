// Main file responsible for scanning and showing information about scanned glass panes

import { get, set } from '/js/IDB/idb.js';
import { LastScan } from '/js/lastscan.js';

// init global vars
const API_URL = 'https://172.20.2.10:3001';
const API_TIMEOUT = 2000;
const glassRegexp = /(?:S:(S{1}\d+))/g;
const rackRegexp = /(?:R:([^\s]+)(?:\s{1}#{1}(\d+))?)/gs;
const MAX_HISTORY_LENGTH = 10;

var lastScan = new LastScan(MAX_HISTORY_LENGTH);
var lastGlass = {
    type: "Glass",
    no: ''
};
var lastRack = {
    type: "Rack",
    no: '',
    name: '',
    operationNo: undefined,
};

var allRacks = undefined;
var refractoryPeriod = 5000;
var user = undefined;

const notLoggedInText = "Sie sind nicht angemeldet. Bitte melden Sie sich an.";

// init Handlebarjs helpers
Handlebars.registerHelper('dateTime', function (aString) {
    var bits = aString.slice(0, -1).split(/[-T:]/g);
    var d = new Date(bits[0], bits[1]-1, bits[2]);
    d.setHours(bits[3], bits[4], bits[5]);
    
    let day = d.getDate().toString().padStart(2, "0");
    let month = (d.getMonth() + 1).toString().padStart(2, "0");
    let year = d.getFullYear().toString().slice(-2).padStart(2, "0");

    let hour = d.getHours().toString().padStart(2, "0");
    let minutes = d.getMinutes().toString().padStart(2, "0");

    return `${day}.${month}.${year} ${hour}:${minutes}`;
});

Handlebars.registerHelper('routings', function(aString){
    return aString.replace("Glas ", '');
});

Handlebars.registerHelper('ifEquals', function(a, b, options) {
    if (a === b) {
      return options.fn(this);
    }
  
    return options.inverse(this);
  });

// init service workers
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
        .then((reg) => {
        console.log('Service worker registered -->', reg);
        }, (err) => {
        console.error('Service worker not registered -->', err);
    });
}

$(async function(){
    console.log("DOM loaded");

    // check if user data is present
    user = await getUserData();
    if (user === undefined){
        alert(notLoggedInText);
    }

    get('lastGlass').then(function(val){
        if (val){
            lastGlass = val;
        }
    });
    get('lastRack').then(function(val){
        if (val){
            lastRack = val;
            setRackTitle(val);
        }
    });
   
    const scanPopupString = await (await fetch('/resources/templates/scan-popup.html')).text();
    const glassInfoString = await (await fetch('/resources/templates/glass_info.html')).text();
    const rackInfoString = await (await fetch('/resources/templates/rack_info.html')).text();
    const scanPopupTemplate = Handlebars.compile(scanPopupString);
    const glassInfoTemplate = Handlebars.compile(glassInfoString);
    const rackInfoTemplate = Handlebars.compile(rackInfoString);

    // init camera
    let contentHeight = $('#content').height();
    let contentWidth = $('#content').width();
    let maxWidth = 0.9 * Math.min(contentWidth, contentHeight);
    // let maxWidth = 150;
    const html5QrcodeScanner = new Html5Qrcode("content");
    const qrConfig = { fps: 3, qrbox: {width: maxWidth, height: maxWidth}, verbose: true, aspectRatio: contentHeight/contentWidth};

    html5QrcodeScanner.start({facingMode: {exact: "environment"}}, qrConfig, onScanSuccess, onScanFailure);

    // enabling switching to settings
    $('#settings').click(function(){
        let origin = window.location.origin;
        let mainpath = 'settings.html';
        document.location.href = origin + '/' + mainpath;
    });

    // enabling switching to see information about glass panes & the current rack
    $('#glass-info').on('click', showGlassInformation);
    $('#scan').on('click', showScan);
    $('#rack-info').on('click', showRackInformation);

    // get information about all racks
    allRacks = await getAllRacks();

    // color the scan button
    var style = getComputedStyle(document.body);
    $('.bi-qr-code-scan').css('color', style.getPropertyValue('--online_bg_color'));

    async function onScanSuccess(decodedText, decodedResult) {
        html5QrcodeScanner.pause();
        console.log(`Code matched = ${decodedText}`, decodedResult);
        lastScan.text = decodedText;
        lastScan.result = decodedResult;
        try {
            if (glassRegexp.test(lastScan.text)) {

                resetRegexpIndices();
                let tmp = glassRegexp.exec(lastScan.text);
                lastGlass.no = tmp[1];
                lastScan.unshift(lastGlass);
                resetRegexpIndices();

                set('lastGlass', lastGlass);

                let postingResponse = await postingCases();
                postingResponse.text = lastScan.text;

                // GUI stuff
                let scanPopup = scanPopupTemplate(postingResponse);
                $(scanPopup).appendTo("#content");
                vibrate();
                setTimeout(() => {
                    html5QrcodeScanner.resume();
                    $('#scan-alert').remove()}, 
                    refractoryPeriod);

            } else if (rackRegexp.test(lastScan.text)) {

                resetRegexpIndices();
                let tmp = rackRegexp.exec(lastScan.text);
                lastRack.no = tmp[1];
                try {
                    lastRack.operationNo = tmp[2];
                } catch(e){
                    lastRack.operationNo = undefined;
                }
                lastRack.name = await getNameFromRackNo(lastRack.no);
                lastScan.unshift(lastRack);
                resetRegexpIndices();

                set('lastRack', lastRack);

                let postingResponse = await postingCases();
                postingResponse.text = lastScan.text;

                // GUI stuff
                setRackTitle(lastRack);
        
                let scanPopup = scanPopupTemplate(postingResponse);
                $(scanPopup).appendTo("#content");
                vibrate();
                setTimeout(() => {
                    html5QrcodeScanner.resume();
                    $('#scan-alert').remove()}, 
                    refractoryPeriod);


            } else {
                $(`<div id="scan-alert"><span>Gescannter Code: Ungültig</span></div>`).appendTo("#content");
                setTimeout(() => {
                    html5QrcodeScanner.resume();
                    $('#scan-alert').remove()}, 
                    refractoryPeriod);
            } 
        } catch(e){
            resetRegexpIndices();
            html5QrcodeScanner.resume();
            $('#scan-alert').remove();
        }                
    }
      
    function onScanFailure(error) {
        // handle scan failure, usually better to ignore and keep scanning.
        // for example:
        // console.warn(`Code scan error = ${error}`);
    }

    async function showGlassInformation(){
        if (user === undefined){
            alert(notLoggedInText);
            return;
        }

        html5QrcodeScanner.stop();

        $('#content').html('');
        $('#content').css('background-color', style.getPropertyValue('--default-bg-color'));
        $('#content').css('padding-left', '10px');
        $('#content').css('padding-right', '10px');
        $('.bi-qr-code-scan').css('color', 'white');
        $('#rack-info').css('color', 'white');
        $('#glass-info').css('color', style.getPropertyValue('--online_bg_color'));

        let result = await getGlassInformation(lastGlass.no);
        console.log(result);
        if (!result || result == [] || result.length == 0){
            result = {
                "status": "Keine Information",
                "text": "Keine Information zu dieser Glasscheibe gefunden." 
            };
        }

        // replace rack code by description if there is a description
        if (!allRacks){
            allRacks = await getAllRacks();
        }
        if ('rack' in result && result['rack'] != ''){
            allRacks.forEach(function(element){
                if ("code" in element && element['code'] == result['rack'] && "name" in element){
                    result['rack'] = element['name'];
                }
            });
        }

        let DOMElement = glassInfoTemplate(result);

        $('#content').html(DOMElement);
        $('#trash').click(async function(){
            if (confirm("Diese Scheibe wirklich als Ausschuss melden?")){
                let res = await trashGlass(lastGlass.no);
                res.text = '';
                let popup = scanPopupTemplate(res);
                $(popup).appendTo('#content');

                setTimeout(() => $('#scan-alert').remove(), 4000);
            }
        });
    }

    async function showRackInformation(){
        if (user === undefined){
            alert(notLoggedInText);
            return;
        }

        html5QrcodeScanner.stop();

        $('#content').html('');
        $('#content').css('background-color', style.getPropertyValue('--default-bg-color'));
        $('#content').css('padding-left', '10px');
        $('#content').css('padding-right', '10px');
        $('.bi-qr-code-scan').css('color', 'white');
        $('#rack-info').css('color', style.getPropertyValue('--online_bg_color'));
        $('#glass-info').css('color', 'white');

        let result = await getAllGlassNosPerRack(lastRack.no);
        console.log(result);
        if (!result || result == [] || result.length == 0){
            result = {
                "status": "Keine Information",
                "text": "Keine Scheiben auf diesem Bock gefunden", 
            };
        }

        let DOMElement = rackInfoTemplate(result);

        $('#content').html(DOMElement);
    }

    function showScan(){
        $('#content').css('background-color', 'black');
        $('#content').css('padding-left', '');
        $('#content').css('padding-right', '');
        $('#glass-info').css('color', 'white');
        $('#rack-info').css('color', 'white');
        $('.bi-qr-code-scan').css('color', style.getPropertyValue('--online_bg_color'));
        html5QrcodeScanner.start({facingMode: {exact: "environment"}}, qrConfig, onScanSuccess, onScanFailure);
    }
    
})

async function getUserData(){
    try {
        let username = await get('username');
        let password = await get('password');
        if (username && password){
            return {username: username, password: password};
        } else {
            return undefined;
        }
    } catch(e){
        return undefined;
    }
}

async function getGlassInformation(glassNo){
    try {
        let result1 = await $.ajax({
            type: "POST",
            url: API_URL + '/' + 'companies(8640f26b-f72c-ec11-8122-005056b605fd)/routingLines?$filter=glassNo%20eq%20\'' + glassNo + '\'',
            contentType: 'application/json',
            data: JSON.stringify({
                "username": user.username,
                "password": user.password,
                "method": "GET",
            }),
            timeout: API_TIMEOUT
        });
        let result2 = await $.ajax({
            type: "POST",
            url: API_URL + '/' + 'companies(8640f26b-f72c-ec11-8122-005056b605fd)/glassTracking(\'' + glassNo + '\')',
            contentType: 'application/json',
            data: JSON.stringify({
                "username": user.username,
                "password": user.password,
                "method": "GET",
            }),
            timeout: API_TIMEOUT
        });
        result1 = JSON.parse(result1);
        result2 = JSON.parse(result2);

        result1.value['rack'] = result2.rack;
        // continue parsing here
        return result1.value;
    } catch(e){
        return {"status": e.status, "text": e.statusText};
    }
}

async function updateGlassRack(glassNo, rackCode){
    try {
        let result = await $.ajax({
            type: "POST",
            url: API_URL + '/' + 'companies(8640f26b-f72c-ec11-8122-005056b605fd)/glassTracking(\'' + glassNo + '\')/Microsoft.NAV.update',
            contentType: "application/json",
            data: JSON.stringify({
                "username": user.username,
                "password": user.password,
                "method": "POST",
                "body": {"rack": rackCode }
            }),
            timeout: API_TIMEOUT
        });
        let tmp = JSON.parse(result);
        if (tmp.value == "Erfolg"){
            return {status: "success"}
        } else {
            return {status: "error", code: "Fehler beim Updaten der Glasscheibenposition."};
        }
    } catch(e){
        return {"status": e.status, "code": e.statusText};
    }
}

function operationInProgress(glassInfo){
    if (!glassInfo){ return undefined; };
    for (let i = 0; i < glassInfo.length; i++){
        let operation = glassInfo[i];
        if (operation.routingStatus == "In Bearbeitung"){
            return operation.operationNo;
        }
    }
    return false;
}

async function getAllRacks(){
    try{
        let result = await $.ajax({
            type: "POST",
            url: API_URL + '/' + 'companies(8640f26b-f72c-ec11-8122-005056b605fd)/glassRacks',
            contentType: "application/json",
            data: JSON.stringify({
                "username": user.username,
                "password": user.password,
                "method": "GET",
            }),
            timeout: 5000,
        });
        result = JSON.parse(result);
        return result.value;
    } catch(e) {
        return undefined;
    }
}

async function getNameFromRackNo(rackNo){
    if (!allRacks){
        allRacks = await getAllRacks();
    }
    if (!allRacks){
        return undefined;
    }
    for (let i = 0; i < allRacks.length; i++){
        let element = allRacks[i];
        if ("code" in element && "name" in element && element["code"] == rackNo && element["name"] != ''){
            return element["name"];
        }
    }
    return "Unbekannter Bock";
}

async function getAllGlassNosPerRack(rackCode){
    try {
        let result = await $.ajax({
            type: "POST",
            url: API_URL + '/' + 'companies(8640f26b-f72c-ec11-8122-005056b605fd)/glassTracking?$filter=rack eq \'' + rackCode + '\'',
            contentType: "application/json",
            data: JSON.stringify({
                "username": user.username,
                "password": user.password,
                "method": "GET",
            }),
            timeout: API_TIMEOUT
        });
        let tmp = JSON.parse(result);
        if (value in tmp){
            return value;
        }
        return {status: error, code: "Fehler beim Abfragen der Information zu diesem Bock."};
    } catch(e){
        return {"status": "error", "code": e.status + "\n" + e.statusText};
    }
}

async function trashGlass(glassNo){
    // TODO: Make sure that you don't trash the same glass twice in a row
    let glassInfo = await getGlassInformation(glassNo);
    if (!glassInfo) {
        return {status: "error", code: "Fehler bei der Abfrage der Glasinformationen."};
    }
    if ("status" in glassInfo) {
        return {status: "error", code: glassInfo["status"].toString() + "\n" + glassInfo.text};
    }
    return await handleOperation(glassInfo, 10, "scrap"); 
}

async function handleOperation(glassInfo, operationNo, type){
    // glassInfo: object gotten from routingLine API endpoint
    // operationNo: no of operation to start / end
    // type: "start", "finish"
    if (!glassInfo || !operationNo || !type){ return {status: "error", "code": "Parameter für Arbeitsgangstart/Ende fehlt."}};
    let prodOrderNo = glassInfo[0].prodOrderNo;
    let routingReferenceNo = glassInfo[0].routingReferenceNo;
    let routingNo = glassInfo[0].routingNo;
    try {
        let result = await $.ajax({
            type: "POST",
            url: API_URL + '/' + 'companies(8640f26b-f72c-ec11-8122-005056b605fd)/routingLines(\'Released\', \'' + prodOrderNo +'\', ' + routingReferenceNo + ', \'' + routingNo + '\',\'' + operationNo + '\')/Microsoft.NAV.' + type,
            contentType: 'application/json',
            data: JSON.stringify({
                "username": user.username,
                "password": user.password,
                "method": "POST",
            }),
            timeout: API_TIMEOUT
        });
        result = JSON.parse(result);
        if (result.value == "Erfolg"){
            if (type == "start"){
                return {status: "success", code: "Arbeitsgang erfolgreich gestartet."};
            } else if (type == "finish"){
                return {status: "success", code: "Arbeitsgang erfolgreich beendet."};
            } else if (type == "scrap") {
                return {status: "success", code: "Scheibe erfolgreich als Ausschuss gemeldet."};
            }
        } else {
            return {status: "error", code: result.value};
        }
    } catch(e){
        return {status: "error", code: e.statusText};
    }
}

async function startOperation(glassInfo, operationNo){
    return await handleOperation(glassInfo, operationNo, "start");
}

async function endOperation(glassInfo, operationNo){
    return await handleOperation(glassInfo, operationNo, "finish");
}

function resetRegexpIndices(){
    glassRegexp.lastIndex = 0;
    rackRegexp.lastIndex = 0;
}

async function postingCases(){
    let status = {"status": "error", "code": "Der Standardtext wurde nicht zurückgesetzt"};
    if (lastScan.scans && lastScan.scans != []){
        // make sure that last scan is not a machine or rack --> nothing to do if it is
        if (lastScan.get(0).type == "Rack"){
            return {status: "success",
                    code: "Bock/Maschine wurde erfolgreich gescannt."};
        }
        // we've got a glass. Make sure a rack has been scanned previously
        if (lastRack && lastRack.no != ''){
            // update the location of the glass pane
            let res = await updateGlassRack(lastScan.get(0).no, lastRack.no);
            if (!res){
                return {status: 'error', code: "Fehler beim Updaten des Glasstandorts."}; 
            }
            if (res.status == "error"){
                return res;
            }
            // check whether the glass has an ongoing operation --> end it
            let glassInfo = await getGlassInformation(lastGlass.no);
            if (!glassInfo) {
                return {status: "error", code: "Fehler bei der Abfrage der Glasinformationen."};
            }
            if ("status" in glassInfo) {
                return {status: "error", code: glassInfo["status"].toString() + "\n" + glassInfo.text};
            }
            let currentGlassOperation = operationInProgress(glassInfo);
            if (currentGlassOperation){
                // glass is currently being processed
                if (lastRack.operationNo == currentGlassOperation){
                    return {status: "success", code: "Arbeitsgang wurde bereits gestartet, daher keine Änderung."};
                }

                // we've scanned a rack, not a machine --> end operation
                let res2 = await endOperation(glassInfo, currentGlassOperation);
            }
            // we've scanned a machine --> end previous operation & start new one
            if (lastRack.operationNo && res.status == "success"){
                // start new operation
                let res3 = await startOperation(glassInfo, lastRack.operationNo);
                return res3;
            }
            return {status: "success", code: "Glasscheibenstandort wurde erfolgreich geändert."};
        }
        return {status: "success", code: "Aktuell ist keine Maschine/kein Bock aktiv. Glasscheibe wurde erfasst."};
    }
}

function vibrate(){
    navigator.vibrate(500);
}

function setRackTitle(rack){
    if (rack.name != '' || rack.name != undefined) {
        $('#title').text(rack.name);
    } else {
        $('#title').text(rack.no);
    }
}