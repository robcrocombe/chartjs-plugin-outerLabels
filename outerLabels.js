import Chart from 'chart.js';

class OutLabels {
  init(chartInstance) {
    this.chart = chartInstance;
    this.ctx = chartInstance.chart.ctx;
  }

  configure(override) {
    this.config = {
      offset: 3,
      padding: 2,
      fontColor: Chart.defaults.global.defaultFontColor,
      fontSize: Chart.defaults.global.defaultFontSize,
      fontFamily: Chart.defaults.global.defaultFontFamily,
      fontNormalStyle: 400,
      fontBoldStyle: 600,
      twoLines: false,
      debug: false,
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
      if (this.config.debug) {
        console.error('Unable to generate label anchor points.');
      }
      return;
    }

    if (this.points.length < this.chart.config.data.labels) {
      if (this.config.debug) {
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

      if (this.config.twoLines) {
        n += (this.config.fontSize + this.config.padding) * 2;
      } else {
        n += this.config.fontSize + this.config.padding;
      }
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

    // Match each chart segment to a point
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
    let angle = Math.atan2(point.y - origin.y, point.x - origin.x);

    if (angle < this.radians(-90)) {
      angle += this.radians(360);
    }

    return angle;
  }

  drawLabels() {
    for (let i = 0; i < this.model.length; ++i) {
      if (this.config.twoLines) {
        this.drawDoubleLine(this.meta.data[i], this.model[i]);
      } else {
        this.drawSingleLine(this.meta.data[i], this.model[i]);
      }
    }

    if (this.config.debug) {
      this.ctx.save();
      this.ctx.fillStyle = '#ff0000';
      for (let i = 0; i < this.points.length; ++i) {
        this.ctx.fillRect(this.points[i].x - 1, this.points[i].y - 1, 2, 2);
      }
      this.ctx.restore();
    }
  }

  drawDoubleLine(element, point) {
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
    let valueX, valueY, labelX, labelY;

    ctx.fillStyle = this.config.fontColor;
    ctx.font = Chart.helpers.fontString(
      this.config.fontSize + 2,
      this.config.fontBoldStyle,
      this.config.fontFamily
    );
    const valueWidth = ctx.measureText(value + ' ').width;

    // Calculate drawing origin
    if (point.middle) {
      ctx.textBaseline = 'middle';
      valueY = point.y - this.config.fontSize / 2;
      labelY = point.y + this.config.fontSize / 2;
    } else if (point.y < view.y) {
      ctx.textBaseline = 'alphabetic';
      valueY = point.y - this.config.fontSize;
      labelY = point.y;
    } else {
      ctx.textBaseline = 'hanging';
      valueY = point.y;
      labelY = point.y + this.config.fontSize;
    }
    if (point.x < view.x) {
      ctx.textAlign = 'right';
      valueX = startX;
      labelX = startX;
    } else {
      ctx.textAlign = 'left';
      valueX = startX;
      labelX = startX;
    }

    // Calculate text centering offset
    let centerOffset = (labelWidth - valueWidth) / 2;

    if (centerOffset < 0) {
      // Label is thinner than value
      centerOffset = Math.abs(centerOffset);

      if (point.x < view.x) {
        labelX -= centerOffset;
      } else {
        labelX += centerOffset;
      }
    } else {
      // Label is wider than value
      if (point.x < view.x) {
        valueX -= centerOffset;
      } else {
        valueX += centerOffset;
      }
    }

    // Draw value
    ctx.fillText(value, valueX, valueY);

    // Draw label
    ctx.font = Chart.helpers.fontString(
      this.config.fontSize,
      this.config.fontNormalStyle,
      this.config.fontFamily
    );
    ctx.fillText(label, labelX, labelY);

    ctx.restore();
  }

  drawSingleLine(element, point) {
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

    ctx.fillStyle = this.config.fontColor;
    ctx.font = Chart.helpers.fontString(
      this.config.fontSize,
      this.config.fontBoldStyle,
      this.config.fontFamily
    );
    const valueWidth = ctx.measureText(value + ' ').width;

    // Calculate drawing origin
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

    // Draw value
    ctx.fillText(value, valueX, point.y);

    // Draw label
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

Chart.pluginService.register({
  id: 'outerLabels',
  beforeInit: (chartInstance, options) => {
    chartInstance.outerLabels = new OutLabels();
    chartInstance.outerLabels.init(chartInstance);
    chartInstance.outerLabels.configure(options);
  },
  afterDatasetsDraw: chartInstance => {
    const dataset = chartInstance.config.data.datasets[0];
    chartInstance.outerLabels.resolveDataset(dataset);
    chartInstance.outerLabels.drawLabels(dataset);
  },
});
