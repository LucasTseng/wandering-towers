/* 巫师飞塔 · 风格提案 — 四维评估雷达图 */
(function () {
  'use strict';

  var style = getComputedStyle(document.documentElement);
  var accent = style.getPropertyValue('--accent').trim();
  var accent2 = style.getPropertyValue('--accent2').trim();
  var muted = style.getPropertyValue('--muted').trim();
  var rule = style.getPropertyValue('--rule').trim();
  var ink = style.getPropertyValue('--ink').trim();

  var el = document.getElementById('chart-radar');
  if (!el || typeof echarts === 'undefined') return;

  var chart = echarts.init(el, null, { renderer: 'svg' });
  chart.setOption({
    animation: false,
    tooltip: { appendToBody: true },
    legend: {
      bottom: 0,
      textStyle: { color: muted, fontSize: 12 },
      itemWidth: 14,
      data: ['A 暖昼手绘', 'B 金蓝黄昏', 'C 实体桌游', 'D 三段卡通']
    },
    radar: {
      indicator: [
        { name: '还原原作', max: 5 },
        { name: '氛围沉浸', max: 5 },
        { name: '落地成本低', max: 5 },
        { name: '素材可得', max: 5 },
        { name: '风格差异化', max: 5 }
      ],
      radius: '62%',
      axisName: { color: ink, fontSize: 12.5, fontWeight: 600 },
      splitLine: { lineStyle: { color: rule } },
      splitArea: { show: true, areaStyle: { color: ['rgba(138,92,20,0.03)', 'rgba(47,90,134,0.03)'] } },
      axisLine: { lineStyle: { color: rule } }
    },
    series: [{
      type: 'radar',
      symbolSize: 4,
      data: [
        { name: 'A 暖昼手绘', value: [5, 3, 2, 3, 3], lineStyle: { color: accent2, width: 2 }, itemStyle: { color: accent2 }, areaStyle: { color: accent2 + '22' } },
        { name: 'B 金蓝黄昏', value: [3, 5, 5, 4, 3], lineStyle: { color: accent, width: 2 }, itemStyle: { color: accent }, areaStyle: { color: accent + '2e' } },
        { name: 'C 实体桌游', value: [3, 4, 3, 5, 4], lineStyle: { color: '#7a5c8c', width: 2 }, itemStyle: { color: '#7a5c8c' }, areaStyle: { color: '#7a5c8c22' } },
        { name: 'D 三段卡通', value: [2, 3, 3, 3, 5], lineStyle: { color: '#4e8a6a', width: 2 }, itemStyle: { color: '#4e8a6a' }, areaStyle: { color: '#4e8a6a22' } }
      ]
    }]
  });

  window.addEventListener('resize', function () { chart.resize(); });
})();
