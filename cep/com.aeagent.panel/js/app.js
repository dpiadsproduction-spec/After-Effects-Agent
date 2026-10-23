(function () {
    var logEl;
    var statusDot;
    var statusText;
    var chatEl;

    function $(id) {
        return document.getElementById(id);
    }

    function escapeHtml(s) {
        return String(s)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    function addBubble(role, text, extra) {
        var wrap = document.createElement("div");
        wrap.className = "bubble " + role;
        var body = document.createElement("div");
        body.className = "bubble-text";
        body.innerHTML = escapeHtml(text).replace(/\n/g, "<br>");
        wrap.appendChild(body);
        if (extra) {
            var meta = document.createElement("pre");
            meta.className = "bubble-meta";
            meta.textContent = extra;
            wrap.appendChild(meta);
        }
        chatEl.appendChild(wrap);
        chatEl.scrollTop = chatEl.scrollHeight;
    }

    function log(message, kind) {
        var time = new Date().toLocaleTimeString();
        var line = "[" + time + "] " + message + "\n";
        logEl.textContent = line + logEl.textContent;
        if (kind === "ok") setStatus("ok", "Ready");
        if (kind === "err") setStatus("err", "Error");
    }

    function setStatus(kind, text) {
        statusDot.className = "dot " + (kind || "");
        statusText.textContent = text;
    }

    function setBusy(busy) {
        $("runBtn").disabled = busy;
        $("runBtn").textContent = busy ? "Working..." : "Send";
    }

    function currentEasePayload() {
        return {
            op: "ease.apply",
            mode: $("easeMode").value,
            influenceIn: Number($("influence").value),
            influenceOut: Number($("influence").value),
            speedIn: 0,
            speedOut: 0,
            target: $("easeTarget").value
        };
    }

    function formatOps(commands) {
        if (!commands || !commands.length) return "";
        var i;
        var lines = [];
        for (i = 0; i < commands.length; i++) lines.push(commands[i].op);
        return lines.join(" -> ");
    }

    function runPlan(plan, userText) {
        if (!plan) throw new Error("No plan.");
        var reply = plan.reply || plan.summary || "Done.";
        if (plan.ok === false && (!plan.commands || !plan.commands.length)) {
            addBubble("assistant", reply);
            throw new Error(plan.summary || reply);
        }
        if (!plan.commands || !plan.commands.length) {
            addBubble("assistant", reply);
            return Promise.resolve(plan);
        }
        log("Plan: " + plan.summary + "\n" + JSON.stringify(plan.commands, null, 2));
        if (!Host.available()) {
            addBubble("assistant", reply + "\n\nPreview only — install the panel in After Effects to execute.", formatOps(plan.commands) + "\n" + JSON.stringify(plan.commands, null, 2));
            return Promise.resolve(plan);
        }
        return Host.execute(plan).then(function (host) {
            var extra = formatOps(plan.commands);
            addBubble("assistant", host.data && host.data.reply ? host.data.reply : reply, extra);
            log("After Effects: " + host.message + "\n" + JSON.stringify(host.data, null, 2), "ok");
            refreshContext();
            return host;
        }).catch(function (err) {
            addBubble("assistant", "After Effects refused that: " + err.message);
            throw err;
        });
    }

    function refreshContext() {
        if (!Host.available()) {
            $("contextBox").textContent = "Open this panel inside After Effects to read the composition.";
            return;
        }
        Host.getContext().then(function (res) {
            $("contextBox").textContent = JSON.stringify(res.data, null, 2);
        }).catch(function (err) {
            $("contextBox").textContent = err.message;
        });
    }

    function checkLLM() {
        LLM.ping().then(function (data) {
            var names = [];
            if (data && data.models) {
                var i;
                for (i = 0; i < data.models.length; i++) names.push(data.models[i].name);
            }
            setStatus("ok", names.length ? ("Ollama: " + names[0]) : "LLM connected");
            log("Local LLM reachable" + (names.length ? (" — " + names.join(", ")) : ""), "ok");
        }).catch(function (err) {
            setStatus("err", "LLM offline");
            log("Local LLM unreachable: " + err.message + ". Offline parser still works.", "err");
        });
    }

    function runPrompt() {
        var text = $("prompt").value.trim();
        if (!text) {
            log("Type a command first.", "err");
            return;
        }
        addBubble("user", text);
        $("prompt").value = "";
        setBusy(true);
        var contextPromise = Host.available()
            ? Host.getContext().then(function (r) { return r.data; }).catch(function () { return {}; })
            : Promise.resolve({});

        contextPromise.then(function (ctx) {
            return LLM.plan(text, ctx).catch(function (err) {
                log("LLM failed (" + err.message + "). Using offline parser.");
                return Parser.plan(text);
            });
        }).then(function (plan) {
            return runPlan(plan, text);
        }).catch(function (err) {
            log(err.message, "err");
        }).then(function () {
            setBusy(false);
            $("prompt").focus();
        });
    }

    function bind() {
        logEl = $("log");
        statusDot = $("statusDot");
        statusText = $("statusText");
        chatEl = $("chat");
        Host.init();

        addBubble("assistant", "Tell me what to do in this composition. I can create layers, animate, add effects, move the camera, and ease keyframes. Local model preferred; offline phrases still work.");

        $("influence").addEventListener("input", function () {
            $("influenceVal").textContent = $("influence").value + "%";
        });

        $("runBtn").addEventListener("click", runPrompt);
        $("prompt").addEventListener("keydown", function (ev) {
            if (ev.key === "Enter" && !ev.shiftKey) {
                ev.preventDefault();
                runPrompt();
            }
        });
        $("refreshBtn").addEventListener("click", refreshContext);
        $("pingBtn").addEventListener("click", checkLLM);
        $("clearChatBtn").addEventListener("click", function () {
            chatEl.innerHTML = "";
            if (LLM.clearHistory) LLM.clearHistory();
            addBubble("assistant", "Chat cleared. What should After Effects do next?");
        });

        $("btnEnsureCam").addEventListener("click", function () {
            Host.executeOp("camera.ensure", { name: "AI Camera" })
                .then(function (r) { addBubble("assistant", "Camera ready."); log(JSON.stringify(r.data, null, 2), "ok"); refreshContext(); })
                .catch(function (e) { addBubble("assistant", e.message); log(e.message, "err"); });
        });
        $("btnDolly").addEventListener("click", function () {
            Host.executeOp("camera.dolly", { distance: 400, duration: 2, ease: "easeInOut", influence: 80 })
                .then(function () { addBubble("assistant", "Dolly in created."); })
                .catch(function (e) { addBubble("assistant", e.message); });
        });
        $("btnPan").addEventListener("click", function () {
            Host.executeOp("camera.pan", { yaw: 25, pitch: 0, duration: 2, ease: "easeInOut", influence: 75 })
                .then(function () { addBubble("assistant", "Pan created."); })
                .catch(function (e) { addBubble("assistant", e.message); });
        });
        $("btnOrbit").addEventListener("click", function () {
            Host.executeOp("camera.orbit", { yaw: 45, pitch: 10, duration: 3, ease: "easeInOut", influence: 80, keepDistance: true })
                .then(function () { addBubble("assistant", "Orbit created."); })
                .catch(function (e) { addBubble("assistant", e.message); });
        });
        $("btnDollyZoom").addEventListener("click", function () {
            Host.executeOp("camera.dollyZoom", { distance: 300, duration: 3, ease: "easeInOut", influence: 85 })
                .then(function () { addBubble("assistant", "Dolly zoom created."); })
                .catch(function (e) { addBubble("assistant", e.message); });
        });
        $("btnLookAt").addEventListener("click", function () {
            Host.executeOp("camera.lookAtSelected", { duration: 1.5, ease: "easeInOut", influence: 70 })
                .then(function () { addBubble("assistant", "Camera is looking at the selected layer."); })
                .catch(function (e) { addBubble("assistant", e.message); });
        });
        $("btnEase").addEventListener("click", function () {
            Host.execute({ summary: "Apply easing", commands: [currentEasePayload()] })
                .then(function () { addBubble("assistant", "Easing applied."); })
                .catch(function (e) { addBubble("assistant", e.message); });
        });

        var chips = document.querySelectorAll(".chip");
        var i;
        for (i = 0; i < chips.length; i++) {
            chips[i].addEventListener("click", function (ev) {
                $("prompt").value = ev.currentTarget.getAttribute("data-prompt");
                $("prompt").focus();
            });
        }

        if (!Host.available()) {
            setStatus("err", "Not in AE");
            log("Preview mode: CSInterface is missing. Install the CEP panel in After Effects.");
        } else {
            setStatus("ok", "After Effects");
            refreshContext();
        }
        checkLLM();
    }

    document.addEventListener("DOMContentLoaded", bind);
}());
