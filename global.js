console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

let pages = [
    { url: '', title: 'Home' },
    { url: 'projects/', title: 'My Projects' },
    { url: 'resume/', title: 'My Resume' },
    { url: 'contact/', title: 'Contact' },
    { url: 'meta/', title: 'Meta' },
    { url: 'https://github.com/katiemoc', title: 'My GitHub Profile'}
  ];

let nav = document.createElement('nav');
document.body.prepend(nav);

for (let p of pages) {
    let url = p.url;
    let title = p.title;
    const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
        ? "/"                    // Local server
        : "/portfolio/";         // GitHub Pages repo name

    if (!url.startsWith('http')) {
        url = BASE_PATH + url;
    }
    // next step: create link and add it to nav
    let a = document.createElement('a');
    a.href = url;
    a.textContent = title;
    nav.append(a);  
    if (a.host === location.host && a.pathname === location.pathname) {
        a.classList.add('current');
    } 
    if (a.host !== location.host) {
        a.target = "_blank";
    }
}

document.body.insertAdjacentHTML(
    'afterbegin',
    `
      <label class="color-scheme">
          Theme:
          <select id="select-color-scheme">
              <!-- TODO add <option> elements here -->
              <option value=auto>Auto</option>
              <option value=light>Light</option>
              <option value=dark>Dark</option>
          </select>
      </label>`,
);

let select = document.querySelector('#select-color-scheme')
if ('colorScheme' in localStorage) {
    select.value = localStorage.colorScheme;
    console.log('saved color scheme:', select.value);
    document.documentElement.style.setProperty('color-scheme', select.value);
}
select.addEventListener('input', function (event) {
    console.log('color scheme changed to', event.target.value);
    document.documentElement.style.setProperty('color-scheme', event.target.value);
    localStorage.colorScheme = event.target.value
});

let form = document.querySelector('#form')
form?.addEventListener('submit', function (event) {
    event.preventDefault();
    let data = new FormData(form);
    let params = {}
    for (let [name, value] of data) {
        // TODO build URL parameters here
        params[name] = encodeURIComponent(value);
        console.log(name, params[name]);
    }
    let subject = params.subject || 'No Subject';
    let body = params.body || 'No Message';
    let url = `mailto:kmoc@ucsd.edu?subject=${subject}&body=${body}`;
    location.href = url;
});

export async function fetchJSON(url) {
    try {
      // Fetch the JSON file from the given URL
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.statusText}`);
      }
      console.log(response)
      const data = await response.json();
      return data;

    } catch (error) {
      console.error('Error fetching or parsing JSON data:', error);
    }
  }

export function renderProjects(project, containerElement, headingLevel = 'h2') {
    // Your code will go here
    containerElement.innerHTML = '';

    project.forEach(project => {
        const article = document.createElement('article');
        
        const heading = document.createElement(headingLevel);
        heading.textContent = project.title;

        let titleLink;
        if (project.url) {
            titleLink = document.createElement('a');
            titleLink.href = project.url;
            titleLink.target = '_blank';
            titleLink.rel = 'noopener noreferrer';
            titleLink.appendChild(heading);
        }

        let image;
        let imageLink;

        if (project.image) {
            image = document.createElement('img');
            image.src = project.image;
            image.alt = project.title;

            if (project.url) {
                imageLink = document.createElement('a');
                imageLink.href = project.url;
                imageLink.target = '_blank';
                imageLink.rel = 'noopener noreferrer';
                imageLink.appendChild(image);
            }
        }

        const wrap = document.createElement('div');
        wrap.classList.add('project-description');

        const description = document.createElement('p');
        description.textContent = project.description;

        const year = document.createElement('p');
        year.classList.add('project-year');
        year.textContent = `c. ${project.year}`;
        
        wrap.appendChild(description);
        wrap.appendChild(year);

        if (project.url) {
            article.appendChild(titleLink);
            if (image) article.appendChild(imageLink);
        } else {
            article.appendChild(heading);
            if (image) article.appendChild(image);
        }
        article.appendChild(wrap);

        containerElement.appendChild(article);
    });
}

export async function fetchGitHubData(username) {
    return fetchJSON(`https://api.github.com/users/${username}`);
}

  