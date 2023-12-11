const RADIUS = 0.25;
const JUMP_HEIGHT = 2;
const JUMP_TIME = 1;
const JUMP_DIST = 5;
const SPEED = JUMP_DIST / JUMP_TIME;
const GRAVITY = 8 * JUMP_HEIGHT / JUMP_TIME / JUMP_TIME;
const JUMP_IMPULSE = 4 * JUMP_HEIGHT / JUMP_TIME;

const JUMP_PORTION_VERTICAL = 0.5; // for wall jumps
const JUMP_AMOUNT_VERTICAL = JUMP_IMPULSE * JUMP_PORTION_VERTICAL;
const JUMP_AMOUNT_NON_VERTICAL = JUMP_IMPULSE * (1 - JUMP_PORTION_VERTICAL);

const WALK_ACCEL_TIME = 0.05;
const WALK_ACCEL = SPEED / WALK_ACCEL_TIME;
const WALK_DRAG = 1 / WALK_ACCEL_TIME;

const FLY_ACCEL_TIME = 1;
const FLY_ACCEL = SPEED / FLY_ACCEL_TIME;
const FLY_DRAG = 1 / FLY_ACCEL_TIME;

const BUUST_IMPULSE = SPEED;

const CAMERA_FOV = 90;
const CAMERA_MAX_DIST = 0.5;
const CAMERA_MIN_DIST = RADIUS / Math.atan(CAMERA_FOV / 2 * Math.PI / 180);
const CAMERA_LERP = 0.2;

const TICK_TIME = 1 / 200;
const EPSILON = 0.001;
