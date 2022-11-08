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

const CUBES_PER_SIDE = 10;
const CUBES_DISTANCE = 5;
scene.fog = new THREE.Fog(0x000000, 1, (CUBES_PER_SIDE / 2 - 1) * CUBES_DISTANCE);

const cubes = new THREE.InstancedMesh(
	new THREE.BoxGeometry(2, 2, 2),
	new THREE.MeshBasicMaterial(),
	CUBES_PER_SIDE * CUBES_PER_SIDE * CUBES_PER_SIDE,
);
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
	const euler = new THREE.Euler(0, 0, 0, "YXZ").setFromQuaternion(camera.quaternion);
	euler.y -= event.movementX * 0.002;
	euler.x -= event.movementY * 0.002;
	euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.x));
	camera.quaternion.setFromEuler(euler);
});

const distanceToCubes = point => {
	const matrix = new THREE.Matrix4();
	const vector = new THREE.Vector3();
	let distance = Infinity;
	for (let i = 0; i < cubes.count; ++i) {
		cubes.getMatrixAt(i, matrix);
		vector.copy(point).applyMatrix4(matrix.invert());
		vector.fromArray(vector.toArray().map(x => Math.abs(x) - 1));
		const a = Math.min(0, Math.max(vector.x, vector.y, vector.z));
		const b = vector.max(new THREE.Vector3()).length();
		distance = Math.min(distance, a + b);
	}
	return distance;
};

const player = {
	position: new THREE.Vector3(),
};

const update = dt => {
	{
		const position = new THREE.Vector3();
		const rotation = new THREE.Euler();
		const quaternion = new THREE.Quaternion();
		const matrix = new THREE.Matrix4();
		const scale = new THREE.Vector3(1, 1, 1);
		const hash = x => Math.sin(x * 2357 + 0.7532) / 2 + 0.5;
		for (let i = 0; i < CUBES_PER_SIDE; ++i) {
			for (let j = 0; j < CUBES_PER_SIDE; ++j) {
				for (let k = 0; k < CUBES_PER_SIDE; ++k) {
					position.copy(camera.position).divideScalar(CUBES_DISTANCE);
					position.subScalar(CUBES_PER_SIDE / 2).floor();
					position.x += i;
					position.y += j;
					position.z += k;
					const seed = hash(position.x + hash(position.y + hash(position.z)));
					position.x += hash(seed + 0) * 0.8;
					position.y += hash(seed + 1) * 0.8;
					position.z += hash(seed + 2) * 0.8;
					position.multiplyScalar(CUBES_DISTANCE);
					rotation.x = hash(seed + 3) * Math.PI * 2;
					rotation.y = hash(seed + 4) * Math.PI * 2;
					rotation.z = hash(seed + 5) * Math.PI * 2;
					matrix.compose(position, quaternion.setFromEuler(rotation), scale);
					const index = i * CUBES_PER_SIDE * CUBES_PER_SIDE + j * CUBES_PER_SIDE + k;
					cubes.setMatrixAt(index, matrix);
				}
			}
		}
		cubes.instanceMatrix.needsUpdate = true;
	}

	const movement = dt * 10;
	const direction = new THREE
		.Vector3(!!keys.d - !!keys.a, !!keys.q - !!keys.e, !!keys.s - !!keys.w)
		.applyMatrix4(new THREE.Matrix4().extractRotation(camera.matrix));

	const distance = distanceToCubes(player.position) - 0.5;
	const normal = new THREE.Vector3(
		distanceToCubes(new THREE.Vector3( 0.001, 0, 0).add(player.position)) -
		distanceToCubes(new THREE.Vector3(-0.001, 0, 0).add(player.position)),
		distanceToCubes(new THREE.Vector3(0,  0.001, 0).add(player.position)) -
		distanceToCubes(new THREE.Vector3(0, -0.001, 0).add(player.position)),
		distanceToCubes(new THREE.Vector3(0, 0,  0.001).add(player.position)) -
		distanceToCubes(new THREE.Vector3(0, 0, -0.001).add(player.position)),
	);

	const unobstructed = direction.clone().setLength(Math.min(movement, distance));
	direction.setLength(Math.max(movement - distance, 0));
	if (direction.dot(normal) < 0) direction.projectOnPlane(normal);
	
	player.position.add(unobstructed).add(direction);
	camera.position.lerp(player.position, 0.2);
};

let then = performance.now();
const frame = now => {
	update((now - then) / 1000);
	renderer.render(scene, camera);
	then = now;
	if (document.pointerLockElement) requestAnimationFrame(frame);
};
requestAnimationFrame(frame);
