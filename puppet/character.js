/* A replaceable, articulated SVG costume. All coordinates are local to joints. */
let nextCharacter = 0;
export function createCharacter(host, color = 0) {
  const uid = `mh-${++nextCharacter}`;
  const teal = color === 125 ? '#476149' : color === 280 ? '#655276' : '#3a7076';
  const robe = color === 125 ? '#7f9277' : color === 280 ? '#9b7a96' : '#d18b67';
  const gold = '#d7b573';
  const flower = (x,y,s=1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0-6C5-12 9-6 5-2C12-2 11 6 5 5C7 12-1 12-2 6C-8 12-13 5-6 1C-13-3-7-10-2-5Z" fill="#b54a41" stroke="#e0b58b" stroke-width=".7"/><circle r="2.5" fill="${gold}"/></g>`;
  const ornament = (x,y,s=1) => `<g transform="translate(${x} ${y}) scale(${s})" fill="none" stroke="${gold}" stroke-width="1.4"><path d="M0-16C-18-7-10 6 0 0C10 6 18-7 0-16ZM0 0C-15 8-16 17-3 15C-5 23-13 28-22 26M0 0C15 8 16 17 3 15C5 23 13 28 22 26M0-7v36"/><path d="m-13 6-9-2m35 2 9-2"/></g>`;
  const sleeve = side => `<g data-part="${side}-sleeve"><path d="M-12 0C-21 18-17 38-23 64C-12 78 7 73 23 66C12 42 20 14 11 0Z" fill="url(#${uid}-silk)" stroke="#dfd4b9" stroke-width="1"/><path d="M-11 7C-5 29-12 55-12 66M0 5C9 29-2 53 0 70M10 10C6 32 15 50 16 66" fill="none" stroke="#d5cdb9" stroke-width="1.1" opacity=".8"/><path d="M-12 2H12L14 13C5 18-6 18-14 13Z" fill="${teal}" stroke="${gold}" stroke-width="1.4"/><path d="M-8 7Q0 0 8 7Q0 15-8 7Z" fill="none" stroke="${gold}"/></g>`;
  const arm = side => `<g data-part="${side}-upper-arm"><path d="M-10-4C-19 3-17 20-13 42L-10 49H10L14 39C18 18 17 1 8-5Z" fill="url(#${uid}-robe)" stroke="#ac6c4e" stroke-width="1"/><path d="M-12 5Q0 14 12 5M-13 18Q0 27 13 18M-13 33Q0 42 13 33" fill="none" stroke="${gold}" stroke-width="1.1"/><path d="M-7 16C-3 8 4 9 7 16C2 14 1 23-3 22Z" fill="${teal}" opacity=".8"/><g data-part="${side}-forearm" transform="translate(0 44)"><path d="M-10-3C-17 10-13 30-9 43L9 43C14 23 17 8 9-3Z" fill="url(#${uid}-robe)" stroke="#ac6c4e" stroke-width="1"/><path d="M-12 18Q0 26 12 18M-11 27Q0 34 11 27" fill="none" stroke="${gold}"/><path d="M-10 32L10 32L12 43Q0 49-12 43Z" fill="${teal}" stroke="${gold}"/><g data-part="${side}-hand" transform="translate(0 45)"><path d="M-5-2C-7 4-6 9-2 10L1 5C7 13 10 8 6 3L3-3Z" fill="#ecc7a4" stroke="#b48368" stroke-width="1"/><path d="m-1 0 4 5m0-6 3 4" stroke="#bf9479" stroke-width=".7"/></g></g></g>`;
  host.innerHTML = `<svg class="puppet-renderer" viewBox="0 0 400 380" role="img" aria-label="可实时操控的花旦杖头木偶" xmlns="http://www.w3.org/2000/svg"><defs>
  <linearGradient id="${uid}-robe" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#af694f"/><stop offset=".35" stop-color="${robe}"/><stop offset=".7" stop-color="#e6ad82"/><stop offset="1" stop-color="#bb7553"/></linearGradient>
  <linearGradient id="${uid}-silk" x1="0" x2="1"><stop stop-color="#e3ddcb"/><stop offset=".45" stop-color="#fffcef"/><stop offset="1" stop-color="#ebe3cf"/></linearGradient>
  <linearGradient id="${uid}-teal" x1="0" x2="1"><stop stop-color="#264f54"/><stop offset=".5" stop-color="${teal}"/><stop offset="1" stop-color="#23474d"/></linearGradient>
  <radialGradient id="${uid}-face"><stop stop-color="#fff0d2"/><stop offset=".75" stop-color="#f2d9b7"/><stop offset="1" stop-color="#d9ac89"/></radialGradient>
  <radialGradient id="${uid}-rouge"><stop stop-color="#d97970" stop-opacity=".58"/><stop offset="1" stop-color="#e7b194" stop-opacity="0"/></radialGradient>
  </defs><ellipse data-part="shadow" cx="200" cy="354" rx="61" ry="8" fill="#3f3a2a" opacity=".15"/>
  <g data-part="character" transform="translate(200 270)">
    <g data-part="skirt"><path d="M-32-39C-44 7-50 39-65 72Q-30 86 0 79Q35 86 65 72C49 33 45 2 32-39Z" fill="url(#${uid}-robe)" stroke="#926247" stroke-width="1.4"/>
    <path d="M-27-40L-43 72Q-31 78-22 77L-11-39ZM27-40L43 72Q31 78 22 77L11-39Z" fill="url(#${uid}-teal)" stroke="${gold}" stroke-width="1.5"/>
    <path d="M-9-39L-18 78Q0 83 18 78L9-39Z" fill="${teal}" stroke="${gold}" stroke-width="1.3"/>
    ${ornament(0,-12,.55)}${ornament(0,28,.65)}${ornament(-29,10,.4)}${ornament(29,10,.4)}${ornament(-34,49,.4)}${ornament(34,49,.4)}
    <path d="M-56 65Q-28 75 0 69Q28 76 56 65M-59 71Q-28 82 0 75Q28 82 59 71" fill="none" stroke="${gold}" stroke-width="1.8"/>
    <path d="M-45-5-55 57M45-5 55 57M-20-9-27 60M20-9 27 60" stroke="#713e32" stroke-width="1" opacity=".3"/></g>
    <path data-part="rod" d="M0 62V90" stroke="#795c3b" stroke-width="4"/>
    ${sleeve('left')}${sleeve('right')}
    <g data-part="torso"><path d="M-12-148L-33-136C-42-110-36-78-29-45Q0-33 29-45C36-78 42-110 33-136L12-148Z" fill="url(#${uid}-robe)" stroke="#9a6349" stroke-width="1.2"/>
    <path d="M-14-145L0-120L14-145L23-136L6-103L17-47H-17L-6-103L-23-136Z" fill="url(#${uid}-teal)" stroke="${gold}" stroke-width="1.7"/>
    <path d="m-13-143 14 24 12-24M-3-113 12-85M-5-102l16 30M-9-82l17 30" fill="none" stroke="#d5bb83" stroke-width="1"/>
    ${ornament(-24,-113,.34)}${ornament(24,-113,.34)}${flower(-24,-76,.5)}${flower(24,-76,.5)}
    <path d="M-31-52Q0-42 31-52L30-40Q0-28-30-40Z" fill="#b68e38" stroke="#ecd59a" stroke-width="1.7"/>
    <path d="M-29-46Q0-36 29-46" fill="none" stroke="#715b30" stroke-width="1.5"/><path d="m0-50 8 6-8 6-8-6Z" fill="#e8d08a"/><circle cy="-44" r="3" fill="#b74836"/>
    <path d="M-9-36L-15 16L-5 26L0-35M9-36L15 16L5 26L0-35" fill="${teal}" stroke="${gold}" stroke-width="1.1"/></g>
    ${arm('left')}${arm('right')}
    <g data-part="head" transform="translate(0 -148)">
      <path d="M-21-47C-37-37-31 20-28 35L-35 108Q-22 121-17 104L-12-1H12L17 104Q22 121 35 108L28 35C31 20 37-37 21-47Z" fill="#202b29" stroke="#101c1b" stroke-width="1.2"/>
      <path d="M-26 10-26 97M26 10 26 97" stroke="#56615a" stroke-width="2" opacity=".6"/>
      <path d="M-8 8V28Q0 34 8 28V8" fill="#e7c3a0" stroke="#b98e6e"/>
      <path d="M-20-40C-29-13-20 15-5 23Q0 26 5 23C20 15 29-13 20-40Q0-56-20-40Z" fill="url(#${uid}-face)" stroke="#ba8d6a" stroke-width=".9"/>
      <ellipse cx="-14" cy="-3" rx="10" ry="12" fill="url(#${uid}-rouge)"/><ellipse cx="14" cy="-3" rx="10" ry="12" fill="url(#${uid}-rouge)"/>
      <path d="M-23-29Q-11-44 0-38Q11-44 23-29L23-43Q0-62-23-43Z" fill="#1d2929"/>
      <path d="M-21-20Q-12-27-4-20M4-20Q12-27 21-20" fill="none" stroke="#372526" stroke-width="2.3" stroke-linecap="round"/>
      <path d="M-20-15Q-12-20-5-13Q-12-8-20-15ZM5-13Q12-20 20-15Q12-8 5-13Z" fill="#fff9e9" stroke="#2c2627" stroke-width="1.8"/>
      <ellipse cx="-11" cy="-14" rx="2.8" ry="3" fill="#272626"/><ellipse cx="11" cy="-14" rx="2.8" ry="3" fill="#272626"/><circle cx="-10" cy="-15" r=".8" fill="#fff"/><circle cx="12" cy="-15" r=".8" fill="#fff"/>
      <path d="M0-13-3 1 1 3" fill="none" stroke="#bd8d73" stroke-width="1.1"/><path d="M-6 10Q0 5 6 10Q0 17-6 10Z" fill="#a43837"/><path d="M-4 10H4" stroke="#ecc8ac" stroke-width=".8"/>
      <g data-part="headdress"><path d="M-29-39L-38-62L-23-62L-25-79L-10-71L0-88L10-71L25-79L23-62L38-62L29-39Q0-52-29-39Z" fill="#203c3b" stroke="${gold}" stroke-width="1.6"/>
      <path d="M-27-45Q0-63 27-45M-30-54Q0-74 30-54M-16-67l5 12m27-12-5 12M0-81v22" fill="none" stroke="${gold}" stroke-width="1.5"/>
      ${flower(0,-72,.95)}${flower(-24,-55,.78)}${flower(24,-55,.78)}${flower(-33,-71,.53)}${flower(33,-71,.53)}
      <g fill="#6b9a99" stroke="#e4d3a3" stroke-width="1.3"><circle cx="-35" cy="-48" r="4"/><circle cx="35" cy="-48" r="4"/><circle cx="-16" cy="-72" r="3"/><circle cx="16" cy="-72" r="3"/><circle cx="0" cy="-52" r="4.5"/></g>
      <path d="M-32-43Q-43-30-37-7M32-43Q43-30 37-7M-25-41Q-34-26-30 3M25-41Q34-26 30 3" fill="none" stroke="${gold}" stroke-width="1.1"/>
      <g fill="#e9dbc0"><circle cx="-37" cy="-29" r="2"/><circle cx="-38" cy="-21" r="2"/><circle cx="-37" cy="-13" r="2"/><circle cx="37" cy="-29" r="2"/><circle cx="38" cy="-21" r="2"/><circle cx="37" cy="-13" r="2"/></g>
      <path d="m-37-6-3 13 5 0 2-13m33 0 3 13-5 0-2-13" fill="#b94f41"/><circle cx="-29" cy="3" r="3" fill="${gold}"/><circle cx="29" cy="3" r="3" fill="${gold}"/>
      </g>
    </g>
  </g></svg>`;
  const svg = host.querySelector('svg');
  const parts = Object.fromEntries([...host.querySelectorAll('[data-part]')].map(el => [el.dataset.part, el]));
  return { svg, parts, color };
}
