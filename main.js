/** @global @type {HTMLCanvasElement} */
let canvas = null;
/** @global @type {CanvasRenderingContext2D} */
let context = null;
/** @global @type {point[]} */
let points = [];
/** @global @type {AudioContext} */
let audioContext = new AudioContext();
let player = audioContext.createMediaElementSource(document.getElementById('v'));
/** @global @type {AnalyserNode} */
let analyser = audioContext.createAnalyser();
analyser.smoothingTimeConstant = 0.9;
analyser.fftSize = 256;
player.connect(analyser);
analyser.connect(audioContext.destination);

let largestDistance = 0;

const inv = 1 / 1.35;


(() => {
    canvas = document.createElement("canvas");
    context = canvas.getContext("2d");
    let element = document.getElementById("favicon");

    canvas.height = 32;
    canvas.width = 32;

    context.beginPath();
    context.fillStyle = "black";
    context.rect(0, 0, canvas.width, canvas.height);
    context.fill();

    context.strokeStyle = "white";
    context.lineWidth = "2";
    context.beginPath();
    context.ellipse(16, 16, 6, 6, 0, 0, 360);
    context.stroke();

    element.href = canvas.toDataURL("image/png", 0.85);

    document.body.appendChild(canvas);

    const onresize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };
    window.onresize = onresize;
    onresize();

    for (let i = 0; i < 600; i++) {
        points.push(point());
        if (points[i].distance > largestDistance) {
            largestDistance = points[i].distance;
        }
    }

    requestAnimationFrame(update);
})();

function distributedDistance() {
    let x = Math.random();
    let s = Math.sin;
    let pi = Math.PI;
    /*if (version == 2) {
        x = (1.5 * s(x * pi) + 0.075 * s(x * pi * 3) + 0.025 * s(x * pi * 5) + 0.2 * s(x * pi * 7)) * inv;
        x = 1 - Math.max(Math.pow(s(1.5 * pi + x * 2 * pi), 1), 0);
        x = s(2.5 * pi + x * 4 * pi) ** 0.2 + s(x * pi) ** 4 - 1;
    }*/
    let max = 0.1;
    let min = -0.1;
    while (x < min) {
        x = max - x;
    }

    while (x > max) {
        x += min;
    }

    if (Math.random() > 0.05) {
        return x;
    } else {
        return x * 3;
    }
}

/** @typedef {{x: number, y: number, z:number, angle: number, cosAngle: number, sinAngle: number, distance: number, radius: number}} point */

/** 
 * @function point 
 * @return {point}
 */
function point() {
    let p = {
        x: 0,
        y: 0,
        z: 0,
        distance: distributedDistance(),
        angle: Math.random() * Math.PI * 2,
        cosAngle: 0,
        sinAngle: 0,
        radius: Math.random() * 1 + 3
    };

    p.x = p.distance * Math.cos(p.angle) + 0.5;
    p.y = p.distance * Math.sin(p.angle) + 0.5;

    p.cosAngle = Math.cos(p.angle);
    p.sinAngle = Math.sin(p.angle);

    p.z = Math.random();

    return p;
}


let array = new Uint8Array(analyser.fftSize);

function update() {
    analyser.getByteTimeDomainData(array);

    context.beginPath();
    context.fillStyle = "black";
    context.rect(0, 0, canvas.width, canvas.height);
    context.fill();

    context.translate(canvas.width * 0.5, canvas.height * 0.5);

    context.beginPath();
    context.fillStyle = "white";
    let toArrayIndex = 128 / Math.PI;
    let min = Infinity;

    for (let a of array) {
        if (a < min) {
            min = a;
        }
    }

    let size = Math.min(canvas.width, canvas.height);

    for (let point of points) {
        let arrayIndex = Math.floor(point.angle * toArrayIndex);

        if (arrayIndex < 0) {
            arrayIndex += 256;
        }

        let scale = Math.max(1 - point.distance * 8, 0.2);
        let x = (point.x - 0.5) * size + (array[arrayIndex] - min) * 0.25 * point.cosAngle * (largestDistance * 2 - point.distance);
        let y = (point.y - 0.5) * size + (array[arrayIndex] - min) * 0.25 * point.sinAngle * (largestDistance * 2 - point.distance);
        let dist = point.radius * scale;
        let distQ = dist * 0.7071;
        context.moveTo(x, y - dist);
        context.lineTo(x + distQ, y - distQ);
        context.lineTo(x + dist, y);
        context.lineTo(x + distQ, y + distQ);
        context.lineTo(x, y + dist);
        context.lineTo(x - distQ, y + distQ);
        context.lineTo(x - dist, y);
        context.lineTo(x - distQ, y - distQ);
        context.closePath();
    }
    context.fill();
    context.setTransform(1, 0, 0, 1, 0, 0);

    requestAnimationFrame(update);
}