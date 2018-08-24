import 'chart.js';
import './../outerLabels';

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
        color: '#565d64',
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

function newConfig(data) {
  const c = JSON.parse(JSON.stringify(config));
  c.data.datasets[0].data = data;
  return c;
}

window.onload = function() {
  const ctx1 = document.getElementById('chart-area1').getContext('2d');
  new Chart(ctx1, newConfig([85, 2, 8, 20]));

  const ctx2 = document.getElementById('chart-area2').getContext('2d');
  new Chart(ctx2, newConfig([16, 2, 2, 42]));

  const ctx3 = document.getElementById('chart-area3').getContext('2d');
  new Chart(ctx3, newConfig([500, 100, 12000]));

  const ctx4 = document.getElementById('chart-area4').getContext('2d');
  new Chart(ctx4, newConfig([50, 50]));
};
