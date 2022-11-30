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
	RADIUS: 	0.5,	// m
	WALK: 		1,		// m/s
	GRAVITY: 	10,		// m/s/s
};

const distanceToWorld = point => point.y;

const update = dt => {
	{
		floor.position.copy(player.position).floor();
		floor.position.y = 0;
	}

	{
		const dy = player.velocity.y - player.GRAVITY * dt;
		player.velocity.y = 0;

		const walk = new THREE.Vector3(!!keys.d - !!keys.a, 0, !!keys.s - !!keys.w);
		const rotate = new THREE.Euler();
		rotate.order = "YXZ";
		rotate.setFromRotationMatrix(camera.matrix);
		walk.applyEuler(rotate.set(0, rotate.y, 0)).setLength(player.WALK);
		player.velocity.lerp(walk, 0.2);

		player.velocity.y = dy;
	}

	{
		const distance = distanceToWorld(player.position) - player.RADIUS;
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
	}

	camera.position.copy(player.position);
};

let then = undefined;
const frame = now => {
	update((now - then) / 1000 || 1/60);
	then = now;

	renderer.render(scene, camera);
	if (document.pointerLockElement) requestAnimationFrame(frame);
};
requestAnimationFrame(frame);
