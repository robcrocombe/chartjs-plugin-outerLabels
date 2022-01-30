import { ArcElement, Chart, DoughnutController } from 'chart.js';
import './../outerLabels';

// Reload page on code change
if (module.hot) {
  module.hot.dispose(() => {
    window.location.reload();
  });
}

Chart.register(ArcElement, DoughnutController);

Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, sans-serif';
Chart.defaults.font.size = 12;

const chartColors = {
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
        fontNormalSize: 14,
        fontNormalColor: '#565d64',
        fontBoldSize: 14,
        fontBoldColor: '#2e2e2e',
        // debug: true,
      },
      tooltip: {
        enabled: false,
      },
    },
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    legend: false,
    layout: {
      padding: 50,
    },
    events: [],
  },
  type: 'doughnut',
  data: {
    datasets: [
      {
        data: [2, 2, 2, 85],
        backgroundColor: [
          chartColors.red,
          chartColors.yellow,
          chartColors.blue,
          chartColors.green,
        ],
        label: 'Dataset 1',
      },
    ],
    labels: ['Red', 'Yellow', 'Blue', 'Green'],
  },
};

function newConfig(data: number[], twoLines?: boolean) {
  const c = JSON.parse(JSON.stringify(config));
  c.data.datasets[0].data = data;

  if (twoLines) {
    c.options.plugins.outerLabels.twoLines = true;
    c.options.plugins.outerLabels.fontBoldSize = 16;
  }

  return c;
}

function getCanvas(id: string): CanvasRenderingContext2D {
  return (document.getElementById(id) as HTMLCanvasElement).getContext('2d');
}

window.onload = function() {
  const ctx1 = getCanvas('chart-area1');
  new Chart(ctx1, newConfig([85, 2, 8, 20]));

  const ctx2 = getCanvas('chart-area2');
  new Chart(ctx2, newConfig([16, 2, 2, 42]));

  const ctx3 = getCanvas('chart-area3');
  new Chart(ctx3, newConfig([500, 100, 12000], true));

  const ctx4 = getCanvas('chart-area4');
  new Chart(ctx4, newConfig([50, 50]));
};
