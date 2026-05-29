import { normalizeBaseUrl } from "../core/canvas-client.js";

export type School = {
  name: string;
  url: string;
};

export const SCHOOLS: School[] = [
  { name: "Brown University", url: "https://canvas.brown.edu" },
  { name: "Carnegie Mellon University", url: "https://canvas.cmu.edu" },
  { name: "Columbia University (CourseWorks)", url: "https://courseworks2.columbia.edu" },
  { name: "Cornell University", url: "https://canvas.cornell.edu" },
  { name: "Dartmouth College", url: "https://canvas.dartmouth.edu" },
  { name: "Duke University", url: "https://go.canvas.duke.edu" },
  { name: "Emory University", url: "https://canvas.emory.edu" },
  { name: "Georgetown University", url: "https://canvas.georgetown.edu" },
  { name: "Georgia Institute of Technology", url: "https://canvas.gatech.edu" },
  { name: "Harvard University", url: "https://canvas.harvard.edu" },
  { name: "Massachusetts Institute of Technology (MIT)", url: "https://canvas.mit.edu" },
  { name: "Northeastern University", url: "https://canvas.northeastern.edu" },
  { name: "Northwestern University", url: "https://canvas.northwestern.edu" },
  { name: "Ohio State University", url: "https://canvas.osu.edu" },
  { name: "Pennsylvania State University", url: "https://canvas.psu.edu" },
  { name: "Princeton University", url: "https://canvas.princeton.edu" },
  { name: "Rice University", url: "https://canvas.rice.edu" },
  { name: "Stanford University", url: "https://canvas.stanford.edu" },
  { name: "Tufts University", url: "https://canvas.tufts.edu" },
  { name: "University of California, Berkeley (bCourses)", url: "https://bcourses.berkeley.edu" },
  { name: "University of California, Davis", url: "https://canvas.ucdavis.edu" },
  { name: "University of California, Irvine", url: "https://canvas.eee.uci.edu" },
  { name: "University of California, Los Angeles (Bruin Learn)", url: "https://bruinlearn.ucla.edu" },
  { name: "University of California, San Diego", url: "https://canvas.ucsd.edu" },
  { name: "University of California, Santa Barbara", url: "https://canvas.ucsb.edu" },
  { name: "University of California, Santa Cruz", url: "https://canvas.ucsc.edu" },
  { name: "University of Chicago", url: "https://canvas.uchicago.edu" },
  { name: "University of Michigan", url: "https://canvas.umich.edu" },
  { name: "University of North Carolina at Chapel Hill", url: "https://canvas.unc.edu" },
  { name: "University of Notre Dame", url: "https://canvas.nd.edu" },
  { name: "University of Pennsylvania", url: "https://canvas.upenn.edu" },
  { name: "University of Southern California", url: "https://canvas.usc.edu" },
  { name: "University of Virginia", url: "https://canvas.its.virginia.edu" },
  { name: "University of Washington", url: "https://canvas.uw.edu" },
  { name: "Yale University", url: "https://canvas.yale.edu" }
];

export function searchSchools(query: string, limit = 10): School[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return SCHOOLS.slice(0, limit);
  }

  return SCHOOLS.filter((school) => {
    return school.name.toLowerCase().includes(normalized) || school.url.toLowerCase().includes(normalized);
  }).slice(0, limit);
}

export function makeCustomSchool(name: string, url: string): School {
  return {
    name: name.trim() || "Custom Canvas School",
    url: normalizeBaseUrl(url)
  };
}
