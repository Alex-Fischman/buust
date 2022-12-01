//	Jump: Space
//		Works off of any surface
//	Buust: Shift
//		Changes attacks and blocks
//		Initial moment based off of current momentum, then you get drifts
//		Dive?
//	Punch: LMB
//		1-2-3 sequence if used repeatedly
//		Heavy attack if buusting
//		Slam attack if diving
//		Context-sensitive execution?
//	Block: RMB
//		Parry if timed correctly, stuns enemy
//		Knockpack if ram while buusting
//		Pogo if diving?
//	Interact: E or Q
//		Shove: E and Q?

const RADIUS = 0.5;
const JUMP_HEIGHT = 2;
const JUMP_TIME = 1;
const JUMP_DIST = 3;
const GRAVITY = 8 * JUMP_HEIGHT / JUMP_TIME / JUMP_TIME;
const JUMP_IMPULSE = 4 * JUMP_HEIGHT / JUMP_TIME;

const WALK_SPEED = JUMP_DIST / JUMP_TIME;
const WALK_ACCEL_TIME = 0.1;
const WALK_ACCEL = WALK_SPEED / WALK_ACCEL_TIME;
const WALK_DRAG = WALK_ACCEL / WALK_SPEED;

const CAMERA_DIST = 2;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(90, 1, 1e-5, 1e5);
const renderer = new THREE.WebGLRenderer();
document.body.appendChild(renderer.domElement);

window.addEventListener("resize", () => {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.render(scene, camera);
});
window.dispatchEvent(new Event("resize"));

scene.fog = new THREE.Fog(0x000000, 1, 50);

const loadPrototypeMaterial = (width, height) => {
	const URL_1 = "https://raw.githubusercontent.com/gsimone/gridbox-";
	const URL_2 = "prototype-materials/main/prototype_512x512_blue1.png";
	const texture = new THREE.TextureLoader().load(
		URL_1 + URL_2,
		() => renderer.render(scene, camera),
	);
	texture.wrapS = THREE.RepeatWrapping;
	texture.wrapT = THREE.RepeatWrapping;
	texture.repeat.set(width, height);
	return new THREE.MeshBasicMaterial({map: texture});
};

const floor = (() => {
	const FLOOR_SIZE = 100;
	const floor = new THREE.Mesh(
		new THREE.PlaneGeometry(FLOOR_SIZE, FLOOR_SIZE).rotateX(-Math.PI / 2),
		loadPrototypeMaterial(FLOOR_SIZE, FLOOR_SIZE),
	);
	scene.add(floor);
	return floor;
})();

const cube = new THREE.Mesh(
	new THREE.BoxGeometry(2, 2, 2),
	loadPrototypeMaterial(2, 2),
);
cube.position.set(0, cube.scale.y, -5);
scene.add(cube);

const blocker = document.getElementById("blocker");
blocker.addEventListener("click", blocker.requestPointerLock);
document.addEventListener("pointerlockchange", e => {
	if (document.pointerLockElement) {
		blocker.style.visibility = "hidden";
		then = undefined;
		requestAnimationFrame(frame);
	} else {
		blocker.style.visibility = "visible";
	}
});

const keys = {};
const keysJustPressed = {};
document.addEventListener("keydown", event => {
	keys[event.key] = true;
	keysJustPressed[event.key] = true;
});
document.addEventListener("keyup", event => {
	keys[event.key] = false;
	keysJustPressed[event.key] = false;
});
document.addEventListener("mousemove", event => {
	if (!document.pointerLockElement) return;
	const euler = new THREE.Euler(0, 0, 0, "YXZ")
		.setFromQuaternion(camera.quaternion);
	euler.y -= event.movementX * 0.002;
	euler.x -= event.movementY * 0.002;
	euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.x));
	camera.quaternion.setFromEuler(euler);
});

const player = {
	position: new THREE.Vector3(0, 1, 0),
	velocity: new THREE.Vector3(0, 0, 0),
	model: new THREE.Mesh(
		new THREE.SphereGeometry(RADIUS),
		new THREE.MeshBasicMaterial(),
	),
};
scene.add(player.model);

const distanceToCube = (point, cube) => {
	const vector = point.clone().applyMatrix4(cube.matrix.clone().invert());
	vector.fromArray(vector.toArray().map(Math.abs)).subScalar(1);
	const a = Math.min(0, Math.max(vector.x, vector.y, vector.z));
	const b = vector.max(new THREE.Vector3()).length();
	return a + b;
};

const distanceToWorld = point => Math.min(point.y, distanceToCube(point, cube));

const EPSILON = 0.001;
const normalToWorld = point => new THREE.Vector3(
	distanceToWorld(new THREE.Vector3( EPSILON, 0, 0).add(point)) -
	distanceToWorld(new THREE.Vector3(-EPSILON, 0, 0).add(point)),
	distanceToWorld(new THREE.Vector3(0,  EPSILON, 0).add(point)) -
	distanceToWorld(new THREE.Vector3(0, -EPSILON, 0).add(point)),
	distanceToWorld(new THREE.Vector3(0, 0,  EPSILON).add(point)) -
	distanceToWorld(new THREE.Vector3(0, 0, -EPSILON).add(point)),
).normalize();

const raymarch = (position, direction, minDist, maxIter) => {
	let distance = 0;
	let iterations = 0;
	while (true) {
		const p = direction.clone().setLength(distance).add(position);
		const d = distanceToWorld(p);
		distance += d;
		if (Math.abs(d) < minDist || iterations >= maxIter) return distance;
		iterations++;
	}
};

const update = dt => {
	floor.position.copy(player.position).floor();
	floor.position.y = 0;

	const distance = distanceToWorld(player.position) - RADIUS;
	const movement = player.velocity.length() * dt;
	const unobstructed = Math.min(movement, distance);
	const   obstructed = Math.max(movement - distance, 0);
	
	player.position.add(player.velocity.clone().setLength(unobstructed));
	
	const normal = normalToWorld(player.position);
	const direction = player.velocity.clone().setLength(obstructed);
	const grounded = direction.dot(normal) < 0;
	if (grounded) {
		direction.projectOnPlane(normal);
		player.velocity.projectOnPlane(normal);
	}
	player.position.add(direction);

	const vy = player.velocity.y - GRAVITY * dt;
	player.velocity.y = 0;

	const walk = new THREE.Vector3(!!keys.d - !!keys.a, 0, !!keys.s - !!keys.w);
	const rotate = new THREE.Euler();
	rotate.order = "YXZ";
	rotate.setFromRotationMatrix(camera.matrix);
	walk.applyEuler(rotate.set(0, rotate.y, 0)).setLength(WALK_ACCEL * dt);
	player.velocity.add(walk);
	player.velocity.add(player.velocity.clone().multiplyScalar(-WALK_DRAG * dt));

	player.velocity.y = vy;

	if (grounded && keys[" "]) player.velocity.add(normal.setLength(JUMP_IMPULSE));

	player.model.position.copy(player.position);

	{
		camera.getWorldDirection(direction);
		direction.negate();
		const d = raymarch(player.position, direction, EPSILON, 10);
		const distance = Math.min(CAMERA_DIST, d - camera.near);
		camera.position.copy(player.position).add(direction.setLength(distance));
	}
};

let then = undefined;
const frame = now => {
	update((now - then) / 1000 || 1/60);
	then = now;

	renderer.render(scene, camera);
	if (document.pointerLockElement) requestAnimationFrame(frame);
};
requestAnimationFrame(frame);
