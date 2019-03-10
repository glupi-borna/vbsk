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
    const invertedWidth = 1 / this.width;
    const invertedHeight = 1 / this.height;
    let totalBrightness = 0;
    for (var y = 0; y < this.height; y++) {
      for (var x = 0; x < this.width; x++) {
        const pixelIndex = (this.width * y + x) << 2;

        const pixelBrightness = this.data[pixelIndex];
        totalBrightness += pixelBrightness;

        distribution.push({
          x: x * invertedWidth,
          y: y * invertedHeight,
          weight: totalBrightness
        });
      }
    }

    for (let i = 0; i < distribution.length; i++) {
      distribution[i].weight /= totalBrightness;
    }

    const coordinateArray = distribution.map(d => [d.x, d.y]);
    const weightArray = distribution.map(d => d.weight);

    fs.writeFile(
      "./assets/distribution.js",
      "const distribution = " +
        JSON.stringify({ coords: coordinateArray, weight: weightArray }),
      err => {
        if (err) {
          console.log(err);
        } else {
          console.log("Finished");
        }
      }
    );
  });
