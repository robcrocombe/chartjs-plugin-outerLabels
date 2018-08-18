import 'chart.js';

if (module.hot) {
  module.hot.dispose(() => {
    window.location.reload();
  });
}

class OutLabels {
  init(chartInstance) {
    this.chart = chartInstance;
    this.ctx = chartInstance.chart.ctx;
  }

  configure(override) {
    this.config = {
      offset: 3,
      padding: 2,
      color: '#565d64',
      fontSize: Chart.defaults.global.defaultFontSize,
      fontFamily: Chart.defaults.global.defaultFontFamily,
      fontNormalStyle: 400,
      fontBoldStyle: 600,
      formatter: n => `${n.value} ${n.label}`,
      ...override,
    };
  }

  resolveDataset(dataset) {
    const meta = dataset._meta[Object.keys(dataset._meta)[0]];
    const element = meta.data[0];
    const view = element._view;
    this.meta = meta;
    this.points = [];

    this.generatePoints(view);

    if (!this.points.length) {
      if (this.debug) {
        console.error('Unable to generate label anchor points.');
      }
      return;
    }

    if (this.points.length < this.chart.config.data.labels) {
      if (this.debug) {
        console.error('Too many labels to fit into the available anchor points.');
      }
      return;
    }

    this.model = this.resolve(dataset, meta);
  }

  generatePoints(view) {
    const startY = view.y - (view.outerRadius + this.config.offset);
    const endY = view.y + (view.outerRadius + this.config.offset);
    let n = startY + 1;

    const right = [];
    const left = [];

    const line = {
      p1: { x: 0, y: n },
      p2: { x: 999, y: n },
    };
    const circle = {
      radius: view.outerRadius + this.config.offset,
      center: { x: view.x, y: view.y },
    };

    while (n < endY && n < 1000) {
      const intersection = this.intersectCircleLine(circle, line);

      for (let i = 0; i < intersection.length; ++i) {
        const point = intersection[i];
        const angle = this.getAngle(view, point);

        const data = {
          x: point.x,
          y: point.y,
          angle,
        };

        if (i % 2 === 0) {
          left.push(data);
        } else {
          right.push(data);
        }
      }

      n += this.config.fontSize + this.config.padding;
      line.p1.y = n;
      line.p2.y = n;
    }

    // Flag that the middle points can be vertically centred
    const leftMiddleIndex = (left.length - 1) / 2;
    const rightMiddleIndex = (right.length - 1) / 2;
    if (left[leftMiddleIndex]) {
      left[leftMiddleIndex].middle = true;
    }
    if (right[rightMiddleIndex]) {
      right[rightMiddleIndex].middle = true;
    }

    this.points = [...left, ...right];
  }

  // Source: https://stackoverflow.com/a/37225895
  intersectCircleLine(circle, line) {
    let a, b, c, d, u1, u2, ret, retP1, retP2, v1, v2;
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
      // No intercept
      return [];
    }
    u1 = (b - d) / c; // These represent the unit distance of point one and two on the line
    u2 = (b + d) / c;
    retP1 = {}; // Return points
    retP2 = {};
    ret = []; // Return array
    if (u1 <= 1 && u1 >= 0) {
      // Add point if on the line segment
      retP1.x = line.p1.x + v1.x * u1;
      retP1.y = line.p1.y + v1.y * u1;
      ret[0] = retP1;
    }
    if (u2 <= 1 && u2 >= 0) {
      // Second add point if on the line segment
      retP2.x = line.p1.x + v1.x * u2;
      retP2.y = line.p1.y + v1.y * u2;
      ret[ret.length] = retP2;
    }
    return ret;
  }

  resolve(dataset, meta) {
    const labels = [];

    for (let i = 0; i < meta.data.length; ++i) {
      const element = meta.data[i];
      const view = element._view;

      const a = (view.endAngle - view.startAngle) / 2;
      const segmentAngle = view.startAngle + a;

      const p = this.closest(this.points, segmentAngle);
      const index = this.points.indexOf(p);

      const labelPoint = {
        ...p,
        segmentAngle,
        index,
      };

      this.points[index].taken = true;

      labels.push(labelPoint);
    }

    // Add labels
    labels.sort((a, b) => a.angle - b.angle);
    for (let i = 0; i < labels.length; ++i) {
      labels[i].label = this.config.formatter({
        label: this.chart.config.data.labels[i],
        value: dataset.data[i],
      });
    }

    return labels;
  }

  getAngle(origin, point) {
    let a = Math.atan2(point.y - origin.y, point.x - origin.x);

    if (a < this.radians(-90)) {
      a += this.radians(360);
    }

    return a;
  }

  drawLabels() {
    for (let i = 0; i < this.model.length; ++i) {
      this.draw(this.meta.data[i], this.model[i]);
    }

    if (this.debug) {
      this.ctx.save();
      this.ctx.fillStyle = '#ff0000';
      for (let i = 0; i < this.points.length; ++i) {
        this.ctx.fillRect(this.points[i].x - 1, this.points[i].y - 1, 2, 2);
      }
      this.ctx.restore();
    }
  }

  draw(element, point) {
    const ctx = this.ctx;
    const view = element._view;
    const parts = point.label.split(' ');
    const value = parts[0];
    const label = parts[1];

    if (view.circumference === 0) {
      return;
    }

    ctx.font = Chart.helpers.fontString(
      this.config.fontSize,
      this.config.fontNormalStyle,
      this.config.fontFamily
    );
    const labelWidth = ctx.measureText(' ' + label).width;
    const startX = point.x;
    let valueX, labelX;

    ctx.fillStyle = this.config.color;
    ctx.font = Chart.helpers.fontString(
      this.config.fontSize,
      this.config.fontBoldStyle,
      this.config.fontFamily
    );
    const valueWidth = ctx.measureText(value + ' ').width;

    if (point.middle) {
      ctx.textBaseline = 'middle';
    } else if (point.y < view.y) {
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

    // Value
    ctx.fillText(value, valueX, point.y);

    // Label
    ctx.font = Chart.helpers.fontString(
      this.config.fontSize,
      this.config.fontNormalStyle,
      this.config.fontFamily
    );
    ctx.fillText(label, labelX, point.y);

    ctx.restore();
  }

  closest(arr, goal) {
    const filtered = arr.filter(n => !n.taken);

    return filtered.reduce((prev, curr) => {
      return Math.abs(curr.angle - goal) < Math.abs(prev.angle - goal) ? curr : prev;
    });
  }

  radians(degrees) {
    return degrees * Math.PI / 180;
  }

  degrees(radians) {
    return radians * 180 / Math.PI;
  }
}

const ol = new OutLabels();

Chart.pluginService.register({
  id: 'outerLabels',
  beforeInit: (chartInstance, options) => {
    ol.init(chartInstance);
    ol.configure(options);
  },
  afterDatasetsDraw: chartInstance => {
    const dataset = chartInstance.config.data.datasets[0];
    ol.resolveDataset(dataset);
    ol.drawLabels(dataset);
  },
});

Chart.defaults.global.defaultFontFamily = '-apple-system, BlinkMacSystemFont, sans-serif';
Chart.defaults.global.defaultFontSize = 12;

window.chartColors = {
  red: 'rgb(255, 99, 132)',
  orange: 'rgb(255, 159, 64)',
  yellow: 'rgb(255, 205, 86)',
  green: 'rgb(101, 186, 105)',
  blue: 'rgb(54, 162, 235)',
  purple: 'rgb(153, 102, 255)',
  grey: 'rgb(201, 203, 207)',
};

const config = {
  options: {
    plugins: {
      outerLabels: {
        fontSize: 14,
      },
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
    events: [],
  },
  type: 'doughnut',
  data: {
    datasets: [
      {
        data: [85, 2, 8, 20],
        // data: [2, 2, 2, 85],
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
  const ctx = document.getElementById('chart-area').getContext('2d');
  window.myDoughnut = new Chart(ctx, config);
};
