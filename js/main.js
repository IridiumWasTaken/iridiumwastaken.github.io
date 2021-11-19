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

    $.ajax({
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
    })
})