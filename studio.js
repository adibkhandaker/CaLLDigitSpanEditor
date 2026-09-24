/********************************************
 * Digit Span Studio — editor side.
 * Kids edit simple lines like:   monster.color = "hotpink"
 * Each line is parsed (never eval'd), checked against STUDIO_SCHEMA,
 * and the valid settings are sent to the game iframe as they type.
 ********************************************/

var DEFAULT_CODE = [
  "// Welcome to Digit Span Studio!",
  "// Change the values after the = sign and watch the game change.",
  "// Words need \"quotes\". Numbers don't.",
  "",
  "// The monster",
  "monster.name = \"Cortex\"",
  "monster.color = \"#E7A562\"      // try \"skyblue\" or \"hotpink\"",
  "monster.hatColor = \"#A562E7\"",
  "monster.pomPomColor = \"#62E7A5\"",
  "monster.eyeColor = \"white\"",
  "monster.pupilColor = \"#4F4747\"",
  "monster.tongueColor = \"#FF5858\"",
  "monster.size = 1               // from 0.5 to 1.6",
  "",
  "// The numbers you remember",
  "numbers.color = \"black\"",
  "numbers.size = 100             // from 40 to 160",
  "numbers.speed = 500            // 1000 = one second",
  "",
  "// The number buttons",
  "buttons.color = \"#A6A6A6\"",
  "buttons.textColor = \"#F0F0F0\"",
  "",
  "// The room",
  "room.wallColor = \"#F7EDE3\"",
  "room.showKitchen = true",
  "",
].join("\n");

var PALETTE = [
  "red", "tomato", "orange", "gold", "yellow", "limegreen", "green", "turquoise",
  "skyblue", "dodgerblue", "blue", "purple", "orchid", "hotpink", "pink", "brown",
  "tan", "white", "gray", "black",
];

var STORAGE_KEY = "digit-span-studio:code";

var codeEl = document.getElementById("code");
var highlightEl = document.getElementById("highlight");
var gutterEl = document.getElementById("gutter");
var statusEl = document.getElementById("status");
var frame = document.getElementById("game-frame");
var liveDot = document.getElementById("live-dot");

var lastSettings = studioDefaults();

/************************************
 * 1. Tokenizer + parser
 ************************************/

// Splits one line into tokens: {type, text, start}
function tokenize(line) {
  var tokens = [];
  var i = 0;
  while (i < line.length) {
    var ch = line[i];
    var rest = line.slice(i);
    var m;
    if (rest.startsWith("//")) {
      tokens.push({ type: "comment", text: rest, start: i });
      break;
    } else if ((m = rest.match(/^\s+/))) {
      tokens.push({ type: "space", text: m[0], start: i });
    } else if (ch === '"' || ch === "'") {
      var end = line.indexOf(ch, i + 1);
      if (end === -1) {
        tokens.push({ type: "badstring", text: rest, start: i });
        break;
      }
      tokens.push({ type: "string", text: line.slice(i, end + 1), value: line.slice(i + 1, end), start: i });
      i = end + 1;
      continue;
    } else if ((m = rest.match(/^-?\d+(\.\d+)?|^-?\.\d+/))) {
      tokens.push({ type: "number", text: m[0], value: parseFloat(m[0]), start: i });
    } else if ((m = rest.match(/^[A-Za-z_]\w*/))) {
      var isBool = m[0] === "true" || m[0] === "false";
      tokens.push({ type: isBool ? "bool" : "ident", text: m[0], value: isBool ? m[0] === "true" : m[0], start: i });
    } else if (ch === "." || ch === "=" || ch === ";") {
      tokens.push({ type: ch === "." ? "dot" : ch === "=" ? "eq" : "semi", text: ch, start: i });
    } else {
      tokens.push({ type: "other", text: ch, start: i });
    }
    i += (m ? m[0].length : 1);
  }
  return tokens;
}

function editDistance(a, b) {
  var dp = [];
  for (var i = 0; i <= a.length; i++) {
    dp[i] = [i];
    for (var j = 1; j <= b.length; j++) {
      dp[i][j] = i === 0 ? j : Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[a.length][b.length];
}

// "Did you mean ...?" helper
function suggest(word, options) {
  var best = null, bestDist = Infinity;
  options.forEach(function (opt) {
    var d = opt.toLowerCase() === word.toLowerCase() ? 0 : editDistance(word.toLowerCase(), opt.toLowerCase());
    if (d < bestDist) { best = opt; bestDist = d; }
  });
  if (bestDist === 0) return ' Capital letters matter! Try "' + best + '".';
  if (bestDist <= Math.max(2, Math.floor(word.length / 3))) return ' Did you mean "' + best + '"?';
  return "";
}

function exampleFor(spec) {
  if (spec.type === "color") return '"blue"';
  if (spec.type === "number") return String(spec.default);
  if (spec.type === "boolean") return "true";
  return '"' + spec.default + '"';
}

// Returns {tokens, key?, value?, error?} for one line
function parseLine(line) {
  var tokens = tokenize(line);
  var t = tokens.filter(function (tok) { return tok.type !== "space" && tok.type !== "comment"; });
  var result = { tokens: tokens };
  if (t.length === 0) return result;

  var objects = Object.keys(STUDIO_SCHEMA);
  function fail(msg) { result.error = msg; return result; }

  if (t[0].type !== "ident") return fail('Start the line with something to change, like monster.color = "blue"');
  var obj = t[0].text;
  if (!STUDIO_SCHEMA[obj]) {
    return fail('There\'s no "' + obj + '" in this game.' + suggest(obj, objects) +
      (suggest(obj, objects) ? "" : " You can change: " + objects.join(", ") + "."));
  }
  var props = Object.keys(STUDIO_SCHEMA[obj]);
  if (!t[1] || t[1].type !== "dot" || !t[2] || t[2].type !== "ident") {
    return fail("After " + obj + ", add a dot and a setting, like " + obj + "." + props[0]);
  }
  var prop = t[2].text;
  var spec = STUDIO_SCHEMA[obj][prop];
  if (!spec) return fail(obj + ' doesn\'t have "' + prop + '".' + (suggest(prop, props) || " Try: " + props.join(", ")));
  if (!t[3] || t[3].type !== "eq") return fail("Every line needs an = sign, like " + obj + "." + prop + " = " + exampleFor(spec));

  var v = t[4];
  if (!v) return fail("What should " + obj + "." + prop + " be? Put something after the = sign.");
  if (v.type === "badstring") return fail("You're missing a closing quote \" at the end.");
  var extra = t.slice(5).filter(function (tok) { return tok.type !== "semi"; });
  if (extra.length) return fail('There\'s something extra at the end: "' + extra[0].text + '"');

  if (spec.type === "boolean") {
    if (v.type !== "bool") return fail(obj + "." + prop + " can only be true or false (no quotes).");
  } else if (spec.type === "number") {
    if (v.type === "string" && v.value.trim() !== "" && !isNaN(Number(v.value))) return fail("Numbers don't need quotes. Try " + v.value);
    if (v.type !== "number") return fail(obj + "." + prop + " needs a number, like " + spec.default);
    if (v.value < spec.min || v.value > spec.max) return fail("Pick a number from " + spec.min + " to " + spec.max + ".");
  } else {
    if (v.type === "ident") return fail('Words need quotes around them. Try "' + v.text + '"');
    if (v.type !== "string") return fail(obj + "." + prop + " needs words in quotes, like " + exampleFor(spec));
    if (spec.type === "color" && !CSS.supports("color", v.value)) {
      return fail('"' + v.value + '" isn\'t a color I know. Try "red", "hotpink", or "#FF8800".');
    }
    if (spec.type === "text" && v.value.length > spec.maxLength) return fail("That's too long! Keep it to " + spec.maxLength + " letters.");
  }

  result.key = obj + "." + prop;
  result.value = v.value;
  result.valueToken = v;
  return result;
}

/************************************
 * 2. Rendering (highlighting, gutter, status)
 ************************************/

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderTokens(parsed) {
  var nonSpace = 0;
  return parsed.tokens.map(function (tok) {
    var cls = "tok-" + tok.type;
    var style = "";
    if (tok.type !== "space" && tok.type !== "comment") {
      if (tok.type === "ident" && nonSpace === 0) cls = "tok-object";
      else if (tok.type === "ident" && nonSpace === 2) cls = "tok-prop";
      nonSpace++;
    }
    // Color strings get an underline in their own color
    if (tok.type === "string" && CSS.supports("color", tok.value)) {
      style = ' style="text-decoration-color:' + escapeHtml(tok.value).replace(/"/g, "&quot;") + '"';
      cls += " tok-colorstring";
    }
    return '<span class="' + cls + '"' + style + ">" + escapeHtml(tok.text) + "</span>";
  }).join("");
}

function update() {
  var lines = codeEl.value.split("\n");
  var settings = studioDefaults();
  var errors = [];
  var html = [];
  var gutter = [];

  lines.forEach(function (line, i) {
    var parsed = parseLine(line);
    if (parsed.error) errors.push({ line: i + 1, message: parsed.error });
    else if (parsed.key) settings[parsed.key] = parsed.value;
    html.push('<div class="line' + (parsed.error ? " line-error" : "") + '">' + (renderTokens(parsed) || "​") + "</div>");
    gutter.push('<div class="' + (parsed.error ? "gutter-error" : "") + '">' + (i + 1) + "</div>");
  });

  highlightEl.innerHTML = html.join("");
  gutterEl.innerHTML = gutter.join("");
  renderStatus(errors);
  sendSettings(settings);
  try { localStorage.setItem(STORAGE_KEY, codeEl.value); } catch (e) {}
}

function renderStatus(errors) {
  if (errors.length === 0) {
    statusEl.className = "status status-ok";
    statusEl.textContent = "✓ Looks good! Your changes are in the game.";
    return;
  }
  statusEl.className = "status status-error";
  var head = errors.length === 1 ? "1 line needs fixing" : errors.length + " lines need fixing";
  statusEl.innerHTML =
    '<div class="status-head">⚠ ' + head + " — everything else still works.</div>" +
    errors.slice(0, 4).map(function (e) {
      return '<button type="button" class="status-item" data-line="' + e.line + '"><b>Line ' + e.line + ":</b> " + escapeHtml(e.message) + "</button>";
    }).join("");
}

statusEl.addEventListener("click", function (e) {
  var item = e.target.closest(".status-item");
  if (item) goToLine(Number(item.dataset.line));
});

function goToLine(n) {
  var lines = codeEl.value.split("\n");
  var pos = 0;
  for (var i = 0; i < n - 1; i++) pos += lines[i].length + 1;
  codeEl.focus();
  codeEl.setSelectionRange(pos + lines[n - 1].length, pos + lines[n - 1].length);
}

/************************************
 * 3. Talking to the game
 ************************************/

function sendSettings(settings) {
  lastSettings = settings;
  if (frame.contentWindow) {
    frame.contentWindow.postMessage({ type: "studio-settings", settings: settings }, "*");
  }
  liveDot.classList.remove("pulse");
  void liveDot.offsetWidth; // restart the animation
  liveDot.classList.add("pulse");
}

window.addEventListener("message", function (event) {
  if (event.source === frame.contentWindow && event.data && event.data.type === "studio-ready") {
    sendSettings(lastSettings);
  }
});

document.getElementById("restart-game").addEventListener("click", function () {
  frame.contentWindow.location.reload();
  frame.focus();
});

document.getElementById("reset-code").addEventListener("click", function () {
  if (!confirm("Put the code back to how it started?")) return;
  replaceRange(0, codeEl.value.length, DEFAULT_CODE);
});

/************************************
 * 4. Editor behavior
 ************************************/

var updateTimer;
codeEl.addEventListener("input", function () {
  syncHighlight(); // keep the colored text aligned immediately
  clearTimeout(updateTimer);
  updateTimer = setTimeout(update, 150);
});

function syncHighlight() {
  highlightEl.innerHTML = codeEl.value.split("\n").map(function (line) {
    return '<div class="line">' + (renderTokens({ tokens: tokenize(line) }) || "​") + "</div>";
  }).join("");
}

codeEl.addEventListener("scroll", function () {
  highlightEl.scrollTop = codeEl.scrollTop;
  highlightEl.scrollLeft = codeEl.scrollLeft;
  gutterEl.scrollTop = codeEl.scrollTop;
});

codeEl.addEventListener("keydown", function (e) {
  if (e.key === "Tab" && !e.shiftKey) {
    e.preventDefault();
    replaceRange(codeEl.selectionStart, codeEl.selectionEnd, "  ");
  }
});

// Replace text in a way that keeps Ctrl/Cmd+Z working
function replaceRange(start, end, text) {
  codeEl.focus();
  codeEl.setSelectionRange(start, end);
  if (!document.execCommand || !document.execCommand("insertText", false, text)) {
    codeEl.setRangeText(text, start, end, "end");
    codeEl.dispatchEvent(new Event("input"));
  }
}

function currentLineInfo() {
  var pos = codeEl.selectionStart;
  var value = codeEl.value;
  var lineStart = value.lastIndexOf("\n", pos - 1) + 1;
  var lineEnd = value.indexOf("\n", pos);
  if (lineEnd === -1) lineEnd = value.length;
  return { start: lineStart, end: lineEnd, text: value.slice(lineStart, lineEnd) };
}

/************************************
 * 5. Color palette + reference list
 ************************************/

var paletteEl = document.getElementById("palette");
PALETTE.forEach(function (color) {
  var b = document.createElement("button");
  b.type = "button";
  b.className = "swatch";
  b.style.background = color;
  b.title = color;
  b.setAttribute("aria-label", color);
  // Keep the textarea's cursor where it is when a swatch is clicked
  b.addEventListener("mousedown", function (e) { e.preventDefault(); });
  b.addEventListener("click", function () { useColor(color); });
  paletteEl.appendChild(b);
});

function useColor(color) {
  var line = currentLineInfo();
  var parsed = parseLine(line.text);
  var obj = parsed.tokens.filter(function (t) { return t.type === "ident"; });
  var spec = obj.length >= 2 && STUDIO_SCHEMA[obj[0].text] && STUDIO_SCHEMA[obj[0].text][obj[1].text];

  if (!spec || spec.type !== "color") {
    flashStatus("Click on a line that has a color first, like monster.color");
    return;
  }
  var valueTok = parsed.tokens.find(function (t) { return t.type === "string" || t.type === "badstring"; });
  var eqTok = parsed.tokens.find(function (t) { return t.type === "eq"; });
  var newValue = '"' + color + '"';
  if (valueTok) {
    replaceRange(line.start + valueTok.start, line.start + valueTok.start + valueTok.text.length, newValue);
  } else if (eqTok) {
    var after = line.start + eqTok.start + 1;
    var comment = parsed.tokens.find(function (t) { return t.type === "comment"; });
    var endPos = comment ? line.start + comment.start : line.end;
    replaceRange(after, endPos, " " + newValue + (comment ? "   " : ""));
  }
}

function flashStatus(message) {
  statusEl.className = "status status-tip";
  statusEl.textContent = "💡 " + message;
  clearTimeout(updateTimer);
  updateTimer = setTimeout(update, 2500);
}

var refList = document.getElementById("reference-list");
Object.keys(STUDIO_SCHEMA).forEach(function (obj) {
  Object.keys(STUDIO_SCHEMA[obj]).forEach(function (prop) {
    var spec = STUDIO_SCHEMA[obj][prop];
    var li = document.createElement("li");
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ref-item";
    btn.innerHTML = '<code><span class="tok-object">' + obj + '</span>.<span class="tok-prop">' + prop + "</span></code><span>" + escapeHtml(spec.help) + "</span>";
    btn.addEventListener("click", function () { insertSetting(obj, prop, spec); });
    li.appendChild(btn);
    refList.appendChild(li);
  });
});

// Jump to the setting if it's already in the code, otherwise add it at the end
function insertSetting(obj, prop, spec) {
  var lines = codeEl.value.split("\n");
  for (var i = 0; i < lines.length; i++) {
    if (parseLine(lines[i]).key === obj + "." + prop) { goToLine(i + 1); return; }
  }
  var line = obj + "." + prop + " = " + (spec.type === "text" || spec.type === "color" ? '"' + spec.default + '"' : String(spec.default));
  var prefix = codeEl.value.endsWith("\n") || codeEl.value === "" ? "" : "\n";
  replaceRange(codeEl.value.length, codeEl.value.length, prefix + line + "\n");
}

/************************************
 * 6. Resizable split
 ************************************/

var divider = document.getElementById("divider");
var workspace = document.getElementById("workspace");
divider.addEventListener("pointerdown", function (e) {
  divider.setPointerCapture(e.pointerId);
  document.body.classList.add("dragging");
});
divider.addEventListener("pointermove", function (e) {
  if (!divider.hasPointerCapture(e.pointerId)) return;
  var rect = workspace.getBoundingClientRect();
  var pct = Math.min(65, Math.max(25, ((e.clientX - rect.left) / rect.width) * 100));
  workspace.style.setProperty("--editor-width", pct + "%");
});
divider.addEventListener("pointerup", function (e) {
  divider.releasePointerCapture(e.pointerId);
  document.body.classList.remove("dragging");
});

/************************************
 * 7. Start
 ************************************/

var saved = null;
try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) {}
codeEl.value = saved !== null ? saved : DEFAULT_CODE;
update();
