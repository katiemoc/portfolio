console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

// let navLinks = $$("nav a");
// let currentLink = navLinks.find(
//     (a) => a.host === location.host && a.pathname === location.pathname,
//   );
//
// if (currentLink) {
//     // or if (currentLink !== undefined)
//     currentLink.classList.add('current');
// }

let pages = [
    { url: '', title: 'Home' },
    { url: 'projects/', title: 'My Projects' },
    // add the rest of your pages here
    { url: 'resume/', title: 'My Resume' },
    { url: 'contact/', title: 'Contact' },
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

