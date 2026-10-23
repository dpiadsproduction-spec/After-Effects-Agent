/* AE Motion Agent — general After Effects scene API (ES3) */

if (typeof AEAgent === "undefined") {
    AEAgent = {};
}

AEAgent.Scene = {};

AEAgent.PROP_ALIAS = {
    position: "ADBE Position",
    scale: "ADBE Scale",
    opacity: "ADBE Opacity",
    rotation: "ADBE Rotate Z",
    rotationz: "ADBE Rotate Z",
    "rotation z": "ADBE Rotate Z",
    rotationx: "ADBE Rotate X",
    "rotation x": "ADBE Rotate X",
    rotationy: "ADBE Rotate Y",
    "rotation y": "ADBE Rotate Y",
    anchor: "ADBE Anchor Point",
    "anchor point": "ADBE Anchor Point",
    orientation: "ADBE Orientation",
    zoom: "ADBE Camera Zoom",
    poi: "ADBE Anchor Point",
    "point of interest": "ADBE Anchor Point"
};

AEAgent.EFFECT_ALIAS = {
    blur: "ADBE Gaussian Blur 2",
    "gaussian blur": "ADBE Gaussian Blur 2",
    fill: "ADBE Fill",
    tint: "ADBE Tint",
    glow: "ADBE Glo2",
    "drop shadow": "ADBE Drop Shadow",
    shadow: "ADBE Drop Shadow",
    levels: "ADBE Easy Levels2",
    curves: "ADBE CurvesCustom",
    tritone: "ADBE Tritone",
    "hue saturation": "ADBE HUE SATURATION",
    hue: "ADBE HUE SATURATION",
    brightness: "ADBE EasyBright",
    invert: "ADBE Invert",
    noise: "ADBE Noise",
    "fractal noise": "ADBE Fractal Noise",
    turbulent: "ADBE Turbulent Displace",
    "linear wipe": "ADBE Linear Wipe",
    "radial wipe": "ADBE Radial Wipe",
    "venetian blinds": "ADBE Venetian Blinds",
    "motion tile": "ADBE Motion Tile",
    transform: "ADBE Geometry2",
    posterize: "ADBE Posterize",
    "find edges": "ADBE Find Edges",
    "roughen edges": "ADBE Roughen Edges",
    "simple choker": "ADBE Simple Choker",
    "bevel alpha": "ADBE Bevel Alpha",
    "cc composite": "CC Composite",
    "unsharp mask": "ADBE Unsharp Mask2",
    "optic compensation": "ADBE Optics Compensation",
    "camera lens blur": "CS Camera Lens Blur",
    "fast box blur": "ADBE Box Blur2",
    "directional blur": "ADBE Motion Blur",
    "cc radial fast blur": "CC Radial Fast Blur"
};

AEAgent.resolveTime = function (comp, t) {
    if (t === undefined || t === null || t === "now" || t === "") return comp.time;
    if (t === "start") return 0;
    if (t === "end") return comp.duration;
    if (typeof t === "string") {
        var s = String(t);
        if (s.charAt(0) === "+") return comp.time + AEAgent.toNumber(s.substring(1), 0);
        if (s.charAt(0) === "-") return comp.time + AEAgent.toNumber(s, 0);
    }
    return AEAgent.toNumber(t, comp.time);
};

AEAgent.color01 = function (value, fallback) {
    var src = value;
    if (!src || !src.length) src = fallback || [1, 1, 1];
    var r = AEAgent.toNumber(src[0], 1);
    var g = AEAgent.toNumber(src[1], 1);
    var b = AEAgent.toNumber(src[2], 1);
    if (r > 1 || g > 1 || b > 1) {
        r = r / 255;
        g = g / 255;
        b = b / 255;
    }
    return [AEAgent.clamp(r, 0, 1), AEAgent.clamp(g, 0, 1), AEAgent.clamp(b, 0, 1)];
};

AEAgent.serializeValue = function (value) {
    if (value === null || value === undefined) return null;
    if (typeof value === "number" || typeof value === "boolean" || typeof value === "string") return value;
    if (value && typeof value.length === "number") {
        var out = [];
        var i;
        var n = Math.min(value.length, 8);
        for (i = 0; i < n; i++) {
            if (typeof value[i] === "number") out.push(Math.round(value[i] * 1000) / 1000);
            else out.push(value[i]);
        }
        return out;
    }
    return String(value);
};

AEAgent.layerTypeName = function (layer) {
    if (layer instanceof CameraLayer) return "camera";
    if (layer instanceof LightLayer) return "light";
    if (layer instanceof TextLayer) return "text";
    if (layer instanceof ShapeLayer) return "shape";
    if (layer.adjustmentLayer) return "adjustment";
    if (layer.nullLayer) return "null";
    if (layer.source && layer.source instanceof CompItem) return "precomp";
    if (layer.source && layer.source instanceof FootageItem) {
        try {
            if (layer.source.mainSource instanceof SolidSource) return "solid";
        } catch (e) {}
        return "footage";
    }
    return "layer";
};

AEAgent.resolveLayer = function (comp, selector) {
    if (selector === undefined || selector === null || selector === "" || selector === "selected") {
        var sel = AEAgent.selectedLayers(comp);
        if (!sel.length) throw new Error("Select a layer first.");
        return sel[0];
    }
    if (typeof selector === "number") {
        if (selector < 1 || selector > comp.numLayers) throw new Error("Layer index out of range: " + selector);
        return comp.layer(selector);
    }
    var name = String(selector);
    var i;
    for (i = 1; i <= comp.numLayers; i++) {
        if (comp.layer(i).name === name) return comp.layer(i);
    }
    var lower = name.toLowerCase();
    for (i = 1; i <= comp.numLayers; i++) {
        if (String(comp.layer(i).name).toLowerCase() === lower) return comp.layer(i);
    }
    throw new Error("Layer not found: " + name);
};

AEAgent.resolveLayers = function (comp, selector) {
    if (selector === "selectedAll" || selector === "selected") {
        var s = AEAgent.selectedLayers(comp);
        if (!s.length) throw new Error("Select a layer first.");
        if (selector === "selected") return [s[0]];
        return s;
    }
    if (selector === "all") {
        var all = [];
        var i;
        for (i = 1; i <= comp.numLayers; i++) all.push(comp.layer(i));
        return all;
    }
    if (selector && selector.length && typeof selector !== "string") {
        var list = [];
        var k;
        for (k = 0; k < selector.length; k++) list.push(AEAgent.resolveLayer(comp, selector[k]));
        return list;
    }
    return [AEAgent.resolveLayer(comp, selector)];
};

AEAgent.findPropByMatch = function (root, matchName) {
    function walk(group) {
        if (!group) return null;
        if (group.matchName === matchName) return group;
        if (group.numProperties) {
            var i;
            for (i = 1; i <= group.numProperties; i++) {
                try {
                    var found = walk(group.property(i));
                    if (found) return found;
                } catch (e) {}
            }
        }
        return null;
    }
    return walk(root);
};

AEAgent.findPropByName = function (root, name) {
    var lower = String(name).toLowerCase();
    function walk(group) {
        if (!group) return null;
        if (group.name && String(group.name).toLowerCase() === lower) return group;
        if (group.numProperties) {
            var i;
            for (i = 1; i <= group.numProperties; i++) {
                try {
                    var found = walk(group.property(i));
                    if (found) return found;
                } catch (e) {}
            }
        }
        return null;
    }
    return walk(root);
};

AEAgent.resolveProp = function (layer, spec) {
    if (!spec) throw new Error("Property is required.");
    var key = String(spec);
    var alias = AEAgent.PROP_ALIAS[key.toLowerCase()];
    if (alias) {
        var byAlias = AEAgent.findPropByMatch(layer, alias);
        if (byAlias) return byAlias;
    }
    if (key.indexOf("/") >= 0 || key.indexOf(".") >= 0) {
        var parts = key.replace(/\./g, "/").split("/");
        var cur = layer;
        var p;
        for (p = 0; p < parts.length; p++) {
            if (!cur) break;
            var token = parts[p];
            var next = null;
            try { next = cur.property(token); } catch (e1) { next = null; }
            if (!next) next = AEAgent.findPropByMatch(cur, token);
            if (!next) next = AEAgent.findPropByName(cur, token);
            cur = next;
        }
        if (cur) return cur;
    }
    var byMatch = AEAgent.findPropByMatch(layer, key);
    if (byMatch) return byMatch;
    var byName = AEAgent.findPropByName(layer, key);
    if (byName) return byName;
    throw new Error("Property not found: " + key + " on " + layer.name);
};

AEAgent.coerceValue = function (prop, value) {
    var current;
    try { current = prop.value; } catch (e) { return value; }
    if (typeof current === "number") {
        if (typeof value === "number") return value;
        if (value && value.length) return AEAgent.toNumber(value[0], current);
        return AEAgent.toNumber(value, current);
    }
    if (current && typeof current.length === "number") {
        var i;
        var out = [];
        if (typeof value === "number") {
            for (i = 0; i < current.length; i++) out.push(value);
            return out;
        }
        for (i = 0; i < current.length; i++) {
            if (value && value[i] !== undefined) out.push(AEAgent.toNumber(value[i], current[i]));
            else out.push(current[i]);
        }
        return out;
    }
    return value;
};

AEAgent.effectMatch = function (name) {
    if (!name) throw new Error("Effect name is required.");
    var key = String(name).toLowerCase();
    if (AEAgent.EFFECT_ALIAS[key]) return AEAgent.EFFECT_ALIAS[key];
    return name;
};

AEAgent.Scene.layerInfo = function (layer, time) {
    var t = (typeof time === "number") ? time : layer.containingComp.time;
    var info = {
        name: layer.name,
        index: layer.index,
        type: AEAgent.layerTypeName(layer),
        enabled: layer.enabled,
        threeD: !!(layer.threeDLayer || layer instanceof CameraLayer || layer instanceof LightLayer),
        selected: layer.selected,
        inPoint: layer.inPoint,
        outPoint: layer.outPoint,
        startTime: layer.startTime,
        parent: layer.parent ? layer.parent.name : null
    };
    try {
        var pos = AEAgent.getPosition(layer).valueAtTime(t, false);
        info.position = AEAgent.serializeValue(pos);
    } catch (e1) {}
    try {
        var sc = AEAgent.getTransform(layer).property("ADBE Scale").valueAtTime(t, false);
        info.scale = AEAgent.serializeValue(sc);
    } catch (e2) {}
    try {
        info.opacity = AEAgent.getTransform(layer).property("ADBE Opacity").valueAtTime(t, false);
    } catch (e3) {}
    try {
        info.rotation = AEAgent.getTransform(layer).property("ADBE Rotate Z").valueAtTime(t, false);
    } catch (e4) {}
    var effects = [];
    try {
        var parade = layer.property("ADBE Effect Parade");
        var ei;
        if (parade) {
            for (ei = 1; ei <= parade.numProperties; ei++) {
                effects.push(parade.property(ei).name);
            }
        }
    } catch (e5) {}
    info.effects = effects;
    if (layer instanceof TextLayer) {
        try {
            info.text = layer.property("ADBE Text Properties").property("ADBE Text Document").value.text;
        } catch (e6) {}
    }
    return info;
};

AEAgent.Scene.snapshot = function (comp) {
    var layers = [];
    var i;
    var max = Math.min(comp.numLayers, 40);
    for (i = 1; i <= max; i++) {
        layers.push(AEAgent.Scene.layerInfo(comp.layer(i), comp.time));
    }
    var selected = [];
    for (i = 0; i < comp.selectedLayers.length; i++) {
        selected.push(comp.selectedLayers[i].name);
    }
    var cameras = [];
    for (i = 1; i <= comp.numLayers; i++) {
        if (comp.layer(i) instanceof CameraLayer) {
            cameras.push(AEAgent.Camera.info(comp.layer(i), comp.time));
        }
    }
    return {
        project: app.project.file ? app.project.file.name : "untitled",
        comp: {
            name: comp.name,
            width: comp.width,
            height: comp.height,
            duration: comp.duration,
            frameRate: comp.frameRate,
            time: comp.time,
            workAreaStart: comp.workAreaStart,
            workAreaDuration: comp.workAreaDuration,
            numLayers: comp.numLayers,
            bgColor: AEAgent.serializeValue(comp.bgColor)
        },
        selected: selected,
        cameras: cameras,
        layers: layers
    };
};

AEAgent.Scene.createLayer = function (comp, opts) {
    opts = opts || {};
    var type = String(opts.type || "solid").toLowerCase();
    var layer = null;
    var name = opts.name || "";
    var color = AEAgent.color01(opts.color, [1, 1, 1]);
    var w = AEAgent.toNumber(opts.width, comp.width);
    var h = AEAgent.toNumber(opts.height, comp.height);

    if (type === "text" || type === "title") {
        layer = comp.layers.addText(opts.text || name || "Text");
        if (opts.text || opts.fontSize || opts.fillColor) {
            AEAgent.Scene.setText(layer, opts);
        }
    } else if (type === "null" || type === "null object") {
        layer = comp.layers.addNull();
    } else if (type === "adjustment" || type === "adj") {
        layer = comp.layers.addSolid([1, 1, 1], name || "Adjustment Layer", w, h, 1);
        layer.adjustmentLayer = true;
    } else if (type === "shape" || type === "rectangle" || type === "square") {
        layer = comp.layers.addShape();
        var contents = layer.property("ADBE Root Vectors Group");
        var rect = contents.addProperty("ADBE Vector Shape - Rect");
        try {
            rect.property("ADBE Vector Rect Size").setValue([AEAgent.toNumber(opts.sizeX, 400), AEAgent.toNumber(opts.sizeY, 400)]);
        } catch (eRect) {}
        var fill = contents.addProperty("ADBE Vector Graphic - Fill");
        try {
            fill.property("ADBE Vector Fill Color").setValue(color);
        } catch (eFill) {}
    } else if (type === "light") {
        var lt = LightType.POINT;
        var tname = String(opts.lightType || opts.kind || "point").toLowerCase();
        if (tname === "spot") lt = LightType.SPOT;
        else if (tname === "parallel" || tname === "infinite") lt = LightType.PARALLEL;
        else if (tname === "ambient") lt = LightType.AMBIENT;
        layer = comp.layers.addLight(name || "Light", [comp.width / 2, comp.height / 2]);
        try { layer.lightType = lt; } catch (eL) {}
    } else if (type === "camera") {
        layer = AEAgent.Camera.ensure(comp, name || "AI Camera");
    } else {
        layer = comp.layers.addSolid(color, name || "Solid", w, h, 1);
    }

    if (name && type !== "camera") layer.name = name;
    if (opts.threeD) AEAgent.ensure3D(layer);
    if (opts.position) {
        try { AEAgent.getPosition(layer).setValue(AEAgent.coerceValue(AEAgent.getPosition(layer), opts.position)); } catch (eP) {}
    }
    if (opts.scale !== undefined) {
        try {
            var sp = AEAgent.getTransform(layer).property("ADBE Scale");
            sp.setValue(AEAgent.coerceValue(sp, opts.scale));
        } catch (eS) {}
    }
    if (opts.opacity !== undefined) {
        try { AEAgent.getTransform(layer).property("ADBE Opacity").setValue(AEAgent.toNumber(opts.opacity, 100)); } catch (eO) {}
    }
    if (opts.rotation !== undefined) {
        try { AEAgent.getTransform(layer).property("ADBE Rotate Z").setValue(AEAgent.toNumber(opts.rotation, 0)); } catch (eR) {}
    }
    if (opts.parent) {
        try { layer.parent = AEAgent.resolveLayer(comp, opts.parent); } catch (ePar) {}
    }
    layer.selected = true;
    return AEAgent.Scene.layerInfo(layer, comp.time);
};

AEAgent.Scene.setLayer = function (layer, opts) {
    opts = opts || {};
    if (opts.name) layer.name = String(opts.name);
    if (opts.comment !== undefined) layer.comment = String(opts.comment);
    if (opts.enabled !== undefined) layer.enabled = !!opts.enabled;
    if (opts.solo !== undefined) layer.solo = !!opts.solo;
    if (opts.shy !== undefined) layer.shy = !!opts.shy;
    if (opts.locked !== undefined) layer.locked = !!opts.locked;
    if (opts.threeD !== undefined && !(layer instanceof CameraLayer) && !(layer instanceof LightLayer)) {
        layer.threeDLayer = !!opts.threeD;
    }
    if (opts.adjustment !== undefined) layer.adjustmentLayer = !!opts.adjustment;
    if (opts.collapse !== undefined) {
        try { layer.collapseTransformation = !!opts.collapse; } catch (eC) {}
    }
    if (opts.inPoint !== undefined) layer.inPoint = AEAgent.toNumber(opts.inPoint, layer.inPoint);
    if (opts.outPoint !== undefined) layer.outPoint = AEAgent.toNumber(opts.outPoint, layer.outPoint);
    if (opts.startTime !== undefined) layer.startTime = AEAgent.toNumber(opts.startTime, layer.startTime);
    if (opts.label !== undefined) layer.label = AEAgent.toNumber(opts.label, layer.label);
    if (opts.parent === null) layer.parent = null;
    else if (opts.parent) layer.parent = AEAgent.resolveLayer(layer.containingComp, opts.parent);
    if (opts.position) {
        AEAgent.getPosition(layer).setValue(AEAgent.coerceValue(AEAgent.getPosition(layer), opts.position));
    }
    if (opts.scale !== undefined) {
        var sp = AEAgent.getTransform(layer).property("ADBE Scale");
        sp.setValue(AEAgent.coerceValue(sp, opts.scale));
    }
    if (opts.opacity !== undefined) {
        AEAgent.getTransform(layer).property("ADBE Opacity").setValue(AEAgent.clamp(AEAgent.toNumber(opts.opacity, 100), 0, 100));
    }
    if (opts.rotation !== undefined) {
        AEAgent.getTransform(layer).property("ADBE Rotate Z").setValue(AEAgent.toNumber(opts.rotation, 0));
    }
    if (opts.anchor) {
        var ap = AEAgent.getTransform(layer).property("ADBE Anchor Point");
        ap.setValue(AEAgent.coerceValue(ap, opts.anchor));
    }
    if (opts.index) {
        var idx = AEAgent.toNumber(opts.index, layer.index);
        if (idx <= 1) layer.moveToBeginning();
        else if (idx >= layer.containingComp.numLayers) layer.moveToEnd();
        else layer.moveAfter(layer.containingComp.layer(idx));
    }
    return AEAgent.Scene.layerInfo(layer, layer.containingComp.time);
};

AEAgent.Scene.select = function (comp, opts) {
    opts = opts || {};
    var exclusive = opts.exclusive !== false;
    var i;
    if (exclusive) {
        for (i = 1; i <= comp.numLayers; i++) comp.layer(i).selected = false;
    }
    var layers = AEAgent.resolveLayers(comp, opts.layer || opts.name || opts.layers);
    for (i = 0; i < layers.length; i++) layers[i].selected = true;
    var names = [];
    for (i = 0; i < layers.length; i++) names.push(layers[i].name);
    return { selected: names };
};

AEAgent.Scene.duplicate = function (comp, opts) {
    var layer = AEAgent.resolveLayer(comp, opts && opts.layer);
    var copy = layer.duplicate();
    if (opts && opts.name) copy.name = String(opts.name);
    copy.selected = true;
    return AEAgent.Scene.layerInfo(copy, comp.time);
};

AEAgent.Scene.setText = function (layer, opts) {
    opts = opts || {};
    if (!(layer instanceof TextLayer)) {
        throw new Error("Layer is not a text layer: " + layer.name);
    }
    var textProp = layer.property("ADBE Text Properties").property("ADBE Text Document");
    var doc = textProp.value;
    if (opts.text !== undefined) doc.text = String(opts.text);
    if (opts.fontSize !== undefined) doc.fontSize = AEAgent.toNumber(opts.fontSize, doc.fontSize);
    if (opts.fillColor) {
        doc.applyFill = true;
        doc.fillColor = AEAgent.color01(opts.fillColor, doc.fillColor);
    }
    if (opts.strokeColor) {
        doc.applyStroke = true;
        doc.strokeColor = AEAgent.color01(opts.strokeColor, [0, 0, 0]);
    }
    if (opts.strokeWidth !== undefined) doc.strokeWidth = AEAgent.toNumber(opts.strokeWidth, 2);
    if (opts.font) {
        try { doc.font = String(opts.font); } catch (eF) {}
    }
    if (opts.justification || opts.align) {
        var just = String(opts.justification || opts.align).toLowerCase();
        if (just === "center") doc.justification = ParagraphJustification.CENTER_JUSTIFY;
        else if (just === "right") doc.justification = ParagraphJustification.RIGHT_JUSTIFY;
        else if (just === "left") doc.justification = ParagraphJustification.LEFT_JUSTIFY;
    }
    textProp.setValue(doc);
    return { name: layer.name, text: doc.text, fontSize: doc.fontSize };
};

AEAgent.Scene.animate = function (layer, opts) {
    opts = opts || {};
    var prop = AEAgent.resolveProp(layer, opts.prop || opts.property);
    var comp = layer.containingComp;
    var t0 = AEAgent.resolveTime(comp, opts.start);
    var duration = AEAgent.toNumber(opts.duration, 0);
    var t1 = t0 + Math.max(duration, 0);
    var fromVal = (opts.from !== undefined) ? AEAgent.coerceValue(prop, opts.from) : prop.valueAtTime(t0, false);
    var toVal = (opts.to !== undefined) ? AEAgent.coerceValue(prop, opts.to) : fromVal;
    if (duration <= 0 && opts.to !== undefined) {
        prop.setValue(toVal);
        return { layer: layer.name, prop: prop.name, value: AEAgent.serializeValue(toVal) };
    }
    AEAgent.setOrAddKey(prop, t0, fromVal);
    if (opts.to !== undefined) AEAgent.setOrAddKey(prop, t1, toVal);
    if (prop.numKeys >= 2) {
        AEAgent.Camera.applyEasePair(prop, t0, t1, opts.ease || "easeInOut", opts.influence || 80);
    }
    return {
        layer: layer.name,
        prop: prop.name,
        from: AEAgent.serializeValue(fromVal),
        to: AEAgent.serializeValue(toVal),
        start: t0,
        duration: duration
    };
};

AEAgent.Scene.setProp = function (layer, opts) {
    opts = opts || {};
    var prop = AEAgent.resolveProp(layer, opts.prop || opts.property);
    var value = AEAgent.coerceValue(prop, opts.value);
    var time = opts.time;
    if (time !== undefined && time !== null && time !== "now") {
        var t = AEAgent.resolveTime(layer.containingComp, time);
        AEAgent.setOrAddKey(prop, t, value);
    } else {
        prop.setValue(value);
    }
    return { layer: layer.name, prop: prop.name, value: AEAgent.serializeValue(value) };
};

AEAgent.Scene.setExpression = function (layer, opts) {
    opts = opts || {};
    var prop = AEAgent.resolveProp(layer, opts.prop || opts.property);
    if (!prop.canSetExpression) throw new Error("This property cannot take an expression.");
    var expr = String(opts.expression || opts.value || "");
    var lower = expr.toLowerCase();
    if (lower.indexOf("system.callsystem") >= 0 || lower.indexOf("$.evalfile") >= 0) {
        throw new Error("That expression is blocked.");
    }
    prop.expression = expr;
    prop.expressionEnabled = opts.enabled !== false && prop.expression !== "";
    return { layer: layer.name, prop: prop.name, expression: prop.expression };
};

AEAgent.Scene.addEffect = function (layer, opts) {
    opts = opts || {};
    var match = AEAgent.effectMatch(opts.matchName || opts.effect || opts.name);
    var parade = layer.property("ADBE Effect Parade");
    if (!parade) throw new Error("Cannot add effects to " + layer.name);
    var fx = parade.addProperty(match);
    if (opts.rename) fx.name = String(opts.rename);
    if (opts.values) {
        var key;
        for (key in opts.values) {
            if (opts.values.hasOwnProperty(key)) {
                var p = null;
                try { p = fx.property(key); } catch (e1) { p = null; }
                if (!p) p = AEAgent.findPropByName(fx, key);
                if (p) {
                    try { p.setValue(AEAgent.coerceValue(p, opts.values[key])); } catch (e2) {}
                }
            }
        }
    }
    return { layer: layer.name, effect: fx.name, matchName: fx.matchName };
};

AEAgent.Scene.setEffect = function (layer, opts) {
    opts = opts || {};
    var parade = layer.property("ADBE Effect Parade");
    if (!parade) throw new Error("No effects on " + layer.name);
    var fx = null;
    var i;
    var want = String(opts.effect || opts.name || "");
    for (i = 1; i <= parade.numProperties; i++) {
        if (parade.property(i).name === want || parade.property(i).matchName === want) {
            fx = parade.property(i);
            break;
        }
    }
    if (!fx) {
        var lower = want.toLowerCase();
        for (i = 1; i <= parade.numProperties; i++) {
            if (String(parade.property(i).name).toLowerCase() === lower) {
                fx = parade.property(i);
                break;
            }
        }
    }
    if (!fx) throw new Error("Effect not found: " + want);
    if (opts.enabled !== undefined) fx.enabled = !!opts.enabled;
    if (opts.values) {
        var key;
        for (key in opts.values) {
            if (opts.values.hasOwnProperty(key)) {
                var p = null;
                try { p = fx.property(key); } catch (e1) { p = null; }
                if (!p) p = AEAgent.findPropByName(fx, key);
                if (p) p.setValue(AEAgent.coerceValue(p, opts.values[key]));
            }
        }
    }
    return { layer: layer.name, effect: fx.name };
};

AEAgent.Scene.fade = function (layer, opts) {
    opts = opts || {};
    var kind = String(opts.type || opts.mode || "in").toLowerCase();
    var duration = Math.max(AEAgent.toNumber(opts.duration, 0.6), 0.05);
    var opacity = AEAgent.getTransform(layer).property("ADBE Opacity");
    var tIn = layer.inPoint;
    var tOut = layer.outPoint;
    var peak = AEAgent.toNumber(opts.opacity, 100);
    if (kind === "in" || kind === "inout" || kind === "inOut") {
        AEAgent.setOrAddKey(opacity, tIn, 0);
        AEAgent.setOrAddKey(opacity, tIn + duration, peak);
        AEAgent.Camera.applyEasePair(opacity, tIn, tIn + duration, "easeOut", 80);
    }
    if (kind === "out" || kind === "inout" || kind === "inOut") {
        AEAgent.setOrAddKey(opacity, tOut - duration, peak);
        AEAgent.setOrAddKey(opacity, tOut, 0);
        AEAgent.Camera.applyEasePair(opacity, tOut - duration, tOut, "easeIn", 80);
    }
    return { layer: layer.name, type: kind, duration: duration };
};

AEAgent.Scene.addMarker = function (comp, opts) {
    opts = opts || {};
    var time = AEAgent.resolveTime(comp, opts.time);
    var mv = new MarkerValue(String(opts.comment || opts.name || "Marker"));
    if (opts.duration) mv.duration = AEAgent.toNumber(opts.duration, 0);
    if (opts.layer && opts.layer !== "comp") {
        var layer = AEAgent.resolveLayer(comp, opts.layer);
        layer.property("ADBE Marker").setValueAtTime(time, mv);
        return { layer: layer.name, time: time, comment: mv.comment };
    }
    comp.markerProperty.setValueAtTime(time, mv);
    return { layer: "comp", time: time, comment: mv.comment };
};

AEAgent.Scene.setComp = function (comp, opts) {
    opts = opts || {};
    if (opts.name) comp.name = String(opts.name);
    if (opts.duration) comp.duration = Math.max(AEAgent.toNumber(opts.duration, comp.duration), 0.04);
    if (opts.frameRate) comp.frameRate = AEAgent.toNumber(opts.frameRate, comp.frameRate);
    if (opts.width || opts.height) {
        throw new Error("Changing comp size is not supported from the agent. Create a new composition instead.");
    }
    if (opts.bgColor) comp.bgColor = AEAgent.color01(opts.bgColor, comp.bgColor);
    if (opts.workAreaStart !== undefined || opts.workAreaDuration !== undefined) {
        if (opts.workAreaStart !== undefined) comp.workAreaStart = AEAgent.toNumber(opts.workAreaStart, 0);
        if (opts.workAreaDuration !== undefined) comp.workAreaDuration = AEAgent.toNumber(opts.workAreaDuration, comp.duration);
    }
    return AEAgent.Scene.snapshot(comp).comp;
};

AEAgent.Scene.createComp = function (opts) {
    opts = opts || {};
    var name = opts.name || "AI Comp";
    var w = AEAgent.toNumber(opts.width, 1920);
    var h = AEAgent.toNumber(opts.height, 1080);
    var dur = AEAgent.toNumber(opts.duration, 10);
    var fps = AEAgent.toNumber(opts.frameRate, 30);
    var comp = app.project.items.addComp(name, w, h, 1, dur, fps);
    if (opts.bgColor) comp.bgColor = AEAgent.color01(opts.bgColor, [0, 0, 0]);
    comp.openInViewer();
    return AEAgent.Scene.snapshot(comp).comp;
};

AEAgent.Scene.precompose = function (comp, opts) {
    opts = opts || {};
    var layers = AEAgent.resolveLayers(comp, opts.layer || "selectedAll");
    var indices = [];
    var i;
    for (i = 0; i < layers.length; i++) indices.push(layers[i].index);
    indices.sort(function (a, b) { return a - b; });
    var name = opts.name || "Precomp";
    var move = opts.moveAllAttributes !== false;
    comp.layers.precompose(indices, name, move);
    return { name: name, layers: indices.length };
};
