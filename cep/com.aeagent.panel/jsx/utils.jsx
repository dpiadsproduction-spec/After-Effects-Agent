/* AE Motion Agent — ExtendScript utilities (ES3) */

if (typeof AEAgent === "undefined") {
    AEAgent = {};
}

AEAgent.VERSION = "2.0.0";

AEAgent.ok = function (data, message) {
    var payload = {
        ok: true,
        message: message || "OK",
        data: data || {}
    };
    return JSON.stringify(payload);
};

AEAgent.fail = function (message, extra) {
    var payload = {
        ok: false,
        message: String(message || "Unknown error"),
        data: extra || {}
    };
    return JSON.stringify(payload);
};

AEAgent.clamp = function (value, min, max) {
    if (value < min) return min;
    if (value > max) return max;
    return value;
};

AEAgent.toNumber = function (value, fallback) {
    var n = Number(value);
    if (isNaN(n)) return fallback;
    return n;
};

AEAgent.toArray3 = function (value, fallback) {
    if (value && value.length >= 3) {
        return [
            AEAgent.toNumber(value[0], 0),
            AEAgent.toNumber(value[1], 0),
            AEAgent.toNumber(value[2], 0)
        ];
    }
    return fallback ? fallback.slice(0) : [0, 0, 0];
};

AEAgent.copy3 = function (v) {
    return [v[0], v[1], v[2]];
};

AEAgent.add3 = function (a, b) {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
};

AEAgent.sub3 = function (a, b) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
};

AEAgent.scale3 = function (a, s) {
    return [a[0] * s, a[1] * s, a[2] * s];
};

AEAgent.dot3 = function (a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
};

AEAgent.len3 = function (a) {
    return Math.sqrt(AEAgent.dot3(a, a));
};

AEAgent.norm3 = function (a) {
    var len = AEAgent.len3(a);
    if (len < 0.000001) return [0, 0, 0];
    return AEAgent.scale3(a, 1 / len);
};

AEAgent.cross3 = function (a, b) {
    return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0]
    ];
};

AEAgent.degToRad = function (d) {
    return d * Math.PI / 180;
};

AEAgent.radToDeg = function (r) {
    return r * 180 / Math.PI;
};

AEAgent.rotateY = function (v, deg) {
    var r = AEAgent.degToRad(deg);
    var c = Math.cos(r);
    var s = Math.sin(r);
    return [
        v[0] * c + v[2] * s,
        v[1],
        -v[0] * s + v[2] * c
    ];
};

AEAgent.rotateAroundAxis = function (v, axis, deg) {
    var u = AEAgent.norm3(axis);
    var r = AEAgent.degToRad(deg);
    var c = Math.cos(r);
    var s = Math.sin(r);
    var k = AEAgent.dot3(u, v) * (1 - c);
    return [
        v[0] * c + (u[1] * v[2] - u[2] * v[1]) * s + u[0] * k,
        v[1] * c + (u[2] * v[0] - u[0] * v[2]) * s + u[1] * k,
        v[2] * c + (u[0] * v[1] - u[1] * v[0]) * s + u[2] * k
    ];
};

AEAgent.getComp = function () {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        throw new Error("Open an active composition first.");
    }
    return comp;
};

AEAgent.layerWorldPos = function (layer, time) {
    var t = (typeof time === "number") ? time : layer.containingComp.time;
    try {
        return layer.toWorld([0, 0, 0], t);
    } catch (e) {
        return layer.property("ADBE Transform Group").property("ADBE Position").valueAtTime(t, false);
    }
};

AEAgent.findProp = function (layer, matchName) {
    function walk(group) {
        if (!group) return null;
        if (group.matchName === matchName) return group;
        if (group.numProperties) {
            var i;
            for (i = 1; i <= group.numProperties; i++) {
                var found = walk(group.property(i));
                if (found) return found;
            }
        }
        return null;
    }
    return walk(layer);
};

AEAgent.getTransform = function (layer) {
    return layer.property("ADBE Transform Group");
};

AEAgent.getPosition = function (layer) {
    return AEAgent.getTransform(layer).property("ADBE Position");
};

AEAgent.getOrientation = function (layer) {
    return AEAgent.getTransform(layer).property("ADBE Orientation");
};

AEAgent.getRotation = function (layer) {
    var t = AEAgent.getTransform(layer);
    return {
        x: t.property("ADBE Rotate X"),
        y: t.property("ADBE Rotate Y"),
        z: t.property("ADBE Rotate Z")
    };
};

AEAgent.getPOI = function (camera) {
    var t = camera.property("ADBE Transform Group");
    var p = t.property("ADBE Anchor Point");
    if (p) return p;
    p = t.property("Point of Interest");
    if (p) return p;
    throw new Error("Point of Interest not found on camera.");
};

AEAgent.getCameraOption = function (camera, matchName) {
    var opts = camera.property("ADBE Camera Options Group");
    if (!opts) throw new Error("Selected layer is not a camera.");
    return opts.property(matchName);
};

AEAgent.getZoom = function (camera) {
    return AEAgent.getCameraOption(camera, "ADBE Camera Zoom");
};

AEAgent.getFocal = function (camera) {
    return AEAgent.getCameraOption(camera, "ADBE Camera Zoom");
};

AEAgent.ensure3D = function (layer) {
    if (layer.threeDLayer !== true && !(layer instanceof CameraLayer) && !(layer instanceof LightLayer)) {
        layer.threeDLayer = true;
    }
};

AEAgent.setTemporalEase = function (prop, keyIndex, easeInArr, easeOutArr) {
    prop.setTemporalEaseAtKey(keyIndex, easeInArr, easeOutArr);
};

AEAgent.makeEase = function (speed, influence) {
    return new KeyframeEase(speed, AEAgent.clamp(influence, 0.1, 100));
};

AEAgent.applyEaseToKey = function (prop, keyIndex, mode, influenceIn, influenceOut, speedIn, speedOut) {
    var dim = 1;
    try {
        dim = prop.value.length || 1;
    } catch (e1) {
        dim = 1;
    }
    if (typeof dim !== "number" || dim < 1) dim = 1;

    var i;
    var ein = [];
    var eout = [];
    var si = AEAgent.toNumber(speedIn, 0);
    var so = AEAgent.toNumber(speedOut, 0);
    var infIn = AEAgent.toNumber(influenceIn, 75);
    var infOut = AEAgent.toNumber(influenceOut, 75);

    if (mode === "linear") {
        for (i = 0; i < dim; i++) {
            ein.push(AEAgent.makeEase(0, 0.1));
            eout.push(AEAgent.makeEase(0, 0.1));
        }
        try { prop.setInterpolationTypeAtKey(keyIndex, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR); } catch (e2) {}
        AEAgent.setTemporalEase(prop, keyIndex, ein, eout);
        return;
    }

    if (mode === "hold") {
        try { prop.setInterpolationTypeAtKey(keyIndex, KeyframeInterpolationType.HOLD, KeyframeInterpolationType.HOLD); } catch (e3) {}
        return;
    }

    if (mode === "autoBezier") {
        try {
            prop.setInterpolationTypeAtKey(keyIndex, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
            prop.setTemporalContinuousAtKey(keyIndex, true);
            prop.setTemporalAutoBezierAtKey(keyIndex, true);
        } catch (e4) {}
        return;
    }

    var inInf = infIn;
    var outInf = infOut;
    if (mode === "easeIn") {
        outInf = 0.1;
        so = 0;
    } else if (mode === "easeOut") {
        inInf = 0.1;
        si = 0;
    } else if (mode === "cinematic") {
        inInf = 80;
        outInf = 80;
        si = 0;
        so = 0;
    }

    for (i = 0; i < dim; i++) {
        ein.push(AEAgent.makeEase(si, inInf));
        eout.push(AEAgent.makeEase(so, outInf));
    }

    try {
        prop.setInterpolationTypeAtKey(keyIndex, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
        prop.setTemporalContinuousAtKey(keyIndex, false);
        prop.setTemporalAutoBezierAtKey(keyIndex, false);
    } catch (e5) {}
    AEAgent.setTemporalEase(prop, keyIndex, ein, eout);
};

AEAgent.setOrAddKey = function (prop, time, value) {
    if (!prop.canVaryOverTime) {
        prop.setValue(value);
        return 0;
    }
    if (!prop.isTimeVarying && prop.numKeys === 0) {
        prop.setValueAtTime(time, prop.value);
    }
    prop.setValueAtTime(time, value);
    return prop.nearestKeyIndex(time);
};

AEAgent.selectedLayers = function (comp) {
    var layers = [];
    var i;
    if (comp.selectedLayers && comp.selectedLayers.length) {
        for (i = 0; i < comp.selectedLayers.length; i++) {
            layers.push(comp.selectedLayers[i]);
        }
    }
    return layers;
};
