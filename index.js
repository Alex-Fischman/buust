const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 1e-5, 1e5);
const renderer = new THREE.WebGLRenderer();
document.body.appendChild(renderer.domElement);

window.addEventListener("resize", () => {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.render(scene, camera);
});
window.dispatchEvent(new Event("resize"));

const cubes = new THREE.InstancedMesh(
	new THREE.BoxGeometry(2, 2, 2),
	new THREE.MeshToonMaterial(),
	2e4,
);
{
	const position = new THREE.Vector3();
	const rotation = new THREE.Euler();
	const quaternion = new THREE.Quaternion();
	const matrix = new THREE.Matrix4();
	const scale = new THREE.Vector3(1, 1, 1);
	for (let i = 0; i < cubes.count; ++i) {
		position.x = (Math.random() * 2 - 1) * Math.sqrt(cubes.count);
		position.y = (Math.random() * 2 - 1) * Math.sqrt(cubes.count);
		position.z = (Math.random() * 2 - 1) * Math.sqrt(cubes.count);
		rotation.x = Math.random() * Math.PI * 2;
		rotation.y = Math.random() * Math.PI * 2;
		rotation.z = Math.random() * Math.PI * 2;
		cubes.setMatrixAt(i, matrix.compose(position, quaternion.setFromEuler(rotation), scale));
	}
}
cubes.geometry.normalizeNormals();
scene.add(cubes);

const light = new THREE.PointLight();
scene.add(light);

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
	const euler = new THREE.Euler(0, 0, 0, "YXZ").setFromQuaternion(camera.quaternion);
	euler.y -= event.movementX * 0.002;
	euler.x -= event.movementY * 0.002;
	euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.x));
	camera.quaternion.setFromEuler(euler);
});

const update = dt => {
	const movement = dt * 10;
	const direction = new THREE
		.Vector3(!!keys.d - !!keys.a, !!keys.q - !!keys.e, !!keys.s - !!keys.w)
		.applyMatrix4(new THREE.Matrix4().extractRotation(camera.matrix));
	const position = camera.position;

	const matrix = new THREE.Matrix4();
	const inverted = [...Array(cubes.count)].map((_, i) => {
		cubes.getMatrixAt(i, matrix);
		return matrix.clone().invert();
	});
	const vector = new THREE.Vector3();
	const distances = [
		new THREE.Vector3(),
		new THREE.Vector3( 0.001, 0, 0),
		new THREE.Vector3(-0.001, 0, 0),
		new THREE.Vector3(0,  0.001, 0),
		new THREE.Vector3(0, -0.001, 0),
		new THREE.Vector3(0, 0,  0.001),
		new THREE.Vector3(0, 0, -0.001),
	].map(offset => offset.add(position)).map(point => {
		let distance = Infinity;
		for (let i = 0; i < cubes.count; ++i) {
			vector.copy(point).applyMatrix4(inverted[i]);
			vector.fromArray(vector.toArray().map(x => Math.abs(x) - 1));
			const a = Math.min(0, Math.max(vector.x, vector.y, vector.z));
			const b = vector.max(new THREE.Vector3()).length();
			distance = Math.min(distance, a + b);
		}
		return distance;
	});

	const distance = distances[0] - 0.5;
	const normal = new THREE.Vector3(
		distances[1] - distances[2],
		distances[3] - distances[4],
		distances[5] - distances[6],
	);

	const move  = direction.clone().setLength(Math.min(movement, distance));
	const slide = direction.clone().setLength(Math.max(movement - distance, 0));
	if (direction.dot(normal) < 0) slide.projectOnPlane(normal);
	
	camera.position.add(move).add(slide);
};

let then = performance.now();
const frame = now => {
	update((now - then) / 1000);
	renderer.render(scene, camera);
	then = now;
	if (document.pointerLockElement) requestAnimationFrame(frame);
};
requestAnimationFrame(frame);
