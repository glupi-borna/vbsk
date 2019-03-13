const fs = require("fs");
const PNG = require("pngjs").PNG;

const distribution = [];

fs.createReadStream("assets/distribution.png")
  .pipe(
    new PNG({
      filterType: 4
    })
  )
  .on("parsed", function() {
    let totalBrightness = 0;
    for (var y = 0; y < this.height; y++) {
      for (var x = 0; x < this.width; x++) {
        const pixelIndex = (this.width * y + x) << 2;

        const pixelBrightness = this.data[pixelIndex];
        totalBrightness += pixelBrightness;

        distribution.push({
          x: x,
          y: y,
          weight: totalBrightness
        });
      }
    }

    for (let i = 0; i < distribution.length; i++) {
      distribution[i].weight /= totalBrightness;
      distribution[i].weight = Math.round(distribution[i].weight * 5000) / 5000;
    }

    let weightBuckets = [];
    for (let i = 0; i < distribution.length; i++) {
      let weight = distribution[i].weight;
      let bucket = weightBuckets.find(b => b[0] === weight);

      if (bucket) {
        bucket[1] += 1;
      } else {
        weightBuckets.push([weight, 1]);
      }
    }

    const coordinateArray = distribution.map(d => [d.x, d.y]);

    /* IDEA: Split distribution into multiple files (one for coords, one for weights?)*/

    /* IDEA: Instead of writing both coords, write the pixel index (width * y + x)
     * and then unwrap that on the client side (shaves off another ~100kbs).
     */

    fs.writeFile(
      "./assets/distribution.js",
      "const distribution = " +
        JSON.stringify({
          coords: coordinateArray,
          wtBkts: weightBuckets,
          invSize: [1 / this.width, 1 / this.height]
        }),
      err => {
        if (err) {
          console.log(err);
        } else {
          console.log("Finished");
        }
      }
    );
  });
