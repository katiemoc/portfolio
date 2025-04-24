import { fetchJSON, renderProjects } from '../global.js';

const projects = await fetchJSON('../lib/projects.json');
const title = document.querySelector('.projects-title')
const projectsContainer = document.querySelector('.projects');

if (projects && Array.isArray(projects)) {
    title.textContent = `${projects.length} Projects`
    renderProjects(projects, projectsContainer, 'h2');
} else {
    title.textContent = `No Projects Yet!`
}

