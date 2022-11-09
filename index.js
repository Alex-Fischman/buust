const MOVE = 10;
const GRAVITY = 5;

const CUBES_PER_SIDE = 10;
const CUBES_MAX_MOVE = 0.5;
const CUBES_DISTANCE = (2 * Math.sqrt(3) + 1) / (1 - CUBES_MAX_MOVE);
const DIST_TO_CENTER = (CUBES_PER_SIDE / 2 - 1) * CUBES_DISTANCE;
const EPSILON = 0.001;

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

scene.fog = new THREE.Fog(0x000000, 1, DIST_TO_CENTER);

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
	velocity: new THREE.Vector3(),
};

const update = dt => {
	{
		const center = new THREE.Vector3();
		camera.getWorldDirection(center);
		center.setLength(DIST_TO_CENTER).add(player.position);
		const position = new THREE.Vector3();
		const rotation = new THREE.Euler();
		const quaternion = new THREE.Quaternion();
		const matrix = new THREE.Matrix4();
		const scale = new THREE.Vector3(1, 1, 1);
		const hash = x => Math.sin(x * 2357 + 0.7532) / 2 + 0.5;
		for (let i = 0; i < CUBES_PER_SIDE; ++i) {
			for (let j = 0; j < CUBES_PER_SIDE; ++j) {
				for (let k = 0; k < CUBES_PER_SIDE; ++k) {
					position.copy(center).divideScalar(CUBES_DISTANCE);
					position.subScalar(CUBES_PER_SIDE / 2).floor();
					position.x += i;
					position.y += j;
					position.z += k;
					const seed = hash(position.x + hash(position.y + hash(position.z)));
					position.x += hash(seed + 0) * CUBES_MAX_MOVE;
					position.y += hash(seed + 1) * CUBES_MAX_MOVE;
					position.z += hash(seed + 2) * CUBES_MAX_MOVE;
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

	const distance = (distanceToCubes(player.position) - 0.5) - EPSILON;

	const input = new THREE
		.Vector3(!!keys.d - !!keys.a, 0, !!keys.s - !!keys.w)
		.applyMatrix4(new THREE.Matrix4().extractRotation(camera.matrix))
		.setY(0).setLength(MOVE);
	const gravity = new THREE.Vector3(0, -GRAVITY, 0);
	const force = [input, gravity].reduce((a, b) => a.add(b));
	player.velocity.add(force.multiplyScalar(dt));

	const movement = player.velocity.length() * dt;
	const direction = player.velocity.clone();
	
	player.position.add(direction.setLength(Math.min(movement, distance)));
	const normal = new THREE.Vector3(
		distanceToCubes(new THREE.Vector3( EPSILON, 0, 0).add(player.position)) -
		distanceToCubes(new THREE.Vector3(-EPSILON, 0, 0).add(player.position)),
		distanceToCubes(new THREE.Vector3(0,  EPSILON, 0).add(player.position)) -
		distanceToCubes(new THREE.Vector3(0, -EPSILON, 0).add(player.position)),
		distanceToCubes(new THREE.Vector3(0, 0,  EPSILON).add(player.position)) -
		distanceToCubes(new THREE.Vector3(0, 0, -EPSILON).add(player.position)),
	);
	direction.setLength(Math.max(movement - distance, 0));
	if (direction.dot(normal) < 0) {
		direction.projectOnPlane(normal);
		player.velocity.projectOnPlane(normal);
	}
	player.position.add(direction);

	camera.position.lerp(player.position, dt * 10);
};

let then = performance.now();
const frame = now => {
	update((now - then) / 1000);
	renderer.render(scene, camera);
	then = now;
	if (document.pointerLockElement) requestAnimationFrame(frame);
};
requestAnimationFrame(frame);
