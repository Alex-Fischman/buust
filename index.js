const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(90);
const renderer = new THREE.WebGLRenderer();
document.body.appendChild(renderer.domElement);

window.addEventListener("resize", () => {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
});
window.dispatchEvent(new Event("resize"));

// Preallocated for use in computations
const _vector = new THREE.Vector3();
const _euler = new THREE.Euler();
const _matrix = new THREE.Matrix4();
const _quaternion = new THREE.Quaternion();

const cubes = new THREE.InstancedMesh(
	new THREE.BoxGeometry(2, 2, 2),
	new THREE.MeshBasicMaterial(),
	1e4,
);
const scale = new THREE.Vector3(1, 1, 1);
for (let i = 0; i < cubes.count; ++i) {
	_vector.x = (Math.random() * 2 - 1) * Math.sqrt(cubes.count);
	_vector.y = (Math.random() * 2 - 1) * Math.sqrt(cubes.count);
	_vector.z = (Math.random() * 2 - 1) * Math.sqrt(cubes.count);
	_euler.x = Math.random() * Math.PI * 2;
	_euler.y = Math.random() * Math.PI * 2;
	_euler.z = Math.random() * Math.PI * 2;
	_quaternion.setFromEuler(_euler);
	_matrix.compose(_vector, _quaternion, scale);
	cubes.setMatrixAt(i, _matrix);
}
_vector.set(0, -2, 0);
_euler.set(0, 0, 0);
_quaternion.setFromEuler(_euler);
_matrix.compose(_vector, _quaternion, scale);
cubes.setMatrixAt(0, _matrix);
scene.add(cubes);

const blocker = document.getElementById("blocker");
blocker.addEventListener("click", blocker.requestPointerLock);
document.addEventListener("pointerlockchange", e => {
	if (document.pointerLockElement) {
		blocker.style.visibility = "hidden";
		requestAnimationFrame(frame);
	} else {
		blocker.style.visibility = "visible";
	}
});

const keys = {};
document.addEventListener("keydown", e => keys[event.key] = true);
document.addEventListener("keyup", e => keys[event.key] = false);
document.addEventListener("mousemove", e => {
	if (!document.pointerLockElement) return;
	_euler.reorder("YXZ");
	_euler.setFromQuaternion(camera.quaternion);
	_euler.y -= event.movementX * 0.002;
	_euler.x -= event.movementY * 0.002;
	_euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, _euler.x));
	camera.quaternion.setFromEuler(_euler);
	_euler.reorder("XYZ");
});

let update = dt => {
	_matrix.extractRotation(camera.matrix);

	_vector.set(!!keys.d - !!keys.a, 0, !!keys.s - !!keys.w).setLength(dt * 10);
	camera.position.add(_vector.applyMatrix4(_matrix).setY(0));

	const raycaster = new THREE.Raycaster(camera.position, _vector.set(0, -1, 0), 0, 1);
	const results = raycaster.intersectObject(cubes);
	if (results.length) console.log(results);
};

let then = performance.now();
let frame = now => {
	update((now - then) / 1000);
	renderer.render(scene, camera);
	then = now;
	if (document.pointerLockElement) requestAnimationFrame(frame);
};
requestAnimationFrame(frame);
