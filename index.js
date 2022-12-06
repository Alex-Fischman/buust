//	Buust: Space
//		Changes attacks and blocks
//	Punch: LMB
//		1-2-3 sequence if used repeatedly
//		Ram attack if buusting along the ground
//		Slam attack if have enough speed towards the ground
//		Context-sensitive execution attack?
//	Block: RMB
//		Parry if release is timed correctly, stuns enemy
//		Knockpack if ram while buusting
//		Pogo if diving?
//	Interact: E or Q
//		Shove: E and Q?

const RADIUS = 0.25;
const SPEED = 5;
const GRAVITY = 10;

const WALK_ACCEL_TIME = 0.05;
const WALK_ACCEL = SPEED / WALK_ACCEL_TIME;
const WALK_DRAG = 1 / WALK_ACCEL_TIME;

const FLY_ACCEL_TIME = 0.5;
const FLY_ACCEL = SPEED / FLY_ACCEL_TIME;
const FLY_DRAG = 1 / FLY_ACCEL_TIME;

const CAMERA_DIST = 1;
const TICK_TIME = 1 / 200;
const EPSILON = 0.001;

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

const loadPrototypeMaterial = (width, height, color = "blue", index = 1) => {
	const URL_1 = "https://raw.githubusercontent.com/gsimone/gridbox-";
	const URL_2 = `prototype-materials/main/prototype_512x512_${color}${index}.png`;
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

const cubes = [[0, 1, -6], [0, 3, -7], [4, 1, -7], [4, 3, -7]].map(position => {
	const cube = new THREE.Mesh(
		new THREE.BoxGeometry(2, 2, 2),
		loadPrototypeMaterial(2, 2, "green")
	);
	cube.position.fromArray(position);
	cube.updateMatrixWorld();
	scene.add(cube);
	return cube;
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
	jumped: false,
};
scene.add(player.model);

const distanceToWorld = point => Math.min(point.y, ...cubes.map(cube => {
	const vector = point.clone().applyMatrix4(cube.matrix.clone().invert());
	vector.fromArray(vector.toArray().map(Math.abs)).subScalar(1);
	const a = Math.min(0, Math.max(vector.x, vector.y, vector.z));
	const b = vector.max(new THREE.Vector3()).length();
	return a + b;
}));

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

const normalHelper = new THREE.ArrowHelper(new THREE.Vector3(), player.position, 1, 0xFF0000);
scene.add(normalHelper);

const update = dt => {
	floor.position.copy(player.position).floor();
	floor.position.y = 0;

	const distance = distanceToWorld(player.position) - RADIUS;
	const normal = normalToWorld(player.position);
	normalHelper.setDirection(normal);
	const movement = player.velocity.length() * dt;
	const unobstructed = Math.min(movement, distance);
	const   obstructed = Math.max(movement - distance, 0);

	player.position.add(player.velocity.clone().setLength(unobstructed));

	const direction = player.velocity.clone().setLength(obstructed);
	const grounded = obstructed > 0 && direction.dot(normal) <= 0;
	if (grounded) {
		direction.projectOnPlane(normal);
		player.velocity.projectOnPlane(normal);
	}
	player.position.add(direction);

	const facing = new THREE.Vector3();
	camera.getWorldDirection(facing);

	const forward = facing.clone().projectOnPlane(normal).normalize();
	const right = forward.clone().cross(normal).normalize();
	forward.setLength(key("KeyW") - key("KeyS"));
	right.setLength(key("KeyD") - key("KeyA"));
	player.velocity.add(forward.add(right).setLength(WALK_ACCEL * dt));
	player.velocity.add(player.velocity.clone().multiplyScalar(-WALK_DRAG * dt));
	player.velocity.sub(normal.clone().setLength(GRAVITY * dt));
	
	{
		const direction = facing.clone();
		direction.negate();
		const d = raymarch(player.position, direction, EPSILON, 10);
		const minimumDistance = RADIUS / Math.atan(camera.fov / 2 * Math.PI / 180);
		const distance = Math.max(Math.min(CAMERA_DIST, d - camera.near), minimumDistance);
		camera.position.copy(player.position).add(direction.setLength(distance));
	}

	player.model.position.copy(player.position);
	normalHelper.position.copy(player.position);
	updateInput();
};

let then = undefined;
const frame = now => {
	let extra = (now - then) / 1000 || 1/60;
	while (extra >= TICK_TIME) {
		update(TICK_TIME);
		extra -= TICK_TIME;
	}
	then = now - extra;

	renderer.render(scene, camera);
	if (document.pointerLockElement) requestAnimationFrame(frame);
};
requestAnimationFrame(frame);
