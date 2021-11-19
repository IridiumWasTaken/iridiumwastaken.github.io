$(function(){
    $('#close').click(function(){
        let origin = window.location.origin;
        let mainpath = 'index.html';
        document.location.href = origin + '/' + mainpath;
    });
})