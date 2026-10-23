/* AE Motion Agent — Keyframe smoothing */

if (typeof AEAgent === "undefined") {
    AEAgent = {};
}

AEAgent.Ease = {};

AEAgent.Ease.walkSelectedKeys = function (comp, callback) {
    var layers = AEAgent.selectedLayers(comp);
    var count = 0;
    var li;
    if (!layers.length) {
        var i;
        for (i = 1; i <= comp.numLayers; i++) layers.push(comp.layer(i));
    }
    for (li = 0; li < layers.length; li++) {
        count += AEAgent.Ease.walkLayer(layers[li], true, callback);
    }
    return count;
};

AEAgent.Ease.walkLayer = function (layer, selectedOnly, callback) {
    var count = 0;
    function walk(prop) {
        if (!prop) return;
        var i;
        if (prop.numKeys && prop.numKeys > 0) {
            for (i = 1; i <= prop.numKeys; i++) {
                var use = true;
                if (selectedOnly) {
                    try {
                        use = prop.keySelected(i);
                    } catch (e) {
                        use = false;
                    }
                }
                if (use) {
                    callback(prop, i, layer);
                    count++;
                }
            }
        }
        if (prop.numProperties) {
            for (i = 1; i <= prop.numProperties; i++) {
                try {
                    walk(prop.property(i));
                } catch (e2) {}
            }
        }
    }
    walk(layer);
    return count;
};

AEAgent.Ease.applyToSelection = function (comp, opts) {
    var mode = opts.mode || "easeInOut";
    var infIn = AEAgent.toNumber(opts.influenceIn, AEAgent.toNumber(opts.influence, 75));
    var infOut = AEAgent.toNumber(opts.influenceOut, AEAgent.toNumber(opts.influence, 75));
    var speedIn = AEAgent.toNumber(opts.speedIn, 0);
    var speedOut = AEAgent.toNumber(opts.speedOut, 0);
    var target = opts.target || "selectedKeys";
    function apply(prop, keyIndex) {
        AEAgent.applyEaseToKey(prop, keyIndex, mode, infIn, infOut, speedIn, speedOut);
    }

    if (target === "camera") {
        var cam = AEAgent.Camera.find(comp, opts.cameraName);
        if (!cam) throw new Error("No camera found.");
        return AEAgent.Ease.walkLayer(cam, false, apply);
    }

    if (target === "selectedLayers") {
        var layers = AEAgent.selectedLayers(comp);
        var i;
        var n = 0;
        if (!layers.length) throw new Error("Select one or more layers.");
        for (i = 0; i < layers.length; i++) {
            n += AEAgent.Ease.walkLayer(layers[i], false, apply);
        }
        return n;
    }

    if (target === "allAnimated") {
        var li;
        var total = 0;
        for (li = 1; li <= comp.numLayers; li++) {
            total += AEAgent.Ease.walkLayer(comp.layer(li), false, apply);
        }
        return total;
    }

    var selectedCount = AEAgent.Ease.walkSelectedKeys(comp, apply);
    if (selectedCount === 0) {
        var sl = AEAgent.selectedLayers(comp);
        var j;
        var fallback = 0;
        if (sl.length) {
            for (j = 0; j < sl.length; j++) {
                fallback += AEAgent.Ease.walkLayer(sl[j], false, apply);
            }
            return fallback;
        }
        throw new Error("Select keyframes or layers first.");
    }
    return selectedCount;
};

AEAgent.Ease.presets = {
    easeIn: { mode: "easeIn", influenceIn: 80, influenceOut: 0.1 },
    easeOut: { mode: "easeOut", influenceIn: 0.1, influenceOut: 80 },
    easeInOut: { mode: "easeInOut", influenceIn: 75, influenceOut: 75 },
    cinematic: { mode: "cinematic", influenceIn: 85, influenceOut: 85 },
    autoBezier: { mode: "autoBezier", influenceIn: 33, influenceOut: 33 },
    linear: { mode: "linear", influenceIn: 0.1, influenceOut: 0.1 },
    hold: { mode: "hold", influenceIn: 0.1, influenceOut: 0.1 },
    slowEnd: { mode: "easeIn", influenceIn: 90, influenceOut: 10 },
    slowStart: { mode: "easeOut", influenceIn: 10, influenceOut: 90 }
};
