const keys = {};
const keysDownThisFrame = {};
const keysUpThisFrame = {};
document.addEventListener("keydown", event => {
	keys[event.key] = true;
	keysDownThisFrame[event.key] = true;
});
document.addEventListener("keyup", event => {
	keys[event.key] = false;
	keysUpThisFrame[event.key] = true;
});

const mouseButtons = {};
const mouseButtonsDownThisFrame = {};
const mouseButtonsUpThisFrame = {};
document.addEventListener("mousedown", () => {
	mouse[event.button] = true;
	mouseButtonsDownThisFrame[event.button] = true;
});
document.addEventListener("mouseup", () => {
	mouseButtons[event.button] = false;
	mouseButtonsUpThisFrame[event.button] = true;
});

function key        (key) { return !!keys[key]; }
function keyPressed (key) { return !!keysDownThisFrame[key]; }
function keyReleased(key) { return !!keysUpThisFrame[key]; }

function mouse        (button) { return !!mouseButtons[button]; }
function mousePressed (button) { return !!mouseButtonsDownThisFrame[button]; }
function mouseReleased(button) { return !!mouseButtonsUpThisFrame[button]; }

function updateInput() {
	for (const i in keysDownThisFrame) delete keysDownThisFrame[i];
	for (const i in keysUpThisFrame)   delete keysUpThisFrame[i];
	for (const i in mouseButtonsDownThisFrame) delete mouseButtonsDownThisFrame[i];
	for (const i in mouseButtonsUpThisFrame)   delete mouseButtonsUpThisFrame[i];
}
