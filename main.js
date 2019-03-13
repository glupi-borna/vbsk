/** @global @type {point[]} */
const points = [];

const playerElement = document.getElementById("v");
playerElement.onplay = () => {
  let effect = playerEffects[Math.floor(Math.random() * playerEffects.length)];
  container.style.cssText = null;

  for (let key in effect) {
    if (key == "filter") {
      let filter = effect.filter;
      let filterString = "";
      for (let filterKey in filter) {
        let filterValue = filter[filterKey]();
        if (filterValue) {
          filterString += filterKey + "(" + filterValue + ")";
        }
      }

      container.style.filter = filterString;
    } else {
      let propertyValue = effect[key]();
      document.body.style.cssText = null;
      if (propertyValue) {
        document.body.style.setProperty(key, propertyValue);
      }
    }
  }
};

/** @global @type {AudioContext} */
const audioContext = new AudioContext();
const player = audioContext.createMediaElementSource(playerElement);

/** @global @type {AnalyserNode} */
const analyser = audioContext.createAnalyser();
analyser.smoothingTimeConstant = 0.9;
analyser.fftSize = 512;

player.connect(analyser);
analyser.connect(audioContext.destination);

const container = document.getElementById("container");
const app = new PIXI.Application({
  width: Math.min(window.innerWidth, window.innerHeight),
  height: Math.min(window.innerWidth, window.innerHeight),
  antialias: true,
  transparent: true
});

app.renderer.autoResize = true;
container.appendChild(app.view);

let largestDistance = 0;

/**
 * This just generates the favicon, generates all the points and sets up the rendering
 */
(() => {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const element = document.getElementById("favicon");

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

  window.onresize = () => {
    const minSize = Math.min(window.innerWidth, window.innerHeight);
    app.renderer.resize(minSize, minSize);
  };

  window.onresize();

  let unwrappedWeights = [];

  for (let weight of distribution.wtBkts) {
    let wt = weight[0];
    let cnt = weight[1];

    for (let i = cnt - 1; i >= 0; i--) {
      unwrappedWeights.push(wt);
    }
  }

  distribution.weight = unwrappedWeights;

  for (let i = 0; i < 2500; i++) {
    points.push(pointFromDistribution());
    if (points[i].distance > largestDistance) {
      largestDistance = points[i].distance;
    }

    app.stage.addChild(points[i].circle);
  }

  app.ticker.add(delta => draw());
})();

/**
 * @function binarySearchDistribution
 * @param {number} x
 * @description Performs a binary search on the precomputed distribution and returns the index of the weight closest to x
 * @returns {number}
 */
function binarySearchDistribution(x) {
  const weights = distribution.weight;
  const size = distribution.weight.length;
  const target = x;

  let lower = 0;
  let upper = size - 1;

  while (true) {
    let mid = Math.floor(lower + (upper - lower) / 2);

    if (upper < lower) {
      if (mid < 0) {
        return 0;
      }
      return mid;
    }

    if (weights[mid] < target) {
      lower = mid + 1;
    }

    if (weights[mid] > target) {
      upper = mid - 1;
    }

    if (weights[mid] == target) {
      return mid;
    }
  }
}

/**
 * @function getFromDistribution
 * @description Gets a pair of coordinates from the precomputed distribution
 * @returns {number[]}
 */
function getFromDistribution() {
  let coord = distribution.coords[binarySearchDistribution(Math.random())];

  return [
    coord[0] * distribution.invSize[0],
    coord[1] * distribution.invSize[1]
  ];
}

/**
 * @function signedRandom
 * @description Gets a random number between -1 and 1
 * @returns {number}
 */
function signedRandom() {
  return Math.random() > 0.5 ? Math.random() : -Math.random();
}

/** @typedef {{x: number, y: number, z:number, angle: number, cosAngle: number, sinAngle: number, distance: number, radius: number, circle: pixishape}} point */

/**
 * @function pointFromDistribution
 * @description Gets a random point from a precomputed distribution generated from an image
 * (assets/distribution.png & assets/distribution.js)
 * @returns {point}
 */
function pointFromDistribution() {
  let coords = getFromDistribution();
  coords[0] = (coords[0] + signedRandom() * 0.01) * 0.5 + 0.25;
  coords[1] = (coords[1] + signedRandom() * 0.01) * 0.5 + 0.25;

  let p = {
    x: coords[0],
    y: coords[1],
    distance: Math.hypot(coords[0] - 0.5, coords[1] - 0.5),
    angle: Math.atan2(coords[1] - 0.5, coords[0] - 0.5),
    cosAngle: 0,
    sinAngle: 0,
    radius: 1,
    circle: null
  };

  p.circle = new PIXI.Graphics();
  p.circle.beginFill(0xffffff);
  p.circle.drawCircle(0, 0, Math.max(p.radius * (2 - p.distance * 6), 0.25));
  p.circle.endFill();
  p.circle.x = p.x;
  p.circle.y = p.y;

  p.cosAngle = Math.cos(p.angle);
  p.sinAngle = Math.sin(p.angle);

  return p;
}

let array = new Uint8Array(analyser.fftSize);

function draw() {
  analyser.getByteTimeDomainData(array);

  const toArrayIndex = 256 / Math.PI;
  let min = Infinity;
  let max = 0;
  const minDim = Math.min(window.innerWidth, window.innerHeight);

  /* NOTE: it might be safe to assume that min is 128
   * however, until i do more research, i'm keeping this loop
   */
  for (const a of array) {
    if (a < min) {
      min = a;
    }

    if (a > max) {
      max = a;
    }
  }

  const invMax = 1 / max;

  for (let point of points) {
    let arrayIndex = Math.floor(point.angle * toArrayIndex);

    if (arrayIndex < 0) {
      arrayIndex += 512;
    }

    let x =
      point.x +
      (array[arrayIndex] - min) *
        invMax *
        0.1 *
        point.cosAngle *
        point.distance *
        2;
    let y =
      point.y +
      (array[arrayIndex] - min) *
        invMax *
        0.1 *
        point.sinAngle *
        point.distance *
        2;

    point.circle.x = x * minDim;
    point.circle.y = y * minDim;
  }
}

function randomColor() {
  return "#" + Math.floor(Math.random() * 16581375).toString(16);
}

const playerEffects = [
  {
    filter: {
      blur: () =>
        Math.random() > 0.1 ? Math.floor(Math.random() * 4 + 1) + "px" : null,
      brightness: () =>
        Math.random() > 0.5 ? 50 + Math.random() * 450 + "%" : null,
      "drop-shadow": () =>
        Math.random() > 0.1
          ? `${signedRandom() * 8}px ${signedRandom() * 8}px ${Math.random() *
              8}px ${randomColor()}`
          : null,
      invert: () => (Math.random() > 0.5 ? null : "100%")
    },
    background: () => {
      if (Math.random() > 0.1) {
        return randomColor();
      } else {
        return "url(https://cdn.wallpapersafari.com/2/44/O8PNJI.jpeg)";
      }
    }
  }
];

// TODO: implement batching like in https://pixijs.io/examples/#/demos/batch.js

// NOTE: old stuff
// /**
//  * @function point
//  * @return {point}
//  */
// function point() {
//   let p = {
//     x: 0,
//     y: 0,
//     z: 0,
//     distance: distributedDistance(),
//     angle: Math.random() * Math.PI * 2,
//     cosAngle: 0,
//     sinAngle: 0,
//     radius: Math.random() * 1 + 3,
//     circle: null
//   };

//   p.x = p.distance * Math.cos(p.angle) + 0.5;
//   p.y = p.distance * Math.sin(p.angle) + 0.5;

//   p.cosAngle = Math.cos(p.angle);
//   p.sinAngle = Math.sin(p.angle);

//   p.z = Math.random();

//   p.circle = new PIXI.Circle(p.x, p.y, p.radius);
//   p.circle.beginFill(0xffffff);
//   p.circle.drawCircle(0, 0, p.radius * (0.7 - p.distance));
//   p.circle.endFill();
//   p.circle.x = p.x;
//   p.circle.y = p.y;

//   return p;
// }

// function update() {
//   analyser.getByteTimeDomainData(array);

//   context.beginPath();
//   context.fillStyle = "black";
//   context.rect(0, 0, canvas.width, canvas.height);
//   context.fill();

//   context.translate(canvas.width * 0.5, canvas.height * 0.5);

//   context.beginPath();
//   context.fillStyle = "white";
//   let toArrayIndex = 256 / Math.PI;
//   let min = Infinity;

//   for (let a of array) {
//     if (a < min) {
//       min = a;
//     }
//   }

//   let size = Math.min(canvas.width, canvas.height);

//   for (let point of points) {
//     let arrayIndex = Math.floor(point.angle * toArrayIndex);

//     if (arrayIndex < 0) {
//       arrayIndex += 512;
//     }

//     let scale = 1 - point.distance / largestDistance;
//     let x =
//       (point.x - 0.5) * size +
//       (array[arrayIndex] - min) *
//         0.25 *
//         point.cosAngle *
//         (largestDistance * 2 - point.distance);
//     let y =
//       (point.y - 0.5) * size +
//       (array[arrayIndex] - min) *
//         0.25 *
//         point.sinAngle *
//         (largestDistance * 2 - point.distance);
//     let dist = Math.max(point.radius * scale, 0.5);
//     let distQ = dist * 0.7071;
//     context.moveTo(x, y - dist);
//     context.lineTo(x + distQ, y - distQ);
//     context.lineTo(x + dist, y);
//     context.lineTo(x + distQ, y + distQ);
//     context.lineTo(x, y + dist);
//     context.lineTo(x - distQ, y + distQ);
//     context.lineTo(x - dist, y);
//     context.lineTo(x - distQ, y - distQ);
//     context.closePath();
//   }
//   context.fill();
//   context.setTransform(1, 0, 0, 1, 0, 0);

//   requestAnimationFrame(update);
// }
