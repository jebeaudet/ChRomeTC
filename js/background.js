chrome.browserAction.onClicked.addListener(function(tab) {
    chrome.tabs.executeScript({file: "lib/jquery-3.1.1.min.js"}, function(result) {            
        $.get( "https://wsmobile.rtcquebec.ca/api/v1/horaire/BorneVirtuelle_ArretParcours?source=sitemobile&noArret=1816&noParcours=11&codeDirection=2&date=20170125", function( data ) {
            }, "json" );
    });
});