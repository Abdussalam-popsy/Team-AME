/**
 * Real Accelerate ME cohort startups and founders, transcribed from
 * accelerateme.co/startups. Notes on the success stories come from the
 * same page. Cohorts 1-2 are not published; cohort 12 list is not yet up.
 */
export interface CohortStartup {
  name: string
  founders: string[]
  cohort: number
  note?: string
}

export const COHORT_STARTUPS: CohortStartup[] = [
  // Success stories
  {
    name: 'Housr',
    founders: ['Harry Panter'],
    cohort: 6,
    note: 'Raised $6m pre-Series A, $10.9m revenue, $0→$10m in 36 months with a team of 60. Official housing platform for universities across the UK and US.',
  },
  {
    name: 'Miss Kick',
    founders: ['Grace Vella'],
    cohort: 5,
    note: 'Female-first football brand — Mitre partnership, Breaking Barriers events across Manchester, Sheffield and London.',
  },
  {
    name: 'Recourse AI',
    founders: ['Scott Martin'],
    cohort: 4,
    note: '£4m+ seed for the AI "flight simulator for healthcare"; NHS Greater Manchester Cancer Alliance partnership.',
  },
  {
    name: 'Arcube',
    founders: ['Prithveesh Reddy', 'Harvey Lowe'],
    cohort: 9,
    note: '$1.5m seed; generated $1.6m in new revenue for Etihad Airways from 1,300 passengers.',
  },
  {
    name: 'Aeroknite',
    founders: ['Yusuff Yusuff'],
    cohort: 8,
    note: 'Fire-extinguishing and hologram drones; ranked #5 AI company on F6S out of 2m startups.',
  },
  // Cohort 11
  { name: 'AccuNote', founders: ['Evangelos Anapliotis'], cohort: 11 },
  { name: 'Bura', founders: ['Sofia Jevolac'], cohort: 11 },
  { name: 'Pomelo', founders: ['Alex Kapadia', 'Gan Hui Lin', 'Abdelrahman Elgamal'], cohort: 11 },
  { name: 'PurFetch', founders: ['Raymond Zheng', 'Fancy Fan', 'Sudhansu Wani'], cohort: 11 },
  { name: 'Vigil', founders: ['Maximillian Dowling', 'Adeel Ejaz'], cohort: 11 },
  { name: 'Airyn', founders: ['Tunde Oremulé'], cohort: 11 },
  { name: 'Mend', founders: ['Jasper Beamount', 'Charlie Crick'], cohort: 11 },
  { name: 'Prana Tech', founders: ['Kristian Ambruch', 'Robertas Kareckas'], cohort: 11 },
  { name: 'Synkit Health', founders: ['Matilde Lerias'], cohort: 11 },
  { name: 'Amplify Inc', founders: ['Eduardo Marques'], cohort: 11 },
  { name: 'Nomad Travel Tracker', founders: ['Jack Smith', 'Dan Pritchard'], cohort: 11 },
  { name: 'Pulpoo', founders: ['Eduardo Fernandez Salazar', 'Stefano Silva'], cohort: 11 },
  {
    name: 'Pulse',
    founders: ['Mahan Aghabeigi', 'Jonathan Atrey', 'Jakub Slactha', 'Varad Chavan'],
    cohort: 11,
  },
  // Cohort 10
  { name: 'Hypoplas', founders: ['Olivia Burns'], cohort: 10 },
  { name: 'PhysioAssist', founders: ['Samyak Verma'], cohort: 10 },
  { name: 'Vidsight', founders: ['James Kirkham'], cohort: 10 },
  { name: 'Walo', founders: ['Harshita Dasani'], cohort: 10 },
  {
    name: 'Purple Point',
    founders: ['Jorge Augusto Servert', 'Lerdo de Tejada', 'Jaleel Miyan', 'Derren Heyes'],
    cohort: 10,
  },
  {
    name: 'BasicX',
    founders: ['Muhammad Asad Butt', 'Chenze Ma', 'Kwame Kwarteng', 'Ansab Ali'],
    cohort: 10,
  },
  {
    name: 'ReUniCycle',
    founders: ['Lee Tzs Ving Venus', 'Lee Cheuk Him Marvin', 'Hao Geng (Arya)'],
    cohort: 10,
  },
  { name: 'Endup', founders: ['Ahmad Aldaker', 'Omar Mansi', 'Amer Akkad'], cohort: 10 },
  { name: 'FlashAid', founders: ['Grigorii Rodionov', 'Makysm Korotych'], cohort: 10 },
  { name: 'Urban Watt', founders: ['Josiah Edebiri', 'Gus Cheng Zhang'], cohort: 10 },
  {
    name: 'BEEM Advertising',
    founders: ['Lazaros Sideras', 'Giorgos Markou', 'Ioannis Vamvakas'],
    cohort: 10,
  },
  {
    name: 'Cultured Mentor',
    founders: ['Dylan Simpson', 'Ana Brereton Rodrigo', 'Henry Gardiner', 'Alec Williams'],
    cohort: 10,
  },
  // Cohort 9
  { name: 'Synbiote', founders: ['Alinta Furnell', 'Ismat Kabbara'], cohort: 9 },
  { name: 'Pandemic Tours', founders: ['Joaquin Contreras'], cohort: 9 },
  { name: 'ErleaDx', founders: ['Cherry Chia'], cohort: 9 },
  { name: 'Pentone', founders: ['Philip Pentone Robinson'], cohort: 9 },
  { name: 'KrowdInnovation', founders: ['Carlos Sanches'], cohort: 9 },
  { name: 'early.fans', founders: ['Pedro Miguel Marques Sousa'], cohort: 9 },
  {
    name: 'MoveMed',
    founders: ['Alvaro Yanez Touzet', 'Anthony Jenking', 'Ben Davies', 'Mark Kotter'],
    cohort: 9,
  },
  { name: "Manchester Students' Group", founders: ['Farris Ramzy'], cohort: 9 },
  { name: 'NanoGraft', founders: ['Gergana Ivanova', 'Omar Haroun'], cohort: 9 },
  // Cohort 8
  { name: 'GreenWear Solutions', founders: ['Dheeraj Thapliyal'], cohort: 8 },
  { name: 'SimpleX Molecular', founders: ['Maribel Montufar-Martinez'], cohort: 8 },
  { name: 'Ship VO', founders: ['James Mason'], cohort: 8 },
  { name: 'Garden of Ive', founders: ['Iveren Yongo', 'Erdoo Yongo'], cohort: 8 },
  { name: 'Spice Story', founders: ['Rijul Shukla'], cohort: 8 },
  { name: 'Rogue Psych', founders: ['Hannah Davies'], cohort: 8 },
  { name: 'Blosom', founders: ["Rory O'Moore"], cohort: 8 },
  { name: 'Light And Air', founders: ['Lorraine Wolter'], cohort: 8 },
  { name: 'Evolve Your Home', founders: ['Sophia Major'], cohort: 8 },
  { name: 'Grow Your Own', founders: ['Ignas Bolsakovas', 'Karolis Petruskevicius'], cohort: 8 },
  { name: 'Kinetics', founders: ['Stefan Strat', 'Dominic Kloecker'], cohort: 8 },
  { name: 'Cohost.me', founders: ['Anuj Vaishnav', 'Harshdeep Singh'], cohort: 8 },
  { name: 'Hai', founders: ['Andrea Izquierdo', 'Diego Corona'], cohort: 8 },
  // Cohort 7
  { name: 'YourDataMate', founders: ["Julieta O'Flaherty", 'Radhika Kataria'], cohort: 7 },
  { name: 'Buno Coffee', founders: ['Nikita Lozarev'], cohort: 7 },
  {
    name: 'Immunity',
    founders: ['Leonel Virosta', 'Carlos Gutiérrez', 'Haizea Tramullas'],
    cohort: 7,
  },
  { name: 'Everything 3D Printing', founders: ['Jay Sahnan'], cohort: 7 },
  { name: 'Everest', founders: ['Daulet Bukanov'], cohort: 7 },
  { name: 'Electric Bazaar', founders: ['Alicya Mamo', 'Shamima Khonat'], cohort: 7 },
  { name: 'Educational Game Studio', founders: ['Karl Tye'], cohort: 7 },
  { name: 'BrainTame', founders: ['Nikhil Jacob'], cohort: 7 },
  { name: 'Arkisites', founders: ['Elijah Ajuwon'], cohort: 7 },
  { name: '3D PrintEat', founders: ['Matthew Kibble'], cohort: 7 },
  // Cohort 6
  { name: 'Studifuel', founders: ['Sam Birch'], cohort: 6 },
  { name: 'Projekt Blu', founders: ['Tuege Neumann', 'Raghav Vashishtha'], cohort: 6 },
  { name: 'Increw', founders: ['Robert Bucur', 'Matyas Szegi'], cohort: 6 },
  { name: 'Global Source Kitchen', founders: ['Harrison Kersey', 'Stanley Sands'], cohort: 6 },
  { name: 'Peera', founders: ['Nathan Dane', 'Lewis Ladin'], cohort: 6 },
  { name: 'Revolutioneyes', founders: ['Ali Ismal'], cohort: 6 },
  { name: 'Vamo', founders: ['Madgalini Papanaoum', 'Orestis Triantopoulos'], cohort: 6 },
  { name: 'Homely Energy', founders: ['Ignas Bolsakovas', 'Karolis Petruskevicius'], cohort: 6 },
  { name: 'Free Love Apparel', founders: ['Nick Tefft'], cohort: 6 },
  { name: 'Skybox', founders: ["Luigi D'Introno", 'Jang Belche'], cohort: 6 },
  // Cohort 5
  { name: 'Unichat', founders: ['Jamie Rawsthorne', 'Nicolas Pettican'], cohort: 5 },
  { name: 'Student Inspire Network', founders: ['Milimo Banji'], cohort: 5 },
  { name: 'Rats to Riches', founders: ['Eugene Lim'], cohort: 5 },
  { name: 'MACAWLY', founders: ['Michal Wisniewski'], cohort: 5 },
  {
    name: 'In It Together',
    founders: ['Jonah Ogbuneke', 'Jack Houghton', 'Lily Fothergill'],
    cohort: 5,
  },
  { name: 'Hall Swap', founders: ['Dewy Saxena'], cohort: 5 },
  { name: 'CADPAD', founders: ['Mason Rowbottom'], cohort: 5 },
  { name: 'Bare Bones', founders: ['Jacob Scott', 'Georgina Bullen'], cohort: 5 },
  // Cohort 4
  { name: 'Neural Diversity Network', founders: ['Daniel Laing'], cohort: 4 },
  { name: 'Unifiy', founders: ['Nick Singh', 'Chuck Paiusim', 'Cameron Lee'], cohort: 4 },
  { name: 'Shirt Happens', founders: ['Kiran Arokiasamy'], cohort: 4 },
  {
    name: 'Shut Up & Dance',
    founders: ['Maggie Chen', 'Daniel Ma', 'Lavika Sachdeva'],
    cohort: 4,
  },
  { name: 'Homefans', founders: ['Daniel Velasquez', 'Luke Verbeek'], cohort: 4 },
  {
    name: 'Etymo',
    founders: ['Weijian Zhang', 'Jonathan Deakin', 'Wiktor Komorowski'],
    cohort: 4,
  },
  { name: 'Hive Urban Farms', founders: ['Gareth Williams', 'Dien Curtis'], cohort: 4 },
  // Cohort 3
  { name: 'Sex in a Box', founders: ['Georgia Farrugia'], cohort: 3 },
  { name: 'The Student Games', founders: ['Tom Richmond', 'Greg Pearson'], cohort: 3 },
  {
    name: 'Vital Voice',
    founders: ['Bilal El Sayed', 'Benedict Vardey', 'Francisco Ponce de Leon'],
    cohort: 3,
  },
  { name: 'DentaliQ', founders: ['Rajen Nagar'], cohort: 3 },
  {
    name: 'Reroo',
    founders: ['Haider Khokar', 'Ulrich Boulon', 'Thomas Edwards', 'George McDonnell'],
    cohort: 3,
  },
]

/** Names worth putting at the very top of the People list. */
export interface NotablePerson {
  name: string
  headline: string
  achievement: string
  linkedin?: string
}

export const NOTABLE_PEOPLE: NotablePerson[] = [
  {
    name: 'Oliver Ulvebne',
    headline: 'Previous Director of Accelerate ME · Advisory Board',
    achievement:
      'Led AME in its 12th year: 75% revenue-generating companies from his cohort and 2 YC companies. Founded a six-figure business at 16; xAI and Mistral hackathon winner.',
    linkedin: 'https://www.linkedin.com/in/oliverulvebne',
  },
  {
    name: 'Harry Panter',
    headline: 'Founder & CEO of Housr (cohort 6)',
    achievement:
      'Scaled Housr from $0 to $10m revenue in 36 months, raised $6m pre-Series A. Northern Star Entrepreneurship Award winner.',
  },
  {
    name: 'Grace Vella',
    headline: 'Founder of Miss Kick (cohort 5)',
    achievement:
      'Built a global female-first football brand from a kitchen table; partnered with Mitre to sponsor aspiring female coaches.',
  },
  {
    name: 'Scott Martin',
    headline: 'Founder & CEO of Recourse AI (cohort 4)',
    achievement:
      'Raised £4m+ seed for AI clinical training; partnered with the NHS Greater Manchester Cancer Alliance.',
  },
  {
    name: 'Prithveesh Reddy',
    headline: 'Co-founder of Arcube (cohort 9)',
    achievement:
      '$1.5m seed raised; generated $1.6m in new revenue for Etihad Airways from just 1,300 passengers.',
  },
  {
    name: 'Harvey Lowe',
    headline: 'Co-founder of Arcube (cohort 9)',
    achievement:
      'Won the Technology category at the Venture Further Awards; named a Manchester Tech Climber.',
  },
  {
    name: 'Yusuff Yusuff',
    headline: 'Founder & CEO of Aeroknite (cohort 8)',
    achievement:
      'Ranked #5 AI company on F6S out of 2 million startups with fire-fighting and hologram drones.',
  },
  {
    name: 'Jasper Lee',
    headline: 'Previous Director of Accelerate ME',
    achievement: 'Ran Cohort 11 and recruited the leadership that took AME to its best year yet.',
  },
]
