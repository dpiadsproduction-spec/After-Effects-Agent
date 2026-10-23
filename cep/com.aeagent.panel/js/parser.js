/* Offline command parser — used when the local LLM is unreachable */

var Parser = (function () {
    function has(text, list) {
        var i;
        for (i = 0; i < list.length; i++) {
            if (text.indexOf(list[i]) !== -1) return true;
        }
        return false;
    }

    function num(text, re, fallback) {
        var m = text.match(re);
        if (!m) return fallback;
        return parseFloat(m[1]);
    }

    function quoted(raw) {
        var m = String(raw || "").match(/["“”']([^"“”']+)["“”']/);
        return m ? m[1] : null;
    }

    function plan(raw) {
        var text = String(raw || "").toLowerCase();
        var ar = String(raw || "");
        var duration = num(text, /(\d+(?:\.\d+)?)\s*(s|sec|secs|second|seconds|ث|ثانية|ثواني)/, 2);
        var influence = num(text, /(\d+(?:\.\d+)?)\s*%/, 80);
        var distance = num(text, /(\d+(?:\.\d+)?)\s*(px|pixel|pixels)?/, 400);
        var angle = num(text, /(\-?\d+(?:\.\d+)?)\s*(deg|degree|degrees|درجة)/, 45);
        var quote = quoted(ar);

        if (has(text, ["dolly zoom", "vertigo", "hitchcock", "دوللي زوم", "تأثير فيرتيجو"])) {
            return {
                ok: true,
                reply: "Creating a dolly zoom on the active camera.",
                summary: "Dolly zoom on the active camera",
                commands: [{ op: "camera.dollyZoom", distance: distance || 300, duration: duration, ease: "easeInOut", influence: influence }]
            };
        }
        if (has(text, ["orbit", "طوف", "دوران حول", "orbit around"])) {
            var orbitCmds = [];
            if (has(text, ["3d", "ثلاثي"])) {
                orbitCmds.push({ op: "layer.set", layer: "selected", threeD: true });
            }
            orbitCmds.push({ op: "camera.orbit", yaw: angle, pitch: 8, duration: duration, ease: "easeInOut", influence: influence, keepDistance: true });
            return {
                ok: true,
                reply: "Orbiting the camera around the point of interest.",
                summary: "Orbit camera around point of interest",
                commands: orbitCmds
            };
        }
        if (has(text, ["pan", "بان", "التفات", "look left", "look right"])) {
            var yaw = has(text, ["left", "يسار"]) ? -Math.abs(angle) : Math.abs(angle);
            return {
                ok: true,
                reply: "Panning the camera.",
                summary: "Pan camera",
                commands: [{ op: "camera.pan", yaw: yaw, pitch: 0, duration: duration, ease: "easeInOut", influence: influence }]
            };
        }
        if (has(text, ["look at", "lookat", "نحو الطبقة", "انظر إلى", "toward the selected", "حرك الكاميرا نحو"])) {
            var cmds = [
                { op: "camera.lookAtSelected", duration: Math.min(duration, 1.5), ease: "easeInOut", influence: influence }
            ];
            if (has(text, ["move", "حرك", "dolly", "اقترب", "toward"])) {
                cmds.push({ op: "camera.dolly", distance: Math.abs(distance) || 350, duration: duration, ease: "easeInOut", influence: influence });
            }
            return { ok: true, reply: "Aiming the camera at the selected layer.", summary: "Aim camera at selected layer", commands: cmds };
        }
        if (has(text, ["dolly", "اقترب", "ابتعد", "push in", "pull out", "zoom in camera"])) {
            var signed = has(text, ["out", "away", "ابتعد", "pull"]) ? -Math.abs(distance || 400) : Math.abs(distance || 400);
            return {
                ok: true,
                reply: "Dollying the camera.",
                summary: "Dolly camera",
                commands: [{ op: "camera.dolly", distance: signed, duration: duration, ease: "easeInOut", influence: influence }]
            };
        }
        if (has(text, ["create camera", "add camera", "أنشئ كاميرا", "اضف كاميرا", "أضف كاميرا"])) {
            return { ok: true, reply: "Creating a camera if needed.", summary: "Create camera if missing", commands: [{ op: "camera.ensure", name: "AI Camera" }] };
        }

        if (has(text, ["fade"]) && has(text, ["in"]) && has(text, ["out"])) {
            return { ok: true, reply: "Fading the selected layer in and out.", summary: "Fade in/out", commands: [{ op: "layer.fade", layer: "selected", type: "inOut", duration: 0.6 }] };
        }
        if (has(text, ["fade in and out", "fade in out", "ظهور واختفاء", "فييد إن أوت"])) {
            return { ok: true, reply: "Fading the selected layer in and out.", summary: "Fade in/out", commands: [{ op: "layer.fade", layer: "selected", type: "inOut", duration: 0.6 }] };
        }
        if (has(text, ["fade in", "ظهور تدريجي", "فييد إن"])) {
            return { ok: true, reply: "Fading the selected layer in.", summary: "Fade in", commands: [{ op: "layer.fade", layer: "selected", type: "in", duration: 0.6 }] };
        }
        if (has(text, ["fade out", "اختفاء تدريجي", "فييد أوت"])) {
            return { ok: true, reply: "Fading the selected layer out.", summary: "Fade out", commands: [{ op: "layer.fade", layer: "selected", type: "out", duration: 0.6 }] };
        }

        if (has(text, ["gaussian blur", "blur", "ضبابية", "بلور"])) {
            var blur = num(text, /(\d+(?:\.\d+)?)/, 20);
            return {
                ok: true,
                reply: "Adding Gaussian Blur to the selected layer.",
                summary: "Add blur",
                commands: [{ op: "effect.add", layer: "selected", effect: "blur", values: { Blurriness: blur } }]
            };
        }
        if (has(text, ["drop shadow", "ظل"])) {
            return { ok: true, reply: "Adding a drop shadow.", summary: "Add drop shadow", commands: [{ op: "effect.add", layer: "selected", effect: "drop shadow" }] };
        }
        if (has(text, ["glow", "توهج"])) {
            return { ok: true, reply: "Adding glow.", summary: "Add glow", commands: [{ op: "effect.add", layer: "selected", effect: "glow" }] };
        }

        if (has(text, ["3d", "ثلاثي الأبعاد", "اجعلها ثلاثية"])) {
            return { ok: true, reply: "Enabling 3D on the selected layer.", summary: "Enable 3D", commands: [{ op: "layer.set", layer: "selected", threeD: true }] };
        }
        if (has(text, ["hide", "أخف", "اخفي", "disable layer"])) {
            return { ok: true, reply: "Hiding the selected layer.", summary: "Hide layer", commands: [{ op: "layer.set", layer: "selected", enabled: false }] };
        }
        if (has(text, ["show", "أظهر", "اظهر"])) {
            return { ok: true, reply: "Showing the selected layer.", summary: "Show layer", commands: [{ op: "layer.set", layer: "selected", enabled: true }] };
        }
        if (has(text, ["duplicate", "كرر", "انسخ الطبقة"])) {
            return { ok: true, reply: "Duplicating the selected layer.", summary: "Duplicate layer", commands: [{ op: "layer.duplicate", layer: "selected" }] };
        }

        if (has(text, ["scale", "حجم", "كبّر", "صغّر", "كبر", "صغر"])) {
            var sc = num(text, /(\d+(?:\.\d+)?)/, 120);
            if (has(text, ["animate", "حرّك", "حرك", "over"])) {
                return {
                    ok: true,
                    reply: "Animating scale on the selected layer.",
                    summary: "Animate scale",
                    commands: [{ op: "prop.animate", layer: "selected", prop: "scale", to: [sc, sc, 100], duration: duration, ease: "easeInOut", influence: influence }]
                };
            }
            return { ok: true, reply: "Setting scale.", summary: "Set scale", commands: [{ op: "prop.set", layer: "selected", prop: "scale", value: [sc, sc, 100] }] };
        }
        if (has(text, ["opacity", "شفافية", "عتامة"])) {
            var opv = num(text, /(\d+(?:\.\d+)?)/, 50);
            return { ok: true, reply: "Setting opacity.", summary: "Set opacity", commands: [{ op: "prop.set", layer: "selected", prop: "opacity", value: opv }] };
        }
        if (has(text, ["rotate", "دوران", "لف"])) {
            var rot = num(text, /(\-?\d+(?:\.\d+)?)/, 90);
            return {
                ok: true,
                reply: "Animating rotation.",
                summary: "Animate rotation",
                commands: [{ op: "prop.animate", layer: "selected", prop: "rotation", to: rot, duration: duration, ease: "easeInOut", influence: influence }]
            };
        }

        if (has(text, ["title", "نص", "text", "كتابة", "أضف نص", "اضف نص", "اكتب"])) {
            var content = quote || "Title";
            return {
                ok: true,
                reply: "Creating a text layer.",
                summary: "Create text",
                commands: [
                    { op: "layer.create", type: "text", name: content, text: content, fontSize: 120, fillColor: [1, 1, 1] },
                    { op: "layer.fade", layer: "selected", type: "in", duration: 0.6 }
                ]
            };
        }
        if (has(text, ["solid", "لون خالص", "سوليد"])) {
            return { ok: true, reply: "Creating a solid.", summary: "Create solid", commands: [{ op: "layer.create", type: "solid", name: "Solid", color: [0.1, 0.1, 0.12] }] };
        }
        if (has(text, ["null", "نل"]) && has(text, ["add", "create", "أنشئ", "أضف", "اضف"])) {
            return { ok: true, reply: "Creating a null object.", summary: "Create null", commands: [{ op: "layer.create", type: "null", name: "Null" }] };
        }
        if (has(text, ["adjustment", "طبقة ضبط", "ادجست"])) {
            return { ok: true, reply: "Creating an adjustment layer.", summary: "Create adjustment layer", commands: [{ op: "layer.create", type: "adjustment", name: "Adjustment Layer" }] };
        }
        if (has(text, ["precompose", "precomp", "بري كومب", "دمج الطبقات"])) {
            return { ok: true, reply: "Precomposing selected layers.", summary: "Precompose", commands: [{ op: "comp.precompose", layer: "selectedAll", name: "Precomp" }] };
        }
        if (has(text, ["wiggle"]) || (has(text, ["اهتزاز"]) && has(text, ["position", "موضع", "مكان"]))) {
            return {
                ok: true,
                reply: "Adding a wiggle expression to position.",
                summary: "Wiggle position",
                commands: [{ op: "expression.set", layer: "selected", prop: "position", expression: "wiggle(2, 40)" }]
            };
        }

        if (has(text, ["slow", "ناعمة", "بطيئة", "smooth", "soften", "ease", "تنعيم", "مرنة", "في النهاية"])) {
            var mode = "easeInOut";
            if (has(text, ["end", "النهاية", "slow out", "ease out", "بطيئة في النهاية"])) mode = "easeIn";
            if (has(text, ["start", "البداية", "slow in", "ease in"])) mode = "easeOut";
            if (has(text, ["auto bezier", "autobezier", "بيزير"])) mode = "autoBezier";
            if (has(text, ["cinematic", "سينما"])) mode = "cinematic";
            return {
                ok: true,
                reply: "Smoothing selected keyframes.",
                summary: "Smooth selected keyframes",
                commands: [{
                    op: "ease.apply",
                    mode: mode,
                    influenceIn: influence,
                    influenceOut: influence,
                    speedIn: 0,
                    speedOut: 0,
                    target: "selectedKeys"
                }]
            };
        }
        if (has(text, ["context", "status", "ما الحالة", "السياق", "ماذا يوجد", "what is in"])) {
            return { ok: true, reply: "Reading the composition.", summary: "Read composition context", commands: [{ op: "context" }] };
        }

        return {
            ok: false,
            reply: "I could not parse that locally. Start Ollama, or try: create text, fade in, add blur, orbit camera.",
            summary: "Could not parse command locally. Start Ollama or use a known phrase.",
            commands: [],
            raw: ar
        };
    }

    return { plan: plan };
}());
