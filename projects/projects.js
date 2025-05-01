import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const projects = await fetchJSON('../lib/projects.json');
const title = document.querySelector('.projects-title')
const projectsContainer = document.querySelector('.projects');

let selectedIndex = -1;

let newRolledData = d3.rollups(
    projects,
    (v) => v.length,
    (d) => d.year,
);

let newData = newRolledData.map(([year, count]) => {
    return { value: count, label: year };
});

let query = '';

if (projects && Array.isArray(projects)) {
    title.textContent = `${projects.length} Projects`
    renderProjects(projects, projectsContainer, 'h2');
} else {
    title.textContent = `No Projects Yet!`
}

function renderPieChart(projectsGiven) {

    let newRolledData = d3.rollups(
        projectsGiven,
        (v) => v.length,
        (d) => d.year,
    );

    newData = newRolledData.map(([year, count]) => {
        return { value: count, label: year };
    });

    let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
    let sliceGenerator = d3.pie().value((d) => d.value);
    let arcData = sliceGenerator(newData);
    let arcs = arcData.map((d) => arcGenerator(d));
    let colors = d3.scaleOrdinal(d3.schemeTableau10);

    let newSVG = d3.select('svg');
    newSVG.selectAll('path').remove();

    let legend = d3.select('.legend');
    legend.selectAll('li').remove();

    arcs.forEach((arc, idx) => {
        newSVG.append('path')
            .attr('d', arc)
            .attr('fill', colors(idx))
            .on('click', () => {
                selectedIndex = selectedIndex === idx ? -1 : idx;
                
                newSVG.selectAll('path')
                    .attr('class', (_, idx) => (
                        // filter idx to find correct pie slice and apply CSS from above
                        idx === selectedIndex ? 'selected' : ''
                ));

                legend.selectAll('li')
                    .attr('class', (_, idx) => (
                        // filter idx to find correct legend and apply CSS from above
                        idx === selectedIndex ? 'selected' : ''
                ));

                let filteredQuery = query ? projects.filter((project) => {
                    let values = Object.values(project).join('\n').toLowerCase();
                    return values.includes(query.toLowerCase());
                }) : projects;

                if (selectedIndex === -1) {
                    renderProjects(filteredQuery, projectsContainer, 'h2');
                    renderPieChart(filteredQuery);
                } else {
                    const selectedYear = newData[selectedIndex].label;
                    const filteredYearQuery = filteredQuery.filter((project) => project.year === selectedYear);
                    renderProjects(filteredYearQuery, projectsContainer, 'h2');
                }
            });
    });

    newData.forEach((d, idx) => {
    legend.append('li')
        .attr('style', `--color:${colors(idx)}`)
        .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
    });
}

renderPieChart(projects);

let searchInput = document.querySelector('.search-bar');

searchInput.addEventListener('input', (event) => {
    // update query value
    query = event.target.value;

    // filter the projects
    let filteredProjects = query ? projects.filter((project) => {
        let values = Object.values(project).join('\n').toLowerCase();
        return values.includes(query.toLowerCase());
    }) : projects;

    // render updated projects and pie chart
    if (selectedIndex === -1) {
        renderProjects(filteredProjects, projectsContainer, 'h2');
        renderPieChart(filteredProjects);
    } else {
        const selectedYear = newData[selectedIndex].label;
        const filteredYearQuery = filteredProjects.filter((project) => {
            return project.year === selectedYear
        });
        renderProjects(filteredYearQuery, projectsContainer, 'h2');
    }
});