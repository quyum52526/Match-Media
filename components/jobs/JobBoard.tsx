"use client";

import { useState, useMemo } from "react";
import { JobCard } from "./JobCard";
import { DISTRICTS } from "@/lib/constants/bdGeo";
import type { JobSummary } from "@/lib/data/jobs";

interface JobBoardProps {
  jobs: JobSummary[];
}

export function JobBoard({ jobs }: JobBoardProps) {
  const [districtFilter, setDistrictFilter] = useState("");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return jobs.filter((j) => {
      const matchDistrict =
        !districtFilter || j.targetDistrict === districtFilter;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        j.title.toLowerCase().includes(q) ||
        j.description.toLowerCase().includes(q) ||
        j.targetDistrict.toLowerCase().includes(q);
      return matchDistrict && matchSearch;
    });
  }, [jobs, districtFilter, search]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          placeholder="Search jobs…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 flex-1 rounded-xl border border-hairline bg-white px-3 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
        />
        <select
          value={districtFilter}
          onChange={(e) => setDistrictFilter(e.target.value)}
          className="h-10 rounded-xl border border-hairline bg-white px-3 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 sm:w-52"
        >
          <option value="">All districts</option>
          {DISTRICTS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.value}
            </option>
          ))}
        </select>
        {(search || districtFilter) && (
          <button
            onClick={() => {
              setSearch("");
              setDistrictFilter("");
            }}
            className="h-10 rounded-xl border border-hairline px-4 text-sm text-ink/60 transition-colors hover:bg-ink/5"
          >
            Clear
          </button>
        )}
      </div>

      {/* Result count */}
      <p className="text-sm text-ink/50">
        {filtered.length} job{filtered.length !== 1 ? "s" : ""} found
        {districtFilter ? ` in ${districtFilter}` : ""}
      </p>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-hairline py-16 text-center">
          <p className="text-base font-semibold text-ink">No jobs found</p>
          <p className="text-sm text-muted">
            Try a different district or search term.
          </p>
        </div>
      )}
    </div>
  );
}
