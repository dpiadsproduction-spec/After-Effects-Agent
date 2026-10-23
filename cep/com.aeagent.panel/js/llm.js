/* Local LLM client — Ollama / OpenAI-compatible endpoints */

var LLM = (function () {
    var history = [];

    function systemPrompt() {
        return (typeof CATALOG !== "undefined" && CATALOG.SYSTEM) ? CATALOG.SYSTEM : "";
    }

    function settings() {
        return {
            endpoint: (document.getElementById("endpoint").value || "http://localhost:11434").replace(/\/+$/, ""),
            model: document.getElementById("model").value || "llama3.1",
            api: document.getElementById("apiType").value || "ollama"
        };
    }

    function extractJSON(text) {
        if (!text) throw new Error("Empty model response.");
        var trimmed = String(text).trim();
        var fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
        if (fence) trimmed = fence[1].trim();
        var start = trimmed.indexOf("{");
        var end = trimmed.lastIndexOf("}");
        if (start === -1 || end === -1 || end <= start) {
            throw new Error("Model did not return JSON.");
        }
        return JSON.parse(trimmed.slice(start, end + 1));
    }

    function postJSON(url, body) {
        return fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        }).then(function (res) {
            if (!res.ok) {
                return res.text().then(function (t) {
                    throw new Error("LLM HTTP " + res.status + ": " + (t || res.statusText));
                });
            }
            return res.json();
        });
    }

    function compactContext(ctx) {
        if (!ctx) return {};
        var layers = ctx.layers || [];
        var shortLayers = [];
        var i;
        var n = Math.min(layers.length, 24);
        for (i = 0; i < n; i++) {
            shortLayers.push({
                i: layers[i].index,
                n: layers[i].name,
                t: layers[i].type,
                sel: layers[i].selected,
                p: layers[i].position,
                s: layers[i].scale,
                o: layers[i].opacity,
                fx: layers[i].effects
            });
        }
        return {
            project: ctx.project,
            comp: ctx.comp,
            selected: ctx.selected,
            cameras: ctx.cameras,
            layers: shortLayers
        };
    }

    function buildMessages(user, context) {
        var messages = [{ role: "system", content: systemPrompt() }];
        var i;
        var start = Math.max(0, history.length - 6);
        for (i = start; i < history.length; i++) messages.push(history[i]);
        messages.push({
            role: "user",
            content: "AE context:\n" + JSON.stringify(compactContext(context)) + "\n\nUser:\n" + user
        });
        return messages;
    }

    function remember(user, plan) {
        history.push({ role: "user", content: user });
        history.push({
            role: "assistant",
            content: JSON.stringify({
                ok: plan.ok,
                reply: plan.reply || plan.summary,
                summary: plan.summary,
                commands: plan.commands || []
            })
        });
        if (history.length > 16) history = history.slice(history.length - 16);
    }

    function clearHistory() {
        history = [];
    }

    function chatOllama(user, context) {
        var s = settings();
        return postJSON(s.endpoint + "/api/chat", {
            model: s.model,
            stream: false,
            format: "json",
            messages: buildMessages(user, context)
        }).then(function (data) {
            var text = (data && data.message && data.message.content) || "";
            if (!text && data && data.response) text = data.response;
            return extractJSON(text);
        });
    }

    function chatOpenAI(user, context) {
        var s = settings();
        return postJSON(s.endpoint + "/v1/chat/completions", {
            model: s.model,
            temperature: 0,
            messages: buildMessages(user, context)
        }).then(function (data) {
            var text = data && data.choices && data.choices[0] && data.choices[0].message
                ? data.choices[0].message.content
                : "";
            return extractJSON(text);
        });
    }

    function ping() {
        var s = settings();
        var url = s.api === "openai" ? s.endpoint + "/v1/models" : s.endpoint + "/api/tags";
        return fetch(url, { method: "GET" }).then(function (res) {
            if (!res.ok) throw new Error("Unreachable (" + res.status + ")");
            return res.json();
        });
    }

    function plan(user, context) {
        var s = settings();
        var p = (s.api === "openai") ? chatOpenAI(user, context) : chatOllama(user, context);
        return p.then(function (result) {
            if (!result.reply && result.summary) result.reply = result.summary;
            remember(user, result);
            return result;
        });
    }

    return {
        ping: ping,
        plan: plan,
        extractJSON: extractJSON,
        clearHistory: clearHistory,
        SYSTEM_PROMPT: systemPrompt()
    };
}());
