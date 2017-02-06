start();

function start() {
    registerEvents();
}

function registerEvents() {
    document.addEventListener("DOMContentLoaded", function () {
        document.getElementById("refreshAllButton").addEventListener("click", refreshBusRoutesTable);
        document.getElementById("busTimesTab").addEventListener("click", openBusTimesTab);
        document.getElementById("configTab").addEventListener("click", openConfigTab);
        document.getElementById("saveButton").addEventListener("click", saveButtonAction);
        document.getElementById("busNumber").addEventListener("click", resetToBlackColorInput);
        document.getElementById("busStopCode").addEventListener("click", resetToBlackColorInput);
        openBusTimesTab();
    });
}

function resetToBlackColorInput() {
    this.style.color = "#000000";
}

function saveButtonAction() {
    $("#errorMessage").hide();
    var newSavedRoute = {
        stopCode: document.getElementById("busStopCode").value,
        busNumber: document.getElementById("busNumber").value,
        direction: document.getElementById("busDirection").value,
        id: getGuid()
    }

    if (validateInputs(newSavedRoute) && validateRoute(newSavedRoute) && validateDuplicate(newSavedRoute)) {
        document.getElementById("busNumber").style.color = "#000000";
        document.getElementById("busStopCode").style.color = "#000000";
        var savedRoutes = getSavedRoutesFromLocalStorage();
        savedRoutes.push(newSavedRoute);
        localStorage.setItem("savedRoutes", JSON.stringify(savedRoutes));
        populateSavedRoutesTable();
        resetInputs();
    } else {
        $(this).effect("shake", {
            distance: 100
        });
        $("#errorMessage").show();
    }
}

function resetInputs() {
    $("#busNumber").val("");
    $("#busStopCode").val("");
    $("#busDirection").val("North");
}

function validateDuplicate(newSavedRoute) {
    var valid = true;
    var savedRoutes = getSavedRoutesFromLocalStorage();
    for (i = 0; i < savedRoutes.length; i++) {
        var savedRoute = savedRoutes[i];
        if (savedRoute.busNumber == newSavedRoute.busNumber && savedRoute.stopCode == newSavedRoute.stopCode && savedRoute.direction == newSavedRoute.direction) {
            valid = false;
            break;
        }
    }
    return valid;
}

function validateInputs(newSavedRoute) {
    var valid = true;
    if (newSavedRoute.busNumber < 1 || newSavedRoute.busNumber > 905) {
        document.getElementById("busNumber").style.color = "#ff0000";
        valid = false;
    }
    if (newSavedRoute.stopCode < 1 || newSavedRoute.stopCode > 100000) {
        document.getElementById("busStopCode").style.color = "#ff0000";
        valid = false;
    }

    return valid;
}

function validateRoute(newSavedRoute) {
    var valid = true;
    if (valid) {
        jQuery.ajax({
            url: getUrlFromSavedRoute(newSavedRoute),
            error: function () {
                valid = false;
            },
            async: false
        });
    }

    return valid;
}

function getUrlFromSavedRoute(savedRoute) {
    return "https://wsmobile.rtcquebec.ca/api/v1/horaire/BorneVirtuelle_ArretParcours?source=sitemobile&noArret=" +
        savedRoute.stopCode +
        "&noParcours=" +
        savedRoute.busNumber +
        "&codeDirection=" +
        directionToCodeMap.get(savedRoute.direction) +
        "&date=" + getFormatedTodayDate();
}

function refreshBusRoutesTable() {
    clearTable("tableOutput");

    var savedRoutes = getSavedRoutesFromLocalStorage();

    for (i = 0; i < savedRoutes.length; i++) {
        var savedRoute = savedRoutes[i];
        var url = getUrlFromSavedRoute(savedRoute);
        $.get(url, function (data) {
            if (data.horaires.length > 0) {
                var timeTd;
                var liveImg;

                var tr = document.createElement("TR");
                var resultTable = document.getElementById("tableOutput")
                var numberOfResult = data.horaires.length;

                var numberTd = document.createElement("TD");
                var stopTd = document.createElement("TD");
                var directionTd = document.createElement("TD");
                numberTd.rowSpan = stopTd.rowSpan = directionTd.rowSpan = numberOfResult;

                numberTd.appendChild(document.createTextNode(data.parcours.noParcours));
                stopTd.appendChild(document.createTextNode(data.arret.nom));
                directionTd.appendChild(document.createTextNode(codeToDirectionMap.get(data.parcours.codeDirection)));

                stopTd.title = data.arret.description;
                directionTd.title = data.parcours.descriptionDirection;

                tr.appendChild(numberTd);
                tr.appendChild(stopTd);
                tr.appendChild(directionTd);

                i = 0;
                do {
                    timeTd = document.createElement("TD");

                    timeTd.appendChild(document.createTextNode(data.horaires[i].departMinutes + "m "));

                    liveImg = document.createElement("img");
                    if (data.horaires[i].ntr) {
                        liveImg.src = "img/live.png";
                        liveImg.title = "Realtime";
                    } else {
                        liveImg.src = "img/clock.png";
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

    if (savedRoutes.length > 0) {
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
            deleteImg.title = "Delete the saved route"
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
        if (savedRoutes[i].id == this.id) {
            savedRoutes.splice(i, 1);
            break;
        }
    }
    localStorage.setItem("savedRoutes", JSON.stringify(savedRoutes));
    populateSavedRoutesTable();
}

function getSavedRoutesFromLocalStorage() {
    var savedRoutes = localStorage.getItem("savedRoutes");
    if (savedRoutes == undefined) {
        savedRoutes = new Array();
    } else {
        savedRoutes = JSON.parse(savedRoutes);
    }
    return savedRoutes;
}

function getFormatedTodayDate() {
    var today = new Date();
    return today.getFullYear().toString() + ("0" + today.getMonth()).slice(-2) + ("0" + today.getDate()).slice(-2);
}

function openBusTimesTab(event) {
    $("#inputs").hide();
    $("#outputs").show();
    refreshBusRoutesTable();
}

function openConfigTab(event) {
    $("#outputs").hide();
    $("#inputs").show();
    populateSavedRoutesTable();
    resetInputs();
    $("#errorMessage").hide();
}

function getGuid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0,
            v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function clearTable(tableId) {
    var elmtTable = document.getElementById(tableId);
    var tableRows = elmtTable.getElementsByTagName('tr');
    var rowCount = tableRows.length;

    for (var x = rowCount - 1; x > 0; x--) {
        elmtTable.removeChild(tableRows[x]);
    }
}