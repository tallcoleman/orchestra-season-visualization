// event handler to open info panels
$(document).ready(function() {
    $('.bar-segment').click(function(e) {
    var infoID = "#" + $(this).attr("infoid");
    $(infoID).siblings().addClass("d-none");
    $(this).siblings().removeClass("bar-segment-selected");
    $(infoID).toggleClass("d-none");
    $(this).toggleClass("bar-segment-selected");
    if ($(infoID).siblings().addBack().filter(':not(.d-none)').length > 0) {
        $(infoID).parent("div").removeClass("d-none");
    } else {
        $(infoID).parent("div").addClass("d-none");
    }
    // adjust iframe size
    parent.alertsize(document.getElementsByClassName('chart-container')[0].scrollHeight, document.body.getAttribute("iframeID"));   
    });
});