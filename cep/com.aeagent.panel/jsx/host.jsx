/* AE Motion Agent — Host dispatcher */

(function () {
    var here = File($.fileName).parent;
    function load(name) {
        var f = new File(here.fsName + "/" + name);
        if (!f.exists) return false;
        $.evalFile(f);
        return true;
    }
    if (typeof JSON === "undefined") load("json2.jsx");
    if (typeof AEAgent === "undefined" || typeof AEAgent.getComp !== "function") load("utils.jsx");
    if (typeof AEAgent === "undefined" || typeof AEAgent.Camera === "undefined") load("camera.jsx");
    if (typeof AEAgent === "undefined" || typeof AEAgent.Ease === "undefined") load("easing.jsx");
    if (typeof AEAgent === "undefined" || typeof AEAgent.Scene === "undefined") load("scene.jsx");
}());

if (typeof AEAgent === "undefined") {
    AEAgent = {};
}

AEAgent.context = function () {
    var comp = AEAgent.getComp();
    return AEAgent.Scene.snapshot(comp);
};

AEAgent.runOne = function (cmd) {
    if (!cmd || !cmd.op) throw new Error("Command is missing op.");
    var op = String(cmd.op);
    var comp;
    var cam;
    var layer;
    var result = {};

    if (op === "comp.create") {
        return AEAgent.Scene.createComp(cmd);
    }

    if (op !== "context") {
        comp = AEAgent.getComp();
    }

    switch (op) {
    case "context":
        result = AEAgent.context();
        break;

    case "camera.ensure":
        cam = AEAgent.Camera.ensure(comp, cmd.name);
        result = AEAgent.Camera.info(cam, comp.time);
        break;
    case "camera.set":
        cam = AEAgent.Camera.ensure(comp, cmd.name);
        result = AEAgent.Camera.set(cam, cmd);
        break;
    case "camera.dolly":
        cam = AEAgent.Camera.ensure(comp, cmd.name);
        result = AEAgent.Camera.dolly(cam, cmd);
        break;
    case "camera.pan":
        cam = AEAgent.Camera.ensure(comp, cmd.name);
        result = AEAgent.Camera.pan(cam, cmd);
        break;
    case "camera.orbit":
        cam = AEAgent.Camera.ensure(comp, cmd.name);
        result = AEAgent.Camera.orbit(cam, cmd);
        break;
    case "camera.dollyZoom":
        cam = AEAgent.Camera.ensure(comp, cmd.name);
        result = AEAgent.Camera.dollyZoom(cam, cmd);
        break;
    case "camera.lookAtSelected":
        cam = AEAgent.Camera.ensure(comp, cmd.name);
        result = AEAgent.Camera.lookAtSelected(cam, cmd);
        break;

    case "ease.apply":
        result = { keys: AEAgent.Ease.applyToSelection(comp, cmd) };
        break;

    case "layer.create":
        result = AEAgent.Scene.createLayer(comp, cmd);
        break;
    case "layer.set":
        layer = AEAgent.resolveLayer(comp, cmd.layer);
        result = AEAgent.Scene.setLayer(layer, cmd);
        break;
    case "layer.select":
        result = AEAgent.Scene.select(comp, cmd);
        break;
    case "layer.duplicate":
        result = AEAgent.Scene.duplicate(comp, cmd);
        break;
    case "layer.fade":
        layer = AEAgent.resolveLayer(comp, cmd.layer);
        result = AEAgent.Scene.fade(layer, cmd);
        break;

    case "text.set":
        layer = AEAgent.resolveLayer(comp, cmd.layer);
        result = AEAgent.Scene.setText(layer, cmd);
        break;

    case "prop.set":
        layer = AEAgent.resolveLayer(comp, cmd.layer);
        result = AEAgent.Scene.setProp(layer, cmd);
        break;
    case "prop.animate":
        layer = AEAgent.resolveLayer(comp, cmd.layer);
        result = AEAgent.Scene.animate(layer, cmd);
        break;

    case "expression.set":
        layer = AEAgent.resolveLayer(comp, cmd.layer);
        result = AEAgent.Scene.setExpression(layer, cmd);
        break;

    case "effect.add":
        layer = AEAgent.resolveLayer(comp, cmd.layer);
        result = AEAgent.Scene.addEffect(layer, cmd);
        break;
    case "effect.set":
        layer = AEAgent.resolveLayer(comp, cmd.layer);
        result = AEAgent.Scene.setEffect(layer, cmd);
        break;

    case "marker.add":
        result = AEAgent.Scene.addMarker(comp, cmd);
        break;

    case "comp.set":
        result = AEAgent.Scene.setComp(comp, cmd);
        break;
    case "comp.precompose":
        result = AEAgent.Scene.precompose(comp, cmd);
        break;

    default:
        throw new Error("Unknown operation: " + op);
    }
    return result;
};

AEAgent.execute = function (jsonText) {
    try {
        app.beginUndoGroup("AE Motion Agent");
        var payload = jsonText;
        if (typeof jsonText === "string") {
            payload = JSON.parse(jsonText);
        }
        var commands = payload.commands || payload;
        if (!(commands instanceof Array)) {
            commands = [commands];
        }
        var outputs = [];
        var i;
        for (i = 0; i < commands.length; i++) {
            outputs.push({
                op: commands[i].op,
                result: AEAgent.runOne(commands[i])
            });
        }
        app.endUndoGroup();
        return AEAgent.ok({
            summary: payload.summary || payload.reply || "",
            reply: payload.reply || payload.summary || "",
            results: outputs
        }, payload.summary || "Executed " + outputs.length + " command(s)");
    } catch (e) {
        try { app.endUndoGroup(); } catch (e2) {}
        return AEAgent.fail(e.message || String(e));
    }
};

AEAgent.getContextJSON = function () {
    try {
        return AEAgent.ok(AEAgent.context(), "context");
    } catch (e) {
        return AEAgent.fail(e.message || String(e));
    }
};

function AEAgent_execute(jsonText) {
    return AEAgent.execute(jsonText);
}

function AEAgent_context() {
    return AEAgent.getContextJSON();
}
