/* AE Motion Agent — ScriptUI fallback (File > Scripts > Run Script File)
   Does not need CEP. Talks to Ollama when possible; otherwise uses the offline parser.
*/

(function (thisObj) {
    var VERSION = "2.0.0";
    var root = File($.fileName).parent.parent;
    var jsxFolder = new Folder(root.fsName + "/cep/com.aeagent.panel/jsx");

    function evalNearby(name) {
        var f = new File(jsxFolder.fsName + "/" + name);
        if (!f.exists) {
            throw new Error("Missing " + f.fsName);
        }
        $.evalFile(f);
    }

    evalNearby("json2.jsx");
    evalNearby("utils.jsx");
    evalNearby("camera.jsx");
    evalNearby("easing.jsx");
    evalNearby("scene.jsx");
    evalNearby("host.jsx");

    function httpPost(url, body, timeoutSec) {
        var conn = new Socket();
        conn.timeout = timeoutSec || 60;
        var m = String(url).match(/^https?:\/\/([^\/:]+)(?::(\d+))?(\/.*)?$/i);
        if (!m) throw new Error("Bad URL: " + url);
        var host = m[1];
        var port = m[2] ? parseInt(m[2], 10) : 80;
        var path = m[3] || "/";
        if (!conn.open(host + ":" + port, "UTF-8")) {
            throw new Error("Cannot connect to " + host + ":" + port);
        }
        var payload = body || "";
        var req =
            "POST " + path + " HTTP/1.1\r\n" +
            "Host: " + host + "\r\n" +
            "Content-Type: application/json\r\n" +
            "Content-Length: " + payload.length + "\r\n" +
            "Connection: close\r\n\r\n" +
            payload;
        conn.write(req);
        var raw = "";
        var chunk;
        while (!conn.eof) {
            chunk = conn.read(1024);
            if (!chunk) break;
            raw += chunk;
        }
        conn.close();
        var split = raw.indexOf("\r\n\r\n");
        if (split < 0) throw new Error("Empty HTTP response from LLM.");
        var header = raw.substring(0, split);
        var data = raw.substring(split + 4);
        if (header.indexOf("200") < 0 && header.indexOf("201") < 0) {
            throw new Error("LLM HTTP error: " + header.split("\r\n")[0]);
        }
        return data;
    }

    function extractJSON(text) {
        var trimmed = String(text || "").replace(/^\s+|\s+$/g, "");
        var start = trimmed.indexOf("{");
        var end = trimmed.lastIndexOf("}");
        if (start < 0 || end <= start) throw new Error("Model did not return JSON.");
        return JSON.parse(trimmed.substring(start, end + 1));
    }

    function offlinePlan(raw) {
        var text = String(raw || "").toLowerCase();
        function has(list) {
            var i;
            for (i = 0; i < list.length; i++) if (text.indexOf(list[i]) !== -1) return true;
            return false;
        }
        if (has(["dolly zoom", "vertigo", "hitchcock", "دوللي زوم"])) {
            return { ok: true, summary: "Dolly zoom", commands: [{ op: "camera.dollyZoom", distance: 300, duration: 3, ease: "easeInOut", influence: 85 }] };
        }
        if (has(["orbit", "دوران حول"])) {
            return { ok: true, summary: "Orbit", commands: [{ op: "camera.orbit", yaw: 45, pitch: 10, duration: 3, ease: "easeInOut", influence: 80, keepDistance: true }] };
        }
        if (has(["pan", "بان"])) {
            return { ok: true, summary: "Pan", commands: [{ op: "camera.pan", yaw: 25, pitch: 0, duration: 2, ease: "easeInOut", influence: 75 }] };
        }
        if (has(["look at", "نحو الطبقة", "حرك الكاميرا نحو"])) {
            return { ok: true, summary: "Look at selected", commands: [
                { op: "camera.lookAtSelected", duration: 1.5, ease: "easeInOut", influence: 70 },
                { op: "camera.dolly", distance: 350, duration: 2, ease: "easeInOut", influence: 75 }
            ]};
        }
        if (has(["dolly", "اقترب", "ابتعد"])) {
            return { ok: true, summary: "Dolly", commands: [{ op: "camera.dolly", distance: 400, duration: 2, ease: "easeInOut", influence: 80 }] };
        }
        if (has(["ناعمة", "بطيئة", "smooth", "ease", "تنعيم", "في النهاية"])) {
            return { ok: true, summary: "Smooth keys", commands: [{ op: "ease.apply", mode: "easeIn", influenceIn: 85, influenceOut: 85, target: "selectedKeys" }] };
        }
        if (has(["text", "نص", "title"])) {
            return { ok: true, summary: "Create text", commands: [
                { op: "layer.create", type: "text", name: "Title", text: "Title", fontSize: 120, fillColor: [1, 1, 1] },
                { op: "layer.fade", layer: "selected", type: "in", duration: 0.6 }
            ]};
        }
        if (has(["fade in"])) {
            return { ok: true, summary: "Fade in", commands: [{ op: "layer.fade", layer: "selected", type: "in", duration: 0.6 }] };
        }
        if (has(["blur", "ضبابية"])) {
            return { ok: true, summary: "Add blur", commands: [{ op: "effect.add", layer: "selected", effect: "blur", values: { Blurriness: 20 } }] };
        }
        return { ok: false, summary: "Unknown command. Use the buttons or start Ollama.", commands: [] };
    }

    function askOllama(endpoint, model, user, context) {
        var body = JSON.stringify({
            model: model,
            stream: false,
            format: "json",
            messages: [
                { role: "system", content: "Return ONLY JSON {ok,reply,summary,commands:[{op,...}]}. Ops: camera.*, ease.apply, layer.create, layer.set, layer.select, layer.duplicate, layer.fade, text.set, prop.set, prop.animate, expression.set, effect.add, effect.set, marker.add, comp.set, comp.create, comp.precompose, context. No ExtendScript." },
                { role: "user", content: "Context: " + JSON.stringify(context || {}) + "\nCommand: " + user }
            ]
        });
        var raw = httpPost(endpoint.replace(/\/+$/, "") + "/api/chat", body, 90);
        return extractJSON(raw);
    }

    function buildUI(obj) {
        var win = (obj instanceof Panel) ? obj : new Window("palette", "AE Agent " + VERSION, undefined, { resizeable: true });
        win.orientation = "column";
        win.alignChildren = ["fill", "top"];
        win.spacing = 8;
        win.margins = 12;

        var gSet = win.add("panel", undefined, "Local LLM");
        gSet.orientation = "column";
        gSet.alignChildren = ["fill", "top"];
        gSet.add("statictext", undefined, "Ollama endpoint");
        var endpointEt = gSet.add("edittext", undefined, "http://localhost:11434");
        gSet.add("statictext", undefined, "Model");
        var modelEt = gSet.add("edittext", undefined, "llama3.1");

        var gCmd = win.add("panel", undefined, "Command");
        gCmd.orientation = "column";
        gCmd.alignChildren = ["fill", "top"];
        var promptEt = gCmd.add("edittext", undefined, "Create a white title and fade it in", { multiline: true });
        promptEt.preferredSize.height = 70;
        var runBtn = gCmd.add("button", undefined, "Ask AE Agent");

        var gCam = win.add("panel", undefined, "Camera");
        gCam.orientation = "row";
        gCam.alignChildren = ["fill", "top"];
        var bCam = gCam.add("button", undefined, "Ensure");
        var bDolly = gCam.add("button", undefined, "Dolly");
        var bPan = gCam.add("button", undefined, "Pan");
        var bOrbit = gCam.add("button", undefined, "Orbit");
        var bDZ = gCam.add("button", undefined, "Dolly Zoom");
        var bLook = gCam.add("button", undefined, "Look At");

        var gEase = win.add("panel", undefined, "Scene");
        gEase.orientation = "row";
        var bEase = gEase.add("button", undefined, "Ease In Out");
        var bSlow = gEase.add("button", undefined, "Slow End");
        var bText = gEase.add("button", undefined, "Title");
        var bFade = gEase.add("button", undefined, "Fade In");
        var bBlur = gEase.add("button", undefined, "Blur");

        var logEt = win.add("edittext", undefined, "", { multiline: true, readonly: true });
        logEt.preferredSize.height = 140;

        function say(msg) {
            logEt.text = msg + "\n" + logEt.text;
        }

        function run(plan) {
            var res = AEAgent.execute(plan);
            say(res);
        }

        runBtn.onClick = function () {
            try {
                var ctx = {};
                try { ctx = AEAgent.context(); } catch (e0) { ctx = { error: String(e0) }; }
                var plan;
                try {
                    plan = askOllama(endpointEt.text, modelEt.text, promptEt.text, ctx);
                } catch (e1) {
                    say("LLM offline: " + e1.message);
                    plan = offlinePlan(promptEt.text);
                }
                if (!plan.ok) {
                    say(plan.summary || "No plan");
                    return;
                }
                run(plan);
            } catch (e) {
                say(e.message || String(e));
            }
        };

        bCam.onClick = function () { run({ commands: [{ op: "camera.ensure", name: "AI Camera" }] }); };
        bDolly.onClick = function () { run({ commands: [{ op: "camera.dolly", distance: 400, duration: 2, ease: "easeInOut", influence: 80 }] }); };
        bPan.onClick = function () { run({ commands: [{ op: "camera.pan", yaw: 25, duration: 2, ease: "easeInOut", influence: 75 }] }); };
        bOrbit.onClick = function () { run({ commands: [{ op: "camera.orbit", yaw: 45, pitch: 10, duration: 3, ease: "easeInOut", influence: 80, keepDistance: true }] }); };
        bDZ.onClick = function () { run({ commands: [{ op: "camera.dollyZoom", distance: 300, duration: 3, ease: "easeInOut", influence: 85 }] }); };
        bLook.onClick = function () { run({ commands: [{ op: "camera.lookAtSelected", duration: 1.5, ease: "easeInOut", influence: 70 }] }); };
        bEase.onClick = function () { run({ commands: [{ op: "ease.apply", mode: "easeInOut", influenceIn: 80, influenceOut: 80, target: "selectedKeys" }] }); };
        bSlow.onClick = function () { run({ commands: [{ op: "ease.apply", mode: "easeIn", influenceIn: 90, influenceOut: 20, target: "selectedKeys" }] }); };
        bText.onClick = function () { run({ commands: [{ op: "layer.create", type: "text", name: "Title", text: "Title", fontSize: 120, fillColor: [1, 1, 1] }, { op: "layer.fade", layer: "selected", type: "in", duration: 0.6 }] }); };
        bFade.onClick = function () { run({ commands: [{ op: "layer.fade", layer: "selected", type: "in", duration: 0.6 }] }); };
        bBlur.onClick = function () { run({ commands: [{ op: "effect.add", layer: "selected", effect: "blur", values: { Blurriness: 20 } }] }); };

        win.onResizing = win.onResize = function () { this.layout.resize(); };
        if (win instanceof Window) {
            win.center();
            win.show();
        } else {
            win.layout.layout(true);
        }
        return win;
    }

    buildUI(thisObj);
}(this));
