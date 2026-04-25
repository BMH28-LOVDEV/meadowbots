// Franklin Division team roster — DECODE 2025-2026
// Source: official event match participants list

export interface FranklinTeam {
  number: string;
  name: string;
  city: string;
  region: string;
  country: string;
}

export const FRANKLIN_TEAMS: FranklinTeam[] = [
  { number: "701",   name: "The GONK Squad",                              city: "North Kingstown",         region: "RI",  country: "USA" },
  { number: "4102",  name: "CATScan",                                     city: "Maplewood",               region: "NJ",  country: "USA" },
  { number: "6437",  name: "Mad Hatters",                                 city: "Powell",                  region: "WY",  country: "USA" },
  { number: "7253",  name: "Raging Robots",                               city: "Shelby Township",         region: "MI",  country: "USA" },
  { number: "8393",  name: "The Giant Diencephalic BrainSTEM Robotics Team", city: "Baden",                region: "PA",  country: "USA" },
  { number: "8492",  name: "Titanium Trojans",                            city: "Whitmore Lake",           region: "MI",  country: "USA" },
  { number: "8565",  name: "TechnicBots",                                 city: "Plano",                   region: "TX",  country: "USA" },
  { number: "8803",  name: "East Rankin Robotics",                        city: "Pelahatchie",             region: "MS",  country: "USA" },
  { number: "9876",  name: "The Countdown",                               city: "Olympia",                 region: "WA",  country: "USA" },
  { number: "9999",  name: "The Ninejas",                                 city: "Ottawa",                  region: "ON",  country: "Canada" },
  { number: "10015", name: "Hyper Droid",                                 city: "Calgary",                 region: "AB",  country: "Canada" },
  { number: "10016", name: "Clarkston RoboWolves",                        city: "Clarkston",               region: "MI",  country: "USA" },
  { number: "10355", name: "Project Peacock",                             city: "Tulsa",                   region: "OK",  country: "USA" },
  { number: "10949", name: "Mechanical Operations Bureau - MOB Robotics", city: "Cross River",             region: "NY",  country: "USA" },
  { number: "11148", name: "Barker Redbacks",                             city: "Hornsby",                 region: "NSW", country: "Australia" },
  { number: "11511", name: "Referees",                                    city: "Auckland",                region: "AUK", country: "New Zealand" },
  { number: "12887", name: "Devolt Phobos",                               city: "Chihuahua",               region: "CHH", country: "Mexico" },
  { number: "14841", name: "Mighty Meadowbots Blue",                      city: "Las Vegas",               region: "NV",  country: "USA" },
  { number: "14906", name: "Leviathan Robotics",                          city: "Tulsa",                   region: "OK",  country: "USA" },
  { number: "15297", name: "Legacy",                                      city: "Tallahassee",             region: "FL",  country: "USA" },
  { number: "15527", name: "Ramstein HS (Team 3)",                        city: "APO",                     region: "AE",  country: "USA" },
  { number: "16417", name: "ROC",                                         city: "Richmond Hill",           region: "ON",  country: "Canada" },
  { number: "16818", name: "Hype-Birds",                                  city: "Tlalpan",                 region: "CMX", country: "Mexico" },
  { number: "17755", name: "CERBOTICS - BLUE",                            city: "Torreon",                 region: "COA", country: "Mexico" },
  { number: "18108", name: "High Voltage",                                city: "Portland",                region: "OR",  country: "USA" },
  { number: "18221", name: "Meta^Infinity",                               city: "Highland Park",           region: "IL",  country: "USA" },
  { number: "18255", name: "Stealth Robotics",                            city: "Barrington",              region: "IL",  country: "USA" },
  { number: "18763", name: "Texpand",                                     city: "Cape Town",               region: "WC",  country: "South Africa" },
  { number: "19819", name: "AstroBruins",                                 city: "Sunnyvale",               region: "CA",  country: "USA" },
  { number: "19862", name: "Mecha Mantises",                              city: "Fremont",                 region: "CA",  country: "USA" },
  { number: "20871", name: "Eureka",                                      city: "Mumbai",                  region: "MH",  country: "India" },
  { number: "21036", name: "JUSTICE FTC TEAM",                            city: "Goiânia",                 region: "GO",  country: "Brazil" },
  { number: "21305", name: "Rogue Cats",                                  city: "Duluth",                  region: "MN",  country: "USA" },
  { number: "23264", name: "Circuit Breakers",                            city: "New Iberia",              region: "LA",  country: "USA" },
  { number: "23392", name: "Viking Innovators",                           city: "Rochester",               region: "MI",  country: "USA" },
  { number: "24064", name: "ITKAN JIAR Janktastrophe",                    city: "Durham",                  region: "NC",  country: "USA" },
  { number: "24089", name: "Iron Lions",                                  city: "Sunshine Coast",          region: "QLD", country: "Australia" },
  { number: "24253", name: "Giggle Pickles",                              city: "Ferndale",                region: "MI",  country: "USA" },
  { number: "24331", name: "Caesar Circuitry",                            city: "Huntsville",              region: "AL",  country: "USA" },
  { number: "24804", name: "xCeption",                                    city: "Astana",                  region: "AST", country: "Kazakhstan" },
  { number: "25153", name: "Cartesian Robotics",                          city: "Çankaya",                 region: "06",  country: "Türkiye" },
  { number: "25171", name: "RoboTakev",                                   city: "Izmir",                   region: "35",  country: "Türkiye" },
  { number: "25584", name: "MAGIS",                                       city: "Vilnius",                 region: "VL",  country: "Lithuania" },
  { number: "25631", name: "Proxima Nova",                                city: "Lake Oswego",             region: "OR",  country: "USA" },
  { number: "25650", name: "One Small Step for an Axolotl",               city: "Lititz",                  region: "PA",  country: "USA" },
  { number: "26073", name: "BeaverBots",                                  city: "Ashburn",                 region: "VA",  country: "USA" },
  { number: "26960", name: "Tech Dragons",                                city: "Cachoeiro De Itapemirim", region: "ES",  country: "Brazil" },
  { number: "27501", name: "EFZ Robotics",                                city: "Shanghai",                region: "SH",  country: "China" },
  { number: "27572", name: "Dinonaut",                                    city: "Khon Kaen",               region: "40",  country: "Thailand" },
  { number: "27679", name: "CDC Tech",                                    city: "San Juan",                region: "PR",  country: "USA" },
  { number: "28061", name: "FIZMAT ROBOTICS",                             city: "Astana",                  region: "AST", country: "Kazakhstan" },
  { number: "30110", name: "Coyote",                                      city: "Irvine",                  region: "CA",  country: "USA" },
  { number: "30435", name: "Klutch Robotics",                             city: "Fort Lauderdale",         region: "FL",  country: "USA" },
  { number: "32728", name: "Celestial",                                   city: "Shuchinsk",               region: "AKM", country: "Kazakhstan" },
  { number: "34063", name: "Rust Bucket",                                 city: "Wetzikon",                region: "ZH",  country: "Switzerland" },
];
