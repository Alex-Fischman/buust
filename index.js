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

scene.fog = new THREE.Fog(0x000000, 1, 100);

const floor = (() => {
	const FLOOR_SIZE = 100;
	const URL_1 = "https://raw.githubusercontent.com/gsimone/gridbox-";
	const URL_2 = "prototype-materials/main/prototype_512x512_blue1.png";
	const texture = new THREE.TextureLoader().load(
		URL_1 + URL_2,
		() => renderer.render(scene, camera),
	);
	texture.wrapS = THREE.RepeatWrapping;
	texture.wrapT = THREE.RepeatWrapping;
	texture.repeat.set(FLOOR_SIZE, FLOOR_SIZE);
	const floor = new THREE.Mesh(
		new THREE.PlaneGeometry(FLOOR_SIZE, FLOOR_SIZE).rotateX(-Math.PI / 2),
		new THREE.MeshBasicMaterial({map: texture}),
	);
	scene.add(floor);
	return floor;
})();

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
document.addEventListener("keydown", event => keys[event.key] = true);
document.addEventListener("keyup", event => keys[event.key] = false);
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
	jumped: false,
	grounded: false,
};
const RADIUS = 0.5;
const JUMP_DIST = 1;
const JUMP_HEIGHT = 2;
const WALK_SPEED = 1;
const JUMP_TIME = JUMP_DIST / WALK_SPEED;
const GRAVITY = 4 * JUMP_HEIGHT / JUMP_TIME / JUMP_TIME;
const JUMP_IMPULSE = 4 * JUMP_HEIGHT / JUMP_TIME;

const distanceToWorld = point => point.y;

const update = dt => {
	floor.position.copy(player.position).floor();
	floor.position.y = 0;

	const distance = distanceToWorld(player.position) - RADIUS;
	const movement = player.velocity.length() * dt;
	const unobstructed = Math.min(movement, distance);
	const   obstructed = Math.max(movement - distance, 0);
	
	player.position.add(player.velocity.clone().setLength(unobstructed));
	
	const EPSILON = 0.001;
	const normal = new THREE.Vector3(
		distanceToWorld(new THREE.Vector3( EPSILON, 0, 0).add(player.position)) -
		distanceToWorld(new THREE.Vector3(-EPSILON, 0, 0).add(player.position)),
		distanceToWorld(new THREE.Vector3(0,  EPSILON, 0).add(player.position)) -
		distanceToWorld(new THREE.Vector3(0, -EPSILON, 0).add(player.position)),
		distanceToWorld(new THREE.Vector3(0, 0,  EPSILON).add(player.position)) -
		distanceToWorld(new THREE.Vector3(0, 0, -EPSILON).add(player.position)),
	).normalize();
	
	const direction = player.velocity.clone().setLength(obstructed);
	if (direction.dot(normal) < 0) {
		direction.projectOnPlane(normal);
		player.velocity.projectOnPlane(normal);
	}
	player.position.add(direction);

	camera.position.copy(player.position);

	const vy = player.velocity.y - GRAVITY * dt;
	player.velocity.y = 0;

	const walk = new THREE.Vector3(!!keys.d - !!keys.a, 0, !!keys.s - !!keys.w);
	const rotate = new THREE.Euler();
	rotate.order = "YXZ";
	rotate.setFromRotationMatrix(camera.matrix);
	walk.applyEuler(rotate.set(0, rotate.y, 0)).setLength(WALK_SPEED);
	player.velocity.lerp(walk, 0.2);

	player.velocity.y = vy;

	if (distance < EPSILON * 2) {
		if (!player.jumped && keys[" "]) {
			console.log("JUMP");
			player.velocity.add(normal.setLength(JUMP_IMPULSE));
			player.jumped = true;
		}
	} else {
		if (player.jumped) player.jumped = false;
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
