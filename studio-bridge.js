/********************************************
 * Digit Span Studio — game-side bridge.
 * Receives settings from the editor (parent window) and applies them live
 * without restarting the game. Values are re-checked against STUDIO_SCHEMA,
 * so only the settings listed there can ever change.
 ********************************************/

// Settings game.js reads directly (anything with `studioVar` in the schema)
var studio = { numberSpeed: STUDIO_SCHEMA.numbers.speed.default };

function applyStudioSettings(settings) {
  var root = document.documentElement;
  Object.keys(STUDIO_SCHEMA).forEach(function (obj) {
    Object.keys(STUDIO_SCHEMA[obj]).forEach(function (prop) {
      var spec = STUDIO_SCHEMA[obj][prop];
      var key = obj + "." + prop;
      var value = key in settings ? studioCheckValue(spec, settings[key]) : null;
      if (value === null) value = spec.default;

      if (spec.studioVar) studio[spec.studioVar] = value;
      if (spec.cssVar) {
        var cssValue;
        if (spec.toCss) cssValue = spec.toCss(value);
        else if (spec.type === "text") cssValue = JSON.stringify(value); // quoted for `content:`
        else if (spec.unit) cssValue = value + spec.unit;
        else cssValue = String(value);
        root.style.setProperty(spec.cssVar, cssValue);
      }
    });
  });
}

window.addEventListener("message", function (event) {
  if (event.source !== window.parent) return;
  var msg = event.data;
  if (msg && msg.type === "studio-settings" && msg.settings) {
    applyStudioSettings(msg.settings);
  }
});

// Tell the editor we're ready so it can send the current code's settings
if (window.parent !== window) {
  window.parent.postMessage({ type: "studio-ready" }, "*");
}
