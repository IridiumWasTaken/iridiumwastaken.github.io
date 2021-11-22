import { get, set } from '/js/IDB/idb.js';

$(function(){
    $('#close').click(function(){
        let origin = window.location.origin;
        let mainpath = 'index.html';
        document.location.href = origin + '/' + mainpath;
    });

    // load username & password
    get('username').then((val) => $("input[name='uname']").val(val));
    get('password').then((val) => $("input[name='password']").val(val));

    $("#userdata").submit(function(e) {
        e.preventDefault();
        save_password();
   });

    function save_password() {
        // form.action = form_action;
        let username = $("input[name='uname']").val();
        let password = $("input[name='password']").val();
        
        set('username', username);
        set('password', password);
    }
})