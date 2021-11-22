$(async function(){
    console.log("DOM loaded");

    // init global vars
    var lastText = '';
    var refractoryPeriod = 1000;

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

    /*
    const video = $('#content');
    let videoTrack = await initCamera(video);

    const canvas = $('#capturedPhoto').get(0);
    // just for testing
    let videoHeight = videoTrack.getSettings().height;
    let videoWidth = videoTrack.getSettings().width;
    canvas.width = videoWidth/3;
    canvas.height = videoHeight/3;
    // real code starts here again
    const context = canvas.getContext('2d');

    setInterval(() => takePhoto(context, video.get(0), videoWidth, videoHeight), 330);
    */

    /*$.ajax({
        type: "POST",
        url: "http://172.20.2.10:3001/",
        contentType: 'application/json',
        data: JSON.stringify({
            "username": "a.loewenstein",
            "password": "AQ1sw2",
            "method": "GET",
        }),
        success: function(data, textStatus, xhr) {
            console.log(data);
            console.log(textStatus);
            console.log(xhr.responseText);
        }
    })*/

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

    
})

async function initCamera(video){
    if ('mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices) {
        // get current aspect ratio of video player
        let width = video.width();
        let height = video.height();
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: {
                    minFrameRate: 15,
                    aspectRatio: width/height,
                    width: {
                        min: 500,
                        ideal: 720
                    },
                    heigth: {
                        min: 500,
                        ideal: 720
                    },
                    facingMode: {
                        exact: 'environment'
                    }
                }
            });
            const videoTracks = stream.getVideoTracks();
            const track = videoTracks[0];
            console.log(`Getting video from: ${track.label}`);
            video.get(0).srcObject = stream;
            video.get(0).play();
            //The video stream is stopped by track.stop() after 3 second of playback.
            // setTimeout(() =&gt; { track.stop() }, 3 * 1000)
            return track;
        } catch (error) {
            console.error(`${error.name}`);
            console.error(error);
        }
    }
}

function takePhoto(context, video, width, height){
    // ommit scaling factor later on
    context.drawImage(video, 0, 0, width, height, 0, 0, width/3, height/3);
    var imgData = context.getImageData(0, 0, width, height);
    // ommit this later on too
    $('#capturedPhoto').css('position', 'absolute');
    $('#capturedPhoto').css('z-index', 99);
    $('#capturedPhoto').show();
}

