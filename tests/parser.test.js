var fs = require("fs");
var vm = require("vm");
var path = require("path");

var code = fs.readFileSync(path.join(__dirname, "../cep/com.aeagent.panel/js/parser.js"), "utf8");
var ctx = {};
vm.createContext(ctx);
vm.runInContext(code, ctx);
var Parser = ctx.Parser;

function assert(cond, msg) {
    if (!cond) throw new Error(msg);
}

var slow = Parser.plan("اجعل حركة الكاميرا هذه ناعمة وبطيئة في النهاية");
assert(slow.ok, "slow end should parse");
assert(slow.commands[0].op === "ease.apply", "expected ease.apply");
assert(slow.commands[0].mode === "easeIn", "slow end -> easeIn");

var look = Parser.plan("حرك الكاميرا نحو الطبقة المحددة");
assert(look.ok, "look at should parse");
assert(look.commands[0].op === "camera.lookAtSelected", "expected lookAtSelected");

var orbit = Parser.plan("Create a 3 second orbit around the point of interest");
assert(orbit.commands[0].op === "camera.orbit", "expected orbit");

var dz = Parser.plan("Dolly zoom Hitchcock effect, 3 seconds");
assert(dz.commands[0].op === "camera.dollyZoom", "expected dollyZoom");

var pan = Parser.plan("Pan the camera 25 degrees to the right");
assert(pan.commands[0].op === "camera.pan", "expected pan");

var title = Parser.plan('Create a white title that says "Hello" and fade it in');
assert(title.ok, "title should parse");
assert(title.commands[0].op === "layer.create", "expected layer.create");
assert(title.commands[0].type === "text", "expected text layer");
assert(title.commands[0].text === "Hello", "quoted title");
assert(title.commands[1].op === "layer.fade", "expected fade");

var blur = Parser.plan("Add gaussian blur 25 to the selected layer");
assert(blur.commands[0].op === "effect.add", "expected effect.add");

var fade = Parser.plan("Fade the selected layer in and out");
assert(fade.commands[0].op === "layer.fade", "expected layer.fade");
assert(fade.commands[0].type === "inOut", "expected inOut");

console.log("parser tests passed");
