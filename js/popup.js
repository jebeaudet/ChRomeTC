start();

var noop = function(){};

function start() {
    initialSyncWithChromeSync();
	localizeHtmlPage();
    registerEvents();
}

function initialSyncWithChromeSync(){
    chrome.storage.sync.get(["savedRoutes"], function(result) {
        if(result.savedRoutes){
            localStorage.setItem("savedRoutes", result.savedRoutes);
        }
        openBusTimesTab();
    });
    chrome.storage.sync.get(["initialized"], function(result) {
        if(!(result.initialized)){
            chrome.storage.sync.set({"initialized": true}, noop);
            var savedRoutes = localStorage.getItem("savedRoutes");
            if (savedRoutes) {
                chrome.storage.sync.set({"savedRoutes": savedRoutes}, noop);
            }
        }
    });
}

function registerEvents() {
    document.addEventListener("DOMContentLoaded", function () {
        document.getElementById("refreshAllButton").addEventListener("click", refreshBusRoutesTable);
        document.getElementById("busTimesTab").addEventListener("click", openBusTimesTab);
        document.getElementById("configTab").addEventListener("click", openConfigTab);
        document.getElementById("saveButton").addEventListener("click", saveButtonAction);
        document.getElementById("busNumber").addEventListener("click", resetToBlackColorInput);
        document.getElementById("busStopCode").addEventListener("click", resetToBlackColorInput);
        registerChromeSyncCallback();
        openBusTimesTabNoRefresh();
    });
}

function localizeHtmlPage()
{
    var objects = document.getElementsByTagName('html');
    for (var j = 0; j < objects.length; j++)
    {
        var obj = objects[j];

        var valStrH = obj.innerHTML.toString();
        var valNewH = valStrH.replace(/__MSG_(\w+)__/g, function(match, v1)
        {
            return v1 ? chrome.i18n.getMessage(v1) : "";
        });

        if(valNewH != valStrH)
        {
            obj.innerHTML = valNewH;
        }
    }
}

function registerChromeSyncCallback(){
    chrome.storage.onChanged.addListener(function(changes, namespace) {
        var newValue = changes["savedRoutes"]
        if(newValue){
            localStorage.setItem("savedRoutes", newValue.newValue);
        }
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
        saveToLocalStorageAndSync(savedRoutes);
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
    return "https://wsmobile.rtcquebec.ca/api/v3/horaire/BorneVirtuelle_ArretParcours?source=sitemobile&noArret=" +
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
                        liveImg.title = chrome.i18n.getMessage("realtimeLabel");
                    } else {
                        liveImg.src = "img/clock.png";
                        liveImg.title = chrome.i18n.getMessage("scheduledLabel");
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
    saveToLocalStorageAndSync(savedRoutes);
    populateSavedRoutesTable();
}

function saveToLocalStorageAndSync(savedRoutes){
    var routesAsString = JSON.stringify(savedRoutes);
    localStorage.setItem("savedRoutes", routesAsString);
    chrome.storage.sync.set({"savedRoutes": routesAsString}, noop);
}

function getSavedRoutesFromLocalStorage() {
    var savedRoutes = localStorage.getItem("savedRoutes");
    if (savedRoutes) {
        savedRoutes = JSON.parse(savedRoutes);
    } else {
        savedRoutes = new Array();
    }
    return savedRoutes;
}

function getFormatedTodayDate() {
    var today = new Date();
    return today.getFullYear().toString() + ("0" + today.getMonth()).slice(-2) + ("0" + today.getDate()).slice(-2);
}

function openBusTimesTabNoRefresh(event) {
    $("#inputs").hide();
    $("#outputs").show();
}

function openBusTimesTab(event) {
    openBusTimesTabNoRefresh();
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
