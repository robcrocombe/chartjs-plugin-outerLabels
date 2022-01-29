import { ArcProps, Chart, ChartDataset, ChartMeta } from 'chart.js';
import { fontString } from 'chart.js/helpers';

interface ChartItem {
  value?: number;
  label?: string;
}

export interface OuterLabelsConfig {
  offset?: number;
  padding?: number;
  fontNormalColor?: string;
  fontNormalSize?: number;
  fontNormalFamily?: string;
  fontBoldColor?: string;
  fontBoldSize?: number;
  fontBoldFamily?: string;
  fontNormalStyle?: string;
  fontBoldStyle?: string;
  twoLines?: boolean;
  debug?: boolean;
  formatter?: (item: ChartItem) => string;
}

interface Point {
  x: number;
  y: number;
  angle: number;
  segmentAngle?: number;
  index?: number;
  taken?: boolean;
  label?: string;
  middle?: boolean;
}

// Extend chart.js types with outerLabels plugin
declare module 'chart.js' {
  interface Chart {
    outerLabels: OuterLabels;
  }

  interface PluginOptionsByType<TType extends ChartType> {
    outerLabels?: OuterLabelsConfig | false;
  }
}

class OuterLabels {
  private chart: Chart<'doughnut'>;
  private config: OuterLabelsConfig;
  private ctx: CanvasRenderingContext2D;
  private meta: ChartMeta;
  private points: Point[];
  private model: Point[];

  public init(chartInstance: Chart) {
    this.chart = chartInstance as Chart<'doughnut'>;
    this.ctx = chartInstance.ctx;
  }

  public configure(override: OuterLabelsConfig) {
    this.config = {
      offset: 3,
      padding: 2,
      fontNormalColor: Chart.defaults.color as string,
      fontNormalSize: Chart.defaults.font.size,
      fontNormalFamily: Chart.defaults.font.family,
      fontBoldColor: Chart.defaults.color as string,
      fontBoldSize: Chart.defaults.font.size + 2,
      fontBoldFamily: Chart.defaults.font.family,
      fontNormalStyle: '400',
      fontBoldStyle: '600',
      twoLines: false,
      debug: false,
      formatter: n => `${n.value} ${n.label}`,
      ...override,
    };
  }

  public resolveDataset() {
    const dataset = this.chart.config.data.datasets[0];
    const view = this.chart.getDatasetMeta(0);
    this.meta = view;
    this.points = [];

    this.generatePoints(view.data[0] as any);

    if (!this.points.length) {
      if (this.config.debug) {
        console.error('Unable to generate label anchor points.');
      }
      return;
    }

    if (this.points.length < this.chart.config.data.labels.length) {
      if (this.config.debug) {
        console.error('Too many labels to fit into the available anchor points.');
      }
      return;
    }

    this.model = this.resolve(dataset, view);
  }

  public generatePoints(view: ArcProps) {
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
        n += (this.config.fontNormalSize + this.config.padding) * 2;
      } else {
        n += this.config.fontNormalSize + this.config.padding;
      }
      line.p1.y = n;
      line.p2.y = n;
    }

    // Flag that the middle points can be vertically centred
    const leftMiddleIndex = Math.round((left.length - 1) / 2);
    const rightMiddleIndex = Math.round((right.length - 1) / 2);
    if (left[leftMiddleIndex]) {
      left[leftMiddleIndex].middle = true;
    }
    if (right[rightMiddleIndex]) {
      right[rightMiddleIndex].middle = true;
    }

    this.points = [...left, ...right];
  }

  // Source: https://stackoverflow.com/a/37225895
  public intersectCircleLine(circle, line) {
    let a, b, c, u1, u2, ret, retP1, retP2, v1, v2;
    v1 = {};
    v2 = {};
    v1.x = line.p2.x - line.p1.x;
    v1.y = line.p2.y - line.p1.y;
    v2.x = line.p1.x - circle.center.x;
    v2.y = line.p1.y - circle.center.y;
    a = v1.x * v2.x + v1.y * v2.y;
    b = 2 * (v1.x * v1.x + v1.y * v1.y);
    a *= -2;
    c = Math.sqrt(a * a - 2 * b * (v2.x * v2.x + v2.y * v2.y - circle.radius * circle.radius));
    if (isNaN(c)) {
      // No intercept
      return [];
    }
    u1 = (a - c) / b; // These represent the unit distance of point one and two on the line
    u2 = (a + c) / b;
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

  public resolve(dataset: ChartDataset<'doughnut'>, meta: ChartMeta) {
    const labels = [];

    // Match each chart segment to a point
    for (let i = 0; i < meta.data.length; ++i) {
      const view: ArcProps = meta.data[i] as any;

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
        label: this.chart.config.data.labels[i] as string,
        value: dataset.data[i],
      });
    }

    return labels;
  }

  public getAngle(origin, point) {
    let angle = Math.atan2(point.y - origin.y, point.x - origin.x);

    if (angle < this.radians(-90)) {
      angle += this.radians(360);
    }

    return angle;
  }

  public drawLabels() {
    for (let i = 0; i < this.model.length; ++i) {
      if (this.config.twoLines) {
        this.drawDoubleLine(this.meta.data[i] as any, this.model[i]);
      } else {
        this.drawSingleLine(this.meta.data[i] as any, this.model[i]);
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

  public drawDoubleLine(view: ArcProps, point: Point) {
    const ctx = this.ctx;
    const index = point.label.indexOf(' ');
    const value = point.label.substring(0, index);
    const label = point.label.substring(index + 1);

    if (view.circumference === 0) {
      return;
    }

    ctx.font = fontString(
      this.config.fontNormalSize,
      this.config.fontNormalStyle,
      this.config.fontNormalFamily
    );
    const labelWidth = ctx.measureText(' ' + label).width;
    const startX = point.x;
    let valueX, valueY, labelX, labelY;

    ctx.fillStyle = this.config.fontBoldColor;
    ctx.font = fontString(
      this.config.fontBoldSize,
      this.config.fontBoldStyle,
      this.config.fontBoldFamily
    );
    const valueWidth = ctx.measureText(value + ' ').width;

    // Calculate drawing origin
    if (point.middle) {
      ctx.textBaseline = 'middle';
      valueY = point.y - this.config.fontNormalSize / 2;
      labelY = point.y + this.config.fontNormalSize / 2;
    } else if (point.y < view.y) {
      ctx.textBaseline = 'alphabetic';
      valueY = point.y - this.config.fontNormalSize;
      labelY = point.y;
    } else {
      ctx.textBaseline = 'hanging';
      valueY = point.y;
      labelY = point.y + this.config.fontBoldSize;
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
    ctx.fillStyle = this.config.fontNormalColor;
    ctx.font = fontString(
      this.config.fontNormalSize,
      this.config.fontNormalStyle,
      this.config.fontNormalFamily
    );
    ctx.fillText(label, labelX, labelY);

    ctx.restore();
  }

  public drawSingleLine(view: ArcProps, point: Point) {
    const ctx = this.ctx;
    const index = point.label.indexOf(' ');
    const value = point.label.substring(0, index);
    const label = point.label.substring(index + 1);

    if (view.circumference === 0) {
      return;
    }

    ctx.font = fontString(
      this.config.fontNormalSize,
      this.config.fontNormalStyle,
      this.config.fontNormalFamily
    );
    const labelWidth = ctx.measureText(' ' + label).width;
    const startX = point.x;
    let valueX, labelX;

    ctx.fillStyle = this.config.fontBoldColor;
    ctx.font = fontString(
      this.config.fontBoldSize,
      this.config.fontBoldStyle,
      this.config.fontBoldFamily
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
    ctx.fillStyle = this.config.fontNormalColor;
    ctx.font = fontString(
      this.config.fontNormalSize,
      this.config.fontNormalStyle,
      this.config.fontNormalFamily
    );
    ctx.fillText(label, labelX, point.y);

    ctx.restore();
  }

  public closest(arr, goal) {
    const filtered = arr.filter(n => !n.taken);

    return filtered.reduce((prev, curr) => {
      return Math.abs(curr.angle - goal) < Math.abs(prev.angle - goal) ? curr : prev;
    });
  }

  public radians(degrees) {
    return (degrees * Math.PI) / 180;
  }

  public degrees(radians) {
    return (radians * 180) / Math.PI;
  }
}

Chart.register({
  id: 'outerLabels',
  beforeInit: chart => {
    if (chart.options.plugins?.outerLabels) {
      chart.outerLabels = new OuterLabels();
      chart.outerLabels.init(chart);
      chart.outerLabels.configure(chart.options.plugins?.outerLabels);
    }
  },
  afterDatasetsDraw: chart => {
    if (chart.outerLabels && chart.config.data.datasets[0]) {
      chart.outerLabels.resolveDataset();
      chart.outerLabels.drawLabels();
    }
  },
  // Disable scriptable options, i.e. formatter should be a callback
  // (not in the TS types for some reason)
  descriptors: {
    _indexable: false,
    _scriptable: false,
  } as any,
});
