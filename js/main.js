import { get, set } from '/js/IDB/idb.js';

// init global vars
var lastText = '';
var exampleGlassNo = 'S21000077';
var refractoryPeriod = 1000;
const API_URL = 'http://172.20.2.10:3001';

$(async function(){
    console.log("DOM loaded");

    // init service workers
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js')
          .then((reg) => {
            console.log('Service worker registered -->', reg);
          }, (err) => {
            console.error('Service worker not registered -->', err);
          });
    }

    // init camera
    let contentHeight = $('#content').height();
    let contentWidth = $('#content').width();
    let maxWidth = 0.9 * Math.min(contentWidth, contentHeight);
    const html5QrcodeScanner = new Html5Qrcode("content");
    const qrConfig = { fps: 3, qrbox: {width: maxWidth, height: maxWidth}, verbose: true, aspectRatio: contentWidth/contentHeight};

    html5QrcodeScanner.start({facingMode: {exact: "environment"}}, qrConfig, onScanSuccess, onScanFailure);

    // enabling switching to settings
    $('#settings').click(function(){
        let origin = window.location.origin;
        let mainpath = 'settings.html';
        document.location.href = origin + '/' + mainpath;
    });

    // enabling switching to see information about glass pane
    $('#info').on('click', showInformation);
    $('#scan').on('click', showScan);

    function onScanSuccess(decodedText, decodedResult) {
        // handle the scanned code as you like, for example:
        if (lastText != decodedText){
            console.log(`Code matched = ${decodedText}`, decodedResult);
            lastText = decodedText;
            html5QrcodeScanner.pause();
            setTimeout(html5QrcodeScanner.resume(), refractoryPeriod);
        }
    }
      
    function onScanFailure(error) {
        // handle scan failure, usually better to ignore and keep scanning.
        // for example:
        // console.warn(`Code scan error = ${error}`);
    }

    async function showInformation(){
        html5QrcodeScanner.stop();

        var style = getComputedStyle(document.body);
        $('#content').html('');
        $('#content').css('background-color', style.getPropertyValue('--default-bg-color'));
        $('#content').css('padding-left', '10px');
        $('#content').css('padding-right', '10px');

        let templateString = await (await fetch('/resources/templates/info.html')).text();

        $('#content').html(templateString);

        let userdata = await getUserData();

        let result = await getGlassInformation(exampleGlassNo, userdata);
        console.log(result);
    }

    function showScan(){
        $('#content').css('background-color', 'black');
        $('#content').css('padding-left', '');
        $('#content').css('padding-right', '');
        html5QrcodeScanner.start({facingMode: {exact: "environment"}}, qrConfig, onScanSuccess, onScanFailure);
    }
    
})

async function getUserData(){
    let username = await get('username');
    let password = await get('password');
    return {username: username, password: password};
}

async function getGlassInformation(glassNo, userdata){
    try {
        let result = await $.ajax({
            type: "POST",
            url: API_URL + '/' + 'companies(8640f26b-f72c-ec11-8122-005056b605fd)/routingLines?$filter=glassNo%20eq%20\'' + glassNo + '\'',
            contentType: 'application/json',
            data: JSON.stringify({
                "username": userdata.username,
                "password": userdata.password,
                "method": "GET",
            })
        });
        result = JSON.parse(result);
        // continue parsing here
        return result.value;
    } catch(e){
        console.error('Error!');
    }
}