const t = 800;

let allData = [];
let selectedCompany = null;
let selectedGroup = null;

const countries = ['South Korea', 'Japan', 'China', 'USA', 'Thailand', 'Taiwan', 'Hong Kong', 'Canada'];
const colorScale = d3.scaleOrdinal(countries, d3.schemeSet2);

const companyColorScale = d3.scaleOrdinal(d3.schemeDark2);

const bubbleMargin = { top: 50, right: 30, bottom: 50, left: 60 };
const bubbleWidth  = 850 - bubbleMargin.left - bubbleMargin.right;
const bubbleHeight = 600 - bubbleMargin.top  - bubbleMargin.bottom;

const bubbleContainer = d3.select('#bubble-vis');
const bubbleSvgEl = bubbleContainer.append('svg')
    .attr('width',  bubbleWidth  + bubbleMargin.left + bubbleMargin.right)
    .attr('height', bubbleHeight + bubbleMargin.top  + bubbleMargin.bottom)

const zoomGroup = bubbleSvgEl.append('g').attr('class', 'zoom-group');
const bubbleSvg = zoomGroup.append('g')
    .attr('transform', `translate(${bubbleMargin.left},${bubbleMargin.top})`);

const zoom = d3.zoom()
    .scaleExtent([0.5, 5])
    .on('zoom', (event) => {
        zoomGroup.attr('transform', event.transform);
    });

bubbleSvgEl.call(zoom).on('dblclick.zoom', null);

const bxAxisG = bubbleSvg.append('g')
    .attr('class', 'axis')
    .attr('transform', `translate(0,${bubbleHeight})`);

const byAxisG = bubbleSvg.append('g')
    .attr('class', 'axis');

bubbleSvg.append('text')
    .attr('class', 'labels')
    .attr('x', bubbleWidth / 2)
    .attr('y', bubbleHeight + bubbleMargin.bottom - 10)
    .attr('text-anchor', 'middle')
    .text('Number of Members');

bubbleSvg.append('text')
    .attr('class', 'labels')
    .attr('transform', 'rotate(-90)')
    .attr('x', -bubbleHeight / 2)
    .attr('y', -bubbleMargin.left + 18)
    .attr('text-anchor', 'middle')
    .text('Total Followers');

const barMargin = { top: 80, right: 60, bottom: 80, left: 100 };
const barWidth  = 700 - barMargin.left - barMargin.right;
const barHeight = 500 - barMargin.top  - barMargin.bottom;

const barSvg = d3.select('#bar-vis')
    .append('svg')
    .attr('width',  barWidth  + barMargin.left + barMargin.right)
    .attr('height', barHeight + barMargin.top  + barMargin.bottom)
    .append('g')
    .attr('transform', `translate(${barMargin.left},${barMargin.top})`);

const xAxisG = barSvg.append('g')
    .attr('class', 'axis')
    .attr('transform', `translate(0,${barHeight})`);

const yAxisG = barSvg.append('g')
    .attr('class', 'axis');

function showBubbleView() {
    document.getElementById('bubble-vis').style.display = 'block';
    document.getElementById('bar-view').style.display   = 'none';
    document.getElementById('back-bar').style.display   = 'none';
    selectedCompany = null;
    selectedGroup   = null;

    bubbleSvgEl.transition().duration(300).call(zoom.transform, d3.zoomIdentity);

    bubbleSvg.selectAll('.bubble')
        .transition().duration(t)
        .style('opacity', 0.75)
        .style('stroke', 'none')
        .style('stroke-width', '0');
}

function showBarView(companyName) {
    document.getElementById('bubble-vis').style.display = 'none';
    document.getElementById('bar-view').style.display   = 'block';
    document.getElementById('back-bar').style.display   = 'block';
    document.getElementById('back-label').textContent   = companyName;

    showPlaceholder();
    updateGroupSelector(companyName);
}

// back button
document.getElementById('back-btn').addEventListener('click', showBubbleView);


function init() {
    d3.csv('./data/kpop_idol_followers.csv',
        function(d) {
            return {
                stageName:     d['Stage.Name'],
                group:         d['Group'],
                ig_name:       d['ig_name'],
                followers:     +d['Followers'],
                fullName:      d['Full.Name'],
                dateOfBirth:   d['Date.of.Birth'],
                debut:         d['Debut'],
                company:       d['Company'],
                country:       d['Country'],
                gender:        d['Gender.y'],
                age:           +d['age'],
                'year.career': +d['year.career'],
            };
        }
    )
    .then(data => {
        console.log(data);
        allData = data.filter(d => d.company && d.company.trim() !== '');
        drawBubbleChart();
    })
    .catch(error => console.error('Error loading data:', error));
}

function drawBubbleChart() {
    const companyMap = d3.rollup(
        allData,
        v => ({ count: v.length, totalFollowers: d3.sum(v, d => d.followers) }),
        d => d.company
    );
    const companyData = Array.from(companyMap, ([name, vals]) => ({ name, ...vals }))
        .sort((a, b) => b.count - a.count);

    companyColorScale.domain(companyData.map(d => d.name));

    const xScale = d3.scaleLinear()
        .domain([0, d3.max(companyData, d => d.count) + 3])
        .range([0, bubbleWidth]);

    const yScale = d3.scaleSqrt()
        .domain([0, d3.max(companyData, d => d.totalFollowers)])
        .range([bubbleHeight, 0]);

    const sizeScale = d3.scaleSqrt()
        .domain([0, d3.max(companyData, d => d.totalFollowers)])
        .range([4, 28]);

    bxAxisG.call(d3.axisBottom(xScale).ticks(6));
    byAxisG.call(d3.axisLeft(yScale).ticks(5, '~s'));

    bubbleSvg.selectAll('.bubble')
        .data(companyData, d => d.name)
        .join(
            function(enter) {
                return enter
                    .append('circle')
                    .attr('class', 'bubble')
                    .attr('cx', d => xScale(d.count))
                    .attr('cy', d => yScale(d.totalFollowers))
                    .attr('fill', d => companyColorScale(d.name))
                    .style('opacity', 0.75)
                    .attr('r', 0)
                    .on('mouseover', function(event, d) {
                        d3.select(this)
                            .style('stroke', 'black')
                            .style('stroke-width', '1.8px');
                        d3.select('#tooltip')
                            .style('display', 'block')
                            .html(`
                                <strong>${d.name}</strong><br/>
                                Members: ${d.count}<br/>
                                Total followers: ${d.totalFollowers.toLocaleString()}
                            `)
                            .style('left', (event.pageX + 30) + 'px')
                            .style('top',  (event.pageY - 28) + 'px');
                    })
                    .on('mouseout', function() {
                        d3.select(this)
                            .style('stroke', 'none')
                            .style('stroke-width', '0');
                        d3.select('#tooltip').style('display', 'none');
                    })
                    .on('click', function(event, d) {
                        selectedCompany = d.name;
                        showBarView(d.name);
                    })
                    .transition(t)
                    .attr('r', d => sizeScale(d.totalFollowers));
            },
            function(update) { return update; },
            function(exit)   { return exit.transition(t).attr('r', 0).remove(); }
        );
}

function updateGroupSelector(companyName) {
    const groups = [...new Set(
        allData
            .filter(d => d.company === companyName)
            .map(d => d.group)
    )].sort();

    const container = d3.select('#group-pills');
    container.html('');

    container.append('p')
        .style('font-size', '15px')
        .style('margin-bottom', '10px')
        .text(`Groups under ${companyName}:`);

    container.selectAll('.pill')
        .data(groups)
        .join('button')
        .attr('class', 'pill')
        .text(d => d)
        .style('border-color', companyColorScale(companyName))
        .style('color', companyColorScale(companyName))
        .on('click', function(event, groupName) {
            d3.selectAll('.pill')
                .style('background-color', 'transparent')
                .style('color', companyColorScale(companyName));
            d3.select(this)
                .style('background-color', companyColorScale(companyName))
                .style('color', '#fff');
            selectedGroup = groupName;
            updateVis(groupName, companyName);
        });
}

function showPlaceholder() {
    barSvg.selectAll('.bar, .bar-label, .chart-title, .labels').remove();
    xAxisG.call(d3.axisBottom(d3.scaleLinear()).tickValues([]));
    yAxisG.call(d3.axisLeft(d3.scaleLinear()).tickValues([]));
}

function updateVis(groupName, companyName) {
    const members = allData
        .filter(d => d.group === groupName)
        .sort((a, b) => a.age - b.age);

    barSvg.selectAll('.placeholder-msg').remove();

    const xScale = d3.scaleBand()
        .domain(members.map(d => d.stageName))
        .range([0, barWidth])
        .padding(0.20);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(members, d => d.followers)])
        .range([barHeight, 0]);

    xAxisG.transition().duration(t)
        .call(d3.axisBottom(xScale))
        .selectAll('text')
        .attr('transform', 'rotate(-35)')
        .style('text-anchor', 'end')
        .style('font-size', '12px');

    yAxisG.transition().duration(t)
        .call(d3.axisLeft(yScale).ticks(6, '~s'));

    barSvg.selectAll('.bar')
        .data(members, d => d.stageName)
        .join(
            function(enter) {
                return enter
                    .append('rect')
                    .attr('class', 'bar')
                    .attr('x', d => xScale(d.stageName))
                    .attr('width', xScale.bandwidth())
                    .attr('y', barHeight)
                    .attr('height', 0)
                    .attr('rx', 3)
                    .attr('fill', d => colorScale(d.country))
                    .attr('stroke', companyColorScale(companyName))
                    .attr('stroke-width', 1.8)
                    .style('opacity', 0.85)
                    .on('mouseover', function(event, d) {
                        d3.select('#tooltip')
                            .style('display', 'block')
                            .html(`
                                <strong>${d.stageName}</strong> (${d.fullName})<br/>
                                Age: ${d.age} yrs<br/>
                                Group: ${d.group}<br/>
                                Gender: ${d.gender === 'M' ? 'M' : 'F'}<br/>
                                Origin: ${d.country}<br/>
                                Followers: ${d.followers.toLocaleString()}
                            `)
                            .style('left', (event.pageX + 20) + 'px')
                            .style('top',  (event.pageY - 28) + 'px');
                        d3.select(this)
                            .style('stroke', 'black')
                            .style('stroke-width', '2px');
                    })
                    .on('mouseout', function() {
                        d3.select('#tooltip').style('display', 'none');
                        d3.select(this)
                            .style('stroke', companyColorScale(companyName))
                            .style('stroke-width', '1.5px');
                    })
                    .transition(t)
                    .attr('y', d => yScale(d.followers))
                    .attr('height', d => barHeight - yScale(d.followers));
            },
            function(update) {
                return update.transition(t)
                    .attr('x', d => xScale(d.stageName))
                    .attr('width', xScale.bandwidth())
                    .attr('y', d => yScale(d.followers))
                    .attr('height', d => barHeight - yScale(d.followers))
                    .attr('fill', d => colorScale(d.country));
            },
            function(exit) {
                return exit.transition(t)
                    .attr('y', barHeight)
                    .attr('height', 0)
                    .remove();
            }
        );

    barSvg.selectAll('.labels').remove();

    barSvg.append('text')
        .attr('class', 'labels')
        .attr('x', barWidth / 2)
        .attr('y', barHeight + barMargin.bottom - 20)
        .attr('text-anchor', 'middle')
        .text('Member (sorted by age →)');

    barSvg.append('text')
        .attr('class', 'labels')
        .attr('transform', 'rotate(-90)')
        .attr('x', -barHeight / 2)
        .attr('y', -barMargin.left + 40)
        .attr('text-anchor', 'middle')
        .text('Followers');

    barSvg.selectAll('.bar-label').remove();
    barSvg.selectAll('.bar-label')
        .data(members)
        .join('text')
        .attr('class', 'bar-label labels')
        .attr('x', d => xScale(d.stageName) + xScale.bandwidth() / 2)
        .attr('y', d => yScale(d.followers) - 6)
        .attr('text-anchor', 'middle')
        .style('font-size', '10px')
        .style('fill', '#666')
        .style('opacity', 0)
        .text(d => d3.format(',.0f')(d.followers))
        .transition().delay(t * 0.4).duration(t * 0.2)
        .style('opacity', 1);

    barSvg.selectAll('.chart-title').remove();
    barSvg.append('text')
        .attr('class', 'chart-title labels')
        .attr('x', barWidth / 2)
        .attr('y', -barMargin.top / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', '15px')
        .style('font-weight', '450')
        .text(`${groupName} — Members by Followers`);
}

window.addEventListener('load', init);