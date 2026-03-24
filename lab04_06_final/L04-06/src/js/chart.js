// src/js/chart.js
// D3 charting for Gradebook Explorer

(function attachGradeChart(global, d3Instance) {
    'use strict';

    const LETTERS = ['A', 'B', 'C', 'D', 'F'];
    const Y_TICKS = [0, 0.2, 0.4, 0.6, 0.8, 1];
    const MARGIN = { top: 30, right: 30, bottom: 80, left: 80 };
    const HEIGHT = 420;

    let chartWidth = 640;
    let svg;
    let chartGroup;
    let xScale;
    let yScale;
    let placeholder;
    let initialized = false;
    let innerWidth = 0;
    let innerHeight = 0;

    // Band scale fixes five buckets; linear scale stays 0–100% frequency
    const createScales = () => {
        xScale = d3Instance
            .scaleBand()
            .domain(LETTERS)
            .range([0, innerWidth])
            .padding(0.35);

        yScale = d3Instance.scaleLinear().domain([0, 1]).range([innerHeight, 0]).nice();
    };

    // Axes only render once; subsequent updates just adjust tick labels
    const createAxes = () => {
        const xAxis = d3Instance.axisBottom(xScale);
        const yAxis = d3Instance
            .axisLeft(yScale)
            .tickValues(Y_TICKS)
            .tickFormat(d3Instance.format('.0%'));

        chartGroup
            .append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0, ${innerHeight})`)
            .call(xAxis);

        chartGroup.append('g').attr('class', 'y-axis').call(yAxis);

        chartGroup
            .append('text')
            .attr('class', 'y-label')
            .attr('transform', 'rotate(-90)')
            .attr('x', -innerHeight / 2)
            .attr('y', -MARGIN.left + 15)
            .attr('text-anchor', 'middle')
            .attr('fill', '#111827')
            .text('Frequency');

        chartGroup
            .append('text')
            .attr('class', 'x-label')
            .attr('x', innerWidth / 2)
            .attr('y', innerHeight + 40)
            .attr('text-anchor', 'middle')
            .attr('fill', '#111827')
            .text('Letter Grade');
    };

    const updateAxes = () => {
        chartGroup
            .select('.y-axis')
            .transition()
            .duration(400)
            .call(
                d3Instance
                    .axisLeft(yScale)
                    .tickValues(Y_TICKS)
                    .tickFormat(d3Instance.format('.0%'))
            );
    };

    // Handles enter/update/exit for letter-grade bars with smooth transitions
    const drawBars = (dataset) => {
        const bars = chartGroup.selectAll('rect.bar').data(dataset, (d) => d.letter);

        bars
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', (d) => xScale(d.letter))
            .attr('y', innerHeight)
            .attr('width', xScale.bandwidth())
            .attr('height', 0)
            .attr('fill', '#111827')
            .transition()
            .duration(400)
            .attr('y', (d) => yScale(d.value))
            .attr('height', (d) => innerHeight - yScale(d.value));

        bars
            .transition()
            .duration(400)
            .attr('x', (d) => xScale(d.letter))
            .attr('width', xScale.bandwidth())
            .attr('y', (d) => yScale(d.value))
            .attr('height', (d) => innerHeight - yScale(d.value));

        bars
            .exit()
            .transition()
            .duration(200)
            .attr('y', innerHeight)
            .attr('height', 0)
            .remove();
    };

    // Creates the responsive SVG scaffold and draws placeholder bars
    const init = (containerSelector = '#chart') => {
        const container = d3Instance.select(containerSelector);
        container.selectAll('*').remove();

        placeholder = container
            .append('p')
            .attr('class', 'chart-placeholder')

        const rect = container.node().getBoundingClientRect();
        chartWidth = rect.width || container.node().offsetWidth || 640;
        innerWidth = Math.max(chartWidth - MARGIN.left - MARGIN.right, 360);
        innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;

        svg = container
            .append('svg')
            .attr('role', 'img')
            .attr('aria-label', 'Grade distribution (A–F)')
            .attr('width', '100%')
            .attr('height', HEIGHT)
            .attr('viewBox', `0 0 ${chartWidth} ${HEIGHT}`);

        chartGroup = svg
            .append('g')
            .attr('transform', `translate(${MARGIN.left}, ${MARGIN.top})`);

        createScales();
        createAxes();
        drawBars(LETTERS.map((letter) => ({ letter, value: 0 })));

        initialized = true;
    };

    // Recomputes dataset from Gradebook ratios and drives redraw
    const update = (frequencies) => {
        if (!initialized) return;

        const hasData = Boolean(frequencies && frequencies.total);
        placeholder.classed('is-hidden', hasData);

        const dataset = LETTERS.map((letter) => ({
            letter,
            value: hasData ? frequencies.ratios[letter] || 0 : 0
        }));

        yScale.domain([0, 1]).nice();
        updateAxes();
        drawBars(dataset);
    };

    global.GradeChart = {
        init,
        update
    };
})(window, d3);
