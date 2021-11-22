$(function(){
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js')
          .then((reg) => {
            console.log('Service worker registered -->', reg);
          }, (err) => {
            console.error('Service worker not registered -->', err);
          });
    }

    $('#settings').click(function(){
        let origin = window.location.origin;
        let mainpath = 'settings.html';
        document.location.href = origin + '/' + mainpath;
    });
    console.log("DOM loaded");

    initCamera();

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
})

async function initCamera(){
    if ('mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices) {
        // get current aspect ratio of video player
        let width = $('#content').width();
        let height = $('#content').height();
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
            document.querySelector('video').srcObject = stream;
            document.querySelector('video').play();
            //The video stream is stopped by track.stop() after 3 second of playback.
            // setTimeout(() =&gt; { track.stop() }, 3 * 1000)
        } catch (error) {
            console.error(`${error.name}`);
            console.error(error);
        }
    }
}