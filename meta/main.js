import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

async function loadData() {
    const data = await d3.csv('loc.csv', (row) => ({
      ...row,
      line: Number(row.line), // or just +row.line
      depth: Number(row.depth),
      length: Number(row.length),
      date: new Date(row.date + 'T00:00' + row.timezone),
      datetime: new Date(row.datetime),
    }));
  
    return data;
}

function processCommits(data) {
    return d3
      .groups(data, (d) => d.commit)
      .map(([commit, lines]) => {
        let first = lines[0];
        let { author, date, time, timezone, datetime } = first;
        let ret = {
          id: commit,
          url: 'https://github.com/vis-society/lab-7/commit/' + commit,
          author,
          date,
          time,
          timezone,
          datetime,
          hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
          totalLines: lines.length,
        };
  
        Object.defineProperty(ret, 'lines', {
          value: lines,
          // What other options do we need to set?
          // Hint: look up configurable, writable, and enumerable
          configurable: false,
          writable: false,
          enumerable: false
        });
  
        return ret;
      });
}
  
function renderCommitInfo(data, commits) {
    // Create the dl element
    d3.select('#stats').selectAll('dl').remove();
    const dl = d3.select('#stats').append('dl').attr('class', 'stats');
  
    // Add total LOC
    dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
    dl.append('dd').text(data.length);
  
    // Add total commits
    dl.append('dt').text('Total commits');
    dl.append('dd').text(commits.length);
  
    // Add more stats as needed...
    const numFiles = d3.rollup(data, v => 1, d => d.file).size;
    dl.append('dt').text('Number of files');
    dl.append('dd').text(numFiles);

    const fileLengths = d3.rollups(data, v => v.length, d => d.file);
    const [longestFile, maxFileLength] = d3.greatest(fileLengths, ([, len]) => len);
    dl.append('dt').text('Longest file');
    dl.append('dd').text(`${longestFile} (${maxFileLength})`);

    const avgFileLength = d3.mean(fileLengths, ([, len]) => len);
    dl.append('dt').text('Average file length');
    dl.append('dd').text(avgFileLength.toFixed(2));

    function timeOfDay(hour) {
        if (hour >= 5 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 17) return 'afternoon';
        if (hour >= 17 && hour < 21) return 'evening';
        return 'night';
    }

    const mostCommonTime = d3.rollups(commits, v => v.length, d => timeOfDay(d.hourFrac));
    const [busiestPeriod] = d3.greatest(mostCommonTime, ([, count]) => count);
    dl.append('dt').text('Most active time of day');
    dl.append('dd').text(busiestPeriod);

    const dayOfWeek = ['Sun', 'Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat'];
    const commitsByDay = d3.rollups(
                            commits,
                            v => v.length,
                            d => dayOfWeek[d.datetime.getDay()]
                            );
    const [busiestDay] = d3.greatest(commitsByDay, ([, count]) => count);

    dl.append('dt').text('Most active day of the week');
    dl.append('dd').text(busiestDay);
}

let xScale;
let yScale;

function updateScatterPlot(data, filteredCommits) {
    const width = 1000;
    const height = 600;
    d3.select('svg').remove();
    const svg = d3
                .select('#chart')
                .append('svg')
                .attr('viewBox', `0 0 ${width} ${height}`)
                .style('overflow', 'visible');
    
    createBrushSelector(svg);

    xScale = d3
                .scaleTime()
                .domain(d3.extent(filteredCommits, (d) => d.datetime))
                .range([0, width])
                .nice();
    yScale = d3.scaleLinear().domain([0, 24]).range([height, 0]);

    svg.selectAll('g').remove();
    const dots = svg.append('g').attr('class', 'dots');
    const [minLines, maxLines] = d3.extent(filteredCommits, (d) => d.totalLines);
    const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([5, 20]); 
    const sortedCommits = d3.sort(filteredCommits, (d) => -d.totalLines);
    
    dots.selectAll('circle').remove();
    dots
        .selectAll('circle')
        .data(sortedCommits)
        .join('circle')
        .attr('cx', (d) => xScale(d.datetime))
        .attr('cy', (d) => yScale(d.hourFrac))
        .attr('r', (d) => rScale(d.totalLines))
        .style('fill-opacity', 0.7)
        .attr('fill', 'steelblue')
        .on('mouseenter', (event, commit) => {
            renderTooltipContent(commit);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
          })
        .on('mouseleave', () => {
            // TODO: Hide the tooltip
            updateTooltipVisibility(false);
        });

    const margin = { top: 10, right: 20, bottom: 30, left: 40 };
    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };
    
    // Update scales with new ranges
    xScale.range([usableArea.left, usableArea.right]);
    yScale.range([usableArea.bottom, usableArea.top]);
      
    // Create the axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3
        .axisLeft(yScale)
        .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');


    const timeColor = d3.scaleLinear()
        .domain([0, 12, 24])
        .range(["#1e3a8a", "#fbbf24", "#1e3a8a"]);
    
    // Add gridlines BEFORE the axes
    const gridlines = svg
        .append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${usableArea.left}, 0)`);
    
    // Get tick values explicitly
    const tickValues = yScale.ticks();
    
    // Create gridlines manually instead of using axisLeft
    gridlines.selectAll('line')
        .data(tickValues)
        .enter()
        .append('line')
        .attr('x1', 0)
        .attr('x2', usableArea.width)
        .attr('y1', d => yScale(d))
        .attr('y2', d => yScale(d))
        .attr('stroke', d => timeColor(d));            

    // Add X axis
    svg
        .append('g')
        .attr('transform', `translate(0, ${usableArea.bottom})`)
        .call(xAxis);

    // Add Y axis
    svg
        .append('g')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .call(yAxis);

}

function renderTooltipContent(commit) {
    const link = document.getElementById('commit-link');
    const date = document.getElementById('commit-date');
  
    let timeEl = document.getElementById('commit-time');
    if (!timeEl) {
      timeEl = document.createElement('dd');
      timeEl.id = 'commit-time';
      date.parentNode.insertAdjacentHTML('afterend', `<dt>Time</dt>`);
      date.parentNode.insertAdjacentElement('afterend', timeEl);
    }
  
    let authorEl = document.getElementById('commit-author');
    if (!authorEl) {
      authorEl = document.createElement('dd');
      authorEl.id = 'commit-author';
      timeEl.parentNode.insertAdjacentHTML('afterend', `<dt>Author</dt>`);
      timeEl.parentNode.insertAdjacentElement('afterend', authorEl);
    }
  
    let linesEl = document.getElementById('commit-lines-edited');
    if (!linesEl) {
      linesEl = document.createElement('dd');
      linesEl.id = 'commit-lines';
      authorEl.parentNode.insertAdjacentHTML('afterend', `<dt>Lines edited</dt>`);
      authorEl.parentNode.insertAdjacentElement('afterend', linesEl);
    }
  
    if (Object.keys(commit).length === 0) return;
  
    link.href = commit.url;
    link.textContent = commit.id;
  
    date.textContent = commit.datetime?.toLocaleDateString('en', {
      dateStyle: 'full',
    });
  
    timeEl.textContent = commit.datetime?.toLocaleTimeString('en', {
      timeStyle: 'short',
    });
  
    authorEl.textContent = commit.author;
    linesEl.textContent = commit.totalLines;
}

function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.style.left = `${event.clientX}px`;
    tooltip.style.top = `${event.clientY}px`;
}

function renderSelectionCount(selection) {
    const selectedCommits = selection
      ? commits.filter((d) => isCommitSelected(selection, d))
      : [];
  
    const countElement = document.querySelector('#selection-count');
    countElement.textContent = `${
      selectedCommits.length || 'No'
    } commits selected`;
  
    return selectedCommits;
}

function brushed(event) {
    const selection = event.selection;
    d3.selectAll('circle').classed('selected', (d) =>
    isCommitSelected(selection, d),
    );
    renderSelectionCount(selection);
    renderLanguageBreakdown(selection);
}

function isCommitSelected(selection, commit) {
    if (!selection) {
      return false;
    }
    // TODO: return true if commit is within brushSelection
    // and false if not
    const [x0, x1] = selection.map((d) => d[0]);
    const [y0, y1] = selection.map((d) => d[1]);
    const x = xScale(commit.datetime);
    const y = yScale(commit.hourFrac);
    return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

const brush = d3.brush().on('start brush end', brushed);

function createBrushSelector(svg) {
    svg.call(brush);
    svg.selectAll('.dots, .overlay ~ *').raise();
}

function renderLanguageBreakdown(selection) {
    const selectedCommits = selection
      ? commits.filter((d) => isCommitSelected(selection, d))
      : [];
    const container = document.getElementById('language-breakdown');
  
    if (selectedCommits.length === 0) {
      container.innerHTML = '';
      return;
    }
    const requiredCommits = selectedCommits.length ? selectedCommits : commits;
    const lines = requiredCommits.flatMap((d) => d.lines);
  
    // Use d3.rollup to count lines per language
    const breakdown = d3.rollup(
      lines,
      (v) => v.length,
      (d) => d.type,
    );
  
    // Update DOM with breakdown
    container.innerHTML = '';
  
    for (const [language, count] of breakdown) {
      const proportion = count / lines.length;
      const formatted = d3.format('.1~%')(proportion);
  
      container.innerHTML += `
              <dt>${language}</dt>
              <dd>${count} lines (${formatted})</dd>
          `;
    }
}

let data = await loadData();
let commits = processCommits(data);
commits = commits.sort((a, b) => d3.ascending(a.datetime, b.datetime));

let NUM_ITEMS = commits.length; 
let ITEM_HEIGHT = 150; 
let VISIBLE_COUNT = 5; 
let totalHeight = NUM_ITEMS * ITEM_HEIGHT;
const scrollContainer = d3.select('#scroll-container');
const spacer = d3.select('#spacer');
spacer.style('height', `${totalHeight}px`);
const itemsContainer = d3.select('#items-container');
scrollContainer.on('scroll', () => {
  const scrollTop = scrollContainer.property('scrollTop');
  let startIndex = Math.floor(scrollTop / ITEM_HEIGHT);
  startIndex = Math.max(
    0,
    Math.min(startIndex, commits.length - VISIBLE_COUNT),
  );
  renderItems(startIndex);
  resetSelection();
});
renderItems(0);

function resetSelection() {
  d3.select('#selection-count').text('No commits selected');
  d3.select('#language-breakdown').html('');
  d3.select('.brush').call(brush.move, null);
}

function renderItems(startIndex) {
  itemsContainer.selectAll('div').remove();

  const endIndex = Math.min(startIndex + VISIBLE_COUNT, commits.length);
  let newCommitSlice = commits.slice(startIndex, endIndex);

  updateScatterPlot(data, newCommitSlice);

  // const lines = newCommitSlice.flatMap((d) => d.lines);
  // renderCommitInfo(lines, newCommitSlice);

  itemsContainer.selectAll('div')
                .data(newCommitSlice)
                .enter()
                .append('div')
                .attr('class', 'item')
                .html((commit, index) => {
                  const fileCount = d3.rollups(commit.lines, v => v.length, d => d.file).length;
                  const lineText = index > 0 ? 'another glorious commit' : 'my first commit, and it was glorious';
                  return `<p>
                    On ${commit.datetime.toLocaleString("en", { dateStyle: "full", timeStyle: "short" })}, I made
                    <a href="${commit.url}" target="_blank">${lineText}</a>. I edited ${commit.totalLines} lines across ${fileCount} files.
                    Then I looked over all I had made, and I saw that it was very good.
                  </p>`;
                })
                .style('position', 'absolute')
                .style('top', (_, idx) => `${(startIndex + idx) * ITEM_HEIGHT}px`);
}

function displayFiles(filteredCommits) {
  const lines = filteredCommits.flatMap((d) => d.lines);
  let fileTypeColors = d3.scaleOrdinal(d3.schemeTableau10);
  let files = d3
    .groups(lines, (d) => d.file)
    .map(([name, lines]) => {
      return { name, lines };
    });
  files = d3.sort(files, (d) => -d.lines.length);

  d3.select('.files').selectAll('div').remove();

  let filesContainer = d3.select('.files').selectAll('div').data(files).enter().append('div');
  filesContainer.append('dt').html(d => `<code>${d.name}</code><small>${d.lines.length} lines</small>`);
  filesContainer.append('dd').selectAll('div')
    .data(d => d.lines)
    .enter()
    .append('div')
    .attr('class', 'line')
    .style('background', d => fileTypeColors(d.type));

}

displayFiles(commits);
renderCommitInfo(data, commits);
updateScatterPlot(data, commits);






let NUM_ITEMS_FILES = commits.length; 
let ITEM_HEIGHT_FILES = 150; 
let VISIBLE_COUNT_FILES = 5; 
let totalHeight_FILES = NUM_ITEMS_FILES * ITEM_HEIGHT_FILES;
const scrollContainer_FILES = d3.select('#scroll-container-files');
const spacer_FILES = d3.select('#spacer-files');
spacer_FILES.style('height', `${totalHeight_FILES}px`);
const itemsContainer_FILES = d3.select('#items-container-files');
scrollContainer_FILES.on('scroll', () => {
  const scrollTop = scrollContainer_FILES.property('scrollTop');
  let startIndex = Math.floor(scrollTop / ITEM_HEIGHT_FILES);
  startIndex = Math.max(
    0,
    Math.min(startIndex, commits.length - VISIBLE_COUNT_FILES),
  );
  renderItemsFiles(startIndex);
});
renderItemsFiles(0);

function renderItemsFiles(startIndex) {
  itemsContainer_FILES.selectAll('div').remove();

  const endIndex = Math.min(startIndex + VISIBLE_COUNT_FILES, commits.length);
  let newCommitSlice = commits.slice(startIndex, endIndex);

  displayFiles(newCommitSlice);

  itemsContainer_FILES.selectAll('div')
                .data(newCommitSlice)
                .enter()
                .append('div')
                .attr('class', 'item-files')
                .html((commit, index) => {
                  const fileCount = d3.rollups(commit.lines, v => v.length, d => d.file).length;
                  const lineText = index > 0 ? 'another glorious commit' : 'my first commit, and it was glorious';
                  return `<p>
                    On ${commit.datetime.toLocaleString("en", { dateStyle: "full", timeStyle: "short" })}, I made
                    <a href="${commit.url}" target="_blank">${lineText}</a>. I edited ${commit.totalLines} lines across ${fileCount} files.
                    I improved my personal coding and project development skills!
                  </p>`;
                })
                .style('position', 'absolute')
                .style('top', (_, idx) => `${(startIndex + idx) * ITEM_HEIGHT_FILES}px`);
}





// function filterCommitsByTime() {
//   filteredCommits = commits.filter(d => d.datetime <= commitMaxTime);
// }

// let timeScale = d3.scaleTime(
//   [d3.min(commits, (d) => d.datetime), d3.max(commits, (d) => d.datetime)],
//   [0, 100],
// );
// let commitMaxTime = timeScale.invert(commitProgress);

// const slider = document.getElementById('commit-slider');
// const selectedTime = d3.select('#selectedTime');

// function updateTimeDisplay() {
//   commitProgress = Number(slider.value);
//   commitMaxTime = timeScale.invert(commitProgress);
//   selectedTime.text(commitMaxTime.toLocaleString(undefined, {
//     dateStyle: "long",
//     timeStyle: "short"
//   }));
//   filterCommitsByTime();
//   updateScatterPlot(data, filteredCommits);
//   displayFiles(filteredCommits);
// }

// slider.addEventListener('input', updateTimeDisplay);
// updateTimeDisplay();