/* CSInterface bridge — evalScript helpers */

var Host = (function () {
    var cs = null;
    var booted = false;

    function available() {
        return !!(window.__adobe_cep__ && window.CSInterface);
    }

    function init() {
        if (!available()) return null;
        if (!cs) cs = new CSInterface();
        return cs;
    }

    function slashPath(p) {
        return String(p || "").replace(/\\/g, "/");
    }

    function toHex(text) {
        var s = String(text || "");
        var out = "";
        var i;
        for (i = 0; i < s.length; i++) {
            var h = s.charCodeAt(i).toString(16);
            out += ("0000" + h).slice(-4);
        }
        return out;
    }

    function extensionPath() {
        var iface = init();
        if (!iface) return "";
        return slashPath(iface.getSystemPath(SystemPath.EXTENSION));
    }

    function evalScript(code) {
        return new Promise(function (resolve, reject) {
            var iface = init();
            if (!iface) {
                reject(new Error("CSInterface is not available. Open this panel inside After Effects."));
                return;
            }
            iface.evalScript(code, function (result) {
                if (result === "EvalScript error.") {
                    reject(new Error(result));
                    return;
                }
                resolve(result == null ? "" : String(result));
            });
        });
    }

    function parseHost(result) {
        var raw = String(result || "").replace(/^\uFEFF/, "").trim();
        if (!raw || raw === "undefined") {
            throw new Error("Host returned empty. Reload the panel after updating jsx files.");
        }
        var parsed;
        try {
            parsed = JSON.parse(raw);
        } catch (e) {
            throw new Error("Host returned non-JSON: " + raw.slice(0, 240));
        }
        if (!parsed.ok) {
            throw new Error(parsed.message || "Host command failed.");
        }
        return parsed;
    }

    function loadJsx(name) {
        var root = extensionPath();
        var path = root + "/jsx/" + name;
        var code = "$.evalFile(\"" + path.replace(/"/g, '\\"') + "\")";
        return evalScript(code);
    }

    function boot() {
        if (booted) return Promise.resolve(true);
        var files = ["json2.jsx", "utils.jsx", "camera.jsx", "easing.jsx", "scene.jsx", "host.jsx"];
        var chain = Promise.resolve();
        var i;
        function queue(name) {
            chain = chain.then(function () { return loadJsx(name); });
        }
        for (i = 0; i < files.length; i++) queue(files[i]);
        return chain.then(function () {
            return evalScript("AEAgent_ping()");
        }).then(function (result) {
            parseHost(result);
            booted = true;
            return true;
        });
    }

    function ensureBoot() {
        return boot().catch(function (err) {
            booted = false;
            throw err;
        });
    }

    function getContext() {
        return ensureBoot().then(function () {
            return evalScript("AEAgent_context()");
        }).then(parseHost);
    }

    function execute(plan) {
        var hex = toHex(JSON.stringify(plan));
        return ensureBoot().then(function () {
            return evalScript("AEAgent_execute(\"" + hex + "\")");
        }).then(parseHost);
    }

    function executeOp(op, extra) {
        var cmd = extra || {};
        cmd.op = op;
        return execute({ summary: op, commands: [cmd] });
    }

    function pingHost() {
        return ensureBoot();
    }

    return {
        available: available,
        init: init,
        evalScript: evalScript,
        getContext: getContext,
        execute: execute,
        executeOp: executeOp,
        pingHost: pingHost,
        boot: boot
    };
}());
