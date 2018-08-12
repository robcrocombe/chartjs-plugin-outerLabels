import 'chart.js';

if (module.hot) {
  module.hot.dispose(() => {
    window.location.reload();
  });
}

Math.radians = function(degrees) {
  return degrees * Math.PI / 180;
};

Math.degrees = function(radians) {
  return radians * 180 / Math.PI;
};

class OutLabels {
  init(chartInstance) {
    this.chart = chartInstance;
    this.ctx = chartInstance.chart.ctx;
    this.offset = 3;
    this.fontSize = 12;
    this.safeHeight = 12;
    this.fontFamily = '-apple-system, BlinkMacSystemFont, sans-serif';
    this.fontNormalStyle = 400;
    this.fontBoldStyle = 500;
  }

  drawDataset(dataset) {
    var meta = dataset._meta[Object.keys(dataset._meta)[0]];

    const element = meta.data[0];
    const view = element._view;
    const count = 48;
    this.points = [];

    // for (let i = 0; i < meta.data.length; ++i) {
    //   const element = meta.data[i];
    //   console.log(Math.degrees(element._view.startAngle) + 90, Math.degrees(element._view.endAngle) + 90);
    // }
    // return;

    this.newPoints(view);

    // console.log(this.points);

    // console.log('-----');
    // this.oldPoints(count, view);

    // console.log(this.angles);
    const labels = this.resolve(dataset, meta);

    // for (let i = 0; i < meta.data.length; ++i) {
    //   this.draw(dataset, meta, i);
    // }
    for (let i = 0; i < labels.length; ++i) {
      this.draw2(meta, labels[i], i);
    }
  }

  newPoints(view) {
    const startY = view.y - view.outerRadius;
    const endY = view.y + view.outerRadius;
    let n = startY;

    const right = [];
    const left = [];

    const line = {
      p1: { x: 0, y: n },
      p2: { x: 999, y: n },
    };
    const circle = {
      radius: view.outerRadius,
      center: { x: view.x, y: view.y },
    };

    while (n < endY && n < 1000) {
      const intersection = this.intersectCircleLine(circle, line);

      // console.log(intersection);

      for (let i = 0; i < intersection.length; ++i) {
        const point = intersection[i];
        let angle = this.getAngle(view, point);
        // console.log(angle);
        // angle = Math.abs((Math.PI*2) - angle); // Invert rotation

        // angle -= Math.radians(360 + 180);

        // if (i % 2 === 0) {
        //   angle -= 180;
        // } else {
        //   angle +=
        // }

        const data = {
          x: point.x,
          y: point.y,
          angle,
          degrees: Math.degrees(angle),
        };

        if (i % 2 === 0) {
          left.push(data);
        } else {
          right.push(data);
        }
      }

      n += this.fontSize;
      line.p1.y = n;
      line.p2.y = n;
    }

    const newp = [...left, ...right];

    newp.splice(0, 1);

    // newp.sort((a, b) => a.angle - b.angle);

    this.points = newp;
  }

  intersectCircleLine(circle, line) {
    var a, b, c, d, u1, u2, ret, retP1, retP2, v1, v2;
    v1 = {};
    v2 = {};
    v1.x = line.p2.x - line.p1.x;
    v1.y = line.p2.y - line.p1.y;
    v2.x = line.p1.x - circle.center.x;
    v2.y = line.p1.y - circle.center.y;
    b = v1.x * v2.x + v1.y * v2.y;
    c = 2 * (v1.x * v1.x + v1.y * v1.y);
    b *= -2;
    d = Math.sqrt(b * b - 2 * c * (v2.x * v2.x + v2.y * v2.y - circle.radius * circle.radius));
    if (isNaN(d)) {
      // no intercept
      return [];
    }
    u1 = (b - d) / c; // these represent the unit distance of point one and two on the line
    u2 = (b + d) / c;
    retP1 = {}; // return points
    retP2 = {};
    ret = []; // return array
    if (u1 <= 1 && u1 >= 0) {
      // add point if on the line segment
      retP1.x = line.p1.x + v1.x * u1;
      retP1.y = line.p1.y + v1.y * u1;
      ret[0] = retP1;
    }
    if (u2 <= 1 && u2 >= 0) {
      // second add point if on the line segment
      retP2.x = line.p1.x + v1.x * u2;
      retP2.y = line.p1.y + v1.y * u2;
      ret[ret.length] = retP2;
    }
    return ret;
  }

  // const intersection = this.intersect(view.outerRadius, view.x, view.y, 0, n);
  intersect(r, h, k, m, n) {
    // circle: (x - h)^2 + (y - k)^2 = r^2
    // line: y = m * x + n
    // r: circle radius
    // h: x value of circle centre
    // k: y value of circle centre
    // m: slope
    // n: y-intercept

    // Get a, b, c values
    var a = 1 + this.sq(m);
    var b = -h * 2 + m * (n - k) * 2;
    var c = this.sq(h) + this.sq(n - k) - this.sq(r);

    // Get discriminant
    var d = this.sq(b) - 4 * a * c;
    if (d >= 0) {
      // Insert into quadratic formula
      var intersections = [
        (-b + Math.sqrt(this.sq(b) - 4 * a * c)) / (2 * a),
        (-b - Math.sqrt(this.sq(b) - 4 * a * c)) / (2 * a),
      ];
      if (d == 0) {
        // Only 1 intersection
        return [intersections[0]];
      }
      return intersections;
    }
    // No intersection
    return [];
  }

  sq(x) {
    return x * x;
  }

  oldPoints(count, view) {
    const p = [];
    let lastY = 0;

    for (let i = 0; i < count; ++i) {
      const angle = Math.radians(i * (360 / count)) - Math.radians(90);
      const x = view.x + (view.outerRadius + this.offset) * Math.cos(angle);
      const y = view.y + (view.outerRadius + this.offset) * Math.sin(angle);

      if (lastY - y > this.safeHeight || y - lastY > this.safeHeight) {
        p.push({
          x,
          y,
          angle,
        });

        // console.log(Math.atan2(y - view.y, x - view.x));

        // this.angles.push(angle);
        // console.log(Math.degrees(angle));
        lastY = y;
      }
    }
  }

  resolve(dataset, meta) {
    const first = {};
    const second = [];

    for (let i = 0; i < meta.data.length; ++i) {
      var element = meta.data[i];
      var view = element._view;

      const a = (view.endAngle - view.startAngle) / 2;
      const segmentAngle = view.startAngle + a;

      let p = this.closest(this.points, segmentAngle);
      const index = this.points.indexOf(p);

      const labelPoint = {
        ...p,
        segmentAngle,
        index,
      };

      this.points[index].taken = true;

      if (first[index]) {
        first[index].push(labelPoint);
      } else {
        first[index] = [labelPoint];
      }
    }

    console.log(this.points);

    // For each point
    const keys = Object.keys(first);
    for (let i = 0; i < keys.length; ++i) {
      const item = first[keys[i]];

      // If it has collisions
      if (item && item.length > 1) {
        second.push(item[0]);

        // Place each colision somewhere else
        // for (let j = item.length - 2; j >= 0; --j) {
        for (let j = 1; j < item.length; ++j) {
          const labelPoint = item[j];

          let p = this.closest(this.points, labelPoint.segmentAngle);

          // if (labelPoint.label === 'Yellow' || labelPoint.label === 'Blue') {
          //   console.log(p);
          // }

          if (p) {
            this.points[this.points.indexOf(p)].taken = true;

            second.push({
              ...labelPoint,
              ...p,
              index: this.points.indexOf(p),
            });
          }
        }
      } else {
        second.push(item[0]);
      }
    }

    for (let i = 0; i < second.length; ++i) {
      second[i].label = this.chart.config.data.labels[second.length - i - 1];
      second[i].value = dataset.data[second.length - i - 1];
    }

    console.log(second);
    return second;
  }

  getAngle(origin, point) {
    let a = Math.atan2(point.y - origin.y, point.x - origin.x);

    if (a < Math.radians(-90)) {
      a += Math.radians(360);
    }

    return a;
  }

  draw2(meta, point, i) {
    var ctx = this.ctx;
    var element = meta.data[i];
    var view = element._view;
    var value = point.value;
    var label = point.label;
    // label += ` (${point.x.toFixed(2)},${point.y.toFixed(2)},${Math.round(point.degrees)})`

    if (view.circumference === 0 && !this.showZero) {
      return;
    }

    ctx.save();
    ctx.fillStyle = '#000000';
    for (let i = 0; i < this.points.length; ++i) {
      // ctx.fillRect(this.points[i].x - 1, this.points[i].y - 1, 2, 2);
      // ctx.fillText(Math.round(this.points[i].degrees), this.points[i].x - 1, this.points[i].y - 1);
    }

    ctx.font = Chart.helpers.fontString(this.fontSize, this.fontNormalStyle, this.fontFamily);
    const labelWidth = ctx.measureText(' ' + label).width;
    const startX = point.x;
    let valueX, labelX;

    ctx.fillStyle = '#565d64';
    ctx.font = Chart.helpers.fontString(this.fontSize, this.fontBoldStyle, this.fontFamily);
    const valueWidth = ctx.measureText(value + ' ').width;

    if (point.y < view.y) {
      ctx.textBaseline = 'alphabetic';
    } else {
      ctx.textBaseline = 'hanging';
    }
    if (point.x < view.x) {
      ctx.textAlign = 'right';
      valueX = startX - labelWidth;
      labelX = startX;
    } else {
      ctx.textAlign = 'left';
      valueX = startX;
      labelX = startX + valueWidth;
    }

    // Score
    ctx.fillText(value, valueX, point.y);

    // Action
    ctx.font = Chart.helpers.fontString(this.fontSize, this.fontNormalStyle, this.fontFamily);
    ctx.fillText(label, labelX, point.y);

    ctx.restore();
  }

  draw(dataset, meta, i) {
    var ctx = this.ctx;
    var element = meta.data[i];
    var view = element._view;
    var value = dataset.data[i];
    var label = this.chart.config.data.labels[i];
    var text = `${value} ${label}`;

    if (view.circumference === 0 && !this.showZero) {
      return;
    }
    // console.log(text, view);

    ctx.save();
    ctx.fillStyle = '#FF0000';
    // ctx.font = `${this.fontSize}px Verdana`;
    // ctx.fillRect(view.x - 1, view.y - 1, 2, 2);
    for (let i = 0; i < this.points.length; ++i) {
      // if (this.points[i].x < view.x) {
      //   ctx.textAlign = 'right';
      // } else {
      //   ctx.textAlign = 'left';
      // }
      // if (this.points[i].y < view.y) {
      //   ctx.textBaseline = 'alphabetic';
      // } else {
      //   ctx.textBaseline = 'hanging';
      // }

      ctx.fillRect(this.points[i].x - 1, this.points[i].y - 1, 2, 2);
      // ctx.fillText('Hello there', this.points[i].x, this.points[i].y);
    }
    const a = (view.endAngle - view.startAngle) / 2;
    // console.log(view.endAngle - view.startAngle);
    const point = this.closest(this.points, view.startAngle + a);

    // while (this.taken[p] && p < this.angles.length - 1) {
    //   p++;
    // }

    // this.angles.splice(p, 1);

    // ctx.fillRect(this.points[p].x - 1, this.points[p].y - 1, 2, 2);
    // ctx.fillText(text, this.points[p].x, this.points[p].y);

    ctx.font = Chart.helpers.fontString(this.fontSize, this.fontNormalStyle, this.fontFamily);
    const labelWidth = ctx.measureText(' ' + label).width;
    const startX = point.x;
    let valueX, labelX;

    ctx.fillStyle = '#565d64';
    ctx.font = Chart.helpers.fontString(this.fontSize, this.fontBoldStyle, this.fontFamily);
    const valueWidth = ctx.measureText(value + ' ').width;

    if (point.y < view.y) {
      ctx.textBaseline = 'alphabetic';
    } else {
      ctx.textBaseline = 'hanging';
    }
    if (point.x < view.x) {
      ctx.textAlign = 'right';
      valueX = startX - labelWidth;
      labelX = startX;
    } else {
      ctx.textAlign = 'left';
      valueX = startX;
      labelX = startX + valueWidth;
    }

    // Score
    ctx.fillText(value, valueX, point.y);

    // Action
    // const scoreWidth = ctx.measureText(value + ' ').width;
    ctx.font = Chart.helpers.fontString(this.fontSize, this.fontNormalStyle, this.fontFamily);
    ctx.fillText(label, labelX, point.y);

    ctx.restore();
  }

  closest(arr, goal) {
    const filtered = arr.filter(n => !n.taken);

    return filtered.reduce((prev, curr) => {
      return Math.abs(curr.angle - goal) < Math.abs(prev.angle - goal) ? curr : prev;
    });
  }
}

var ol = new OutLabels();

Chart.pluginService.register({
  id: 'outLabels',
  afterDatasetsDraw: chartInstance => {
    ol.init(chartInstance);
    chartInstance.config.data.datasets.forEach(ol.drawDataset.bind(ol));
  },
});

window.chartColors = {
  red: 'rgb(255, 99, 132)',
  orange: 'rgb(255, 159, 64)',
  yellow: 'rgb(255, 205, 86)',
  green: 'rgb(75, 192, 192)',
  blue: 'rgb(54, 162, 235)',
  purple: 'rgb(153, 102, 255)',
  grey: 'rgb(201, 203, 207)',
};

var config = {
  options: {
    plugins: {
      outLabels: {},
    },
    tooltips: {
      enabled: false,
    },
    responsive: true,
    animation: false,
    legend: false,
    layout: {
      padding: 30,
    },
  },
  type: 'doughnut',
  data: {
    datasets: [
      {
        data: [85, 10, 2, 2],
        // data: [2, 2, 10, 85],
        backgroundColor: [
          window.chartColors.red,
          window.chartColors.yellow,
          window.chartColors.blue,
          window.chartColors.green,
        ],
        label: 'Dataset 1',
      },
    ],
    labels: ['Red', 'Yellow', 'Blue', 'Green'],
  },
};

window.onload = function() {
  var ctx = document.getElementById('chart-area').getContext('2d');
  window.myDoughnut = new Chart(ctx, config);
};
