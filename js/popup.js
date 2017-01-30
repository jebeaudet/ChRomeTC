start();

function start() {
    registerEvents();
}

function registerEvents() {
    document.addEventListener("DOMContentLoaded", function() {
        document.getElementById("refreshAllButton").addEventListener("click", refreshBusRoutesTable);
        document.getElementById("busTimesTab").addEventListener("click", openBusTimesTab);
        document.getElementById("configTab").addEventListener("click", openConfigTab);
        document.getElementById("saveButton").addEventListener("click", saveButtonAction);
        openBusTimesTab();
        refreshBusRoutesTable();
    });
}

function saveButtonAction() {
    var newSavedRoute = {
        stopCode: document.getElementById("busStopCode").value,
        busNumber: document.getElementById("busNumber").value,
        direction: document.getElementById("busDirection").value,
        id: getGuid()
    }
    
    var savedRoutes = getSavedRoutesFromLocalStorage();
    savedRoutes.push(newSavedRoute);
    localStorage.setItem("savedRoutes",JSON.stringify(savedRoutes));
    populateSavedRoutesTable();
}

function refreshBusRoutesTable() {
    clearTable("tableOutput"); 

    var savedRoutes = getSavedRoutesFromLocalStorage();

    for (i = 0; i < savedRoutes.length; i++) {
        var savedRoute = savedRoutes[i];
        var url = "https://wsmobile.rtcquebec.ca/api/v1/horaire/BorneVirtuelle_ArretParcours?source=sitemobile&noArret=" + savedRoute.stopCode + "&noParcours=" + savedRoute.busNumber + "&codeDirection=" + getDirectionCodeFromDirection(savedRoute.direction) + "&date=" + getFormatedTodayDate();
        $.get(url, function(data) {
            if (data.horaires.length > 0) {
                var timeTd;
                var liveImg;
                
                var tr = document.createElement("TR");
                var resultTable = document.getElementById("tableOutput")
                var numberOfResult = data.horaires.length;

                var numberTd = document.createElement("TD");
                var stopTd = document.createElement("TD");
                var directionTd = document.createElement("TD");
                numberTd.rowSpan =  stopTd.rowSpan = directionTd.rowSpan = numberOfResult;

                numberTd.appendChild(document.createTextNode(data.parcours.noParcours));
                stopTd.appendChild(document.createTextNode(data.arret.nom));
                directionTd.appendChild(document.createTextNode(getDirectionFromCodeDirection(data.parcours.codeDirection)));

                stopTd.title = data.arret.description;
                directionTd.title = data.parcours.descriptionDirection;

                tr.appendChild(numberTd);
                tr.appendChild(stopTd);
                tr.appendChild(directionTd);

                i = 0;
                do {
                    timeTd = document.createElement("TD");

                    timeTd.appendChild(document.createTextNode(data.horaires[i].departMinutes + "m"));

                    liveImg = document.createElement("img");
                    if (data.horaires[i].ntr) {
                        liveImg.src = "img/live.png";
                        liveImg.title = "Realtime";"https://wsmobile.rtcquebec.ca/api/v1/horaire/BorneVirtuelle_ArretParcours?source=sitemobile&noArret=1816&noParcours=11&codeDirection=2&date=20170130"
                    } else {
                        liveImg.src = "img/not_live.png";
                        liveImg.title = "Scheduled";
                    }
                    liveImg.height = 20;
                    liveImg.width = 20;
                    timeTd.appendChild(liveImg);
                    timeTd.title = data.horaires[i].depart;

                    tr.appendChild(timeTd);

                    resultTable.appendChild(tr);
                    i++;
                    tr = document.createElement("TR");
                } while (i < numberOfResult);
            }
        }, "json");
    }
}

function populateSavedRoutesTable() {
    clearTable("savedRoutes");
    var savedRoutes = getSavedRoutesFromLocalStorage();
    
    if(savedRoutes.length > 0) {
        var resultTable = document.getElementById("savedRoutes")
        for (i = 0; i < savedRoutes.length; i++) {
            var tr = document.createElement("TR");

            var numberTd = document.createElement("TD");
            var stopTd = document.createElement("TD");
            var directionTd = document.createElement("TD");
            var deleteButtonTd = document.createElement("TD");

            numberTd.appendChild(document.createTextNode(savedRoutes[i].busNumber));
            stopTd.appendChild(document.createTextNode(savedRoutes[i].stopCode));
            directionTd.appendChild(document.createTextNode(savedRoutes[i].direction));
            imgLink = document.createElement("a");
            deleteImg = document.createElement("img");
            deleteImg.src = "img/x.png";
            deleteImg.height = 20;
            deleteImg.width = 20;
            imgLink.appendChild(deleteImg);
            deleteButtonTd.appendChild(imgLink);
            deleteButtonTd.id = savedRoutes[i].id;
            deleteButtonTd.addEventListener("click", deleteSavedRoute);

            tr.appendChild(deleteButtonTd);
            tr.appendChild(numberTd);
            tr.appendChild(stopTd);
            tr.appendChild(directionTd);

            resultTable.appendChild(tr);
        }
    }
}

function deleteSavedRoute() {
    console.log(this.id);
    var savedRoutes = getSavedRoutesFromLocalStorage();
    for (i = 0; i < savedRoutes.length; i++) {
        if(savedRoutes[i].id == this.id) {
            savedRoutes.splice(i, 1);
            break;
        }
    }
    localStorage.setItem("savedRoutes",JSON.stringify(savedRoutes));
    populateSavedRoutesTable();
}

function getSavedRoutesFromLocalStorage() {
    var savedRoutes = localStorage.getItem("savedRoutes");
    if(savedRoutes == undefined) { 
        savedRoutes = new Array();
    }else {
        savedRoutes = JSON.parse(savedRoutes);
    }
    return savedRoutes;
}

function getFormatedTodayDate() {
    //20170130
    var today = new Date();
    return today.getFullYear().toString() + today.getMonth().toString() + today.getDay().toString();
}

function getDirectionCodeFromDirection(direction) {
    var codeDirection;
    switch (direction) {
        case "North":
            codeDirection = 0;
            break;
        case "South":
            codeDirection = 1;
            break;
        case "East":
            codeDirection = 2;
            break;
        case "West":
            codeDirection = 3;
            break;
    }
    return codeDirection;
}

function getDirectionFromCodeDirection(codeDirection) {
    var direction;
    switch (codeDirection) {
        case "0":
            direction = "N";
            break;
        case "1":
            direction = "S";
            break;
        case "2":
            direction = "E";
            break;
        case "3":
            direction = "W";
            break;
    }
    return direction;
}

function openBusTimesTab(event) {
    hide(document.getElementById("inputs"));
    show(document.getElementById("outputs"));
}

function openConfigTab(event) {
    show(document.getElementById("inputs"));
    hide(document.getElementById("outputs"));
    populateSavedRoutesTable();
}

function getGuid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
}

function clearTable(tableId) {
    var elmtTable = document.getElementById(tableId);
    var tableRows = elmtTable.getElementsByTagName('tr');
    var rowCount = tableRows.length;

    for (var x = rowCount-1; x > 0; x--) {
       elmtTable.removeChild(tableRows[x]);
    }
}

function hide(elements) {
    elements = elements.length ? elements : [elements];
    for (var index = 0; index < elements.length; index++) {
        elements[index].style.display = "none";
    }
}

function show(elements, specifiedDisplay) {
    elements = elements.length ? elements : [elements];
    for (var index = 0; index < elements.length; index++) {
        elements[index].style.display = specifiedDisplay || "block";
    }
}
