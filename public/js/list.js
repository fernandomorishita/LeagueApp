$(document).ready(function () {
  for (let i = 1; i < 5; i++) {
    rowID = '#live' + i.toString();
    if ($(rowID).text() === ' ') {
      $(rowID).css('color', 'grey');
    } else {
      $(rowID).css('color', 'red');
    }
  }
});
