function updateButton(){
$.get( "https://wsmobile.rtcquebec.ca/api/v1/horaire/BorneVirtuelle_ArretParcours?source=sitemobile&noArret=1816&noParcours=11&codeDirection=2&date=20170125", function( data ) {
            alert(data.parcours.noParcours);
            }, "json" );
}

document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('updateButton').addEventListener('click', updateButton);
    document.getElementById('populateme').value = 'Loading';
    $.get( "https://wsmobile.rtcquebec.ca/api/v1/horaire/BorneVirtuelle_ArretParcours?source=sitemobile&noArret=1816&noParcours=11&codeDirection=2&date=20170125", function( data ) {
        document.getElementById('populateme').value = data.parcours.noParcours;
            }, "json" );
});
