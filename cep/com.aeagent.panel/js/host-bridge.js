/* CSInterface bridge — evalScript helpers */

var Host = (function () {
    var cs = null;

    function available() {
        return !!(window.__adobe_cep__ && window.CSInterface);
    }

    function init() {
        if (!available()) return null;
        if (!cs) cs = new CSInterface();
        return cs;
    }

    function escapeForExtendScript(text) {
        return String(text)
            .replace(/\\/g, "\\\\")
            .replace(/"/g, '\\"')
            .replace(/\r/g, "\\r")
            .replace(/\n/g, "\\n");
    }

    function evalScript(code) {
        return new Promise(function (resolve, reject) {
            var iface = init();
            if (!iface) {
                reject(new Error("CSInterface is not available. Open this panel inside After Effects."));
                return;
            }
            iface.evalScript(code, function (result) {
                if (result === "EvalScript error." || result === "undefined") {
                    reject(new Error(result === "undefined" ? "ExtendScript returned undefined." : result));
                    return;
                }
                resolve(result);
            });
        });
    }

    function parseHost(result) {
        var parsed;
        try {
            parsed = JSON.parse(result);
        } catch (e) {
            throw new Error("Host returned non-JSON: " + String(result).slice(0, 240));
        }
        if (!parsed.ok) {
            throw new Error(parsed.message || "Host command failed.");
        }
        return parsed;
    }

    function getContext() {
        return evalScript("AEAgent_context()").then(parseHost);
    }

    function execute(plan) {
        var json = JSON.stringify(plan);
        var code = "AEAgent_execute(\"" + escapeForExtendScript(json) + "\")";
        return evalScript(code).then(parseHost);
    }

    function executeOp(op, extra) {
        var cmd = extra || {};
        cmd.op = op;
        return execute({ summary: op, commands: [cmd] });
    }

    return {
        available: available,
        init: init,
        evalScript: evalScript,
        getContext: getContext,
        execute: execute,
        executeOp: executeOp
    };
}());
