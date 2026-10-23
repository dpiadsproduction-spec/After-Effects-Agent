/* AE Motion Agent — Camera & cinematic moves */

if (typeof AEAgent === "undefined") {
    AEAgent = {};
}

AEAgent.Camera = {};

AEAgent.Camera.find = function (comp, name) {
    var i;
    var layer;
    if (name) {
        for (i = 1; i <= comp.numLayers; i++) {
            layer = comp.layer(i);
            if (layer instanceof CameraLayer && layer.name === name) {
                return layer;
            }
        }
    }
    for (i = 0; i < comp.selectedLayers.length; i++) {
        layer = comp.selectedLayers[i];
        if (layer instanceof CameraLayer) return layer;
    }
    for (i = 1; i <= comp.numLayers; i++) {
        layer = comp.layer(i);
        if (layer instanceof CameraLayer && layer.enabled) return layer;
    }
    for (i = 1; i <= comp.numLayers; i++) {
        layer = comp.layer(i);
        if (layer instanceof CameraLayer) return layer;
    }
    return null;
};

AEAgent.Camera.ensure = function (comp, name) {
    var cam = AEAgent.Camera.find(comp, name);
    if (cam) return cam;
    var camName = name || "AI Camera";
    cam = comp.layers.addCamera(camName, [comp.width / 2, comp.height / 2]);
    var pos = AEAgent.getPosition(cam);
    var poi = AEAgent.getPOI(cam);
    var z = Math.max(comp.width, 1200);
    pos.setValue([comp.width / 2, comp.height / 2, -z]);
    poi.setValue([comp.width / 2, comp.height / 2, 0]);
    return cam;
};

AEAgent.Camera.info = function (cam, time) {
    var t = (typeof time === "number") ? time : cam.containingComp.time;
    var pos = AEAgent.getPosition(cam).valueAtTime(t, false);
    var poi = AEAgent.getPOI(cam).valueAtTime(t, false);
    var zoom = AEAgent.getZoom(cam).valueAtTime(t, false);
    var orient = AEAgent.getOrientation(cam).valueAtTime(t, false);
    return {
        name: cam.name,
        index: cam.index,
        time: t,
        position: [pos[0], pos[1], pos[2]],
        poi: [poi[0], poi[1], poi[2]],
        zoom: zoom,
        orientation: [orient[0], orient[1], orient[2]]
    };
};

AEAgent.Camera.applyEasePair = function (prop, t0, t1, ease, influence) {
    var i0 = prop.nearestKeyIndex(t0);
    var i1 = prop.nearestKeyIndex(t1);
    var mode = ease || "easeInOut";
    var inf = AEAgent.toNumber(influence, 80);
    AEAgent.applyEaseToKey(prop, i0, mode === "easeIn" ? "easeOut" : mode, inf, inf, 0, 0);
    AEAgent.applyEaseToKey(prop, i1, mode === "easeOut" ? "easeIn" : mode, inf, inf, 0, 0);
};

AEAgent.Camera.set = function (cam, opts) {
    var t = cam.containingComp.time;
    if (opts.position) {
        AEAgent.getPosition(cam).setValue(AEAgent.toArray3(opts.position, AEAgent.getPosition(cam).value));
    }
    if (opts.poi) {
        AEAgent.getPOI(cam).setValue(AEAgent.toArray3(opts.poi, AEAgent.getPOI(cam).value));
    }
    if (typeof opts.zoom === "number") {
        AEAgent.getZoom(cam).setValue(opts.zoom);
    }
    if (typeof opts.focalLength === "number") {
        var zoomProp = AEAgent.getZoom(cam);
        var currentZoom = zoomProp.value;
        var filmSize = 36;
        var newZoom = cam.containingComp.width * (opts.focalLength / filmSize);
        if (newZoom > 1) zoomProp.setValue(newZoom);
        else zoomProp.setValue(currentZoom);
    }
    if (opts.orientation) {
        AEAgent.getOrientation(cam).setValue(AEAgent.toArray3(opts.orientation, AEAgent.getOrientation(cam).value));
    }
    return AEAgent.Camera.info(cam, t);
};

AEAgent.Camera.dolly = function (cam, opts) {
    var comp = cam.containingComp;
    var t0 = comp.time;
    var duration = Math.max(AEAgent.toNumber(opts.duration, 2), 0.05);
    var t1 = t0 + duration;
    var distance = AEAgent.toNumber(opts.distance, 400);
    var posProp = AEAgent.getPosition(cam);
    var poiProp = AEAgent.getPOI(cam);
    var p0 = posProp.valueAtTime(t0, false);
    var poi = poiProp.valueAtTime(t0, false);
    var dir = AEAgent.norm3(AEAgent.sub3(poi, p0));
    if (AEAgent.len3(dir) < 0.0001) dir = [0, 0, 1];
    var p1 = AEAgent.add3(p0, AEAgent.scale3(dir, distance));
    AEAgent.setOrAddKey(posProp, t0, p0);
    AEAgent.setOrAddKey(posProp, t1, p1);
    AEAgent.Camera.applyEasePair(posProp, t0, t1, opts.ease, opts.influence);
    return {
        from: p0,
        to: p1,
        duration: duration
    };
};

AEAgent.Camera.pan = function (cam, opts) {
    var comp = cam.containingComp;
    var t0 = comp.time;
    var duration = Math.max(AEAgent.toNumber(opts.duration, 2), 0.05);
    var t1 = t0 + duration;
    var yaw = AEAgent.toNumber(opts.yaw, 20);
    var pitch = AEAgent.toNumber(opts.pitch, 0);
    var posProp = AEAgent.getPosition(cam);
    var poiProp = AEAgent.getPOI(cam);
    var p0 = posProp.valueAtTime(t0, false);
    var poi0 = poiProp.valueAtTime(t0, false);
    var look = AEAgent.sub3(poi0, p0);
    var dist = AEAgent.len3(look);
    if (dist < 1) dist = 1000;
    var look1 = AEAgent.rotateY(look, yaw);
    if (pitch !== 0) {
        var right = AEAgent.norm3(AEAgent.cross3([0, 1, 0], look1));
        if (AEAgent.len3(right) < 0.0001) right = [1, 0, 0];
        look1 = AEAgent.rotateAroundAxis(look1, right, pitch);
    }
    var poi1 = AEAgent.add3(p0, look1);
    AEAgent.setOrAddKey(poiProp, t0, poi0);
    AEAgent.setOrAddKey(poiProp, t1, poi1);
    AEAgent.Camera.applyEasePair(poiProp, t0, t1, opts.ease, opts.influence);
    return {
        from: poi0,
        to: poi1,
        yaw: yaw,
        pitch: pitch,
        duration: duration
    };
};

AEAgent.Camera.orbit = function (cam, opts) {
    var comp = cam.containingComp;
    var t0 = comp.time;
    var duration = Math.max(AEAgent.toNumber(opts.duration, 3), 0.05);
    var t1 = t0 + duration;
    var yaw = AEAgent.toNumber(opts.yaw, 45);
    var pitch = AEAgent.toNumber(opts.pitch, 0);
    var posProp = AEAgent.getPosition(cam);
    var poiProp = AEAgent.getPOI(cam);
    var p0 = posProp.valueAtTime(t0, false);
    var poi = poiProp.valueAtTime(t0, false);
    var rel = AEAgent.sub3(p0, poi);
    var rel1 = AEAgent.rotateY(rel, yaw);
    if (pitch !== 0) {
        var right = AEAgent.norm3(AEAgent.cross3([0, 1, 0], rel1));
        if (AEAgent.len3(right) < 0.0001) right = [1, 0, 0];
        rel1 = AEAgent.rotateAroundAxis(rel1, right, pitch);
    }
    var p1 = AEAgent.add3(poi, rel1);
    AEAgent.setOrAddKey(posProp, t0, p0);
    AEAgent.setOrAddKey(posProp, t1, p1);
    AEAgent.Camera.applyEasePair(posProp, t0, t1, opts.ease, opts.influence);
    if (opts.keepDistance === false) {
        return { from: p0, to: p1, duration: duration };
    }
    AEAgent.setOrAddKey(poiProp, t0, poi);
    AEAgent.setOrAddKey(poiProp, t1, poi);
    return {
        from: p0,
        to: p1,
        center: poi,
        yaw: yaw,
        pitch: pitch,
        duration: duration
    };
};

AEAgent.Camera.dollyZoom = function (cam, opts) {
    var comp = cam.containingComp;
    var t0 = comp.time;
    var duration = Math.max(AEAgent.toNumber(opts.duration, 3), 0.05);
    var t1 = t0 + duration;
    var distance = AEAgent.toNumber(opts.distance, 300);
    var posProp = AEAgent.getPosition(cam);
    var poiProp = AEAgent.getPOI(cam);
    var zoomProp = AEAgent.getZoom(cam);
    var p0 = posProp.valueAtTime(t0, false);
    var poi = poiProp.valueAtTime(t0, false);
    var z0 = zoomProp.valueAtTime(t0, false);
    var dir = AEAgent.norm3(AEAgent.sub3(poi, p0));
    if (AEAgent.len3(dir) < 0.0001) dir = [0, 0, 1];
    var d0 = AEAgent.len3(AEAgent.sub3(poi, p0));
    if (d0 < 10) d0 = 10;
    var p1 = AEAgent.add3(p0, AEAgent.scale3(dir, distance));
    var d1 = AEAgent.len3(AEAgent.sub3(poi, p1));
    if (d1 < 10) d1 = 10;
    var z1 = z0 * (d1 / d0);
    AEAgent.setOrAddKey(posProp, t0, p0);
    AEAgent.setOrAddKey(posProp, t1, p1);
    AEAgent.setOrAddKey(zoomProp, t0, z0);
    AEAgent.setOrAddKey(zoomProp, t1, z1);
    AEAgent.Camera.applyEasePair(posProp, t0, t1, opts.ease, opts.influence);
    AEAgent.Camera.applyEasePair(zoomProp, t0, t1, opts.ease, opts.influence);
    return {
        from: p0,
        to: p1,
        zoomFrom: z0,
        zoomTo: z1,
        duration: duration
    };
};

AEAgent.Camera.lookAtSelected = function (cam, opts) {
    var comp = cam.containingComp;
    var target = null;
    var i;
    for (i = 0; i < comp.selectedLayers.length; i++) {
        if (comp.selectedLayers[i] !== cam) {
            target = comp.selectedLayers[i];
            break;
        }
    }
    if (!target) throw new Error("Select a layer for the camera to look at.");
    AEAgent.ensure3D(target);
    var t0 = comp.time;
    var duration = Math.max(AEAgent.toNumber(opts.duration, 1.5), 0.05);
    var t1 = t0 + duration;
    var poiProp = AEAgent.getPOI(cam);
    var poi0 = poiProp.valueAtTime(t0, false);
    var world = AEAgent.layerWorldPos(target, t1);
    AEAgent.setOrAddKey(poiProp, t0, poi0);
    AEAgent.setOrAddKey(poiProp, t1, world);
    AEAgent.Camera.applyEasePair(poiProp, t0, t1, opts.ease, opts.influence);
    return {
        target: target.name,
        from: poi0,
        to: world,
        duration: duration
    };
};
