/**************************************************************************************************
*
* ADOBE SYSTEMS INCORPORATED
* Copyright 2020 Adobe Systems Incorporated
* All Rights Reserved.
*
* NOTICE: Adobe permits you to use, modify, and distribute this file in accordance with the
* terms of the Adobe license agreement accompanying it.
*
* Simplified CSInterface for CEP HTML panels.
*
**************************************************************************************************/

function CSInterface() {
    this.hostEnvironment = JSON.parse(window.__adobe_cep__.getHostEnvironment());
}

CSInterface.THEME_COLOR_CHANGED_EVENT = "com.adobe.csxs.events.ThemeColorChanged";

CSInterface.prototype.getHostEnvironment = function () {
    this.hostEnvironment = JSON.parse(window.__adobe_cep__.getHostEnvironment());
    return this.hostEnvironment;
};

CSInterface.prototype.closeExtension = function () {
    window.__adobe_cep__.closeExtension();
};

CSInterface.prototype.getSystemPath = function (pathType) {
    var path = decodeURI(window.__adobe_cep__.getSystemPath(pathType));
    var OSVersion = this.getOSInformation();
    if (OSVersion.indexOf("Windows") >= 0) {
        path = path.replace("file:///", "");
    } else if (OSVersion.indexOf("Mac") >= 0) {
        path = path.replace("file://", "");
    }
    return path;
};

CSInterface.prototype.evalScript = function (script, callback) {
    if (callback === null || callback === undefined) {
        callback = function () {};
    }
    window.__adobe_cep__.evalScript(script, callback);
};

CSInterface.prototype.getApplicationID = function () {
    return this.hostEnvironment.appId;
};

CSInterface.prototype.getHostCapabilities = function () {
    return JSON.parse(window.__adobe_cep__.getHostCapabilities());
};

CSInterface.prototype.dispatchEvent = function (event) {
    if (typeof event.data === "object") {
        event.data = JSON.stringify(event.data);
    }
    window.__adobe_cep__.dispatchEvent(event);
};

CSInterface.prototype.addEventListener = function (type, listener, obj) {
    window.__adobe_cep__.addEventListener(type, listener, obj);
};

CSInterface.prototype.removeEventListener = function (type, listener, obj) {
    window.__adobe_cep__.removeEventListener(type, listener, obj);
};

CSInterface.prototype.requestOpenExtension = function (extensionId, params) {
    window.__adobe_cep__.requestOpenExtension(extensionId, params);
};

CSInterface.prototype.getExtensions = function (extensionIds) {
    var obj = window.__adobe_cep__.getExtensions(JSON.stringify(extensionIds || []));
    return JSON.parse(obj);
};

CSInterface.prototype.getNetworkPreferences = function () {
    return JSON.parse(window.__adobe_cep__.getNetworkPreferences());
};

CSInterface.prototype.getOSInformation = function () {
    var userAgent = navigator.userAgent;
    if (navigator.platform === "Win32" || navigator.platform === "Windows") {
        return "Windows";
    }
    if (navigator.platform === "MacIntel" || navigator.platform === "Macintosh") {
        return "Mac OS";
    }
    return userAgent;
};

CSInterface.prototype.initResourceBundle = function () {
    var resourceBundle = JSON.parse(window.__adobe_cep__.initResourceBundle());
    var resElms = document.querySelectorAll("[data-locale]");
    for (var n = 0; n < resElms.length; n++) {
        var resEl = resElms[n];
        var resKey = resEl.getAttribute("data-locale");
        if (resourceBundle.hasOwnProperty(resKey)) {
            resEl.innerHTML = resourceBundle[resKey];
        }
    }
    return resourceBundle;
};

CSInterface.prototype.dumpInstallationInfo = function () {
    return window.__adobe_cep__.dumpInstallationInfo();
};

CSInterface.prototype.getScaleFactor = function () {
    return window.__adobe_cep__.getScaleFactor();
};

CSInterface.prototype.setScaleFactorChangedHandler = function (handler) {
    window.__adobe_cep__.setScaleFactorChangedHandler(handler);
};

CSInterface.prototype.getCurrentApiVersion = function () {
    return JSON.parse(window.__adobe_cep__.getCurrentApiVersion());
};

function SystemPath() {}
SystemPath.USER_DATA = "userData";
SystemPath.COMMON_FILES = "commonFiles";
SystemPath.MY_DOCUMENTS = "myDocuments";
SystemPath.APPLICATION = "application";
SystemPath.EXTENSION = "extension";
SystemPath.HOST_APPLICATION = "hostApplication";

function CSEvent(type, scope, appId, extensionId) {
    this.type = type;
    this.scope = scope;
    this.appId = appId;
    this.extensionId = extensionId;
}
