start();

var noop = function () {};

function start() {
  initializeLoadingCallbacks();
  initialSyncWithChromeSync();
  localizeHtmlPage();
  registerEvents();
}

function initialSyncWithChromeSync() {
  $("#loading").show();
  chrome.storage.sync.get(
    ["savedRoutes", "initialized", "savedRoutesVersion"],
    function (result) {
      var version = result.savedRoutesVersion;
      if (!version || version < SAVED_ROUTES_VERSION) {
        // Discard saved routes from older or unversioned storage
        localStorage.removeItem("savedRoutes");
        localStorage.setItem("routesWereReset", "true");
        chrome.storage.sync.set(
          {
            savedRoutes: "[]",
            initialized: true,
            savedRoutesVersion: SAVED_ROUTES_VERSION,
          },
          noop,
        );
      } else {
        if (result.savedRoutes) {
          localStorage.setItem("savedRoutes", result.savedRoutes);
        }
        if (!result.initialized) {
          chrome.storage.sync.set({ initialized: true }, noop);
          var savedRoutes = localStorage.getItem("savedRoutes");
          if (savedRoutes) {
            chrome.storage.sync.set({ savedRoutes: savedRoutes }, noop);
          }
        }
      }
      openBusTimesTab();
    },
  );
}

function registerEvents() {
  document.addEventListener("DOMContentLoaded", function () {
    document
      .getElementById("refreshAllButton")
      .addEventListener("click", refreshBusRoutesTable);
    document
      .getElementById("busTimesTab")
      .addEventListener("click", openBusTimesTab);
    document
      .getElementById("configTab")
      .addEventListener("click", openConfigTab);
    document
      .getElementById("saveButton")
      .addEventListener("click", saveButtonAction);
    document
      .getElementById("nextStep1Button")
      .addEventListener("click", nextStep1Action);
    document
      .getElementById("nextStep2Button")
      .addEventListener("click", nextStep2Action);
    document
      .getElementById("backStep2Button")
      .addEventListener("click", backToStep1);
    document
      .getElementById("backStep3Button")
      .addEventListener("click", backToStep2);
    document
      .getElementById("busNumber")
      .addEventListener("click", resetToBlackColorInput);
    document
      .getElementById("busStopCode")
      .addEventListener("click", resetToBlackColorInput);
    document
      .getElementById("dismissMigrationBanner")
      .addEventListener("click", function (e) {
        e.preventDefault();
        $("#migrationBanner").hide();
        localStorage.removeItem("routesWereReset");
      });
    registerChromeSyncCallback();
    showMigrationBannerIfNeeded();
    openBusTimesTabNoRefresh();
  });
}

function localizeHtmlPage() {
  var objects = document.getElementsByTagName("html");
  for (var j = 0; j < objects.length; j++) {
    var obj = objects[j];

    var valStrH = obj.innerHTML.toString();
    var valNewH = valStrH.replace(/__MSG_(\w+)__/g, function (match, v1) {
      return v1 ? chrome.i18n.getMessage(v1) : "";
    });

    if (valNewH !== valStrH) {
      obj.innerHTML = valNewH;
    }
  }
}

function registerChromeSyncCallback() {
  chrome.storage.onChanged.addListener(function (changes, namespace) {
    var newValue = changes["savedRoutes"];
    if (newValue) {
      localStorage.setItem("savedRoutes", newValue.newValue);
    }
  });
}

function initializeLoadingCallbacks() {
  $(document).ajaxStop(function () {
    $("#loading").hide();
  });
  $(document).ajaxStart(function () {
    $("#loading").show();
  });
}

function resetToBlackColorInput() {
  this.style.color = "#000000";
}

async function nextStep1Action() {
  $("#errorMessage").hide();
  var busNumber = document.getElementById("busNumber").value;

  if (busNumber < 1 || busNumber > 905) {
    document.getElementById("busNumber").style.color = "#ff0000";
    $("#nextStep1Button").effect("shake", { distance: 100 });
    $("#errorMessage").show();
    return;
  }

  var directions = await fetchDirections(busNumber);
  if (!directions) {
    $("#nextStep1Button").effect("shake", { distance: 100 });
    $("#errorMessage").show();
    return;
  }

  var select = document.getElementById("busDirection");
  select.innerHTML = "";

  var opt0 = document.createElement("option");
  opt0.value = directions.codeDirectionPrincipale;
  opt0.textContent = directions.descriptionDirectionPrincipale;
  select.appendChild(opt0);

  var opt1 = document.createElement("option");
  opt1.value = directions.codeDirectionRetour;
  opt1.textContent = directions.descriptionDirectionRetour;
  select.appendChild(opt1);

  $("#step1").hide();
  $("#step2").show();
}

function nextStep2Action() {
  $("#errorMessage").hide();
  $("#step2").hide();
  $("#step3").show();
}

function fetchDirections(busNumber) {
  return jQuery
    .ajax({
      url: "https://www.rtcquebec.ca/cache/proxy/rtc",
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify({
        method: "get",
        baseURL: "https://api-iv.rtcquebec.ca/api/legacy",
        url: "/Parcours_Periode",
        params: {
          noParcours: busNumber,
          date: getFormatedTodayDate(),
        },
      }),
    })
    .then(function (data) {
      if (
        data &&
        data.codeDirectionPrincipale !== undefined &&
        data.codeDirectionRetour !== undefined
      ) {
        return data;
      }
      return null;
    })
    .catch(function () {
      return null;
    });
}

function backToStep1() {
  $("#step2").hide();
  $("#step1").show();
  $("#errorMessage").hide();
}

function backToStep2() {
  $("#step3").hide();
  $("#step2").show();
  $("#errorMessage").hide();
}

async function saveButtonAction() {
  $("#errorMessage").hide();
  var directionSelect = document.getElementById("busDirection");
  var newSavedRoute = {
    stopCode: document.getElementById("busStopCode").value,
    busNumber: document.getElementById("busNumber").value,
    direction: directionSelect.value,
    directionDescription:
      directionSelect.options[directionSelect.selectedIndex].text,
    id: crypto.randomUUID(),
  };

  var valid =
    validateInputs(newSavedRoute) &&
    validateDuplicate(newSavedRoute) &&
    (await validateRoute(newSavedRoute));

  if (valid) {
    document.getElementById("busNumber").style.color = "#000000";
    document.getElementById("busStopCode").style.color = "#000000";
    var savedRoutes = getSavedRoutesFromLocalStorage();
    savedRoutes.push(newSavedRoute);
    saveToLocalStorageAndSync(savedRoutes);
    populateSavedRoutesTable();
    resetInputs();
  } else {
    $(this).effect("shake", {
      distance: 100,
    });
    $("#errorMessage").show();
  }
}

function resetInputs() {
  $("#busNumber").val("");
  $("#busStopCode").val("");
  $("#busDirection").empty();
  $("#step2").hide();
  $("#step3").hide();
  $("#step1").show();
}

function validateDuplicate(newSavedRoute) {
  var valid = true;
  var savedRoutes = getSavedRoutesFromLocalStorage();
  for (let i = 0; i < savedRoutes.length; i++) {
    var savedRoute = savedRoutes[i];
    if (
      savedRoute.busNumber === newSavedRoute.busNumber &&
      savedRoute.stopCode === newSavedRoute.stopCode &&
      savedRoute.direction === newSavedRoute.direction
    ) {
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
  return jQuery
    .ajax({
      url: getUrlFromSavedRoute(newSavedRoute),
    })
    .then(function (data) {
      return !!(data && data.parcours && data.arret);
    })
    .catch(function () {
      return false;
    });
}

function getUrlFromSavedRoute(savedRoute) {
  return (
    "https://api-iv.rtcquebec.ca/api/legacy/BorneVirtuelle_ArretParcours?noArret=" +
    savedRoute.stopCode +
    "&noParcours=" +
    savedRoute.busNumber +
    "&codeDirection=" +
    savedRoute.direction +
    "&date=" +
    getFormatedTodayDate()
  );
}

function refreshBusRoutesTable() {
  clearTable("tableOutput");

  var savedRoutes = getSavedRoutesFromLocalStorage();

  if (savedRoutes.length === 0) {
    $("#loading").hide();
    return;
  }

  var promises = [];
  for (let i = 0; i < savedRoutes.length; i++) {
    var url = getUrlFromSavedRoute(savedRoutes[i]);
    promises.push(
      $.get(url, "json")
        .then(function (data) {
          return data;
        })
        .catch(function () {
          console.warn("Failed to fetch route data");
          return null;
        }),
    );
  }

  Promise.all(promises).then(function (results) {
    var resultTable = document.getElementById("tableOutput");
    for (let i = 0; i < results.length; i++) {
      var data = results[i];
      if (!data || !data.horaires?.length) continue;

      var timeTd;
      var liveImg;

      var tr = document.createElement("TR");
      var numberOfResult = Math.min(data.horaires.length, 3);

      var numberTd = document.createElement("TD");
      var stopTd = document.createElement("TD");
      var directionTd = document.createElement("TD");
      numberTd.rowSpan =
        stopTd.rowSpan =
        directionTd.rowSpan =
          numberOfResult;

      numberTd.appendChild(
        document.createTextNode(data.parcours.noParcours),
      );
      stopTd.appendChild(document.createTextNode(data.arret.nom));

      var directionText = data.parcours.descriptionDirection || "";
      directionTd.appendChild(document.createTextNode(directionText));
      directionTd.title = directionText;
      directionTd.className = "direction-cell";

      stopTd.title = data.arret.description;

      tr.appendChild(numberTd);
      tr.appendChild(stopTd);
      tr.appendChild(directionTd);

      let j = 0;
      do {
        timeTd = document.createElement("TD");
        timeTd.style.whiteSpace = "nowrap";

        timeTd.appendChild(
          document.createTextNode(data.horaires[j].departMinutes + "m "),
        );

        liveImg = document.createElement("img");
        if (data.horaires[j].ntr) {
          liveImg.src = "img/live.png";
          liveImg.title = chrome.i18n.getMessage("realtimeLabel");
        } else {
          liveImg.src = "img/clock.png";
          liveImg.title = chrome.i18n.getMessage("scheduledLabel");
        }
        liveImg.height = 20;
        liveImg.width = 20;
        timeTd.appendChild(liveImg);
        timeTd.title = data.horaires[j].depart;

        tr.appendChild(timeTd);

        resultTable.appendChild(tr);
        j++;
        tr = document.createElement("TR");
      } while (j < numberOfResult);
    }
  });
}

function populateSavedRoutesTable() {
  clearTable("savedRoutes");
  var savedRoutes = getSavedRoutesFromLocalStorage();

  if (savedRoutes.length > 0) {
    var resultTable = document.getElementById("savedRoutes");
    for (let i = 0; i < savedRoutes.length; i++) {
      var tr = document.createElement("TR");

      var numberTd = document.createElement("TD");
      var stopTd = document.createElement("TD");
      var directionTd = document.createElement("TD");
      var deleteButtonTd = document.createElement("TD");

      numberTd.appendChild(document.createTextNode(savedRoutes[i].busNumber));
      stopTd.appendChild(document.createTextNode(savedRoutes[i].stopCode));
      var dirDesc =
        savedRoutes[i].directionDescription || savedRoutes[i].direction;
      directionTd.appendChild(document.createTextNode(dirDesc));
      directionTd.title = dirDesc;
      directionTd.className = "direction-cell";
      const imgLink = document.createElement("a");
      const deleteImg = document.createElement("img");
      deleteImg.src = "img/x.png";
      deleteImg.height = 20;
      deleteImg.width = 20;
      deleteImg.title = "Delete the saved route";
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
  var savedRoutes = getSavedRoutesFromLocalStorage();
  for (let i = 0; i < savedRoutes.length; i++) {
    if (savedRoutes[i].id === this.id) {
      savedRoutes.splice(i, 1);
      break;
    }
  }
  saveToLocalStorageAndSync(savedRoutes);
  populateSavedRoutesTable();
}

function saveToLocalStorageAndSync(savedRoutes) {
  var routesAsString = JSON.stringify(savedRoutes);
  localStorage.setItem("savedRoutes", routesAsString);
  chrome.storage.sync.set(
    { savedRoutes: routesAsString, savedRoutesVersion: SAVED_ROUTES_VERSION },
    noop,
  );
}

function getSavedRoutesFromLocalStorage() {
  var savedRoutes = localStorage.getItem("savedRoutes");
  if (savedRoutes) {
    savedRoutes = JSON.parse(savedRoutes);
  }

  if (!savedRoutes) {
    savedRoutes = [];
  }
  return savedRoutes;
}

function getFormatedTodayDate() {
  const today = new Date();
  return (
    today.getFullYear().toString() +
    ("0" + (today.getMonth() + 1)).slice(-2) +
    ("0" + today.getDate()).slice(-2)
  );
}

function showMigrationBannerIfNeeded() {
  if (localStorage.getItem("routesWereReset") === "true") {
    $("#migrationBanner").css("display", "flex").removeAttr("hidden");
  }
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

function clearTable(tableId) {
  var elmtTable = document.getElementById(tableId);
  var tableRows = elmtTable.getElementsByTagName("tr");
  var rowCount = tableRows.length;

  for (var x = rowCount - 1; x > 0; x--) {
    elmtTable.removeChild(tableRows[x]);
  }
}
