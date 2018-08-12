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
    let lastY = 0;
    this.points = [];
    // this.angles = [];
    for (let i = 0; i < count; ++i) {
      const angle = Math.radians(i * (360 / count)) - Math.radians(90);
      const x = view.x + (view.outerRadius + this.offset) * Math.cos(angle);
      const y = view.y + (view.outerRadius + this.offset) * Math.sin(angle);

      if (lastY - y > this.safeHeight || y - lastY > this.safeHeight) {
        this.points.push({
          x: view.x + (view.outerRadius + this.offset) * Math.cos(angle),
          y: view.y + (view.outerRadius + this.offset) * Math.sin(angle),
          angle,
        });

        // this.angles.push(angle);

        // console.log(Math.degrees(angle))
        lastY = y;
      }
    }

    // console.log(this.angles);
    const labels = this.resolve(dataset, meta);

    // for (let i = 0; i < meta.data.length; ++i) {
    //   this.draw(dataset, meta, i);
    // }
    for (let i = 0; i < labels.length; ++i) {
      this.draw2(meta, labels[i], i);
    }
  }

  resolve(dataset, meta) {
    const first = {};
    const second = [];

    for (let i = 0; i < meta.data.length; ++i) {
      var element = meta.data[i];
      var view = element._view;
      var value = dataset.data[i];
      var label = this.chart.config.data.labels[i];

      const a = (view.endAngle - view.startAngle) / 2;
      const segmentAngle = view.startAngle + a;
      let p = this.closest(this.points, segmentAngle);
      const index = this.points.indexOf(p);

      const labelPoint = {
        ...p,
        label,
        value,
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

    // For each point
    const keys = Object.keys(first);
    for (let i = 0; i < keys.length; ++i) {
      const item = first[keys[i]];

      // If it has collisions
      if (item && item.length > 1) {
        second.push(item[item.length - 1]);

        // Place each colision somewhere else
        for (let j = item.length - 2; j >= 0; --j) {
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

    console.log(second);
    return second;
  }

  draw2(meta, point, i) {
    var ctx = this.ctx;
    var element = meta.data[i];
    var view = element._view;
    var value = point.value;
    var label = point.label;

    if (view.circumference === 0 && !this.showZero) {
      return;
    }

    ctx.save();
    ctx.fillStyle = '#FF0000';
    for (let i = 0; i < this.points.length; ++i) {
      ctx.fillRect(this.points[i].x - 1, this.points[i].y - 1, 2, 2);
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
    return arr.reduce((prev, curr) => {
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
