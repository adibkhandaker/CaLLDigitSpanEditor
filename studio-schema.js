/********************************************
 * Digit Span Studio — what kids are allowed to change.
 * Shared by the editor (studio.js) and the game (studio-bridge.js).
 * To add a new editable setting: add it here, then style it in
 * studio-overrides.css (cssVar) or read it in game.js (studioVar).
 ********************************************/

var STUDIO_SCHEMA = {
  monster: {
    name:        { type: "text",   default: "Cortex",  maxLength: 16, cssVar: "--monster-name", help: "The monster's name" },
    color:       { type: "color",  default: "#E7A562", cssVar: "--monster-color",  help: "Body, arms and legs" },
    hatColor:    { type: "color",  default: "#A562E7", cssVar: "--hat-color",      help: "Party hat" },
    pomPomColor: { type: "color",  default: "#62E7A5", cssVar: "--pompom-color",   help: "Ball on top of the hat" },
    eyeColor:    { type: "color",  default: "white",   cssVar: "--eye-color",      help: "Whites of the eyes" },
    pupilColor:  { type: "color",  default: "#4F4747", cssVar: "--pupil-color",    help: "Middle of the eyes" },
    tongueColor: { type: "color",  default: "#FF5858", cssVar: "--tongue-color",   help: "Tongue" },
    size:        { type: "number", default: 1, min: 0.5, max: 1.6, cssVar: "--monster-size", help: "How big the monster is" },
  },
  numbers: {
    color: { type: "color",  default: "black", cssVar: "--number-color", help: "Color of the numbers you remember" },
    size:  { type: "number", default: 100, min: 40, max: 160, unit: "px", cssVar: "--number-size", help: "How big the numbers are" },
    speed: { type: "number", default: 500, min: 200, max: 2000, studioVar: "numberSpeed", help: "How long each number shows (1000 = 1 second)" },
  },
  buttons: {
    color:     { type: "color", default: "#A6A6A6", cssVar: "--button-color",      help: "Number buttons" },
    textColor: { type: "color", default: "#F0F0F0", cssVar: "--button-text-color", help: "Numbers on the buttons" },
  },
  room: {
    wallColor:   { type: "color",   default: "#F7EDE3", cssVar: "--wall-color", help: "Background" },
    floorColor:  { type: "color",   default: "rgba(242, 228, 214, 0.82)", cssVar: "--floor-fill", help: "Floor" },
    showKitchen: { type: "boolean", default: true, cssVar: "--kitchen-visibility", toCss: function (v) { return v ? "visible" : "hidden"; }, help: "Show the kitchen? true or false" },
  },
};

// Returns a clean value for one setting, or null if it isn't allowed.
function studioCheckValue(spec, value) {
  if (spec.type === "color") {
    return typeof value === "string" && CSS.supports("color", value) ? value : null;
  }
  if (spec.type === "number") {
    return typeof value === "number" && isFinite(value) && value >= spec.min && value <= spec.max ? value : null;
  }
  if (spec.type === "boolean") {
    return typeof value === "boolean" ? value : null;
  }
  if (spec.type === "text") {
    return typeof value === "string" && value.length <= spec.maxLength ? value : null;
  }
  return null;
}

// Every setting at its default value: { "monster.color": "#E7A562", ... }
function studioDefaults() {
  var out = {};
  Object.keys(STUDIO_SCHEMA).forEach(function (obj) {
    Object.keys(STUDIO_SCHEMA[obj]).forEach(function (prop) {
      out[obj + "." + prop] = STUDIO_SCHEMA[obj][prop].default;
    });
  });
  return out;
}
