var codeToDirectionMap = new Map();
codeToDirectionMap.set("0", chrome.i18n.getMessage("northShortLabel"));
codeToDirectionMap.set("1", chrome.i18n.getMessage("southShortLabel"));
codeToDirectionMap.set("2", chrome.i18n.getMessage("eastShortLabel"));
codeToDirectionMap.set("3", chrome.i18n.getMessage("westShortLabel"));

var directionToCodeMap = new Map();
directionToCodeMap.set("North", 0);
directionToCodeMap.set("South", 1);
directionToCodeMap.set("East", 2);
directionToCodeMap.set("West", 3);

var SAVED_ROUTES_VERSION = 2;
