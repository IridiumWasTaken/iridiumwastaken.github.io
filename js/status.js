$(function(){
  var style = getComputedStyle(document.body);
  let online_color = style.getPropertyValue('--online_bg_color');
  let offline_color = style.getPropertyValue('--offline_bg_color');
  setInterval(colorStatusBar, 1000);

  function colorStatusBar(){
    if (checkIfOnline()){
      $('#status').css('background-color', online_color);
    } else {
      $('#status').css('background-color', offline_color);
    }
  }
});

function checkIfOnline() {
  if (!navigator.onLine) {
    return false;
  } else {
    return true;
  }
}